export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const mapboxKey = process.env.MAPBOX_API_KEY;
  if (mapboxKey) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        address + ", Houston, TX"
      )}.json?access_token=${mapboxKey}&limit=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].geometry.coordinates;
          return { lat, lng };
        }
      }
    } catch (err) {
      console.error("Mapbox geocoding failed:", err);
    }
  }

  // Fallback to Google geocoding if Mapbox key is missing or fails
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address + ", Houston, TX"
        )}&key=${googleKey}`
      );
      const data = await res.json();
      if (data.status === "OK" && data.results?.length > 0) {
        return { lat: data.results[0].geometry.location.lat, lng: data.results[0].geometry.location.lng };
      }
    } catch (err) {
      console.error("Google geocoding fallback failed:", err);
    }
  }

  return null;
}
