import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Map as MapIcon,
  Navigation,
  ExternalLink,
  MapPin,
  Layers,
  Fuel,
} from 'lucide-react';
import {
  Province,
  VehicleType,
  RouteCalculationResult,
  PlaceRecommendation,
  RealRouteData,
  GasStationStop,
} from '../types';
import { getGoogleMapsEmbedUrl, getGoogleMapsDirectionsUrl } from '../utils/routeCalculator';

interface MapPreviewProps {
  origin: Province;
  destination: Province;
  vehicle: VehicleType;
  calculationResult: RouteCalculationResult;
  realRouteData: RealRouteData | null;
  places: PlaceRecommendation[];
  savedPlaces: PlaceRecommendation[];
  focusedPlace: PlaceRecommendation | null;
  gasStations?: GasStationStop[];
  focusedGasStation?: GasStationStop | null;
  originGpsCoords: { lat: number; lng: number } | null;
  onToggleSavePlace: (place: PlaceRecommendation) => void;
  onToggleSaveGasStation?: (station: GasStationStop) => void;
}

export const MapPreview: React.FC<MapPreviewProps> = ({
  origin,
  destination,
  vehicle,
  calculationResult,
  realRouteData,
  places,
  savedPlaces,
  focusedPlace,
  gasStations = [],
  focusedGasStation = null,
  originGpsCoords,
  onToggleSavePlace,
  onToggleSaveGasStation,
}) => {
  const [mapMode, setMapMode] = useState<'interactive' | 'embed'>('interactive');
  const [showGasPins, setShowGasPins] = useState<boolean>(true);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const toggleSaveRef = useRef(onToggleSavePlace);
  toggleSaveRef.current = onToggleSavePlace;
  const toggleGasSaveRef = useRef(onToggleSaveGasStation);
  toggleGasSaveRef.current = onToggleSaveGasStation;

  const embedUrl = getGoogleMapsEmbedUrl(origin, destination);
  const directionsUrl = getGoogleMapsDirectionsUrl(
    origin,
    destination,
    vehicle,
    savedPlaces,
    originGpsCoords
  );

  // Initialize Leaflet map once when in interactive mode + observe container resize
  useEffect(() => {
    if (mapMode !== 'interactive' || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [(origin.lat + destination.lat) / 2, (origin.lng + destination.lng) / 2],
        zoom: 6,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const containerEl = mapContainerRef.current;
    const resizeObserver = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    resizeObserver.observe(containerEl);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, [mapMode]);

  // Render route polyline & markers whenever route or places update
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group || mapMode !== 'interactive') return;

    map.invalidateSize();
    group.clearLayers();

    const originLat = originGpsCoords ? originGpsCoords.lat : origin.lat;
    const originLng = originGpsCoords ? originGpsCoords.lng : origin.lng;
    const routeColor = vehicle === 'motorcycle' ? '#10b981' : '#f59e0b';

    // 1. Draw real highway polyline or straight fallback line
    const lineCoords: [number, number][] =
      realRouteData && realRouteData.geometry.length > 1
        ? realRouteData.geometry
        : [
            [originLat, originLng],
            ...savedPlaces.map((p) => [p.lat, p.lng] as [number, number]),
            [destination.lat, destination.lng],
          ];

    const glowLine = L.polyline(lineCoords, {
      color: routeColor,
      weight: 8,
      opacity: 0.22,
    });
    const mainLine = L.polyline(lineCoords, {
      color: routeColor,
      weight: 3.5,
      opacity: 0.95,
      dashArray: realRouteData ? undefined : '6, 8',
    });
    group.addLayer(glowLine);
    group.addLayer(mainLine);

    // 2. Origin Marker
    const originIcon = L.divIcon({
      className: '',
      html: `<div style="background:#f59e0b;color:#000;font-weight:700;font-size:11px;padding:3px 8px;border-radius:999px;border:2px solid #fff;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.5);">เริ่ม: ${origin.nameTh}</div>`,
      iconAnchor: [36, 14],
    });
    L.marker([originLat, originLng], { icon: originIcon })
      .bindPopup(`<b>จุดเริ่มต้น: ${origin.nameTh}</b>`)
      .addTo(group);

    // 3. Destination Marker
    const destIcon = L.divIcon({
      className: '',
      html: `<div style="background:#10b981;color:#000;font-weight:700;font-size:11px;padding:3px 8px;border-radius:999px;border:2px solid #fff;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.5);">ถึง: ${destination.nameTh}</div>`,
      iconAnchor: [36, 14],
    });
    L.marker([destination.lat, destination.lng], { icon: destIcon })
      .bindPopup(`<b>ปลายทาง: ${destination.nameTh}</b>`)
      .addTo(group);

    const savedIdMap = new Map<string, number>();
    savedPlaces.forEach((sp, i) => savedIdMap.set(sp.id, i + 1));

    // Combine AI places + custom saved places without duplicates
    const allPinPlaces = [...places];
    for (const sp of savedPlaces) {
      if (!allPinPlaces.some((p) => p.id === sp.id)) {
        allPinPlaces.push(sp);
      }
    }

    // 4. Plot Place Pins
    allPinPlaces.forEach((place, idx) => {
      const savedOrder = savedIdMap.get(place.id);
      const isSaved = savedOrder !== undefined;

      const pinIcon = L.divIcon({
        className: '',
        html: isSaved
          ? `<div style="width:26px;height:26px;background:#10b981;color:#000;font-weight:800;font-size:12px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(16,185,129,0.7);">${savedOrder}</div>`
          : `<div style="width:22px;height:22px;background:#1e2430;color:#fbbf24;font-weight:700;font-size:10px;border-radius:50%;border:1.5px solid #fbbf24;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.6);">${idx + 1}</div>`,
        iconSize: isSaved ? [26, 26] : [22, 22],
        iconAnchor: isSaved ? [13, 13] : [11, 11],
      });

      const popupContainer = document.createElement('div');
      popupContainer.style.minWidth = '185px';
      popupContainer.innerHTML = `
        <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:2px;">${place.nameTh}</div>
        <div style="font-size:11px;color:#fbbf24;margin-bottom:6px;">✨ ${place.highlightTag}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:6px;">
          <button id="popup-save-btn" style="flex:1;padding:6px 8px;border-radius:8px;border:none;font-size:11px;font-weight:700;cursor:pointer;background:${
            isSaved ? '#10b981' : '#f59e0b'
          };color:#000;">
            ${isSaved ? `✓ จุดแวะที่ ${savedOrder} (ลบ)` : '+ เพิ่มลงทริป'}
          </button>
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${place.nameTh} ${place.lat},${place.lng}`
          )}" target="_blank" rel="noopener noreferrer" style="padding:6px 8px;border-radius:8px;background:#232a38;color:#e2e8f0;font-size:11px;text-decoration:none;">Maps</a>
        </div>
      `;

      const saveBtn = popupContainer.querySelector('#popup-save-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          toggleSaveRef.current(place);
        });
      }

      const marker = L.marker([place.lat, place.lng], { icon: pinIcon }).bindPopup(popupContainer);
      marker.addTo(group);

      if (focusedPlace && focusedPlace.id === place.id) {
        setTimeout(() => {
          marker.openPopup();
        }, 250);
      }
    });

    // 5. Plot En-Route Gas Station Pins (when showGasPins is active)
    if (showGasPins && gasStations.length > 0) {
      gasStations.forEach((station) => {
        if (savedIdMap.has(station.id)) return;

        const gasIcon = L.divIcon({
          className: '',
          html: `<div style="width:24px;height:24px;background:#0284c7;color:#fff;font-size:12px;border-radius:7px;border:1.5px solid #e0f2fe;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(2,132,199,0.65);" title="${station.nameTh}">⛽</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const popupEl = document.createElement('div');
        popupEl.style.minWidth = '185px';
        popupEl.innerHTML = `
          <div style="font-size:11px;font-weight:700;color:#38bdf8;margin-bottom:2px;">⛽ ปั๊มริมทาง · กม.ที่ ~${station.distanceFromStartKm}</div>
          <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">${station.nameTh}</div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">${station.amenities.join(' · ') || station.areaHintTh || ''}</div>
          <div style="display:flex;gap:6px;align-items:center;">
            <button id="popup-gas-save-btn" style="flex:1;padding:6px 8px;border-radius:8px;border:none;font-size:11px;font-weight:700;cursor:pointer;background:#38bdf8;color:#000;">
              + แวะเติมปั๊มนี้
            </button>
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${station.nameTh} ${station.lat},${station.lng}`
            )}" target="_blank" rel="noopener noreferrer" style="padding:6px 8px;border-radius:8px;background:#232a38;color:#e2e8f0;font-size:11px;text-decoration:none;">Maps</a>
          </div>
        `;

        const gasBtn = popupEl.querySelector('#popup-gas-save-btn');
        if (gasBtn) {
          gasBtn.addEventListener('click', () => {
            toggleGasSaveRef.current?.(station);
          });
        }

        const gasMarker = L.marker([station.lat, station.lng], { icon: gasIcon }).bindPopup(popupEl);
        gasMarker.addTo(group);

        if (focusedGasStation && focusedGasStation.id === station.id) {
          setTimeout(() => {
            gasMarker.openPopup();
          }, 250);
        }
      });
    }

    if (!focusedPlace && !focusedGasStation) {
      const bounds = L.latLngBounds(lineCoords);
      allPinPlaces.forEach((p) => bounds.extend([p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });
    }
  }, [
    origin,
    destination,
    vehicle,
    realRouteData,
    places,
    savedPlaces,
    focusedPlace,
    gasStations,
    showGasPins,
    focusedGasStation,
    originGpsCoords,
    mapMode,
  ]);

  // Smoothly fly to a specific place when clicked from PlaceCard
  useEffect(() => {
    if (!focusedPlace) return;
    if (mapMode !== 'interactive') {
      setMapMode('interactive');
    }
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.flyTo([focusedPlace.lat, focusedPlace.lng], 12, {
          duration: 0.85,
        });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [focusedPlace]);

  // Smoothly fly to a specific gas station when clicked from GasStationFinder
  useEffect(() => {
    if (!focusedGasStation) return;
    if (mapMode !== 'interactive') {
      setMapMode('interactive');
    }
    setShowGasPins(true);
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.flyTo([focusedGasStation.lat, focusedGasStation.lng], 12, {
          duration: 0.85,
        });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [focusedGasStation]);

  return (
    <div
      id="roadtrip-map-section"
      className="bg-[#14171E] border border-[#262B36] rounded-2xl p-4 @3xl:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between h-full"
    >
      {/* Header */}
      <div className="space-y-3 mb-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <MapIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white tracking-tight truncate">
                แผนที่เส้นทางจริง & พิกัดจุดแวะ
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {origin.nameTh} ➔ {destination.nameTh}
                {savedPlaces.length > 0 ? ` (${savedPlaces.length} จุดแวะ)` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-300 font-mono tabular-nums shrink-0">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>~{calculationResult.estimatedRoadDistanceKm.toLocaleString()} กม.</span>
          </div>
        </div>

        {/* Mobile-friendly Controls Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex p-0.5 bg-[#0D0F13] border border-[#282F3D] rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setMapMode('interactive')}
              className={`min-h-[38px] px-3 rounded-lg font-medium transition-colors cursor-pointer ${
                mapMode === 'interactive'
                  ? 'bg-[#232A38] text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              หมุดจุดแวะ ({places.length})
            </button>
            <button
              type="button"
              onClick={() => setMapMode('embed')}
              className={`min-h-[38px] px-3 rounded-lg font-medium transition-colors cursor-pointer ${
                mapMode === 'embed'
                  ? 'bg-[#232A38] text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Google Maps
            </button>
          </div>

          {/* Open in Google Maps link with all waypoints */}
          <a
            id="open-google-maps-full-btn"
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer shrink-0"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>
              {savedPlaces.length > 0 ? `นำทาง (${savedPlaces.length})` : 'เปิดนำทาง'}
            </span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-72 @3xl:h-80 bg-[#0C0E12] rounded-xl overflow-hidden border border-[#272D3A]">
        {mapMode === 'interactive' ? (
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        ) : (
          <iframe
            id="google-maps-embed-frame"
            title={`เส้นทางจาก ${origin.nameTh} ไปยัง ${destination.nameTh}`}
            src={embedUrl}
            width="100%"
            height="100%"
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full border-0"
          />
        )}

        {/* Legend & Gas Pin Toggle Overlay */}
        {mapMode === 'interactive' && (
          <div className="absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between gap-1.5 pointer-events-none">
            <div className="bg-[#11141B]/90 backdrop-blur-md border border-[#29303E] rounded-lg px-2 py-1 text-[10px] text-slate-300 flex items-center gap-2.5 overflow-hidden">
              <span className="flex items-center gap-1 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-[#1e2430] border border-amber-400 inline-block" />
                ที่เที่ยว
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                ในทริป ({savedPlaces.length})
              </span>
              {showGasPins && gasStations.length > 0 && (
                <span className="flex items-center gap-1 text-sky-300 whitespace-nowrap">
                  <span className="w-2 h-2 rounded bg-sky-500 inline-block" />
                  ปั๊ม ({gasStations.length})
                </span>
              )}
            </div>

            {gasStations.length > 0 && (
              <button
                type="button"
                onClick={() => setShowGasPins((prev) => !prev)}
                className={`pointer-events-auto min-h-[32px] shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border backdrop-blur-md transition-colors cursor-pointer ${
                  showGasPins
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                    : 'bg-[#11141B]/90 border-[#29303E] text-slate-400 hover:text-white'
                }`}
              >
                <Fuel className="w-3 h-3" />
                <span>{showGasPins ? 'ซ่อนปั๊ม' : `ปั๊ม (${gasStations.length})`}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation Tip */}
      <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-slate-400">
        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span>แตะหมุดบนแผนที่เพื่อดูข้อมูลและกดเพิ่มเข้าแผนทริปได้ทันที</span>
      </div>
    </div>
  );
};
