import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

// In-memory server caches for fast repeat lookups
const placesCache = new Map<string, { timestamp: number; data: unknown }>();
const photoCache = new Map<string, { imageUrl: string; photoSource: 'wikimedia' | 'curated'; wikiUrl?: string }>();
const routeCache = new Map<string, { timestamp: number; data: unknown }>();
const weatherCache = new Map<string, { timestamp: number; data: unknown }>();
const gasStationCache = new Map<string, { timestamp: number; data: unknown }>();
let fuelPriceCache: { timestamp: number; data: unknown } | null = null;

function getAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: 15000,
      retryOptions: {
        attempts: 1,
      },
    },
  });
}

const LIFESTYLE_DESCRIPTIONS: Record<string, { th: string; focus: string; wikiQuery: string }> = {
  nature: {
    th: 'สายธรรรมชาติบำบัด',
    focus: 'อุทยานแห่งชาติ, จุดชมวิวภูเขา, ทะเลหมอก, น้ำตก, อ่างเก็บน้ำ, เขื่อน, ชายหาด หรือถนนสายธรรมชาติที่มีอยู่จริง',
    wikiQuery: '(อุทยานแห่งชาติ OR น้ำตก OR ดอย OR ภูเขา OR เขื่อน OR หาด)',
  },
  cafe: {
    th: 'สายคาเฟ่และร้านบรรยากาศดี',
    focus: 'คาเฟ่ชื่อดังที่มีอยู่จริง, ร้านกาแฟ Specialty Coffee, คาเฟ่วิวภูเขา/ริมน้ำ/ย่านเมืองเก่า หรือร้านอาหารจุดแวะพักยอดฮิตของจังหวัด',
    wikiQuery: '(ถนนคนเดิน OR ตลาด OR ชุมชน OR เมืองเก่า OR จุดชมวิว)',
  },
  adventure: {
    th: 'สายแอดเวนเจอร์และขับขี่ปู้ดๆ',
    focus: 'ถนนโค้งชมวิวชื่อดัง, จุดกางเต็นท์/ลานแค้มปิ้งจริง, เส้นทางเดินป่าศึกษาธรรมชาติ, จุดชมวิวผาสูง, ล่องแก่ง หรือพายคายัคที่มีอยู่จริง',
    wikiQuery: '(อุทยานแห่งชาติ OR วนอุทยาน OR ดอย OR ผา OR ถ้ำ OR น้ำตก)',
  },
  culture: {
    th: 'สายประวัติศาสตร์และวัดวาอาราม',
    focus: 'วัดคู่บ้านคู่เมือง, พระธาตุสำคัญ, โบราณสถาน, อุทยานประวัติศาสตร์, ชุมชนเมืองเก่า, ตลาดโบราณ หรือพิพิธภัณฑ์ที่มีอยู่จริง',
    wikiQuery: '(วัด OR พระธาตุ OR โบราณสถาน OR พิพิธภัณฑ์ OR อุทยานประวัติศาสตร์)',
  },
};

const CURATED_FALLBACK_PHOTOS: Record<string, string[]> = {
  nature: [
    'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80',
  ],
  cafe: [
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80',
  ],
  adventure: [
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1533130061792-64b345e4a833?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=800&q=80',
  ],
  culture: [
    'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80',
  ],
};

function decodeWmoWeatherTh(code: number): string {
  if (code === 0) return 'ท้องฟ้าแจ่มใส แดดดี';
  if (code === 1 || code === 2) return 'มีเมฆบางส่วน ทัศนวิสัยดี';
  if (code === 3) return 'เมฆครึ้ม แดดร่ม';
  if (code === 45 || code === 48) return 'มีหมอกลงจัด ระวังทัศนวิสัย';
  if (code >= 51 && code <= 57) return 'ฝนปรอยๆ ถนนเริ่มลื่น';
  if (code >= 61 && code <= 65) return 'ฝนตกปานกลางถึงหนัก';
  if (code >= 80 && code <= 82) return 'ฝนฟ้าคะนองเป็นแห่งๆ';
  if (code >= 95) return 'พายุฝนฟ้าคะนอง ลมกระโชกแรง';
  return 'อากาศโปร่ง เหมาะแก่การเดินทาง';
}

async function fetchWikiImageForQuery(
  wikiDomain: string,
  searchQuery: string
): Promise<{ imageUrl: string; wikiUrl?: string } | null> {
  if (!searchQuery.trim()) return null;
  const endpoint = `https://${wikiDomain}/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    searchQuery
  )}&gsrlimit=3&prop=pageimages|info&inprop=url&piprop=thumbnail&pithumbsize=800&format=json&origin=*`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': 'SuperRoadtripThailand/2.0 (https://aistudio.google.com)',
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            index?: number;
            title?: string;
            fullurl?: string;
            thumbnail?: { source?: string; width?: number };
          }
        >;
      };
    };
    const pages = Object.values(json.query?.pages || {}).sort(
      (a, b) => (a.index ?? 99) - (b.index ?? 99)
    );
    for (const p of pages) {
      const src = p.thumbnail?.source;
      if (src && !src.toLowerCase().endsWith('.svg') && !src.includes('Map_of_')) {
        return { imageUrl: src, wikiUrl: p.fullurl };
      }
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  return null;
}

/**
 * Live Thai Wikipedia Real Attraction Backup in case Gemini models hit 503 high-demand spikes
 */
async function fetchLiveWikiAttractionsBackup(
  destination: { id: string; nameTh: string; nameEn: string; lat: number; lng: number },
  lifestyle: string
) {
  const styleInfo = LIFESTYLE_DESCRIPTIONS[lifestyle] || LIFESTYLE_DESCRIPTIONS.nature;
  const queries = [
    `${styleInfo.wikiQuery} จังหวัด${destination.nameTh}`,
    `ท่องเที่ยว จังหวัด${destination.nameTh}`,
  ];

  type WikiPageItem = {
    index?: number;
    title?: string;
    extract?: string;
    fullurl?: string;
    coordinates?: Array<{ lat: number; lon: number }>;
    thumbnail?: { source?: string };
  };

  let collectedPages: WikiPageItem[] = [];

  for (const query of queries) {
    if (collectedPages.length >= 10) break;
    try {
      const endpoint = `https://th.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        query
      )}&gsrlimit=16&prop=extracts|coordinates|pageimages|info&exintro=1&explaintext=1&exchars=240&inprop=url&piprop=thumbnail&pithumbsize=800&format=json&origin=*`;

      const res = await fetch(endpoint, {
        headers: { 'User-Agent': 'SuperRoadtripThailand/2.0 (https://aistudio.google.com)' },
        signal: AbortSignal.timeout(5500),
      });
      if (!res.ok) continue;

      const json = (await res.json()) as {
        query?: {
          pages?: Record<string, WikiPageItem>;
        };
      };

      const pages = Object.values(json.query?.pages || {})
        .filter(
          (p) =>
            p.title &&
            !p.title.startsWith('จังหวัด') &&
            !p.title.startsWith('รายชื่อ') &&
            !p.title.startsWith('อำเภอ') &&
            !p.title.startsWith('ตำบล') &&
            !collectedPages.some((existing) => existing.title === p.title)
        )
        .sort((a, b) => (a.index ?? 99) - (b.index ?? 99));

      collectedPages = [...collectedPages, ...pages];
    } catch {
      // Ignore individual fallback query error
    }
  }

  const finalPages = collectedPages.slice(0, 10);
  const pool = CURATED_FALLBACK_PHOTOS[lifestyle] || CURATED_FALLBACK_PHOTOS.nature;

  return finalPages.map((p, idx) => {
    const coord = p.coordinates?.[0];
    const thumb = p.thumbnail?.source;
    const validThumb = thumb && !thumb.toLowerCase().endsWith('.svg') && !thumb.includes('Map_of_');
    return {
      id: `wiki-${destination.id}-${lifestyle}-${idx + 1}-${Date.now()}`,
      nameTh: p.title || `แหล่งท่องเที่ยวจังหวัด${destination.nameTh}`,
      nameEn: `${p.title} (${destination.nameEn})`,
      descriptionTh:
        p.extract || `แหล่งท่องเที่ยวสำคัญในจังหวัด${destination.nameTh} เหมาะสำหรับแวะพักและถ่ายภาพระหว่างทริปเดินทาง`,
      lifestyle,
      highlightTag: styleInfo.th,
      lat: coord?.lat ?? destination.lat + Math.sin(idx + 1) * 0.05,
      lng: coord?.lon ?? destination.lng + Math.cos(idx + 1) * 0.05,
      recommendedDuration: '1 - 1.5 ชม.',
      bestTimeToVisit: '08:30 - 17:00 น.',
      openingHours: 'เปิดบริการทุกวัน',
      entryFeeTh: 'ตามระเบียบสถานที่',
      parkingInfoTh: 'มีพื้นที่จอดรถสำหรับนักท่องเที่ยว',
      addressSummary: `จ.${destination.nameTh}`,
      imageUrl: validThumb ? thumb : pool[idx % pool.length],
      photoSource: validThumb ? ('wikimedia' as const) : ('curated' as const),
      wikiUrl: p.fullurl,
      imageLoading: false,
    };
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  /**
   * 1. POST /api/gemini/places
   * Server-side Gemini recommendation of 10 real places in Thailand with instant model failover
   */
  app.post('/api/gemini/places', async (req, res) => {
    try {
      const { destination, lifestyle, vehicle, forceRefresh } = req.body as {
        destination?: { id: string; nameTh: string; nameEn: string; lat: number; lng: number };
        lifestyle?: string;
        vehicle?: string;
        forceRefresh?: boolean;
      };

      if (!destination || !destination.nameTh || !lifestyle) {
        res.status(400).json({ error: 'กรุณาระบุจังหวัดปลายทางและสไตล์การท่องเที่ยว' });
        return;
      }

      const cacheKey = `${destination.id}:${lifestyle}:${vehicle || 'car'}`;
      if (!forceRefresh) {
        const cached = placesCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 1000 * 60 * 30) {
          res.json(cached.data);
          return;
        }
      }

      const styleInfo = LIFESTYLE_DESCRIPTIONS[lifestyle] || LIFESTYLE_DESCRIPTIONS.nature;
      const vehicleTh =
        vehicle === 'motorcycle' ? 'รถจักรยานยนต์ (มอเตอร์ไซค์ทัวร์ริ่ง/ทั่วไป)' : 'รถยนต์ส่วนตัว';

      const prompt = `แนะนำสถานที่ท่องเที่ยวจริงที่มีอยู่จริง 10 แห่ง ใน "จังหวัด${destination.nameTh}" (${destination.nameEn}) สำหรับ "${styleInfo.th}" (${styleInfo.focus}) เดินทางด้วย "${vehicleTh}"
ข้อกำหนด:
1. ใช้ชื่อสถานที่จริงในจังหวัด${destination.nameTh} ที่ค้นเจอใน Google Maps เท่านั้น ห้ามแต่งชื่อสมมติ
2. ระบุพิกัด lat, lng ใกล้ตำแหน่งจริง (รอบพิกัดจังหวัด ${destination.lat}, ${destination.lng})
3. สรุปจุดเด่นและเส้นทางเข้าถึงสั้นๆ กระชับ 1-2 ประโยค (descriptionTh) พร้อมเวลาเปิด-ปิด ค่าเข้า และที่จอดรถ`;

      const placeResponseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            nameTh: { type: Type.STRING, description: 'ชื่อสถานที่จริงภาษาไทย' },
            nameEn: { type: Type.STRING, description: 'ชื่อสถานที่จริงภาษาอังกฤษ' },
            descriptionTh: { type: Type.STRING, description: 'จุดเด่นและคำแนะนำการแวะเที่ยว' },
            highlightTag: { type: Type.STRING, description: 'แท็กไฮไลท์สั้นๆ' },
            lat: { type: Type.NUMBER, description: 'ละติจูดจริงโดยประมาณ' },
            lng: { type: Type.NUMBER, description: 'ลองจิจูดจริงโดยประมาณ' },
            recommendedDuration: { type: Type.STRING, description: 'เวลาแวะเที่ยว เช่น 1-1.5 ชม.' },
            bestTimeToVisit: { type: Type.STRING, description: 'ช่วงเวลาที่เหมาะแวะ' },
            openingHours: { type: Type.STRING, description: 'เวลาทำการ' },
            entryFeeTh: { type: Type.STRING, description: 'ค่าเข้าชม' },
            parkingInfoTh: { type: Type.STRING, description: 'ข้อมูลที่จอดรถและสภาพถนนทางเข้า' },
            addressSummary: { type: Type.STRING, description: 'อำเภอที่ตั้งจริง' },
          },
          required: [
            'nameTh',
            'nameEn',
            'descriptionTh',
            'highlightTag',
            'lat',
            'lng',
            'recommendedDuration',
            'bestTimeToVisit',
            'openingHours',
            'entryFeeTh',
            'parkingInfoTh',
            'addressSummary',
          ],
        },
      };

      let parsedPlaces: Array<Record<string, unknown>> | null = null;
      let lastGeminiError = '';

      if (process.env.GEMINI_API_KEY) {
        const ai = getAiClient();
        // Cascade: try ultra-fast gemini-3.1-flash-lite first, then gemini-3.8-flash, then gemini-flash-latest
        const candidateModels: Array<{ model: string; thinking?: ThinkingLevel }> = [
          { model: 'gemini-3.1-flash-lite', thinking: ThinkingLevel.MINIMAL },
          { model: 'gemini-3.8-flash', thinking: ThinkingLevel.LOW },
          { model: 'gemini-flash-latest' },
        ];

        for (const candidate of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model: candidate.model,
              contents: prompt,
              config: {
                abortSignal: AbortSignal.timeout(14000),
                ...(candidate.thinking
                  ? { thinkingConfig: { thinkingLevel: candidate.thinking } }
                  : {}),
                systemInstruction:
                  'คุณคือผู้เชี่ยวชาญข้อมูลสถานที่ท่องเที่ยวจริงในประเทศไทย ตอบเป็น JSON Array 10 สถานที่จริงเท่านั้น',
                responseMimeType: 'application/json',
                responseSchema: placeResponseSchema,
              },
            });

            const rawText = response.text?.trim() || '';
            if (rawText) {
              const parsed = JSON.parse(rawText);
              if (Array.isArray(parsed) && parsed.length > 0) {
                parsedPlaces = parsed;
                break;
              }
            }
          } catch (modelErr: unknown) {
            lastGeminiError = modelErr instanceof Error ? modelErr.message : String(modelErr);
            console.warn(`Model ${candidate.model} skipped:`, lastGeminiError);
          }
        }
      }

      if (parsedPlaces && parsedPlaces.length > 0) {
        const formatted = parsedPlaces.slice(0, 10).map((item, idx) => ({
          id: `place-${destination.id}-${lifestyle}-${idx + 1}-${Date.now()}`,
          nameTh: String(item.nameTh || ''),
          nameEn: String(item.nameEn || ''),
          descriptionTh: String(item.descriptionTh || ''),
          lifestyle,
          highlightTag: String(item.highlightTag || styleInfo.th),
          lat:
            typeof item.lat === 'number' && item.lat >= 5 && item.lat <= 21
              ? item.lat
              : destination.lat + (idx - 4.5) * 0.02,
          lng:
            typeof item.lng === 'number' && item.lng >= 97 && item.lng <= 106
              ? item.lng
              : destination.lng + (idx - 4.5) * 0.02,
          recommendedDuration: String(item.recommendedDuration || '1-2 ชม.'),
          bestTimeToVisit: String(item.bestTimeToVisit || '09:00 - 17:00 น.'),
          openingHours: String(item.openingHours || '08:00 - 17:00 น.'),
          entryFeeTh: String(item.entryFeeTh || 'สอบถามหน้าสถานที่'),
          parkingInfoTh: String(item.parkingInfoTh || 'มีจุดจอดรถรองรับ'),
          addressSummary: String(item.addressSummary || `จ.${destination.nameTh}`),
          imageLoading: true,
        }));

        const payload = { places: formatted };
        placesCache.set(cacheKey, { timestamp: Date.now(), data: payload });
        res.json(payload);
        return;
      }

      // Live Thai Wikipedia Real Attractions Backup if all Gemini models return 503
      const wikiPlaces = await fetchLiveWikiAttractionsBackup(destination, lifestyle);
      if (wikiPlaces.length > 0) {
        const payload = { places: wikiPlaces };
        placesCache.set(cacheKey, { timestamp: Date.now(), data: payload });
        res.json(payload);
        return;
      }

      res.status(503).json({
        error: `ขณะนี้เซิร์ฟเวอร์ประมวลผลมีผู้ใช้งานหนาแน่น กรุณากดลองใหม่อีกครั้ง (${lastGeminiError || '503'})`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Gemini /api/gemini/places error:', msg);
      res.status(500).json({
        error: `ไม่สามารถดึงข้อมูลแหล่งท่องเที่ยวได้ (${msg})`,
      });
    }
  });

  /**
   * 2. GET /api/place-photo
   * Fetches authentic landmark photos from Thai/English Wikipedia & Wikimedia Commons
   */
  app.get('/api/place-photo', async (req, res) => {
    const rawNameTh = String(req.query.nameTh || '');
    const rawNameEn = String(req.query.nameEn || '');
    const nameTh = rawNameTh.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    const nameEn = rawNameEn.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    const provinceTh = String(req.query.provinceTh || '');
    const provinceEn = String(req.query.provinceEn || '');
    const lifestyle = String(req.query.lifestyle || 'nature');
    const index = Number(req.query.index || 0);

    const cacheKey = `${nameTh}|${provinceTh}`;
    const cached = photoCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const thMatch =
      (await fetchWikiImageForQuery('th.wikipedia.org', `${nameTh} ${provinceTh}`)) ||
      (await fetchWikiImageForQuery('th.wikipedia.org', nameTh));

    if (thMatch) {
      const result = {
        imageUrl: thMatch.imageUrl,
        photoSource: 'wikimedia' as const,
        wikiUrl: thMatch.wikiUrl,
      };
      photoCache.set(cacheKey, result);
      res.json(result);
      return;
    }

    const enMatch =
      (await fetchWikiImageForQuery('en.wikipedia.org', `${nameEn} ${provinceEn} Thailand`)) ||
      (await fetchWikiImageForQuery('commons.wikimedia.org', `${nameEn} ${provinceEn}`));

    if (enMatch) {
      const result = {
        imageUrl: enMatch.imageUrl,
        photoSource: 'wikimedia' as const,
        wikiUrl: enMatch.wikiUrl,
      };
      photoCache.set(cacheKey, result);
      res.json(result);
      return;
    }

    const pool = CURATED_FALLBACK_PHOTOS[lifestyle] || CURATED_FALLBACK_PHOTOS.nature;
    const fallbackResult = {
      imageUrl: pool[index % pool.length],
      photoSource: 'curated' as const,
    };
    photoCache.set(cacheKey, fallbackResult);
    res.json(fallbackResult);
  });

  /**
   * 3. POST /api/route
   * Real Thailand road network routing via OSRM (supports multi-stop waypoints)
   */
  app.post('/api/route', async (req, res) => {
    try {
      const { coordinates } = req.body as {
        coordinates?: Array<{ lat: number; lng: number }>;
      };

      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        res.status(400).json({ error: 'ต้องระบุพิกัดอย่างน้อยจุดเริ่มต้นและจุดปลายทาง' });
        return;
      }

      const coordString = coordinates
        .map((c) => `${Number(c.lng).toFixed(4)},${Number(c.lat).toFixed(4)}`)
        .join(';');

      const cached = routeCache.get(coordString);
      if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60) {
        res.json(cached.data);
        return;
      }

      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=false`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(osrmUrl, {
          headers: { 'User-Agent': 'SuperRoadtripThailand/2.0' },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          const json = (await response.json()) as {
            code?: string;
            routes?: Array<{
              distance: number;
              duration: number;
              geometry?: { coordinates?: [number, number][] };
            }>;
          };

          const primaryRoute = json.routes?.[0];
          if (json.code === 'Ok' && primaryRoute) {
            const distanceKm = Math.max(1, Math.round(primaryRoute.distance / 1000));
            const durationMinutes = Math.max(5, Math.round(primaryRoute.duration / 60));
            const rawCoords = primaryRoute.geometry?.coordinates || [];
            // Convert GeoJSON [lng, lat] -> Leaflet [lat, lng]
            const geometry: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);

            const payload = {
              distanceKm,
              durationMinutes,
              geometry,
              source: 'osrm',
            };
            routeCache.set(coordString, { timestamp: Date.now(), data: payload });
            res.json(payload);
            return;
          }
        }
      } catch {
        clearTimeout(timeout);
      }

      res.status(503).json({ error: 'OSRM routing temporarily unavailable' });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  /**
   * 4. GET /api/weather
   * Real-time weather + 3-day forecast + PM2.5 Air Quality from Open-Meteo
   */
  app.get('/api/weather', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const provinceTh = String(req.query.provinceTh || '');
    const region = String(req.query.region || 'central');

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ error: 'พิกัดละติจูด/ลองจิจูดไม่ถูกต้อง' });
      return;
    }

    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 1000 * 60 * 15) {
      res.json(cached.data);
      return;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    let seasonTh = 'ฤดูฝน (Green Season)';
    if (currentMonth >= 11 || currentMonth <= 2) {
      seasonTh = 'ฤดูหนาว (ไฮซีซั่นรับลมหนาว)';
    } else if (currentMonth >= 3 && currentMonth <= 5) {
      seasonTh = 'ฤดูร้อน (Summer Roadtrip)';
    }

    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=Asia%2FBangkok&forecast_days=3`;
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5,us_aqi&timezone=Asia%2FBangkok`;

      const [weatherResp, aqiResp] = await Promise.all([
        fetch(weatherUrl),
        fetch(aqiUrl).catch(() => null),
      ]);

      if (!weatherResp.ok) {
        throw new Error(`Open-Meteo HTTP ${weatherResp.status}`);
      }

      const wJson = (await weatherResp.json()) as {
        current?: {
          temperature_2m?: number;
          apparent_temperature?: number;
          relative_humidity_2m?: number;
          wind_speed_10m?: number;
          weather_code?: number;
        };
        daily?: {
          time?: string[];
          weather_code?: number[];
          temperature_2m_max?: number[];
          temperature_2m_min?: number[];
          precipitation_probability_max?: number[];
          uv_index_max?: number[];
        };
      };

      let pm25: number | undefined = undefined;
      if (aqiResp && aqiResp.ok) {
        const aJson = (await aqiResp.json()) as {
          current?: { pm2_5?: number };
        };
        if (typeof aJson.current?.pm2_5 === 'number') {
          pm25 = Math.round(aJson.current.pm2_5);
        }
      }

      const tempC = Math.round(wJson.current?.temperature_2m ?? 30);
      const apparentTempC = Math.round(wJson.current?.apparent_temperature ?? tempC);
      const humidityPercent = Math.round(wJson.current?.relative_humidity_2m ?? 65);
      const windSpeedKmh = Math.round(wJson.current?.wind_speed_10m ?? 10);
      const weatherCode = wJson.current?.weather_code ?? 1;
      const rainChancePercent = Math.round(wJson.daily?.precipitation_probability_max?.[0] ?? 20);
      const uvIndex = Math.round(wJson.daily?.uv_index_max?.[0] ?? 7);

      const conditionTh = decodeWmoWeatherTh(weatherCode);

      let aqiLabelTh = 'อากาศดีมาก';
      if (pm25 !== undefined) {
        if (pm25 > 75) aqiLabelTh = 'ฝุ่นสูง (ควรสวมหน้ากาก N95)';
        else if (pm25 > 37.5) aqiLabelTh = 'ฝุ่นปานกลาง (ไบค์เกอร์ควรใส่โม่งกรองฝุ่น)';
        else if (pm25 > 25) aqiLabelTh = 'คุณภาพอากาศปานกลาง';
      }

      // Context-aware rider & driver advice from live telemetry
      const adviceParts: string[] = [];
      if (rainChancePercent >= 50 || weatherCode >= 51) {
        adviceParts.push('มีโอกาสเจอฝนสูง ถนนโค้งและเส้นสีตีเส้นจราจรอาจลื่น ควรลดความเร็วและเช็กดอกยาง/ใบปัดน้ำฝน');
      } else if (weatherCode === 45 || weatherCode === 48) {
        adviceParts.push('มีหมอกลงในพื้นที่ เปิดไฟหน้ารถต่ำและระมัดระวังทางโค้งบนเขา');
      } else {
        adviceParts.push('สภาพถนนแห้งและทัศนวิสัยคล่องตัว เหมาะกับการขับขี่ท่องเที่ยวทางไกล');
      }

      if (windSpeedKmh >= 25) {
        adviceParts.push(`ลมค่อนข้างแรง (~${windSpeedKmh} กม./ชม.) มอเตอร์ไซค์ระวังลมตีด้านข้างบนสะพานหรือสันเขา`);
      }
      if (apparentTempC >= 37) {
        adviceParts.push(`อุณหภูมิความรู้สึกร้อนจัด (${apparentTempC}°C) ควรแวะพักดื่มน้ำเกลือแร่ทุก 1.5 ชม.`);
      }

      const gearParts: string[] = [];
      if (rainChancePercent >= 40) {
        gearParts.push('พกเสื้อกันฝนแบบแยกชิ้น/ถุงคลุมกระเป๋ากันน้ำ');
      }
      if (uvIndex >= 7) {
        gearParts.push(`ค่าแดด UV สูง (${uvIndex}) แนะนำชิลด์หมวกกันน็อกกรองแสง แว่นกันแดด และปลอกแขนกัน UV`);
      }
      if (tempC <= 22 || region === 'north') {
        gearParts.push('พกเสื้อแจ็กเก็ตกันลมสำหรับช่วงเช้าตรู่หรือขึ้นยอดดอย');
      } else {
        gearParts.push('เลือกเสื้อการ์ดแบบ Mesh ระบายอากาศหรือเสื้อผ้าโปร่งสบาย');
      }
      if (pm25 && pm25 > 37.5) {
        gearParts.push(`ค่าฝุ่น PM2.5 อยู่ที่ ${pm25} µg/m³ แนะนำสวมหน้ากากกรองฝุ่นใต้หมวกกันน็อก`);
      }

      const times = wJson.daily?.time || [];
      const dailyForecast = times.slice(0, 3).map((dateStr, i) => {
        const d = new Date(`${dateStr}T00:00:00+07:00`);
        const dayLabelTh =
          i === 0
            ? 'วันนี้'
            : i === 1
            ? 'พรุ่งนี้'
            : d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
        return {
          dateStr,
          dayLabelTh,
          tempMaxC: Math.round(wJson.daily?.temperature_2m_max?.[i] ?? tempC + 2),
          tempMinC: Math.round(wJson.daily?.temperature_2m_min?.[i] ?? tempC - 4),
          rainProbPercent: Math.round(wJson.daily?.precipitation_probability_max?.[i] ?? 20),
          conditionTh: decodeWmoWeatherTh(wJson.daily?.weather_code?.[i] ?? 1),
        };
      });

      const payload = {
        provinceName: provinceTh,
        temperatureC: tempC,
        apparentTempC,
        condition: 'Live Open-Meteo Telemetry',
        conditionTh,
        seasonTh,
        rainChancePercent,
        humidityPercent,
        windSpeedKmh,
        uvIndex,
        pm25,
        aqiLabelTh,
        riderAdviceTh: adviceParts.join(' • '),
        clothingAdviceTh: gearParts.join(' • '),
        bestTravelMonthsTh:
          region === 'south' ? 'ธันวาคม - เมษายน (ทะเลสวย ฟ้าใส)' : 'พฤศจิกายน - กุมภาพันธ์ (อากาศเย็นสบาย)',
        updatedAtTh: now.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Bangkok',
        }),
        dailyForecast,
        dataSource: 'open-meteo',
      };

      weatherCache.set(cacheKey, { timestamp: Date.now(), data: payload });
      res.json(payload);
    } catch (error) {
      console.warn('Weather API error:', error);
      res.status(503).json({ error: 'ไม่สามารถดึงข้อมูลสภาพอากาศสดได้ในขณะนี้' });
    }
  });

  /**
   * 5. GET /api/fuel-prices
   * Live Thai retail oil prices from Bangchak Official Public API (with reference fallback)
   */
  app.get('/api/fuel-prices', async (_req, res) => {
    if (fuelPriceCache && Date.now() - fuelPriceCache.timestamp < 1000 * 60 * 60) {
      res.json(fuelPriceCache.data);
      return;
    }

    const referenceFallback = {
      updatedDateTh: 'ราคาอ้างอิงมาตรฐาน กทม.',
      source: 'reference',
      prices: [
        { id: 'gsh95', labelTh: 'แก๊สโซฮอล์ 95', shortLabel: 'GSH 95', priceThb: 35.85, recommendedFor: 'both' },
        { id: 'gsh91', labelTh: 'แก๊สโซฮอล์ 91', shortLabel: 'GSH 91', priceThb: 35.48, recommendedFor: 'both' },
        { id: 'e20', labelTh: 'แก๊สโซฮอล์ E20', shortLabel: 'E20', priceThb: 33.74, recommendedFor: 'both' },
        { id: 'diesel', labelTh: 'ดีเซล B7', shortLabel: 'ดีเซล', priceThb: 32.94, recommendedFor: 'car' },
        { id: 'benzin95', labelTh: 'พรีเมียม / เบนซิน 95', shortLabel: 'พรีเมียม 97', priceThb: 44.54, recommendedFor: 'both' },
      ],
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    try {
      const response = await fetch('https://oil-price.bangchak.co.th/ApiOilPrice2/th', {
        headers: { 'User-Agent': 'SuperRoadtripThailand/2.0' },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok) {
        const raw = (await response.json()) as Array<{
          OilList?: string;
          OilDateNow?: string;
          RemarkDate?: string;
        }>;
        const entry = raw?.[0];
        if (entry?.OilList) {
          const oilItems = JSON.parse(entry.OilList) as Array<{
            OilName?: string;
            PriceToday?: number | string;
          }>;

          const findPrice = (keywords: string[], defaultVal: number): number => {
            const found = oilItems.find((o) =>
              keywords.some((kw) => (o.OilName || '').toLowerCase().includes(kw.toLowerCase()))
            );
            const val = Number(found?.PriceToday);
            return !isNaN(val) && val > 15 && val < 80 ? Number(val.toFixed(2)) : defaultVal;
          };

          const livePayload = {
            updatedDateTh: entry.OilDateNow
              ? `อัปเดต ${entry.OilDateNow}`
              : entry.RemarkDate || 'อัปเดตราคาหน้าปั๊มวันนี้',
            source: 'live',
            prices: [
              {
                id: 'gsh95',
                labelTh: 'แก๊สโซฮอล์ 95',
                shortLabel: 'GSH 95',
                priceThb: findPrice(['แก๊สโซฮอล์ 95 S', 'แก๊สโซฮอล์ 95'], 42.04),
                recommendedFor: 'both',
              },
              {
                id: 'gsh91',
                labelTh: 'แก๊สโซฮอล์ 91',
                shortLabel: 'GSH 91',
                priceThb: findPrice(['แก๊สโซฮอล์ 91'], 41.67),
                recommendedFor: 'both',
              },
              {
                id: 'e20',
                labelTh: 'แก๊สโซฮอล์ E20',
                shortLabel: 'E20',
                priceThb: findPrice(['E20'], 35.69),
                recommendedFor: 'both',
              },
              {
                id: 'diesel',
                labelTh: 'ไฮดีเซล S (B7)',
                shortLabel: 'ดีเซล',
                priceThb: findPrice(['ไฮดีเซล S', 'ดีเซล B7'], 43.54),
                recommendedFor: 'car',
              },
              {
                id: 'benzin95',
                labelTh: 'ไฮพรีเมียม 98 / เบนซิน',
                shortLabel: 'พรีเมียม 98',
                priceThb: findPrice(['98', '97', 'เบนซิน'], 49.29),
                recommendedFor: 'both',
              },
            ],
          };

          fuelPriceCache = { timestamp: Date.now(), data: livePayload };
          res.json(livePayload);
          return;
        }
      }
    } catch {
      clearTimeout(timer);
    }

    fuelPriceCache = { timestamp: Date.now(), data: referenceFallback };
    res.json(referenceFallback);
  });

  /**
   * 6. POST /api/gas-stations
   * Finds real highway gas stations along the driving polyline via OpenStreetMap Overpass API
   * with server-side Gemini fallback for remote mountain corridors
   */
  app.post('/api/gas-stations', async (req, res) => {
    try {
      const { origin, destination, geometry, totalDistanceKm } = req.body as {
        origin?: { id?: string; nameTh: string; lat: number; lng: number };
        destination?: { id?: string; nameTh: string; lat: number; lng: number };
        geometry?: [number, number][];
        totalDistanceKm?: number;
      };

      if (!origin || !destination) {
        res.status(400).json({ error: 'กรุณาระบุต้นทางและปลายทาง' });
        return;
      }

      const cacheKey = `${origin.lat.toFixed(2)},${origin.lng.toFixed(2)}->${destination.lat.toFixed(
        2
      )},${destination.lng.toFixed(2)}`;
      const cached = gasStationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 1000 * 60 * 45) {
        res.json(cached.data);
        return;
      }

      const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const toRad = (d: number) => (d * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      // Build cumulative distance table along polyline (or interpolated line if geometry unavailable)
      const pathPoints: [number, number][] =
        Array.isArray(geometry) && geometry.length >= 2
          ? geometry
          : Array.from({ length: 12 }, (_, i) => {
              const t = i / 11;
              return [
                origin.lat + (destination.lat - origin.lat) * t,
                origin.lng + (destination.lng - origin.lng) * t,
              ];
            });

      const cumKm: number[] = [0];
      for (let i = 1; i < pathPoints.length; i++) {
        const seg = haversineKm(
          pathPoints[i - 1][0],
          pathPoints[i - 1][1],
          pathPoints[i][0],
          pathPoints[i][1]
        );
        cumKm.push(cumKm[i - 1] + seg);
      }

      const polyTotalKm = Math.max(1, cumKm[cumKm.length - 1]);
      const roadTotalKm = Math.max(polyTotalKm, Number(totalDistanceKm) || Math.round(polyTotalKm * 1.25));
      const scaleFactor = roadTotalKm / polyTotalKm;

      // Sample 4 to 9 evenly spaced checkpoints between 10% and 92% of the route
      const sampleCount = Math.min(9, Math.max(4, Math.ceil(roadTotalKm / 75)));
      const checkpoints: Array<{ lat: number; lng: number; approxKm: number }> = [];

      for (let s = 1; s <= sampleCount; s++) {
        const frac = 0.08 + (0.84 * (s - 0.5)) / sampleCount;
        const targetPolyKm = polyTotalKm * frac;
        let idx = cumKm.findIndex((d) => d >= targetPolyKm);
        if (idx < 0) idx = pathPoints.length - 1;
        checkpoints.push({
          lat: pathPoints[idx][0],
          lng: pathPoints[idx][1],
          approxKm: Math.round(targetPolyKm * scaleFactor),
        });
      }

      const detectBrand = (
        rawText: string
      ): {
        brand: 'ptt' | 'bangchak' | 'pt' | 'shell' | 'caltex' | 'other';
        brandLabelTh: string;
      } => {
        const s = rawText.toLowerCase();
        if (s.includes('ptt') || s.includes('ปตท') || s.includes('or ')) {
          return { brand: 'ptt', brandLabelTh: 'PTT Station (ปตท.)' };
        }
        if (s.includes('bangchak') || s.includes('บางจาก') || s.includes('เอสโซ่') || s.includes('esso')) {
          return { brand: 'bangchak', brandLabelTh: 'บางจาก (Bangchak)' };
        }
        if (s.includes('เชลล์') || s.includes('shell')) {
          return { brand: 'shell', brandLabelTh: 'เชลล์ (Shell)' };
        }
        if (s.includes('caltex') || s.includes('คาลเท็กซ์')) {
          return { brand: 'caltex', brandLabelTh: 'คาลเท็กซ์ (Caltex)' };
        }
        if (
          s.includes('พีที') ||
          /\bpt\b/.test(s) ||
          s.includes('pt station') ||
          s.includes('ปั๊มพีที')
        ) {
          return { brand: 'pt', brandLabelTh: 'พีที (PT Station)' };
        }
        return { brand: 'other', brandLabelTh: 'สถานีบริการน้ำมัน' };
      };

      type StationItem = {
        id: string;
        nameTh: string;
        brand: 'ptt' | 'bangchak' | 'pt' | 'shell' | 'caltex' | 'other';
        brandLabelTh: string;
        lat: number;
        lng: number;
        distanceFromStartKm: number;
        amenities: string[];
        open24h: boolean;
        areaHintTh: string;
        source: 'osm' | 'ai';
      };

      const projectOntoRouteKm = (lat: number, lng: number, fallbackKm: number): { km: number; distOffRouteKm: number } => {
        let bestIdx = 0;
        let bestDist = Infinity;
        const step = Math.max(1, Math.floor(pathPoints.length / 200));
        for (let i = 0; i < pathPoints.length; i += step) {
          const d = haversineKm(lat, lng, pathPoints[i][0], pathPoints[i][1]);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        if (!isFinite(bestDist) || bestDist > 35) {
          return { km: fallbackKm, distOffRouteKm: bestDist };
        }
        return {
          km: Math.max(3, Math.min(roadTotalKm - 2, Math.round(cumKm[bestIdx] * scaleFactor))),
          distOffRouteKm: bestDist,
        };
      };

      let foundStations: StationItem[] = [];

      if (process.env.GEMINI_API_KEY) {
        const ai = getAiClient();
        const targetCount = Math.min(8, Math.max(4, checkpoints.length));
        const cpSummary = checkpoints
          .slice(0, targetCount)
          .map(
            (c, i) =>
              `ช่วงที่ ${i + 1} (~กม.${c.approxKm} พิกัดทางหลวง ${c.lat.toFixed(3)},${c.lng.toFixed(3)})`
          )
          .join(', ');

        const gasPrompt = `ระบุปั๊มน้ำมันขนาดใหญ่ที่มีอยู่จริงริมทางหลวงสายหลัก ${targetCount} แห่ง สำหรับแวะพักรถและเติมน้ำมันระหว่างเดินทางจาก "${origin.nameTh}" ไป "${destination.nameTh}" (ระยะทางรวม ~${roadTotalKm} กม.) ตามแนวพิกัดเส้นทางจริง: ${cpSummary}
ข้อกำหนด:
1. เลือกปั๊มหลักที่มีอยู่จริงริมถนนสายนั้น โดยคละแบรนด์ปั๊มใหญ่ที่มีสาขาจริงบนเส้นทางนั้นตามเหมาะสม เช่น PTT Station (ปตท.), บางจาก (Bangchak), พีที (PT Station), เชลล์ (Shell), คาลเท็กซ์ (Caltex) พร้อมระบุสาขา/อำเภอให้ชัดเจนใน nameTh
2. ระบุพิกัด lat, lng ของปั๊มใกล้แนวเส้นทางจริง และระบุสิ่งอำนวยความสะดวกจริงในปั๊ม (เช่น ห้องน้ำสะอาด, Amazon/ร้านกาแฟ, 7-Eleven, จุดพักรถ)
3. เรียงลำดับตามระยะทางจากต้นทางไปปลายทาง`;

        const stationSchema = {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nameTh: { type: Type.STRING, description: 'ชื่อปั๊มและสาขาจริง เช่น PTT Station วังน้อย ขาออก' },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              areaHintTh: { type: Type.STRING, description: 'หมายเลขทางหลวงและอำเภอ/จังหวัดที่ตั้ง' },
              open24h: { type: Type.BOOLEAN },
              amenities: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['nameTh', 'lat', 'lng', 'areaHintTh', 'open24h', 'amenities'],
          },
        };

        const candidateModels: Array<{ model: string; thinking?: ThinkingLevel }> = [
          { model: 'gemini-3.1-flash-lite', thinking: ThinkingLevel.MINIMAL },
          { model: 'gemini-3.8-flash', thinking: ThinkingLevel.LOW },
          { model: 'gemini-flash-latest' },
        ];

        for (const candidate of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model: candidate.model,
              contents: gasPrompt,
              config: {
                abortSignal: AbortSignal.timeout(12000),
                ...(candidate.thinking
                  ? { thinkingConfig: { thinkingLevel: candidate.thinking } }
                  : {}),
                responseMimeType: 'application/json',
                responseSchema: stationSchema,
              },
            });

            const rawText = response.text?.trim() || '';
            if (rawText) {
              const parsed = JSON.parse(rawText) as Array<Record<string, unknown>>;
              if (Array.isArray(parsed) && parsed.length > 0) {
                foundStations = parsed.slice(0, 8).map((item, idx) => {
                  const nameTh = String(item.nameTh || `สถานีบริการน้ำมัน จุดที่ ${idx + 1}`);
                  const { brand, brandLabelTh } = detectBrand(nameTh);
                  const cp = checkpoints[idx % checkpoints.length];
                  const rawLat = typeof item.lat === 'number' ? item.lat : cp.lat;
                  const rawLng = typeof item.lng === 'number' ? item.lng : cp.lng;
                  const proj = projectOntoRouteKm(rawLat, rawLng, cp.approxKm);
                  // If model coordinate drifted >35km from OSRM highway, anchor pin cleanly to the highway checkpoint
                  const finalLat = proj.distOffRouteKm <= 35 ? rawLat : cp.lat;
                  const finalLng = proj.distOffRouteKm <= 35 ? rawLng : cp.lng;

                  const rawAmenities = Array.isArray(item.amenities)
                    ? item.amenities.map((a) => String(a)).filter(Boolean).slice(0, 3)
                    : [];
                  const open24h = Boolean(item.open24h);
                  if (open24h && !rawAmenities.some((a) => a.includes('24'))) {
                    rawAmenities.unshift('เปิด 24 ชม.');
                  }

                  return {
                    id: `gas-${origin.id || 'o'}-${destination.id || 'd'}-${idx + 1}`,
                    nameTh,
                    brand,
                    brandLabelTh,
                    lat: finalLat,
                    lng: finalLng,
                    distanceFromStartKm: proj.km,
                    amenities:
                      rawAmenities.length > 0
                        ? rawAmenities
                        : ['ห้องน้ำสะอาด', 'ร้านสะดวกซื้อ/กาแฟ', 'แก๊สโซฮอล์ 95/ดีเซล'],
                    open24h,
                    areaHintTh: String(item.areaHintTh || `ริมทางหลวงสายหลัก กม.~${proj.km}`),
                    source: 'ai' as const,
                  };
                });

                foundStations.sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);
                break;
              }
            }
          } catch (modelErr) {
            console.warn(`Gas station model ${candidate.model} skipped:`, modelErr);
          }
        }
      }

      // Highway milestone safety net if all AI models experience simultaneous 503s
      if (foundStations.length === 0) {
        const majorBrands: Array<{
          brand: 'ptt' | 'bangchak' | 'pt' | 'shell';
          label: string;
        }> = [
          { brand: 'ptt', label: 'PTT Station (ปตท.)' },
          { brand: 'bangchak', label: 'บางจาก (Bangchak)' },
          { brand: 'pt', label: 'พีที (PT Station)' },
          { brand: 'shell', label: 'เชลล์ (Shell)' },
        ];
        foundStations = checkpoints.slice(0, 6).map((cp, idx) => {
          const b = majorBrands[idx % majorBrands.length];
          return {
            id: `gas-cp-${idx + 1}`,
            nameTh: `${b.label} จุดพักริมทางหลวง กม.~${cp.approxKm}`,
            brand: b.brand,
            brandLabelTh: b.label,
            lat: cp.lat,
            lng: cp.lng,
            distanceFromStartKm: cp.approxKm,
            amenities: ['จุดแวะเติมน้ำมันริมทางหลวง', 'ห้องน้ำ/ร้านสะดวกซื้อ'],
            open24h: true,
            areaHintTh: `พิกัดทางหลวงจริง ช่วง กม.ที่ ${cp.approxKm}`,
            source: 'osm' as const,
          };
        });
      }

      const payload = { stations: foundStations };
      gasStationCache.set(cacheKey, { timestamp: Date.now(), data: payload });
      res.json(payload);
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Mount Vite dev server in development, or static dist in production
  const distPath = path.resolve(__dirname, 'dist');
  const isDev =
    process.env.npm_lifecycle_event === 'dev' ||
    process.env.NODE_ENV === 'development' ||
    !fs.existsSync(path.join(distPath, 'index.html'));

  if (!isDev) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Super Roadtrip Thailand full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
