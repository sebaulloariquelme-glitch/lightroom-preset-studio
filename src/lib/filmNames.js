const FILM_PREFIXES = [
  'Kodak', 'Fuji', 'Agfa', 'Ilford', 'Cinestill', 'Lomo', 'Rollei', 'Ferrania',
  'Polaroid', 'Konica', 'Orwo', 'Adox', 'Silvergrain', 'Nordisk', 'Kentmere'
];
const FILM_CORES = [
  'Gold', 'Portra', 'Superia', 'Velvia', 'Provia', 'Ektar', 'Tri-X', 'Vision3',
  'Pan', 'Chrome', 'Colorplus', 'Centuria', 'Astia', 'Delta', 'Pro', 'Neopan',
  'Reala', 'Elite', 'Classic', 'Natura'
];
const FILM_SUFFIXES = ['100', '200', '400', '800', '1000', 'II', 'Xtra', 'Pro', 'S', 'C41', 'Look', 'Stock'];

const COLOR_WORDS = [
  'Terracotta', 'Amber', 'Cobalt', 'Faded', 'Dusty', 'Golden', 'Ashen', 'Sepia',
  'Rustic', 'Muted', 'Pale', 'Warm', 'Cool', 'Ochre', 'Rosewood', 'Slate', 'Sunlit', 'Hazy'
];
const PLACE_WORDS = [
  'Desert', 'Dune', 'Coast', 'Fog', 'Horizon', 'Valley', 'Canyon', 'Shore',
  'Meadow', 'Harbor', 'Prairie', 'Bluff', 'Mesa', 'Cove', 'Field', 'Trail'
];
const MOOD_WORDS = [
  'Amber Haze', 'Faded Sun', 'Cool Fog', 'Warm Grain', 'Soft Contrast', 'Late Light',
  'Muted Gold', 'Pale Rose', 'Deep Shade', 'Ashen Sky', 'Golden Hour', 'Blue Hour',
  'Dusty Rose', 'Sunbleached', 'Overcast', 'Vintage Wash', 'Analog Fade', 'Tungsten Glow'
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Nombre inventado estilo carrete analógico, elegido según el carácter
 * tonal real de la foto (cálida/fría, contrastada/suave, saturada/desaturada,
 * ruidosa/limpia). No hace referencia a marcas reales de forma literal —
 * son combinaciones evocativas, no nombres comerciales copiados.
 */
export function generateFilmName(presetValues) {
  const v = presetValues;
  const warm = v.temp >= 5800;
  const cool = v.temp < 5200;
  const highContrast = v.contrast > 15;
  const lowContrast = v.contrast < -15;
  const faded = v.blacks > 10 || v.shadows > 25;
  const vivid = v.vibrance > 15;
  const muted = v.vibrance < -15;
  const grainy = v.noiseSigma > 6;

  const colorPool = [];
  if (warm) colorPool.push('Terracotta', 'Amber', 'Golden', 'Ochre', 'Rustic', 'Sunlit');
  if (cool) colorPool.push('Cobalt', 'Ashen', 'Pale', 'Cool', 'Slate');
  if (faded) colorPool.push('Faded', 'Muted', 'Dusty', 'Hazy');
  if (vivid) colorPool.push('Golden', 'Amber', 'Rosewood');
  if (muted) colorPool.push('Ashen', 'Slate', 'Muted', 'Pale');
  const colorWord = colorPool.length ? pick(colorPool) : pick(COLOR_WORDS);

  const styleWord = (() => {
    const pool = [];
    if (warm) pool.push('Amber Haze', 'Warm Grain', 'Golden Hour', 'Sunbleached', 'Dusty Rose');
    if (cool) pool.push('Cool Fog', 'Blue Hour', 'Ashen Sky', 'Pale Rose', 'Tungsten Glow');
    if (faded) pool.push('Faded Sun', 'Vintage Wash', 'Analog Fade', 'Overcast');
    if (highContrast) pool.push('Deep Shade', 'Late Light');
    if (lowContrast) pool.push('Soft Contrast', 'Muted Gold', 'Overcast');
    if (grainy) pool.push('Warm Grain', 'Analog Fade');
    return pool.length ? pick(pool) : pick(MOOD_WORDS);
  })();

  const num = String(Math.floor(Math.random() * 24) + 1).padStart(2, '0');

  const patterns = [
    () => `${num} ${colorWord} ${pick(PLACE_WORDS)}`,
    () => `${num} ${colorWord} ${pick(PLACE_WORDS)}`,
    () => `${pick(FILM_PREFIXES)} ${pick(FILM_CORES)} ${pick(FILM_SUFFIXES)}`,
    () => `${num} ${styleWord}`
  ];
  return pick(patterns)();
}
