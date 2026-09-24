/**
 * Botwin Renovations logo — "BR" monogram over a solid base bar.
 *
 * Traced from the official logo artwork (brand/botwin-logo-original.jpg)
 * in its original 960 × 958 px coordinate space; the vector matches the
 * artwork to within edge anti-aliasing. One fill, even-odd rule:
 *   - outer hexagonal outline with the open-bottomed R leg
 *   - three counters (upper-left, upper-right, lower-left)
 *   - the base bar
 */
const PATH = [
  'M212 84H699L797 318L760 414L903 748L805 751L679 456H503V751H130L72 612L155 414L114 318Z', // outline
  'M275 177H411V363H235L216 318Z', // upper-left counter
  'M503 177H637L696 318L679 363H503Z', // upper-right counter
  'M239 457H411V659H194L174 612Z', // lower-left counter
  'M0 825H960V957H0Z', // base bar
].join(' ');

// Tight bounds of the artwork (monogram top to bottom of the base bar).
const VIEWBOX = '0 84 960 873';
// Square framing for icons, centred on the artwork.
const SQUARE_VIEWBOX = '-20 20 1000 1000';

const svg = ({ fill = 'currentColor', viewBox = VIEWBOX, attrs = '' } = {}) =>
  `<svg viewBox="${viewBox}" ${attrs}><path fill="${fill}" fill-rule="evenodd" d="${PATH}"/></svg>`;

module.exports = { PATH, VIEWBOX, SQUARE_VIEWBOX, svg };
