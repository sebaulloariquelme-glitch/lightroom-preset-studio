import { analyzeColor } from './lib/colorAnalysis.js';
import { estimateNoiseSigma } from './lib/noiseAnalysis.js';
import { computePresetValues } from './lib/presetValues.js';
import { buildXMP } from './lib/xmpBuilder.js';
import { generateFilmName } from './lib/filmNames.js';
import { zipSingleFile } from './lib/zip.js';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const stage = document.getElementById('stage');
const previewImg = document.getElementById('previewImg');
const fname = document.getElementById('fname');
const statusLine = document.getElementById('statusLine');
const changeBtn = document.getElementById('changeBtn');
const readout = document.getElementById('readout');
const bars = document.getElementById('bars');
const swatchRow = document.getElementById('swatchRow');
const noiseReadout = document.getElementById('noiseReadout');
const nameField = document.getElementById('nameField');
const presetNameInput = document.getElementById('presetName');
const actions = document.getElementById('actions');
const downloadBtn = document.getElementById('downloadBtn');
const rerunBtn = document.getElementById('rerunBtn');
const rerollBtn = document.getElementById('rerollBtn');
const footnote = document.getElementById('footnote');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let currentValues = null;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function getImageData(img) {
  const MAX = 260;
  let w = img.naturalWidth, h = img.naturalHeight;
  const scale = Math.min(1, MAX / Math.max(w, h));
  w = Math.round(w * scale); h = Math.round(h * scale);
  canvas.width = w; canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

// El ruido de sensor es una textura de alta frecuencia: si se mide sobre la
// misma miniatura reducida que se usa para color (260px), el reescalado la
// difumina y el sigma sale sistemáticamente más bajo de lo real. Por eso el
// ruido se mide aparte, en un recorte central a resolución nativa (sin
// reescalar), que sí conserva la textura real del sensor.
function getNoiseCropImageData(img) {
  const CROP = 400;
  const w = img.naturalWidth, h = img.naturalHeight;
  const cw = Math.min(CROP, w), ch = Math.min(CROP, h);
  const sx = Math.floor((w - cw) / 2), sy = Math.floor((h - ch) / 2);
  canvas.width = cw; canvas.height = ch;
  ctx.drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);
  return ctx.getImageData(0, 0, cw, ch);
}

function renderBars(colorAnalysis, v) {
  const rows = [
    ['Temperatura', v.temp, 2000, 9500, v.temp + 'K', true],
    ['Tinte', v.tint, -80, 80, v.tint],
    ['Exposición', v.exposure, -1.5, 1.5, v.exposure],
    ['Contraste', v.contrast, -80, 80, v.contrast],
    ['Luces', v.highlights, -100, 60, v.highlights],
    ['Sombras', v.shadows, -60, 100, v.shadows],
    ['Blancos', v.whites, -60, 60, v.whites],
    ['Negros', v.blacks, -60, 60, v.blacks],
    ['Vibrancia', v.vibrance, -80, 80, v.vibrance],
    ['Saturación', v.saturation, -40, 40, v.saturation],
    ['Viñeta', v.vignetteAmount, -55, 55, v.vignetteAmount]
  ];
  bars.innerHTML = '';
  for (const [label, val, min, max, display, isTemp] of rows) {
    const row = document.createElement('div');
    row.className = 'label';
    row.textContent = label;

    const track = document.createElement('div');
    track.className = 'bar-track';
    const mid = document.createElement('div');
    mid.className = 'bar-mid';
    track.appendChild(mid);

    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    let pct = isTemp ? ((val - min) / (max - min)) * 100 - 50 : (val / max) * 50;
    pct = clamp(pct, -50, 50);
    if (pct >= 0) { fill.style.left = '50%'; fill.style.width = pct + '%'; }
    else { fill.style.left = (50 + pct) + '%'; fill.style.width = (-pct) + '%'; }
    track.appendChild(fill);

    const valEl = document.createElement('div');
    valEl.className = 'bar-val';
    valEl.textContent = display;

    bars.appendChild(row); bars.appendChild(track); bars.appendChild(valEl);
  }

  swatchRow.innerHTML = '';
  for (const c of colorAnalysis.swatches) {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = c;
    swatchRow.appendChild(sw);
  }
}

function describeNoise(sigma) {
  if (sigma < 2.5) return 'muy limpia — casi sin ruido visible';
  if (sigma < 5) return 'limpia — ruido mínimo, típico de bajo ISO';
  if (sigma < 8) return 'moderada — algo de ruido, ISO medio';
  if (sigma < 12) return 'perceptible — foto tomada con ISO alto o poca luz';
  return 'alta — bastante ruido, se aplicó reducción fuerte';
}

function renderNoise(v) {
  noiseReadout.innerHTML = `
    sigma detectado: <strong>${v.noiseSigma.toFixed(2)}</strong> — ${describeNoise(v.noiseSigma)}<br>
    reducción de ruido (luminancia): <strong>${v.luminanceSmoothing}</strong> ·
    reducción de ruido (color): <strong>${v.colorNoiseReduction}</strong> ·
    nitidez sugerida: <strong>${v.sharpenAmount}</strong>
  `;
}

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  fname.textContent = file.name;
  stage.classList.add('active');
  readout.style.display = 'none';
  nameField.style.display = 'none';
  actions.style.display = 'none';
  statusLine.textContent = 'analizando color, tono y ruido…';
  footnote.textContent = '';

  previewImg.onload = () => {
    setTimeout(() => {
      try {
        const imageData = getImageData(previewImg);
        const colorAnalysis = analyzeColor(imageData);
        const noiseSigma = estimateNoiseSigma(getNoiseCropImageData(previewImg));
        currentValues = computePresetValues(colorAnalysis, noiseSigma);

        renderBars(colorAnalysis, currentValues);
        renderNoise(currentValues);

        statusLine.textContent = 'análisis listo';
        readout.style.display = 'block';
        nameField.style.display = 'block';
        actions.style.display = 'flex';
        presetNameInput.value = generateFilmName(currentValues);
        footnote.textContent = 'El .xmp usa la misma estructura plana de atributos que un preset exportado desde Lightroom de escritorio, así que el nombre y todos los valores se leen bien al importarlo. El ruido se estima con el método de Immerkær (respuesta a un filtro Laplaciano en zonas parejas de la imagen) y ajusta automáticamente la reducción de ruido y la nitidez sugeridas. El resto de los valores —tono, HSL de 8 colores, split toning, grano, viñeta— surge del color y composición reales de la foto. No es una copia algorítmica exacta, pero se acerca bastante; podés ajustar cualquier deslizador en Lightroom después.';
      } catch (err) {
        console.error(err);
        statusLine.textContent = 'no se pudo analizar la imagen';
      }
    }, 30);
  };
}

// El dropzone y "elegir otra foto" son <label for="fileInput">: el navegador
// abre el selector de archivos de forma nativa con solo tocarlos, sin pasar
// por un .click() disparado por script (que en algunos navegadores móviles,
// sobre todo Safari en iOS con el input oculto por display:none, no siempre
// abre el selector).
dropzone.addEventListener('click', () => { fileInput.value = ''; });
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag');
  handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

changeBtn.addEventListener('click', () => { fileInput.value = ''; });

rerunBtn.addEventListener('click', () => {
  statusLine.textContent = 'analizando de nuevo…';
  handleFile(fileInput.files[0]);
});

rerollBtn.addEventListener('click', () => {
  if (!currentValues) return;
  presetNameInput.value = generateFilmName(currentValues);
});

downloadBtn.addEventListener('click', () => {
  if (!currentValues) return;
  const name = presetNameInput.value.trim() || 'Mi preset';
  const xmp = buildXMP(currentValues, name);
  const safeFile = name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() || 'preset';

  // Un .xmp suelto no siempre se descarga bien desde el celular: algunos
  // navegadores (Safari en iOS, algunos Chrome de Android) tratan el XML
  // como una página y lo abren en vez de guardarlo, o el share sheet nativo
  // rechaza compartir ese tipo de archivo. Un .zip es un tipo binario que
  // todos los navegadores fuerzan a descargar, nunca a mostrar, así que
  // evita el problema de raíz en vez de depender de cada navegador. En
  // Archivos (iOS/Android) se abre con un toque y queda descomprimido.
  const prevLabel = downloadBtn.textContent;
  downloadBtn.disabled = true;
  try {
    const zipBlob = zipSingleFile(safeFile + '.xmp', xmp);

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFile + '.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = prevLabel;
  }
});
