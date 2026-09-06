import { HUE_BUCKETS } from './colorAnalysis.js';

function fmtSigned(n, decimals = 0) {
  const num = +(+n).toFixed(decimals);
  return (num >= 0 ? '+' : '') + num.toFixed(decimals);
}

function fmtUnsigned(n, decimals = 0) {
  return (+(+n).toFixed(decimals)).toFixed(decimals);
}

function escapeXmlAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Construye un .xmp con un único <rdf:Description> de atributos planos
 * (crs:Name="..." como atributo simple, no como texto localizado en rdf:Alt).
 * Esta es la estructura que Lightroom lee de forma más confiable — es la misma
 * que usan los presets exportados directamente desde Lightroom de escritorio.
 *
 * @param {object} v - valores calculados por computePresetValues()
 * @param {string} name - nombre visible del preset en Lightroom
 */
export function buildXMP(v, name) {
  const escName = escapeXmlAttr(name);

  const hslLines = [];
  for (const b of HUE_BUCKETS) {
    const s = v.hsl[b.name];
    hslLines.push(`   crs:HueAdjustment${b.name}="${fmtSigned(s.hue)}"`);
    hslLines.push(`   crs:SaturationAdjustment${b.name}="${fmtSigned(s.sat)}"`);
    hslLines.push(`   crs:LuminanceAdjustment${b.name}="${fmtSigned(s.lum)}"`);
  }

  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
   xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:Version="14.4"
   crs:ProcessVersion="11.0"
   crs:PresetType="Normal"
   crs:Name="${escName}"
   crs:Exposure="${fmtSigned(v.exposure, 2)}"
   crs:Contrast="${fmtSigned(v.contrast)}"
   crs:Highlights="${fmtSigned(v.highlights)}"
   crs:Shadows="${fmtSigned(v.shadows)}"
   crs:Whites="${fmtSigned(v.whites)}"
   crs:Blacks="${fmtSigned(v.blacks)}"
   crs:Temp="${fmtUnsigned(v.temp)}"
   crs:Tint="${fmtSigned(v.tint)}"
   crs:Vibrance="${fmtSigned(v.vibrance)}"
   crs:Saturation="${fmtSigned(v.saturation)}"
${hslLines.join('\n')}
   crs:SplitToningShadowHue="${fmtUnsigned(v.splitShadowHue)}"
   crs:SplitToningShadowSaturation="${fmtUnsigned(v.splitShadowSat)}"
   crs:SplitToningHighlightHue="${fmtUnsigned(v.splitHighlightHue)}"
   crs:SplitToningHighlightSaturation="${fmtUnsigned(v.splitHighlightSat)}"
   crs:SplitToningBalance="${fmtSigned(v.splitBalance)}"
   crs:Sharpness="${fmtUnsigned(v.sharpenAmount)}"
   crs:SharpenRadius="${fmtUnsigned(v.sharpenRadius, 1)}"
   crs:SharpenDetail="${fmtUnsigned(v.sharpenDetail)}"
   crs:SharpenEdgeMasking="${fmtUnsigned(v.sharpenEdgeMasking)}"
   crs:LuminanceSmoothing="${fmtUnsigned(v.luminanceSmoothing)}"
   crs:LuminanceNoiseReductionDetail="${fmtUnsigned(v.luminanceDetail)}"
   crs:ColorNoiseReduction="${fmtUnsigned(v.colorNoiseReduction)}"
   crs:ColorNoiseReductionDetail="${fmtUnsigned(v.colorNoiseDetail)}"
   crs:GrainAmount="${fmtUnsigned(v.grainAmount)}"
   crs:GrainSize="${fmtUnsigned(v.grainSize)}"
   crs:GrainFrequency="${fmtUnsigned(v.grainFrequency)}"
   crs:VignetteAmount="${fmtSigned(v.vignetteAmount)}"
   crs:VignetteMidpoint="${fmtUnsigned(v.vignetteMidpoint)}"
   crs:VignetteFeather="${fmtUnsigned(v.vignetteFeather)}"
   crs:VignetteRoundness="${fmtUnsigned(v.vignetteRoundness)}"
   crs:VignetteStyle="${fmtUnsigned(v.vignetteStyle)}"
  />
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>
`;
}
