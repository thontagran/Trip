import React, { useState, useMemo } from 'react';
import {
  Clock,
  Receipt,
  ClipboardCheck,
  PhoneCall,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Users,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import {
  Province,
  VehicleType,
  RouteCalculationResult,
  DestinationWeather,
  GangExpenseItem,
  GangChecklistItem,
} from '../types';

interface GangCommandCenterProps {
  origin: Province;
  destination: Province;
  vehicle: VehicleType;
  calculationResult: RouteCalculationResult;
  weather: DestinationWeather | null;
  savedPlacesCount: number;
  gangMemberCount: number;
  onGangMemberCountChange: (count: number) => void;
  departureTime: string;
  onDepartureTimeChange: (time: string) => void;
  expenses: GangExpenseItem[];
  onAddExpense: (title: string, amountThb: number, paidBy: string) => void;
  onRemoveExpense: (id: string) => void;
  checklist: GangChecklistItem[];
  onToggleChecklist: (id: string) => void;
  onAddChecklistItem: (label: string) => void;
  onRemoveChecklistItem: (id: string) => void;
  onResetChecklist: () => void;
}

const EMERGENCY_HOTLINES = [
  { number: '1193', label: 'ตำรวจทางหลวง', desc: 'อุบัติเหตุ-เหตุด่วนบนทางหลวง' },
  { number: '1586', label: 'กรมทางหลวง', desc: 'สอบถามเส้นทาง / รถเสียริมทาง' },
  { number: '1669', label: 'กู้ชีพฉุกเฉิน', desc: 'เจ็บป่วยฉุกเฉินทั่วไทย 24 ชม.' },
  { number: '1155', label: 'ตำรวจท่องเที่ยว', desc: 'เหตุด่วนในพื้นที่ท่องเที่ยว' },
  { number: '1197', label: 'ข้อมูลจราจร', desc: 'เช็กสภาพถนนและจุดรถติด' },
];

const QUICK_EXPENSE_PRESETS = [
  { label: '+ ค่าที่พัก', title: 'ค่าที่พัก / โฮมสเตย์', amount: 2400 },
  { label: '+ หมูกระทะ', title: 'หมูกระทะ & เสบียงมื้อเย็น', amount: 1200 },
  { label: '+ กาแฟ', title: 'ค่ากาแฟ & เครื่องดื่มระหว่างทาง', amount: 450 },
  { label: '+ ค่าอุทยาน', title: 'ค่าธรรมเนียมเข้าสถานที่', amount: 300 },
];

function formatMinutesFromMidnight(totalMins: number): { timeStr: string; dayOffset: number } {
  const normalized = ((totalMins % 1440) + 1440) % 1440;
  const dayOffset = Math.floor(totalMins / 1440);
  const hh = String(Math.floor(normalized / 60)).padStart(2, '0');
  const mm = String(normalized % 60).padStart(2, '0');
  return { timeStr: `${hh}:${mm} น.`, dayOffset };
}

export const GangCommandCenter: React.FC<GangCommandCenterProps> = ({
  origin,
  destination,
  vehicle,
  calculationResult,
  weather,
  savedPlacesCount,
  gangMemberCount,
  onGangMemberCountChange,
  departureTime,
  onDepartureTimeChange,
  expenses,
  onAddExpense,
  onRemoveExpense,
  checklist,
  onToggleChecklist,
  onAddChecklistItem,
  onRemoveChecklistItem,
  onResetChecklist,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'expenses' | 'checklist'>('timeline');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaidBy, setExpensePaidBy] = useState('');
  const [copiedBill, setCopiedBill] = useState(false);
  const [newCheckText, setNewCheckText] = useState('');

  const timelineStats = useMemo(() => {
    const [hStr, mStr] = (departureTime || '06:00').split(':');
    const startMins = (parseInt(hStr, 10) || 6) * 60 + (parseInt(mStr, 10) || 0);

    const oneWayDriveMins = calculationResult.isRoundTrip
      ? Math.round(calculationResult.estimatedDurationMinutes / 2)
      : calculationResult.estimatedDurationMinutes;

    const restBreakMins = calculationResult.restStopsCount * 20;
    const sightseeingMins = savedPlacesCount * 50;
    const totalOutboundMins = oneWayDriveMins + restBreakMins + sightseeingMins;

    const arrival = formatMinutesFromMidnight(startMins + totalOutboundMins);
    const arrivalHour = Math.floor(((((startMins + totalOutboundMins) % 1440) + 1440) % 1440) / 60);
    const isNightArrival = arrivalHour >= 18 || arrivalHour < 5 || arrival.dayOffset > 0;

    return {
      oneWayDriveMins,
      restBreakMins,
      sightseeingMins,
      totalOutboundMins,
      arrivalTimeStr: arrival.timeStr,
      dayOffset: arrival.dayOffset,
      isNightArrival,
    };
  }, [
    departureTime,
    calculationResult.estimatedDurationMinutes,
    calculationResult.isRoundTrip,
    calculationResult.restStopsCount,
    savedPlacesCount,
  ]);

  const visibleChecklist = useMemo(
    () => checklist.filter((item) => item.vehicleScope === 'both' || item.vehicleScope === vehicle),
    [checklist, vehicle]
  );

  const completedChecks = visibleChecklist.filter((i) => i.checked).length;
  const readinessPercent =
    visibleChecklist.length > 0 ? Math.round((completedChecks / visibleChecklist.length) * 100) : 0;

  const customExpensesTotal = useMemo(
    () => expenses.reduce((sum, item) => sum + item.amountThb, 0),
    [expenses]
  );
  const grandTotalGangThb = calculationResult.totalTripCostThb + customExpensesTotal;
  const perMemberShareThb = Math.ceil(grandTotalGangThb / Math.max(1, gangMemberCount));

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Math.max(0, parseInt(expenseAmount, 10) || 0);
    if (!expenseTitle.trim() || amount <= 0) return;
    onAddExpense(expenseTitle.trim(), amount, expensePaidBy.trim() || 'กองกลาง');
    setExpenseTitle('');
    setExpenseAmount('');
    setExpensePaidBy('');
  };

  const handleCopyGangBill = async () => {
    const lines = [
      `🧾 สรุปหารค่าทริป — Trip Don't Talking`,
      `เส้นทาง: ${origin.nameTh} ➔ ${destination.nameTh} (${vehicle === 'car' ? 'รถยนต์' : 'มอเตอร์ไซค์'})`,
      `สมาชิกแก๊ง: ${gangMemberCount} คน`,
      `--------------------------`,
      `• ค่าน้ำมัน${calculationResult.isRoundTrip ? ' (ไป-กลับ)' : ''}: ฿${calculationResult.fuelCostThb.toLocaleString()}`,
    ];

    if (calculationResult.extraCostThb > 0) {
      lines.push(`• งบเดินทางเสริม/ทางด่วน: ฿${calculationResult.extraCostThb.toLocaleString()}`);
    }

    expenses.forEach((item) => {
      lines.push(`• ${item.title}: ฿${item.amountThb.toLocaleString()} (จ่ายโดย: ${item.paidBy})`);
    });

    lines.push(
      `--------------------------`,
      `💰 รวมทั้งหมด: ฿${grandTotalGangThb.toLocaleString()} บาท`,
      `👉 หารตกคนละ: ฿${perMemberShareThb.toLocaleString()} บาท/คน`
    );

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedBill(true);
      setTimeout(() => setCopiedBill(false), 2200);
    } catch {
      // Ignore clipboard permission denial
    }
  };

  const handleAddCheckSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckText.trim()) return;
    onAddChecklistItem(newCheckText.trim());
    setNewCheckText('');
  };

  return (
    <section className="bg-[#14171E] border border-[#262B36] rounded-2xl p-4 @3xl:p-6 shadow-xl">
      {/* Top Bar & 3-Column Mobile Segmented Control */}
      <div className="space-y-3.5 pb-4 border-b border-[#222733]">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            ศูนย์บัญชาการทริปแก๊ง
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            เวลานัดล้อหมุน · เบอร์ฉุกเฉิน · หารบิลกองกลาง · เช็กลิสต์รถ
          </p>
        </div>

        {/* 3-Column Thumb-Zone Segmented Switch */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#0D0F14] border border-[#252B37] rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`min-h-[42px] px-2 rounded-lg text-[11px] font-semibold flex flex-col @2xl:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-amber-500 text-black font-bold shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">ล้อหมุน & SOS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`min-h-[42px] px-2 rounded-lg text-[11px] font-semibold flex flex-col @2xl:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-amber-500 text-black font-bold shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">หารบิล (฿{perMemberShareThb.toLocaleString()})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`min-h-[42px] px-2 rounded-lg text-[11px] font-semibold flex flex-col @2xl:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'checklist'
                ? 'bg-emerald-500 text-black font-bold shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              เช็กรถ ({completedChecks}/{visibleChecklist.length})
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: Departure Time, Arrival ETA & Highway Emergency Hotlines */}
      {activeTab === 'timeline' && (
        <div className="pt-4 grid grid-cols-1 @4xl:grid-cols-12 gap-4 items-start">
          <div className="@4xl:col-span-7 space-y-3.5">
            <div className="bg-[#0E1117] border border-[#232936] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="departure-time-input"
                  className="text-xs font-semibold text-slate-200"
                >
                  เวลานัดล้อหมุน ({origin.nameTh})
                </label>
                <input
                  id="departure-time-input"
                  type="time"
                  value={departureTime}
                  onChange={(e) => onDepartureTimeChange(e.target.value || '06:00')}
                  className="min-h-[38px] bg-[#161B24] border border-[#2E3544] rounded-xl px-3 py-1 text-sm font-mono tabular-nums text-amber-400 font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {['05:00', '06:30', '08:00', '10:00'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onDepartureTimeChange(preset)}
                    className={`min-h-[36px] rounded-lg text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                      departureTime === preset
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                        : 'bg-[#141821] text-slate-400 hover:text-slate-200 border border-[#242A36]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* 2x2 Mobile ETA Breakdown */}
            <div className="grid grid-cols-2 @2xl:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-[#0E1117] border border-[#232936]">
                <div className="text-[11px] text-slate-400">ล้อหมุนออกตัว</div>
                <div className="text-base font-bold text-white font-mono tabular-nums mt-0.5">
                  {departureTime} น.
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">{origin.nameTh}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#0E1117] border border-[#232936]">
                <div className="text-[11px] text-slate-400">ขับขี่บนถนนจริง</div>
                <div className="text-base font-bold text-slate-200 font-mono tabular-nums mt-0.5">
                  {Math.floor(timelineStats.oneWayDriveMins / 60)} ชม.{' '}
                  {timelineStats.oneWayDriveMins % 60} น.
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  พักปั๊ม +{timelineStats.restBreakMins} นาที
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0E1117] border border-[#232936]">
                <div className="text-[11px] text-slate-400">แวะจุดเช็คอิน</div>
                <div className="text-base font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
                  {savedPlacesCount} จุด
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  เผื่อแวะ ~{timelineStats.sightseeingMins} นาที
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0E1117] border border-amber-500/35">
                <div className="text-[11px] text-amber-300/90">ถึงปลายทางราว</div>
                <div className="text-base font-bold text-amber-400 font-mono tabular-nums mt-0.5">
                  {timelineStats.arrivalTimeStr}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {timelineStats.dayOffset > 0
                    ? `ข้ามวัน (+${timelineStats.dayOffset} วัน)`
                    : destination.nameTh}
                </div>
              </div>
            </div>

            {timelineStats.isNightArrival && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold">แจ้งเตือนแก๊ง: มีโอกาสถึงปลายทางช่วงค่ำมืด</span>{' '}
                  — หลัง 18:00 น. ทัศนวิสัยต่ำ แนะนำออกเช้าขึ้นหรือลดจุดแวะระหว่างทาง
                </div>
              </div>
            )}
          </div>

          {/* Click-to-call Thai Roadtrip SOS Numbers ( >= 52px Mobile Tap Rows ) */}
          <div className="@4xl:col-span-5 bg-[#0E1117] border border-[#232936] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <h4 className="text-xs font-bold text-white">
                  เบอร์ฉุกเฉินติดรถ (แตะโทรออกทันที)
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-2">
              {EMERGENCY_HOTLINES.map((item) => (
                <a
                  key={item.number}
                  href={`tel:${item.number}`}
                  className="min-h-[52px] px-3 py-2 rounded-xl bg-[#151922] hover:bg-[#1D2330] active:scale-[0.98] border border-[#262D3B] transition-all flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{item.desc}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 inline-flex items-center gap-1.5 text-xs font-mono tabular-nums font-bold text-emerald-300 shrink-0">
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                    {item.number}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Gang Expense & Bill Splitter */}
      {activeTab === 'expenses' && (
        <div className="pt-4 grid grid-cols-1 @4xl:grid-cols-12 gap-4 items-start">
          <div className="@4xl:col-span-7 space-y-3">
            {/* Horizontal touch presets */}
            <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-0.5 -mx-1 px-1">
              {QUICK_EXPENSE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onAddExpense(preset.title, preset.amount, 'กองกลาง')}
                  className="min-h-[36px] shrink-0 px-3 rounded-xl bg-[#0E1117] hover:bg-[#1A202C] border border-[#272E3D] text-xs text-slate-200 transition-colors cursor-pointer"
                >
                  {preset.label} (฿{preset.amount.toLocaleString()})
                </button>
              ))}
            </div>

            {/* Mobile-Friendly Expense Form */}
            <form onSubmit={handleAddExpenseSubmit} className="space-y-2 bg-[#0E1117] p-3 rounded-xl border border-[#232936]">
              <input
                type="text"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                placeholder="ชื่อรายการ เช่น ค่าพูลวิลล่า / หมูกระทะ..."
                className="w-full min-h-[42px] bg-[#151923] border border-[#2B3242] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="1"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="จำนวนเงิน (บาท)"
                  className="min-h-[42px] bg-[#151923] border border-[#2B3242] rounded-xl px-3 py-2 text-xs text-white font-mono tabular-nums placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={expensePaidBy}
                  onChange={(e) => setExpensePaidBy(e.target.value)}
                  placeholder="คนจ่าย (เช่น กองกลาง)"
                  className="min-h-[42px] bg-[#151923] border border-[#2B3242] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!expenseTitle.trim() || !expenseAmount}
                className="w-full min-h-[42px] rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มรายการเข้ากองกลาง</span>
              </button>
            </form>

            {/* Expense Breakdown Rows */}
            <div className="divide-y divide-[#202633] border border-[#232936] rounded-xl bg-[#0E1117]">
              <div className="px-3.5 py-3 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-200 block truncate">
                    ค่าน้ำมันตามระยะทางจริง ({calculationResult.estimatedRoadDistanceKm.toLocaleString()} กม.)
                  </span>
                  <span className="text-[11px] text-slate-500">ซิงค์อัตโนมัติจากหมวดเส้นทาง</span>
                </div>
                <span className="font-mono tabular-nums font-bold text-amber-400 shrink-0">
                  ฿{calculationResult.fuelCostThb.toLocaleString()}
                </span>
              </div>

              {calculationResult.extraCostThb > 0 && (
                <div className="px-3.5 py-3 flex items-center justify-between text-xs">
                  <span className="text-slate-300">ค่าทางด่วน / งบเสริม</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-200">
                    ฿{calculationResult.extraCostThb.toLocaleString()}
                  </span>
                </div>
              )}

              {expenses.map((item) => (
                <div
                  key={item.id}
                  className="px-3.5 py-3 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-white block truncate">{item.title}</span>
                    <span className="text-[11px] text-slate-400">จ่ายโดย {item.paidBy}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono tabular-nums font-semibold text-emerald-400">
                      ฿{item.amountThb.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveExpense(item.id)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
                      title="ลบรายการ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-Person Summary & Copy Line Bill */}
          <div className="@4xl:col-span-5 bg-[#0E1117] border border-[#232936] rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                <span>สมาชิกที่ร่วมหาร:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onGangMemberCountChange(Math.max(1, gangMemberCount - 1))}
                  className="min-h-[38px] min-w-[38px] rounded-xl bg-[#191E28] border border-[#2D3546] text-white text-base font-bold cursor-pointer"
                >
                  −
                </button>
                <span className="min-w-[44px] text-center font-mono tabular-nums text-sm font-bold text-amber-400">
                  {gangMemberCount} คน
                </span>
                <button
                  type="button"
                  onClick={() => onGangMemberCountChange(Math.min(20, gangMemberCount + 1))}
                  className="min-h-[38px] min-w-[38px] rounded-xl bg-[#191E28] border border-[#2D3546] text-white text-base font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-[#202633] flex items-baseline justify-between">
              <div>
                <div className="text-[11px] text-slate-400">งบรวมทั้งแก๊ง</div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-200">
                  ฿{grandTotalGangThb.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-amber-300">หารเฉลี่ยคนละ</div>
                <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-400">
                  ฿{perMemberShareThb.toLocaleString()}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyGangBill}
              className="w-full min-h-[46px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-black text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copiedBill ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>
                {copiedBill
                  ? 'คัดลอกบิลแล้ว ส่งเข้ากลุ่มได้เลย!'
                  : 'คัดลอกบิลหารค่าทริปส่งกลุ่ม Line'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Pre-Ride Vehicle & Gang Readiness Checklist */}
      {activeTab === 'checklist' && (
        <div className="pt-4 space-y-3.5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">
                ความพร้อม ({vehicle === 'motorcycle' ? 'แก๊งสองล้อ' : 'แก๊งสี่ล้อ'}):{' '}
                <span className="text-emerald-400 font-mono tabular-nums">
                  {completedChecks}/{visibleChecklist.length} ({readinessPercent}%)
                </span>
              </span>
              <button
                type="button"
                onClick={onResetChecklist}
                className="min-h-[34px] px-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-amber-300 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ต</span>
              </button>
            </div>
            <div className="w-full h-2 rounded-full bg-[#0D0F14] overflow-hidden border border-[#242A36]">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${readinessPercent}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleAddCheckSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={newCheckText}
              onChange={(e) => setNewCheckText(e.target.value)}
              placeholder="เพิ่มของต้องพก เช่น สายพ่วง, ยาดม..."
              className="flex-1 min-h-[42px] bg-[#0D0F14] border border-[#2B3242] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newCheckText.trim()}
              className="min-h-[42px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black text-xs font-bold cursor-pointer shrink-0"
            >
              + เพิ่ม
            </button>
          </form>

          {weather && weather.rainChancePercent >= 40 && (
            <div className="px-3.5 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                พยากรณ์อากาศที่ {destination.nameTh} มีโอกาสฝนตก{' '}
                <strong className="font-mono tabular-nums">{weather.rainChancePercent}%</strong> —
                อย่าลืมเช็กเสื้อกันฝนและถุงกันน้ำคลุมสัมภาระ!
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-3 gap-2">
            {visibleChecklist.map((item) => (
              <div
                key={item.id}
                onClick={() => onToggleChecklist(item.id)}
                className={`min-h-[50px] px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 active:scale-[0.99] ${
                  item.checked
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                    : 'bg-[#0E1117] hover:bg-[#151A24] border-[#242B38] text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                      item.checked
                        ? 'bg-emerald-500 border-emerald-500 text-black'
                        : 'border-slate-500'
                    }`}
                  >
                    {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </span>
                  <span
                    className={`text-xs leading-snug ${
                      item.checked ? 'line-through text-slate-400' : 'text-slate-100'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>

                {item.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveChecklistItem(item.id);
                    }}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 hover:text-rose-400 cursor-pointer shrink-0"
                    title="ลบรายการ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
