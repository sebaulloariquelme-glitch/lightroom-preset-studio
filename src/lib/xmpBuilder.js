import { HUE_BUCKETS } from './colorAnalysis.js';

function fmtSigned(n, decimals = 0) {
  const num = +(+n).toFixed(decimals);
  return (num >= 0 ? '+' : '') + num.toFixed(decimals);
}

function fmtUnsigned(n, decimals = 0) {
  return (+(+n).toFixed(decimals)).toFixed(decimals);
}

function escapeXmlText(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').toUpperCase();
  }
  let hex = '';
  for (let i = 0; i < 32; i++) hex += Math.floor(Math.random() * 16).toString(16);
  return hex.toUpperCase();
}

/**
 * Construye un .xmp con la misma estructura que un preset "de verdad"
 * exportado desde Lightroom (boilerplate de compatibilidad, campos del
 * proceso 2012, y crs:Name/Group/Description como texto localizado en
 * rdf:Alt — no como atributo plano). Sin esta estructura Lightroom Mobile
 * ignora crs:Name y usa el nombre del archivo en su lugar.
 *
 * @param {object} v - valores calculados por computePresetValues()
 * @param {string} name - nombre visible del preset en Lightroom
 */
export function buildXMP(v, name) {
  const escName = escapeXmlText(name);

  const hslLines = [];
  for (const b of HUE_BUCKETS) {
    const s = v.hsl[b.name];
    hslLines.push(`   crs:HueAdjustment${b.name}="${fmtSigned(s.hue)}"`);
    hslLines.push(`   crs:SaturationAdjustment${b.name}="${fmtSigned(s.sat)}"`);
    hslLines.push(`   crs:LuminanceAdjustment${b.name}="${fmtSigned(s.lum)}"`);
  }

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
   xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Cluster=""
   crs:UUID="${generateUUID()}"
   crs:SupportsAmount="False"
   crs:SupportsColor="True"
   crs:SupportsMonochrome="True"
   crs:SupportsHighDynamicRange="True"
   crs:SupportsNormalDynamicRange="True"
   crs:SupportsSceneReferred="True"
   crs:SupportsOutputReferred="True"
   crs:CameraModelRestriction=""
   crs:Copyright=""
   crs:ContactInfo=""
   crs:Version="14.4"
   crs:ProcessVersion="11.0"
   crs:WhiteBalance="Custom"
   crs:Temp="${fmtUnsigned(v.temp)}"
   crs:Tint="${fmtSigned(v.tint)}"
   crs:Exposure2012="${fmtSigned(v.exposure, 2)}"
   crs:Contrast2012="${fmtSigned(v.contrast)}"
   crs:Highlights2012="${fmtSigned(v.highlights)}"
   crs:Shadows2012="${fmtSigned(v.shadows)}"
   crs:Whites2012="${fmtSigned(v.whites)}"
   crs:Blacks2012="${fmtSigned(v.blacks)}"
   crs:Texture="${fmtSigned(v.texture)}"
   crs:Clarity2012="${fmtSigned(v.clarity)}"
   crs:Dehaze="${fmtSigned(v.dehaze)}"
   crs:Vibrance="${fmtSigned(v.vibrance)}"
   crs:Saturation="${fmtSigned(v.saturation)}"
   crs:ParametricShadows="0"
   crs:ParametricDarks="0"
   crs:ParametricLights="0"
   crs:ParametricHighlights="0"
   crs:ParametricShadowSplit="25"
   crs:ParametricMidtoneSplit="50"
   crs:ParametricHighlightSplit="75"
   crs:Sharpness="${fmtUnsigned(v.sharpenAmount)}"
   crs:SharpenRadius="${fmtUnsigned(v.sharpenRadius, 1)}"
   crs:SharpenDetail="${fmtUnsigned(v.sharpenDetail)}"
   crs:SharpenEdgeMasking="${fmtUnsigned(v.sharpenEdgeMasking)}"
   crs:LuminanceSmoothing="${fmtUnsigned(v.luminanceSmoothing)}"
   crs:LuminanceNoiseReductionDetail="${fmtUnsigned(v.luminanceDetail)}"
   crs:LuminanceNoiseReductionContrast="0"
   crs:ColorNoiseReduction="${fmtUnsigned(v.colorNoiseReduction)}"
   crs:ColorNoiseReductionDetail="${fmtUnsigned(v.colorNoiseDetail)}"
   crs:ColorNoiseReductionSmoothness="50"
${hslLines.join('\n')}
   crs:SplitToningShadowHue="${fmtUnsigned(v.splitShadowHue)}"
   crs:SplitToningShadowSaturation="${fmtUnsigned(v.splitShadowSat)}"
   crs:SplitToningHighlightHue="${fmtUnsigned(v.splitHighlightHue)}"
   crs:SplitToningHighlightSaturation="${fmtUnsigned(v.splitHighlightSat)}"
   crs:SplitToningBalance="${fmtSigned(v.splitBalance)}"
   crs:ColorGradeShadowHue="${fmtUnsigned(v.colorGradeShadowHue)}"
   crs:ColorGradeShadowSat="${fmtUnsigned(v.colorGradeShadowSat)}"
   crs:ColorGradeMidtoneHue="${fmtUnsigned(v.colorGradeMidtoneHue)}"
   crs:ColorGradeMidtoneSat="${fmtUnsigned(v.colorGradeMidtoneSat)}"
   crs:ColorGradeHighlightHue="${fmtUnsigned(v.colorGradeHighlightHue)}"
   crs:ColorGradeHighlightSat="${fmtUnsigned(v.colorGradeHighlightSat)}"
   crs:ColorGradeShadowLum="0"
   crs:ColorGradeMidtoneLum="0"
   crs:ColorGradeHighlightLum="0"
   crs:ColorGradeBlending="${fmtUnsigned(v.colorGradeBlending)}"
   crs:ColorGradeGlobalHue="0"
   crs:ColorGradeGlobalSat="0"
   crs:ColorGradeGlobalLum="0"
   crs:AutoLateralCA="0"
   crs:LensProfileEnable="0"
   crs:LensManualDistortionAmount="0"
   crs:VignetteAmount="0"
   crs:DefringePurpleAmount="0"
   crs:DefringePurpleHueLo="30"
   crs:DefringePurpleHueHi="70"
   crs:DefringeGreenAmount="0"
   crs:DefringeGreenHueLo="40"
   crs:DefringeGreenHueHi="60"
   crs:GrainAmount="${fmtUnsigned(v.grainAmount)}"
   crs:GrainSize="${fmtUnsigned(v.grainSize)}"
   crs:GrainFrequency="${fmtUnsigned(v.grainFrequency)}"
   crs:PostCropVignetteAmount="${fmtSigned(v.vignetteAmount)}"
   crs:PostCropVignetteMidpoint="${fmtUnsigned(v.vignetteMidpoint)}"
   crs:PostCropVignetteFeather="${fmtUnsigned(v.vignetteFeather)}"
   crs:PostCropVignetteRoundness="${fmtUnsigned(v.vignetteRoundness)}"
   crs:PostCropVignetteStyle="${fmtUnsigned(v.vignetteStyle)}"
   crs:PostCropVignetteHighlightContrast="0"
   crs:ShadowTint="0"
   crs:RedHue="0"
   crs:RedSaturation="0"
   crs:GreenHue="0"
   crs:GreenSaturation="0"
   crs:BlueHue="0"
   crs:BlueSaturation="0"
   crs:ConvertToGrayscale="False"
   crs:OverrideLookVignette="False"
   crs:ToneCurveName2012="Linear"
   crs:CameraProfile="Default Color"
   crs:HasSettings="True"
   crs:CropConstrainToWarp="0">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escName}</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:ShortName>
    <rdf:Alt>
     <rdf:li xml:lang="x-default"/>
    </rdf:Alt>
   </crs:ShortName>
   <crs:SortName>
    <rdf:Alt>
     <rdf:li xml:lang="x-default"/>
    </rdf:Alt>
   </crs:SortName>
   <crs:Group>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Foto a Preset</rdf:li>
    </rdf:Alt>
   </crs:Group>
   <crs:Description>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Generado a partir del análisis de color, tono y ruido de una foto de referencia.</rdf:li>
    </rdf:Alt>
   </crs:Description>
   <crs:ToneCurvePV2012>
    <rdf:Seq>
     <rdf:li>0, 0</rdf:li>
     <rdf:li>255, 255</rdf:li>
    </rdf:Seq>
   </crs:ToneCurvePV2012>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>
`;
}
