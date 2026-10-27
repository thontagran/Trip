import React, { useState, useMemo, useEffect } from 'react';
import {
  Fuel,
  MapPin,
  Plus,
  Check,
  Navigation,
  ExternalLink,
  RefreshCw,
  Gauge,
  AlertTriangle,
  PlusCircle,
} from 'lucide-react';
import { GasStationStop, Province, VehicleType } from '../types';

interface GasStationFinderProps {
  origin: Province;
  destination: Province;
  vehicle: VehicleType;
  oneWayDistanceKm: number;
  stations: GasStationStop[];
  loading: boolean;
  savedPlaceIds: Set<string>;
  onToggleSaveStation: (station: GasStationStop) => void;
  onAddRecommendedStations: (stationsToAdd: GasStationStop[]) => void;
  onFocusStationOnMap: (station: GasStationStop) => void;
  onRefresh: () => void;
}

const TANK_RANGE_PRESETS: Record<VehicleType, Array<{ label: string; rangeKm: number }>> = {
  motorcycle: [
    { label: 'ถังเล็ก (110 กม.)', rangeKm: 110 },
    { label: '150-300cc (180 กม.)', rangeKm: 180 },
    { label: 'บิ๊กไบค์ (240 กม.)', rangeKm: 240 },
  ],
  car: [
    { label: 'อีโคคาร์ (360 กม.)', rangeKm: 360 },
    { label: 'เก๋ง/SUV (450 กม.)', rangeKm: 450 },
    { label: 'กระบะ (580 กม.)', rangeKm: 580 },
  ],
};

const BRAND_ACCENT_STYLES: Record<
  GasStationStop['brand'],
  { dotColor: string; textColor: string; shortName: string }
> = {
  ptt: { dotColor: 'bg-sky-400', textColor: 'text-sky-300', shortName: 'ปตท. PTT' },
  bangchak: { dotColor: 'bg-emerald-400', textColor: 'text-emerald-300', shortName: 'บางจาก' },
  pt: { dotColor: 'bg-green-400', textColor: 'text-green-300', shortName: 'พีที PT' },
  shell: { dotColor: 'bg-amber-400', textColor: 'text-amber-300', shortName: 'เชลล์ Shell' },
  caltex: { dotColor: 'bg-rose-400', textColor: 'text-rose-300', shortName: 'คาลเท็กซ์' },
  other: { dotColor: 'bg-slate-400', textColor: 'text-slate-300', shortName: 'ปั๊มทั่วไป' },
};

export const GasStationFinder: React.FC<GasStationFinderProps> = ({
  origin,
  destination,
  vehicle,
  oneWayDistanceKm,
  stations,
  loading,
  savedPlaceIds,
  onToggleSaveStation,
  onAddRecommendedStations,
  onFocusStationOnMap,
  onRefresh,
}) => {
  const [safeTankRangeKm, setSafeTankRangeKm] = useState<number>(
    vehicle === 'motorcycle' ? 180 : 450
  );
  const [brandFilter, setBrandFilter] = useState<'all' | 'ptt' | 'bangchak' | 'pt' | 'intl'>('all');

  useEffect(() => {
    setSafeTankRangeKm(vehicle === 'motorcycle' ? 180 : 450);
  }, [vehicle]);

  const recommendedStopMap = useMemo(() => {
    const map = new Map<string, number>();
    if (stations.length === 0 || oneWayDistanceKm <= safeTankRangeKm) {
      return map;
    }

    const sorted = [...stations].sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);
    let lastRefuelKm = 0;
    let stopCounter = 1;

    while (lastRefuelKm + safeTankRangeKm < oneWayDistanceKm) {
      const maxReachKm = lastRefuelKm + safeTankRangeKm;
      const reachable = sorted.filter(
        (s) => s.distanceFromStartKm > lastRefuelKm + 20 && s.distanceFromStartKm <= maxReachKm
      );

      let chosen: GasStationStop | undefined = reachable[reachable.length - 1];
      if (!chosen) {
        chosen = sorted.find((s) => s.distanceFromStartKm > lastRefuelKm + 15);
      }

      if (!chosen || map.has(chosen.id)) break;
      map.set(chosen.id, stopCounter++);
      lastRefuelKm = chosen.distanceFromStartKm;
    }

    return map;
  }, [stations, oneWayDistanceKm, safeTankRangeKm]);

  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      if (brandFilter === 'all') return true;
      if (brandFilter === 'intl') return s.brand === 'shell' || s.brand === 'caltex';
      return s.brand === brandFilter;
    });
  }, [stations, brandFilter]);

  const recommendedStationsList = useMemo(
    () => stations.filter((s) => recommendedStopMap.has(s.id)),
    [stations, recommendedStopMap]
  );

  const unsavedRecommended = useMemo(
    () => recommendedStationsList.filter((s) => !savedPlaceIds.has(s.id)),
    [recommendedStationsList, savedPlaceIds]
  );

  const nearbyGasGoogleUrl =
    'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('ปั๊มน้ำมันใกล้ฉัน');

  return (
    <section className="bg-[#14171E] border border-[#262B36] rounded-2xl p-4 @3xl:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="space-y-3 pb-3.5 border-b border-[#222733]">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
            <Fuel className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white tracking-tight">
              ปั๊มน้ำมันริมทาง & จุดแวะเติมตามระยะถัง
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              เส้นทาง {origin.nameTh} ➔ {destination.nameTh} (~
              <span className="font-mono tabular-nums">{oneWayDistanceKm.toLocaleString()}</span> กม. ขาเดียว)
            </p>
          </div>
        </div>

        {/* 2-Column Mobile Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href={nearbyGasGoogleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[42px] px-3 rounded-xl bg-[#0E1117] hover:bg-[#19202C] border border-[#2B3344] text-xs font-semibold text-sky-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">ปั๊มใกล้ฉัน (GPS)</span>
            <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
          </a>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="min-h-[42px] px-3 rounded-xl bg-[#1A1F2B] hover:bg-[#232A3A] border border-[#2D3546] text-xs font-semibold text-slate-200 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 shrink-0 ${loading ? 'animate-spin' : ''}`} />
            <span className="truncate">{loading ? 'กำลังสแกน...' : 'สแกนปั๊มใหม่'}</span>
          </button>
        </div>
      </div>

      {/* Tank Range Advisor */}
      <div className="bg-[#0E1117] border border-[#232936] rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>ระยะปลอดภัยต่อถัง:</span>
          </span>
          <strong className="text-amber-400 font-mono tabular-nums text-sm">
            {safeTankRangeKm} กม.
          </strong>
        </div>

        <input
          type="range"
          min="80"
          max="650"
          step="10"
          value={safeTankRangeKm}
          onChange={(e) => setSafeTankRangeKm(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-[#232A38] rounded-lg appearance-none cursor-pointer accent-sky-400"
        />

        <div className="grid grid-cols-3 gap-1.5">
          {TANK_RANGE_PRESETS[vehicle].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setSafeTankRangeKm(preset.rangeKm)}
              className={`min-h-[34px] px-2 py-1 rounded-lg text-[11px] transition-colors cursor-pointer border truncate ${
                safeTankRangeKm === preset.rangeKm
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 font-semibold'
                  : 'bg-[#151923] border-[#262E3D] text-slate-400 hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-[#1D2330] text-xs">
          {oneWayDistanceKm <= safeTankRangeKm ? (
            <span className="text-emerald-400 font-medium">
              ✓ น้ำมัน 1 ถังวิ่งถึงปลายทางสบาย
            </span>
          ) : (
            <span className="text-slate-300">
              แนะนำแวะเติมอย่างน้อย{' '}
              <strong className="text-sky-300 font-mono tabular-nums">
                {Math.max(1, recommendedStopMap.size)}
              </strong>{' '}
              จุดระหว่างทาง
            </span>
          )}
        </div>

        {unsavedRecommended.length > 0 && (
          <button
            type="button"
            onClick={() => onAddRecommendedStations(unsavedRecommended)}
            className="w-full min-h-[42px] px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>เพิ่มปั๊มจุดแวะเติมแนะนำเข้าทริป ({unsavedRecommended.length} จุด)</span>
          </button>
        )}
      </div>

      {/* Horizontal Touch-Scrollable Brand Filter Bar */}
      <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-0.5 -mx-1 px-1">
        {[
          { id: 'all' as const, label: `ทุกปั๊ม (${stations.length})` },
          { id: 'ptt' as const, label: 'ปตท.' },
          { id: 'bangchak' as const, label: 'บางจาก' },
          { id: 'pt' as const, label: 'พีที' },
          { id: 'intl' as const, label: 'เชลล์ / คาลเท็กซ์' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setBrandFilter(tab.id)}
            className={`min-h-[38px] shrink-0 px-3.5 rounded-xl text-xs font-medium transition-colors cursor-pointer border ${
              brandFilter === tab.id
                ? 'bg-sky-500 text-black font-bold border-sky-400'
                : 'bg-[#0E1117] border-[#232936] text-slate-300 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Station Cards List — Container-Responsive (1 col on 430px phone!) */}
      {loading ? (
        <div className="grid grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[#0E1117] border border-[#232936] animate-pulse space-y-2.5"
            >
              <div className="h-4 bg-[#1E2432] rounded w-1/3" />
              <div className="h-4 bg-[#232A3A] rounded w-3/4" />
              <div className="h-3 bg-[#1A202C] rounded w-1/2" />
              <div className="h-9 bg-[#1E2432] rounded w-full mt-2" />
            </div>
          ))}
        </div>
      ) : filteredStations.length === 0 ? (
        <div className="p-6 rounded-xl bg-[#0E1117] border border-[#232936] text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
          <p className="text-xs font-medium text-slate-300">
            {stations.length === 0
              ? 'ไม่พบข้อมูลปั๊มบนช่วงเส้นทางนี้ หรือเส้นทางสั้นมาก'
              : 'ไม่มีปั๊มยี่ห้อที่กรองในรายการนี้'}
          </p>
          {brandFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setBrandFilter('all')}
              className="min-h-[38px] px-3 text-xs text-sky-400 underline cursor-pointer"
            >
              แสดงปั๊มทั้งหมด ({stations.length} แห่ง)
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 @2xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4 gap-3">
          {filteredStations.map((station) => {
            const isSaved = savedPlaceIds.has(station.id);
            const recStopNum = recommendedStopMap.get(station.id);
            const style = BRAND_ACCENT_STYLES[station.brand] || BRAND_ACCENT_STYLES.other;
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${station.nameTh} ${station.lat},${station.lng}`
            )}`;

            return (
              <div
                key={station.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  recStopNum
                    ? 'bg-[#10151F] border-sky-500/45 shadow-md'
                    : 'bg-[#0E1117] border-[#232936]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono tabular-nums font-bold text-amber-400">
                      กม.ที่ ~{station.distanceFromStartKm.toLocaleString()}
                    </span>

                    {recStopNum ? (
                      <span className="text-sky-300 font-semibold text-[11px]">
                        ★ แนะนำแวะเติมจุดที่ {recStopNum}
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1.5 text-[11px] ${style.textColor}`}>
                        <span className={`w-2 h-2 rounded-full ${style.dotColor}`} />
                        <span>{style.shortName}</span>
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white line-clamp-1" title={station.nameTh}>
                    {station.nameTh}
                  </h4>

                  <div className="text-xs text-slate-400 line-clamp-1">
                    {station.areaHintTh || 'ริมทางหลวงสายหลัก'}
                  </div>

                  {station.amenities.length > 0 && (
                    <div className="text-[11px] text-slate-400 pt-0.5 line-clamp-1">
                      {station.amenities.join(' · ')}
                    </div>
                  )}
                </div>

                {/* Touch-friendly Action Buttons */}
                <div className="pt-2.5 border-t border-[#1E2430] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onFocusStationOnMap(station)}
                      className="min-h-[38px] px-2.5 rounded-lg bg-[#161B26] hover:bg-[#1E2534] inline-flex items-center gap-1 text-xs text-slate-200 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      <span>ดูบนแผนที่</span>
                    </button>

                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[38px] px-2.5 rounded-lg bg-[#161B26] hover:bg-[#1E2534] inline-flex items-center gap-1 text-xs text-slate-300 transition-colors"
                    >
                      <span>Maps</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleSaveStation(station)}
                    className={`min-h-[38px] inline-flex items-center gap-1 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSaved
                        ? 'bg-emerald-500 text-black'
                        : 'bg-[#19202D] hover:bg-[#232C3D] text-slate-200 border border-[#2D3648]'
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>ในทริปแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-sky-400" />
                        <span>แวะปั๊มนี้</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
