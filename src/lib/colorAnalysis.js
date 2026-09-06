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

  let cornerLumSum = 0, cornerCount = 0, centerLumSum = 0, centerCount = 0;

  for (let idx = 0; idx < n; idx++) {
    const i = idx * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    sumR += r; sumG += g; sumB += b;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lums[idx] = lum;
    const [hue, sat] = rgbToHsl(r, g, b);
    sumSat += sat;

    if (sat > 8) {
      const bucket = bucketForHue(hue);
      const hs = hueStats[bucket.name];
      hs.count++;
      hs.sumSat += sat;
      hs.sumLum += lum;
      const rad = (hue * Math.PI) / 180;
      hs.sumSin += Math.sin(rad);
      hs.sumCos += Math.cos(rad);
    }

    const x = idx % w, y = Math.floor(idx / w);
    const nx = x / w, ny = y / h;
    const isCorner = (nx < 0.18 || nx > 0.82) && (ny < 0.18 || ny > 0.82);
    const isCenter = nx > 0.35 && nx < 0.65 && ny > 0.35 && ny < 0.65;
    if (isCorner) { cornerLumSum += lum; cornerCount++; }
    if (isCenter) { centerLumSum += lum; centerCount++; }
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

  // Segunda pasada: color dominante en sombras (<=p20) vs. luces (>=p80) para split toning
  let shSin = 0, shCos = 0, shSat = 0, shCount = 0;
  let hiSin = 0, hiCos = 0, hiSat = 0, hiCount = 0;
  for (let idx = 0; idx < n; idx++) {
    const i = idx * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = lums[idx];
    const [hue, sat] = rgbToHsl(r, g, b);
    if (sat < 5) continue;
    const rad = (hue * Math.PI) / 180;
    if (lum <= p20) {
      shSin += Math.sin(rad); shCos += Math.cos(rad); shSat += sat; shCount++;
    } else if (lum >= p80) {
      hiSin += Math.sin(rad); hiCos += Math.cos(rad); hiSat += sat; hiCount++;
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
    p05, p20, p80, p95,
    hues, splitShadow, splitHighlight,
    cornerLum: cornerCount ? cornerLumSum / cornerCount : avgLum,
    centerLum: centerCount ? centerLumSum / centerCount : avgLum,
    swatches
  };
}

export { clamp };
