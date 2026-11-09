/**
 * Pinyin — Chinese → Latin transliteration, used as a search fallback.
 *
 * WHY THIS EXISTS
 * ---------------
 * The geocoding database (GeoNames) stores the *primary* name of smaller
 * Chinese cities in pinyin and keeps the Chinese name in `admin2`:
 *
 *   search "运城"  → no results   (name is "Yuncheng", admin2 is "运城市")
 *   search "Yuncheng" → 运城市 (name = "Yuncheng", admin1 = "山西")
 *
 * Measured failure rate for 20 well-known prefecture-level cities: **30%**
 * (运城 / 河津 / 朔州 / 鹤壁 / 许昌 / 焦作 all failed).
 *
 * The fix has two halves:
 *   1. This module converts a Chinese keyword to pinyin so the adapter can
 *      retry the upstream query when the direct one returns nothing.
 *   2. The adapter prefers `admin2` as the display name, so a pinyin match
 *      is still *shown* to the user in Chinese.
 *
 * `pinyin-pro` is used because it has zero dependencies and handles polyphones
 * (多音字) with a phrase dictionary — e.g. 重庆 → chongqing, not zhongqing.
 */

import { pinyin } from "pinyin-pro";

/** True when the string contains at least one CJK ideograph */
export function containsChinese(text: string): boolean {
  return /[一-鿿]/.test(text);
}

/**
 * Transliterate Chinese characters to pinyin.
 *
 * Returns `null` when the input contains no Chinese characters — there is
 * nothing to convert, and the caller should not issue a fallback query.
 *
 * @param text        The keyword, possibly mixed Chinese and Latin
 * @param capitalize  Capitalize each syllable (matches the upstream naming
 *                    convention, e.g. "Yuncheng" rather than "yuncheng").
 *                    The upstream API is case-insensitive, so this is purely
 *                    cosmetic.
 */
export function toPinyin(text: string, capitalize = true): string | null {
  const trimmed = text.trim();
  if (!trimmed || !containsChinese(trimmed)) return null;

  const syllables = pinyin(trimmed, {
    toneType: "none",
    type: "array",
    nonZh: "consecutive",
  }) as string[];

  const result = syllables
    .filter(Boolean)
    .map((s) => (capitalize ? s.charAt(0).toUpperCase() + s.slice(1) : s))
    .join("");

  return result || null;
}

/**
 * Administrative suffixes that the upstream database omits from the primary
 * name. "运城市" is indexed as "Yuncheng" (the 市 suffix is dropped), so a
 * literal transliteration of the display name would miss.
 */
const ADMIN_SUFFIXES = ["特别行政区", "自治州", "自治县", "地区", "盟", "市", "县", "区"];

/**
 * Build the list of pinyin queries to try, most likely first.
 *
 * For "运城市" this yields ["Yunchengshi", "Yuncheng"] — the second one is
 * the form the upstream database actually uses.
 *
 * @returns An empty array when the keyword has no Chinese characters.
 */
export function pinyinSearchVariants(text: string): string[] {
  const direct = toPinyin(text);
  if (!direct) return [];

  const variants: string[] = [direct];

  // Strip a trailing administrative suffix, if present.
  let stem = text.trim();
  for (const suffix of ADMIN_SUFFIXES) {
    if (stem.length > suffix.length && stem.endsWith(suffix)) {
      stem = stem.slice(0, -suffix.length);
      break;
    }
  }
  if (stem !== text.trim()) {
    const stemmed = toPinyin(stem);
    if (stemmed && !variants.includes(stemmed)) variants.push(stemmed);
  }

  return variants;
}
