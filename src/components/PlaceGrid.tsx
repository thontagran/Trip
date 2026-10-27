import React, { useState, useMemo } from 'react';
import { Sparkles, AlertCircle, RefreshCw, Layers, Search, PlusCircle } from 'lucide-react';
import { PlaceRecommendation, LifestyleType } from '../types';
import { PlaceCard } from './PlaceCard';

interface PlaceGridProps {
  places: PlaceRecommendation[];
  loading: boolean;
  error: string | null;
  selectedLifestyle: LifestyleType;
  savedPlaceIds: Set<string>;
  onToggleSave: (place: PlaceRecommendation) => void;
  onAddTopPlaces?: (placesToAdd: PlaceRecommendation[]) => void;
  onSelectOnMap: (place: PlaceRecommendation) => void;
  onRetry: () => void;
}

export const PlaceGrid: React.FC<PlaceGridProps> = ({
  places,
  loading,
  error,
  savedPlaceIds,
  onToggleSave,
  onAddTopPlaces,
  onSelectOnMap,
  onRetry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'saved'>('all');

  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      if (filterMode === 'saved' && !savedPlaceIds.has(p.id)) {
        return false;
      }
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        p.nameTh.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.descriptionTh.toLowerCase().includes(q) ||
        (p.addressSummary || '').toLowerCase().includes(q) ||
        (p.highlightTag || '').toLowerCase().includes(q)
      );
    });
  }, [places, filterMode, savedPlaceIds, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-3.5">
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-amber-300">
          <Sparkles className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-200">
              กำลังคัดสรร 10 สถานที่จริง พร้อมข้อมูลที่จอดรถและเวลาเปิด-ปิด...
            </p>
            <p className="text-[11px] text-amber-400/80">
              ดึงพิกัดสำหรับปักหมุดบนแผนที่และส่งเข้าแอปนำทาง
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 @2xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4 @7xl:grid-cols-5 gap-3.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-[#14171F] border border-[#232835] rounded-2xl overflow-hidden animate-pulse flex flex-col justify-between"
            >
              <div className="aspect-[16/10] bg-[#1B202A] relative flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-slate-700 animate-pulse" />
              </div>
              <div className="p-4 space-y-2.5">
                <div className="h-4 bg-[#232A37] rounded w-3/4" />
                <div className="h-3 bg-[#1C222D] rounded w-1/2" />
                <div className="space-y-1.5 pt-2">
                  <div className="h-3 bg-[#1C222D] rounded w-full" />
                  <div className="h-3 bg-[#1C222D] rounded w-5/6" />
                </div>
                <div className="pt-3 border-t border-[#222733] flex justify-between">
                  <div className="h-8 bg-[#232A37] rounded w-20" />
                  <div className="h-8 bg-[#232A37] rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <div>
          <h4 className="text-sm font-bold text-rose-100">ไม่สามารถดึงข้อมูลสถานที่ได้ในขณะนี้</h4>
          <p className="text-xs text-rose-300/80 mt-1">{error}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[42px] inline-flex items-center gap-1.5 px-4 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>ลองใหม่อีกครั้ง</span>
        </button>
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-[#14171F] border border-[#232835] text-center text-slate-400">
        <Layers className="w-9 h-9 mx-auto mb-2 text-slate-600" />
        <p className="text-sm font-medium text-slate-300">ยังไม่มีข้อมูลสถานที่</p>
        <p className="text-xs text-slate-500 mt-1">กดปุ่ม &ldquo;สุ่มชุดสถานที่ใหม่&rdquo; เพื่อเริ่มวางแผน</p>
      </div>
    );
  }

  const unsavedTop3 = places.slice(0, 3).filter((p) => !savedPlaceIds.has(p.id));
  const savedInListCount = places.filter((p) => savedPlaceIds.has(p.id)).length;

  return (
    <div className="space-y-3.5">
      {/* Quick Search, Filter & 1-Click Top-3 Add Toolbar */}
      <div className="bg-[#14171E] border border-[#242A36] rounded-2xl p-3.5 space-y-2.5">
        <div className="flex flex-col @2xl:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="กรองชื่อสถานที่ / อำเภอ / จุดเด่น..."
              className="w-full min-h-[40px] bg-[#0D0F14] border border-[#282F3E] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-[#0D0F14] border border-[#252B38] rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[#1F2533] text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ทั้งหมด ({places.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('saved')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterMode === 'saved'
                  ? 'bg-emerald-500 text-black font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ในทริป ({savedInListCount})
            </button>
          </div>
        </div>

        {onAddTopPlaces && unsavedTop3.length > 0 && (
          <button
            type="button"
            onClick={() => onAddTopPlaces(unsavedTop3)}
            className="w-full min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-[0.98] border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>จัดทริปด่วน: เพิ่ม 3 จุดแรกเข้าแผนทริป</span>
          </button>
        )}
      </div>

      {filteredPlaces.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#14171F] border border-[#232835] text-center text-xs text-slate-400">
          ไม่พบสถานที่ที่ตรงกับตัวกรอง ลองล้างคำค้นหาหรือสลับกลับไปดูทั้งหมด
        </div>
      ) : (
        <div className="grid grid-cols-1 @2xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4 @7xl:grid-cols-5 gap-3.5">
          {filteredPlaces.map((place) => {
            const originalIdx = places.findIndex((p) => p.id === place.id);
            return (
              <PlaceCard
                key={place.id}
                place={place}
                index={originalIdx >= 0 ? originalIdx : 0}
                isSaved={savedPlaceIds.has(place.id)}
                onToggleSave={onToggleSave}
                onSelectOnMap={onSelectOnMap}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
