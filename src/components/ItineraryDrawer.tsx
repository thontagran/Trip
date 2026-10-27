import React, { useState } from 'react';
import {
  X,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Calendar,
  Navigation,
  ChevronUp,
  ChevronDown,
  Wand2,
  Download,
  Share2,
  Plus,
} from 'lucide-react';
import {
  PlaceRecommendation,
  Province,
  RouteCalculationResult,
  VehicleType,
  RealRouteData,
} from '../types';
import { getGoogleMapsDirectionsUrl, generateTripGpx } from '../utils/routeCalculator';

interface ItineraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedPlaces: PlaceRecommendation[];
  origin: Province;
  destination: Province;
  vehicle: VehicleType;
  calculationResult: RouteCalculationResult;
  realRouteData: RealRouteData | null;
  originGpsCoords: { lat: number; lng: number } | null;
  onRemovePlace: (placeId: string) => void;
  onMovePlace: (index: number, direction: 'up' | 'down') => void;
  onOptimizeOrder: () => void;
  onAddCustomStop: (name: string, note: string) => void;
  onCopyShareUrl: () => Promise<void>;
  onClearAll: () => void;
  departureTime?: string;
  gangMemberCount?: number;
  customExpensesTotal?: number;
  layoutMode?: 'mobile' | 'desktop';
}

export const ItineraryDrawer: React.FC<ItineraryDrawerProps> = ({
  isOpen,
  onClose,
  savedPlaces,
  origin,
  destination,
  vehicle,
  calculationResult,
  realRouteData,
  originGpsCoords,
  onRemovePlace,
  onMovePlace,
  onOptimizeOrder,
  onAddCustomStop,
  onCopyShareUrl,
  onClearAll,
  departureTime = '06:00',
  gangMemberCount = 4,
  customExpensesTotal = 0,
  layoutMode = 'mobile',
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customNote, setCustomNote] = useState('');

  if (!isOpen) return null;

  const multiStopMapsUrl = getGoogleMapsDirectionsUrl(
    origin,
    destination,
    vehicle,
    savedPlaces,
    originGpsCoords
  );

  const grandTotal = calculationResult.totalTripCostThb + customExpensesTotal;
  const perPerson = Math.ceil(grandTotal / Math.max(1, gangMemberCount));

  const generateShareText = () => {
    const header = `🏁 แผนทริปแก๊ง — Trip Don't Talking\n"ทริปแก็งพูดไม่ได้อย่าไว้ใจททาง อย่าวางใจคน อย่าชนกันเอง"\n📍 เส้นทาง: ${origin.nameTh} ➔ ${destination.nameTh} (${
      vehicle === 'car' ? 'รถยนต์' : 'มอเตอร์ไซค์'
    })\n⏰ นัดล้อหมุน: ${departureTime} น. | 📏 ระยะทาง: ~${calculationResult.estimatedRoadDistanceKm.toLocaleString()} กม. (~${
      calculationResult.durationFormatted
    })\n💰 งบรวมทั้งแก๊ง (${gangMemberCount} คน): ฿${grandTotal.toLocaleString()} (ตกคนละ ~฿${perPerson.toLocaleString()})\n\n📌 ลำดับจุดแวะเช็คอิน (${
      savedPlaces.length
    } แห่ง):\n`;
    const placesText = savedPlaces
      .map(
        (p, idx) =>
          `${idx + 1}. ${p.nameTh} (${p.highlightTag})\n   👉 พิกัด: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${p.nameTh} ${p.lat},${p.lng}`
          )}`
      )
      .join('\n\n');
    return `${header}${placesText}\n\n🧭 ลิงก์นำทางรวดเดียวครบทุกจุดแวะ:\n${multiStopMapsUrl}\n\n🆘 เบอร์ฉุกเฉินติดรถ: ตำรวจทางหลวง 1193 | กรมทางหลวง 1586 | กู้ชีพ 1669`;
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleCopyUrl = async () => {
    await onCopyShareUrl();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadGpx = () => {
    const gpxContent = generateTripGpx(
      origin,
      destination,
      savedPlaces,
      realRouteData?.geometry
    );
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roadtrip-${origin.nameEn.toLowerCase()}-to-${destination.nameEn.toLowerCase()}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    onAddCustomStop(customName.trim(), customNote.trim() || 'จุดแวะกำหนดเอง');
    setCustomName('');
    setCustomNote('');
  };

  const isMobileSheet = layoutMode === 'mobile';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      <div
        className={
          isMobileSheet
            ? 'fixed inset-x-0 bottom-0 max-w-[430px] mx-auto h-[90dvh] flex flex-col'
            : 'fixed inset-y-0 right-0 max-w-full flex pl-10'
        }
      >
        <div
          className={`bg-[#13161D] text-white shadow-2xl flex flex-col justify-between w-full h-full ${
            isMobileSheet
              ? 'rounded-t-3xl border-t border-x border-[#283040]'
              : 'w-screen max-w-md border-l border-[#242A36]'
          }`}
        >
          {/* Mobile Bottom Sheet Grab Handle */}
          {isMobileSheet && (
            <div
              onClick={onClose}
              className="pt-2.5 pb-1 flex justify-center cursor-pointer"
            >
              <div className="w-11 h-1.5 bg-slate-600 rounded-full" />
            </div>
          )}

          {/* Header */}
          <div className="px-4 py-3.5 border-b border-[#232936] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white tracking-tight truncate">
                  แผนทริป & จุดแวะ ({savedPlaces.length})
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {origin.nameTh} ➔ {destination.nameTh}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[#1C202B] hover:bg-[#282F3E] text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 flex-1 overflow-y-auto space-y-3.5">
            {/* Quick Summary */}
            <div className="p-3.5 rounded-xl bg-[#0D0F13] border border-[#262C38] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">พาหนะ & เส้นทาง:</span>
                <span className="font-semibold text-amber-400">
                  {vehicle === 'car' ? '🚗 รถยนต์' : '🏍️ มอเตอร์ไซค์'} (~
                  {calculationResult.estimatedRoadDistanceKm.toLocaleString()} กม.)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">เวลาขับขี่รวม:</span>
                <span className="font-semibold text-emerald-400">
                  ~{calculationResult.durationFormatted}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-[#222734]">
                <span className="text-slate-400">งบรวมทั้งแก๊ง ({gangMemberCount} คน):</span>
                <span className="font-bold text-amber-400 font-mono tabular-nums">
                  ฿{grandTotal.toLocaleString()} (คนละ ~฿{perPerson.toLocaleString()})
                </span>
              </div>
            </div>

            {/* Add Custom Stop Form */}
            <form
              onSubmit={handleAddCustomSubmit}
              className="p-3 rounded-xl bg-[#161A23] border border-[#262D3C] space-y-2"
            >
              <label className="block text-[11px] font-semibold text-slate-300">
                + เพิ่มจุดแวะเอง (ร้านอาหาร / ที่พัก / จุดนัดพบ):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="เช่น ปั๊ม ปตท. เด่นชัย..."
                  className="flex-1 min-h-[40px] bg-[#0D0F13] border border-[#2C3444] rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!customName.trim()}
                  className="min-h-[40px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่ม</span>
                </button>
              </div>
              {customName.trim() && (
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="โน้ตสั้นๆ เช่น แวะทานมื้อเที่ยง / เติมน้ำมัน"
                  className="w-full min-h-[38px] bg-[#0D0F13] border border-[#2C3444] rounded-xl px-3 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
              )}
            </form>

            {/* Saved Places List */}
            {savedPlaces.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <MapPin className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-sm font-medium text-slate-300">ยังไม่มีจุดแวะในแผนทริป</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  กดปุ่ม &ldquo;+ เพิ่มลงทริป&rdquo; จากการ์ดที่เที่ยวหรือปั๊มน้ำมัน เพื่อจัดลำดับนำทางต่อเนื่อง
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    ลำดับจุดแวะ ({savedPlaces.length} แห่ง):
                  </span>
                  <div className="flex items-center gap-2">
                    {savedPlaces.length >= 2 && (
                      <button
                        type="button"
                        onClick={onOptimizeOrder}
                        className="min-h-[34px] inline-flex items-center gap-1 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300 cursor-pointer"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>เรียงไม่ย้อนทาง</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClearAll}
                      className="min-h-[34px] px-2 text-xs text-rose-400 hover:underline cursor-pointer"
                    >
                      ล้างทั้งหมด
                    </button>
                  </div>
                </div>

                {savedPlaces.map((place, idx) => (
                  <div
                    key={place.id}
                    className="p-3 rounded-xl bg-[#181C25] border border-[#272E3D] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-black font-mono tabular-nums text-xs font-extrabold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{place.nameTh}</h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          ✨ {place.highlightTag}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <div className="flex flex-col gap-1 mr-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => onMovePlace(idx, 'up')}
                          className="p-1 rounded bg-[#222835] hover:bg-[#2F3748] disabled:opacity-30 text-slate-300 cursor-pointer"
                          title="เลื่อนขึ้น"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === savedPlaces.length - 1}
                          onClick={() => onMovePlace(idx, 'down')}
                          className="p-1 rounded bg-[#222835] hover:bg-[#2F3748] disabled:opacity-30 text-slate-300 cursor-pointer"
                          title="เลื่อนลง"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          place.nameTh
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-[#222835] hover:bg-emerald-500 hover:text-black text-slate-300 transition-colors"
                        title="ดูใน Google Maps"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => onRemovePlace(place.id)}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-[#222835] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="ลบออกจากทริป"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Multi-Stop Export & Navigation */}
          <div className="p-4 border-t border-[#232936] space-y-2 bg-[#0F1117]">
            <a
              href={multiStopMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[46px] flex items-center justify-center gap-2 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              <Navigation className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {savedPlaces.length > 0
                  ? `เปิดนำทาง Google Maps ครบ ${savedPlaces.length} จุดแวะ`
                  : 'เปิดนำทางต้นทาง-ปลายทางใน Google Maps'}
              </span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="min-h-[40px] flex items-center justify-center gap-1.5 px-3 bg-[#1A1F2B] hover:bg-[#242B3B] border border-[#2E3646] text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>คัดลอกลิงก์</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadGpx}
                className="min-h-[40px] flex items-center justify-center gap-1.5 px-3 bg-[#1A1F2B] hover:bg-[#242B3B] border border-[#2E3646] text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>ไฟล์ .GPX</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyText}
              disabled={savedPlaces.length === 0}
              className="w-full min-h-[42px] flex items-center justify-center gap-2 px-4 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 disabled:opacity-40 text-amber-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'คัดลอกข้อความแล้ว!' : 'คัดลอกข้อความสรุปทริปส่ง Line'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
