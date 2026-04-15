/**
 * Star packages price list (in UZS)
 * Rate: 1 star = 225 UZS
 * Min: 50 stars | Max: 5000 stars
 */
const PRICE_PER_STAR_UZS = 200;
const MIN_STARS = 50;
const MAX_STARS = 5000;

const STAR_PACKAGES = [
  { stars: 50,   price_uzs: 50   * PRICE_PER_STAR_UZS }, // 11 250
  { stars: 100,  price_uzs: 100  * PRICE_PER_STAR_UZS }, // 22 500
  { stars: 250,  price_uzs: 250  * PRICE_PER_STAR_UZS }, // 56 250
  { stars: 500,  price_uzs: 500  * PRICE_PER_STAR_UZS }, // 112 500
  { stars: 1000, price_uzs: 1000 * PRICE_PER_STAR_UZS }, // 225 000
  { stars: 2500, price_uzs: 2500 * PRICE_PER_STAR_UZS }, // 562 500
  { stars: 5000, price_uzs: 5000 * PRICE_PER_STAR_UZS }, // 1 125 000
];

const getPriceForStars = (stars) => {
  const pkg = STAR_PACKAGES.find((p) => p.stars === stars);
  return pkg ? pkg.price_uzs : null;
};

const getCustomPrice = (stars) => Math.ceil(stars * PRICE_PER_STAR_UZS);

module.exports = {
  STAR_PACKAGES,
  getPriceForStars,
  getCustomPrice,
  PRICE_PER_STAR_UZS,
  MIN_STARS,
  MAX_STARS,
};
