// Netlify serverless function — Google Business Profile API
// Uses OAuth2 refresh token to fetch ALL reviews with real photos
// API keys/secrets live only in Netlify env vars, never in code
// Cache: 1 hour fresh, 24 hour stale-while-revalidate

const PLACE_ID = 'ChIJu3iPLkznhVQRcRSyA-anoYY';

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type:    'refresh_token'
    })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get access token: ' + JSON.stringify(data));
  return data.access_token;
}

async function getAccountAndLocation(accessToken) {
  // List accounts
  const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const accountsData = await accountsRes.json();
  if (!accountsData.accounts?.length) throw new Error('No accounts found: ' + JSON.stringify(accountsData));

  const accountName = accountsData.accounts[0].name; // e.g. "accounts/123456"

  // List locations for this account
  const locationsRes = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const locationsData = await locationsRes.json();
  if (!locationsData.locations?.length) throw new Error('No locations found: ' + JSON.stringify(locationsData));

  // Pick the first location (Tsawwassen)
  const location = locationsData.locations[0];
  return { accountName, locationName: location.name };
}

async function getReviews(accessToken, locationName) {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return await res.json();
}

exports.handler = async () => {
  const key = process.env.GOOGLE_PLACES_KEY;

  // Check all required env vars
  const missing = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN']
    .filter(v => !process.env[v]);
  if (missing.length) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing env vars: ' + missing.join(', ') }) };
  }

  try {
    // Step 1: Get fresh access token via refresh token
    const accessToken = await getAccessToken();

    // Step 2: Find the account + location
    const { locationName } = await getAccountAndLocation(accessToken);

    // Step 3: Fetch all reviews
    const reviewsData = await getReviews(accessToken, locationName);

    if (!reviewsData.reviews?.length) {
      return await fallbackToPlacesAPI(key);
    }

    // Normalize reviews to the shape the front-end expects
    const reviews = reviewsData.reviews
      .filter(r => r.comment)
      .map(r => ({
        author_name:               r.reviewer?.displayName || 'Google User',
        profile_photo_url:         r.reviewer?.profilePhotoUrl || null,
        rating:                    { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[r.starRating] || 5,
        relative_time_description: r.relativeTimeDescription || '',
        text:                      r.comment || ''
      }));

    const totalReviews = reviewsData.totalReviewCount || reviews.length;
    const avgRating    = reviewsData.averageRating || 5.0;

    return {
      statusCode: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      },
      body: JSON.stringify({ reviews, rating: avgRating, total: totalReviews })
    };

  } catch (err) {
    // Fallback to Places API v1 if Business Profile API fails
    console.error('Business Profile API error:', err.message);
    if (key) return await fallbackToPlacesAPI(key);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

async function fallbackToPlacesAPI(key) {
  try {
    const url = `https://places.googleapis.com/v1/places/${PLACE_ID}?key=${key}`;
    const res  = await fetch(url, {
      headers: { 'X-Goog-FieldMask': 'reviews,rating,userRatingCount' }
    });
    const data = await res.json();
    if (!data.reviews) return { statusCode: 502, body: JSON.stringify({ error: 'No reviews', raw: data }) };

    const reviews = data.reviews.map(r => ({
      author_name:               r.authorAttribution?.displayName || '',
      profile_photo_url:         r.authorAttribution?.photoUri
                                   ? r.authorAttribution.photoUri + '=s76-c'
                                   : null,
      rating:                    r.rating ?? 5,
      relative_time_description: r.relativePublishTimeDescription || '',
      text:                      r.text?.text || r.originalText?.text || ''
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
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
