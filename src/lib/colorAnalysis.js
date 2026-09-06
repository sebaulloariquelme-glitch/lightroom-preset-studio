// Análisis de color de una imagen ya dibujada en un ImageData (canvas).
// Devuelve estadísticas de tono, balance de color, distribución tonal (percentiles
// de luminancia), color promedio por rango de matiz (para el panel HSL), color
// dominante en sombras vs. luces (para split toning) y contraste de esquinas vs.
// centro (para sugerir viñeta).

export const HUE_BUCKETS = [
  { name: 'Red', center: 0, min: 345, max: 15 },
  { name: 'Orange', center: 30, min: 15, max: 45 },
  { name: 'Yellow', center: 60, min: 45, max: 90 },
  { name: 'Green', center: 120, min: 90, max: 150 },
  { name: 'Aqua', center: 180, min: 150, max: 210 },
  { name: 'Blue', center: 240, min: 210, max: 260 },
  { name: 'Purple', center: 275, min: 260, max: 290 },
  { name: 'Magenta', center: 315, min: 290, max: 345 }
];

// Umbral de saturación bajo el cual un píxel se considera "casi neutro" —
// útil para estimar el balance de blancos real (gray-world sobre grises de
// la escena, no sobre el color dominante) y para no dejar que el matiz de
// un píxel casi gris (inestable, básicamente ruido) pese en los promedios
// de matiz.
const NEUTRAL_SAT_THRESHOLD = 12;

function bucketForHue(h) {
  for (const b of HUE_BUCKETS) {
    if (b.min > b.max) {
      if (h >= b.min || h < b.max) return b;
    } else if (h >= b.min && h < b.max) {
      return b;
    }
  }
  return HUE_BUCKETS[0];
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * @param {ImageData} imageData
 * @returns analysis object consumed by presetValues.js
 */
export function analyzeColor(imageData) {
  const { data, width: w, height: h } = imageData;
  const n = w * h;

  let sumR = 0, sumG = 0, sumB = 0, sumSat = 0;
  const lums = new Float32Array(n);

  const hueStats = {};
  for (const b of HUE_BUCKETS) hueStats[b.name] = { count: 0, sumSat: 0, sumLum: 0, sumSin: 0, sumCos: 0 };

  // Balance de blancos "gray-world" restringido a píxeles casi neutros y en
  // tonos medios: un promedio sobre TODA la imagen se deja engañar por un
  // color dominante real de la escena (un atardecer naranja, un bosque
  // verde) tratándolo como si fuera un desvío de balance de blancos. Los
  // píxeles casi neutros son los que de verdad delatan un color de fondo.
  let neutralR = 0, neutralG = 0, neutralB = 0, neutralCount = 0;

  // Cuatro esquinas por separado (no una sola bolsa combinada) para poder
  // exigir que el oscurecimiento/aclarado sea consistente en las cuatro
  // antes de atribuirlo a viñeta real, y no a un sujeto o sombra puntual
  // en una sola esquina.
  const cornerSums = [0, 0, 0, 0];
  const cornerCounts = [0, 0, 0, 0];
  let centerLumSum = 0, centerCount = 0;

  let clippedHighlightCount = 0, clippedShadowCount = 0;

  for (let idx = 0; idx < n; idx++) {
    const i = idx * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    sumR += r; sumG += g; sumB += b;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lums[idx] = lum;
    const [hue, sat] = rgbToHsl(r, g, b);
    sumSat += sat;

    if (lum >= 250) clippedHighlightCount++;
    if (lum <= 5) clippedShadowCount++;

    if (sat < NEUTRAL_SAT_THRESHOLD && lum > 20 && lum < 235) {
      neutralR += r; neutralG += g; neutralB += b; neutralCount++;
    }

    if (sat > 8) {
      const bucket = bucketForHue(hue);
      const hs = hueStats[bucket.name];
      hs.count++;
      hs.sumSat += sat;
      hs.sumLum += lum;
      const rad = (hue * Math.PI) / 180;
      // Ponderado por saturación: un píxel bien saturado dice mucho más
      // sobre el matiz dominante del bucket que uno apenas por encima del
      // umbral, cuyo matiz es casi ruido.
      hs.sumSin += Math.sin(rad) * sat;
      hs.sumCos += Math.cos(rad) * sat;
    }

    const x = idx % w, y = Math.floor(idx / w);
    const nx = x / w, ny = y / h;
    const isCenter = nx > 0.35 && nx < 0.65 && ny > 0.35 && ny < 0.65;
    if (isCenter) { centerLumSum += lum; centerCount++; }

    const inLeft = nx < 0.18, inRight = nx > 0.82;
    const inTop = ny < 0.18, inBottom = ny > 0.82;
    if (inTop && inLeft) { cornerSums[0] += lum; cornerCounts[0]++; }
    else if (inTop && inRight) { cornerSums[1] += lum; cornerCounts[1]++; }
    else if (inBottom && inLeft) { cornerSums[2] += lum; cornerCounts[2]++; }
    else if (inBottom && inRight) { cornerSums[3] += lum; cornerCounts[3]++; }
  }

  const avgR = sumR / n, avgG = sumG / n, avgB = sumB / n;
  const avgSat = sumSat / n;
  let avgLum = 0;
  for (let i = 0; i < n; i++) avgLum += lums[i];
  avgLum /= n;

  let variance = 0;
  for (let i = 0; i < n; i++) variance += (lums[i] - avgLum) ** 2;
  const stdLum = Math.sqrt(variance / n);

  const sortedLums = Float32Array.from(lums).sort();
  const p05 = sortedLums[Math.floor(n * 0.05)];
  const p20 = sortedLums[Math.floor(n * 0.2)];
  const p80 = sortedLums[Math.floor(n * 0.8)];
  const p95 = sortedLums[Math.floor(n * 0.95)];

  // Si hay suficientes píxeles casi neutros en tonos medios, el balance de
  // blancos se calcula solo con esos; si no (foto muy saturada o casi
  // monocromática), no hay una base neutra confiable y se cae de nuevo al
  // promedio de toda la imagen.
  const neutralFrac = neutralCount / n;
  const useNeutralWB = neutralFrac > 0.02;
  const wbR = useNeutralWB ? neutralR / neutralCount : avgR;
  const wbG = useNeutralWB ? neutralG / neutralCount : avgG;
  const wbB = useNeutralWB ? neutralB / neutralCount : avgB;

  // Segunda pasada: color dominante en sombras (<=p20), medios tonos y luces
  // (>=p80) — sombras/luces alimentan el split toning clásico, y las tres
  // zonas juntas alimentan el panel moderno de Color Grading (3 ruedas).
  let shSin = 0, shCos = 0, shSat = 0, shCount = 0;
  let hiSin = 0, hiCos = 0, hiSat = 0, hiCount = 0;
  let midSin = 0, midCos = 0, midSat = 0, midCount = 0;
  for (let idx = 0; idx < n; idx++) {
    const i = idx * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = lums[idx];
    const [hue, sat] = rgbToHsl(r, g, b);
    if (sat < 5) continue;
    const rad = (hue * Math.PI) / 180;
    if (lum <= p20) {
      shSin += Math.sin(rad) * sat; shCos += Math.cos(rad) * sat; shSat += sat; shCount++;
    } else if (lum >= p80) {
      hiSin += Math.sin(rad) * sat; hiCos += Math.cos(rad) * sat; hiSat += sat; hiCount++;
    } else {
      midSin += Math.sin(rad) * sat; midCos += Math.cos(rad) * sat; midSat += sat; midCount++;
    }
  }

  const hues = {};
  for (const b of HUE_BUCKETS) {
    const hs = hueStats[b.name];
    if (hs.count > n * 0.008) {
      const meanHue = ((Math.atan2(hs.sumSin, hs.sumCos) * 180) / Math.PI + 360) % 360;
      hues[b.name] = { avgSat: hs.sumSat / hs.count, avgLum: hs.sumLum / hs.count, meanHue };
    } else {
      hues[b.name] = null;
    }
  }

  const splitShadow = shCount > n * 0.01
    ? { hue: ((Math.atan2(shSin, shCos) * 180) / Math.PI + 360) % 360, sat: shSat / shCount }
    : null;
  const splitHighlight = hiCount > n * 0.01
    ? { hue: ((Math.atan2(hiSin, hiCos) * 180) / Math.PI + 360) % 360, sat: hiSat / hiCount }
    : null;
  const splitMidtone = midCount > n * 0.01
    ? { hue: ((Math.atan2(midSin, midCos) * 180) / Math.PI + 360) % 360, sat: midSat / midCount }
    : null;

  // Viñeta: solo se atribuye a viñeteo real si las cuatro esquinas se
  // oscurecen (o aclaran) de forma consistente respecto al centro. Un
  // sujeto o una sombra puntual en una sola esquina no debería leerse
  // como viñeta.
  const centerLum = centerCount ? centerLumSum / centerCount : avgLum;
  const cornerLums = cornerSums.map((sum, i) => (cornerCounts[i] ? sum / cornerCounts[i] : centerLum));
  const cornerDeltas = cornerLums.map((c) => c - centerLum);
  const meanDelta = cornerDeltas.reduce((a, d) => a + d, 0) / 4;
  const sameSign = cornerDeltas.every((d) => Math.sign(d) === Math.sign(meanDelta) || Math.abs(d) < 2);
  let deltaVariance = 0;
  for (const d of cornerDeltas) deltaVariance += (d - meanDelta) ** 2;
  const deltaSpread = Math.sqrt(deltaVariance / 4);
  // Si la dispersión entre esquinas es grande respecto a la magnitud del
  // oscurecimiento medio, no es simétrico -> no es viñeta real.
  const consistentVignette = sameSign && deltaSpread < Math.max(8, Math.abs(meanDelta) * 0.6);
  const cornerLum = consistentVignette ? centerLum + meanDelta : centerLum;

  // Contraste local (textura/claridad): diferencia promedio entre cada
  // píxel y una versión suavizada (box blur) de la luminancia. Es una
  // frecuencia intermedia entre el ruido de sensor (muy alta frecuencia,
  // ver noiseAnalysis.js) y el contraste global (el desvío estándar de
  // toda la imagen, ya capturado en stdLum): mucha diferencia local quiere
  // decir mucho micro-detalle/textura en la foto de referencia.
  const BLUR_RADIUS = 2;
  const blurred = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, count = 0;
      for (let dy = -BLUR_RADIUS; dy <= BLUR_RADIUS; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -BLUR_RADIUS; dx <= BLUR_RADIUS; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          sum += lums[ny * w + nx];
          count++;
        }
      }
      blurred[y * w + x] = sum / count;
    }
  }
  let localContrastSum = 0;
  for (let i = 0; i < n; i++) localContrastSum += Math.abs(lums[i] - blurred[i]);
  const localContrast = localContrastSum / n;

  // Muestras espaciales de color, para mostrar en la UI
  const swatches = [];
  for (let k = 0; k < 5; k++) {
    const px = Math.floor((k / 4) * (w - 1));
    const py = Math.floor(h / 2);
    const idx = (py * w + px) * 4;
    swatches.push(`rgb(${data[idx]},${data[idx + 1]},${data[idx + 2]})`);
  }

  return {
    width: w, height: h,
    avgR, avgG, avgB, avgSat, avgLum, stdLum,
    wbR, wbG, wbB, neutralFrac,
    p05, p20, p80, p95,
    clippedHighlightFrac: clippedHighlightCount / n,
    clippedShadowFrac: clippedShadowCount / n,
    hues, splitShadow, splitMidtone, splitHighlight,
    localContrast,
    cornerLum, centerLum,
    swatches
  };
}

export { clamp };
