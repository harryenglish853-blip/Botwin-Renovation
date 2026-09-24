#!/usr/bin/env node
/**
 * Builds the client review PDF from review/deck.html with fresh screenshots.
 *
 *   npm start            (in another terminal: the preview server must be running)
 *   npm run deck         →  preview/Botwin-Renovations-Website-Draft.pdf
 *
 * Needs Playwright (dev-only, like scripts/generate-raster.js).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const LOGO = require('./logo');

const ROOT = path.join(__dirname, '..');
const BASE = process.env.BASE || 'http://localhost:4173';
const WORK = path.join(ROOT, 'dist', '_review'); // served by the preview server
const SHOTS = path.join(WORK, 'shots');
const OUT = path.join(ROOT, 'preview', 'Botwin-Renovations-Website-Draft.pdf');
const JPG = { type: 'jpeg', quality: 84 };

const scrollAll = async (p) => {
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); }
    scrollTo(0, 0);
  });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(700);
};

async function capture(browser) {
  const sizes = {};
  // desktop home sections (reduced motion so every reveal is in its final state; header hidden)
  let p = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1.25 });
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await scrollAll(p);
  await p.addStyleTag({ content: '.site-header,.skip-link{display:none!important}' });
  for (const [name, sel] of [['d-statement', '#statement'], ['d-transformations', '#transformations'], ['d-services', '#services'], ['d-projects', '#projects'], ['d-about', '#about'], ['d-process', '#process'], ['d-why', '#why'], ['d-reviews', '#reviews'], ['d-service-area', '#service-area'], ['d-contact', '#contact']]) {
    const el = await p.$(sel);
    const bb = await el.boundingBox();
    sizes[name] = [Math.round(bb.width), Math.round(bb.height)];
    await el.screenshot({ path: path.join(SHOTS, name + '.jpg'), ...JPG });
  }
  await p.close();

  // inner pages, top of page
  p = await browser.newPage({ viewport: { width: 1440, height: 2350 }, reducedMotion: 'reduce', deviceScaleFactor: 1.25 });
  for (const [name, route] of [['p-service', '/services/kitchen-remodeling/'], ['p-case', '/projects/kitchen-transformation/'], ['p-area', '/service-areas/nashville-tn/']]) {
    await p.goto(BASE + route, { waitUntil: 'networkidle' });
    await scrollAll(p);
    sizes[name] = [1440, 2350];
    await p.screenshot({ path: path.join(SHOTS, name + '.jpg'), ...JPG });
  }
  await p.close();

  // hero sequence with motion on
  p = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1800);
  const h = await p.evaluate(() => document.querySelector('[data-hero]').offsetHeight - innerHeight);
  for (const [n, f] of [['0', 0], ['wipe', 0.26], ['1', 0.5], ['2', 1]]) {
    await p.evaluate((y) => scrollTo(0, y), Math.round(h * f));
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(SHOTS, `hero-${n}.jpg`), ...JPG });
  }
  await p.close();

  // phone screens
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1800);
  await p.screenshot({ path: path.join(SHOTS, 'ph-hero.jpg'), ...JPG });
  const at = async (sel, name, offset) => {
    await p.evaluate(([s, o]) => scrollTo(0, document.querySelector(s).getBoundingClientRect().top + scrollY - 72 + o), [sel, offset]);
    await p.waitForTimeout(800);
    await p.evaluate(() => scrollBy(0, 1)); // nudge observers
    await p.waitForTimeout(2200);
    await p.screenshot({ path: path.join(SHOTS, `ph-${name}.jpg`), ...JPG });
  };
  await at('#transformations .tabs', 'slider', -60);
  await at('.project--split', 'projects', -300);
  await at('#contact .contact__panel', 'form', 0);
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(400);
  await p.click('[data-menu-toggle]');
  await p.waitForTimeout(1000);
  await p.screenshot({ path: path.join(SHOTS, 'ph-menu.jpg'), ...JPG });
  await ctx.close();
  return sizes;
}

(async () => {
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const browser = await chromium.launch();
  const sizes = await capture(browser);

  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const html = fs
    .readFileSync(path.join(ROOT, 'review', 'deck.html'), 'utf8')
    .replace(/\{\{LOGO\}\}/g, () => LOGO.svg({ fill: '#F5F4F0' }))
    .replace(/\{\{DATE\}\}/g, () => date)
    .replace(/<div class="shot" data-shot="([\w-]+)"><\/div>/g, (_, n) => {
      const [w, h] = sizes[n];
      return `<div class="shot" style="background-image:url(shots/${n}.jpg);aspect-ratio:${w}/${h}"></div>`;
    });
  fs.writeFileSync(path.join(WORK, 'index.html'), html);

  const p = await browser.newPage();
  await p.goto(BASE + '/_review/index.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  await p.pdf({ path: OUT, width: '11in', height: '8.5in', printBackground: true, preferCSSPageSize: true });
  if (process.env.PREVIEW_PAGES) {
    await p.setViewportSize({ width: 1056, height: 816 });
    const pages = await p.$$('.page');
    for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: path.join(process.env.PREVIEW_PAGES, `pg-${String(i + 1).padStart(2, '0')}.png`) });
  }
  await browser.close();
  console.log(`✔ ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024 / 1024).toFixed(1)} MB)`);
})();
