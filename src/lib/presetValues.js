import { HUE_BUCKETS, clamp } from './colorAnalysis.js';
import { estimateNoiseSigma, noiseToSliders } from './noiseAnalysis.js';

/**
 * @param {object} colorAnalysis - resultado de analyzeColor()
 * @param {ImageData} imageData - para pasarle a la estimación de ruido
 */
export function computePresetValues(colorAnalysis, imageData) {
  const a = colorAnalysis;

  // --- Básico ---
  const rbDiff = a.avgR - a.avgB;
  const temp = Math.round(clamp(5500 + rbDiff * 22, 2000, 9500));
  const tint = Math.round(clamp((a.avgG - (a.avgR + a.avgB) / 2) * -1.1, -80, 80));
  const contrast = Math.round(clamp((a.stdLum - 52) * 1.4, -80, 80));
  const exposure = +clamp((a.avgLum - 118) / 180, -1.5, 1.5).toFixed(2);
  const highlights = Math.round(clamp((a.p95 - 235) * 1.6, -100, 60));
  const shadows = Math.round(clamp((a.p05 - 18) * 1.8, -60, 100));
  const whites = Math.round(clamp((a.p80 - 205) * 0.9, -60, 60));
  const blacks = Math.round(clamp((a.p20 - 45) * 0.9, -60, 60));
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
  const sigma = estimateNoiseSigma(imageData);
  const noise = noiseToSliders(sigma);

  // --- Grano de estilo (look film), moderado por el ruido ya presente en la foto ---
  const grainAmount = Math.round(clamp(26 - sigma * 2.2, 4, 30));
  const grainSize = Math.round(clamp(25 + (contrast > 0 ? contrast * 0.2 : 0), 18, 45));
  const grainFrequency = 50;

  // --- Viñeta, a partir del contraste real esquina/centro de la foto ---
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
    noiseSigma: sigma,
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
