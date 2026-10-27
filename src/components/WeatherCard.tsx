import React from 'react';
import {
  CloudSun,
  Droplets,
  ShieldCheck,
  RefreshCw,
  Shirt,
  Wind,
  Sun,
} from 'lucide-react';
import { DestinationWeather } from '../types';

interface WeatherCardProps {
  weather: DestinationWeather | null;
  loading: boolean;
  onRefresh: () => void;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, loading, onRefresh }) => {
  if (loading || !weather) {
    return (
      <div className="bg-[#14171E] border border-[#262B36] rounded-2xl p-4 @3xl:p-6 shadow-xl h-full flex flex-col justify-between animate-pulse">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-[#232936] rounded w-1/2" />
            <div className="h-8 bg-[#232936] rounded w-9" />
          </div>
          <div className="h-20 bg-[#1A1F29] rounded-xl mb-3" />
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="h-14 bg-[#1A1F29] rounded-lg" />
            <div className="h-14 bg-[#1A1F29] rounded-lg" />
            <div className="h-14 bg-[#1A1F29] rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="h-12 bg-[#232936] rounded-xl w-full" />
            <div className="h-12 bg-[#232936] rounded-xl w-full" />
          </div>
        </div>
      </div>
    );
  }

  const pm25BadgeClass =
    weather.pm25 === undefined
      ? 'bg-slate-700/30 text-slate-300 border-slate-600/40'
      : weather.pm25 <= 25
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : weather.pm25 <= 37.5
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      : 'bg-rose-500/15 text-rose-300 border-rose-500/30';

  return (
    <div className="bg-[#14171E] border border-[#262B36] rounded-2xl p-4 @3xl:p-6 shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CloudSun className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight truncate">
                  สภาพอากาศสด {weather.provinceName}
                </h3>
                {weather.dataSource === 'open-meteo' && (
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium">
                    {weather.updatedAtTh} น.
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-normal truncate">{weather.seasonTh}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            title="ดึงสภาพอากาศสดใหม่"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-[#1C202B] hover:bg-[#282F3E] border border-[#2D3443] text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Live Weather Main Banner */}
        <div className="bg-gradient-to-r from-[#171B23] to-[#12141A] border border-emerald-500/25 rounded-xl p-3.5 mb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-3xl font-extrabold text-white font-mono tabular-nums flex items-start shrink-0">
                <span>{weather.temperatureC}</span>
                <span className="text-emerald-400 text-lg font-normal">°C</span>
              </div>
              <div className="border-l border-[#2B323F] pl-3 min-w-0">
                <p className="text-xs font-semibold text-emerald-300 truncate">{weather.conditionTh}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  รู้สึก {weather.apparentTempC}°C • ชื้น {weather.humidityPercent}%
                </p>
              </div>
            </div>

            {weather.pm25 !== undefined && (
              <div className={`px-2 py-1 rounded-lg border text-[11px] font-medium text-right shrink-0 ${pm25BadgeClass}`}>
                <div className="font-mono tabular-nums font-bold">PM2.5: {weather.pm25}</div>
                <div className="text-[10px] opacity-90">{weather.aqiLabelTh}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2.5 border-t border-[#252C38] text-[11px] text-slate-300">
            <div className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">ฝน {weather.rainChancePercent}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">ลม {weather.windSpeedKmh} กม./ชม.</span>
            </div>
            <div className="flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">UV {weather.uvIndex}</span>
            </div>
          </div>
        </div>

        {/* 3-Day Forecast Strip */}
        {weather.dailyForecast.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {weather.dailyForecast.map((day) => (
              <div
                key={day.dateStr}
                className="bg-[#0E1116] border border-[#232936] rounded-xl px-2 py-2 text-center"
              >
                <div className="text-[11px] font-semibold text-slate-200 truncate">{day.dayLabelTh}</div>
                <div className="text-xs font-mono tabular-nums font-bold text-amber-400 my-0.5">
                  {day.tempMinC}° - {day.tempMaxC}°C
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  ฝน {day.rainProbPercent}%
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rider & Gear Advice */}
        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[#0F1217] border border-[#242A35] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200 block text-[11px] mb-0.5">
                คำแนะนำการขับขี่:
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">{weather.riderAdviceTh}</p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0F1217] border border-[#242A35] flex items-start gap-2.5">
            <Shirt className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200 block text-[11px] mb-0.5">
                การแต่งกาย & อุปกรณ์:
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {weather.clothingAdviceTh}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-[#222733] text-[11px] text-slate-400 flex items-center justify-between gap-2">
        <span>ฤดูกาลน่าเที่ยว:</span>
        <span className="text-slate-200 font-medium text-right">{weather.bestTravelMonthsTh}</span>
      </div>
    </div>
  );
};
