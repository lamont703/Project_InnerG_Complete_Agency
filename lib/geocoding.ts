// geocode() below always appends ", Houston, TX" — correct for its
// existing callers (event submission, apprentice-jobs neighborhood
// search, etc.), which all take a partial, Houston-scoped input on
// purpose. It is NOT safe to reuse for a real, complete street address
// that could be anywhere — e.g. a claimed shop/salon's manage-listing
// address, which the 20260721000000 migration made fully user-editable
// and not guaranteed to even be in Texas (confirmed live: a claimed
// shop's own address was changed to Atlanta). This sibling function
// geocodes the address exactly as given, no city appended.
export async function geocodeFullAddress(fullAddress: string): Promise<{ lat: number; lng: number } | null> {
  const mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
  if (mapboxKey) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${mapboxKey}&limit=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].geometry.coordinates;
          return { lat, lng };
        }
      }
    } catch (err) {
      console.error("[geocodeFullAddress] Mapbox geocoding failed:", err);
    }
  }

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${googleKey}`
      );
      const data = await res.json();
      if (data.status === "OK" && data.results?.length > 0) {
        return { lat: data.results[0].geometry.location.lat, lng: data.results[0].geometry.location.lng };
      }
    } catch (err) {
      console.error("[geocodeFullAddress] Google geocoding fallback failed:", err);
    }
  }

  return null;
}

export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
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
