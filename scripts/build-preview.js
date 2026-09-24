#!/usr/bin/env node
/**
 * Packs the home page into ONE self-contained HTML file for client review.
 *
 *   npm run preview-file   →  preview/botwin-website-preview.html
 *
 * Fonts, styles, scripts and images are all embedded, so the file can be
 * emailed and opened by double-clicking — no hosting needed. Links to inner
 * pages jump to the matching home-page section, and the contact form shows
 * its success state without sending anything.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT_DIR = path.join(ROOT, 'preview');
const OUT = path.join(OUT_DIR, 'botwin-website-preview.html');

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('Run `npm run build` first.');
  process.exit(1);
}

const read = (rel, enc) => fs.readFileSync(path.join(DIST, rel), enc);
const dataUri = (rel, mime) => `data:${mime};base64,${read(rel).toString('base64')}`;

let html = read('index.html', 'utf8');
let css = read('assets/css/main.css', 'utf8');
const js = read('assets/js/main.js', 'utf8');

// fonts → embedded
css = css.replace(/url\('\/assets\/fonts\/([^']+)'\)/g, (_, f) => `url('${dataUri('assets/fonts/' + f, 'font/woff2')}')`);

// head: drop external references, inline the stylesheet
html = html
  .replace(/<link rel="(?:preload|stylesheet|icon|apple-touch-icon|manifest)"[^>]*>\n?/g, '')
  .replace(/<script src="\/assets\/js\/main\.js[^"]*" defer><\/script>\n?/, '')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, '')
  .replace(/<link rel="canonical"[^>]*>\n?/, '')
  .replace('</head>', () => `<style>${css}\n${PREVIEW_CSS()}</style>\n</head>`);

// scene images → embedded
html = html.replace(/src="\/assets\/img\/scenes\/([\w-]+)\.svg(?:\?v=[^"]*)?"/g, (_, n) => `src="${dataUri(`assets/img/scenes/${n}.svg`, 'image/svg+xml')}"`);

// links: keep everything inside this one page
html = html
  .replace(/href="\/#([\w-]+)"/g, 'href="#$1"')
  .replace(/href="\/"/g, 'href="#top"')
  .replace(/href="\/services\/[^"]*"/g, 'href="#services"')
  .replace(/href="\/projects\/[^"]*"/g, 'href="#projects"')
  .replace(/href="\/service-areas\/[^"]*"/g, 'href="#service-area"')
  .replace(/<a href="\/(?:privacy|terms)\/">([^<]*)<\/a>/g, '<span>$1</span>')
  .replace(/<li><a href="\/sitemap\.xml">Sitemap<\/a><\/li>/g, '')
  .replace(/action="\/thank-you\/"/g, 'action="#contact"');

// preview banner + simulated form submit, then the site script
// function replacers: the embedded code contains `$$`, which a replacement string would mangle
html = html.replace(
  '</body>',
  () => `<div class="preview-pill" role="note"><span>Draft preview</span>Botwin Renovations website</div>
<script>
/* Preview only: the form shows its success state without sending anything. */
(function(){var f=window.fetch;window.fetch=function(u,o){if(o&&o.method==='POST'){return new Promise(function(r){setTimeout(function(){r(new Response('{"ok":true}',{status:200}))},900)})}return f.apply(this,arguments)}})();
</script>
<script>${js}</script>
</body>`
);

const leftovers = html.match(/(?:src|href)="\/[^"#][^"]*"/g);
if (leftovers) console.warn('⚠ unresolved local references:', [...new Set(leftovers)].slice(0, 10));

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`✔ ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB)`);

function PREVIEW_CSS() {
  return `.preview-pill{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:80;display:flex;gap:10px;align-items:center;
  padding:8px 14px;background:rgba(5,5,5,.88);color:#F5F4F0;font:500 10px/1.2 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;
  box-shadow:0 0 0 1px rgba(245,244,240,.2);white-space:nowrap;pointer-events:none}
.preview-pill span{background:#F5F4F0;color:#050505;padding:3px 6px}
@media (max-width:420px){.preview-pill{font-size:9px}}`;
}
