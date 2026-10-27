import {
  Province,
  VehicleType,
  RouteCalculationResult,
  PlaceRecommendation,
  RealRouteData,
} from '../types';

/**
 * คำนวณระยะทางเส้นตรง (Great-Circle Distance) ตามสูตร Haversine Formula
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * แปลงจำนวนนาทีเป็นข้อความ "X ชม. Y นาที"
 */
export function formatMinutesToDuration(totalMinutes: number): string {
  const rounded = Math.max(1, Math.round(totalMinutes));
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;

  if (hours === 0) {
    return `${minutes} นาที`;
  }
  if (minutes === 0) {
    return `${hours} ชั่วโมง`;
  }
  return `${hours} ชม. ${minutes} นาที`;
}

/**
 * ค้นหาจังหวัดที่ใกล้พิกัด GPS ปัจจุบันของผู้ใช้มากที่สุด
 */
export function findNearestProvince(
  lat: number,
  lng: number,
  provinces: Province[]
): { province: Province; distanceKm: number } {
  let closest = provinces[0];
  let minDistance = Infinity;

  for (const prov of provinces) {
    const dist = calculateHaversineDistanceKm(lat, lng, prov.lat, prov.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = prov;
    }
  }

  return { province: closest, distanceKm: Math.round(minDistance) };
}

/**
 * จัดเรียงลำดับจุดแวะ (Waypoints) ตามเส้นทางจากต้นทางไปปลายทาง (Directional Nearest-Neighbor)
 * เพื่อลดการขับรถย้อนศรและประหยัดน้ำมัน
 */
export function optimizeWaypointsOrder(
  origin: Province,
  destination: Province,
  waypoints: PlaceRecommendation[]
): PlaceRecommendation[] {
  if (waypoints.length <= 1) return [...waypoints];

  const remaining = [...waypoints];
  const ordered: PlaceRecommendation[] = [];
  let currentLat = origin.lat;
  let currentLng = origin.lng;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const distFromCurrent = calculateHaversineDistanceKm(
        currentLat,
        currentLng,
        candidate.lat,
        candidate.lng
      );
      const distToDest = calculateHaversineDistanceKm(
        candidate.lat,
        candidate.lng,
        destination.lat,
        destination.lng
      );
      // ให้น้ำหนักระยะห่างจากจุดปัจจุบันควบคู่กับการมุ่งหน้าเข้าใกล้ปลายทาง
      const score = distFromCurrent - distToDest * 0.25;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const [picked] = remaining.splice(bestIdx, 1);
    ordered.push(picked);
    currentLat = picked.lat;
    currentLng = picked.lng;
  }

  return ordered;
}

/**
 * ============================================================================
 * (1) LOGIC การปรับเส้นทางและเวลาสำหรับมอเตอร์ไซค์ (Motorcycle Routing Logic)
 * ============================================================================
 *
 * รองรับทั้งข้อมูลระยะทางถนนจริงจากโครงข่ายทางหลวง (OSRM Real Road Network)
 * และการประมาณการสำรอง พร้อมปรับเวลาสำหรับมอเตอร์ไซค์ x1.08 เท่า
 * รวมถึงคำนวณจุดแวะพักร่างกายและพักเครื่องยนต์อัตโนมัติ
 */
export function calculateTripRoute({
  origin,
  destination,
  vehicle,
  fuelConsumptionKmPerLitre,
  fuelPricePerLitre,
  extraCostThb = 0,
  isRoundTrip = false,
  realRouteData = null,
  waypointsIncludedCount = 0,
}: {
  origin: Province;
  destination: Province;
  vehicle: VehicleType;
  fuelConsumptionKmPerLitre: number;
  fuelPricePerLitre: number;
  extraCostThb?: number;
  isRoundTrip?: boolean;
  realRouteData?: RealRouteData | null;
  waypointsIncludedCount?: number;
}): RouteCalculationResult {
  const straightDistanceKm = calculateHaversineDistanceKm(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );

  // ใช้ระยะทางโครงข่ายถนนจริงจาก OSRM หากพร้อมใช้งาน มิฉะนั้นคำนวณจาก Haversine x 1.28
  const hasRealRoadData = Boolean(realRouteData && realRouteData.distanceKm > 0);

  const oneWayRoadKm = hasRealRoadData
    ? realRouteData!.distanceKm
    : origin.id === destination.id
    ? 35
    : Math.max(15, straightDistanceKm * 1.28);

  const effectiveDistanceForCalc = isRoundTrip ? oneWayRoadKm * 2 : oneWayRoadKm;

  // เวลาขับขี่พื้นฐานของรถยนต์ (นาที)
  const baseCarMinutes = hasRealRoadData
    ? realRouteData!.durationMinutes
    : (oneWayRoadKm / 78) * 60;

  let finalDurationMinutes: number;
  let motorcycleWarning: string | undefined = undefined;

  // คำนวณจำนวนครั้งที่ควรแวะพัก (มอเตอร์ไซค์ทุก 95 นาที / รถยนต์ทุก 135 นาที)
  const breakIntervalMins = vehicle === 'motorcycle' ? 95 : 135;
  const oneWayRestStops = Math.max(0, Math.floor(baseCarMinutes / breakIntervalMins));
  const restStopsCount = isRoundTrip ? oneWayRestStops * 2 : oneWayRestStops;

  if (vehicle === 'motorcycle') {
    const motorcycleMultiplier = 1.08;
    // บวกเวลาพักเครื่องและยืดเส้นยืดสายจุดละ ~12 นาที สำหรับทางไกล
    finalDurationMinutes = baseCarMinutes * motorcycleMultiplier + oneWayRestStops * 12;
    motorcycleWarning =
      'ข้อควรระวังสำหรับไบค์เกอร์: ห้ามรถจักรยานยนต์ขึ้นทางด่วนพิเศษและมอเตอร์เวย์ตาม พ.ร.บ. จราจรทางบก โปรดตั้งค่าหลีกเลี่ยงทางด่วน (Avoid Tolls) ในแอปนำทาง';
  } else {
    finalDurationMinutes = baseCarMinutes;
  }

  if (isRoundTrip) {
    finalDurationMinutes = finalDurationMinutes * 2;
  }

  const safeConsumption = Math.max(1, fuelConsumptionKmPerLitre);
  const fuelLiters = Number((effectiveDistanceForCalc / safeConsumption).toFixed(1));
  const fuelCostThb = Math.round(fuelLiters * fuelPricePerLitre);
  const safeExtra = Math.max(0, Math.round(extraCostThb));
  const totalTripCostThb = fuelCostThb + safeExtra;

  return {
    straightDistanceKm: Math.round(straightDistanceKm),
    estimatedRoadDistanceKm: Math.round(effectiveDistanceForCalc),
    estimatedDurationMinutes: Math.round(finalDurationMinutes),
    vehicle,
    durationFormatted: formatMinutesToDuration(finalDurationMinutes),
    fuelLiters,
    fuelCostThb,
    extraCostThb: safeExtra,
    totalTripCostThb,
    fuelConsumptionKmPerLitre,
    fuelPricePerLitre,
    isRoundTrip,
    routeSource: hasRealRoadData ? 'osrm' : 'haversine',
    restStopsCount,
    waypointsIncludedCount,
    motorcycleWarning,
  };
}

/**
 * สร้างลิงก์เปิด Google Maps Directions พร้อมรองรับจุดแวะระหว่างทาง (Multi-stop Waypoints สูงสุด 9 จุด)
 */
export function getGoogleMapsDirectionsUrl(
  origin: Province,
  destination: Province,
  vehicle: VehicleType,
  waypoints: PlaceRecommendation[] = [],
  originGpsCoords?: { lat: number; lng: number } | null
): string {
  const originParam = originGpsCoords
    ? `${originGpsCoords.lat},${originGpsCoords.lng}`
    : encodeURIComponent(`${origin.nameTh}, ประเทศไทย`);
  const destParam = encodeURIComponent(`${destination.nameTh}, ประเทศไทย`);
  const travelMode = vehicle === 'motorcycle' ? 'two-wheeler' : 'driving';

  let url = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=${travelMode}`;

  if (waypoints.length > 0) {
    const wpParam = waypoints
      .slice(0, 9)
      .map((wp) => `${wp.lat.toFixed(5)},${wp.lng.toFixed(5)}`)
      .join('|');
    url += `&waypoints=${encodeURIComponent(wpParam)}`;
  }

  return url;
}

/**
 * สร้าง URL สำหรับ Google Maps Embed Iframe
 */
export function getGoogleMapsEmbedUrl(origin: Province, destination: Province): string {
  const saddr = `${origin.lat},${origin.lng}`;
  const daddr = `${destination.lat},${destination.lng}`;
  return `https://maps.google.com/maps?saddr=${saddr}&daddr=${daddr}&hl=th&z=7&output=embed`;
}

/**
 * สร้างเนื้อหาไฟล์มาตรฐาน .GPX สำหรับนำเข้าเครื่อง GPS (Garmin / OsmAnd / Scenic)
 */
export function generateTripGpx(
  origin: Province,
  destination: Province,
  waypoints: PlaceRecommendation[],
  routeGeometry?: [number, number][]
): string {
  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const tripName = `Super Roadtrip: ${origin.nameTh} -> ${destination.nameTh}`;
  const wptLines: string[] = [
    `  <wpt lat="${origin.lat}" lon="${origin.lng}"><name>${escapeXml(`จุดเริ่มต้น: ${origin.nameTh}`)}</name></wpt>`,
    ...waypoints.map(
      (p, i) =>
        `  <wpt lat="${p.lat}" lon="${p.lng}"><name>${escapeXml(
          `${i + 1}. ${p.nameTh}`
        )}</name><desc>${escapeXml(p.highlightTag || '')}</desc></wpt>`
    ),
    `  <wpt lat="${destination.lat}" lon="${destination.lng}"><name>${escapeXml(`ปลายทาง: ${destination.nameTh}`)}</name></wpt>`,
  ];

  const trackPoints =
    routeGeometry && routeGeometry.length > 0
      ? routeGeometry
          .filter((_, idx) => idx % 5 === 0 || idx === routeGeometry.length - 1)
          .map(([lat, lng]) => `      <trkpt lat="${lat}" lon="${lng}" />`)
          .join('\n')
      : [
          `      <trkpt lat="${origin.lat}" lon="${origin.lng}" />`,
          ...waypoints.map((p) => `      <trkpt lat="${p.lat}" lon="${p.lng}" />`),
          `      <trkpt lat="${destination.lat}" lon="${destination.lng}" />`,
        ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Super Roadtrip Thailand" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(tripName)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
${wptLines.join('\n')}
  <trk>
    <name>${escapeXml(tripName)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;
}
