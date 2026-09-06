// Generador mínimo de archivos .zip (un solo archivo, sin comprimir) en
// JS puro, sin dependencias externas. El sitio se sirve como archivos
// crudos (sin bundler) en GitHub Pages, así que un import "pelado" como
// `import JSZip from 'jszip'` no lo puede resolver el navegador y rompe
// la carga de todo el script.

function crc32(bytes) {
  let crc = ~0;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

/**
 * Arma un .zip (método "stored", sin comprimir) con un único archivo de
 * texto adentro.
 * @param {string} filename - nombre del archivo dentro del zip
 * @param {string} content - contenido de texto del archivo
 * @returns {Blob}
 */
export function zipSingleFile(filename, content) {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(filename);
  const dataBytes = encoder.encode(content);
  const crc = crc32(dataBytes);

  const localHeader = new Uint8Array(30 + nameBytes.length);
  const lv = new DataView(localHeader.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint16(4, 20, true);
  lv.setUint16(6, 0, true);
  lv.setUint16(8, 0, true);
  lv.setUint16(10, 0, true);
  lv.setUint16(12, 0x21, true);
  lv.setUint32(14, crc, true);
  lv.setUint32(18, dataBytes.length, true);
  lv.setUint32(22, dataBytes.length, true);
  lv.setUint16(26, nameBytes.length, true);
  lv.setUint16(28, 0, true);
  localHeader.set(nameBytes, 30);

  const centralHeader = new Uint8Array(46 + nameBytes.length);
  const cv = new DataView(centralHeader.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint16(4, 20, true);
  cv.setUint16(6, 20, true);
  cv.setUint16(8, 0, true);
  cv.setUint16(10, 0, true);
  cv.setUint16(12, 0, true);
  cv.setUint16(14, 0x21, true);
  cv.setUint32(16, crc, true);
  cv.setUint32(20, dataBytes.length, true);
  cv.setUint32(24, dataBytes.length, true);
  cv.setUint16(28, nameBytes.length, true);
  cv.setUint16(30, 0, true);
  cv.setUint16(32, 0, true);
  cv.setUint16(34, 0, true);
  cv.setUint16(36, 0, true);
  cv.setUint32(38, 0, true);
  cv.setUint32(42, 0, true);
  centralHeader.set(nameBytes, 46);

  const localSize = localHeader.length + dataBytes.length;
  const centralSize = centralHeader.length;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, 1, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, localSize, true);
  ev.setUint16(20, 0, true);

  return new Blob([localHeader, dataBytes, centralHeader, eocd], { type: 'application/zip' });
}
