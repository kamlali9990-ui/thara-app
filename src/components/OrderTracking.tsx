import React, { useEffect, useRef, useContext } from 'react';
import L from 'leaflet';
import { StoreContext } from '../context/StoreContext';
import { parseOrderLocation } from '../utils/location';

L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

const SHOP_POS = { lat: 28.451345, lng: 48.491709 };

const driverIcon = L.divIcon({
  className: 'driver-marker',
  html: '<div class="driver-marker-inner">🏍️</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const shopIcon = L.divIcon({
  className: 'shop-marker',
  html: '<div class="shop-marker-inner">🏪</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const deliveryIcon = L.divIcon({
  className: 'delivery-marker',
  html: '<div class="delivery-marker-inner">📍</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

export default function OrderTracking({ order }: { order: any }) {
  const { orders } = useContext(StoreContext);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const shopMarkerRef = useRef<any>(null);
  const deliveryMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);

  const coords = parseOrderLocation(order?.location);

  useEffect(() => {
    if (!mapRef.current || !coords) return;
    import('leaflet/dist/leaflet.css');

    const map = L.map(mapRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 13,
      zoomControl: true,
      dragging: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    shopMarkerRef.current = L.marker([SHOP_POS.lat, SHOP_POS.lng], { icon: shopIcon })
      .addTo(map)
      .bindPopup('🏪 ثرا الشرق ون');

    deliveryMarkerRef.current = L.marker([coords.lat, coords.lng], { icon: deliveryIcon })
      .addTo(map)
      .bindPopup('📍 موقع التوصيل');

    polylineRef.current = L.polyline(
      [[SHOP_POS.lat, SHOP_POS.lng], [coords.lat, coords.lng]],
      { color: '#127443', weight: 3, opacity: 0.6, dashArray: '10, 10' }
    ).addTo(map);

    const bounds = L.latLngBounds([SHOP_POS.lat, SHOP_POS.lng], [coords.lat, coords.lng]);
    map.fitBounds(bounds, { padding: [50, 50] });

    mapInst.current = map;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(mapRef.current);
    }

    return () => {
      if (ro) ro.disconnect();
      map.remove();
      mapInst.current = null;
      driverMarkerRef.current = null;
      shopMarkerRef.current = null;
      deliveryMarkerRef.current = null;
      polylineRef.current = null;
    };
  }, [order?.id]);

  useEffect(() => {
    if (!mapInst.current) return;
    const liveOrder = orders.find((o: any) => o.id === order?.id);
    const lat = liveOrder?.driverLat;
    const lng = liveOrder?.driverLng;
    if (lat == null || lng == null) {
      if (driverMarkerRef.current) {
        mapInst.current.removeLayer(driverMarkerRef.current);
        driverMarkerRef.current = null;
      }
      return;
    }
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([lat, lng]);
    } else {
      driverMarkerRef.current = L.marker([lat, lng], { icon: driverIcon })
        .addTo(mapInst.current)
        .bindPopup('🏍️ الكابتن');
    }
  }, [orders, order?.id]);

  if (!coords) return null;

  return (
    <div className="order-tracking-wrap">
      <div ref={mapRef} className="order-tracking-map" style={{ height: 250 }} />
    </div>
  );
}
