import { useState, useRef, useEffect } from 'react';
import type { Photo, Theme, Format, MatColor, FrameBorder, MatPadding } from '../types';
import { FORMAT_DIMENSIONS } from '../types';
import { processUploadedImage, generatePhotoTiles } from '../lib/kyotoArtworkGenerator';
import { extractExifFromFile, ExtractedExif } from '../lib/exifExtractor';
import { imageUrl } from '../lib/imageUrl';
import { Upload, X, Check, AlertCircle, RefreshCw, Eye, Camera, Sparkles, Tag, Plus } from 'lucide-react';

interface EditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (photo: Photo) => void;
  initialPhoto?: Photo | null;
  themes: Theme[];
  existingIds: string[];
  allAvailableTags?: string[];
}

export function EditorModal({
  isOpen,
  onClose,
  onSave,
  initialPhoto,
  themes,
  existingIds,
  allAvailableTags = [],
}: EditorModalProps) {
  const isEditing = Boolean(initialPhoto);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [theme, setTheme] = useState('');
  const [collections, setCollections] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [locName, setLocName] = useState('');
  const [locArea, setLocArea] = useState('');
  const [locCoords, setLocCoords] = useState('');
  const [date, setDate] = useState('');
  const [season, setSeason] = useState<Photo['season']>('春');
  const [description, setDescription] = useState('');
  const [curatorNotes, setCuratorNotes] = useState('');

  // Framing specification (decided by creator)
  const [matColor, setMatColor] = useState<MatColor>('mat-karegane');
  const [frameBorder, setFrameBorder] = useState<FrameBorder>('frame-oak');
  const [matPadding, setMatPadding] = useState<MatPadding>('normal');

  // Camera info
  const [camera, setCamera] = useState('');
  const [lens, setLens] = useState('');
  const [focalLength, setFocalLength] = useState('');
  const [aperture, setAperture] = useState('');
  const [shutter, setShutter] = useState('');
  const [iso, setIso] = useState('');

  // Image & Slicing state
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [splitUrls, setSplitUrls] = useState<[string, string, string, string]>(['', '', '', '']);
  const [masterUrl, setMasterUrl] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [detectedExif, setDetectedExif] = useState<ExtractedExif | null>(null);
  const [rakkanChar, setRakkanChar] = useState('写');
  const [watermarkText, setWatermarkText] = useState('VIDE SIGNIFIANT');
  const [previewTab, setPreviewTab] = useState<'4split' | 'tiles'>('4split');

  // Reset or initialize when modal opens
  useEffect(() => {
    if (initialPhoto) {
      setId(initialPhoto.id);
      setTitle(initialPhoto.title);
      setSubtitle(initialPhoto.subtitle || '');
      setTheme(initialPhoto.theme);
      setCollections([...initialPhoto.collections]);
      setNewTagInput('');
      setLocName(initialPhoto.location.name);
      setLocArea(initialPhoto.location.area);
      setLocCoords(initialPhoto.location.coordinates || '');
      setDate(initialPhoto.date);
      setSeason(initialPhoto.season);
      setDescription(initialPhoto.description);
      setCuratorNotes(initialPhoto.curatorNotes || '');
      setThumbnailUrl(initialPhoto.images.thumbnail);
      setSplitUrls(initialPhoto.images.split);
      setMasterUrl(initialPhoto.images.master || '');
      setMatColor(initialPhoto.framing?.matColor || 'mat-karegane');
      setFrameBorder(initialPhoto.framing?.frameBorder || 'frame-oak');
      setMatPadding(initialPhoto.framing?.matPadding || 'normal');
      setCamera(initialPhoto.cameraInfo?.camera || '');
      setLens(initialPhoto.cameraInfo?.lens || '');
      setFocalLength(initialPhoto.cameraInfo?.focalLength || '');
      setAperture(initialPhoto.cameraInfo?.aperture || '');
      setShutter(initialPhoto.cameraInfo?.shutter || '');
      setIso(initialPhoto.cameraInfo?.iso || '');
      setUploadWarning(null);
    } else {
      // Auto generate next KYOTO ID
      const nextNum = existingIds.length + 1;
      const nextId = `KYOTO-${String(nextNum).padStart(4, '0')}`;
      setId(nextId);
      setTitle('');
      setSubtitle('');
      setTheme(themes[0]?.id || 'kyoto-landscape');
      setCollections(['寺社・名刹', '陰翳']);
      setNewTagInput('');
      setLocName('京都');
      setLocArea('東山区');
      setLocCoords('');
      setDate(new Date().toISOString().slice(0, 7));
      setSeason('春');
      setDescription('');
      setCuratorNotes('');
      setThumbnailUrl('');
      setSplitUrls(['', '', '', '']);
      setMasterUrl('');
      setMatColor('mat-karegane');
      setFrameBorder('frame-oak');
      setMatPadding('normal');
      setCamera('Leica SL2');
      setLens('50mm');
      setFocalLength('50mm');
      setAperture('f/4.0');
      setShutter('1/125s');
      setIso('100');
      setUploadWarning(null);
    }
  }, [initialPhoto, isOpen, themes, existingIds]);

  if (!isOpen) return null;

  const currentThemeObj = themes.find((t) => t.id === theme) || themes[0];
  const format: Format = currentThemeObj ? currentThemeObj.format : 'landscape';
  const formatInfo = FORMAT_DIMENSIONS[format];

  // Handle uploaded file
  const handleFileUpload = async (file: File) => {
    setIsProcessingImage(true);
    setUploadWarning(null);
    setDetectedExif(null);
    try {
      // 1. Extract EXIF metadata automatically from file headers
      const exif = await extractExifFromFile(file);
      if (exif.hasExif) {
        setDetectedExif(exif);
        if (exif.camera) setCamera(exif.camera);
        if (exif.lens) setLens(exif.lens);
        if (exif.focalLength) setFocalLength(exif.focalLength);
        if (exif.aperture) setAperture(exif.aperture);
        if (exif.shutter) setShutter(exif.shutter);
        if (exif.iso) setIso(exif.iso);
        if (exif.date) setDate(exif.date);
        if (exif.suggestedSeason) setSeason(exif.suggestedSeason);
        if (exif.coordinates) setLocCoords(exif.coordinates);
      }

      // 2. Process quad-slice images
      const res = await processUploadedImage(file, format, {
        rakkanChar,
        watermarkText,
      });

      setThumbnailUrl(res.images.thumbnail);
      setSplitUrls(res.images.split);
      setMasterUrl(res.images.master);

      if (!res.isWithinTolerance) {
        setUploadWarning(
          `アップロード画像の比率は約 ${(res.aspectRatio).toFixed(2)}:1 です。選択テーマ「${currentThemeObj?.title}」の既定比率 (${formatInfo.ratio}) から ${(res.toleranceDiff * 100).toFixed(1)}% 乖離しています（既定許容差: ±2%）。4分割出力は自動補正されて生成されました。`
        );
      }
    } catch (err: unknown) {
      console.error(err);
      setUploadWarning('画像の処理中にエラーが発生しました。別の画像を試してください。');
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Generate artwork using Kyoto generator preset if no file uploaded
  const handleGeneratePreset = async () => {
    setIsProcessingImage(true);
    setUploadWarning(null);
    try {
      const res = await generatePhotoTiles(id);
      setThumbnailUrl(res.thumbnail);
      setSplitUrls(res.split);
      setMasterUrl(res.master);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    if (!collections.includes(trimmed)) {
      setCollections([...collections, trimmed]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCollections(collections.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !id.trim()) {
      alert('作品IDとタイトルを入力してください。');
      return;
    }

    const finalCollections = collections.filter(Boolean);

    // If split images are empty, fallback to generated placeholder
    const finalSplit = splitUrls[0]
      ? splitUrls
      : ([
          `${id}_tl.webp`,
          `${id}_tr.webp`,
          `${id}_bl.webp`,
          `${id}_br.webp`,
        ] as [string, string, string, string]);
    const finalThumb = thumbnailUrl || `${id}_thumb.webp`;

    const updatedPhoto: Photo = {
      id: id.trim(),
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      theme,
      collections: finalCollections.length ? finalCollections : ['京都'],
      location: {
        name: locName.trim() || '京都',
        area: locArea.trim() || '京都市',
        coordinates: locCoords.trim() || undefined,
      },
      date: date || '2026-01',
      season,
      description: description.trim() || '静寂に満ちた京都の情景。',
      curatorNotes: curatorNotes.trim() || undefined,
      framing: {
        matColor,
        frameBorder,
        matPadding,
      },
      cameraInfo: {
        camera: camera.trim() || undefined,
        lens: lens.trim() || undefined,
        focalLength: focalLength.trim() || undefined,
        aperture: aperture.trim() || undefined,
        shutter: shutter.trim() || undefined,
        iso: iso.trim() || undefined,
      },
      copyright: '© VIDE SIGNIFIANT / Kyoto Photo Archive',
      creator: 'VIDE SIGNIFIANT',
      images: {
        thumbnail: finalThumb,
        split: finalSplit,
        master: masterUrl || undefined,
      },
    };

    onSave(updatedPhoto);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#f6f6f3] text-[#23221f] border border-[#2a2926] shadow-2xl rounded max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2926]/20 bg-[#edeae4]">
          <div>
            <h3 className="font-serif text-lg font-bold tracking-wide">
              {isEditing ? `作品編集 — ${id}` : '新規作品の追加 & 4分割スライス'}
            </h3>
            <p className="text-xs text-[#6f6d67] tracking-wider font-sans">
              VIDE SIGNIFIANT キュレーター・スタジオ
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6f6d67] hover:text-[#23221f] hover:bg-black/5 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Image & 4-Quadrant Slicing */}
          <div className="p-4 bg-white/60 border border-[#2a2926]/15 rounded">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="font-serif text-sm font-semibold tracking-wide">
                1. 作品マスター画像 & 4分割スライス (Quad-Slice)
              </span>
              <span className="text-xs bg-[#23221f] text-[#f6f6f3] px-2.5 py-0.5 rounded font-mono">
                {formatInfo.label} • {formatInfo.w} × {formatInfo.h}px
              </span>
            </div>

            {uploadWarning && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <p>{uploadWarning}</p>
              </div>
            )}

            {detectedExif && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded text-emerald-950 text-xs flex items-start gap-2.5 shadow-sm">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <p className="font-semibold text-emerald-900 flex items-center gap-1.5">
                    EXIFデータを写真から自動読み取り・反映しました
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-0.5 font-mono">
                    {[
                      detectedExif.camera,
                      detectedExif.lens,
                      detectedExif.focalLength,
                      detectedExif.aperture,
                      detectedExif.shutter,
                      detectedExif.iso ? `ISO ${detectedExif.iso}` : null,
                      detectedExif.date ? `撮影年月: ${detectedExif.date}` : null,
                      detectedExif.suggestedSeason ? `季節: ${detectedExif.suggestedSeason}` : null,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                  <p className="text-[10px] text-emerald-700/90 mt-1">
                    カメラ・レンズ・撮影設定・撮影年月・季節などを自動入力しました。必要に応じて下のフォームで自由に微調整・編集できます。
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Drop area / file selector */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/tiff"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#2a2926]/30 hover:border-[#23221f] rounded p-6 text-center cursor-pointer bg-[#faf9f7] hover:bg-white transition-colors group"
                >
                  <Upload className="w-8 h-8 mx-auto text-[#6f6d67] group-hover:text-[#23221f] transition-colors mb-2" />
                  <p className="text-sm font-medium">マスター画像を選択またはドロップ</p>
                  <p className="text-xs text-[#6f6d67] mt-1">
                    JPEG, PNG, WebP, TIFF (比率: {formatInfo.ratio})
                  </p>
                  <p className="text-[11px] text-[#6f6d67] mt-0.5">
                    ブラウザ内で自動的に4分割（左上・右上・左下・右下）＋サムネイルに生成されます
                  </p>
                </div>

                {/* Rakkan & Watermark Options */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-[11px] text-[#6f6d67] mb-1">
                      落款印 (漢字1字)
                    </label>
                    <input
                      type="text"
                      maxLength={1}
                      value={rakkanChar}
                      onChange={(e) => setRakkanChar(e.target.value)}
                      className="w-full text-center font-serif text-sm bg-white border border-[#2a2926]/30 rounded py-1 px-2"
                      placeholder="写"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#6f6d67] mb-1">
                      ウォーターマーク表記
                    </label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="w-full text-xs font-serif bg-white border border-[#2a2926]/30 rounded py-1 px-2"
                      placeholder="VIDE SIGNIFIANT"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGeneratePreset}
                  disabled={isProcessingImage}
                  className="mt-3 w-full py-2 px-3 text-xs bg-[#edeae4] hover:bg-[#dedbd5] border border-[#2a2926]/30 rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessingImage ? 'animate-spin' : ''}`} />
                  京都アーカイブ高解像度サンプルを描画・スライス
                </button>
              </div>

              {/* Slicing Output Preview */}
              <div className="bg-[#1e1d1b] p-3 rounded text-white flex flex-col items-center justify-center min-h-[220px]">
                {isProcessingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#dcdad4]" />
                    <span className="text-xs text-[#dcdad4]">画像を4分割生成中...</span>
                  </div>
                ) : splitUrls[0] ? (
                  <div className="w-full flex flex-col items-center">
                    <div className="flex items-center justify-between w-full mb-2 px-1">
                      <span className="text-[11px] text-[#dcdad4] font-mono">
                        4分割タイル プレビュー
                      </span>
                      <div className="flex gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setPreviewTab('4split')}
                          className={`px-2 py-0.5 rounded ${previewTab === '4split' ? 'bg-[#dcdad4] text-[#1e1d1b]' : 'text-gray-400'}`}
                        >
                          接合結合
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewTab('tiles')}
                          className={`px-2 py-0.5 rounded ${previewTab === 'tiles' ? 'bg-[#dcdad4] text-[#1e1d1b]' : 'text-gray-400'}`}
                        >
                          4分割分離
                        </button>
                      </div>
                    </div>

                    {previewTab === '4split' ? (
                      <div
                        className="grid grid-cols-2 grid-rows-2 max-w-[200px] w-full border border-neutral-700 shadow-lg"
                        style={{ aspectRatio: `${formatInfo.w} / ${formatInfo.h}` }}
                      >
                        {splitUrls.map((url, i) => (
                          <img
                            key={i}
                            src={imageUrl(url)}
                            alt=""
                            className="w-full h-full object-fill block"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 max-w-[220px] w-full">
                        {splitUrls.map((url, i) => (
                          <div key={i} className="relative border border-neutral-700 aspect-video">
                            <img
                              src={imageUrl(url)}
                              alt=""
                              className="w-full h-full object-cover block"
                            />
                            <span className="absolute bottom-0 right-0 bg-black/80 text-[9px] px-1 text-emerald-400 font-mono">
                              {['TL', 'TR', 'BL', 'BR'][i]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                      <Check className="w-3 h-3" /> 4タイル + サムネイル生成完了
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[#a49f96] p-4 text-xs">
                    <p>画像をアップロードすると</p>
                    <p className="mt-1 font-mono text-[11px]">
                      _tl.webp, _tr.webp, _bl.webp, _br.webp
                    </p>
                    <p className="mt-0.5">がリアルタイムに生成されます</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Basic Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6f6d67] uppercase tracking-wider mb-1">
                作品ID (KYOTO-XXXX) *
              </label>
              <input
                type="text"
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full text-sm font-mono bg-white border border-[#2a2926]/30 rounded p-2 focus:border-[#23221f] focus:outline-none"
                placeholder="KYOTO-0010"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#6f6d67] uppercase tracking-wider mb-1">
                作品タイトル *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm font-serif bg-white border border-[#2a2926]/30 rounded p-2 focus:border-[#23221f] focus:outline-none"
                placeholder="例: 高台寺 傘亭の薄明"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#6f6d67] uppercase tracking-wider mb-1">
                副題 (英語 / ロマ字タイトル)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full text-sm font-sans bg-white border border-[#2a2926]/30 rounded p-2 focus:border-[#23221f] focus:outline-none"
                placeholder="Twilight over Kasa-tei Tea House"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6f6d67] uppercase tracking-wider mb-1">
                所属テーマ (フォーマット連動) *
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full text-sm bg-white border border-[#2a2926]/30 rounded p-2 focus:border-[#23221f] focus:outline-none"
              >
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({FORMAT_DIMENSIONS[t.format].label})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 3: Location, Date & Collections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6f6d67] uppercase tracking-wider mb-1">
                撮影場所・寺社名
              </label>
              <input
                type="text"
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                className="w-full text-sm bg-white border border-[#2a2926]/30 rounded p-2 focus:border-[#23221f] focus:outline-none"
                placeholder="例: 高台寺 傘亭"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6f6d67] uppercase tracking-wider mb-1">
                地域・エリア
              </label>
              <input
                type="text"
                value={locArea}
                onChange={(e) => setLocArea(e.target.value)}
                className="w-full text-sm bg-white border border-[#2a2926]/30 rounded p-2 focus:border-[#23221f] focus:outline-none"
                placeholder="東山区 下河原町"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6f6d67] uppercase tracking-wider mb-1">
                撮影年月 (YYYY-MM)
              </label>
              <input
                type="month"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-sm font-mono bg-white border border-[#2a2926]/30 rounded p-2 focus:border-[#23221f] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6f6d67] uppercase tracking-wider mb-1">
                季節
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value as Photo['season'])}
                className="w-full text-sm bg-white border border-[#2a2926]/30 rounded p-2 focus:border-[#23221f] focus:outline-none"
              >
                <option value="春">春 (Spring)</option>
                <option value="夏">夏 (Summer)</option>
                <option value="秋">秋 (Autumn)</option>
                <option value="冬">冬 (Winter)</option>
                <option value="通年">通年</option>
              </select>
            </div>
          </div>

          {/* Section 3.5: Collection Labels Management */}
          <div className="p-4 bg-white/70 border border-[#2a2926]/20 rounded space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#23221f] uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#23221f]" />
                絞り込みラベル・コレクション (Labels)
              </label>
              <span className="text-[11px] text-[#6f6d67]">
                鑑賞者がギャラリーで絞り込みに使用するタグ
              </span>
            </div>

            {/* Current Selected Label Chips */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-white border border-[#2a2926]/20 rounded">
              {collections.length === 0 ? (
                <span className="text-xs text-[#6f6d67] italic p-0.5">
                  ラベルが設定されていません（下の候補または新規追加から付与してください）
                </span>
              ) : (
                collections.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#23221f] text-[#f6f6f3] text-xs rounded-full font-serif"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-300 ml-0.5"
                      title="ラベルを外す"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Candidate labels from archive */}
            {allAvailableTags.filter((t) => !collections.includes(t)).length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] text-[#6f6d67] block">
                  既存のアーカイブ候補からワンクリックで追加:
                </span>
                <div className="flex flex-wrap gap-1">
                  {allAvailableTags
                    .filter((t) => !collections.includes(t))
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="text-[11px] px-2.5 py-0.5 bg-[#edeae4] hover:bg-[#23221f] hover:text-[#f6f6f3] text-[#23221f] border border-[#2a2926]/20 rounded-full font-serif transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>{tag}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Create new label input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(newTagInput);
                  }
                }}
                placeholder="新しいラベル名を入力（例: 枯山水, 嵐山, 陰翳...）"
                className="flex-1 text-xs bg-white border border-[#2a2926]/30 rounded p-1.5 focus:border-[#23221f] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddTag(newTagInput)}
                className="px-3 py-1.5 bg-[#edeae4] hover:bg-[#23221f] hover:text-[#f6f6f3] text-[#23221f] border border-[#2a2926]/30 text-xs rounded transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>追加</span>
              </button>
            </div>
          </div>

          {/* Section 3.6: Creator Framing Specifications */}
          <div className="p-4 bg-white/70 border border-[#2a2926]/20 rounded space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-serif text-xs font-bold text-[#23221f] uppercase tracking-wider">
                製作者による額装仕様の指定 (Framing Specifications)
              </span>
              <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                鑑賞者画面では固定表示（鑑賞者は変更不可）
              </span>
            </div>
            <p className="text-[11px] text-[#6f6d67] leading-relaxed">
              額装（木材仕上げ）と台紙（マット色）は作品の佇まいを決定づける製作者の演出です。鑑賞者（一般来訪者）による改変を防ぐため、ここで指定された仕様で固定されます。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Mat color choice */}
              <div>
                <label className="block text-xs font-semibold text-[#6f6d67] mb-2 font-serif">
                  台紙マット色
                </label>
                <div className="space-y-1.5">
                  {(
                    [
                      { id: 'mat-karegane', label: '枯れ金 (Aged Gold)', bg: '#bfa776' },
                      { id: 'mat-wamurasaki', label: '和紫 (Deep Violet)', bg: '#4a2e52' },
                      { id: 'mat-washi', label: '和紙 (Ecru)', bg: '#f6f6f3' },
                      { id: 'mat-charcoal', label: '墨 (Sumi)', bg: '#1e1d1b' },
                      { id: 'mat-indigo', label: '藍 (Indigo)', bg: '#141b24' },
                      { id: 'mat-kurenai', label: '紅色 (Crimson)', bg: '#bc002d' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMatColor(m.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded border text-xs flex items-center justify-between transition-all ${
                        matColor === m.id
                          ? 'border-[#23221f] bg-white font-medium shadow-sm ring-1 ring-[#23221f]'
                          : 'border-[#2a2926]/20 bg-[#f9f8f6] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/25 shrink-0"
                          style={{ backgroundColor: m.bg }}
                        />
                        <span className="font-serif">{m.label}</span>
                      </div>
                      {matColor === m.id && <Check className="w-3.5 h-3.5 text-[#23221f]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame wood finish */}
              <div>
                <label className="block text-xs font-semibold text-[#6f6d67] mb-2 font-serif">
                  額縁仕様 (Frame Border)
                </label>
                <div className="space-y-1.5">
                  {(
                    [
                      { id: 'frame-oak', label: 'Antique Oak Wood (古材オーク)' },
                      { id: 'frame-susutake', label: '艶消し銀 (Matte Silver)' },
                      { id: 'frame-ebony', label: '黒檀 (Ebony Black)' },
                      { id: 'frame-hinoki', label: '檜木 (Natural Hinoki)' },
                      { id: 'frame-shunuri', label: '朱塗り (Vermilion Lacquer)' },
                      { id: 'frame-float', label: '浮かし (Minimal Float)' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFrameBorder(f.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded border text-xs flex items-center justify-between transition-all ${
                        frameBorder === f.id
                          ? 'border-[#23221f] bg-white font-medium shadow-sm ring-1 ring-[#23221f]'
                          : 'border-[#2a2926]/20 bg-[#f9f8f6] hover:bg-white'
                      }`}
                    >
                      <span className="font-serif">{f.label}</span>
                      {frameBorder === f.id && <Check className="w-3.5 h-3.5 text-[#23221f]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mat padding */}
              <div>
                <label className="block text-xs font-semibold text-[#6f6d67] mb-2 font-serif">
                  台紙の余白
                </label>
                <div className="space-y-1.5">
                  {(
                    [
                      { id: 'none', label: '無 (枠のみ)', desc: '台紙なし・額縁幅2倍で作品を直接囲む' },
                      { id: 'normal', label: '標準余白 (バランス)', desc: '作品と額縁の調和' },
                      { id: 'wide', label: '広め (ゆったり)', desc: '美術館のような余白感' },
                      { id: 'compact', label: '小余白 (コンパクト)', desc: '作品そのものを前面に' },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setMatPadding(p.id)}
                      className={`w-full text-left px-2.5 py-2 rounded border text-xs flex items-center justify-between transition-all ${
                        matPadding === p.id
                          ? 'border-[#23221f] bg-white font-medium shadow-sm ring-1 ring-[#23221f]'
                          : 'border-[#2a2926]/20 bg-[#f9f8f6] hover:bg-white'
                      }`}
                    >
                      <div>
                        <span className="font-serif block">{p.label}</span>
                        <span className="text-[10px] text-[#6f6d67] block mt-0.5">{p.desc}</span>
                      </div>
                      {matPadding === p.id && <Check className="w-3.5 h-3.5 text-[#23221f]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Descriptions */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#6f6d67] uppercase tracking-wider mb-1">
                作品解説・ステートメント
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm font-sans bg-white border border-[#2a2926]/30 rounded p-2 focus:border-[#23221f] focus:outline-none"
                placeholder="作品の背景、光と影の意図、京都の空気感..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6f6d67] uppercase tracking-wider mb-1">
                キュレーターノート (構図・フォーマット考察)
              </label>
              <input
                type="text"
                value={curatorNotes}
                onChange={(e) => setCuratorNotes(e.target.value)}
                className="w-full text-xs font-sans bg-white border border-[#2a2926]/30 rounded p-2 focus:border-[#23221f] focus:outline-none"
                placeholder="なぜこの比率と分割が作品の本質を引き出すのか..."
              />
            </div>
          </div>

          {/* Section 5: Camera & Technical EXIF */}
          <details
            open={Boolean(detectedExif || camera)}
            className="text-xs border border-[#2a2926]/20 rounded p-3 bg-[#edeae4]/50 transition-all"
          >
            <summary className="font-semibold text-[#6f6d67] cursor-pointer hover:text-[#23221f] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#23221f]" />
                撮影機材・EXIFデータ（カメラ・レンズ・撮影設定）
              </span>
              {detectedExif && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded">
                  写真から自動反映済
                </span>
              )}
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3">
              <div>
                <label className="block text-[11px] text-[#6f6d67] mb-1">カメラ</label>
                <input
                  type="text"
                  value={camera}
                  onChange={(e) => setCamera(e.target.value)}
                  className="w-full bg-white border border-[#2a2926]/30 rounded p-1 text-xs"
                  placeholder="Leica SL2"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#6f6d67] mb-1">レンズ</label>
                <input
                  type="text"
                  value={lens}
                  onChange={(e) => setLens(e.target.value)}
                  className="w-full bg-white border border-[#2a2926]/30 rounded p-1 text-xs"
                  placeholder="50mm f/1.4"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#6f6d67] mb-1">焦点距離</label>
                <input
                  type="text"
                  value={focalLength}
                  onChange={(e) => setFocalLength(e.target.value)}
                  className="w-full bg-white border border-[#2a2926]/30 rounded p-1 text-xs"
                  placeholder="50mm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#6f6d67] mb-1">絞り値</label>
                <input
                  type="text"
                  value={aperture}
                  onChange={(e) => setAperture(e.target.value)}
                  className="w-full bg-white border border-[#2a2926]/30 rounded p-1 text-xs"
                  placeholder="f/5.6"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#6f6d67] mb-1">シャッター</label>
                <input
                  type="text"
                  value={shutter}
                  onChange={(e) => setShutter(e.target.value)}
                  className="w-full bg-white border border-[#2a2926]/30 rounded p-1 text-xs"
                  placeholder="1/125s"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#6f6d67] mb-1">ISO感度</label>
                <input
                  type="text"
                  value={iso}
                  onChange={(e) => setIso(e.target.value)}
                  className="w-full bg-white border border-[#2a2926]/30 rounded p-1 text-xs"
                  placeholder="100"
                />
              </div>
            </div>
          </details>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#2a2926]/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#2a2926]/30 rounded text-sm hover:bg-black/5"
            >
              キャンセル
            </button>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-[#23221f] text-[#f6f6f3] rounded text-sm font-medium hover:bg-[#383733] transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {isEditing ? '作品情報を保存' : 'アーカイブに追加する'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
