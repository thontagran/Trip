import React, { useState } from 'react';
import {
  MapPin,
  Clock,
  Sun,
  Plus,
  Check,
  ExternalLink,
  Sparkles,
  Navigation,
  Car,
  Ticket,
} from 'lucide-react';
import { PlaceRecommendation } from '../types';
import { LIFESTYLES_CONFIG } from '../data/provinces';

interface PlaceCardProps {
  place: PlaceRecommendation;
  index: number;
  isSaved: boolean;
  onToggleSave: (place: PlaceRecommendation) => void;
  onSelectOnMap?: (place: PlaceRecommendation) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  index,
  isSaved,
  onToggleSave,
  onSelectOnMap,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const lifestyleConfig =
    LIFESTYLES_CONFIG.find((l) => l.id === place.lifestyle) || LIFESTYLES_CONFIG[0];

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${place.nameTh} ${place.addressSummary || ''}`
  )}`;

  return (
    <div
      id={`place-card-${place.id}`}
      className="group bg-[#14171F] border border-[#242A36] rounded-2xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col justify-between"
    >
      {/* Image Container */}
      <div className="relative w-full aspect-[16/10] bg-[#0E1015] overflow-hidden">
        {(!imageLoaded || place.imageLoading) && (
          <div className="absolute inset-0 bg-gradient-to-r from-[#181C24] via-[#232936] to-[#181C24] animate-pulse flex flex-col items-center justify-center text-slate-500 gap-1.5">
            <Sparkles className="w-5 h-5 text-amber-500/40 animate-spin" />
            <span className="text-[11px] font-medium text-slate-400">กำลังดึงภาพสถานที่...</span>
          </div>
        )}

        {place.imageUrl && (
          <img
            src={place.imageUrl}
            alt={place.nameTh}
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80';
              setImageLoaded(true);
            }}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
          <span className="w-7 h-7 rounded-full bg-black/80 backdrop-blur-md text-white font-mono tabular-nums text-xs font-bold flex items-center justify-center border border-white/20">
            {index + 1}
          </span>

          <div className="flex items-center gap-1.5">
            {place.photoSource === 'wikimedia' && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-emerald-950/85 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                ภาพจริง
              </span>
            )}
            <span
              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-lg backdrop-blur-md border ${lifestyleConfig.badgeClass} shadow-md`}
            >
              {lifestyleConfig.titleTh}
            </span>
          </div>
        </div>

        {/* Bottom Highlight Tag */}
        <div className="absolute bottom-2 left-2.5 right-2.5 pointer-events-none">
          <span className="inline-block text-[11px] font-medium px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-amber-300 border border-amber-500/30 truncate max-w-full">
            ✨ {place.highlightTag}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="mb-2">
            <h4 className="text-base font-bold text-white line-clamp-1">
              {place.nameTh}
            </h4>
            <p className="text-xs text-slate-400 font-normal line-clamp-1 mt-0.5">
              {place.addressSummary ? `${place.addressSummary} · ` : ''}
              {place.nameEn}
            </p>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3 line-clamp-3">
            {place.descriptionTh}
          </p>

          {/* Practical Roadtrip Metadata */}
          <div className="space-y-2 mb-3 text-[11px] text-slate-300">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400">
              {place.openingHours && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{place.openingHours}</span>
                </span>
              )}
              {place.entryFeeTh && (
                <span className="inline-flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{place.entryFeeTh}</span>
                </span>
              )}
              {place.bestTimeToVisit && (
                <span className="inline-flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{place.bestTimeToVisit}</span>
                </span>
              )}
            </div>

            {place.parkingInfoTh && (
              <div className="flex items-start gap-1.5 text-[11px] text-slate-300 bg-[#0F1218] px-2.5 py-2 rounded-xl border border-[#202632]">
                <Car className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{place.parkingInfoTh}</span>
              </div>
            )}
          </div>
        </div>

        {/* Thumb-Friendly Footer Actions */}
        <div className="pt-3 border-t border-[#222733] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {onSelectOnMap && (
              <button
                type="button"
                onClick={() => onSelectOnMap(place)}
                className="min-h-[40px] px-2.5 rounded-xl bg-[#181D27] hover:bg-[#222938] inline-flex items-center gap-1.5 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                title="ส่องพิกัดบนแผนที่ในแอป"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>แผนที่</span>
              </button>
            )}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-2.5 rounded-xl bg-[#181D27] hover:bg-[#222938] inline-flex items-center gap-1 text-xs font-medium text-slate-300 transition-colors"
            >
              <Navigation className="w-3 h-3 text-amber-400" />
              <span>Maps</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          </div>

          <button
            type="button"
            onClick={() => onToggleSave(place)}
            className={`min-h-[40px] inline-flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer ${
              isSaved
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>ในทริปแล้ว</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>เพิ่มลงทริป</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
