import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  Navigation,
  Car,
  Bike,
  AlertTriangle,
  Clock,
  Route,
  LocateFixed,
  Search,
  Coffee,
  CheckSquare,
  Square,
  Dices,
} from 'lucide-react';
import { Province, VehicleType, RouteCalculationResult } from '../types';
import { PROVINCES } from '../data/provinces';
import { findNearestProvince } from '../utils/routeCalculator';

interface RoutePlannerProps {
  origin: Province;
  destination: Province;
  vehicle: VehicleType;
  calculationResult: RouteCalculationResult;
  routeLoading: boolean;
  savedPlacesCount: number;
  includeWaypointsInRoute: boolean;
  originGpsCoords: { lat: number; lng: number } | null;
  onOriginChange: (province: Province, gpsCoords?: { lat: number; lng: number } | null) => void;
  onDestinationChange: (province: Province) => void;
  onVehicleChange: (vehicle: VehicleType) => void;
  onSwapProvinces: () => void;
  onSelectPreset: (originId: string, destId: string, vehicle: VehicleType) => void;
  onToggleIncludeWaypoints: (val: boolean) => void;
}

const PRESET_TRIPS = [
  { label: 'กทม. ➔ น่าน (ถนนลอยฟ้า)', originId: 'TH-10', destId: 'TH-55', vehicle: 'motorcycle' as VehicleType },
  { label: 'เชียงใหม่ ➔ แม่ฮ่องสอน (1,864 โค้ง)', originId: 'TH-50', destId: 'TH-58', vehicle: 'motorcycle' as VehicleType },
  { label: 'กทม. ➔ เชียงใหม่', originId: 'TH-10', destId: 'TH-50', vehicle: 'car' as VehicleType },
  { label: 'กทม. ➔ กาญจนบุรี (อีต่อง)', originId: 'TH-10', destId: 'TH-71', vehicle: 'car' as VehicleType },
  { label: 'กทม. ➔ เขาใหญ่', originId: 'TH-10', destId: 'TH-30', vehicle: 'car' as VehicleType },
  { label: 'กทม. ➔ ภูเก็ต', originId: 'TH-10', destId: 'TH-83', vehicle: 'car' as VehicleType },
];

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  origin,
  destination,
  vehicle,
  calculationResult,
  routeLoading,
  savedPlacesCount,
  includeWaypointsInRoute,
  originGpsCoords,
  onOriginChange,
  onDestinationChange,
  onVehicleChange,
  onSwapProvinces,
  onSelectPreset,
  onToggleIncludeWaypoints,
}) => {
  const [originFilter, setOriginFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [gpsLocating, setGpsLocating] = useState(false);

  const regionsOrder = [
    { id: 'north', label: 'ภาคเหนือ' },
    { id: 'central', label: 'ภาคกลาง' },
    { id: 'northeast', label: 'ภาคตะวันออกเฉียงเหนือ' },
    { id: 'east', label: 'ภาคตะวันออก' },
    { id: 'west', label: 'ภาคตะวันตก' },
    { id: 'south', label: 'ภาคใต้' },
  ];

  const filteredOriginProvinces = useMemo(() => {
    const q = originFilter.trim().toLowerCase();
    if (!q) return PROVINCES;
    const matches = PROVINCES.filter(
      (p) =>
        p.nameTh.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        (p.popularHighlight || '').toLowerCase().includes(q)
    );
    return matches.length > 0 ? matches : PROVINCES;
  }, [originFilter]);

  const filteredDestProvinces = useMemo(() => {
    const q = destFilter.trim().toLowerCase();
    if (!q) return PROVINCES;
    const matches = PROVINCES.filter(
      (p) =>
        p.nameTh.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        (p.popularHighlight || '').toLowerCase().includes(q)
    );
    return matches.length > 0 ? matches : PROVINCES;
  }, [destFilter]);

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS');
      return;
    }

    setGpsLocating(true);
    setGpsStatus(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const { province } = findNearestProvince(latitude, longitude, PROVINCES);
        onOriginChange(province, { lat: latitude, lng: longitude });
        setOriginFilter('');
        setGpsStatus(`ใช้พิกัด GPS ปัจจุบัน (ใกล้ จ.${province.nameTh})`);
        setGpsLocating(false);
      },
      () => {
        setGpsStatus('ไม่สามารถเข้าถึง GPS ได้ กรุณาอนุญาตสิทธิ์ตำแหน่งที่ตั้ง');
        setGpsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleRandomDestination = () => {
    const candidates = PROVINCES.filter((p) => p.id !== origin.id && p.id !== destination.id);
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    if (picked) {
      setDestFilter('');
      onDestinationChange(picked);
    }
  };

  return (
    <div className="bg-[#14171E] border border-[#262B36] rounded-2xl p-4 @3xl:p-6 shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Section Title */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Navigation className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white tracking-tight">
              เลือกต้นทาง - ปลายทาง - พาหนะ
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              คำนวณถนนหลวงจริงครบ 77 จังหวัดทั่วไทย
            </p>
          </div>
        </div>

        {/* 2-Column Mobile Action Buttons ( >= 44px touch targets ) */}
        <div className="grid grid-cols-2 gap-2 mb-3.5">
          <button
            id="surprise-dest-btn"
            type="button"
            onClick={handleRandomDestination}
            className="min-h-[44px] px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-[0.98] border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Dices className="w-4 h-4 shrink-0" />
            <span className="truncate">สุ่มจังหวัดวัดใจแก๊ง</span>
          </button>

          <button
            id="gps-locate-btn"
            type="button"
            onClick={handleUseCurrentGps}
            disabled={gpsLocating}
            className="min-h-[44px] px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-[0.98] border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <LocateFixed className={`w-4 h-4 shrink-0 ${gpsLocating ? 'animate-spin' : ''}`} />
            <span className="truncate">{gpsLocating ? 'กำลังหาพิกัด...' : 'เริ่มจาก GPS ฉัน'}</span>
          </button>
        </div>

        {gpsStatus && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-[#1A212D] border border-[#2C3648] text-xs text-emerald-300 flex items-center justify-between gap-2">
            <span className="truncate">📍 {gpsStatus}</span>
            {originGpsCoords && (
              <button
                type="button"
                onClick={() => {
                  onOriginChange(origin, null);
                  setGpsStatus(null);
                }}
                className="text-[11px] text-slate-300 underline shrink-0 cursor-pointer"
              >
                รีเซ็ต
              </button>
            )}
          </div>
        )}

        {/* Horizontal Touch-Scrollable Preset Trips */}
        <div className="mb-3.5">
          <div className="text-[11px] font-medium text-slate-400 mb-1.5">
            แตะเลือกทริปยอดฮิตด่วน:
          </div>
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1 -mx-1 px-1">
            {PRESET_TRIPS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectPreset(preset.originId, preset.destId, preset.vehicle)}
                className="min-h-[36px] shrink-0 text-xs px-3 py-1.5 rounded-xl bg-[#1D222C] hover:bg-[#282F3D] active:scale-[0.98] border border-[#2D3442] text-slate-200 transition-all cursor-pointer whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Origin & Destination Stack (Single column on mobile phone, 12-col only on wide desktop) */}
        <div className="grid grid-cols-1 @3xl:grid-cols-12 gap-2.5 items-end">
          {/* Origin */}
          <div className="@3xl:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="origin-province-select" className="text-xs font-semibold text-slate-300">
                ต้นทาง {originGpsCoords ? '(GPS)' : ''}
              </label>
              <div className="relative w-32">
                <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={originFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOriginFilter(val);
                    const exact = PROVINCES.find(
                      (p) =>
                        p.nameTh.includes(val.trim()) ||
                        p.nameEn.toLowerCase().includes(val.trim().toLowerCase())
                    );
                    if (val.trim().length >= 2 && exact) {
                      onOriginChange(exact, null);
                    }
                  }}
                  placeholder="ค้นหาจังหวัด..."
                  className="w-full bg-[#0D0F13] border border-[#272D3A] rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="relative">
              <select
                id="origin-province-select"
                value={origin.id}
                onChange={(e) => {
                  const selected = PROVINCES.find((p) => p.id === e.target.value);
                  if (selected) onOriginChange(selected, null);
                }}
                className="w-full min-h-[46px] bg-[#0D0F13] border border-[#2E3543] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white appearance-none cursor-pointer pr-9"
              >
                {regionsOrder.map((region) => {
                  const items = filteredOriginProvinces.filter((p) => p.region === region.id);
                  if (items.length === 0) return null;
                  return (
                    <optgroup key={region.id} label={`--- ${region.label} ---`}>
                      {items.map((prov) => (
                        <option key={prov.id} value={prov.id}>
                          {prov.nameTh} ({prov.nameEn})
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Tactile Swap Trigger */}
          <div className="@3xl:col-span-2 flex items-center justify-center py-0.5 @3xl:pb-1">
            <button
              id="swap-provinces-btn"
              type="button"
              onClick={onSwapProvinces}
              title="สลับต้นทาง-ปลายทาง"
              className="min-h-[44px] px-4 @3xl:px-0 @3xl:w-11 rounded-xl bg-[#1D222C] hover:bg-[#2B3342] active:scale-[0.97] border border-[#343D4E] flex items-center justify-center gap-1.5 text-xs text-slate-200 hover:text-amber-400 transition-all cursor-pointer shadow-sm w-full"
            >
              <ArrowUpDown className="w-4 h-4 text-amber-400" />
              <span className="@3xl:hidden font-medium">สลับต้นทาง - ปลายทาง</span>
            </button>
          </div>

          {/* Destination */}
          <div className="@3xl:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="dest-province-select" className="text-xs font-semibold text-slate-300">
                ปลายทาง
              </label>
              <div className="relative w-32">
                <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={destFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDestFilter(val);
                    const exact = PROVINCES.find(
                      (p) =>
                        p.nameTh.includes(val.trim()) ||
                        p.nameEn.toLowerCase().includes(val.trim().toLowerCase())
                    );
                    if (val.trim().length >= 2 && exact) {
                      onDestinationChange(exact);
                    }
                  }}
                  placeholder="ค้นหาจังหวัด..."
                  className="w-full bg-[#0D0F13] border border-[#272D3A] rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="relative">
              <select
                id="dest-province-select"
                value={destination.id}
                onChange={(e) => {
                  const selected = PROVINCES.find((p) => p.id === e.target.value);
                  if (selected) onDestinationChange(selected);
                }}
                className="w-full min-h-[46px] bg-[#0D0F13] border border-[#2E3543] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white appearance-none cursor-pointer pr-9"
              >
                {regionsOrder.map((region) => {
                  const items = filteredDestProvinces.filter((p) => p.region === region.id);
                  if (items.length === 0) return null;
                  return (
                    <optgroup key={region.id} label={`--- ${region.label} ---`}>
                      {items.map((prov) => (
                        <option key={prov.id} value={prov.id}>
                          {prov.nameTh} ({prov.nameEn})
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {destination.popularHighlight && (
              <p className="text-[11px] text-slate-400 truncate">
                ไฮไลท์: <span className="text-amber-300/90 font-medium">{destination.popularHighlight}</span>
              </p>
            )}
          </div>
        </div>

        {/* Multi-stop distance calculation toggle */}
        {savedPlacesCount > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => onToggleIncludeWaypoints(!includeWaypointsInRoute)}
              className="w-full min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#10131A] hover:bg-[#171C26] border border-[#28303E] text-xs text-slate-300 transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center gap-2 min-w-0">
                {includeWaypointsInRoute ? (
                  <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span className="truncate">คำนวณรวมจุดแวะในทริป ({savedPlacesCount} แห่ง)</span>
              </span>
              <span className="text-[11px] text-amber-400 font-semibold shrink-0">
                {includeWaypointsInRoute ? 'รวมแล้ว' : 'ไม่รวม'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Vehicle Segmented Selector & Live Route Summary Card */}
      <div className="mt-4 pt-3.5 border-t border-[#232833] space-y-3">
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#0D0F13] border border-[#2A303C] rounded-xl">
          <button
            type="button"
            onClick={() => onVehicleChange('car')}
            className={`min-h-[42px] flex items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              vehicle === 'car'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>รถยนต์</span>
          </button>
          <button
            type="button"
            onClick={() => onVehicleChange('motorcycle')}
            className={`min-h-[42px] flex items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              vehicle === 'motorcycle'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>มอเตอร์ไซค์</span>
          </button>
        </div>

        {/* Route Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 bg-[#0D0F13] p-3 rounded-xl border border-[#282E3A] text-center">
          <div>
            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Route className="w-3 h-3 text-amber-400" />
              <span>ระยะทาง</span>
            </div>
            <div className="text-sm font-bold text-amber-400 font-mono tabular-nums mt-0.5">
              {routeLoading
                ? '...'
                : `${calculationResult.estimatedRoadDistanceKm.toLocaleString()} กม.`}
            </div>
          </div>

          <div className="border-x border-[#232936]">
            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>เวลาขับขี่</span>
            </div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5 truncate px-1">
              {calculationResult.durationFormatted}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Coffee className="w-3 h-3 text-sky-400" />
              <span>แวะพักรถ</span>
            </div>
            <div className="text-sm font-bold text-slate-200 font-mono tabular-nums mt-0.5">
              {calculationResult.restStopsCount} จุด
            </div>
          </div>
        </div>

        {/* Warning Banner for Motorcycle */}
        {vehicle === 'motorcycle' && calculationResult.motorcycleWarning && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-medium text-amber-200 leading-snug">
                {calculationResult.motorcycleWarning}
              </p>
              <p className="text-[11px] text-amber-400/80">
                ปรับเวลาเดินทาง x1.08 เท่า พร้อมเผื่อแวะพักคนและเครื่องยนต์ {calculationResult.restStopsCount} จุด
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
