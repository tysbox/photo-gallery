// masters/ (焼き込み済みJPEG/TIFF) → dist-images/ (WebP: 4分割 + thumbnail)
// 使い方: masters/KYOTO-0001.jpg を置いて `npm run images`
// 出力をR2へ: wrangler r2 object put <bucket>/<file> --file dist-images/<file>
import sharp from "sharp";
import ExifReader from "exifreader";
import fs from "node:fs/promises";
import path from "node:path";

// ---- 設定 ----------------------------------------------------
const FORMATS = {
  landscape: { w: 1200, h: 676 },  // 16:9
  portrait:  { w: 900,  h: 1200 }, // 3:4
  square:    { w: 960,  h: 960 },  // 1:1
};
const TOLERANCE = 0.02;      // マスターの比率が規定から2%以上ずれたら停止(自動クロップしない)
const QUALITY = 90;
const THUMB_LONG_EDGE = 480;
const COPYRIGHT = "© VIDE SIGNIFIANT / Kyoto Photo Archive. All rights reserved.";
const CREATOR = "VIDE SIGNIFIANT";
// -------------------------------------------------------------

const IN = "masters", OUT = "dist-images";

function detectFormat(w, h) {
  let best = null;
  for (const [name, f] of Object.entries(FORMATS)) {
    const diff = Math.abs(w / h - f.w / f.h) / (f.w / f.h);
    if (diff <= TOLERANCE && (!best || diff < best.diff)) best = { name, diff };
  }
  return best?.name ?? null;
}

const exif = { IFD0: { Copyright: COPYRIGHT, Artist: CREATOR } };
const webp = (img) => img.webp({ quality: QUALITY, effort: 5 }).withExif(exif);

await fs.mkdir(OUT, { recursive: true });
let files = [];
try {
  files = (await fs.readdir(IN)).filter((f) => /\.(jpe?g|tiff?)$/i.test(f));
} catch {
  console.log(`masters/ ディレクトリが見つからないか空です。`);
}
const manifest = {};
let failed = 0;

for (const file of files) {
  const id = path.parse(file).name;
  const src = path.join(IN, file);
  const { width, height } = await sharp(src).metadata();
  const format = detectFormat(width, height);
  if (!format) {
    console.error(`✗ ${file}: ${width}x${height} (${(width / height).toFixed(3)}) は 16:9 / 3:4 / 1:1 のいずれにも合いません。マスターを確認してください。`);
    failed++;
    continue;
  }
  const { w, h } = FORMATS[format];
  const base = sharp(src).rotate().resize(w, h, { fit: "fill" }); // 比率は検証済み。クロップはしない
  const buf = await base.toBuffer();
  const hw = w / 2, hh = h / 2; // 全フォーマットで偶数なので割り切れる
  const tiles = { tl: [0, 0], tr: [hw, 0], bl: [0, hh], br: [hw, hh] };
  for (const [key, [left, top]] of Object.entries(tiles)) {
    await webp(sharp(buf).extract({ left, top, width: hw, height: hh }))
      .toFile(path.join(OUT, `${id}_${key}.webp`));
  }
  await webp(sharp(buf).resize({ width: w >= h ? THUMB_LONG_EDGE : undefined, height: w < h ? THUMB_LONG_EDGE : undefined }))
    .toFile(path.join(OUT, `${id}_thumb.webp`));
  manifest[id] = { format, width: w, height: h };

  // EXIF 自動抽出
  try {
    const fileBuf = await fs.readFile(src);
    const tags = await ExifReader.load(fileBuf, { expanded: true });
    const exifData = tags.exif;
    if (exifData) {
      const camera = [exifData.Make?.description, exifData.Model?.description].filter(Boolean).join(" ");
      const lens = exifData.LensModel?.description || exifData.Lens?.description;
      const fnumber = exifData.FNumber?.description ? `f/${exifData.FNumber.description}` : undefined;
      const shutter = exifData.ExposureTime?.description ? `${exifData.ExposureTime.description}s` : undefined;
      const iso = exifData.ISOSpeedRatings?.description;
      const date = exifData.DateTimeOriginal?.description?.slice(0, 7)?.replace(/:/, "-");

      manifest[id].cameraInfo = { camera, lens, aperture: fnumber, shutter, iso, date };
      console.log(`  📸 EXIF: ${camera || "Camera"} | ${lens || ""} | ${fnumber || ""} | ${shutter || ""} | ISO ${iso || ""}`);
    }
  } catch (err) {
    /* EXIF なしまたは解析不能時は無視 */
  }

  console.log(`✓ ${id}: ${format} ${w}x${h}`);
}

await fs.writeFile(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

// photos.json / themes.json との整合チェック（テーマ内フォーマット統一）
try {
  const photos = JSON.parse(await fs.readFile("public/data/photos.json", "utf8"));
  const themes = JSON.parse(await fs.readFile("public/data/themes.json", "utf8"));
  for (const p of photos) {
    const m = manifest[p.id];
    const t = themes.find((x) => x.id === p.theme);
    if (!t) console.warn(`! ${p.id}: theme "${p.theme}" が themes.json にありません`);
    else if (m && m.format !== t.format) console.warn(`! ${p.id}: ${m.format} ですが theme "${t.id}" は ${t.format} です`);
  }
} catch { /* データ未作成なら無視 */ }

if (failed) process.exitCode = 1;
