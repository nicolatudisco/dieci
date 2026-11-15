/**
 * Numeric data used by the scenes and by the live counters.
 * Every value has a source comment. Values marked "verify" must be
 * re-checked during the fact-check pass (/fact-check).
 */

/** Speed of light in km/s (exact, by definition of the metre). */
export const LIGHT_SPEED_KM_S = 299_792.458;

/** One light-day in km: 299,792.458 km/s × 86,400 s. */
export const LIGHT_DAY_KM = LIGHT_SPEED_KM_S * 86_400; // ≈ 25,902,068,371 km

/** One light-year in km (Julian year, 365.25 days). */
export const LIGHT_YEAR_KM = LIGHT_SPEED_KM_S * 86_400 * 365.25; // ≈ 9.4607e12 km

/** One light-year in metres. */
export const LIGHT_YEAR_M = LIGHT_YEAR_KM * 1000;

export const VOYAGER_1 = {
  /** Launch date. Source: NASA/JPL. */
  launchDateUTC: '1977-09-05T12:56:00Z',
  /**
   * Crosses one light-day from Earth at 12:16:07 a.m. CST on 18 Nov 2026 = 06:16:07 UTC.
   * Source: EarthSky citing NASA,
   * https://earthsky.org/space/voyager-1-1-light-day-from-earth-november-17-18-2026/
   */
  lightDayDateUTC: '2026-11-18T06:16:07Z',
  /** Distance from Earth at that moment, by definition. */
  kmAtLightDay: LIGHT_DAY_KM,
  /**
   * Approximate speed relative to the Sun, ~17 km/s (about 61,000 km/h; CNN quotes 38,000 mph).
   * The distance from Earth also oscillates by ±1 AU over the year: for a "live" counter a linear
   * estimate from the light-day moment is good enough if the UI says "circa". verify
   */
  speedKmS: 17,
} as const;

export interface NearbyStar {
  /** Name as shown to the child (Italian where a common Italian name exists). */
  name: string;
  /** Distance in light-years. */
  ly: number;
  /** Right ascension in hours (decimal), for placing the star in 3D. */
  raHours: number;
  /** Declination in degrees (decimal). */
  decDeg: number;
  /** Short note for the label/tooltip, optional. */
  note?: string;
}

/**
 * Stars within ~11.5 light-years, for the "bolla dei 10 anni" scene.
 * Distances: OpenStax Astronomy, Appendix "The Nearest Stars, Brown Dwarfs, and White Dwarfs"
 * (https://courses.lumenlearning.com/suny-astronomy/?p=32) and Universe Today
 * (https://www.universetoday.com/25220/nearest-stars/). Coordinates are J2000, rounded. verify
 */
export const NEARBY_STARS: NearbyStar[] = [
  { name: 'Proxima Centauri', ly: 4.24, raHours: 14.495, decDeg: -62.68, note: 'la stella più vicina al Sole' },
  { name: 'Alfa Centauri A e B', ly: 4.37, raHours: 14.66, decDeg: -60.83 },
  { name: 'Stella di Barnard', ly: 5.96, raHours: 17.963, decDeg: 4.69 },
  { name: 'Wolf 359', ly: 7.9, raHours: 10.94, decDeg: 7.0 },
  { name: 'Lalande 21185', ly: 8.3, raHours: 11.06, decDeg: 35.97 },
  { name: 'Sirio', ly: 8.6, raHours: 6.752, decDeg: -16.72, note: 'la stella più luminosa del cielo notturno' },
  { name: 'Luyten 726-8', ly: 8.7, raHours: 1.65, decDeg: -17.95 },
  { name: 'Ross 154', ly: 9.7, raHours: 18.83, decDeg: -23.83 },
  { name: 'Ross 248', ly: 10.3, raHours: 23.69, decDeg: 44.17 },
  { name: 'Epsilon Eridani', ly: 10.5, raHours: 3.549, decDeg: -9.46, note: 'una stella più giovane del Sole' },
  { name: 'Lacaille 9352', ly: 10.7, raHours: 23.09, decDeg: -35.85 },
  { name: 'Ross 128', ly: 10.9, raHours: 11.79, decDeg: 0.8 },
  { name: '61 Cygni', ly: 11.4, raHours: 21.115, decDeg: 38.75, note: 'la prima stella di cui si è misurata la distanza (1838)' },
  { name: 'Procione', ly: 11.46, raHours: 7.655, decDeg: 5.22 },
];

/** Age of the universe, billions of years. Planck: 13.787 ± 0.020. */
export const UNIVERSE_AGE_GYR = 13.8;

/** Radius of the observable universe in light-years (comoving), ~46.5 billion. */
export const OBSERVABLE_UNIVERSE_RADIUS_LY = 46.5e9;
