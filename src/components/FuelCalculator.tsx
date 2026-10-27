import React from 'react';
import { Fuel, Users, RotateCcw, Gauge, TrendingUp, Info, Coins } from 'lucide-react';
import { RouteCalculationResult, VehicleType, FuelPricesResponse, ThaiFuelPriceItem } from '../types';

interface FuelCalculatorProps {
  calculationResult: RouteCalculationResult;
  vehicle: VehicleType;
  fuelConsumption: number;
  fuelPrice: number;
  extraCostThb: number;
  isRoundTrip: boolean;
  fuelPricesData: FuelPricesResponse | null;
  selectedFuelTypeId: string;
  onSelectFuelType: (item: ThaiFuelPriceItem) => void;
  onFuelConsumptionChange: (val: number) => void;
  onFuelPriceChange: (val: number) => void;
  onExtraCostChange: (val: number) => void;
  onRoundTripToggle: (val: boolean) => void;
  passengerCount: number;
  onPassengerCountChange: (count: number) => void;
}

const VEHICLE_CONSUMPTION_PRESETS: Record<
  VehicleType,
  Array<{ label: string; kmPerL: number }>
> = {
  car: [
    { label: 'อีโคคาร์ (18)', kmPerL: 18 },
    { label: 'เก๋งซีดาน (14)', kmPerL: 14 },
    { label: 'SUV/กระบะ (12)', kmPerL: 12 },
    { label: 'รถตู้ทริป (9)', kmPerL: 9 },
  ],
  motorcycle: [
    { label: 'ออโต้/125cc (45)', kmPerL: 45 },
    { label: '150-300cc (33)', kmPerL: 33 },
    { label: 'ทัวร์ริ่ง 500cc (25)', kmPerL: 25 },
    { label: 'บิ๊กไบค์ 650+ (18)', kmPerL: 18 },
  ],
};

export const FuelCalculator: React.FC<FuelCalculatorProps> = ({
  calculationResult,
  vehicle,
  fuelConsumption,
  fuelPrice,
  extraCostThb,
  isRoundTrip,
  fuelPricesData,
  selectedFuelTypeId,
  onSelectFuelType,
  onFuelConsumptionChange,
  onFuelPriceChange,
  onExtraCostChange,
  onRoundTripToggle,
  passengerCount,
  onPassengerCountChange,
}) => {
  const costPerPerson = Math.round(calculationResult.totalTripCostThb / Math.max(1, passengerCount));
  const fuelCostPerKm = (
    calculationResult.fuelCostThb / Math.max(1, calculationResult.estimatedRoadDistanceKm)
  ).toFixed(2);

  const availableFuels = (fuelPricesData?.prices || []).filter(
    (f) => vehicle === 'car' || f.id !== 'diesel'
  );

  return (
    <div className="bg-[#14171E] border border-[#262B36] rounded-2xl p-4 @3xl:p-6 shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
      <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Fuel className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white tracking-tight truncate">
                ค่าน้ำมัน & งบเดินทางจริง
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {fuelPricesData?.source === 'live'
                  ? `ราคาหน้าปั๊มไทย (${fuelPricesData.updatedDateTh})`
                  : 'คำนวณตามเชื้อเพลิงและพิกัดเครื่องยนต์'}
              </p>
            </div>
          </div>

          <button
            id="round-trip-toggle-btn"
            type="button"
            onClick={() => onRoundTripToggle(!isRoundTrip)}
            className={`min-h-[38px] flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              isRoundTrip
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-[#1C202B] text-slate-300 hover:text-white border border-[#2D3442]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isRoundTrip ? 'ไป-กลับ (x2)' : 'เที่ยวเดียว'}</span>
          </button>
        </div>

        {/* Big Total Price Highlight Banner */}
        <div className="bg-gradient-to-br from-[#1A1E27] to-[#12151B] border border-amber-500/30 rounded-xl p-3.5 mb-3.5 shadow-inner">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">
              {extraCostThb > 0 ? 'งบเดินทางรวม:' : 'ค่าน้ำมันประมาณการ:'}
            </span>
            <span className="text-xs text-amber-400 font-mono tabular-nums font-semibold">
              ~{calculationResult.fuelLiters.toLocaleString()} ลิตร
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight font-mono tabular-nums">
              ฿{calculationResult.totalTripCostThb.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">บาท</span>
            {extraCostThb > 0 && (
              <span className="text-[11px] text-slate-400 ml-auto font-mono tabular-nums">
                (น้ำมัน ฿{calculationResult.fuelCostThb.toLocaleString()})
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-[#2A313E] text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">~{fuelCostPerKm} บ./กม.</span>
            </div>
            <div className="flex items-center justify-end gap-1.5 text-slate-200 font-semibold">
              <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate font-mono tabular-nums">คนละ ฿{costPerPerson.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Real Thai Fuel Type Selector (Horizontal Touch Scroll) */}
        {availableFuels.length > 0 && (
          <div className="mb-3.5">
            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
              แตะเลือกชนิดน้ำมันในไทยวันนี้:
            </label>
            <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1 -mx-1 px-1">
              {availableFuels.map((fuel) => {
                const active = selectedFuelTypeId === fuel.id;
                return (
                  <button
                    key={fuel.id}
                    type="button"
                    onClick={() => onSelectFuelType(fuel)}
                    className={`min-h-[38px] shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                        : 'bg-[#0E1015] border-[#272E3B] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span>{fuel.shortLabel}</span>
                    <span className="font-mono tabular-nums text-[11px] opacity-85">฿{fuel.priceThb}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Consumption & Fuel Price Controls */}
        <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-3">
          {/* Fuel Consumption + Vehicle Presets */}
          <div className="bg-[#0E1015] p-3.5 rounded-xl border border-[#272E3B]">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="fuel-consumption-range" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>อัตราสิ้นเปลือง</span>
              </label>
              <span className="text-xs font-mono tabular-nums font-bold text-amber-400">
                {fuelConsumption} กม./ล.
              </span>
            </div>
            <input
              id="fuel-consumption-range"
              type="range"
              min="5"
              max="60"
              step="0.5"
              value={fuelConsumption}
              onChange={(e) => onFuelConsumptionChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#252C3A] rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
              {VEHICLE_CONSUMPTION_PRESETS[vehicle].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onFuelConsumptionChange(preset.kmPerL)}
                  className={`min-h-[34px] text-[11px] px-2 py-1 rounded-lg border truncate cursor-pointer transition-colors ${
                    fuelConsumption === preset.kmPerL
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                      : 'bg-[#161A22] border-[#252C3A] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fuel Price & Extra Toll/Trip Costs */}
          <div className="bg-[#0E1015] p-3.5 rounded-xl border border-[#272E3B] grid grid-cols-2 @2xl:grid-cols-1 gap-2.5">
            <div>
              <label htmlFor="fuel-price-input" className="block text-[11px] font-medium text-slate-300 mb-1">
                ราคาน้ำมัน (บ./ลิตร)
              </label>
              <input
                id="fuel-price-input"
                type="number"
                min="15"
                max="80"
                step="0.01"
                value={fuelPrice}
                onChange={(e) => onFuelPriceChange(parseFloat(e.target.value) || 0)}
                className="w-full min-h-[40px] bg-[#181C24] border border-[#303746] rounded-lg px-2.5 py-1.5 text-sm text-white font-mono tabular-nums focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="extra-cost-input" className="text-[11px] font-medium text-slate-300 flex items-center gap-1 mb-1">
                <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{vehicle === 'car' ? 'ทางด่วน / งบเสริม' : 'ที่พัก / งบเสริม'}</span>
              </label>
              <input
                id="extra-cost-input"
                type="number"
                min="0"
                step="50"
                value={extraCostThb || ''}
                placeholder="0 บาท"
                onChange={(e) => onExtraCostChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full min-h-[40px] bg-[#181C24] border border-[#303746] rounded-lg px-2.5 py-1.5 text-sm text-white font-mono tabular-nums focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Thumb-Friendly Passenger Split Stepper */}
        <div className="mt-3 bg-[#0E1015] p-3 rounded-xl border border-[#272E3B] flex items-center justify-between gap-2">
          <span className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <span>จำนวนคนหารทริป:</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPassengerCountChange(Math.max(1, passengerCount - 1))}
              className="min-h-[38px] min-w-[38px] rounded-xl bg-[#1C212B] hover:bg-[#262D3B] border border-[#2D3442] text-white text-base font-bold cursor-pointer"
            >
              −
            </button>
            <span className="min-w-[44px] text-center font-mono tabular-nums text-sm font-bold text-amber-400">
              {passengerCount} คน
            </span>
            <button
              type="button"
              onClick={() => onPassengerCountChange(Math.min(20, passengerCount + 1))}
              className="min-h-[38px] min-w-[38px] rounded-xl bg-[#1C212B] hover:bg-[#262D3B] border border-[#2D3442] text-white text-base font-bold cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate">
          ({calculationResult.estimatedRoadDistanceKm.toLocaleString()} กม. ÷ {fuelConsumption} กม./ล.) × ฿{fuelPrice}
          {extraCostThb > 0 ? ` + งบเสริม ฿${extraCostThb.toLocaleString()}` : ''}
        </span>
      </div>
    </div>
  );
};
