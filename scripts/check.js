#!/usr/bin/env node
/**
 * Static QA for ./dist (run via `npm test`):
 *  - every internal link / asset reference resolves to a file
 *  - every in-page #anchor exists on the target page
 *  - no bare "#" or empty hrefs, no javascript: links
 *  - each page has exactly one <h1>, a <title>, meta description and canonical
 *  - every <img> has an alt attribute
 *  - JSON-LD blocks parse
 */
const fs = require('fs');
const path = require('path');
const DIST = path.join(__dirname, '..', 'dist');

const pages = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.html')) pages.push(p);
  }
})(DIST);

const ids = new Map();
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  ids.set(p, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
}
const fileFor = (url) => {
  let u = url.split('#')[0].split('?')[0];
  if (u === '' ) return null;
  if (u.endsWith('/')) u += 'index.html';
  return path.join(DIST, decodeURIComponent(u));
};

let problems = 0;
const fail = (page, msg) => { problems++; console.log(`✖ ${path.relative(DIST, page)}: ${msg}`); };

for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  const rel = '/' + path.relative(DIST, p).replace(/index\.html$/, '');
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) fail(p, `${h1} <h1> elements`);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(p, 'missing <title>');
  if (!/<meta name="description" content="[^"]{30,}">/.test(html)) fail(p, 'missing/short meta description');
  if (!/<link rel="canonical" href="https?:\/\/[^"]+">/.test(html)) fail(p, 'missing canonical');
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt="/.test(m[0])) fail(p, `img without alt: ${m[0].slice(0, 80)}`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { fail(p, 'invalid JSON-LD'); }
  }
  for (const m of html.matchAll(/\s(href|src|action)="([^"]*)"/g)) {
    const [, attr, url] = m;
    if (attr === 'href' && (url === '' || url === '#')) { fail(p, `empty/# link`); continue; }
    if (/^javascript:/i.test(url)) { fail(p, `javascript: link`); continue; }
    if (/^(https?:|mailto:|tel:|data:)/.test(url)) {
      if (/^tel:/.test(url) && !/^tel:\+?\d{10,15}$/.test(url)) fail(p, `bad tel: ${url}`);
      if (/^mailto:/.test(url) && !/^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(url)) fail(p, `bad mailto: ${url}`);
      continue;
    }
    if (attr === 'action' && url === '/') continue;
    const [base, hash] = url.split('#');
    const target = base === '' ? p : fileFor(url.startsWith('/') ? url : path.posix.join(rel, url));
    if (!target || !fs.existsSync(target)) { fail(p, `broken ${attr}: ${url}`); continue; }
    if (hash && target.endsWith('.html') && !ids.get(target)?.has(hash)) fail(p, `missing anchor #${hash} in ${url}`);
  }
}
for (const f of ['robots.txt', 'sitemap.xml', 'favicon.svg', 'site.webmanifest', '404.html']) {
  if (!fs.existsSync(path.join(DIST, f))) { problems++; console.log(`✖ missing ${f}`); }
}
console.log(problems ? `\n${problems} problem(s) across ${pages.length} pages` : `✔ ${pages.length} pages checked — links, anchors, headings, meta, alt text and JSON-LD OK`);
process.exit(problems ? 1 : 0);
