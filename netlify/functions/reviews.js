// Netlify serverless function — Google Business Profile API + Places API photo merge
// Business Profile API → ALL reviews (full text, all reviewers)
// Places API v1       → real profile photo URLs for recent reviewers
// Cache: 1 hour fresh, 24 hour stale-while-revalidate

const PLACE_ID = 'ChIJu3iPLkznhVQRcRSyA-anoYY';

// Clean photo URL — strip any existing size suffix, apply =s76-c
function cleanPhotoUrl(url) {
  if (!url) return null;
  // Remove anything after the last = that looks like a size/crop param chain
  return url.replace(/=[^/]*$/, '') + '=s76-c';
}

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
  if (!data.access_token) throw new Error('Token error: ' + JSON.stringify(data));
  return data.access_token;
}

async function getAccountAndLocation(accessToken) {
  const accountsRes  = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const accountsData = await accountsRes.json();
  if (!accountsData.accounts?.length) throw new Error('No accounts — API may not be enabled. Response: ' + JSON.stringify(accountsData));

  const accountName  = accountsData.accounts[0].name;
  const locationsRes = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
    { headers: { Authorization: `Bearer ${accountsData}` } }
  );
  const locationsData = await locationsRes.json();
  if (!locationsData.locations?.length) throw new Error('No locations — API may not be enabled. Response: ' + JSON.stringify(locationsData));

  return { locationName: locationsData.locations[0].name };
}

async function getBusinessReviews(accessToken, locationName) {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  if (data.error) throw new Error('Reviews API error: ' + JSON.stringify(data.error));
  return data;
}

// Fetch photo URLs from Places API v1 (up to 5 most-recent reviewers)
async function getPlacesPhotos(key) {
  try {
    const res  = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}?key=${key}`, {
      headers: { 'X-Goog-FieldMask': 'reviews' }
    });
    const data = await res.json();
    const map  = {};
    (data.reviews || []).forEach(r => {
      const name  = r.authorAttribution?.displayName;
      const photo = r.authorAttribution?.photoUri;
      if (name && photo) map[name] = cleanPhotoUrl(photo);
    });
    return map;
  } catch (_) {
    return {};
  }
}

exports.handler = async () => {
  const key     = process.env.GOOGLE_PLACES_KEY;
  const missing = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN']
    .filter(v => !process.env[v]);
  if (missing.length) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing env vars: ' + missing.join(', ') }) };
  }

  try {
    const accessToken      = await getAccessToken();
    const { locationName } = await getAccountAndLocation(accessToken);

    const [reviewsData, photos] = await Promise.all([
      getBusinessReviews(accessToken, locationName),
      key ? getPlacesPhotos(key) : Promise.resolve({})
    ]);

    if (!reviewsData.reviews?.length) {
      return await fallbackToPlacesAPI(key);
    }

    const starMap = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

    const reviews = reviewsData.reviews
      .filter(r => r.comment)
      .map(r => {
        const name      = r.reviewer?.displayName || 'Google User';
        const rawPhoto  = photos[name] || r.reviewer?.profilePhotoUrl || null;
        return {
          author_name:               name,
          profile_photo_url:         cleanPhotoUrl(rawPhoto),
          rating:                    starMap[r.starRating] || 5,
          relative_time_description: r.relativeTimeDescription || '',
          text:                      r.comment || ''
        };
      });

    return {
      statusCode: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      },
      body: JSON.stringify({
        reviews,
        rating: reviewsData.averageRating    || 5.0,
        total:  reviewsData.totalReviewCount || reviews.length
      })
    };

  } catch (err) {
    console.error('Business Profile API error:', err.message);
    // Return error details + fallback so we can diagnose
    const fallback = key ? await fallbackToPlacesAPI(key) : null;
    if (fallback) {
      // Inject debug info into response header for diagnosis
      const parsed = JSON.parse(fallback.body);
      parsed._debug = err.message;
      return { ...fallback, body: JSON.stringify(parsed) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

async function fallbackToPlacesAPI(key) {
  try {
    const res  = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}?key=${key}`, {
      headers: { 'X-Goog-FieldMask': 'reviews,rating,userRatingCount' }
    });
    const data = await res.json();
    if (!data.reviews) return { statusCode: 502, body: JSON.stringify({ error: 'No reviews', raw: data }) };

    const reviews = data.reviews.map(r => ({
      author_name:               r.authorAttribution?.displayName || '',
      profile_photo_url:         cleanPhotoUrl(r.authorAttribution?.photoUri),
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
