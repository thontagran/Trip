export type VehicleType = 'car' | 'motorcycle';

export type LifestyleType = 'nature' | 'cafe' | 'adventure' | 'culture';

export interface Province {
  id: string;
  nameTh: string;
  nameEn: string;
  region: 'north' | 'central' | 'northeast' | 'east' | 'west' | 'south';
  regionTh: string;
  lat: number;
  lng: number;
  popularHighlight?: string;
}

export interface PlaceRecommendation {
  id: string;
  nameTh: string;
  nameEn: string;
  descriptionTh: string;
  lifestyle: LifestyleType;
  highlightTag: string;
  lat: number;
  lng: number;
  recommendedDuration?: string;
  bestTimeToVisit?: string;
  openingHours?: string;
  entryFeeTh?: string;
  parkingInfoTh?: string;
  imageUrl?: string;
  imageLoading?: boolean;
  imageError?: boolean;
  photoSource?: 'wikimedia' | 'curated';
  wikiUrl?: string;
  addressSummary?: string;
  isCustomStop?: boolean;
}

export interface RealRouteData {
  distanceKm: number;
  durationMinutes: number;
  geometry: [number, number][]; // [lat, lng][]
  source: 'osrm' | 'haversine';
}

export interface RouteCalculationResult {
  straightDistanceKm: number;
  estimatedRoadDistanceKm: number;
  estimatedDurationMinutes: number;
  vehicle: VehicleType;
  durationFormatted: string;
  fuelLiters: number;
  fuelCostThb: number;
  extraCostThb: number;
  totalTripCostThb: number;
  fuelConsumptionKmPerLitre: number;
  fuelPricePerLitre: number;
  isRoundTrip: boolean;
  routeSource: 'osrm' | 'haversine';
  restStopsCount: number;
  waypointsIncludedCount: number;
  motorcycleWarning?: string;
}

export interface DailyForecastItem {
  dateStr: string;
  dayLabelTh: string;
  tempMaxC: number;
  tempMinC: number;
  rainProbPercent: number;
  conditionTh: string;
}

export interface DestinationWeather {
  provinceName: string;
  temperatureC: number;
  apparentTempC: number;
  condition: string;
  conditionTh: string;
  seasonTh: string;
  rainChancePercent: number;
  humidityPercent: number;
  windSpeedKmh: number;
  uvIndex: number;
  pm25?: number;
  aqiLabelTh?: string;
  riderAdviceTh: string;
  clothingAdviceTh: string;
  bestTravelMonthsTh: string;
  updatedAtTh: string;
  dailyForecast: DailyForecastItem[];
  dataSource: 'open-meteo' | 'fallback';
}

export interface ThaiFuelPriceItem {
  id: 'gsh95' | 'gsh91' | 'e20' | 'diesel' | 'benzin95';
  labelTh: string;
  shortLabel: string;
  priceThb: number;
  recommendedFor: 'both' | 'car' | 'motorcycle';
}

export interface FuelPricesResponse {
  updatedDateTh: string;
  source: 'live' | 'reference';
  prices: ThaiFuelPriceItem[];
}

export interface GangExpenseItem {
  id: string;
  title: string;
  amountThb: number;
  paidBy: string;
}

export interface GangChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  vehicleScope: 'both' | 'car' | 'motorcycle';
  isCustom?: boolean;
}

export type GasBrandType = 'ptt' | 'bangchak' | 'pt' | 'shell' | 'caltex' | 'other';

export interface GasStationStop {
  id: string;
  nameTh: string;
  brand: GasBrandType;
  brandLabelTh: string;
  lat: number;
  lng: number;
  distanceFromStartKm: number;
  amenities: string[];
  open24h?: boolean;
  areaHintTh?: string;
  source: 'osm' | 'ai';
}


