const PLACE_ID = 'ChIJu3iPLkznhVQRcRSyA-anoYY';

exports.handler = async () => {
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) return { statusCode: 500, body: JSON.stringify({ error: 'Missing GOOGLE_PLACES_KEY' }) };
  try {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=photos&key=${key}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();
    if (detailsData.status !== 'OK' || !detailsData.result?.photos) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=3600' }, body: JSON.stringify({ photos: [], total: 0 }) };
    }
    const photoRefs = detailsData.result.photos.slice(0, 20);
    const photoUrls = await Promise.all(photoRefs.map(async (photo) => {
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${key}`;
      try {
        const res = await fetch(photoUrl, { redirect: 'manual' });
        const redirectUrl = res.headers.get('location');
        return { url: redirectUrl || photoUrl, width: photo.width, height: photo.height };
      } catch { return null; }
    }));
    const validPhotos = photoUrls.filter(Boolean);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }, body: JSON.stringify({ photos: validPhotos, total: validPhotos.length }) };
  } catch (err) { return { statusCode: 500, body: JSON.stringify({ error: err.message }) }; }
};
