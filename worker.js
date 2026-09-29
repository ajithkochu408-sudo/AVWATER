// Cloudflare Worker for avwater.in
// - /api/reviews : live Google rating, review count and latest reviews (cached 6 hours)
// - everything else : the normal website files
//
// Set these in Cloudflare -> Workers & Pages -> avwater -> Settings -> Variables and Secrets:
//   GOOGLE_PLACES_API_KEY  (type: Secret)  - key with "Places API (New)" enabled
//   GOOGLE_PLACE_ID        (type: Secret)  - optional; defaults to the A&V listing below

const DEFAULT_PLACE_ID = "ChIJKXW0OYi_BTsR5bQyZlAFr78"; // A&V Marketing Agency (same listing as the site's map and review link)
const CACHE_SECONDS = 6 * 60 * 60;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/reviews") {
      return reviews(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};

async function reviews(request, env, ctx) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheKey = new Request(new URL("/api/reviews", request.url).toString());

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const key = env.GOOGLE_PLACES_API_KEY;
  if (!key) return json({ error: "GOOGLE_PLACES_API_KEY is not set" }, 500);
  const placeId = env.GOOGLE_PLACE_ID || DEFAULT_PLACE_ID;

  let res;
  try {
    res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`,
      {
        headers: {
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "displayName,rating,userRatingCount,googleMapsUri,reviews",
        },
      }
    );
  } catch (e) {
    return json({ error: "Could not reach Google" }, 502);
  }

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    return json({ error: `Google returned ${res.status}`, detail }, 502);
  }

  const p = await res.json();
  const data = {
    name: p.displayName?.text ?? null,
    rating: p.rating ?? null,
    count: p.userRatingCount ?? null,
    mapsUrl: p.googleMapsUri ?? null,
    reviews: (p.reviews || []).map((r) => ({
      author: r.authorAttribution?.displayName || "Google user",
      authorUrl: r.authorAttribution?.uri || null,
      rating: r.rating ?? null,
      text: r.text?.text || r.originalText?.text || "",
      when: r.relativePublishTimeDescription || "",
    })),
    updated: new Date().toISOString(),
  };

  const response = json(data, 200, { "Cache-Control": `public, max-age=${CACHE_SECONDS}` });
  if (cache) ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function json(body, status, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}
