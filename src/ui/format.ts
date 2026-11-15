/**
 * Italian number and unit formatting for the counter and the live texts.
 * Pure functions with their own grouping, so the output is identical in every
 * browser and in the tests (Intl grouping rules for `it` vary between ICU versions).
 */
import { LIGHT_YEAR_M } from '../content/data.ts';

/** Rounds to `digits` significant figures. */
export function roundSig(value: number, digits: number): number {
  if (value === 0 || !Number.isFinite(value)) return value;
  return Number(value.toPrecision(digits));
}

/** Formats a number the Italian way: 1.234.567,8 (dot for thousands, comma for decimals). */
export function formatNumber(value: number, maxDecimals = 0): string {
  const sign = value < 0 ? '−' : '';
  const fixed = Math.abs(value).toFixed(maxDecimals);
  const [intPart = '0', decPart = ''] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimals = decPart.replace(/0+$/, '');
  return sign + grouped + (decimals ? `,${decimals}` : '');
}

/** Formats a value already rounded to two significant figures: 1.600 · 16 · 1,6 · 0,11. */
function formatTwoSig(value: number): string {
  const decimals = value >= 10 ? 0 : value >= 1 ? 1 : 2;
  return formatNumber(value, decimals);
}

interface Unit {
  /** Metres in one unit. */
  size: number;
  one: string;
  many: string;
  /** The rounded value must stay below this, otherwise the next unit is used. */
  limit: number;
}

const UNITS: readonly Unit[] = [
  { size: 0.01, one: 'cm', many: 'cm', limit: 100 },
  { size: 1, one: 'm', many: 'm', limit: 1000 },
  { size: 1e3, one: 'km', many: 'km', limit: 1e6 },
  { size: 1e9, one: 'milione di km', many: 'milioni di km', limit: 1000 },
  { size: 1e12, one: 'miliardo di km', many: 'miliardi di km', limit: 1000 },
  { size: LIGHT_YEAR_M, one: 'anno-luce', many: 'anni-luce', limit: 1e6 },
  { size: LIGHT_YEAR_M * 1e6, one: 'milione di anni-luce', many: 'milioni di anni-luce', limit: 1000 },
  { size: LIGHT_YEAR_M * 1e9, one: 'miliardo di anni-luce', many: 'miliardi di anni-luce', limit: Infinity },
];

/**
 * A width in metres as a friendly Italian quantity with two significant figures:
 * «3,2 m», «1.600 km», «9,5 miliardi di km», «33 anni-luce», «92 miliardi di anni-luce».
 */
export function formatWidth(metres: number): string {
  for (const unit of UNITS) {
    const value = roundSig(metres / unit.size, 2);
    if (value < unit.limit) return `${formatTwoSig(value)} ${value === 1 ? unit.one : unit.many}`;
  }
  return '';
}

/** Splits a width into number and unit, for layouts that style them separately. */
export function splitWidth(metres: number): { value: string; unit: string } {
  const text = formatWidth(metres);
  const cut = text.indexOf(' ');
  return cut < 0 ? { value: text, unit: '' } : { value: text.slice(0, cut), unit: text.slice(cut + 1) };
}
