/**
 * Real places beyond the bubble (M5): the clouds of gas and dust around the Sun, the shape
 * of the Milky Way, the galaxies of the Local Group. The scenes are procedural, but where
 * something is drawn, it is where it really is.
 *
 * Directions are galactic longitudes (degrees), distances are in light-years from the Sun.
 * Like the stars of the bubble, the scenes keep the true direction on the galactic plane and
 * the true distance (see src/levels/sky.ts → stageFromGalactic); latitude is given for
 * completeness.
 */

export interface Nebula {
  readonly name: string;
  /** Galactic longitude and latitude, degrees. */
  readonly l: number;
  readonly b: number;
  /** Distance from the Sun, light-years. */
  readonly ly: number;
  /** Rough radius of the cloud, light-years. */
  readonly radius: number;
  /** emission: glowing pink gas; reflection: blue dust lit by stars; dark: dust that hides the stars behind; shell: the faint pink ring of an old explosion or a bubble. */
  readonly kind: 'emission' | 'reflection' | 'dark' | 'shell';
  /** The direction the cloud is long in, degrees on screen (0 = right, 90 = up), and how much shorter it is across (0..1). */
  readonly angle?: number;
  readonly squash?: number;
}

/**
 * Clouds within about 2,600 light-years of the Sun. Distances of the molecular clouds from
 * Zucker et al. (2020), «A compendium of distances to molecular clouds» (A&A 633, A51,
 * Gaia DR2), rounded; the others from the pages of each object on Wikipedia (checked on
 * 17 Nov 2026). The Orion Nebula is at the stage anchor (1,344 light-years, ESO).
 * Corrected in the fact-check of M8 (docs/fact-check.md): the California Nebula at the
 * distance of its star ξ Persei (about 1,300 light-years, Gaia), the Gum Nebula at 450 pc
 * (Graham 1986), the Vela remnant at the distance of its pulsar (287 pc, Dodson 2003).
 * None of them is named on screen except the Orion Nebula: together they ring the Sun at a
 * few hundred light-years, along the edge of the hot, thin Local Bubble.
 */
export const NEBULAE: readonly Nebula[] = [
  // The Orion complex: the nebula, the long cloud it is part of, its two rings.
  { name: 'Nebulosa di Orione', l: 209.0, b: -19.4, ly: 1344, radius: 12, kind: 'emission' },
  { name: 'Orione A', l: 212.0, b: -19.0, ly: 1400, radius: 75, kind: 'dark', angle: 300, squash: 0.3 },
  { name: 'Orione B', l: 206.5, b: -16.0, ly: 1370, radius: 45, kind: 'dark', angle: 290, squash: 0.45 },
  { name: 'Testa di Cavallo', l: 206.9, b: -16.6, ly: 1375, radius: 8, kind: 'emission' },
  { name: 'Anello di Barnard', l: 205.0, b: -17.0, ly: 1440, radius: 150, kind: 'shell' },
  { name: 'Anello di Lambda Orionis', l: 195.0, b: -12.0, ly: 1300, radius: 100, kind: 'shell' },
  // Taurus, Perseus, the Pleiades: towards the anticentre.
  { name: 'Pleiadi', l: 166.6, b: -23.5, ly: 444, radius: 8, kind: 'reflection' },
  { name: 'Nube del Toro', l: 172.0, b: -15.0, ly: 450, radius: 45, kind: 'dark', angle: 20, squash: 0.5 },
  { name: 'Nube di Perseo', l: 159.0, b: -20.0, ly: 960, radius: 40, kind: 'dark', angle: 40, squash: 0.5 },
  { name: 'Nebulosa California', l: 160.6, b: -12.4, ly: 1300, radius: 50, kind: 'emission', angle: 70, squash: 0.35 },
  // Towards the centre of the galaxy.
  { name: 'Rho Ophiuchi', l: 353.0, b: 17.0, ly: 450, radius: 30, kind: 'reflection' },
  { name: 'Nube del Serpente', l: 353.0, b: 17.0, ly: 455, radius: 50, kind: 'dark', angle: 160, squash: 0.5 },
  { name: 'Nubi del Lupo', l: 339.0, b: 16.0, ly: 510, radius: 40, kind: 'dark', angle: 80, squash: 0.45 },
  { name: 'Corona Australe', l: 0.0, b: -18.0, ly: 490, radius: 20, kind: 'dark', angle: 120, squash: 0.5 },
  { name: 'Fenditura dell’Aquila', l: 28.0, b: 3.0, ly: 850, radius: 120, kind: 'dark', angle: 110, squash: 0.35 },
  // The southern sky.
  { name: 'Nubi del Camaleonte', l: 297.0, b: -16.0, ly: 620, radius: 30, kind: 'dark', angle: 30, squash: 0.55 },
  { name: 'Sacco di Carbone', l: 301.0, b: -1.0, ly: 600, radius: 30, kind: 'dark' },
  { name: 'Nebulosa di Gum', l: 258.0, b: -2.0, ly: 1450, radius: 400, kind: 'shell' },
  { name: 'Resti della Vela', l: 263.9, b: -3.3, ly: 950, radius: 58, kind: 'shell' },
  // Towards Cepheus and Cygnus.
  { name: 'Nubi di Cefeo', l: 110.0, b: 15.0, ly: 1100, radius: 70, kind: 'dark', angle: 150, squash: 0.45 },
  { name: 'Nebulosa Nord America', l: 85.6, b: -0.7, ly: 2590, radius: 50, kind: 'emission', angle: 10, squash: 0.7 },
];

/**
 * The shape of the Milky Way, for the procedural galaxy (src/levels/galaxy.ts).
 * - 100,000 light-years across (NASA, in the sources of `via-lattea`).
 * - The Sun 26,000 light-years from the centre (stage anchor `galacticCentre`).
 * - A long bar about 16,000 light-years in half-length, its near end turned about 30° (28°–33°)
 *   from the line between the Sun and the centre, towards growing longitudes (Wegg, Gerhard
 *   & Portail 2015, «The structure of the Milky Way's bar outside the bulge», MNRAS 450, 4050).
 * - Arms that open at about 12° (the pitch measured from masers: Reid et al. 2019, ApJ 885,
 *   131): Scutum–Centaurus and Perseus leave the ends of the bar, Sagittarius–Carina and
 *   Norma–Outer lie in between; the Sun is on the Local Arm (the Orion Spur), between
 *   Sagittarius–Carina on the inside and Perseus on the outside.
 */
export const MILKY_WAY = {
  radiusLy: 50_000,
  sunFromCentreLy: 26_000,
  barHalfLengthLy: 16_000,
  barAngleDeg: 30,
  pitchDeg: 12,
} as const;

export interface Galaxy {
  readonly name: string;
  readonly l: number;
  readonly b: number;
  readonly ly: number;
  /** Apparent visual magnitude: with the distance, how bright it really is. */
  readonly vmag: number;
}

/** The big ones of the Local Group, drawn with the procedural galaxy. */
export const LOCAL_GIANTS = {
  /** Andromeda (M31): 2.5 million light-years (NASA, in the sources of `andromeda`); the bright disc is about 150,000 light-years across, the faint one more than 200,000. */
  andromeda: { name: 'Andromeda', l: 121.17, b: -21.57, ly: 2_500_000, radiusLy: 110_000, inclinationDeg: 77 },
  /** The Triangulum Galaxy (M33): about 61,000 light-years across, inclined about 55°. */
  triangulum: { name: 'Galassia del Triangolo', l: 133.6, b: -31.3, ly: 2_639_000, radiusLy: 30_500, inclinationDeg: 55 },
  /** The Large and Small Magellanic Clouds: 32,000 and 19,000 light-years across. */
  lmc: { name: 'Grande Nube di Magellano', l: 280.5, b: -32.9, ly: 165_000, radiusLy: 16_100 },
  smc: { name: 'Piccola Nube di Magellano', l: 302.8, b: -44.3, ly: 209_000, radiusLy: 9_450 },
} as const;

/**
 * The smaller galaxies of the Local Group, from the catalogue of McConnachie (2012, AJ 144, 4),
 * updated in January 2021 (NRC Canada, «Nearby Dwarf Galaxies»): every confirmed galaxy
 * within 3.6 million light-years and at least as bright as absolute magnitude −7 (the
 * faintest ones would not be seen). Longitudes and latitudes computed from the catalogue's
 * right ascension and declination, distances from its distance moduli. The diameters of the
 * big ones (D25) from Wikipedia, «List of Local Group galaxies».
 */
export const LOCAL_DWARFS: readonly Galaxy[] = [
  { name: 'Sagittarius dSph', l: 5.6, b: -14.2, ly: 86000, vmag: 3.6 },
  { name: 'Draco', l: 86.4, b: 34.7, ly: 247000, vmag: 10.7 },
  { name: 'Ursa Minor', l: 105.0, b: 44.8, ly: 247000, vmag: 10.4 },
  { name: 'Sculptor', l: 287.5, b: -83.2, ly: 280000, vmag: 8.9 },
  { name: 'Sextans', l: 243.5, b: 42.3, ly: 280000, vmag: 10.4 },
  { name: 'Carina', l: 260.1, b: -22.2, ly: 343000, vmag: 10.7 },
  { name: 'Crater II', l: 282.9, b: 42.0, ly: 383000, vmag: 12.1 },
  { name: 'Antlia II', l: 264.9, b: 11.2, ly: 430000, vmag: 11.6 },
  { name: 'Fornax', l: 237.1, b: -65.7, ly: 480000, vmag: 7.4 },
  { name: 'Canes Venatici I', l: 74.3, b: 79.8, ly: 710000, vmag: 13.1 },
  { name: 'Leo II', l: 220.2, b: 67.2, ly: 761000, vmag: 12.1 },
  { name: 'Leo I', l: 226.0, b: 49.1, ly: 827000, vmag: 10.2 },
  { name: 'Eridanus II', l: 249.8, b: -51.6, ly: 1240000, vmag: 15.7 },
  { name: 'Phoenix', l: 272.2, b: -68.9, ly: 1335000, vmag: 13.2 },
  { name: 'Leo T', l: 214.9, b: 43.7, ly: 1360000, vmag: 15.5 },
  { name: 'NGC 6822', l: 25.4, b: -18.4, ly: 1498000, vmag: 8.1 },
  { name: 'Andromeda XVI', l: 124.9, b: -30.5, ly: 1554000, vmag: 14.4 },
  { name: 'Andromeda XXIV', l: 127.8, b: -16.3, ly: 1956000, vmag: 16.3 },
  { name: 'NGC 185', l: 120.8, b: -14.5, ly: 2011000, vmag: 9.2 },
  { name: 'Andromeda XV', l: 127.9, b: -24.5, ly: 2039000, vmag: 14.6 },
  { name: 'Andromeda II', l: 128.9, b: -29.2, ly: 2125000, vmag: 11.5 },
  { name: 'Andromeda XXVIII', l: 91.0, b: -22.9, ly: 2155000, vmag: 15.6 },
  { name: 'Andromeda X', l: 125.8, b: -18.0, ly: 2185000, vmag: 16.6 },
  { name: 'NGC 147', l: 119.8, b: -14.3, ly: 2205000, vmag: 9.5 },
  { name: 'Andromeda XXX', l: 120.5, b: -13.2, ly: 2225000, vmag: 16.2 },
  { name: 'Andromeda XVII', l: 120.2, b: -18.5, ly: 2374000, vmag: 15.8 },
  { name: 'Andromeda XXIX', l: 109.8, b: -30.8, ly: 2385000, vmag: 16.0 },
  { name: 'Andromeda I', l: 121.7, b: -24.8, ly: 2429000, vmag: 12.5 },
  { name: 'Andromeda III', l: 119.4, b: -26.3, ly: 2440000, vmag: 14.2 },
  { name: 'Cetus', l: 101.5, b: -72.9, ly: 2463000, vmag: 13.1 },
  { name: 'IC 1613', l: 129.7, b: -60.6, ly: 2463000, vmag: 9.2 },
  { name: 'Andromeda XXXI', l: 101.1, b: -16.7, ly: 2474000, vmag: 12.7 },
  { name: 'Andromeda VII', l: 109.5, b: -10.0, ly: 2486000, vmag: 11.2 },
  { name: 'Andromeda XXVI', l: 118.1, b: -14.7, ly: 2486000, vmag: 17.3 },
  { name: 'Andromeda IX', l: 123.2, b: -19.7, ly: 2497000, vmag: 16.3 },
  { name: 'Andromeda XXIII', l: 131.0, b: -23.6, ly: 2509000, vmag: 14.2 },
  { name: 'LGS 3', l: 126.8, b: -40.9, ly: 2509000, vmag: 14.3 },
  { name: 'Andromeda V', l: 126.2, b: -15.1, ly: 2520000, vmag: 14.9 },
  { name: 'Andromeda XXXIII', l: 147.8, b: -15.5, ly: 2520000, vmag: 14.1 },
  { name: 'Andromeda XXXII', l: 120.5, b: -11.2, ly: 2532000, vmag: 12.2 },
  { name: 'Andromeda VI', l: 106.0, b: -36.3, ly: 2555000, vmag: 13.0 },
  { name: 'Andromeda XIV', l: 123.0, b: -33.2, ly: 2591000, vmag: 15.9 },
  { name: 'IC 10', l: 119.0, b: -3.3, ly: 2591000, vmag: 9.5 },
  { name: 'Leo A', l: 196.9, b: 52.4, ly: 2603000, vmag: 12.4 },
  { name: 'Andromeda XXV', l: 119.2, b: -15.9, ly: 2651000, vmag: 14.8 },
  { name: 'Andromeda XIX', l: 115.6, b: -27.4, ly: 2676000, vmag: 15.6 },
  { name: 'Andromeda XXI', l: 111.9, b: -19.2, ly: 2700000, vmag: 14.8 },
  { name: 'Andromeda XXVII', l: 120.4, b: -17.4, ly: 2700000, vmag: 16.7 },
  { name: 'Tucana', l: 322.9, b: -47.4, ly: 2894000, vmag: 15.2 },
  { name: 'Pegasus dIrr', l: 94.8, b: -43.6, ly: 3002000, vmag: 12.6 },
  { name: 'WLM', l: 75.9, b: -73.6, ly: 3044000, vmag: 10.6 },
  { name: 'Sagittarius dIrr', l: 21.1, b: -16.3, ly: 3479000, vmag: 13.6 },
  { name: 'Aquarius', l: 34.0, b: -31.3, ly: 3495000, vmag: 14.5 },
];
