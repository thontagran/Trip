import React from 'react';
import { Trees, Coffee, Compass, Landmark, Sparkles, Wand2 } from 'lucide-react';
import { LifestyleType } from '../types';
import { LIFESTYLES_CONFIG } from '../data/provinces';

interface LifestyleSelectorProps {
  selectedLifestyle: LifestyleType;
  destinationName: string;
  loading: boolean;
  onSelectLifestyle: (lifestyle: LifestyleType) => void;
  onRegenerate: () => void;
}

export const LifestyleSelector: React.FC<LifestyleSelectorProps> = ({
  selectedLifestyle,
  destinationName,
  loading,
  onSelectLifestyle,
  onRegenerate,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Trees':
        return <Trees className="w-4 h-4" />;
      case 'Coffee':
        return <Coffee className="w-4 h-4" />;
      case 'Compass':
        return <Compass className="w-4 h-4" />;
      case 'Landmark':
        return <Landmark className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-[#14171E] border border-[#262B36] rounded-2xl p-4 @3xl:p-6 shadow-xl space-y-3.5">
      <div className="flex flex-col @2xl:flex-row @2xl:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              10 จุดแวะตามสไตล์แก๊ง · จ.{destinationName}
            </h3>
            <p className="text-xs text-slate-400">
              แตะเลือกสไตล์เที่ยวพร้อมดูที่จอดรถและเวลาเปิด-ปิด
            </p>
          </div>
        </div>

        {/* Regenerate button (>= 44px touch hitbox on mobile) */}
        <button
          id="regenerate-places-btn"
          type="button"
          onClick={onRegenerate}
          disabled={loading}
          className="min-h-[44px] w-full @2xl:w-auto flex items-center justify-center gap-2 px-4 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-black font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
        >
          <Wand2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'กำลังคัดพิกัดเด็ด...' : 'สุ่มชุดสถานที่ใหม่'}</span>
        </button>
      </div>

      {/* 4 Lifestyle Selection Cards — 2x2 grid on 430px phone, 4-col on wide desktop */}
      <div className="grid grid-cols-2 @3xl:grid-cols-4 gap-2.5">
        {LIFESTYLES_CONFIG.map((item) => {
          const isSelected = selectedLifestyle === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectLifestyle(item.id)}
              className={`text-left p-3 rounded-xl border transition-all relative overflow-hidden cursor-pointer flex flex-col justify-between min-h-[112px] active:scale-[0.98] ${
                isSelected
                  ? `${item.activeTabClass} border-2 shadow-lg`
                  : 'bg-[#101319] hover:bg-[#181C24] border-[#252A36] text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-white/15 text-white' : 'bg-[#1A1F29] text-slate-400'
                    }`}
                  >
                    {getIcon(item.iconName)}
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                  )}
                </div>
                <h4 className="text-xs font-bold text-white mb-0.5 line-clamp-1">
                  {item.titleTh}
                </h4>
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug">
                {item.descTh}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
