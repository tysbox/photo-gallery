/**
 * Data types for VIDE SIGNIFIANT Kyoto Photo Archive & Studio
 */

export type Format = 'landscape' | 'portrait' | 'square';

export interface Theme {
  id: string;
  title: string;
  format: Format;
  subtitle?: string;
  description?: string;
}

export interface Photo {
  id: string;
  title: string;
  subtitle?: string;
  theme: string; // 1作品に1つ。フォーマットはテーマで決まる
  collections: string[]; // 検索・絞り込み用コレクションタグ
  location: {
    name: string;
    area: string;
    coordinates?: string;
  };
  date: string;
  season: '春' | '夏' | '秋' | '冬' | '通年' | 'Spring' | 'Summer' | 'Autumn' | 'Winter';
  description: string;
  curatorNotes?: string;
  cameraInfo?: {
    camera?: string;
    lens?: string;
    focalLength?: string;
    aperture?: string;
    shutter?: string;
    iso?: string;
  };
  framing?: {
    matColor: MatColor;
    frameBorder: FrameBorder;
    matPadding?: 'normal' | 'wide' | 'compact';
  };
  copyright?: string;
  creator?: string;
  images: {
    thumbnail: string;
    split: [string, string, string, string]; // tl, tr, bl, br
    master?: string; // Optional master preview
  };
}

// 額縁内の表示サイズ(CSS px)。出力画像の半分 = Retinaで2倍密度
export const DISPLAY: Record<Format, { w: number; h: number }> = {
  landscape: { w: 600, h: 338 },
  portrait: { w: 450, h: 600 },
  square: { w: 480, h: 480 },
};

export const FORMAT_DIMENSIONS: Record<
  Format,
  { w: number; h: number; ratio: string; label: string; aspectDecimal: number }
> = {
  landscape: { w: 1200, h: 676, ratio: '16:9', label: '横位置 (16:9)', aspectDecimal: 1200 / 676 },
  portrait: { w: 900, h: 1200, ratio: '3:4', label: '縦位置 (3:4)', aspectDecimal: 900 / 1200 },
  square: { w: 960, h: 960, ratio: '1:1', label: '正方形 (1:1)', aspectDecimal: 1.0 },
};

export type MatColor = 'mat-washi' | 'mat-charcoal' | 'mat-karegane' | 'mat-indigo' | 'mat-wamurasaki';
export type FrameBorder = 'frame-ebony' | 'frame-hinoki' | 'frame-oak' | 'frame-charcoal' | 'frame-float';
