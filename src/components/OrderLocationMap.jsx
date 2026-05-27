import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

/** Read-only mini map — same OSM tiles as customer checkout. */
export default function OrderLocationMap({ lat, lng, height = 150 }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);

  useEffect(() => {
    if (!mapRef.current || lat == null || lng == null) return;

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: true,
      dragging: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.marker([lat, lng]).addTo(map);
    mapInst.current = map;

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapInst.current = null;
    };
  }, [lat, lng]);

  return <div ref={mapRef} className="order-location-map" style={{ height }} aria-label="موقع العميل على الخريطة" />;
}
