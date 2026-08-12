/**
 * Fallback coords by lowercase name when City/Country lat/lng not set in DB.
 * Used only for public adventure map pins (Phase 1).
 */
const FALLBACK_COORDS: Record<string, { lat: number; lng: number }> = {
  // Countries
  indonesia: { lat: -2.5, lng: 118.0 },
  malaysia: { lat: 4.2, lng: 101.98 },
  singapore: { lat: 1.35, lng: 103.82 },
  thailand: { lat: 15.87, lng: 100.99 },
  vietnam: { lat: 14.06, lng: 108.28 },
  "united kingdom": { lat: 54.7, lng: -2.9 },
  england: { lat: 52.35, lng: -1.17 },
  japan: { lat: 36.2, lng: 138.25 },
  "south korea": { lat: 35.91, lng: 127.77 },
  korea: { lat: 35.91, lng: 127.77 },
  china: { lat: 35.86, lng: 104.2 },
  india: { lat: 20.59, lng: 78.96 },
  australia: { lat: -25.27, lng: 133.78 },
  "new zealand": { lat: -40.9, lng: 174.89 },
  "united states": { lat: 37.09, lng: -95.71 },
  usa: { lat: 37.09, lng: -95.71 },
  france: { lat: 46.23, lng: 2.21 },
  italy: { lat: 41.87, lng: 12.57 },
  spain: { lat: 40.46, lng: -3.75 },
  germany: { lat: 51.17, lng: 10.45 },
  netherlands: { lat: 52.13, lng: 5.29 },
  philippines: { lat: 12.88, lng: 121.77 },
  cambodia: { lat: 12.57, lng: 104.99 },
  laos: { lat: 19.86, lng: 102.5 },
  myanmar: { lat: 21.91, lng: 95.96 },
  "sri lanka": { lat: 7.87, lng: 80.77 },
  nepal: { lat: 28.39, lng: 84.12 },
  "united arab emirates": { lat: 23.42, lng: 53.85 },
  uae: { lat: 23.42, lng: 53.85 },
  turkey: { lat: 38.96, lng: 35.24 },
  greece: { lat: 39.07, lng: 21.82 },
  portugal: { lat: 39.4, lng: -8.22 },
  switzerland: { lat: 46.82, lng: 8.23 },
  austria: { lat: 47.52, lng: 14.55 },
  canada: { lat: 56.13, lng: -106.35 },
  mexico: { lat: 23.63, lng: -102.55 },
  brazil: { lat: -14.24, lng: -51.93 },
  egypt: { lat: 26.82, lng: 30.8 },
  morocco: { lat: 31.79, lng: -7.09 },
  "south africa": { lat: -30.56, lng: 22.94 },
  armenia: { lat: 40.07, lng: 45.04 },
  georgia: { lat: 42.32, lng: 43.36 },
  azerbaijan: { lat: 40.14, lng: 47.58 },

  // Cities (common travel hubs)
  jakarta: { lat: -6.2088, lng: 106.8456 },
  bali: { lat: -8.4095, lng: 115.1889 },
  denpasar: { lat: -8.6705, lng: 115.2126 },
  bandung: { lat: -6.9175, lng: 107.6191 },
  surabaya: { lat: -7.2575, lng: 112.7521 },
  yogyakarta: { lat: -7.7956, lng: 110.3695 },
  "kuala lumpur": { lat: 3.139, lng: 101.6869 },
  penang: { lat: 5.4141, lng: 100.3288 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  "chiang mai": { lat: 18.7883, lng: 98.9853 },
  "ho chi minh": { lat: 10.8231, lng: 106.6297 },
  "ho chi minh city": { lat: 10.8231, lng: 106.6297 },
  hanoi: { lat: 21.0278, lng: 105.8342 },
  "da nang": { lat: 16.0544, lng: 108.2022 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  osaka: { lat: 34.6937, lng: 135.5023 },
  kyoto: { lat: 35.0116, lng: 135.7681 },
  seoul: { lat: 37.5665, lng: 126.978 },
  busan: { lat: 35.1796, lng: 129.0756 },
  london: { lat: 51.5074, lng: -0.1278 },
  edinburgh: { lat: 55.9533, lng: -3.1883 },
  manchester: { lat: 53.4808, lng: -2.2426 },
  paris: { lat: 48.8566, lng: 2.3522 },
  rome: { lat: 41.9028, lng: 12.4964 },
  barcelona: { lat: 41.3874, lng: 2.1686 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  melbourne: { lat: -37.8136, lng: 144.9631 },
  "new york": { lat: 40.7128, lng: -74.006 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  manila: { lat: 14.5995, lng: 120.9842 },
  "phnom penh": { lat: 11.5564, lng: 104.9282 },
  siem: { lat: 13.3633, lng: 103.8564 },
  "siem reap": { lat: 13.3633, lng: 103.8564 },
};

export function resolveFallbackCoords(
  ...names: Array<string | null | undefined>
): { lat: number; lng: number } | null {
  for (const name of names) {
    const key = name?.trim().toLowerCase();
    if (!key) continue;
    const hit = FALLBACK_COORDS[key];
    if (hit) return hit;
  }
  return null;
}
