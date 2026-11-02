import ExifReader from 'exifreader';
import type { Photo } from '../types';

export interface ExtractedExif {
  hasExif: boolean;
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutter?: string;
  iso?: string;
  date?: string; // YYYY-MM
  exactDateTime?: string; // YYYY-MM-DD HH:mm:ss
  suggestedSeason?: Photo['season'];
  coordinates?: string;
  artist?: string;
  copyright?: string;
}

/**
 * Clean up camera make & model names
 */
function normalizeCamera(make?: string, model?: string): string | undefined {
  if (!model && !make) return undefined;
  if (!make) return model;
  if (!model) return make;

  const mUpper = model.toUpperCase();
  const makeUpper = make.toUpperCase();

  if (mUpper.includes(makeUpper)) {
    return model;
  }

  if (model === 'ILCE-7RM5') return 'Sony α7R V';
  if (model === 'ILCE-7M4') return 'Sony α7 IV';
  if (model === 'ILCE-1') return 'Sony α1';
  if (model === 'ILCE-7SM3') return 'Sony α7S III';
  if (model === 'ILCE-9M3') return 'Sony α9 III';

  const prettyMake = make
    .replace(/CAMERA\s*(AG|CO\.,?\s*LTD|CORPORATION)?/gi, '')
    .trim();

  return `${prettyMake} ${model}`.trim();
}

/**
 * Format shutter speed into photography standard notation (e.g., 1/125s, 2s)
 */
function formatShutter(exposureTime: unknown): string | undefined {
  if (!exposureTime) return undefined;
  const str = String(exposureTime).trim();
  if (str.includes('/')) {
    return str.endsWith('s') ? str : `${str}s`;
  }
  const val = parseFloat(str);
  if (isNaN(val)) return str;

  if (val >= 1) {
    return `${val}s`;
  }
  if (val > 0) {
    const reciprocal = Math.round(1 / val);
    return `1/${reciprocal}s`;
  }
  return str;
}

/**
 * Format aperture (e.g., 2.8 -> f/2.8)
 */
function formatAperture(fnumber: unknown): string | undefined {
  if (!fnumber) return undefined;
  const str = String(fnumber).trim();
  if (str.startsWith('f/') || str.startsWith('F/')) return str.toLowerCase();
  const val = parseFloat(str);
  if (isNaN(val)) return str;
  return `f/${val}`;
}

/**
 * Format focal length (e.g. 50 -> 50mm)
 */
function formatFocalLength(focal: unknown): string | undefined {
  if (!focal) return undefined;
  const str = String(focal).trim();
  if (str.toLowerCase().endsWith('mm')) return str;
  const val = parseFloat(str);
  if (isNaN(val)) return str;
  return `${Math.round(val)}mm`;
}

/**
 * Suggest Kyoto season based on month number (1-12)
 */
function getSeasonFromMonth(month: number): Photo['season'] {
  if (month >= 3 && month <= 5) return '春';
  if (month >= 6 && month <= 8) return '夏';
  if (month >= 9 && month <= 11) return '秋';
  return '冬';
}

/**
 * Extracts and normalizes EXIF metadata from a File
 */
export async function extractExifFromFile(file: File): Promise<ExtractedExif> {
  try {
    const tags = await ExifReader.load(file, { expanded: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exif: Record<string, any> = (tags.exif as any) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iptc: Record<string, any> = (tags.iptc as any) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const xmp: Record<string, any> = (tags.xmp as any) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gps: Record<string, any> = (tags.gps as any) || {};

    // Camera Make & Model
    const make = exif['Make']?.description || iptc['Source']?.description;
    const model = exif['Model']?.description;
    const camera = normalizeCamera(make, model);

    // Lens
    const lens =
      exif['LensModel']?.description ||
      exif['Lens']?.description ||
      xmp['LensModel']?.description ||
      xmp['Lens']?.description;

    // Exposure parameters
    const focalLength = formatFocalLength(exif['FocalLength']?.description);
    const aperture = formatAperture(exif['FNumber']?.description);
    const shutter = formatShutter(exif['ExposureTime']?.description);
    const iso =
      exif['ISOSpeedRatings']?.description ||
      exif['PhotographicSensitivity']?.description ||
      exif['ISO']?.description;

    // Date & Time
    const rawDate =
      exif['DateTimeOriginal']?.description ||
      exif['CreateDate']?.description ||
      exif['DateTime']?.description;

    let date: string | undefined;
    let exactDateTime: string | undefined;
    let suggestedSeason: Photo['season'] | undefined;

    if (rawDate && typeof rawDate === 'string') {
      const match = rawDate.match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})(?:\s+(\d{2}:\d{2}:\d{2}))?/);
      if (match) {
        const year = match[1];
        const month = match[2];
        const day = match[3];
        const time = match[4] || '00:00:00';
        date = `${year}-${month}`;
        exactDateTime = `${year}-${month}-${day} ${time}`;
        suggestedSeason = getSeasonFromMonth(parseInt(month, 10));
      }
    }

    // GPS Coordinates
    let coordinates: string | undefined;
    if (gps['Latitude'] && gps['Longitude']) {
      const lat = typeof gps['Latitude'] === 'number' ? gps['Latitude'] : parseFloat(gps['Latitude'].description || '0');
      const lon = typeof gps['Longitude'] === 'number' ? gps['Longitude'] : parseFloat(gps['Longitude'].description || '0');
      if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
        const latDir = lat >= 0 ? 'N' : 'S';
        const lonDir = lon >= 0 ? 'E' : 'W';
        coordinates = `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
      }
    }

    const artist =
      exif['Artist']?.description ||
      iptc['By-line']?.description ||
      xmp['creator']?.description;

    const copyright =
      exif['Copyright']?.description ||
      iptc['Copyright Notice']?.description ||
      xmp['rights']?.description;

    const hasAnyExif = Boolean(
      camera || lens || focalLength || aperture || shutter || iso || date || coordinates
    );

    return {
      hasExif: hasAnyExif,
      camera,
      lens,
      focalLength,
      aperture,
      shutter,
      iso,
      date,
      exactDateTime,
      suggestedSeason,
      coordinates,
      artist,
      copyright,
    };
  } catch (err) {
    console.warn('EXIF read warning:', err);
    return { hasExif: false };
  }
}
