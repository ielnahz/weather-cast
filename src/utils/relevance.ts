/**
 * Relevance scoring for geocoding results.
 *
 * WHY THIS IS NEEDED
 * ------------------
 * When a Chinese keyword is answered via the pinyin fallback, the upstream
 * API returns *fuzzy* matches ordered by its own relevance — which is
 * computed on the Latin name only. That ordering is not what a Chinese user
 * expects:
 *
 *   search "河津" → pinyin "Hejin" →
 *     1. 和静   (新疆 / 巴音郭楞)   ← a different place that happens to
 *     2. Hejin  (河北 / 邯郸市)        share the pinyin
 *     3. Hejin  (山西 / 运城市)   ← the actual 河津, ranked 3rd
 *
 *   search "运城" → pinyin "Yuncheng" →
 *     1. 运城关公机场 (山西 / 运城市)  ← an *airport* in the right city
 *     2. 运城市       (山西 / 运城市)  ← the city itself
 *
 * The upstream GeoNames data has three relevant shapes:
 *
 *   A. `name` is Chinese        → "太原", "深圳" — an exact hit, done.
 *   B. `name` is pinyin and
 *      `admin2` is Chinese      → "Yuncheng" / "运城市" — the Chinese name
 *                                 of the place lives in `admin2`.
 *   C. `name` is pinyin and
 *      `admin2` is Chinese but
 *      is the *parent* city     → "Hejin" / "运城市" — 河津 is a county
 *                                 inside 运城市, and its own Chinese name
 *                                 is not stored anywhere in the record.
 *
 * For case C the only evidence that a record is the right one is that its
 * pinyin name matches the query's pinyin *exactly*. Everything else is a
 * heuristic, so this module scores explicitly and lets the caller decide.
 */

/** A geocoding record as returned by the upstream API */
export interface GeoNameRecord {
  name: string;
  admin1?: string;
  admin2?: string;
  /** GeoNames feature code — PPL* means "populated place" */
  feature_code?: string;
  population?: number | null;
}

/** Administrative suffixes that carry no distinguishing information */
const ADMIN_SUFFIXES = ["特别行政区", "自治州", "自治县", "地区", "市", "县", "盟", "区"];

/** Feature codes that are places a user would never search for directly */
const NON_PLACE_PREFIXES = ["A", "L", "T", "R", "S", "H", "P", "X", "B", "C", "D", "E", "F"];

/** Strip a trailing administrative suffix ("运城市" → "运城") */
export function stripAdminSuffix(name: string): string {
  let result = name.trim();
  for (const suffix of ADMIN_SUFFIXES) {
    if (result.length > suffix.length && result.endsWith(suffix)) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }
  return result;
}

/** True when the string contains at least one CJK ideograph */
function hasChinese(text: string): boolean {
  return /[一-鿿]/.test(text);
}

/**
 * Score how well a record matches the user's original Chinese keyword.
 * Higher is better. Zero means "not a real match".
 *
 * @param record        The upstream geocoding record
 * @param query         The user's original (Chinese) keyword
 * @param queryPinyin   The pinyin transliteration of the query, if any
 */
export function scoreMatch(
  record: GeoNameRecord,
  query: string,
  queryPinyin?: string,
): number {
  const normalizedQuery = stripAdminSuffix(query);
  const name = record.name ?? "";
  const admin2 = record.admin2 ?? "";
  const feature = record.feature_code ?? "";

  let score = 0;

  // ── Signal 1: the Chinese name is in `name` (case A) ────────────────
  if (hasChinese(name)) {
    if (name === normalizedQuery) return 200; // perfect, no further checks
    if (name.includes(normalizedQuery)) score += 80;
  }

  // ── Signal 2: the Chinese name is in `admin2` (case B) ──────────────
  if (admin2 && hasChinese(admin2)) {
    const admin2Stripped = stripAdminSuffix(admin2);
    if (admin2Stripped === normalizedQuery) {
      score += 120; // the parent city *is* what the user typed
    } else if (admin2Stripped.includes(normalizedQuery)) {
      score += 90;
    }
  }

  // ── Signal 3: the pinyin name matches the query's pinyin exactly ────
  //    This is the decisive signal for case C (河津 / "Hejin"), where the
  //    Chinese name is not present in the record at all.
  if (queryPinyin && !hasChinese(name)) {
    if (name.toLowerCase() === queryPinyin.toLowerCase()) {
      score += 150;
    } else if (name.toLowerCase().startsWith(queryPinyin.toLowerCase())) {
      score += 70;
    }
  }

  // ── Signal 4: tier — a real populated place beats an airport etc. ───
  if (feature.startsWith("PPLA")) score += 30;
  else if (feature.startsWith("PPLC")) score += 25;
  else if (feature.startsWith("PPL")) score += 10;
  else if (NON_PLACE_PREFIXES.some((p) => feature.startsWith(p))) {
    score -= 60; // airports (A), landmarks (L), terrain (T) …
  }

  // ── Signal 5: population — bigger places are more likely intended ───
  if (record.population) {
    if (record.population >= 500000) score += 20;
    else if (record.population >= 100000) score += 10;
    else if (record.population >= 10000) score += 4;
  }

  return Math.max(score, 0);
}

/**
 * Re-order geocoding results by relevance to the original keyword.
 *
 * Results that score zero are dropped — they are places that merely share
 * the pinyin and have no Chinese name in common with the query.
 */
export function rankByRelevance<T extends GeoNameRecord>(
  records: T[],
  query: string,
  queryPinyin?: string,
): T[] {
  return records
    .map((record) => ({ record, score: scoreMatch(record, query, queryPinyin) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.record);
}
