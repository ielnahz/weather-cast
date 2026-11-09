/**
 * Display-name selection for geocoding results.
 *
 * The GeoNames database that Open-Meteo uses keeps the *primary* name of
 * smaller Chinese places in pinyin and the Chinese name in `admin2`:
 *
 *   { name: "Yuncheng", admin1: "山西", admin2: "运城市" }   ← 运城市
 *   { name: "Hejin",    admin1: "山西", admin2: "运城市" }   ← 河津（运城市下辖的县）
 *
 * For a Chinese-language app, showing "运城市" is far more useful than
 * "Yuncheng". But `admin2` is the *parent* division, so it is only the right
 * display name when the place the user asked for IS that division.
 */

/** A geocoding record as returned by the upstream API */
export interface GeoNameRecord {
  name: string;
  admin1?: string;
  admin2?: string;
}

/** True when the string contains at least one CJK ideograph */
export function hasChinese(text: string): boolean {
  return /[一-鿿]/.test(text);
}

/** Administrative suffixes that carry no distinguishing information */
const ADMIN_SUFFIXES = ["特别行政区", "自治州", "自治县", "地区", "盟", "市", "县", "区"];

/** Strip a trailing administrative suffix ("运城市" → "运城") */
function stripAdminSuffix(name: string): string {
  let result = name.trim();
  for (const suffix of ADMIN_SUFFIXES) {
    if (result.length > suffix.length && result.endsWith(suffix)) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }
  return result;
}

/**
 * Choose the name to show for a geocoding result.
 *
 * Rules:
 *   1. If `name` contains Chinese → use it. (Most provinces and major cities
 *      are indexed in Chinese.)
 *   2. If the user typed a Chinese query and that query is NOT the same as
 *      `admin2` (stripped of suffix), the record is a *child* place (case C:
 *      河津 is a county inside 运城市). Use the query — it is the Chinese name
 *      the user actually asked for, which the GeoNames record does not store.
 *   3. Otherwise if `admin2` contains Chinese → use `admin2`. This is the
 *      prefecture-level Chinese name for cities like 运城 (case B).
 *   4. Otherwise use `name` as-is (a genuinely Latin-script place name,
 *      such as "London" or "Berlin").
 *
 * @param query The keyword the user typed. When the record carries no
 *              Chinese name at all (its own name is pinyin *and* its admin2
 *              is the parent city), the query is the only Chinese label
 *              available — and it is exactly what the user asked for.
 */
export function pickDisplayName(record: GeoNameRecord, query?: string): string {
  if (hasChinese(record.name)) return record.name;

  // Case C: the record's name is pinyin and admin2 is the *parent* city.
  // If the user typed a Chinese query that doesn't match admin2, the query
  // is the place's own Chinese name (e.g. 河津 ≠ 运城市).
  if (query && hasChinese(query) && record.admin2 && hasChinese(record.admin2)) {
    const admin2Stripped = stripAdminSuffix(record.admin2);
    const queryStripped = stripAdminSuffix(query);
    if (admin2Stripped !== queryStripped) {
      return query;
    }
  }

  // Case B: the record's name is pinyin and admin2 IS the place itself.
  if (record.admin2 && hasChinese(record.admin2)) return record.admin2;

  // No Chinese name anywhere in the record — fall back to the query when the
  // user typed one, otherwise show the raw (Latin) name.
  if (query && hasChinese(query)) return query;

  return record.name;
}
