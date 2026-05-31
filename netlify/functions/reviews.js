// Netlify serverless function — proxies Google Places API
// Keeps the API key off the browser entirely
// Caches responses for 1 hour to stay well within free-tier limits

const PLACE_ID = 'ChIJu3iPLkznhVQRcRSyA-anoYY';
const FIELDS   = 'reviews,rating,user_ratings_total';

exports.handler = async () => {
  const key = process.env.GOOGLE_PLACES_KEY;

  if (!key) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing GOOGLE_PLACES_KEY env var' })
    };
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json` +
              `?place_id=${PLACE_ID}&fields=${FIELDS}&key=${key}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK') {
      return { statusCode: 502, body: JSON.stringify({ error: data.status }) };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      },
      body: JSON.stringify(data.result)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
