import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type PollenType = 'GRASS_UPI' | 'TREE_UPI' | 'WEED_UPI';

const POLLEN_TYPES: { type: PollenType; label: string; emoji: string }[] = [
  { type: 'GRASS_UPI', label: 'Grass', emoji: '🌿' },
  { type: 'TREE_UPI',  label: 'Tree',  emoji: '🌳' },
  { type: 'WEED_UPI',  label: 'Weed',  emoji: '🌾' },
];

interface Props {
  lat: number;
  lng: number;
  onClose: () => void;
}

export function PollenHeatmap({ lat, lng, onClose }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.TileLayer | null>(null);
  const [activeType, setActiveType] = useState<PollenType>('GRASS_UPI');

  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string;

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 10);
    mapInstance.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 14,
    }).addTo(map);

    L.circleMarker([lat, lng], {
      radius: 8,
      color: '#4A9FD4',
      fillColor: '#4A9FD4',
      fillOpacity: 0.9,
      weight: 2,
    }).addTo(map).bindPopup('Your location');

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap pollen overlay when type changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (overlayRef.current) {
      map.removeLayer(overlayRef.current);
    }

    if (apiKey) {
      const overlay = L.tileLayer(
        `https://pollen.googleapis.com/v1/mapTypes/${activeType}/heatmapTiles/{z}/{x}/{y}?key=${apiKey}`,
        { opacity: 0.6, maxZoom: 14 }
      );
      overlay.addTo(map);
      overlayRef.current = overlay;
    }
  }, [activeType, apiKey]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 safe-area-inset-top">
        <div className="flex gap-2">
          {POLLEN_TYPES.map(({ type, label, emoji }) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeType === type
                  ? 'bg-sky-pilot text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-2xl leading-none ml-3"
        >
          ×
        </button>
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1" />

      {/* Legend */}
      <div className="bg-white px-4 py-2 flex items-center gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {['#00c853', '#ffeb3b', '#ff9800', '#f44336'].map(c => (
              <div key={c} className="w-4 h-3 rounded-sm" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span>Low → High pollen</span>
        </div>
        <span className="text-gray-300">|</span>
        <span>© Google Pollen API</span>
      </div>
    </div>
  );
}
