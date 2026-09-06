// Estimación rápida de ruido (sigma) usando el método de Immerkær (1996):
// convoluciona la imagen en escala de grises con un kernel Laplaciano y usa
// la suma de respuestas absolutas para estimar el desvío estándar del ruido
// gaussiano presente. Es el mismo principio que usan varias herramientas de
// evaluación de calidad de imagen: en zonas parejas (sin bordes reales), toda
// energía de alta frecuencia que aparece es, con alta probabilidad, ruido.
//
//            [ 1  -2   1 ]
//   kernel = [-2   4  -2 ]
//            [ 1  -2   1 ]
//
//   sigma = sqrt(pi/2) * (1 / (6 * (W-2) * (H-2))) * sum(|I * kernel|)

function toGrayscale(imageData) {
  const { data, width: w, height: h } = imageData;
  const gray = new Float32Array(w * h);
  for (let idx = 0; idx < w * h; idx++) {
    const i = idx * 4;
    gray[idx] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return gray;
}

export function estimateNoiseSigma(imageData) {
  const { width: w, height: h } = imageData;
  if (w < 5 || h < 5) return 0;
  const gray = toGrayscale(imageData);

  let sum = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = gray[y * w + x];
      const top = gray[(y - 1) * w + x];
      const bottom = gray[(y + 1) * w + x];
      const left = gray[y * w + (x - 1)];
      const right = gray[y * w + (x + 1)];
      const response = top - 2 * c + bottom + left - 2 * c + right; // Laplaciano separable equivalente
      sum += Math.abs(response);
    }
  }

  const sigma = Math.sqrt(Math.PI / 2) * (1 / (6 * (w - 2) * (h - 2))) * sum;
  return sigma; // típicamente 0–3 en fotos limpias de bajo ISO, 5–15+ en fotos ruidosas
}

/**
 * Traduce el sigma de ruido detectado a sugerencias de sliders de Lightroom.
 * Fotos limpias -> casi nada de reducción de ruido, más margen para nitidez y grano de estilo.
 * Fotos ruidosas -> más reducción de ruido (luminancia y color), nitidez más conservadora,
 * y menos grano artificial encima (para no sumar textura a una imagen ya ruidosa).
 */
export function noiseToSliders(sigma) {
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const luminanceSmoothing = Math.round(clamp(sigma * 5.5, 0, 70));
  const luminanceDetail = Math.round(clamp(50 - sigma * 1.5, 20, 50));
  // Más reducción de ruido de color pide bajar un poco el "detalle" para no
  // reintroducir manchas de color; poca reducción no lo necesita.
  const colorNoiseReduction = Math.round(clamp(sigma * 4, 0, 60));
  const colorNoiseDetail = Math.round(clamp(70 - colorNoiseReduction * 0.4, 30, 70));
  // Reducción de ruido de luminancia más fuerte compensada con algo de
  // contraste extra en esa misma reducción, para no perder toda la pegada
  // tonal al suavizar una foto ruidosa.
  const luminanceNoiseContrast = Math.round(clamp(sigma * 1.2, 0, 30));

  const sharpenAmount = Math.round(clamp(48 - sigma * 2.2, 15, 55));
  const sharpenRadius = 1.0;
  const sharpenDetail = Math.round(clamp(35 - sigma * 1.8, 10, 40));
  const sharpenEdgeMasking = Math.round(clamp(sigma * 3, 0, 60));

  return {
    sigma,
    luminanceSmoothing, luminanceDetail, luminanceNoiseContrast,
    colorNoiseReduction, colorNoiseDetail,
    sharpenAmount, sharpenRadius, sharpenDetail, sharpenEdgeMasking
  };
}
