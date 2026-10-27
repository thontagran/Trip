import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Compass,
  Navigation,
  Fuel,
  Sparkles,
  ShieldAlert,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import {
  Province,
  VehicleType,
  LifestyleType,
  PlaceRecommendation,
  DestinationWeather,
  RealRouteData,
  FuelPricesResponse,
  ThaiFuelPriceItem,
  GangExpenseItem,
  GangChecklistItem,
  GasStationStop,
} from './types';
import { PROVINCES } from './data/provinces';
import { calculateTripRoute, optimizeWaypointsOrder } from './utils/routeCalculator';
import {
  fetchLifestylePlacesFromGemini,
  fetchRealPlacePhoto,
  fetchDestinationWeather,
  fetchRealRoadRoute,
  fetchThaiFuelPrices,
  fetchRouteGasStations,
} from './services/geminiService';
import { Header } from './components/Header';
import { RoutePlanner } from './components/RoutePlanner';
import { FuelCalculator } from './components/FuelCalculator';
import { WeatherCard } from './components/WeatherCard';
import { LifestyleSelector } from './components/LifestyleSelector';
import { PlaceGrid } from './components/PlaceGrid';
import { MapPreview } from './components/MapPreview';
import { ItineraryDrawer } from './components/ItineraryDrawer';
import { GangCommandCenter } from './components/GangCommandCenter';
import { GasStationFinder } from './components/GasStationFinder';

const STORAGE_KEY = 'super_roadtrip_th_state_v2';

type MobileTabId = 'route' | 'map' | 'places' | 'gang';

const DEFAULT_GANG_CHECKLIST: GangChecklistItem[] = [
  { id: 'chk-tire', label: 'เช็กลมยาง ดอกยาง และสภาพล้อหน้า-หลัง', checked: false, vehicleScope: 'both' },
  { id: 'chk-brake', label: 'ตรวจผ้าเบรก น้ำมันเบรก และระบบไฟส่องสว่าง/ไฟเลี้ยว', checked: false, vehicleScope: 'both' },
  { id: 'chk-doc', label: 'พกใบขับขี่ สำเนาเล่มทะเบียน พ.ร.บ. และประกันรถ', checked: false, vehicleScope: 'both' },
  { id: 'chk-power', label: 'พาวเวอร์แบงก์ สายชาร์จ และที่จับมือถือกันสั่นพร้อมนำทาง', checked: false, vehicleScope: 'both' },
  { id: 'chk-chain', label: 'หยอดน้ำมันโซ่ เช็กความตึงโซ่-สเตอร์ และชุดปะยางแทงไหม', checked: false, vehicleScope: 'motorcycle' },
  { id: 'chk-rain', label: 'ติดเสื้อกันฝน ถุงคลุมกระเป๋ากันน้ำ และชิลด์หมวกสะอาด', checked: false, vehicleScope: 'motorcycle' },
  { id: 'chk-comms', label: 'เชื่อมบลูทูธหมวกกันน็อก / นัดสัญญาณมือเวลานำขบวนแก๊ง', checked: false, vehicleScope: 'motorcycle' },
  { id: 'chk-spare', label: 'ตรวจยางอะไหล่ แม่แรง สายพ่วงแบตเตอรี่ และไฟฉายติดรถ', checked: false, vehicleScope: 'car' },
  { id: 'chk-fluids', label: 'เช็กน้ำยาหล่อเย็น น้ำฉีดกระจก และใบปัดน้ำฝน', checked: false, vehicleScope: 'car' },
  { id: 'chk-pass', label: 'เติมเงินบัตร Easy Pass / M-Pass และเตรียมยาดม-ยาแก้เมารถ', checked: false, vehicleScope: 'car' },
];

function loadInitialSavedState() {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlFrom = params.get('from');
    const urlTo = params.get('to');
    const urlVehicle = params.get('v') as VehicleType | null;
    const urlStyle = params.get('style') as LifestyleType | null;

    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};

    return {
      originId: urlFrom || stored.originId || 'TH-10',
      destId: urlTo || stored.destId || 'TH-55',
      vehicle:
        urlVehicle === 'car' || urlVehicle === 'motorcycle'
          ? urlVehicle
          : (stored.vehicle as VehicleType) || 'motorcycle',
      lifestyle:
        urlStyle && ['nature', 'cafe', 'adventure', 'culture'].includes(urlStyle)
          ? urlStyle
          : (stored.lifestyle as LifestyleType) || 'nature',
      fuelConsumption: typeof stored.fuelConsumption === 'number' ? stored.fuelConsumption : 33,
      fuelPrice: typeof stored.fuelPrice === 'number' ? stored.fuelPrice : 35.85,
      extraCostThb: typeof stored.extraCostThb === 'number' ? stored.extraCostThb : 0,
      isRoundTrip: Boolean(stored.isRoundTrip),
      savedPlaces: Array.isArray(stored.savedPlaces) ? stored.savedPlaces : [],
      gangMemberCount: typeof stored.gangMemberCount === 'number' ? stored.gangMemberCount : 4,
      departureTime: typeof stored.departureTime === 'string' ? stored.departureTime : '06:00',
      gangExpenses: Array.isArray(stored.gangExpenses) ? stored.gangExpenses : [],
      gangChecklist:
        Array.isArray(stored.gangChecklist) && stored.gangChecklist.length > 0
          ? stored.gangChecklist
          : DEFAULT_GANG_CHECKLIST,
    };
  } catch {
    return {
      originId: 'TH-10',
      destId: 'TH-55',
      vehicle: 'motorcycle' as VehicleType,
      lifestyle: 'nature' as LifestyleType,
      fuelConsumption: 33,
      fuelPrice: 35.85,
      extraCostThb: 0,
      isRoundTrip: false,
      savedPlaces: [] as PlaceRecommendation[],
      gangMemberCount: 4,
      departureTime: '06:00',
      gangExpenses: [] as GangExpenseItem[],
      gangChecklist: DEFAULT_GANG_CHECKLIST,
    };
  }
}

export default function App() {
  const initial = useMemo(() => loadInitialSavedState(), []);

  // Mobile Phone Viewport Shell on Desktop (defaulted to 'mobile' 430px per user request)
  const [layoutMode, setLayoutMode] = useState<'mobile' | 'desktop'>('mobile');
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTabId>('route');

  // 1. Core Trip States
  const [origin, setOrigin] = useState<Province>(
    () => PROVINCES.find((p) => p.id === initial.originId) || PROVINCES[0]
  );
  const [originGpsCoords, setOriginGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState<Province>(
    () => PROVINCES.find((p) => p.id === initial.destId) || PROVINCES[1]
  );
  const [vehicle, setVehicle] = useState<VehicleType>(initial.vehicle);
  const [lifestyle, setLifestyle] = useState<LifestyleType>(initial.lifestyle);

  // 2. Real Highway Route States
  const [realRouteData, setRealRouteData] = useState<RealRouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [includeWaypointsInRoute, setIncludeWaypointsInRoute] = useState<boolean>(true);

  // 3. Fuel & Budget States
  const [fuelConsumption, setFuelConsumption] = useState<number>(initial.fuelConsumption);
  const [fuelPrice, setFuelPrice] = useState<number>(initial.fuelPrice);
  const [extraCostThb, setExtraCostThb] = useState<number>(initial.extraCostThb);
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(initial.isRoundTrip);
  const [fuelPricesData, setFuelPricesData] = useState<FuelPricesResponse | null>(null);
  const [selectedFuelTypeId, setSelectedFuelTypeId] = useState<string>('gsh95');

  // 4. Places & Live Weather States
  const [places, setPlaces] = useState<PlaceRecommendation[]>([]);
  const [placesLoading, setPlacesLoading] = useState<boolean>(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [focusedPlace, setFocusedPlace] = useState<PlaceRecommendation | null>(null);
  const placesAbortRef = useRef<AbortController | null>(null);

  // En-route Gas Stations States
  const [gasStations, setGasStations] = useState<GasStationStop[]>([]);
  const [gasStationsLoading, setGasStationsLoading] = useState<boolean>(false);
  const [focusedGasStation, setFocusedGasStation] = useState<GasStationStop | null>(null);
  const gasAbortRef = useRef<AbortController | null>(null);

  const [weather, setWeather] = useState<DestinationWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);

  // 5. Persistent Saved Itinerary & Gang Command Center States
  const [savedPlaces, setSavedPlaces] = useState<PlaceRecommendation[]>(initial.savedPlaces);
  const [isItineraryOpen, setIsItineraryOpen] = useState<boolean>(false);
  const [gangMemberCount, setGangMemberCount] = useState<number>(initial.gangMemberCount);
  const [departureTime, setDepartureTime] = useState<string>(initial.departureTime);
  const [gangExpenses, setGangExpenses] = useState<GangExpenseItem[]>(initial.gangExpenses);
  const [gangChecklist, setGangChecklist] = useState<GangChecklistItem[]>(initial.gangChecklist);

  // Persist user trip state automatically to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          originId: origin.id,
          destId: destination.id,
          vehicle,
          lifestyle,
          fuelConsumption,
          fuelPrice,
          extraCostThb,
          isRoundTrip,
          savedPlaces,
          gangMemberCount,
          departureTime,
          gangExpenses,
          gangChecklist,
        })
      );
    } catch {
      // Ignore quota errors
    }
  }, [
    origin.id,
    destination.id,
    vehicle,
    lifestyle,
    fuelConsumption,
    fuelPrice,
    extraCostThb,
    isRoundTrip,
    savedPlaces,
    gangMemberCount,
    departureTime,
    gangExpenses,
    gangChecklist,
  ]);

  // Load live Thai oil prices on startup
  useEffect(() => {
    fetchThaiFuelPrices().then((data) => {
      if (data && data.prices.length > 0) {
        setFuelPricesData(data);
        const defaultFuel = data.prices.find((p) => p.id === 'gsh95') || data.prices[0];
        if (defaultFuel) {
          setSelectedFuelTypeId(defaultFuel.id);
          setFuelPrice(defaultFuel.priceThb);
        }
      }
    });
  }, []);

  // Load real road network distance & polyline from OSRM
  useEffect(() => {
    let cancelled = false;
    setRouteLoading(true);

    const startPoint = originGpsCoords || { lat: origin.lat, lng: origin.lng };
    const waypointsCoords =
      includeWaypointsInRoute && savedPlaces.length > 0
        ? savedPlaces.slice(0, 9).map((p) => ({ lat: p.lat, lng: p.lng }))
        : [];

    const coords = [startPoint, ...waypointsCoords, { lat: destination.lat, lng: destination.lng }];

    fetchRealRoadRoute(coords).then((route) => {
      if (!cancelled) {
        setRealRouteData(route);
        setRouteLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    origin.id,
    originGpsCoords,
    destination.id,
    includeWaypointsInRoute,
    savedPlaces,
  ]);

  // One-way road distance in km
  const oneWayRoadKm = useMemo(() => {
    if (realRouteData) {
      return realRouteData.distanceKm;
    }
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(destination.lat - origin.lat);
    const dLon = toRad(destination.lng - origin.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(origin.lat)) * Math.cos(toRad(destination.lat)) * Math.sin(dLon / 2) ** 2;
    const straightKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.max(5, Math.round(straightKm * 1.28));
  }, [realRouteData, origin, destination]);

  // Fetch real gas stations along the highway polyline
  const loadGasStations = useCallback(async () => {
    gasAbortRef.current?.abort();
    const controller = new AbortController();
    gasAbortRef.current = controller;

    setGasStationsLoading(true);
    setFocusedGasStation(null);

    const startLat = originGpsCoords ? originGpsCoords.lat : origin.lat;
    const startLng = originGpsCoords ? originGpsCoords.lng : origin.lng;

    try {
      const stations = await fetchRouteGasStations({
        origin: { id: origin.id, nameTh: origin.nameTh, lat: startLat, lng: startLng },
        destination: {
          id: destination.id,
          nameTh: destination.nameTh,
          lat: destination.lat,
          lng: destination.lng,
        },
        geometry: realRouteData?.geometry,
        totalDistanceKm: oneWayRoadKm,
        signal: controller.signal,
      });

      if (!controller.signal.aborted) {
        setGasStations(stations);
        setGasStationsLoading(false);
      }
    } catch {
      if (!controller.signal.aborted) {
        setGasStations([]);
        setGasStationsLoading(false);
      }
    }
  }, [origin, originGpsCoords, destination, realRouteData, oneWayRoadKm]);

  useEffect(() => {
    if (routeLoading) return;
    loadGasStations();
    return () => {
      gasAbortRef.current?.abort();
    };
  }, [origin.id, destination.id, realRouteData, routeLoading]);

  const handleVehicleChange = (newVehicle: VehicleType) => {
    setVehicle(newVehicle);
    if (newVehicle === 'car') {
      setFuelConsumption(14);
    } else {
      setFuelConsumption(33);
      if (selectedFuelTypeId === 'diesel' && fuelPricesData) {
        const gsh95 = fuelPricesData.prices.find((f) => f.id === 'gsh95');
        if (gsh95) {
          setSelectedFuelTypeId(gsh95.id);
          setFuelPrice(gsh95.priceThb);
        }
      }
    }
  };

  const handleSelectFuelType = (item: ThaiFuelPriceItem) => {
    setSelectedFuelTypeId(item.id);
    setFuelPrice(item.priceThb);
  };

  const routeCalculation = useMemo(() => {
    return calculateTripRoute({
      origin,
      destination,
      vehicle,
      fuelConsumptionKmPerLitre: fuelConsumption,
      fuelPricePerLitre: fuelPrice,
      extraCostThb,
      isRoundTrip,
      realRouteData,
      waypointsIncludedCount: includeWaypointsInRoute ? savedPlaces.length : 0,
    });
  }, [
    origin,
    destination,
    vehicle,
    fuelConsumption,
    fuelPrice,
    extraCostThb,
    isRoundTrip,
    realRouteData,
    includeWaypointsInRoute,
    savedPlaces.length,
  ]);

  const loadPlaces = useCallback(
    async (forceRefresh = false) => {
      placesAbortRef.current?.abort();
      const controller = new AbortController();
      placesAbortRef.current = controller;

      setPlacesLoading(true);
      setPlacesError(null);
      setFocusedPlace(null);

      try {
        const results = await fetchLifestylePlacesFromGemini({
          destination,
          lifestyle,
          vehicle,
          forceRefresh,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setPlaces(results);
        setPlacesLoading(false);

        const pendingPhotos = results
          .map((place, index) => ({ place, index }))
          .filter(({ place }) => !place.imageUrl || place.imageLoading);

        const CONCURRENCY = 3;
        let cursor = 0;

        const runWorker = async () => {
          while (cursor < pendingPhotos.length && !controller.signal.aborted) {
            const currentIdx = cursor++;
            const item = pendingPhotos[currentIdx];
            if (!item) break;

            const photo = await fetchRealPlacePhoto({
              placeNameTh: item.place.nameTh,
              placeNameEn: item.place.nameEn,
              provinceNameTh: destination.nameTh,
              provinceNameEn: destination.nameEn,
              lifestyle,
              index: item.index,
            });

            if (controller.signal.aborted) return;

            setPlaces((prev) =>
              prev.map((p) =>
                p.id === item.place.id
                  ? {
                      ...p,
                      imageUrl: photo.imageUrl,
                      photoSource: photo.photoSource,
                      wikiUrl: photo.wikiUrl,
                      imageLoading: false,
                    }
                  : p
              )
            );
          }
        };

        await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, pendingPhotos.length) }, () => runWorker())
        );
      } catch (err: unknown) {
        if (
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === 'AbortError') ||
          (err instanceof Error && err.name === 'AbortError')
        ) {
          return;
        }
        const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานที่';
        setPlacesError(msg);
        setPlacesLoading(false);
      }
    },
    [destination, lifestyle, vehicle]
  );

  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const data = await fetchDestinationWeather({ destination });
      setWeather(data);
    } finally {
      setWeatherLoading(false);
    }
  }, [destination]);

  useEffect(() => {
    loadPlaces(false);
    loadWeather();
    return () => {
      placesAbortRef.current?.abort();
    };
  }, [destination.id, lifestyle]);

  const handleOriginChange = (prov: Province, gpsCoords?: { lat: number; lng: number } | null) => {
    setOrigin(prov);
    setOriginGpsCoords(gpsCoords ?? null);
  };

  const handleSwapProvinces = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
    setOriginGpsCoords(null);
  };

  const handleSelectPreset = (originId: string, destId: string, presetVehicle: VehicleType) => {
    const orig = PROVINCES.find((p) => p.id === originId);
    const dest = PROVINCES.find((p) => p.id === destId);
    if (orig) setOrigin(orig);
    if (dest) setDestination(dest);
    setOriginGpsCoords(null);
    handleVehicleChange(presetVehicle);
  };

  // Saved Itinerary Actions
  const savedPlaceIds = useMemo(() => new Set(savedPlaces.map((p) => p.id)), [savedPlaces]);

  const handleToggleSavePlace = useCallback((place: PlaceRecommendation) => {
    setSavedPlaces((prev) => {
      const exists = prev.some((p) => p.id === place.id);
      if (exists) {
        return prev.filter((p) => p.id !== place.id);
      }
      return [...prev, place];
    });
  }, []);

  const handleMoveSavedPlace = (index: number, direction: 'up' | 'down') => {
    setSavedPlaces((prev) => {
      const next = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(targetIdx, 0, item);
      return next;
    });
  };

  const handleOptimizeSavedOrder = () => {
    setSavedPlaces((prev) => optimizeWaypointsOrder(origin, destination, prev));
  };

  const handleAddCustomStop = (name: string, note: string) => {
    const offset = (savedPlaces.length + 1) * 0.012;
    const customPlace: PlaceRecommendation = {
      id: `custom-${Date.now()}`,
      nameTh: name,
      nameEn: name,
      descriptionTh: note,
      lifestyle,
      highlightTag: note,
      lat: destination.lat + offset,
      lng: destination.lng + offset,
      isCustomStop: true,
    };
    setSavedPlaces((prev) => [...prev, customPlace]);
  };

  const handleAddTopPlaces = useCallback((placesToAdd: PlaceRecommendation[]) => {
    setSavedPlaces((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const fresh = placesToAdd.filter((p) => !existingIds.has(p.id));
      return [...prev, ...fresh];
    });
  }, []);

  const handleAddGangExpense = (title: string, amountThb: number, paidBy: string) => {
    setGangExpenses((prev) => [
      ...prev,
      { id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title, amountThb, paidBy },
    ]);
  };

  const handleRemoveGangExpense = (id: string) => {
    setGangExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleChecklist = (id: string) => {
    setGangChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleAddChecklistItem = (label: string) => {
    setGangChecklist((prev) => [
      ...prev,
      {
        id: `chk-custom-${Date.now()}`,
        label,
        checked: false,
        vehicleScope: 'both',
        isCustom: true,
      },
    ]);
  };

  const handleRemoveChecklistItem = (id: string) => {
    setGangChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetChecklist = () => {
    setGangChecklist((prev) => prev.map((item) => ({ ...item, checked: false })));
  };

  const customExpensesTotal = useMemo(
    () => gangExpenses.reduce((sum, item) => sum + item.amountThb, 0),
    [gangExpenses]
  );

  const stationToPlace = useCallback(
    (station: GasStationStop): PlaceRecommendation => ({
      id: station.id,
      nameTh: station.nameTh.startsWith('⛽') ? station.nameTh : `⛽ ${station.nameTh}`,
      nameEn: station.brandLabelTh,
      descriptionTh: `${station.areaHintTh || 'ริมเส้นทางหลัก'} · ${station.amenities.join(' · ')}`,
      lifestyle,
      highlightTag: `แวะเติมน้ำมัน กม.ที่ ~${station.distanceFromStartKm}`,
      lat: station.lat,
      lng: station.lng,
      isCustomStop: true,
    }),
    [lifestyle]
  );

  const handleToggleSaveGasStation = useCallback(
    (station: GasStationStop) => {
      setSavedPlaces((prev) => {
        const exists = prev.some((p) => p.id === station.id);
        if (exists) {
          return prev.filter((p) => p.id !== station.id);
        }
        const added = [...prev, stationToPlace(station)];
        return optimizeWaypointsOrder(origin, destination, added);
      });
    },
    [stationToPlace, origin, destination]
  );

  const handleAddRecommendedGasStations = useCallback(
    (stationsToAdd: GasStationStop[]) => {
      setSavedPlaces((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const fresh = stationsToAdd
          .filter((s) => !existingIds.has(s.id))
          .map((s) => stationToPlace(s));
        return optimizeWaypointsOrder(origin, destination, [...prev, ...fresh]);
      });
    },
    [stationToPlace, origin, destination]
  );

  const switchMobileTab = (tab: MobileTabId) => {
    setActiveMobileTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPlaceOnMap = (place: PlaceRecommendation) => {
    setFocusedGasStation(null);
    setFocusedPlace(place);
    if (layoutMode === 'mobile') {
      setActiveMobileTab('map');
    }
    setTimeout(() => {
      const el = document.getElementById('roadtrip-map-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  };

  const handleFocusGasStationOnMap = (station: GasStationStop) => {
    setFocusedPlace(null);
    setFocusedGasStation(station);
    if (layoutMode === 'mobile') {
      setActiveMobileTab('map');
    }
    setTimeout(() => {
      const el = document.getElementById('roadtrip-map-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  };

  const handleCopyShareUrl = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('from', origin.id);
    url.searchParams.set('to', destination.id);
    url.searchParams.set('v', vehicle);
    url.searchParams.set('style', lifestyle);
    window.history.replaceState({}, '', url.toString());
    try {
      await navigator.clipboard.writeText(url.toString());
    } catch {
      // Ignore clipboard write denial
    }
  };

  const isPhoneView = layoutMode === 'mobile';

  return (
    <div className="min-h-dvh bg-[#05070A] flex justify-center">
      {/* Centered Smartphone Frame on Desktop (430px) or Full-Width Desktop Container */}
      <div
        className={`@container w-full min-h-dvh bg-[#0B0D10] text-[#E2E8F0] flex flex-col font-['Prompt',sans-serif] relative ${
          isPhoneView
            ? 'max-w-[430px] sm:border-x sm:border-[#222834] sm:shadow-[0_0_80px_rgba(0,0,0,0.92)]'
            : ''
        }`}
      >
        <Header
          vehicle={vehicle}
          onVehicleChange={handleVehicleChange}
          savedPlacesCount={savedPlaces.length}
          onOpenItinerary={() => setIsItineraryOpen(true)}
          onCopyShareUrl={handleCopyShareUrl}
          layoutMode={layoutMode}
          onToggleLayoutMode={() =>
            setLayoutMode((prev) => (prev === 'mobile' ? 'desktop' : 'mobile'))
          }
        />

        {isPhoneView ? (
          /* ================= MOBILE PHONE APP LAYOUT (TABBED THUMB-ZONE UX) ================= */
          <main className="flex-1 w-full px-3.5 pt-3.5 pb-6 space-y-4">
            {/* Compact Active Route Context Pill on Secondary Tabs */}
            {activeMobileTab !== 'route' && (
              <div className="bg-[#141821] border border-[#262E3D] rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex items-center gap-1.5">
                  <span className="text-amber-400 font-semibold truncate">
                    {origin.nameTh} ➔ {destination.nameTh}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono tabular-nums text-slate-300 shrink-0">
                    {routeCalculation.estimatedRoadDistanceKm.toLocaleString()} กม.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => switchMobileTab('route')}
                  className="min-h-[30px] px-2.5 rounded-lg bg-[#1E2432] text-[11px] font-semibold text-amber-300 shrink-0 cursor-pointer"
                >
                  เปลี่ยนเส้นทาง
                </button>
              </div>
            )}

            {/* TAB 1: ROUTE & FUEL CALCULATOR */}
            {activeMobileTab === 'route' && (
              <div className="space-y-4">
                <RoutePlanner
                  origin={origin}
                  destination={destination}
                  vehicle={vehicle}
                  calculationResult={routeCalculation}
                  routeLoading={routeLoading}
                  savedPlacesCount={savedPlaces.length}
                  includeWaypointsInRoute={includeWaypointsInRoute}
                  originGpsCoords={originGpsCoords}
                  onOriginChange={handleOriginChange}
                  onDestinationChange={setDestination}
                  onVehicleChange={handleVehicleChange}
                  onSwapProvinces={handleSwapProvinces}
                  onSelectPreset={handleSelectPreset}
                  onToggleIncludeWaypoints={setIncludeWaypointsInRoute}
                />

                <FuelCalculator
                  calculationResult={routeCalculation}
                  vehicle={vehicle}
                  fuelConsumption={fuelConsumption}
                  fuelPrice={fuelPrice}
                  extraCostThb={extraCostThb}
                  isRoundTrip={isRoundTrip}
                  fuelPricesData={fuelPricesData}
                  selectedFuelTypeId={selectedFuelTypeId}
                  onSelectFuelType={handleSelectFuelType}
                  onFuelConsumptionChange={setFuelConsumption}
                  onFuelPriceChange={setFuelPrice}
                  onExtraCostChange={setExtraCostThb}
                  onRoundTripToggle={setIsRoundTrip}
                  passengerCount={gangMemberCount}
                  onPassengerCountChange={setGangMemberCount}
                />

                {/* Thumb-zone Next Step Quick Actions */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => switchMobileTab('map')}
                    className="min-h-[52px] px-3.5 rounded-2xl bg-[#141821] hover:bg-[#1B202C] active:scale-[0.98] border border-sky-500/35 text-left flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-sky-300 truncate">
                        แผนที่ & ปั๊มริมทาง
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        พบ {gasStations.length} ปั๊มบนสายหลัก
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-sky-400 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => switchMobileTab('places')}
                    className="min-h-[52px] px-3.5 rounded-2xl bg-[#141821] hover:bg-[#1B202C] active:scale-[0.98] border border-amber-500/35 text-left flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-amber-300 truncate">
                        10 ที่เที่ยวแนะนำ
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        พิกัดจริง จ.{destination.nameTh}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: INTERACTIVE MAP, GAS STATIONS & LIVE WEATHER */}
            {activeMobileTab === 'map' && (
              <div className="space-y-4">
                <MapPreview
                  origin={origin}
                  destination={destination}
                  vehicle={vehicle}
                  calculationResult={routeCalculation}
                  realRouteData={realRouteData}
                  places={places}
                  savedPlaces={savedPlaces}
                  focusedPlace={focusedPlace}
                  gasStations={gasStations}
                  focusedGasStation={focusedGasStation}
                  originGpsCoords={originGpsCoords}
                  onToggleSavePlace={handleToggleSavePlace}
                  onToggleSaveGasStation={handleToggleSaveGasStation}
                />

                <GasStationFinder
                  origin={origin}
                  destination={destination}
                  vehicle={vehicle}
                  oneWayDistanceKm={oneWayRoadKm}
                  stations={gasStations}
                  loading={gasStationsLoading || routeLoading}
                  savedPlaceIds={savedPlaceIds}
                  onToggleSaveStation={handleToggleSaveGasStation}
                  onAddRecommendedStations={handleAddRecommendedGasStations}
                  onFocusStationOnMap={handleFocusGasStationOnMap}
                  onRefresh={loadGasStations}
                />

                <WeatherCard
                  weather={weather}
                  loading={weatherLoading}
                  onRefresh={loadWeather}
                />
              </div>
            )}

            {/* TAB 3: LIFESTYLE SELECTOR & 10 REAL PLACES */}
            {activeMobileTab === 'places' && (
              <div className="space-y-4">
                <LifestyleSelector
                  selectedLifestyle={lifestyle}
                  destinationName={destination.nameTh}
                  loading={placesLoading}
                  onSelectLifestyle={setLifestyle}
                  onRegenerate={() => loadPlaces(true)}
                />

                <PlaceGrid
                  places={places}
                  loading={placesLoading}
                  error={placesError}
                  selectedLifestyle={lifestyle}
                  savedPlaceIds={savedPlaceIds}
                  onToggleSave={handleToggleSavePlace}
                  onAddTopPlaces={handleAddTopPlaces}
                  onSelectOnMap={handleSelectPlaceOnMap}
                  onRetry={() => loadPlaces(true)}
                />
              </div>
            )}

            {/* TAB 4: GANG COMMAND CENTER & WEATHER */}
            {activeMobileTab === 'gang' && (
              <div className="space-y-4">
                <GangCommandCenter
                  origin={origin}
                  destination={destination}
                  vehicle={vehicle}
                  calculationResult={routeCalculation}
                  weather={weather}
                  savedPlacesCount={savedPlaces.length}
                  gangMemberCount={gangMemberCount}
                  onGangMemberCountChange={setGangMemberCount}
                  departureTime={departureTime}
                  onDepartureTimeChange={setDepartureTime}
                  expenses={gangExpenses}
                  onAddExpense={handleAddGangExpense}
                  onRemoveExpense={handleRemoveGangExpense}
                  checklist={gangChecklist}
                  onToggleChecklist={handleToggleChecklist}
                  onAddChecklistItem={handleAddChecklistItem}
                  onRemoveChecklistItem={handleRemoveChecklistItem}
                  onResetChecklist={handleResetChecklist}
                />

                <WeatherCard
                  weather={weather}
                  loading={weatherLoading}
                  onRefresh={loadWeather}
                />
              </div>
            )}
          </main>
        ) : (
          /* ================= FULL-WIDTH EXPANDED DESKTOP LAYOUT ================= */
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <div className="grid grid-cols-1 @5xl:grid-cols-12 gap-6 items-stretch">
              <div className="@5xl:col-span-7 flex flex-col">
                <RoutePlanner
                  origin={origin}
                  destination={destination}
                  vehicle={vehicle}
                  calculationResult={routeCalculation}
                  routeLoading={routeLoading}
                  savedPlacesCount={savedPlaces.length}
                  includeWaypointsInRoute={includeWaypointsInRoute}
                  originGpsCoords={originGpsCoords}
                  onOriginChange={handleOriginChange}
                  onDestinationChange={setDestination}
                  onVehicleChange={handleVehicleChange}
                  onSwapProvinces={handleSwapProvinces}
                  onSelectPreset={handleSelectPreset}
                  onToggleIncludeWaypoints={setIncludeWaypointsInRoute}
                />
              </div>

              <div className="@5xl:col-span-5 flex flex-col">
                <FuelCalculator
                  calculationResult={routeCalculation}
                  vehicle={vehicle}
                  fuelConsumption={fuelConsumption}
                  fuelPrice={fuelPrice}
                  extraCostThb={extraCostThb}
                  isRoundTrip={isRoundTrip}
                  fuelPricesData={fuelPricesData}
                  selectedFuelTypeId={selectedFuelTypeId}
                  onSelectFuelType={handleSelectFuelType}
                  onFuelConsumptionChange={setFuelConsumption}
                  onFuelPriceChange={setFuelPrice}
                  onExtraCostChange={setExtraCostThb}
                  onRoundTripToggle={setIsRoundTrip}
                  passengerCount={gangMemberCount}
                  onPassengerCountChange={setGangMemberCount}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 @5xl:grid-cols-12 gap-6 items-stretch">
              <div className="@5xl:col-span-7 flex flex-col">
                <MapPreview
                  origin={origin}
                  destination={destination}
                  vehicle={vehicle}
                  calculationResult={routeCalculation}
                  realRouteData={realRouteData}
                  places={places}
                  savedPlaces={savedPlaces}
                  focusedPlace={focusedPlace}
                  gasStations={gasStations}
                  focusedGasStation={focusedGasStation}
                  originGpsCoords={originGpsCoords}
                  onToggleSavePlace={handleToggleSavePlace}
                  onToggleSaveGasStation={handleToggleSaveGasStation}
                />
              </div>

              <div className="@5xl:col-span-5 flex flex-col">
                <WeatherCard
                  weather={weather}
                  loading={weatherLoading}
                  onRefresh={loadWeather}
                />
              </div>
            </div>

            <GasStationFinder
              origin={origin}
              destination={destination}
              vehicle={vehicle}
              oneWayDistanceKm={oneWayRoadKm}
              stations={gasStations}
              loading={gasStationsLoading || routeLoading}
              savedPlaceIds={savedPlaceIds}
              onToggleSaveStation={handleToggleSaveGasStation}
              onAddRecommendedStations={handleAddRecommendedGasStations}
              onFocusStationOnMap={handleFocusGasStationOnMap}
              onRefresh={loadGasStations}
            />

            <GangCommandCenter
              origin={origin}
              destination={destination}
              vehicle={vehicle}
              calculationResult={routeCalculation}
              weather={weather}
              savedPlacesCount={savedPlaces.length}
              gangMemberCount={gangMemberCount}
              onGangMemberCountChange={setGangMemberCount}
              departureTime={departureTime}
              onDepartureTimeChange={setDepartureTime}
              expenses={gangExpenses}
              onAddExpense={handleAddGangExpense}
              onRemoveExpense={handleRemoveGangExpense}
              checklist={gangChecklist}
              onToggleChecklist={handleToggleChecklist}
              onAddChecklistItem={handleAddChecklistItem}
              onRemoveChecklistItem={handleRemoveChecklistItem}
              onResetChecklist={handleResetChecklist}
            />

            <LifestyleSelector
              selectedLifestyle={lifestyle}
              destinationName={destination.nameTh}
              loading={placesLoading}
              onSelectLifestyle={setLifestyle}
              onRegenerate={() => loadPlaces(true)}
            />

            <PlaceGrid
              places={places}
              loading={placesLoading}
              error={placesError}
              selectedLifestyle={lifestyle}
              savedPlaceIds={savedPlaceIds}
              onToggleSave={handleToggleSavePlace}
              onAddTopPlaces={handleAddTopPlaces}
              onSelectOnMap={handleSelectPlaceOnMap}
              onRetry={() => loadPlaces(true)}
            />
          </main>
        )}

        {/* Sticky Thumb-Zone Bottom Tab Bar (Active in Mobile Phone Layout) */}
        {isPhoneView ? (
          <nav
            aria-label="เมนูหลักสำหรับมือถือ"
            className="sticky bottom-0 z-40 bg-[#10131A]/95 backdrop-blur-md border-t border-[#232936] h-16 grid grid-cols-5 items-center px-1"
          >
            <button
              type="button"
              onClick={() => switchMobileTab('route')}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
                activeMobileTab === 'route' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Navigation className="w-5 h-5" />
              <span className="text-[10px] font-semibold tracking-tight">เส้นทาง</span>
            </button>

            <button
              type="button"
              onClick={() => switchMobileTab('map')}
              className={`min-h-[48px] relative flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
                activeMobileTab === 'map' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Fuel className="w-5 h-5" />
              <span className="text-[10px] font-semibold tracking-tight">แผนที่·ปั๊ม</span>
            </button>

            <button
              type="button"
              onClick={() => switchMobileTab('places')}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
                activeMobileTab === 'places' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-[10px] font-semibold tracking-tight">ที่เที่ยว</span>
            </button>

            <button
              type="button"
              onClick={() => switchMobileTab('gang')}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
                activeMobileTab === 'gang' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
              <span className="text-[10px] font-semibold tracking-tight">แก๊ง·SOS</span>
            </button>

            <button
              type="button"
              onClick={() => setIsItineraryOpen(true)}
              className="min-h-[48px] relative flex flex-col items-center justify-center gap-0.5 rounded-xl text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <div className="relative">
                <Calendar className="w-5 h-5 text-amber-400" />
                {savedPlaces.length > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-black text-[10px] font-extrabold font-mono tabular-nums flex items-center justify-center">
                    {savedPlaces.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold tracking-tight">แผนทริป</span>
            </button>
          </nav>
        ) : (
          <footer className="border-t border-[#1F242E] bg-[#0E1015] py-6 mt-12 text-center text-xs text-slate-400">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-slate-300">Trip Don&apos;t Talking</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">
                  ทริปแก็งพูดไม่ได้อย่าไว้ใจททาง อย่าวางใจคน อย่าชนกันเอง
                </span>
              </div>
              <div className="text-slate-400 text-[11px]">
                ขับขี่ปลอดภัย เว้นระยะห่างขบวน และเช็กความพร้อมรถก่อนออกทริปทุกครั้ง
              </div>
            </div>
          </footer>
        )}

        {/* Mobile Bottom Sheet / Slide-over Itinerary */}
        <ItineraryDrawer
          isOpen={isItineraryOpen}
          onClose={() => setIsItineraryOpen(false)}
          savedPlaces={savedPlaces}
          origin={origin}
          destination={destination}
          vehicle={vehicle}
          calculationResult={routeCalculation}
          realRouteData={realRouteData}
          originGpsCoords={originGpsCoords}
          departureTime={departureTime}
          gangMemberCount={gangMemberCount}
          customExpensesTotal={customExpensesTotal}
          layoutMode={layoutMode}
          onRemovePlace={(id) => setSavedPlaces((prev) => prev.filter((p) => p.id !== id))}
          onMovePlace={handleMoveSavedPlace}
          onOptimizeOrder={handleOptimizeSavedOrder}
          onAddCustomStop={handleAddCustomStop}
          onCopyShareUrl={handleCopyShareUrl}
          onClearAll={() => setSavedPlaces([])}
        />
      </div>
    </div>
  );
}
