#!/usr/bin/env node
/**
 * Regenerates raster brand assets (favicons, Open Graph image, PNG logo)
 * from the built site. Needs Playwright + a running preview server:
 *
 *   npm start &   then   node scripts/generate-raster.js
 *
 * Re-run after replacing the logo. Outputs are committed to /static and
 * /assets/img, so normal builds don't need Playwright.
 */
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BASE = process.env.BASE || 'http://localhost:4173';
const LOGO = require('./logo');

const icon = (size, pad) => `<body style="margin:0;background:#050505;width:${size}px;height:${size}px;display:grid;place-items:center">
${LOGO.svg({ fill: '#F5F4F0', attrs: `style="width:${size - pad * 2}px"` })}</body>`;

const og = `<!doctype html><html><head><link rel="stylesheet" href="${BASE}/assets/css/main.css"></head>
<body style="margin:0;width:1200px;height:630px;background:#050505;color:#F5F4F0;overflow:hidden;position:relative">
  <img src="${BASE}/assets/img/scenes/kitchen-after.svg" style="position:absolute;right:0;top:0;width:640px;height:630px;object-fit:cover;clip-path:polygon(0 0,calc(100% - 60px) 0,100% 60px,100% 100%,0 100%)">
  <div style="position:absolute;right:0;top:0;width:640px;height:630px;background:linear-gradient(90deg,#050505 0%,rgba(5,5,5,0) 40%)"></div>
  <div style="position:absolute;left:64px;top:64px;bottom:64px;width:620px;display:flex;flex-direction:column;justify-content:space-between">
    <span class="brand__lockup" style="gap:16px">${LOGO.svg({ fill: '#F5F4F0', attrs: 'style="width:64px"' })}
      <span class="brand__type"><span class="brand__name" style="font-size:2.1rem">BOTWIN</span><span class="brand__sub" style="font-size:.8rem">RENOVATIONS</span></span></span>
    <div>
      <div class="display" style="font-size:5.4rem;font-stretch:76%;line-height:.86">TRANSFORMING<br>SPACES.<br><span style="color:transparent;-webkit-text-stroke:2px #F5F4F0">BUILT TO LAST.</span></div>
      <p class="mono" style="margin-top:28px;color:#A5A5A5;font-size:.9rem">Renovation &amp; Remodeling · Nashville, TN</p>
    </div>
  </div>
  <div style="position:absolute;left:64px;right:64px;bottom:0;height:10px;background:#F5F4F0;width:96px"></div>
</body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const shot = async (html, w, h, out) => {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(`${BASE}/`); // same-origin so fonts load
    await p.setContent(html, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(ROOT, out), omitBackground: false });
    console.log('✔', out);
  };
  await shot(icon(32, 2), 32, 32, 'static/favicon-32.png');
  await shot(icon(180, 24), 180, 180, 'static/apple-touch-icon.png');
  await shot(icon(512, 64), 512, 512, 'assets/img/logo-mark.png');
  await shot(og, 1200, 630, 'assets/img/og-image.png');
  await b.close();
})();
