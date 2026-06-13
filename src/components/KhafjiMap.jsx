import { memo, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';

L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

const KhafjiMap = memo(({ position, setPosition }) => {
  const mapRef = useRef(null);
  const inst = useRef(null);
  const marker = useRef(null);
  const locating = useRef(false);
  const detectedRef = useRef(false);
  const fallbackPos = { lat: 28.4355, lng: 48.4988 };

  useEffect(() => {
    if (inst.current) return;
    import('leaflet/dist/leaflet.css');
    const map = L.map(mapRef.current, { center: [20, 0], zoom: 2 });
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>' }).addTo(map);
    inst.current = map;
    return () => { map.remove(); inst.current = null; marker.current = null; };
  }, []);
  const syncMarker = useCallback((pos) => {
    if (!inst.current) return;
    inst.current.setView([pos.lat, pos.lng], 15);
    if (marker.current) marker.current.setLatLng([pos.lat, pos.lng]);
    else marker.current = L.marker([pos.lat, pos.lng]).addTo(inst.current);
  }, []);

  useEffect(() => {
    if (!position) return;
    syncMarker(position);
  }, [position, syncMarker]);
  const doLocate = useCallback(() => {
    if (!navigator.geolocation) {
      syncMarker(fallbackPos);
      setPosition(fallbackPos);
      return;
    }
    if (locating.current) return;
    locating.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locating.current = false;
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        syncMarker(p);
        setPosition(p);
      },
      () => {
        locating.current = false;
        syncMarker(fallbackPos);
        setPosition(fallbackPos);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);
  useEffect(() => {
    if (!inst.current || detectedRef.current) return;
    detectedRef.current = true;
    const t = setTimeout(doLocate, 500);
    return () => clearTimeout(t);
  }, [inst.current]);
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => inst.current?.invalidateSize());
    if (mapRef.current) ro.observe(mapRef.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="khafji-map-wrap">
      <div ref={mapRef} className="khafji-map" />
      <button className="locate-btn" onClick={doLocate} title="تحديد موقعي">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
      </button>
    </div>
  );
});

export default KhafjiMap;
