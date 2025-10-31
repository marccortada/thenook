import { useMemo } from "react";

type InlineLeafletMapProps = {
  latitude: number;
  longitude: number;
  zoom?: number;
  height?: number;
  className?: string;
  markerLabel?: string;
};

/**
 * Lightweight map placeholder that avoids bringing Leaflet into the client bundle.
 * It renders an embeddable OpenStreetMap iframe so users still get immediate context.
 */
const InlineLeafletMap = ({
  latitude,
  longitude,
  zoom = 16,
  height = 220,
  className,
  markerLabel,
}: InlineLeafletMapProps) => {
  const mapSrc = useMemo(() => {
    const base = "https://www.openstreetmap.org/export/embed.html";
    const bboxOffset = 0.003;
    const params = new URLSearchParams({
      layer: "mapnik",
      marker: `${latitude},${longitude}`,
      bbox: [
        longitude - bboxOffset,
        latitude - bboxOffset,
        longitude + bboxOffset,
        latitude + bboxOffset,
      ].join(","),
    });
    return `${base}?${params.toString()}`;
  }, [latitude, longitude]);

  return (
    <div className={className}>
      <iframe
        title={markerLabel ? `Mapa - ${markerLabel}` : "Mapa"}
        src={mapSrc}
        className="w-full rounded-xl border border-border/60 shadow-sm"
        style={{ minHeight: height }}
        loading="lazy"
      />
      <div className="mt-2 text-xs text-muted-foreground">
        Coordenadas: {latitude.toFixed(5)}, {longitude.toFixed(5)}
        {markerLabel ? ` · ${markerLabel}` : ""}
      </div>
    </div>
  );
};

export default InlineLeafletMap;
