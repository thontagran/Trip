import React, { useState } from 'react';
import { Compass, Car, Bike, MapPin, Share2, Check, Smartphone, Maximize2 } from 'lucide-react';
import { VehicleType } from '../types';

interface HeaderProps {
  vehicle: VehicleType;
  onVehicleChange: (v: VehicleType) => void;
  savedPlacesCount: number;
  onOpenItinerary: () => void;
  onCopyShareUrl: () => Promise<void>;
  layoutMode: 'mobile' | 'desktop';
  onToggleLayoutMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  vehicle,
  onVehicleChange,
  savedPlacesCount,
  onOpenItinerary,
  onCopyShareUrl,
  layoutMode,
  onToggleLayoutMode,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);

  const handleShareClick = async () => {
    await onCopyShareUrl();
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2200);
  };

  return (
    <header className="border-b border-[#232730] bg-[#121419]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3.5 @3xl:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Brand identity — preserves exact user-customized title & motto */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-emerald-600 p-[1.5px] shadow-md shadow-amber-500/20 shrink-0">
            <div className="w-full h-full bg-[#121419] rounded-[10px] flex items-center justify-center">
              <Compass className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm @3xl:text-lg font-bold tracking-tight text-white truncate">
                Trip <span className="text-amber-400">Don&apos;t Talking</span>
              </h1>
            </div>
            <p className="text-[10px] @3xl:text-xs text-slate-400 font-normal truncate">
              ทริปแก็งพูดไม่ได้อย่าไว้ใจททาง อย่าวางใจคน อย่าชนกันเอง
            </p>
          </div>
        </div>

        {/* Compact Mobile-First Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Vehicle Segmented Switch */}
          <div className="flex items-center p-0.5 bg-[#181B22] border border-[#2B313D] rounded-xl">
            <button
              id="vehicle-car-btn"
              type="button"
              onClick={() => onVehicleChange('car')}
              title="รถยนต์"
              className={`min-h-[36px] min-w-[38px] px-2 @3xl:px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                vehicle === 'car'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Car className="w-4 h-4" />
              <span className="hidden @3xl:inline">รถยนต์</span>
            </button>
            <button
              id="vehicle-motorcycle-btn"
              type="button"
              onClick={() => onVehicleChange('motorcycle')}
              title="มอเตอร์ไซค์"
              className={`min-h-[36px] min-w-[38px] px-2 @3xl:px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                vehicle === 'motorcycle'
                  ? 'bg-emerald-500 text-black font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span className="hidden @3xl:inline">มอเตอร์ไซค์</span>
            </button>
          </div>

          {/* Share Trip URL Button */}
          <button
            id="share-trip-url-btn"
            type="button"
            onClick={handleShareClick}
            title="คัดลอกลิงก์แชร์ทริปนี้ให้เพื่อน"
            className="min-h-[38px] min-w-[38px] px-2.5 bg-[#1A1E26] hover:bg-[#232833] border border-[#2D333F] rounded-xl text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            {linkCopied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Share2 className="w-4 h-4 text-emerald-400" />
            )}
            <span className="hidden @4xl:inline">
              {linkCopied ? 'คัดลอกแล้ว' : 'แชร์ลิงก์'}
            </span>
          </button>

          {/* Wide-mode Itinerary Button (in mobile mode, Itinerary is anchored in Bottom Nav) */}
          <button
            id="desktop-itinerary-btn"
            type="button"
            onClick={onOpenItinerary}
            className="hidden @3xl:flex min-h-[38px] items-center gap-1.5 px-3 bg-[#1A1E26] hover:bg-[#232833] border border-[#2D333F] rounded-xl text-xs font-medium text-slate-200 transition-all cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>แผนทริป</span>
            {savedPlacesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                {savedPlacesCount}
              </span>
            )}
          </button>

          {/* Desktop Screen Size Toggle (Mobile Phone Frame vs Full Width) */}
          <button
            id="toggle-viewport-mode-btn"
            type="button"
            onClick={onToggleLayoutMode}
            title={
              layoutMode === 'mobile'
                ? 'กำลังแสดงขนาดหน้าจอมือถือ (คลิกเพื่อขยายเต็มจอคอม)'
                : 'สลับกลับเป็นขนาดหน้าจอมือถือ'
            }
            className="hidden sm:flex min-h-[38px] min-w-[38px] px-2 bg-[#1A1E26] hover:bg-[#242A37] border border-[#2D333F] rounded-xl text-[11px] font-medium text-slate-300 items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            {layoutMode === 'mobile' ? (
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>จอมือถือ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
