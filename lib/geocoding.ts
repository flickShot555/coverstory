// Reverse geocoding for Coverstory.
// Uses BigDataCloud's free reverse-geocode-client endpoint — no API key required.
// Docs: https://www.bigdatacloud.com/docs/api/reverse-geocode-to-city-api

export interface Place {
  city: string;
  country: string;
  countryCode: string;
}

interface BigDataCloudResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
  countryCode?: string;
}

const ENDPOINT = "https://api.bigdatacloud.net/data/reverse-geocode-client";

/**
 * Resolve a latitude/longitude into a human-readable city + country.
 * Falls back through city → locality → principalSubdivision so we always
 * return something usable when the precise city is unknown.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<Place> {
  const url = `${ENDPOINT}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Reverse geocoding failed (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as BigDataCloudResponse;

  const city =
    data.city || data.locality || data.principalSubdivision || "Unknown location";
  const country = data.countryName || "Unknown country";
  const countryCode = data.countryCode || "";

  return { city, country, countryCode };
}
