/** Parse delivery location saved from customer checkout (Leaflet/OSM picker). */
export function parseOrderLocation(loc) {
  if (!loc) return null;
  const m = String(loc).match(/Lat:\s*([\d.]+).*Lng:\s*([\d.]+)/i);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export function getMapLinks(coords) {
  const { lat, lng } = coords;
  return {
    googleDir: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    osmView: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`,
    osmDir: `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`,
  };
}
