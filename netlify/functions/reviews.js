// Netlify serverless function — proxies Google Places API (New v1)
// Keeps the API key off the browser entirely
// Normalizes response so the front-end JS needs no changes
// Cache: 1 hour fresh, 24 hour stale-while-revalidate

const PLACE_ID = 'ChIJu3iPLkznhVQRcRSyA-anoYY';

exports.handler = async () => {
  const key = process.env.GOOGLE_PLACES_KEY;

  if (!key) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing GOOGLE_PLACES_KEY env var' })
    };
  }

  // New Places API v1 — returns authorAttribution.photoUri for real profile photos
  const url = `https://places.googleapis.com/v1/places/${PLACE_ID}?key=${key}`;

  try {
    const res  = await fetch(url, {
      headers: { 'X-Goog-FieldMask': 'reviews,rating,userRatingCount' }
    });
    const data = await res.json();

    if (!data.reviews) {
      return { statusCode: 502, body: JSON.stringify({ error: 'No reviews in response', raw: data }) };
    }

    // Normalize to the shape the front-end JS already expects
    const reviews = data.reviews.map(r => ({
      author_name:                 r.authorAttribution?.displayName || '',
      // =s76-c → 76px square crop (crisp on 2× retina for 38px display size)
      profile_photo_url:           r.authorAttribution?.photoUri
                                     ? r.authorAttribution.photoUri + '=s76-c'
                                     : null,
      rating:                      r.rating ?? 5,
      relative_time_description:   r.relativePublishTimeDescription || '',
      text:                        r.text?.text || r.originalText?.text || ''
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      },
      body: JSON.stringify({ reviews, rating: data.rating, total: data.userRatingCount })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
