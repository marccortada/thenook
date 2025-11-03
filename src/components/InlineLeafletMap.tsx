import React from 'react';

type Props = {
  lat: number;
  lng: number;
  height?: number | string;
  onMarkerMoved?: (lat: number, lng: number) => void;
  zoom?: number;
};

// Small wrapper that loads Leaflet via CDN and shows a draggable marker
export default function InlineLeafletMap({ lat, lng, height = 220, onMarkerMoved, zoom = 17 }: Props) {
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const leafletRef = React.useRef<any>(null);
  const markerRef = React.useRef<any>(null);

  // load Leaflet assets once
  React.useEffect(() => {
    const ensureLeaflet = async () => {
      if ((window as any).L) return;
      // CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      // JS
      await new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    };
    ensureLeaflet();
  }, []);

  // init map
  React.useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;
    if (!leafletRef.current) {
      leafletRef.current = L.map(mapRef.current).setView([lat, lng], zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(leafletRef.current);
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(leafletRef.current);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng();
        onMarkerMoved?.(pos.lat, pos.lng);
      });
    } else {
      leafletRef.current.setView([lat, lng], leafletRef.current.getZoom());
      markerRef.current?.setLatLng([lat, lng]);
    }
  }, [lat, lng, zoom]);

  return (
    <div
      ref={mapRef}
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%', borderRadius: 8, overflow: 'hidden' }}
    />
  );
}

