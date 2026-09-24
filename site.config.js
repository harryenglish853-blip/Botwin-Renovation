/**
 * BOTWIN RENOVATIONS LLC — SITE CONFIGURATION
 * ------------------------------------------------------------------
 * Every company fact on the website comes from this file.
 * Edit it, then run `npm run build`.
 *
 * RULE: never put a statistic, license, review, award or claim in here
 * that the company cannot prove. Leave a value as `null` and the site
 * shows a neutral "to be confirmed" placeholder (or hides the item).
 *
 * Items tagged with a TODO(confirm) comment are placeholders that MUST be
 * verified by the owner before launch. `npm run build` lists them.
 */

module.exports = {
  // ---------------------------------------------------------------
  // IDENTITY
  // ---------------------------------------------------------------
  company: {
    legalName: 'Botwin Renovations LLC',
    shortName: 'Botwin',
    tagline: 'Transforming spaces. Built to last.',
    // Production URL, no trailing slash. Used for canonical URLs, sitemap, OG.
    siteUrl: 'https://www.botwinrenovations.com', // TODO(confirm) real domain
    // The official "BR" logo is built in as vector artwork (scripts/logo.js),
    // traced from brand/botwin-logo-original.jpg. Set logoSrc only to use a
    // different image file instead, e.g. '/assets/img/botwin-logo.svg'.
    logoSrc: null,
  },

  // ---------------------------------------------------------------
  // CONTACT
  // ---------------------------------------------------------------
  contact: {
    phoneDisplay: '(615) 000-0000', // TODO(confirm) real phone number
    phoneE164: '+16150000000', // TODO(confirm) same number in +1XXXXXXXXXX form
    email: 'info@botwinrenovations.com', // TODO(confirm) real inbox
    // Street address is optional for service-area businesses. Leave null to hide.
    streetAddress: null,
    city: 'Nashville', // Source: public Facebook page "Botwin Renovations LLC | Nashville TN"
    region: 'TN',
    postalCode: null,
    country: 'US',
    hours: 'Mon–Fri · 7:00 AM – 5:00 PM', // TODO(confirm)
  },

  // ---------------------------------------------------------------
  // SERVICE AREA
  // ---------------------------------------------------------------
  serviceArea: {
    primaryCity: 'Nashville',
    region: 'TN',
    regionName: 'Middle Tennessee',
    // Only list communities the company genuinely serves.
    surroundingCities: [ // TODO(confirm) every city in this list
      'Brentwood',
      'Franklin',
      'Nolensville',
      'Hendersonville',
      'Mt. Juliet',
      'Bellevue',
      'Smyrna',
    ],
    radiusMiles: null, // TODO(confirm) e.g. 30 — null hides the radius claim
    // Map coordinates for the monochrome service map (approximate city centers).
    geo: {
      Nashville: [36.1627, -86.7816],
      Brentwood: [36.0331, -86.7828],
      Franklin: [35.9251, -86.8689],
      Nolensville: [35.9523, -86.6694],
      Hendersonville: [36.3048, -86.62],
      'Mt. Juliet': [36.2001, -86.5186],
      Bellevue: [36.0548, -86.9333],
      Smyrna: [35.9829, -86.5186],
      Murfreesboro: [35.8456, -86.3903],
      Gallatin: [36.3884, -86.4467],
    },
  },

  // ---------------------------------------------------------------
  // CREDENTIALS & STATS — null = "to be confirmed" placeholder.
  // NEVER estimate these.
  // ---------------------------------------------------------------
  credentials: {
    yearsExperience: null, // e.g. 12
    projectsCompleted: null, // e.g. 150
    license: null, // e.g. 'Tennessee Contractor License #00000'
    insured: null, // e.g. 'Fully insured — general liability & workers’ comp'
    warranty: null, // e.g. '2-year workmanship warranty'
  },

  // ---------------------------------------------------------------
  // SOCIAL
  // ---------------------------------------------------------------
  social: {
    facebook: 'https://www.facebook.com/p/Botwin-Renovations-LLC-61574995785653/',
    instagram: null,
    google: null, // Google Business Profile URL — enables "Read reviews on Google"
    houzz: null,
  },

  // ---------------------------------------------------------------
  // CONTACT FORM
  // ---------------------------------------------------------------
  form: {
    // 'netlify'   → Netlify Forms (zero setup when hosted on Netlify; supports photo uploads)
    // 'endpoint'  → POST multipart/form-data to `endpoint` (Formspree, Basin, your own API…)
    provider: 'netlify',
    endpoint: null, // e.g. 'https://formspree.io/f/xxxxxxx' when provider = 'endpoint'
    name: 'consultation',
  },

  // ---------------------------------------------------------------
  // SERVICES — set `offered: false` to remove a service everywhere.
  // TODO(confirm) the list of services Botwin actually offers.
  // ---------------------------------------------------------------
  services: [
    {
      slug: 'full-home-renovations',
      title: 'Full Home Renovations',
      short: 'Whole-house transformations planned as one project — layout, finishes and systems brought together.',
      image: 'living-after',
      offered: true,
      localPage: true,
      intro:
        'A full renovation touches every room, every trade and every decision. We plan it as one coordinated project so the finished home feels intentional from the front door to the back wall.',
      includes: [
        'Layout and scope planning',
        'Demolition and site protection',
        'Framing, drywall and finish carpentry',
        'Kitchen and bathroom remodeling',
        'Flooring, trim and paint',
        'Coordination of licensed trades where required',
      ],
      project: 'full-home-renovation',
    },
    {
      slug: 'kitchen-remodeling',
      title: 'Kitchen Remodeling',
      short: 'Kitchens rebuilt around how you cook, gather and live — cabinetry, surfaces, lighting and flow.',
      image: 'kitchen-after',
      offered: true,
      localPage: true,
      intro:
        'The kitchen works harder than any room in the house. We rebuild it around the way you actually use it: clear work zones, durable surfaces, better light and storage that makes sense.',
      includes: [
        'Layout changes and island additions',
        'Cabinet installation',
        'Countertops and backsplash',
        'Lighting upgrades',
        'Flooring',
        'Paint and finish carpentry',
      ],
      project: 'kitchen-transformation',
    },
    {
      slug: 'bathroom-remodeling',
      title: 'Bathroom Remodeling',
      short: 'Calm, durable bathrooms — walk-in showers, tile, vanities and waterproofing done properly.',
      image: 'bath-after',
      offered: true,
      localPage: true,
      intro:
        'A bathroom has to look calm and handle water every single day. We focus on what you can’t see — substrate and waterproofing — as much as the tile, glass and fixtures you can.',
      includes: [
        'Tub-to-shower conversions',
        'Tile floors and walls',
        'Vanities, mirrors and lighting',
        'Shower waterproofing systems',
        'Glass enclosures',
        'Accessibility upgrades',
      ],
      project: 'primary-bath-remodel',
    },
    {
      slug: 'interior-renovations',
      title: 'Interior Renovations',
      short: 'Open up, reconfigure and refinish living spaces so the whole interior works better.',
      image: 'living-detail',
      offered: true,
      localPage: false,
      intro:
        'Sometimes a home doesn’t need more space — it needs better space. Interior renovations reconfigure walls, openings, light and finishes to make existing rooms work harder.',
      includes: [
        'Wall removal and openings (with required engineering)',
        'New interior walls and doorways',
        'Ceilings and trim',
        'Built-ins',
        'Lighting',
        'Paint and finishes',
      ],
      project: 'interior-remodel',
    },
    {
      slug: 'flooring',
      title: 'Flooring',
      short: 'Hardwood, engineered wood, LVP and tile installed flat, tight and built to last.',
      image: 'floor-detail',
      offered: true,
      localPage: false,
      intro:
        'Great flooring starts below the surface. We prepare and level the subfloor before installation so the finished floor stays flat, quiet and tight for years.',
      includes: [
        'Floor removal and disposal',
        'Subfloor repair and leveling',
        'Hardwood and engineered wood',
        'Luxury vinyl plank',
        'Tile',
        'Transitions, base and trim',
      ],
      project: 'interior-remodel',
    },
    {
      slug: 'custom-carpentry',
      title: 'Custom Carpentry',
      short: 'Built-ins, trim, shelving and millwork crafted to fit the room exactly.',
      image: 'carpentry-detail',
      offered: true,
      localPage: false,
      intro:
        'Custom carpentry is where a renovation gets its character: built-ins that fit the wall exactly, crisp trim lines and storage designed around what you own.',
      includes: [
        'Built-in shelving and cabinetry',
        'Wall paneling',
        'Trim and casing packages',
        'Mudroom benches and lockers',
        'Closet systems',
        'Stair and railing updates',
      ],
      project: 'kitchen-transformation',
    },
    {
      slug: 'drywall-and-painting',
      title: 'Drywall & Painting',
      short: 'Clean walls and ceilings — hang, tape, finish and paint with sharp, even lines.',
      image: 'living-process',
      offered: true,
      localPage: false,
      intro:
        'Good paint can’t hide bad drywall. We hang, tape and finish walls properly, then paint with clean lines and even coverage.',
      includes: [
        'Drywall installation',
        'Taping and finishing',
        'Patch and repair',
        'Texture matching or removal',
        'Interior painting',
        'Ceilings and trim',
      ],
      project: 'interior-remodel',
    },
    {
      slug: 'exterior-renovations',
      title: 'Exterior Renovations',
      short: 'Siding, windows, doors and facade updates that change how the whole house reads.',
      image: 'exterior-after',
      offered: true,
      localPage: false,
      intro:
        'The exterior sets the first impression and protects everything inside. We update siding, openings and trim so the house looks sharper and is better sealed.',
      includes: [
        'Siding replacement',
        'Window and door replacement',
        'Exterior trim and soffits',
        'Porch and entry updates',
        'Exterior paint',
        'Weather barrier and flashing',
      ],
      project: 'exterior-renovation',
    },
    {
      slug: 'commercial-renovations',
      title: 'Commercial Renovations',
      short: 'Offices, retail and hospitality interiors built on schedule and to spec.',
      image: 'commercial-after',
      offered: true,
      localPage: false,
      intro:
        'Commercial projects run on schedules and specifications. We plan around your operations so the build is coordinated, clean and handed over on time.',
      includes: [
        'Tenant improvements',
        'Office build-outs',
        'Retail interiors',
        'Partitions and ceilings',
        'Flooring and finishes',
        'After-hours scheduling where needed',
      ],
      project: null,
    },
    {
      slug: 'custom-projects',
      title: 'Custom Projects',
      short: 'Something that doesn’t fit a category? Tell us about it — we’ll tell you honestly if we’re the right team.',
      image: 'bath-detail',
      offered: true,
      localPage: false,
      intro:
        'Not every project fits a category. If you have a specific idea, a problem space or an unusual build, tell us about it and we’ll give you a straight answer on what’s possible.',
      includes: [
        'Project-specific scoping',
        'Design coordination',
        'Specialty finishes',
        'Additions and conversions (where permitted)',
        'Basement and bonus room finishing',
        'Anything we can build well',
      ],
      project: null,
    },
  ],

  // ---------------------------------------------------------------
  // PROJECTS
  // The images below are illustrative architectural renderings that ship
  // with the site. Replace `images` with real Botwin project photos
  // (see README → "Adding real project photos") and set
  // `illustrative: false`. Fill in location / details from the real job.
  // ---------------------------------------------------------------
  projects: [
    {
      slug: 'full-home-renovation',
      title: 'Full Home Renovation',
      category: 'full',
      location: null, // e.g. 'East Nashville, TN'
      type: 'Residential · Whole-house',
      scope: ['Demolition', 'Framing', 'Drywall', 'Windows', 'Flooring', 'Finish carpentry', 'Paint'],
      illustrative: true,
      images: { before: 'living-before', process: 'living-process', after: 'living-after' },
      layout: 'full',
      challenge:
        'A dated interior divided into small, dark rooms, with tired finishes and very little natural light reaching the living spaces.',
      plan:
        'Open the main living area, enlarge the openings to the outside, and establish one consistent palette of materials across the whole home.',
      build:
        'The space was taken back to the structure, re-framed, and rebuilt in sequence — rough-ins, insulation, drywall, flooring, then finish carpentry and paint.',
      result:
        'A calm, light-filled open plan where every room connects, finished with durable materials chosen to age well.',
      details: { Duration: null, 'Square footage': null, Year: null },
    },
    {
      slug: 'kitchen-transformation',
      title: 'Kitchen Transformation',
      category: 'kitchens',
      location: null,
      type: 'Residential · Kitchen',
      scope: ['Layout change', 'Cabinetry', 'Countertops', 'Backsplash', 'Lighting', 'Flooring'],
      illustrative: true,
      images: { before: 'kitchen-before', process: 'kitchen-process', after: 'kitchen-after' },
      layout: 'split',
      challenge:
        'A closed-in kitchen with limited counter space, poor lighting and cabinetry that no longer worked for the way the family cooked.',
      plan:
        'Re-plan the work zones around a new island, run full-height cabinetry along the back wall, and layer the lighting.',
      build:
        'Existing finishes were removed to the studs, electrical updated by licensed trades, then cabinetry, stone and tile installed and detailed.',
      result:
        'A kitchen with more room to work, more storage and a clear, quiet look — built to handle daily use.',
      details: { Duration: null, 'Square footage': null, Year: null },
    },
    {
      slug: 'primary-bath-remodel',
      title: 'Primary Bath Remodel',
      category: 'bathrooms',
      location: null,
      type: 'Residential · Bathroom',
      scope: ['Tub-to-shower conversion', 'Waterproofing', 'Tile', 'Vanity', 'Glass', 'Lighting'],
      illustrative: true,
      images: { before: 'bath-before', process: 'bath-process', after: 'bath-after' },
      layout: 'vertical',
      challenge:
        'An outdated bathroom with a tub nobody used, worn tile and a vanity that didn’t offer enough storage.',
      plan:
        'Replace the tub with a curbless walk-in shower, use large-format tile to reduce grout lines, and add a floating vanity.',
      build:
        'After demolition, the shower was built on a fully waterproofed substrate before tile, glass and fixtures went in.',
      result:
        'A clean, bright bathroom that is easier to use and easier to maintain.',
      details: { Duration: null, 'Square footage': null, Year: null },
    },
    {
      slug: 'exterior-renovation',
      title: 'Exterior Renovation',
      category: 'exteriors',
      location: null,
      type: 'Residential · Exterior',
      scope: ['Siding', 'Windows', 'Entry door', 'Trim', 'Paint'],
      illustrative: true,
      images: { before: 'exterior-before', process: 'exterior-process', after: 'exterior-after' },
      layout: 'full',
      challenge:
        'Weathered lap siding, small windows and a facade that didn’t reflect the quality of the home inside.',
      plan:
        'Re-clad the house in vertical board-and-batten, enlarge the key openings and simplify the trim.',
      build:
        'The old cladding was removed, the weather barrier and flashing renewed, then new windows, siding and trim installed.',
      result:
        'A sharper, darker, better-sealed exterior with a stronger presence from the street.',
      details: { Duration: null, 'Square footage': null, Year: null },
    },
    {
      slug: 'interior-remodel',
      title: 'Interior Remodel',
      category: 'interiors',
      location: null,
      type: 'Residential · Interior',
      scope: ['Drywall', 'Built-ins', 'Flooring', 'Paint', 'Lighting'],
      illustrative: true,
      images: { before: 'commercial-before', process: 'commercial-process', after: 'commercial-after' },
      layout: 'split',
      challenge:
        'A large but underused space with no clear purpose, poor finishes and uneven floors.',
      plan:
        'Define zones with new partitions and built-ins, level the floor, and update lighting throughout.',
      build:
        'New framing and drywall, floor leveling and new flooring, then custom carpentry and a full repaint.',
      result:
        'A flexible, well-lit interior that finally works as hard as its footprint.',
      details: { Duration: null, 'Square footage': null, Year: null },
    },
  ],

  // ---------------------------------------------------------------
  // REVIEWS — REAL, VERIFIED REVIEWS ONLY. Copy them word for word
  // from Google / Facebook / Yelp, with the client's permission.
  // Leave empty to show the honest "reviews coming soon" state.
  // Review schema markup is only emitted when this list has entries.
  // ---------------------------------------------------------------
  reviews: [
    // { name: 'First L.', rating: 5, text: '…', project: 'Kitchen Remodel', source: 'Google', date: '2026-05-01' },
  ],
};
