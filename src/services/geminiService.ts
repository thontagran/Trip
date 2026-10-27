import {
  LifestyleType,
  PlaceRecommendation,
  Province,
  DestinationWeather,
  VehicleType,
  RealRouteData,
  FuelPricesResponse,
  GasStationStop,
} from '../types';

/**
 * เรียก Server-Side Gemini 3.8 Flash API เพื่อแนะนำ 10 สถานที่จริงในจังหวัดปลายทาง
 */
export async function fetchLifestylePlacesFromGemini({
  destination,
  lifestyle,
  vehicle,
  forceRefresh = false,
  signal,
}: {
  destination: Province;
  lifestyle: LifestyleType;
  vehicle: VehicleType;
  forceRefresh?: boolean;
  signal?: AbortSignal;
}): Promise<PlaceRecommendation[]> {
  const response = await fetch('/api/gemini/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      destination: {
        id: destination.id,
        nameTh: destination.nameTh,
        nameEn: destination.nameEn,
        lat: destination.lat,
        lng: destination.lng,
      },
      lifestyle,
      vehicle,
      forceRefresh,
    }),
  });

  const rawText = await response.text();
  let data: { places?: PlaceRecommendation[]; error?: string } = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error('การเชื่อมต่อเซิร์ฟเวอร์ใช้เวลานานเกินไป กรุณากดลองใหม่อีกครั้ง');
  }

  if (!response.ok || !Array.isArray(data.places)) {
    throw new Error(data.error || 'ไม่สามารถดึงข้อมูลสถานที่ท่องเที่ยวได้ในขณะนี้');
  }

  return data.places;
}

/**
 * ดึงรูปภาพสถานที่จริงจาก Wikipedia / Wikimedia Commons ผ่าน Backend Proxy
 */
export async function fetchRealPlacePhoto({
  placeNameTh,
  placeNameEn,
  provinceNameTh,
  provinceNameEn,
  lifestyle,
  index = 0,
}: {
  placeNameTh: string;
  placeNameEn: string;
  provinceNameTh: string;
  provinceNameEn: string;
  lifestyle: LifestyleType;
  index?: number;
}): Promise<{ imageUrl: string; photoSource: 'wikimedia' | 'curated'; wikiUrl?: string }> {
  try {
    const params = new URLSearchParams({
      nameTh: placeNameTh,
      nameEn: placeNameEn,
      provinceTh: provinceNameTh,
      provinceEn: provinceNameEn,
      lifestyle,
      index: String(index),
    });
    const res = await fetch(`/api/place-photo?${params.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Ignore transient photo fetch error
  }

  return {
    imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80',
    photoSource: 'curated',
  };
}

/**
 * ดึงระยะทางโครงข่ายถนนจริงและเส้นทาง Polyline จาก OSRM ผ่าน Backend
 */
export async function fetchRealRoadRoute(
  coordinates: Array<{ lat: number; lng: number }>
): Promise<RealRouteData | null> {
  try {
    const res = await fetch('/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates }),
    });
    if (!res.ok) return null;
    return (await res.json()) as RealRouteData;
  } catch {
    return null;
  }
}

/**
 * ดึงสภาพอากาศสด (Real-time Open-Meteo) + ค่าฝุ่น PM2.5 + พยากรณ์ล่วงหน้า 3 วัน
 */
export async function fetchDestinationWeather({
  destination,
}: {
  destination: Province;
}): Promise<DestinationWeather> {
  const params = new URLSearchParams({
    lat: String(destination.lat),
    lng: String(destination.lng),
    provinceTh: destination.nameTh,
    region: destination.region,
  });

  const res = await fetch(`/api/weather?${params.toString()}`);
  if (res.ok) {
    return (await res.json()) as DestinationWeather;
  }

  // Fallback baseline if offline
  return {
    provinceName: destination.nameTh,
    temperatureC: 29,
    apparentTempC: 31,
    condition: 'Standard Forecast',
    conditionTh: 'ท้องฟ้าโปร่ง มีเมฆบางส่วน',
    seasonTh: 'ตรวจสอบก่อนเดินทาง',
    rainChancePercent: 20,
    humidityPercent: 66,
    windSpeedKmh: 12,
    uvIndex: 7,
    riderAdviceTh: 'ตรวจเช็กลมยาง ระบบเบรก และไฟส่องสว่างก่อนออกเดินทางไกล',
    clothingAdviceTh: 'สวมเสื้อระบายอากาศได้ดี แว่นตากันแดด และพกเสื้อกันฝนติดรถ',
    bestTravelMonthsTh: 'พฤศจิกายน - กุมภาพันธ์',
    updatedAtTh: '--:--',
    dailyForecast: [],
    dataSource: 'fallback',
  };
}

/**
 * ดึงราคาน้ำมันขายปลีกหน้าปั๊มไทยวันนี้ (Bangchak Live Public API)
 */
export async function fetchThaiFuelPrices(): Promise<FuelPricesResponse | null> {
  try {
    const res = await fetch('/api/fuel-prices');
    if (!res.ok) return null;
    return (await res.json()) as FuelPricesResponse;
  } catch {
    return null;
  }
}

/**
 * ค้นหาปั๊มน้ำมันจริงริมเส้นทางหลวงระหว่างต้นทาง-ปลายทาง (OpenStreetMap Overpass + AI Highway Backup)
 */
export async function fetchRouteGasStations({
  origin,
  destination,
  geometry,
  totalDistanceKm,
  signal,
}: {
  origin: { id?: string; nameTh: string; lat: number; lng: number };
  destination: { id?: string; nameTh: string; lat: number; lng: number };
  geometry?: [number, number][];
  totalDistanceKm: number;
  signal?: AbortSignal;
}): Promise<GasStationStop[]> {
  const res = await fetch('/api/gas-stations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      origin,
      destination,
      geometry: geometry && geometry.length > 300
        ? geometry.filter((_, idx) => idx % Math.ceil(geometry.length / 250) === 0 || idx === geometry.length - 1)
        : geometry,
      totalDistanceKm,
    }),
  });

  if (!res.ok) {
    throw new Error('ไม่สามารถค้นหาปั๊มน้ำมันตามเส้นทางได้ในขณะนี้');
  }

  const data = (await res.json()) as { stations?: GasStationStop[] };
  return Array.isArray(data.stations) ? data.stations : [];
}

