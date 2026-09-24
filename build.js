#!/usr/bin/env node
/**
 * Botwin Renovations — static site builder (zero dependencies).
 *
 *   node build.js            → builds ./dist
 *
 * Content lives in site.config.js. Templates live in this file.
 */
const fs = require('fs');
const path = require('path');
const config = require('./site.config');
const scenes = require('./scripts/scenes');
const LOGO = require('./scripts/logo');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const { company, contact, serviceArea, credentials, social, form } = config;
const SITE = company.siteUrl.replace(/\/$/, '');
const BUILD_ID = Date.now().toString(36);

const services = config.services.filter((s) => s.offered);
const projects = config.projects;
const reviews = config.reviews || [];

// ------------------------------------------------------------ utilities
const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const pad = (n) => String(n).padStart(2, '0');
const write = (rel, content) => {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};
const copyDir = (src, dest) => {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dest, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
};

const cityLabel = `${serviceArea.primaryCity}, ${serviceArea.region}`;
const citySlug = slugify(`${serviceArea.primaryCity}-${serviceArea.region}`);
const tbc = (label = 'To be confirmed') => `<span class="tbc">${esc(label)}</span>`;
const categories = [
  ['all', 'All'],
  ['kitchens', 'Kitchens'],
  ['bathrooms', 'Bathrooms'],
  ['interiors', 'Interiors'],
  ['exteriors', 'Exteriors'],
  ['full', 'Full Renovations'],
].filter(([k]) => k === 'all' || projects.some((p) => p.category === k));

// ----------------------------------------------------------------- icons
const ARROW = `<svg class="i-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 12h16M13 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"/></svg>`;
const mark = (cls = '') => LOGO.svg({ attrs: `class="mark ${cls}" aria-hidden="true" focusable="false"` });
const ICONS = {
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  mail: '<path d="M3 5h18v14H3z"/><path d="M3 6l9 7 9-7"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><path d="M12 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>',
  facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4V8z"/>',
  instagram: '<path d="M4 4h16v16H4z"/><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M17 7h.01"/>',
  google: '<path d="M20 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.5a4 4 0 0 1-1.7 2.6v2.1h2.8c1.6-1.5 2.4-3.7 2.4-6.3z"/><path d="M12 20.5c2.3 0 4.2-.8 5.6-2l-2.8-2.1c-.8.5-1.7.8-2.8.8-2.2 0-4-1.5-4.7-3.4H4.5v2.2a8.5 8.5 0 0 0 7.5 4.5z"/>',
  camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>',
  houzz: '<path d="M6 3v18h5v-6h2v6h5V10l-7-2V3z"/>',
};
const icon = (name) =>
  `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="miter">${ICONS[name]}</g></svg>`;

// ---------------------------------------------------------------- images
/**
 * `ref` is either a scene name (e.g. 'kitchen-after') or a path to a real
 * photo (e.g. '/assets/img/projects/kitchen-1.jpg'). For real photos, if
 * `npm run images` produced -640/-1280/-1920 .avif/.webp variants, a
 * responsive <picture> is emitted.
 */
function img(ref, alt, { cls = '', eager = false, sizes = '100vw', attrs = '' } = {}) {
  const loading = eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
  if (!ref.includes('/')) {
    const [w, h] = sceneSize(ref);
    return `<img class="${cls}" src="/assets/img/scenes/${ref}.svg?v=${BUILD_ID}" width="${w}" height="${h}" alt="${esc(alt)}" ${loading} ${attrs}>`;
  }
  const base = ref.replace(/\.(jpe?g|png|webp|avif)$/i, '');
  const widths = [640, 1280, 1920];
  const has = (ext) => widths.every((w) => fs.existsSync(path.join(ROOT, `${base}-${w}.${ext}`)));
  if (has('avif') && has('webp')) {
    const set = (ext) => widths.map((w) => `${base}-${w}.${ext} ${w}w`).join(', ');
    return `<picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img class="${cls}" src="${base}-1280.webp" width="1920" height="1280" alt="${esc(alt)}" ${loading} ${attrs}></picture>`;
  }
  return `<img class="${cls}" src="${ref}" alt="${esc(alt)}" ${loading} ${attrs}>`;
}
const sceneViewBoxes = {};
function sceneSize(name) {
  const vb = sceneViewBoxes[name];
  if (!vb) return [1600, 1000];
  return vb.split(' ').slice(2).map(Number);
}

const SCENE_ALT = {
  living: 'open-plan living space with a black steel-framed window wall',
  kitchen: 'kitchen with black cabinetry, stone counters and an island',
  bath: 'bathroom with a walk-in charcoal-tile shower and floating vanity',
  commercial: 'interior with glass partitions and an oak slat wall',
  exterior: 'house exterior with black board-and-batten siding and large windows',
};
function altFor(ref, fallback = '') {
  if (ref.includes('/')) return fallback;
  const [scene, state] = ref.split('-');
  const what = SCENE_ALT[scene] || 'renovated interior';
  if (state === 'before') return `Illustration: the ${what.split(' with ')[0]} before renovation — exposed framing and raw structure`;
  if (state === 'process') return `Illustration: the ${what.split(' with ')[0]} during construction`;
  return `Illustration: finished ${what}`;
}

// ------------------------------------------------------------------ logo
function logo(where = 'header') {
  if (company.logoSrc) {
    return `<img class="brand__img" src="${company.logoSrc}" alt="${esc(company.legalName)}" width="220" height="60">`;
  }
  return `<span class="brand__lockup brand__lockup--${where}">${mark('brand__mark')}<span class="brand__type"><span class="brand__name">BOTWIN</span><span class="brand__sub">RENOVATIONS</span></span></span>`;
}

// ------------------------------------------------------------ navigation
const NAV = [
  ['Home', '/'],
  ['Services', '/#services'],
  ['Projects', '/#projects'],
  ['About', '/#about'],
  ['Process', '/#process'],
  ['Reviews', '/#reviews'],
  ['Contact', '/#contact'],
];

function header() {
  return `
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header" data-header>
  <div class="site-header__inner">
    <a class="brand" href="/" aria-label="${esc(company.legalName)} — home">${logo('header')}</a>
    <nav class="primary-nav" aria-label="Primary">
      <ul>${NAV.map(([t, h]) => `<li><a href="${h}" data-nav="${h}">${t}</a></li>`).join('')}</ul>
    </nav>
    <a class="btn btn--light btn--sm header-cta" href="/#contact" data-magnetic><span>Get a quote</span>${ARROW}</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle>
      <span class="sr-only" data-menu-label>Open menu</span>
      <span class="menu-toggle__bars" aria-hidden="true"><span></span><span></span></span>
    </button>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu" data-menu hidden>
  <div class="mobile-menu__grid" aria-hidden="true"></div>
  ${mark('mobile-menu__mark')}
  <nav class="mobile-menu__nav" aria-label="Mobile">
    <ol>${NAV.map(([t, h], i) => `<li style="--i:${i}"><a href="${h}"><span class="mono">${pad(i + 1)}</span>${t}</a></li>`).join('')}</ol>
  </nav>
  <div class="mobile-menu__foot">
    <a class="btn btn--light" href="/#contact"><span>Get a quote</span>${ARROW}</a>
    <a class="mobile-menu__link" href="tel:${contact.phoneE164}">${icon('phone')}${esc(contact.phoneDisplay)}</a>
    <a class="mobile-menu__link" href="mailto:${contact.email}">${icon('mail')}${esc(contact.email)}</a>
  </div>
</div>`;
}

function socialLinks(cls = '') {
  const map = [
    ['facebook', 'Facebook'],
    ['instagram', 'Instagram'],
    ['google', 'Google Business Profile'],
    ['houzz', 'Houzz'],
  ];
  return map
    .filter(([k]) => social[k])
    .map(([k, label]) => `<a class="${cls}" href="${social[k]}" target="_blank" rel="noopener" aria-label="${label} (opens in a new tab)">${icon(k)}</a>`)
    .join('');
}

function footer() {
  const year = new Date().getFullYear();
  return `
<footer class="site-footer">
  <div class="site-footer__statement" aria-hidden="true">
    <span class="reveal-line">BUILD SOMETHING</span>
    <span class="reveal-line">BETTER.</span>
  </div>
  <div class="wrap site-footer__grid">
    <div class="site-footer__brand">
      <a class="brand brand--footer" href="/" aria-label="${esc(company.legalName)} — home">${logo('footer')}</a>
      <p>${esc(company.legalName)} — renovation and remodeling in ${esc(cityLabel)} and ${esc(serviceArea.regionName)}.</p>
      <a class="btn btn--light" href="/#contact" data-magnetic><span>Start your project</span>${ARROW}</a>
    </div>
    <nav class="site-footer__col" aria-label="Footer">
      <h2 class="label">Navigate</h2>
      <ul>${[['Home', '/'], ['Services', '/#services'], ['Projects', '/projects/'], ['About', '/#about'], ['Reviews', '/#reviews'], ['Contact', '/#contact']]
        .map(([t, h]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul>
    </nav>
    <div class="site-footer__col">
      <h2 class="label">Services</h2>
      <ul>${services.slice(0, 6).map((s) => `<li><a href="/services/${s.slug}/">${esc(s.title)}</a></li>`).join('')}</ul>
    </div>
    <div class="site-footer__col">
      <h2 class="label">Contact</h2>
      <ul class="site-footer__contact">
        <li><a href="tel:${contact.phoneE164}">${icon('phone')}${esc(contact.phoneDisplay)}</a></li>
        <li><a href="mailto:${contact.email}">${icon('mail')}${esc(contact.email)}</a></li>
        <li><a href="/service-areas/${citySlug}/">${icon('pin')}${esc(cityLabel)} &amp; surrounding areas</a></li>
      </ul>
      <div class="site-footer__social">${socialLinks('social-link')}</div>
    </div>
  </div>
  <div class="wrap site-footer__legal">
    <p>© ${year} ${esc(company.legalName)}. All rights reserved.${credentials.license ? ` ${esc(credentials.license)}.` : ''}</p>
    <ul>
      <li><a href="/privacy/">Privacy Policy</a></li>
      <li><a href="/terms/">Terms</a></li>
      <li><a href="/sitemap.xml">Sitemap</a></li>
    </ul>
  </div>
  ${mark('site-footer__mark')}
</footer>`;
}

// ---------------------------------------------------------------- schema
const businessId = `${SITE}/#business`;
function businessSchema() {
  const s = {
    '@context': 'https://schema.org',
    '@type': ['HomeAndConstructionBusiness', 'GeneralContractor'],
    '@id': businessId,
    name: company.legalName,
    url: `${SITE}/`,
    logo: `${SITE}/assets/img/logo-mark.png`,
    image: `${SITE}/assets/img/og-image.png`,
    telephone: contact.phoneE164,
    email: contact.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: contact.city,
      addressRegion: contact.region,
      addressCountry: contact.country,
      ...(contact.streetAddress ? { streetAddress: contact.streetAddress } : {}),
      ...(contact.postalCode ? { postalCode: contact.postalCode } : {}),
    },
    areaServed: [serviceArea.primaryCity, ...serviceArea.surroundingCities].map((c) => ({
      '@type': 'City',
      name: `${c}, ${serviceArea.region}`,
    })),
    sameAs: Object.values(social).filter(Boolean),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Renovation services',
      itemListElement: services.map((sv) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: sv.title, url: `${SITE}/services/${sv.slug}/` },
      })),
    },
  };
  if (reviews.length) {
    const avg = reviews.reduce((a, r) => a + (r.rating || 5), 0) / reviews.length;
    s.aggregateRating = { '@type': 'AggregateRating', ratingValue: avg.toFixed(1), reviewCount: reviews.length };
    s.review = reviews.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.name },
      reviewRating: { '@type': 'Rating', ratingValue: r.rating || 5, bestRating: 5 },
      reviewBody: r.text,
      ...(r.date ? { datePublished: r.date } : {}),
    }));
  }
  return s;
}
function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}${url}` })),
  };
}
function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${items
    .map(([name, url], i) =>
      i === items.length - 1 ? `<li><span aria-current="page">${esc(name)}</span></li>` : `<li><a href="${url}">${esc(name)}</a></li>`
    )
    .join('')}</ol></nav>`;
}

// ---------------------------------------------------------------- layout
const sitemap = [];
function page({ route, title, description, body, schema = [], solidHeader = true, ogImage = '/assets/img/og-image.png', noindex = false, priority = 0.7 }) {
  const canonical = `${SITE}${route}`;
  if (!noindex) sitemap.push({ loc: canonical, priority });
  const fullTitle = route === '/' ? title : `${title} | ${company.legalName}`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${noindex ? '<meta name="robots" content="noindex, follow">' : ''}
<meta name="theme-color" content="#050505">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(company.legalName)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}${ogImage}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/main.css?v=${BUILD_ID}">
<script>document.documentElement.classList.add('js')</script>
<script src="/assets/js/main.js?v=${BUILD_ID}" defer></script>
${[businessSchema(), ...schema].map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
</head>
<body class="${solidHeader ? 'header-solid' : 'has-hero'}">
${header()}
<main id="main" tabindex="-1">
${body}
</main>
${footer()}
</body>
</html>`;
  const file = route === '/' ? 'index.html' : route.endsWith('/') ? `${route.slice(1)}index.html` : route.slice(1);
  write(file, html);
}

// ============================================================== SECTIONS
function sectionHead({ index, label, title, intro = '', light = false, id }) {
  return `<header class="section-head${light ? ' section-head--light' : ''}">
    <p class="label"><span class="label__index">${index}</span>${label}</p>
    <h2 class="display" id="${id}-title">${title}</h2>
    ${intro ? `<p class="section-head__intro">${intro}</p>` : ''}
  </header>`;
}

function heroSection() {
  const stages = [
    ['living-before', 'Before', 'Raw structure'],
    ['living-process', 'Process', 'Built with care'],
    ['living-after', 'After', 'Finished space'],
  ];
  return `
<section class="hero" id="top" aria-labelledby="hero-title" data-hero>
  <div class="hero__sticky">
    <div class="hero__media" aria-hidden="true">
      ${stages.map(([ref], i) => `<div class="hero__layer hero__layer--${i}" data-hero-layer="${i}">${img(ref, '', { eager: i === 0, cls: 'hero__img' })}</div>`).join('')}
      <div class="hero__edge"></div>
      <div class="hero__shade"></div>
      <div class="hero__grid"></div>
    </div>
    ${mark('hero__mark')}
    <div class="hero__content wrap">
      <p class="label label--light hero__eyebrow"><span class="label__index">${esc(cityLabel)}</span>Renovation &amp; Remodeling</p>
      <h1 class="display display--hero" id="hero-title">
        <span class="line"><span>Transforming</span></span>
        <span class="line"><span>spaces.</span></span>
        <span class="line line--muted"><span>Built to last.</span></span>
      </h1>
      <p class="hero__lede">Thoughtfully planned renovations, expert craftsmanship, and spaces designed around the way you live.</p>
      <div class="hero__ctas">
        <a class="btn btn--light" href="#contact" data-magnetic><span>Start your project</span>${ARROW}</a>
        <a class="btn btn--ghost-light" href="#projects"><span>View our work</span></a>
      </div>
    </div>
    <ol class="hero__stages" aria-label="Transformation stages">
      ${stages.map(([, name, sub], i) => `<li data-hero-stage="${i}"${i === 0 ? ' class="is-active"' : ''}><span class="mono">${pad(i + 1)}</span><strong>${name}</strong><span class="hero__stage-sub">${sub}</span></li>`).join('')}
      <li class="hero__progress" aria-hidden="true"><span data-hero-progress></span></li>
    </ol>
    <p class="hero__note mono" aria-hidden="true">Illustrative rendering</p>
    <a class="hero__scroll mono" href="#statement"><span>Scroll</span><i aria-hidden="true"></i></a>
  </div>
</section>`;
}

function statementSection() {
  return `
<section class="statement" id="statement" aria-label="Our approach">
  <div class="wrap statement__inner">
    <div class="beam" aria-hidden="true"></div>
    <p class="statement__text display" data-split>
      We don’t just renovate spaces. <span class="statement__muted">We rebuild how you live.</span>
    </p>
    <div class="statement__meta">
      <p class="label">${esc(company.legalName)}</p>
      <p>From the first walkthrough to the final detail, every project is planned, built and finished by a team that treats your home like the serious investment it is.</p>
      <a class="link-arrow" href="#services">What we build ${ARROW}</a>
    </div>
  </div>
</section>`;
}

function beforeAfterSlider(p, idx, opts = {}) {
  const b = p.images.before, a = p.images.after;
  return `<figure class="ba${opts.cls ? ' ' + opts.cls : ''}" data-ba>
    <div class="ba__frame" data-ba-frame>
      ${img(a, altFor(a, `${p.title} after renovation`), { cls: 'ba__img ba__img--after', sizes: '(min-width: 1024px) 80vw, 100vw' })}
      <div class="ba__before" data-ba-before>
        ${img(b, altFor(b, `${p.title} before renovation`), { cls: 'ba__img', sizes: '(min-width: 1024px) 80vw, 100vw' })}
      </div>
      <span class="ba__tag ba__tag--before mono" aria-hidden="true">Before</span>
      <span class="ba__tag ba__tag--after mono" aria-hidden="true">After</span>
      <div class="ba__handle" data-ba-handle role="slider" tabindex="0" aria-label="Before and after comparison for ${esc(p.title)}: drag or use arrow keys" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-valuetext="50% before">
        <span class="ba__knob" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg></span>
      </div>
    </div>
    ${opts.caption === false ? '' : `<figcaption class="ba__caption"><span class="mono">${pad(idx + 1)}</span><span>${esc(p.title)}</span>${p.illustrative ? '<span class="mono ba__illus">Illustrative rendering</span>' : ''}<a class="link-arrow" href="/projects/${p.slug}/">Case study ${ARROW}</a></figcaption>`}
  </figure>`;
}

function transformationSection() {
  const order = ['kitchens', 'bathrooms', 'full', 'interiors', 'exteriors'];
  const list = order.map((c) => projects.find((p) => p.category === c)).filter(Boolean);
  const names = { kitchens: 'Kitchen Renovation', bathrooms: 'Bathroom Remodel', full: 'Full Home Renovation', interiors: 'Interior Remodel', exteriors: 'Exterior Renovation' };
  return `
<section class="section section--dark transform" id="transformations" aria-labelledby="transformations-title">
  <div class="wrap">
    ${sectionHead({ index: '01', label: 'Before / After', title: 'See the<br>transformation.', light: true, id: 'transformations' })}
    <div class="tabs" data-tabs>
      <div class="tabs__list" role="tablist" aria-label="Transformation type">
        ${list.map((p, i) => `<button class="tabs__tab" role="tab" type="button" id="tab-${p.slug}" aria-controls="panel-${p.slug}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${names[p.category]}</button>`).join('')}
      </div>
      ${list.map((p, i) => `<div class="tabs__panel" role="tabpanel" id="panel-${p.slug}" aria-labelledby="tab-${p.slug}" ${i === 0 ? '' : 'hidden'}>${beforeAfterSlider(p, i)}</div>`).join('')}
    </div>
  </div>
</section>`;
}

function servicesSection() {
  return `
<section class="section services" id="services" aria-labelledby="services-title">
  <div class="wrap">
    ${sectionHead({ index: '02', label: 'Services', title: 'What we build.', intro: 'From a single room to the whole house — planned properly, built carefully and finished cleanly.', id: 'services' })}
    <ul class="services__grid" role="list">
      ${services.map((s, i) => `
      <li class="service-card" data-reveal style="--d:${(i % 3) * 80}ms">
        <a href="/services/${s.slug}/" class="service-card__link">
          <div class="service-card__media">${img(s.image, '', { sizes: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw' })}</div>
          <div class="service-card__body">
            <span class="mono service-card__num">${pad(i + 1)}</span>
            <h3 class="service-card__title">${esc(s.title)}</h3>
            <p>${esc(s.short)}</p>
            <span class="link-arrow">View service ${ARROW}</span>
          </div>
        </a>
      </li>`).join('')}
      ${ctaTile(services.length)}
    </ul>
  </div>
</section>`;
}

function ctaTile(n) {
  // fills the remaining cells of the last grid row (2 cols on tablet, 3 on desktop)
  const lg = (3 - (n % 3)) % 3, md = (2 - (n % 2)) % 2;
  if (!lg && !md) return '';
  const cls = ['service-card', 'service-card--cta'];
  if (lg === 2) cls.push('span-lg-2');
  if (md === 0) cls.push('hide-md'); else if (md === 2) cls.push('span-md-2');
  if (lg === 0) cls.push('hide-lg');
  return `<li class="${cls.join(' ')}" data-reveal>
    <div class="service-card__link">
      ${mark()}
      <div>
        <p class="label label--light"><span class="label__index">?</span>Not sure where to start</p>
        <h3 class="service-card__title" style="margin-top:18px">Tell us about<br>your space.</h3>
      </div>
      <p>Describe what you’d like to change and we’ll tell you honestly what’s possible — and whether we’re the right team for it.</p>
      <a class="btn btn--light" href="#contact" data-magnetic><span>Start the conversation</span>${ARROW}</a>
    </div>
  </li>`;
}

function projectEntry(p, i) {
  const loc = p.location ? esc(p.location) : tbc('Location to be added');
  const media = (ref, cls = '') => `<div class="project__media ${cls}" data-mask>${img(ref, altFor(ref, p.title), { sizes: '(min-width: 1024px) 70vw, 100vw' })}</div>`;
  let visual;
  if (p.layout === 'split') visual = `<div class="project__split">${media(p.images.before, 'project__media--small')}${media(p.images.after)}</div>`;
  else if (p.layout === 'vertical') visual = `<div class="project__vertical">${media(p.images.after, 'project__media--tall')}${media(p.images.process, 'project__media--tall project__media--offset')}</div>`;
  else visual = media(p.images.after, 'project__media--wide');
  return `
  <article class="project project--${p.layout}" data-category="${p.category}" data-reveal>
    <a class="project__link" href="/projects/${p.slug}/" aria-labelledby="project-${p.slug}">
      ${visual}
      <div class="project__meta">
        <span class="mono project__index">Project ${pad(i + 1)}</span>
        <h3 class="project__title" id="project-${p.slug}">${esc(p.title)}</h3>
        <span class="project__loc">${loc}</span>
        <span class="project__type mono">${esc(p.type)}</span>
        ${p.illustrative ? '<span class="mono project__illus">Illustrative rendering — project photography coming soon</span>' : ''}
        <span class="link-arrow">View case study ${ARROW}</span>
      </div>
    </a>
  </article>`;
}

function projectsSection({ standalone = false } = {}) {
  return `
<section class="section projects" id="projects" aria-labelledby="projects-title">
  <div class="wrap">
    ${sectionHead({ index: '03', label: 'Portfolio', title: 'Selected<br>transformations.', id: 'projects' })}
    <div class="filters" role="group" aria-label="Filter projects" data-filters>
      ${categories.map(([k, t], i) => `<button type="button" class="filters__btn" data-filter="${k}" aria-pressed="${i === 0}">${t}</button>`).join('')}
    </div>
    <p class="sr-only" aria-live="polite" data-filter-status></p>
    <div class="projects__list" data-projects>
      ${projects.map(projectEntry).join('')}
    </div>
    ${standalone ? '' : `<div class="projects__more"><a class="btn btn--dark" href="/projects/" data-magnetic><span>All projects</span>${ARROW}</a></div>`}
  </div>
</section>`;
}

function aboutSection() {
  const facts = [
    ['Years of experience', credentials.yearsExperience],
    ['Projects completed', credentials.projectsCompleted],
    ['Service area', `${cityLabel} & ${serviceArea.regionName}`],
    ['Licensing', credentials.license],
    ['Insurance', credentials.insured],
    ['Warranty', credentials.warranty],
  ];
  return `
<section class="section about" id="about" aria-labelledby="about-title">
  <div class="about__mark" aria-hidden="true">${mark()}</div>
  <div class="wrap about__grid">
    <div class="about__copy">
      ${sectionHead({ index: '04', label: 'About', title: 'Craftsmanship<br>without<br>compromise.', id: 'about' })}
      <p class="about__lead">Your home isn’t just another project.</p>
      <p>We combine careful planning, skilled craftsmanship, quality materials and clear communication to create renovations that look exceptional and are built to last.</p>
      <p>${esc(company.legalName)} works with homeowners across ${esc(cityLabel)} and ${esc(serviceArea.regionName)} — from a single room to the whole house.</p>
      <a class="btn btn--dark" href="#contact" data-magnetic><span>Talk to our team</span>${ARROW}</a>
    </div>
    <div class="about__sheet" data-reveal>
      <p class="label"><span class="label__index">Spec</span>Company details</p>
      <dl class="spec">
        ${facts.map(([k, v]) => `<div class="spec__row"><dt>${k}</dt><dd>${v != null && v !== '' ? esc(v) : tbc()}</dd></div>`).join('')}
      </dl>
    </div>
  </div>
</section>`;
}

const PROCESS = [
  ['Consultation', 'We learn about the space, your goals, priorities and vision.'],
  ['Planning', 'Scope, materials, timeline and project requirements are established.'],
  ['Preparation', 'The project is carefully prepared before construction begins.'],
  ['Renovation', 'Our team brings the design to life with attention to craftsmanship.'],
  ['Quality check', 'Every detail is reviewed before completion.'],
  ['Final walkthrough', 'The completed space is reviewed with you, room by room.'],
];
function processSection() {
  return `
<section class="section section--dark process" id="process" aria-labelledby="process-title" data-process>
  <div class="wrap">
    ${sectionHead({ index: '05', label: 'Process', title: 'From idea<br>to finished space.', light: true, id: 'process' })}
    <div class="timeline">
      <div class="timeline__track" aria-hidden="true"><span data-process-fill></span></div>
      <ol class="timeline__steps">
        ${PROCESS.map(([t, d], i) => `<li class="timeline__step" data-step>
          <span class="timeline__node" aria-hidden="true"></span>
          <span class="timeline__num">${pad(i + 1)}</span>
          <h3>${t}</h3>
          <p>${d}</p>
        </li>`).join('')}
      </ol>
    </div>
  </div>
</section>`;
}

const WHY = [
  ['Quality craftsmanship', 'Work done properly the first time — square, level, clean and finished.'],
  ['Clear communication', 'You know what’s happening, what’s next and what it costs.'],
  ['Attention to detail', 'The joints, lines and transitions most people never notice — we do.'],
  ['Quality materials', 'Products selected to perform, not just to hit a price.'],
  ['Clean work environment', 'Protected floors, contained dust and a tidy site at the end of each day.'],
  ['Dependable project management', 'One plan, one schedule and one team accountable for it.'],
  ['No shortcuts', 'What’s behind the wall matters as much as what’s on it.'],
];
function whySection() {
  return `
<section class="section why" id="why" aria-labelledby="why-title">
  <div class="wrap why__grid">
    <div class="why__head">
      ${sectionHead({ index: '06', label: 'Why Botwin', title: 'Built<br>different.', id: 'why' })}
    </div>
    <ol class="why__list">
      ${WHY.map(([t, d], i) => `<li data-reveal><span class="mono">${pad(i + 1)}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}
    </ol>
  </div>
</section>`;
}

function reviewsSection() {
  const stars = (n) => `<span class="stars" aria-label="${n} out of 5 stars">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
  const body = reviews.length
    ? `<ul class="reviews__list" role="list">${reviews
        .map((r) => `<li class="review" data-reveal><figure>${stars(r.rating || 5)}<blockquote><p>${esc(r.text)}</p></blockquote><figcaption><strong>${esc(r.name)}</strong><span class="mono">${esc(r.project || '')}${r.source ? ` · ${esc(r.source)}` : ''}</span></figcaption></figure></li>`)
        .join('')}</ul>`
    : `<div class="reviews__empty" data-reveal>
        <span class="reviews__quote" aria-hidden="true">“</span>
        <p class="reviews__empty-title">Verified client reviews will appear here.</p>
        <p>We only publish genuine reviews from real Botwin clients — never paraphrased and never invented. If we’ve worked together, we’d be grateful for your feedback.</p>
        <div class="reviews__actions">
          ${social.google ? `<a class="btn btn--dark" href="${social.google}" target="_blank" rel="noopener"><span>Read reviews on Google</span>${ARROW}</a>` : ''}
          ${social.facebook ? `<a class="btn btn--outline" href="${social.facebook}" target="_blank" rel="noopener"><span>Visit us on Facebook</span>${ARROW}</a>` : ''}
          <a class="btn btn--dark" href="#contact"><span>Start your project</span>${ARROW}</a>
        </div>
      </div>`;
  return `
<section class="section reviews" id="reviews" aria-labelledby="reviews-title">
  <div class="wrap">
    ${sectionHead({ index: '07', label: 'Reviews', title: 'What our<br>clients say.', id: 'reviews' })}
    ${body}
  </div>
</section>`;
}

function mapSvg() {
  const geo = serviceArea.geo;
  const [lat0, lon0] = geo[serviceArea.primaryCity];
  const k = 900; // px per degree
  const cos = Math.cos((lat0 * Math.PI) / 180);
  const cx = 500, cy = 360;
  const xy = ([lat, lon]) => [cx + (lon - lon0) * cos * k, cy - (lat - lat0) * k];
  const mi = (m) => (m / 69) * k;
  const listed = new Set([serviceArea.primaryCity, ...serviceArea.surroundingCities]);
  let s = `<svg class="map" viewBox="0 0 1000 720" role="img" aria-labelledby="map-title map-desc"><title id="map-title">Service area map</title><desc id="map-desc">Schematic map of ${esc(cityLabel)} and surrounding communities.</desc>`;
  s += `<defs><pattern id="mapgrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="currentColor" stroke-opacity=".08"/></pattern></defs>`;
  s += `<rect width="1000" height="720" fill="url(#mapgrid)"/>`;
  // schematic interstates radiating from the center
  const roads = [[-15, 'I-65'], [22, 'I-24'], [95, 'I-40'], [155, 'I-24'], [200, 'I-65'], [275, 'I-40']];
  for (const [deg, name] of roads) {
    const a = (deg * Math.PI) / 180;
    const x2 = cx + Math.cos(a - Math.PI / 2) * 700, y2 = cy + Math.sin(a - Math.PI / 2) * 700;
    s += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-opacity=".18" stroke-width="3"/>`;
    void name;
  }
  for (const m of [10, 20, 30]) {
    s += `<circle cx="${cx}" cy="${cy}" r="${mi(m).toFixed(1)}" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="4 8" class="map__ring"/>`;
    s += `<text x="${(cx + mi(m) * 0.707 + 6).toFixed(1)}" y="${(cy - mi(m) * 0.707).toFixed(1)}" class="map__ringlabel">${m} MI</text>`;
  }
  for (const [name, c] of Object.entries(geo)) {
    if (!listed.has(name)) continue;
    const [x, y] = xy(c);
    const primary = name === serviceArea.primaryCity;
    s += primary
      ? `<rect x="${(x - 11).toFixed(1)}" y="${(y - 11).toFixed(1)}" width="22" height="22" fill="currentColor"/><rect x="${(x - 22).toFixed(1)}" y="${(y - 22).toFixed(1)}" width="44" height="44" fill="none" stroke="currentColor" stroke-width="2"/>`
      : `<rect x="${(x - 5).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="10" height="10" fill="currentColor"/>`;
    s += `<text x="${(x + (primary ? 32 : 14)).toFixed(1)}" y="${(y + 5).toFixed(1)}" class="map__label${primary ? ' map__label--primary' : ''}">${esc(name.toUpperCase())}</text>`;
  }
  s += `<g class="map__north" transform="translate(930 70)"><path d="M0 -26 L10 10 L0 3 L-10 10Z" fill="currentColor"/><text y="32" text-anchor="middle">N</text></g>`;
  s += `<g transform="translate(40 680)"><rect width="${mi(10).toFixed(1)}" height="4" fill="currentColor"/><text y="-10" class="map__ringlabel">10 MILES</text></g>`;
  return s + `</svg>`;
}

function serviceAreaSection() {
  return `
<section class="section section--dark area" id="service-area" aria-labelledby="service-area-title">
  <div class="wrap area__grid">
    <div class="area__copy">
      ${sectionHead({ index: '08', label: 'Service area', title: `Proudly renovating<br>${esc(serviceArea.primaryCity)}.`, light: true, id: 'service-area' })}
      <p>Based in ${esc(cityLabel)}, we take on renovation and remodeling projects across ${esc(serviceArea.regionName)}${serviceArea.radiusMiles ? ` — generally within ${serviceArea.radiusMiles} miles of the city` : ''}.</p>
      <h3 class="label label--light">Primary city</h3>
      <p class="area__primary"><a href="/service-areas/${citySlug}/">${esc(cityLabel)} ${ARROW}</a></p>
      <h3 class="label label--light">Surrounding communities</h3>
      <ul class="area__cities" role="list">${serviceArea.surroundingCities.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      <p class="area__note">Not sure if you’re in our area? <a href="#contact">Ask us</a> — we’ll give you a straight answer.</p>
    </div>
    <div class="area__map" data-reveal>${mapSvg()}</div>
  </div>
</section>`;
}

function contactSection() {
  const budgets = ['Under $10,000', '$10,000 – $25,000', '$25,000 – $50,000', '$50,000 – $100,000', '$100,000 – $250,000', '$250,000+', 'Not sure yet'];
  const starts = ['As soon as possible', 'Within 1–3 months', 'Within 3–6 months', '6+ months from now', 'Flexible / just exploring'];
  const isNetlify = form.provider === 'netlify';
  const action = isNetlify ? '/thank-you/' : form.endpoint || '/thank-you/';
  return `
<section class="section contact" id="contact" aria-labelledby="contact-title">
  <div class="wrap contact__grid">
    <div class="contact__intro">
      ${sectionHead({ index: '09', label: 'Contact', title: 'Ready to transform<br>your space?', intro: 'Tell us about your renovation and let’s discuss what’s possible.', id: 'contact' })}
      <ul class="contact__direct" role="list">
        <li><a href="tel:${contact.phoneE164}" class="contact__line"><span class="label">Call now</span><strong>${esc(contact.phoneDisplay)}</strong>${ARROW}</a></li>
        <li><a href="mailto:${contact.email}" class="contact__line"><span class="label">Email</span><strong>${esc(contact.email)}</strong>${ARROW}</a></li>
        <li><a href="/service-areas/${citySlug}/" class="contact__line"><span class="label">Service area</span><strong>${esc(cityLabel)} &amp; surrounding</strong>${ARROW}</a></li>
      </ul>
      ${contact.hours ? `<p class="contact__hours mono">${esc(contact.hours)}</p>` : ''}
    </div>

    <div class="contact__panel">
      <form class="form" name="${form.name}" method="POST" action="${action}" enctype="multipart/form-data"
        ${isNetlify ? 'data-netlify="true" netlify-honeypot="company_website"' : ''}
        data-form data-endpoint="${isNetlify ? '/' : esc(form.endpoint || '')}" data-provider="${form.provider}" novalidate>
        <input type="hidden" name="form-name" value="${form.name}">
        <input type="hidden" name="submitted_at" value="" data-timestamp>
        <input type="hidden" name="page_url" value="" data-page-url>
        <p class="form__hp" aria-hidden="true"><label>Leave this field empty <input name="company_website" tabindex="-1" autocomplete="off"></label></p>
        ${isNetlify ? '<input type="file" name="photo_1" hidden tabindex="-1" aria-hidden="true"><input type="file" name="photo_2" hidden tabindex="-1" aria-hidden="true"><input type="file" name="photo_3" hidden tabindex="-1" aria-hidden="true">' : ''}

        <p class="form__legend label"><span class="label__index">Request</span>Project consultation</p>
        <div class="form__grid">
          ${field('name', 'Name', 'text', { required: true, autocomplete: 'name', placeholder: 'Your full name' })}
          ${field('phone', 'Phone', 'tel', { required: true, autocomplete: 'tel', inputmode: 'tel', placeholder: '(615) 555-0123' })}
          ${field('email', 'Email', 'email', { required: true, autocomplete: 'email', inputmode: 'email', placeholder: 'you@example.com' })}
          ${field('location', 'Project address / city', 'text', { autocomplete: 'street-address', placeholder: `e.g. ${serviceArea.primaryCity}` })}
          ${select('service', 'Project type', [...services.map((s) => s.title), 'Other'], { required: true })}
          ${select('budget', 'Estimated budget', budgets)}
          ${select('start_date', 'Desired start', starts, { full: true })}
          <div class="field field--full">
            <label for="f-message">Message <span class="field__opt">Tell us about the space and what you’d like to change</span></label>
            <textarea id="f-message" name="message" rows="5" required aria-describedby="f-message-err"></textarea>
            <p class="field__error" id="f-message-err" data-error></p>
          </div>
          <div class="field field--full">
            <span class="field__label" id="f-photos-label">Photos of your space <span class="field__opt">Optional · up to 3 images · 8 MB total</span></span>
            <label class="upload" for="f-photos">
              <input id="f-photos" type="file" name="photos" accept="image/*" multiple aria-labelledby="f-photos-label" aria-describedby="f-photos-err" data-upload>
              <span class="upload__cta">${icon('camera')}<span data-upload-text>Tap to add photos</span></span>
            </label>
            <ul class="upload__list" data-upload-list></ul>
            <p class="field__error" id="f-photos-err" data-error></p>
          </div>
        </div>

        <div class="form__foot">
          <button class="btn btn--dark btn--block form__submit" type="submit" data-submit data-magnetic>
            <span class="form__submit-label">Request a project consultation</span>${ARROW}
            <span class="spinner" aria-hidden="true"></span>
          </button>
          <p class="form__fine">We’ll only use your details to respond to your enquiry. <a href="/privacy/">Privacy policy</a>.</p>
        </div>
        <div class="form__status form__status--error" role="alert" data-form-error hidden>
          <strong>Your request didn’t go through.</strong>
          <p>Please check your connection and try again — or reach us directly at <a href="tel:${contact.phoneE164}">${esc(contact.phoneDisplay)}</a> or <a href="mailto:${contact.email}">${esc(contact.email)}</a>.</p>
        </div>
      </form>

      <div class="form-success" data-form-success tabindex="-1" hidden>
        ${mark('form-success__mark')}
        <p class="label"><span class="label__index">Received</span>Request sent</p>
        <h3 class="display">Thank you<span data-success-name></span>.</h3>
        <p>Your project details are with our team. We’ll be in touch shortly to talk through your renovation.</p>
        <p class="mono" data-success-time></p>
        <a class="btn btn--outline" href="/#projects"><span>Browse projects while you wait</span>${ARROW}</a>
      </div>
    </div>
  </div>
</section>`;
}

function field(name, label, type, o = {}) {
  const id = `f-${name}`;
  return `<div class="field${o.full ? ' field--full' : ''}">
    <label for="${id}">${label}${o.required ? ' <span class="field__req" aria-hidden="true">*</span>' : ' <span class="field__opt">Optional</span>'}</label>
    <input id="${id}" name="${name}" type="${type}"${o.required ? ' required' : ''}${o.autocomplete ? ` autocomplete="${o.autocomplete}"` : ''}${o.inputmode ? ` inputmode="${o.inputmode}"` : ''}${o.placeholder ? ` placeholder="${esc(o.placeholder)}"` : ''} aria-describedby="${id}-err">
    <p class="field__error" id="${id}-err" data-error></p>
  </div>`;
}
function select(name, label, options, o = {}) {
  const id = `f-${name}`;
  return `<div class="field${o.full ? ' field--full' : ''}">
    <label for="${id}">${label}${o.required ? ' <span class="field__req" aria-hidden="true">*</span>' : ' <span class="field__opt">Optional</span>'}</label>
    <div class="select"><select id="${id}" name="${name}"${o.required ? ' required' : ''} aria-describedby="${id}-err">
      <option value="">Select…</option>
      ${options.map((v) => `<option>${esc(v)}</option>`).join('')}
    </select></div>
    <p class="field__error" id="${id}-err" data-error></p>
  </div>`;
}

function ctaBand(title = 'Ready to transform<br>your space?', text = 'Tell us about your renovation and let’s discuss what’s possible.') {
  return `
<section class="cta-band" aria-label="Start your project">
  <div class="wrap cta-band__inner">
    <h2 class="display">${title}</h2>
    <div>
      <p>${text}</p>
      <div class="cta-band__actions">
        <a class="btn btn--light" href="/#contact" data-magnetic><span>Start your project</span>${ARROW}</a>
        <a class="btn btn--ghost-light" href="tel:${contact.phoneE164}"><span>Call ${esc(contact.phoneDisplay)}</span></a>
      </div>
    </div>
  </div>
</section>`;
}

// ================================================================= PAGES
function buildHome() {
  page({
    route: '/',
    title: `${company.legalName} | Renovation & Remodeling in ${cityLabel}`,
    description: `Kitchen, bathroom and full home renovations in ${cityLabel} and ${serviceArea.regionName}. Careful planning, expert craftsmanship and spaces built to last. Request a consultation.`,
    solidHeader: false,
    priority: 1.0,
    body: [
      heroSection(),
      statementSection(),
      transformationSection(),
      servicesSection(),
      projectsSection(),
      aboutSection(),
      processSection(),
      whySection(),
      reviewsSection(),
      serviceAreaSection(),
      contactSection(),
    ].join('\n'),
  });
}

function pageHero({ label, title, intro, image, crumbs, dark = true }) {
  return `
<section class="page-hero${dark ? '' : ' page-hero--light'}">
  <div class="page-hero__media" aria-hidden="true" data-parallax>${image ? img(image, '', { eager: true }) : ''}</div>
  <div class="wrap page-hero__inner">
    ${breadcrumbs(crumbs)}
    <p class="label label--light"><span class="label__index">${label[0]}</span>${label[1]}</p>
    <h1 class="display display--page">${title}</h1>
    ${intro ? `<p class="page-hero__intro">${intro}</p>` : ''}
  </div>
</section>`;
}

function buildServices() {
  for (const s of services) {
    const route = `/services/${s.slug}/`;
    const crumbs = [['Home', '/'], ['Services', '/#services'], [s.title, route]];
    const proj = projects.find((p) => p.slug === s.project);
    const others = services.filter((o) => o.slug !== s.slug).slice(0, 3);
    const body = `
${pageHero({ label: ['Service', esc(cityLabel)], title: esc(s.title), intro: esc(s.short), image: s.image, crumbs })}
<section class="section">
  <div class="wrap split">
    <div>
      <p class="label"><span class="label__index">01</span>Overview</p>
      <h2 class="display display--md">${esc(s.title)} in ${esc(cityLabel)}</h2>
    </div>
    <div class="prose">
      <p class="lead">${esc(s.intro)}</p>
      <p>Every project starts with a consultation. We look at the space, listen to what you want to change and talk honestly about scope, budget and timing — then put it in writing before any work begins.</p>
    </div>
  </div>
</section>
<section class="section section--tint">
  <div class="wrap split">
    <div>
      <p class="label"><span class="label__index">02</span>Scope</p>
      <h2 class="display display--md">What’s typically included.</h2>
    </div>
    <ul class="checklist" role="list">${s.includes.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
  </div>
  <p class="wrap small-note">Scope is tailored to each project and confirmed in writing. Licensed trades are coordinated where the work requires them.</p>
</section>
${proj ? `<section class="section section--dark"><div class="wrap">
  <header class="section-head section-head--light"><p class="label"><span class="label__index">03</span>Transformation</p><h2 class="display display--md">${esc(proj.title)}</h2></header>
  ${beforeAfterSlider(proj, 0)}
</div></section>` : ''}
${processSection().replace('id="process"', 'id="process-steps"').replace(/id="process-title"/g, 'id="process-steps-title"').replace('aria-labelledby="process-title"', 'aria-labelledby="process-steps-title"')}
<section class="section">
  <div class="wrap">
    <header class="section-head"><p class="label"><span class="label__index">—</span>More services</p><h2 class="display display--md">Other ways we can help.</h2></header>
    <ul class="services__grid services__grid--compact" role="list">
      ${others.map((o, i) => `<li class="service-card" data-reveal style="--d:${i * 80}ms"><a class="service-card__link" href="/services/${o.slug}/"><div class="service-card__media">${img(o.image, '', { sizes: '(min-width: 1024px) 33vw, 100vw' })}</div><div class="service-card__body"><h3 class="service-card__title">${esc(o.title)}</h3><p>${esc(o.short)}</p><span class="link-arrow">View service ${ARROW}</span></div></a></li>`).join('')}
    </ul>
  </div>
</section>
${ctaBand()}`;
    page({
      route,
      title: `${s.title} in ${cityLabel}`,
      description: `${s.title} by ${company.legalName} in ${cityLabel}. ${s.short}`.slice(0, 158),
      body,
      schema: [
        breadcrumbSchema(crumbs),
        {
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: s.title,
          serviceType: s.title,
          description: s.intro,
          provider: { '@id': businessId },
          areaServed: { '@type': 'City', name: cityLabel },
          url: `${SITE}${route}`,
        },
      ],
      priority: 0.8,
    });
  }
}

function buildProjects() {
  // index
  const crumbsIdx = [['Home', '/'], ['Projects', '/projects/']];
  page({
    route: '/projects/',
    title: 'Projects',
    description: `Selected renovation projects by ${company.legalName} — kitchens, bathrooms, interiors, exteriors and full home renovations in ${cityLabel}.`,
    body: `${pageHero({ label: ['Portfolio', 'All work'], title: 'Selected<br>transformations.', intro: 'Every project tells a story of what a space was — and what it became.', image: 'kitchen-after', crumbs: crumbsIdx })}
${projectsSection({ standalone: true }).replace('<header class="section-head">', '<header class="section-head" hidden>')}
${ctaBand()}`,
    schema: [breadcrumbSchema(crumbsIdx)],
    priority: 0.8,
  });

  projects.forEach((p, i) => {
    const route = `/projects/${p.slug}/`;
    const crumbs = [['Home', '/'], ['Projects', '/projects/'], [p.title, route]];
    const next = projects[(i + 1) % projects.length];
    const details = Object.entries(p.details || {});
    const steps = [
      ['The challenge', p.challenge, p.images.before],
      ['The plan', p.plan, null],
      ['The build', p.build, p.images.process],
      ['The result', p.result, p.images.after],
    ];
    const body = `
${pageHero({ label: [`Project ${pad(i + 1)}`, esc(p.type)], title: esc(p.title), intro: p.location ? esc(p.location) : 'Location to be added', image: p.images.after, crumbs })}
${p.illustrative ? `<div class="notice wrap"><span class="mono">Note</span><p>Images on this page are illustrative renderings. Photography from the completed Botwin project will replace them.</p></div>` : ''}
<section class="section">
  <div class="wrap case-meta">
    <dl class="spec spec--cols">
      <div class="spec__row"><dt>Project</dt><dd>${esc(p.title)}</dd></div>
      <div class="spec__row"><dt>Location</dt><dd>${p.location ? esc(p.location) : tbc()}</dd></div>
      <div class="spec__row"><dt>Type</dt><dd>${esc(p.type)}</dd></div>
      ${details.map(([k, v]) => `<div class="spec__row"><dt>${esc(k)}</dt><dd>${v ? esc(v) : tbc()}</dd></div>`).join('')}
    </dl>
    <div>
      <p class="label"><span class="label__index">Scope</span>Work included</p>
      <ul class="tags" role="list">${p.scope.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    </div>
  </div>
</section>
<section class="section section--dark">
  <div class="wrap">
    <header class="section-head section-head--light"><p class="label"><span class="label__index">01</span>Before / After</p><h2 class="display display--md">Drag to compare.</h2></header>
    ${beforeAfterSlider(p, i, { caption: false })}
  </div>
</section>
<section class="section story">
  <div class="wrap">
    ${steps.map(([t, text, ref], k) => `
    <article class="story__step${ref ? '' : ' story__step--text'}" data-reveal>
      <div class="story__copy">
        <p class="label"><span class="label__index">${pad(k + 1)}</span>${['Before', 'Planning', 'Construction', 'After'][k]}</p>
        <h2 class="display display--md">${t}.</h2>
        <p>${esc(text)}</p>
      </div>
      ${ref ? `<div class="story__media" data-mask>${img(ref, altFor(ref, `${p.title} — ${t}`), { sizes: '(min-width: 1024px) 60vw, 100vw' })}</div>` : ''}
    </article>`).join('')}
  </div>
</section>
<section class="next-project">
  <a class="wrap next-project__link" href="/projects/${next.slug}/">
    <span class="label label--light"><span class="label__index">Next</span>Project</span>
    <span class="display next-project__title">${esc(next.title)} ${ARROW}</span>
  </a>
</section>
${ctaBand('Have a space like this?')}`;
    page({
      route,
      title: `${p.title}${p.location ? ` — ${p.location}` : ''}`,
      description: `${p.title}: ${p.result}`.slice(0, 158),
      body,
      schema: [breadcrumbSchema(crumbs)],
      priority: 0.6,
    });
  });
}

function buildAreas() {
  const route = `/service-areas/${citySlug}/`;
  const crumbs = [['Home', '/'], ['Service areas', `/#service-area`], [cityLabel, route]];
  const local = services.filter((s) => s.localPage);
  page({
    route,
    title: `Renovation & Remodeling in ${cityLabel}`,
    description: `${company.legalName} provides home renovation and remodeling in ${cityLabel} and surrounding ${serviceArea.regionName} communities. Request a consultation.`,
    body: `
${pageHero({ label: ['Service area', esc(serviceArea.regionName)], title: `Renovation &amp; remodeling in ${esc(serviceArea.primaryCity)}.`, intro: `Kitchens, bathrooms and whole-home renovations for homeowners in ${esc(cityLabel)} and nearby communities.`, image: 'exterior-after', crumbs })}
<section class="section">
  <div class="wrap split">
    <div><p class="label"><span class="label__index">01</span>Local</p><h2 class="display display--md">Built for ${esc(serviceArea.primaryCity)} homes.</h2></div>
    <div class="prose">
      <p class="lead">${esc(company.legalName)} is a ${esc(serviceArea.primaryCity)}-based renovation company. We plan carefully, communicate clearly and build spaces that last.</p>
      <p>We work in ${esc(serviceArea.primaryCity)} and surrounding communities including ${esc(serviceArea.surroundingCities.join(', '))}.</p>
    </div>
  </div>
</section>
<section class="section section--tint">
  <div class="wrap">
    <header class="section-head"><p class="label"><span class="label__index">02</span>Services in ${esc(serviceArea.primaryCity)}</p><h2 class="display display--md">What we build here.</h2></header>
    <ul class="area-links" role="list">
      ${services.map((s) => `<li><a href="${s.localPage ? `/service-areas/${citySlug}/${s.slug}/` : `/services/${s.slug}/`}"><span>${esc(s.title)}${s.localPage ? ` in ${esc(serviceArea.primaryCity)}` : ''}</span>${ARROW}</a></li>`).join('')}
    </ul>
  </div>
</section>
<section class="section section--dark area"><div class="wrap area__grid"><div class="area__copy"><p class="label label--light"><span class="label__index">03</span>Map</p><h2 class="display display--md">${esc(serviceArea.primaryCity)} &amp; surrounding.</h2><ul class="area__cities" role="list">${serviceArea.surroundingCities.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div><div class="area__map">${mapSvg()}</div></div></section>
${ctaBand(`Renovating in ${esc(serviceArea.primaryCity)}?`)}`,
    schema: [breadcrumbSchema(crumbs)],
    priority: 0.8,
  });

  for (const s of local) {
    const r2 = `/service-areas/${citySlug}/${s.slug}/`;
    const c2 = [['Home', '/'], [cityLabel, route], [`${s.title} in ${serviceArea.primaryCity}`, r2]];
    const proj = projects.find((p) => p.slug === s.project);
    page({
      route: r2,
      title: `${s.title} in ${cityLabel}`,
      description: `${s.title} in ${cityLabel} by ${company.legalName}. ${s.short}`.slice(0, 158),
      body: `
${pageHero({ label: ['Service area', esc(cityLabel)], title: `${esc(s.title)} in ${esc(serviceArea.primaryCity)}.`, intro: esc(s.short), image: s.image, crumbs: c2 })}
<section class="section">
  <div class="wrap split">
    <div><p class="label"><span class="label__index">01</span>${esc(serviceArea.primaryCity)}</p><h2 class="display display--md">${esc(s.title)} for ${esc(serviceArea.primaryCity)} homeowners.</h2></div>
    <div class="prose">
      <p class="lead">${esc(s.intro)}</p>
      <p>We serve ${esc(serviceArea.primaryCity)} and nearby communities including ${esc(serviceArea.surroundingCities.slice(0, 4).join(', '))}. Every project starts with an on-site consultation so we can see the space and understand what you want to achieve.</p>
      <ul class="checklist" role="list">${s.includes.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      <p><a class="link-arrow" href="/services/${s.slug}/">More about ${esc(s.title.toLowerCase())} ${ARROW}</a></p>
    </div>
  </div>
</section>
${proj ? `<section class="section section--dark"><div class="wrap">${beforeAfterSlider(proj, 0)}</div></section>` : ''}
${ctaBand(`Planning ${esc(s.title.toLowerCase().replace(/s$/, ''))} work in ${esc(serviceArea.primaryCity)}?`)}`,
      schema: [
        breadcrumbSchema(c2),
        { '@context': 'https://schema.org', '@type': 'Service', name: `${s.title} in ${cityLabel}`, serviceType: s.title, provider: { '@id': businessId }, areaServed: { '@type': 'City', name: cityLabel }, url: `${SITE}${r2}` },
      ],
      priority: 0.7,
    });
  }
}

function buildLegal() {
  const updated = new Date().toISOString().slice(0, 10);
  const legal = (route, title, sections) =>
    page({
      route,
      title,
      description: `${title} for ${company.legalName}.`,
      body: `${pageHero({ label: ['Legal', `Updated ${updated}`], title, crumbs: [['Home', '/'], [title, route]] })}
<section class="section"><div class="wrap prose prose--legal">
${sections.map(([h, t]) => `<h2>${h}</h2>${t}`).join('\n')}
<p class="small-note">This document is a general template and should be reviewed by the business owner and a legal professional before launch.</p>
</div></section>`,
      priority: 0.2,
    });

  legal('/privacy/', 'Privacy Policy', [
    ['Who we are', `<p>${esc(company.legalName)} (“we”, “us”) operates this website. You can contact us at <a href="mailto:${contact.email}">${esc(contact.email)}</a> or <a href="tel:${contact.phoneE164}">${esc(contact.phoneDisplay)}</a>.</p>`],
    ['What we collect', '<p>When you submit our consultation form we collect the details you provide: your name, phone number, email address, project location, project type, budget range, desired start date, your message and any photos you choose to upload. We also record the date and time of the submission.</p>'],
    ['How we use it', '<p>We use this information only to respond to your enquiry, prepare estimates and carry out any work you engage us for. We do not sell your personal information.</p>'],
    ['Service providers', '<p>Form submissions are processed and stored by our website hosting / form provider on our behalf. They may only use the information to provide that service to us.</p>'],
    ['Retention', '<p>We keep enquiry information for as long as needed to respond and for reasonable business records, after which it is deleted.</p>'],
    ['Your choices', `<p>You may ask us to access, correct or delete your information at any time by emailing <a href="mailto:${contact.email}">${esc(contact.email)}</a>.</p>`],
    ['Cookies', '<p>This website does not use advertising or tracking cookies. Your browser may store basic preferences locally.</p>'],
  ]);
  legal('/terms/', 'Terms of Use', [
    ['Use of this website', `<p>This website provides general information about ${esc(company.legalName)} and our services. Content may change without notice.</p>`],
    ['No offer or contract', '<p>Information on this site, including descriptions of services and scope, is not an offer or quotation. Every project is subject to a written agreement that sets out scope, price and terms.</p>'],
    ['Imagery', '<p>Some images on this site are illustrative renderings and are identified as such. They do not depict a specific completed project unless stated.</p>'],
    ['Intellectual property', `<p>The content, design and branding of this site belong to ${esc(company.legalName)} and may not be reused without permission.</p>`],
    ['Liability', '<p>We make reasonable efforts to keep this site accurate but provide it “as is” without warranties of any kind.</p>'],
    ['Contact', `<p>Questions about these terms can be sent to <a href="mailto:${contact.email}">${esc(contact.email)}</a>.</p>`],
  ]);
}

function buildUtility() {
  page({
    route: '/thank-you/',
    title: 'Thank you',
    description: 'Your renovation enquiry has been received.',
    noindex: true,
    body: `<section class="utility">${mark('utility__mark')}<div class="wrap">
      <p class="label label--light"><span class="label__index">Received</span>Request sent</p>
      <h1 class="display display--page">Thank you.</h1>
      <p class="utility__text">Your project details are with our team. We’ll be in touch shortly.</p>
      <div class="cta-band__actions"><a class="btn btn--light" href="/"><span>Back to home</span>${ARROW}</a><a class="btn btn--ghost-light" href="/projects/"><span>View projects</span></a></div>
    </div></section>`,
  });
  page({
    route: '/404.html',
    title: 'Page not found',
    description: 'The page you’re looking for doesn’t exist.',
    noindex: true,
    body: `<section class="utility">${mark('utility__mark')}<div class="wrap">
      <p class="label label--light"><span class="label__index">404</span>Not found</p>
      <h1 class="display display--page">This space<br>isn’t built yet.</h1>
      <p class="utility__text">The page you’re looking for doesn’t exist or has moved.</p>
      <div class="cta-band__actions"><a class="btn btn--light" href="/"><span>Back to home</span>${ARROW}</a><a class="btn btn--ghost-light" href="/#contact"><span>Contact us</span></a></div>
    </div></section>`,
  });
}

function buildMeta() {
  const today = new Date().toISOString().slice(0, 10);
  write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
      .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority.toFixed(1)}</priority></url>`)
      .join('\n')}\n</urlset>\n`
  );
  write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /thank-you/\n\nSitemap: ${SITE}/sitemap.xml\n`);
  write(
    'site.webmanifest',
    JSON.stringify({ name: company.legalName, short_name: company.shortName, icons: [{ src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }, { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }], theme_color: '#050505', background_color: '#050505', display: 'standalone', start_url: '/' }, null, 2)
  );
  write('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO.SQUARE_VIEWBOX}"><rect x="-20" y="20" width="1000" height="1000" fill="#050505"/><path fill="#F5F4F0" fill-rule="evenodd" d="${LOGO.PATH}"/></svg>`);
  write('assets/img/logo-mark.svg', LOGO.svg({ fill: '#050505', attrs: 'xmlns="http://www.w3.org/2000/svg"' }));
}

// ================================================================== MAIN
function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // assets
  copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
  copyDir(path.join(ROOT, 'static'), DIST);

  // scenes
  const all = scenes.all();
  for (const [name, svg] of Object.entries(all)) {
    const vb = svg.match(/viewBox="([^"]+)"/)[1];
    sceneViewBoxes[name] = vb;
    write(`assets/img/scenes/${name}.svg`, svg);
  }

  buildHome();
  buildServices();
  buildProjects();
  buildAreas();
  buildLegal();
  buildUtility();
  buildMeta();

  // warnings
  const src = fs.readFileSync(path.join(ROOT, 'site.config.js'), 'utf8').split('\n');
  const todos = src.map((l, i) => [i + 1, l]).filter(([, l]) => /\/\/\s*TODO\(confirm\)/.test(l));
  const nulls = Object.entries(credentials).filter(([, v]) => v == null).map(([k]) => k);
  console.log(`\n✔ Built ${sitemap.length} indexable pages → dist/`);
  if (todos.length || nulls.length) {
    console.log('\n⚠ Before launch, confirm these placeholders in site.config.js:');
    for (const [n, l] of todos) console.log(`  • line ${n}: ${l.trim().replace(/\s*\/\/\s*TODO\(confirm\)\s*/, ' — confirm ')}`);
    if (nulls.length) console.log(`  • credentials still null (shown as "To be confirmed"): ${nulls.join(', ')}`);
    if (!reviews.length) console.log('  • reviews: none added yet (honest empty state is shown)');
    const illus = projects.filter((p) => p.illustrative).length;
    if (illus) console.log(`  • ${illus} project(s) still use illustrative renderings instead of real photos`);
  }
}

main();
