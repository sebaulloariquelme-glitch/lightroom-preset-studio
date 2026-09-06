import { HUE_BUCKETS, clamp } from './colorAnalysis.js';
import { noiseToSliders } from './noiseAnalysis.js';

/**
 * @param {object} colorAnalysis - resultado de analyzeColor()
 * @param {number} noiseSigma - sigma de ruido ya estimado (ver estimateNoiseSigma en noiseAnalysis.js)
 */
export function computePresetValues(colorAnalysis, noiseSigma) {
  const a = colorAnalysis;

  // --- Básico ---
  // Temperatura y tinte se calculan sobre el balance de blancos "gray-world"
  // (ver wbR/wbG/wbB en colorAnalysis.js): promedio de los píxeles casi
  // neutros de la foto, no de toda la imagen. Así un color dominante real
  // de la escena (un atardecer, un bosque) no se confunde con un desvío de
  // balance de blancos a corregir.
  const rbDiff = a.wbR - a.wbB;
  const temp = Math.round(clamp(5500 + rbDiff * 22, 2000, 9500));
  const tint = Math.round(clamp((a.wbG - (a.wbR + a.wbB) / 2) * -1.1, -80, 80));
  const contrast = Math.round(clamp((a.stdLum - 52) * 1.4, -80, 80));
  const exposure = +clamp((a.avgLum - 118) / 180, -1.5, 1.5).toFixed(2);

  // Si la foto ya tiene luces quemadas o sombras tapadas, no hay información
  // real ahí para replicar — empujar más en esa dirección solo exagera el
  // recorte al aplicar el preset a otra foto.
  let highlights = Math.round(clamp((a.p95 - 235) * 1.6, -100, 60));
  if (a.clippedHighlightFrac > 0.02 && highlights > 0) highlights = 0;
  let blacks = Math.round(clamp((a.p20 - 45) * 0.9, -60, 60));
  if (a.clippedShadowFrac > 0.02 && blacks < 0) blacks = 0;

  const shadows = Math.round(clamp((a.p05 - 18) * 1.8, -60, 100));
  const whites = Math.round(clamp((a.p80 - 205) * 0.9, -60, 60));
  const vibrance = Math.round(clamp((a.avgSat - 38) * 1.6, -80, 80));
  const saturation = Math.round(clamp((a.avgSat - 38) * 0.6, -40, 40));

  // --- Panel HSL (8 colores) ---
  const hsl = {};
  for (const b of HUE_BUCKETS) {
    const stat = a.hues[b.name];
    if (!stat) { hsl[b.name] = { hue: 0, sat: 0, lum: 0 }; continue; }
    let hueShift = stat.meanHue - b.center;
    if (hueShift > 180) hueShift -= 360;
    if (hueShift < -180) hueShift += 360;
    hsl[b.name] = {
      hue: Math.round(clamp(hueShift * 0.6, -30, 30)),
      sat: Math.round(clamp((stat.avgSat - a.avgSat) * 1.3, -60, 60)),
      lum: Math.round(clamp(((stat.avgLum - a.avgLum) / 255) * 140, -50, 50))
    };
  }

  // --- Split toning ---
  const splitShadowHue = a.splitShadow ? Math.round(a.splitShadow.hue) : (temp > 5500 ? 30 : 210);
  const splitShadowSat = a.splitShadow ? Math.round(clamp(a.splitShadow.sat * 0.55, 0, 45)) : 0;
  const splitHighlightHue = a.splitHighlight ? Math.round(a.splitHighlight.hue) : (temp > 5500 ? 45 : 200);
  const splitHighlightSat = a.splitHighlight ? Math.round(clamp(a.splitHighlight.sat * 0.4, 0, 35)) : 0;
  const splitBalance = Math.round(clamp((splitShadowSat - splitHighlightSat) * 0.6, -60, 60));

  // --- Ruido real detectado (Immerkær) -> nitidez + reducción de ruido ---
  const noise = noiseToSliders(noiseSigma);

  // --- Grano de estilo (look film), moderado por el ruido ya presente en la foto ---
  const grainAmount = Math.round(clamp(26 - noiseSigma * 2.2, 4, 30));
  const grainSize = Math.round(clamp(25 + (contrast > 0 ? contrast * 0.2 : 0), 18, 45));
  const grainFrequency = 50;

  // --- Viñeta, a partir del contraste real esquina/centro de la foto ---
  // (cornerLum ya viene igualado a centerLum en colorAnalysis.js cuando las
  // cuatro esquinas no se oscurecen/aclaran de forma consistente, así que
  // vignetteDelta da 0 en ese caso — no hace falta repetir esa lógica acá).
  const vignetteDelta = a.cornerLum - a.centerLum;
  const vignetteAmount = Math.round(clamp(vignetteDelta * 0.4, -55, 15));
  const vignetteMidpoint = 48;
  const vignetteFeather = 65;
  const vignetteRoundness = 0;
  const vignetteStyle = 1; // 1 = Highlight Priority (estándar de Lightroom)

  return {
    temp, tint, contrast, exposure, highlights, shadows, whites, blacks,
    vibrance, saturation, hsl,
    splitShadowHue, splitShadowSat, splitHighlightHue, splitHighlightSat, splitBalance,
    noiseSigma,
    sharpenAmount: noise.sharpenAmount,
    sharpenRadius: noise.sharpenRadius,
    sharpenDetail: noise.sharpenDetail,
    sharpenEdgeMasking: noise.sharpenEdgeMasking,
    luminanceSmoothing: noise.luminanceSmoothing,
    luminanceDetail: noise.luminanceDetail,
    colorNoiseReduction: noise.colorNoiseReduction,
    colorNoiseDetail: noise.colorNoiseDetail,
    grainAmount, grainSize, grainFrequency,
    vignetteAmount, vignetteMidpoint, vignetteFeather, vignetteRoundness, vignetteStyle
  };
}
