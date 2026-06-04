// Netlify serverless function — Google Business Profile API + Places API photo merge
// Business Profile API → ALL reviews (full text, all reviewers)
// Places API v1     → photo URLs for up to 5 most recent reviewers
// Merged result     → all reviews with real photos where available
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
  const accountsRes  = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const accountsData = await accountsRes.json();
  if (!accountsData.accounts?.length) throw new Error('No accounts: ' + JSON.stringify(accountsData));

  const accountName  = accountsData.accounts[0].name;
  const locationsRes = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const locationsData = await locationsRes.json();
  if (!locationsData.locations?.length) throw new Error('No locations: ' + JSON.stringify(locationsData));

  return { locationName: locationsData.locations[0].name };
}

async function getBusinessReviews(accessToken, locationName) {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return await res.json();
}

// Fetch photo URLs from Places API v1 — returns up to 5 most-recent reviewer photos
async function getPlacesPhotos(key) {
  try {
    const res  = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}?key=${key}`, {
      headers: { 'X-Goog-FieldMask': 'reviews' }
    });
    const data = await res.json();
    // Build a name → photoUrl map
    const map = {};
    (data.reviews || []).forEach(r => {
      const name  = r.authorAttribution?.displayName;
      const photo = r.authorAttribution?.photoUri;
      if (name && photo) map[name] = photo + '=s76-c';
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
    // Run Business Profile API + Places photo fetch in parallel
    const accessToken           = await getAccessToken();
    const { locationName }      = await getAccountAndLocation(accessToken);
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
        const name = r.reviewer?.displayName || 'Google User';
        // Use Places photo if available for this reviewer, otherwise Business Profile photo
        const photo = photos[name] || r.reviewer?.profilePhotoUrl || null;
        return {
          author_name:               name,
          profile_photo_url:         photo,
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
        rating: reviewsData.averageRating   || 5.0,
        total:  reviewsData.totalReviewCount || reviews.length
      })
    };

  } catch (err) {
    console.error('Business Profile API error:', err.message);
    if (key) return await fallbackToPlacesAPI(key);
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
