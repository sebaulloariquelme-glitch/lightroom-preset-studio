# Foto a Preset · Lightroom Preset Studio

Sitio que analiza una foto de referencia (color, tono, ruido) directamente en el
navegador y genera un preset **.xmp** listo para importar en Lightroom (incluido
Lightroom Mobile en iPhone).

Todo el análisis corre en el cliente con `canvas` — la foto nunca sale del navegador.

## Qué analiza

- **Color y tono**: temperatura, tinte, exposición, contraste, luces, sombras,
  blancos, negros, vibrancia y saturación, calculados a partir del balance de
  color y la distribución de luminancia de la imagen.
- **Panel HSL (8 colores)**: matiz, saturación y luminancia por rango de color
  (rojo, naranja, amarillo, verde, aqua, azul, púrpura, magenta).
- **Split toning**: color dominante en sombras vs. luces.
- **Viñeta**: comparación de brillo entre esquinas y centro de la foto.
- **Ruido**: estimación real de sigma de ruido con el método de
  [Immerkær](https://www.cs.tut.fi/~lasip/) (respuesta a un filtro Laplaciano
  en zonas parejas de la imagen), que ajusta automáticamente la reducción de
  ruido (luminancia y color) y la nitidez sugeridas.

El resultado es un `.xmp` con la misma estructura plana de atributos que un
preset exportado desde Lightroom de escritorio (`crs:Name="..."` como atributo
simple), lo que garantiza que Lightroom lo lea correctamente — nombre incluido.

## Desarrollo local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Genera el sitio estático en `dist/`.

## Deploy en GitHub Pages

Ya incluye un workflow (`.github/workflows/deploy.yml`) que hace build y
publica automáticamente en GitHub Pages con cada push a `main`.

Para activarlo:

1. Subí este repo a GitHub.
2. En **Settings → Pages**, elegí **Source: GitHub Actions**.
3. Hacé push a `main` (o corré el workflow manualmente desde la pestaña Actions).

No hace falta configurar el nombre del repo en ningún lado: `vite.config.js`
usa una base relativa (`base: './'`), así que funciona en cualquier subruta de
GitHub Pages.

## Estructura del proyecto

```
├── index.html              # markup principal
├── src/
│   ├── main.js              # conecta el análisis con la UI
│   ├── style.css
│   └── lib/
│       ├── colorAnalysis.js  # temperatura, HSL, split toning, viñeta
│       ├── noiseAnalysis.js  # estimación de ruido (Immerkær) → sliders
│       ├── presetValues.js   # traduce el análisis a valores de Lightroom
│       ├── xmpBuilder.js     # arma el .xmp final
│       └── filmNames.js      # nombres estilo carrete analógico
└── .github/workflows/deploy.yml
```

## Notas honestas sobre la precisión

Esto no es una réplica algorítmica pixel a pixel del estilo de la foto de
referencia (eso requeriría un modelo de transferencia de color entrenado, no
solo estadísticas de la imagen). Es una aproximación bastante fiel basada en
promedios de color, tono y ruido reales de la foto — suficiente para acercarse
al carácter de la imagen y quedar como punto de partida editable en Lightroom.
