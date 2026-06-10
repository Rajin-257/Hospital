const path = require('path');
const fs = require('fs');

const FONT_DIR = path.join(__dirname, '../node_modules/@fontsource/noto-sans-bengali/files');

const FONT_FILES = [
  { file: 'noto-sans-bengali-bengali-400-normal.woff', weight: 400 },
  { file: 'noto-sans-bengali-bengali-600-normal.woff', weight: 600 },
  { file: 'noto-sans-bengali-latin-400-normal.woff', weight: 400 }
];

let cachedFontFaceCss = null;

function buildEmbeddedFontFaceCss() {
  if (cachedFontFaceCss !== null) {
    return cachedFontFaceCss;
  }

  const rules = [];
  for (const entry of FONT_FILES) {
    const filePath = path.join(FONT_DIR, entry.file);
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const data = fs.readFileSync(filePath).toString('base64');
    rules.push(
      "@font-face{font-family:'Noto Sans Bengali';font-style:normal;" +
      `font-weight:${entry.weight};font-display:swap;` +
      `src:url(data:font/woff;base64,${data}) format('woff');}`
    );
  }

  cachedFontFaceCss = rules.join('\n');
  return cachedFontFaceCss;
}

function getPdfExportHeadHtml() {
  const fontCss = buildEmbeddedFontFaceCss();
  return fontCss
    ? `<style id="pdf-bengali-fonts">\n${fontCss}\n</style>`
    : '';
}

module.exports = {
  buildEmbeddedFontFaceCss,
  getPdfExportHeadHtml
};
