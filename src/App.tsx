import { useEffect, useState, useMemo } from 'react';
import type { Photo, Theme, Format, MatColor, FrameBorder, MatPadding } from './types';
import { FORMAT_DIMENSIONS } from './types';
import { INITIAL_PHOTOS, INITIAL_THEMES } from './data/initialData';
import { Frame } from './components/Frame';
import { EditorModal } from './components/EditorModal';
import { ThemeEditorModal } from './components/ThemeEditorModal';
import { ExportModal } from './components/ExportModal';
import { SeamInspectionModal } from './components/SeamInspectionModal';
import { LabelManagerModal } from './components/LabelManagerModal';
import { generatePhotoTiles } from './lib/kyotoArtworkGenerator';
import { imageUrl } from './lib/imageUrl';
import {
  Plus,
  Sliders,
  Download,
  Search,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Edit,
  Trash2,
  Camera,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  FolderOpen,
  LayoutGrid,
  Columns,
  Maximize2,
  Eye,
  Tag,
} from 'lucide-react';

const STORAGE_KEY_PHOTOS = 'vide_signifiant_photos_v1';
const STORAGE_KEY_THEMES = 'vide_signifiant_themes_v1';
const STORAGE_KEY_BASE_URL = 'vide_signifiant_base_url_v1';

// Hash routing support (#/ and #/photo/<id>) matching original project
const useHash = () => {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const handleHash = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);
  return hash;
};

export default function App() {
  const hash = useHash();

  // Primary data state
  const [photos, setPhotos] = useState<Photo[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PHOTOS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load photos from localStorage', e);
    }
    return INITIAL_PHOTOS;
  });

  const [themes, setThemes] = useState<Theme[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEMES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load themes from localStorage', e);
    }
    return INITIAL_THEMES;
  });

  const [imageBaseUrl, setImageBaseUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_BASE_URL) || '/images/';
  });

  // UI state
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewLayout, setViewLayout] = useState<'wall' | 'catalog' | 'slideshow'>('wall');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  // Mode: Public Viewer (鑑賞者モード) vs Curator Studio (キュレーター編集モード)
  // When deployed to Cloudflare with VITE_PUBLIC_VIEWER_ONLY=true, editor is completely locked out
  const isViewerOnly = import.meta.env.VITE_PUBLIC_VIEWER_ONLY === 'true';
  const [isCuratorMode, setIsCuratorMode] = useState<boolean>(() => {
    if (isViewerOnly) return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('curator') === 'true';
  });
  const [isGeneratingTiles, setIsGeneratingTiles] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');

  // Framing display preferences
  const [matColor, setMatColor] = useState<MatColor>('mat-washi');
  const [frameBorder, setFrameBorder] = useState<FrameBorder>('frame-susutake');
  const [matPadding, setMatPadding] = useState<MatPadding>('normal');

  // Modal states
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [isThemeEditorOpen, setIsThemeEditorOpen] = useState<boolean>(false);
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isSeamModalOpen, setIsSeamModalOpen] = useState<boolean>(false);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(photos));
    } catch (e) {
      console.warn('Storage limit reached, could not save all photo data URLs', e);
    }
  }, [photos]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THEMES, JSON.stringify(themes));
    } catch (e) {
      console.error('Failed to save themes', e);
    }
  }, [themes]);

  // Generate high-resolution procedural Kyoto photo tiles on first load if missing data URLs
  useEffect(() => {
    const needGeneration = photos.some(
      (p) => !p.images.thumbnail.startsWith('data:') && !p.images.thumbnail.startsWith('http')
    );

    if (needGeneration && !isGeneratingTiles) {
      setIsGeneratingTiles(true);
      (async () => {
        try {
          const updated = [...photos];
          for (let i = 0; i < updated.length; i++) {
            const p = updated[i];
            if (!p.images.thumbnail.startsWith('data:') && !p.images.thumbnail.startsWith('http')) {
              setGenerationProgress(`${p.title} (${i + 1}/${updated.length})`);
              const gen = await generatePhotoTiles(p.id);
              updated[i] = {
                ...p,
                images: {
                  thumbnail: gen.thumbnail,
                  split: gen.split,
                  master: gen.master,
                },
              };
            }
          }
          setPhotos(updated);
        } catch (err) {
          console.error('Error generating photo tiles:', err);
        } finally {
          setIsGeneratingTiles(false);
          setGenerationProgress('');
        }
      })();
    }
  }, []);

  // Format mapping
  const formatOf = (p: Photo): Format => {
    return themes.find((t) => t.id === p.theme)?.format ?? 'landscape';
  };

  // Extract all unique collection tags
  const allTags = useMemo(() => {
    return Array.from(new Set(photos.flatMap((p) => p.collections)));
  }, [photos]);

  // Photos count by theme for theme editor
  const photosCountByTheme = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const p of photos) {
      acc[p.theme] = (acc[p.theme] || 0) + 1;
    }
    return acc;
  }, [photos]);

  // Filtered photos based on search query and selected tag
  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      const matchTag = !selectedTag || p.collections.includes(selectedTag);
      const matchSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.season.includes(searchQuery);
      return matchTag && matchSearch;
    });
  }, [photos, selectedTag, searchQuery]);

  // Route matching: #/photo/<id>
  const photoMatch = hash.match(/^#\/photo\/(.+)$/);
  const currentPhoto = photoMatch ? photos.find((p) => p.id === photoMatch[1]) : null;

  // Previous & Next navigation for detail view
  const currentPhotoIndex = currentPhoto ? photos.findIndex((p) => p.id === currentPhoto.id) : -1;
  const prevPhoto = currentPhotoIndex > 0 ? photos[currentPhotoIndex - 1] : null;
  const nextPhoto = currentPhotoIndex >= 0 && currentPhotoIndex < photos.length - 1 ? photos[currentPhotoIndex + 1] : null;

  // Initialize or synchronize framing with current photo's creator specifications
  useEffect(() => {
    if (currentPhoto?.framing) {
      setMatColor(currentPhoto.framing.matColor);
      setFrameBorder(currentPhoto.framing.frameBorder);
      setMatPadding(currentPhoto.framing.matPadding || 'normal');
    }
  }, [currentPhoto?.id]);

  // Handlers for photos
  const handleSavePhoto = (savedPhoto: Photo) => {
    setPhotos((prev) => {
      const existsIndex = prev.findIndex((p) => p.id === savedPhoto.id);
      if (existsIndex >= 0) {
        const next = [...prev];
        next[existsIndex] = savedPhoto;
        return next;
      }
      return [savedPhoto, ...prev];
    });
  };

  const handleDeletePhoto = (photoId: string) => {
    if (confirm(`作品「${photoId}」をアーカイブから削除してもよろしいですか？`)) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      if (currentPhoto?.id === photoId) {
        window.location.hash = '#/';
      }
    }
  };

  const handleResetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEY_PHOTOS);
    localStorage.removeItem(STORAGE_KEY_THEMES);
    setPhotos(INITIAL_PHOTOS);
    setThemes(INITIAL_THEMES);
  };

  const handleUpdateImageBaseUrl = (newUrl: string) => {
    setImageBaseUrl(newUrl);
    localStorage.setItem(STORAGE_KEY_BASE_URL, newUrl);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#dcdad4] text-[#23221f]">
      {/* Top Notification / Generation Banner */}
      {isGeneratingTiles && (
        <div className="bg-[#23221f] text-[#f6f6f3] text-xs py-1.5 px-4 flex items-center justify-center gap-2 border-b border-[#2a2926]">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          <span>京都写真マスターから4分割画像を生成中: {generationProgress}</span>
        </div>
      )}

      {/* Header */}
      <header className="px-6 md:px-12 pt-8 pb-5 border-b border-[#2a2926]/15 bg-[#dcdad4]/90 backdrop-blur-md sticky top-0 z-30 transition-all">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-4 flex-wrap">
            <a
              href="#/"
              className="font-serif text-2xl md:text-3xl tracking-[0.22em] text-[#23221f] hover:opacity-80 transition-opacity uppercase font-medium"
            >
              VIDE SIGNIFIANT
            </a>
            <span className="text-xs md:text-sm text-[#6f6d67] tracking-wider font-serif">
              Kyoto Photo Archive & Studio — 京都写真記録
            </span>
          </div>

          {/* Mode Switcher & Studio Actions (Completely hidden in viewer-only production deployment) */}
          {!isViewerOnly && (
            <div className="flex items-center gap-3 flex-wrap">
              {/* Mode Switcher */}
              <div className="flex items-center gap-1 bg-white/70 p-1 border border-[#2a2926]/20 rounded text-xs shadow-sm">
                <button
                  onClick={() => setIsCuratorMode(false)}
                  className={`px-3 py-1 rounded flex items-center gap-1.5 font-serif transition-colors ${
                    !isCuratorMode
                      ? 'bg-[#23221f] text-[#f6f6f3] font-medium shadow-sm'
                      : 'text-[#6f6d67] hover:text-[#23221f]'
                  }`}
                  title="一般来訪者が閲覧する本番公開時の画面"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>鑑賞者モード（公開画面）</span>
                </button>

                <button
                  onClick={() => setIsCuratorMode(true)}
                  className={`px-3 py-1 rounded flex items-center gap-1.5 font-serif transition-colors ${
                    isCuratorMode
                      ? 'bg-[#23221f] text-[#f6f6f3] font-medium shadow-sm'
                      : 'text-[#6f6d67] hover:text-[#23221f]'
                  }`}
                  title="作品の追加・スライス・メタデータ編集スタジオ"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>キュレーター編集</span>
                </button>
              </div>

              {/* Studio Action Toolbar (only visible in curator mode) */}
              {isCuratorMode && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setEditingPhoto(null);
                      setIsEditorOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-[#23221f] text-[#f6f6f3] text-xs font-medium rounded hover:bg-[#383733] transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>作品を追加</span>
                  </button>

                  <button
                    onClick={() => setIsThemeEditorOpen(true)}
                    className="px-3 py-1.5 bg-white/60 hover:bg-white text-[#23221f] border border-[#2a2926]/30 text-xs rounded transition-colors flex items-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#6f6d67]" />
                    <span>テーマ管理</span>
                  </button>

                  <button
                    onClick={() => setIsLabelManagerOpen(true)}
                    className="px-3 py-1.5 bg-white/60 hover:bg-white text-[#23221f] border border-[#2a2926]/30 text-xs rounded transition-colors flex items-center gap-1.5"
                    title="絞り込みラベル・コレクションタグの一元管理"
                  >
                    <Tag className="w-3.5 h-3.5 text-[#6f6d67]" />
                    <span>ラベル管理</span>
                  </button>

                  <button
                    onClick={() => setIsExportOpen(true)}
                    className="px-3 py-1.5 bg-white/60 hover:bg-white text-[#23221f] border border-[#2a2926]/30 text-xs rounded transition-colors flex items-center gap-1.5"
                    title="JSONダウンロード & R2デプロイ"
                  >
                    <Download className="w-3.5 h-3.5 text-[#6f6d67]" />
                    <span>データ入出力</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-6 md:px-12 py-8 max-w-7xl w-full mx-auto">
        {currentPhoto ? (
          /* =========================================================================
             1. DETAIL VIEW: Framed SplitImageView with Protection & Seam Diagnostic
             ========================================================================= */
          <section className="flex flex-col items-center max-w-4xl mx-auto space-y-8 animate-fadeIn">
            {/* Top Navigation & Action Row */}
            <div className="w-full flex items-center justify-between border-b border-[#2a2926]/15 pb-4 flex-wrap gap-3">
              <a
                href="#/"
                className="inline-flex items-center gap-2 text-xs font-serif text-[#23221f] hover:text-[#6f6d67] tracking-wider transition-colors py-1 px-2 -ml-2 rounded hover:bg-black/5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>アーカイブ一覧へ戻る</span>
              </a>

              <div className="flex items-center gap-2">
                {prevPhoto && (
                  <a
                    href={`#/photo/${prevPhoto.id}`}
                    className="p-1.5 text-xs border border-[#2a2926]/30 bg-white/50 hover:bg-white rounded flex items-center gap-1 text-[#23221f]"
                    title={`前の作品: ${prevPhoto.title}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">前へ</span>
                  </a>
                )}
                {nextPhoto && (
                  <a
                    href={`#/photo/${nextPhoto.id}`}
                    className="p-1.5 text-xs border border-[#2a2926]/30 bg-white/50 hover:bg-white rounded flex items-center gap-1 text-[#23221f]"
                    title={`次の作品: ${nextPhoto.title}`}
                  >
                    <span className="hidden sm:inline">次へ</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                )}

                {isCuratorMode && (
                  <>
                    <div className="h-4 w-[1px] bg-[#2a2926]/20 mx-1" />

                    <button
                      onClick={() => setIsSeamModalOpen(true)}
                      className="px-2.5 py-1.5 bg-emerald-900/10 hover:bg-emerald-900/20 text-emerald-900 border border-emerald-800/30 text-xs rounded flex items-center gap-1.5 font-medium transition-colors"
                      title="4分割の継ぎ目を拡大検査"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-emerald-700" />
                      <span>継ぎ目検証ツール</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingPhoto(currentPhoto);
                        setIsEditorOpen(true);
                      }}
                      className="px-2.5 py-1.5 bg-white/70 hover:bg-white text-[#23221f] border border-[#2a2926]/30 text-xs rounded flex items-center gap-1.5 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5 text-[#6f6d67]" />
                      <span>作品を編集</span>
                    </button>

                    <button
                      onClick={() => handleDeletePhoto(currentPhoto.id)}
                      className="p-1.5 text-red-700 hover:bg-red-50 border border-red-200 rounded transition-colors"
                      title="作品を削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Exhibition Framing Customizer Controls (Curator Preview only) */}
            {isCuratorMode && (
              <div className="w-full p-3 bg-white/70 border border-[#2a2926]/20 rounded text-xs space-y-2 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#2a2926]/10">
                  <div className="flex items-center gap-1.5 font-semibold text-[#23221f]">
                    <Sliders className="w-3.5 h-3.5 text-[#6f6d67]" />
                    <span>製作者プレビュー: 額装シミュレーション</span>
                  </div>
                  <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    一般鑑賞者には非表示（鑑賞者は額装変更不可）
                  </span>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                  {/* Mat color */}
                  <div className="flex items-center gap-2">
                    <span className="text-[#6f6d67] font-serif">台紙:</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {(
                        [
                          { id: 'mat-karegane', label: '枯れ金', bg: '#bfa776' },
                          { id: 'mat-wamurasaki', label: '和紫', bg: '#4a2e52' },
                          { id: 'mat-washi', label: '和紙', bg: '#f6f6f3' },
                          { id: 'mat-charcoal', label: '墨', bg: '#1e1d1b' },
                          { id: 'mat-indigo', label: '藍', bg: '#141b24' },
                          { id: 'mat-kurenai', label: '紅色', bg: '#bc002d' },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setMatColor(m.id)}
                          className={`px-2 py-0.5 rounded border text-[11px] flex items-center gap-1.5 transition-all ${
                            matColor === m.id
                              ? 'border-[#23221f] font-semibold ring-1 ring-[#23221f] bg-white'
                              : 'border-[#2a2926]/20 opacity-80 hover:opacity-100 bg-[#f9f8f6]'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/20"
                            style={{ backgroundColor: m.bg }}
                          />
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frame wood finish */}
                  <div className="flex items-center gap-2">
                    <span className="text-[#6f6d67] font-serif">額縁:</span>
                    <select
                      value={frameBorder}
                      onChange={(e) => setFrameBorder(e.target.value as FrameBorder)}
                      className="bg-white border border-[#2a2926]/30 rounded px-2 py-0.5 text-xs text-[#23221f]"
                    >
                      <option value="frame-oak">Antique Oak Wood (古材オーク)</option>
                      <option value="frame-susutake">艶消し銀 (Matte Silver)</option>
                      <option value="frame-ebony">黒檀 (Ebony Black)</option>
                      <option value="frame-hinoki">檜木 (Natural Hinoki)</option>
                      <option value="frame-shunuri">朱塗り (Vermilion Lacquer)</option>
                      <option value="frame-float">浮かし (Minimal Float)</option>
                    </select>
                  </div>

                  {/* Mat padding */}
                  <div className="flex items-center gap-2">
                    <span className="text-[#6f6d67] font-serif">余白:</span>
                    <div className="flex gap-1">
                      {(['none', 'compact', 'normal', 'wide'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setMatPadding(p)}
                          className={`px-2 py-0.5 rounded text-[11px] border ${
                            matPadding === p
                              ? 'bg-[#23221f] text-[#f6f6f3] border-[#23221f]'
                              : 'bg-white border-[#2a2926]/20'
                          }`}
                        >
                          {p === 'none' ? '無' : p === 'compact' ? '小' : p === 'normal' ? '標準' : '大'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* The Framed Artwork Presentation */}
            <div className="my-2">
              <Frame
                photo={currentPhoto}
                format={formatOf(currentPhoto)}
                matColor={isCuratorMode ? matColor : (currentPhoto.framing?.matColor ?? 'mat-karegane')}
                frameBorder={isCuratorMode ? frameBorder : (currentPhoto.framing?.frameBorder ?? 'frame-oak')}
                matPadding={isCuratorMode ? matPadding : (currentPhoto.framing?.matPadding ?? 'normal')}
                showSeamDiagnostic={false}
              />
            </div>

            {/* Protection Notice Badge */}
            <div className="text-[11px] text-[#6f6d67] font-serif tracking-wider bg-white/40 border border-[#2a2926]/10 px-4 py-2 rounded flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
              <span>
                4分割画像結合表示中（透明保護シールド有効・右クリック及びドラッグ保存抑止）
              </span>
            </div>

            {/* Description & Curator Statement */}
            <div className="w-full bg-[#f6f6f3] border border-[#2a2926]/20 p-6 sm:p-8 rounded shadow-sm space-y-6">
              <div>
                <h4 className="font-serif text-xs font-bold text-[#6f6d67] uppercase tracking-widest mb-2">
                  作品解説 (Artwork Statement)
                </h4>
                <p className="font-serif text-base text-[#23221f] leading-relaxed">
                  {currentPhoto.description}
                </p>
                {currentPhoto.curatorNotes && (
                  <p className="mt-3 text-xs text-[#6f6d67] italic font-sans border-l-2 border-[#2a2926]/30 pl-3">
                    キュレーター考察: {currentPhoto.curatorNotes}
                  </p>
                )}
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-[#2a2926]/15 text-xs">
                <div>
                  <span className="text-[#6f6d67] block flex items-center gap-1 mb-1 font-serif">
                    <MapPin className="w-3.5 h-3.5 text-[#23221f]" /> 撮影地・地域
                  </span>
                  <span className="font-medium text-[#23221f]">
                    {currentPhoto.location.name}
                  </span>
                  <span className="block text-[#6f6d67] text-[11px]">
                    {currentPhoto.location.area}
                  </span>
                </div>

                <div>
                  <span className="text-[#6f6d67] block flex items-center gap-1 mb-1 font-serif">
                    <Calendar className="w-3.5 h-3.5 text-[#23221f]" /> 撮影時期・季節
                  </span>
                  <span className="font-medium text-[#23221f]">
                    {currentPhoto.date} ({currentPhoto.season})
                  </span>
                </div>

                <div>
                  <span className="text-[#6f6d67] block flex items-center gap-1 mb-1 font-serif">
                    <Layers className="w-3.5 h-3.5 text-[#23221f]" /> 所属コレクション
                  </span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {currentPhoto.collections.map((tag) => (
                      <span
                        key={tag}
                        className="bg-[#edeae4] text-[#23221f] px-2 py-0.5 rounded text-[11px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Camera & Technical EXIF (Curator Studio mode only - hidden from public visitors) */}
              {isCuratorMode && currentPhoto.cameraInfo && (
                <div className="pt-4 border-t border-[#2a2926]/15">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#6f6d67] flex items-center gap-1 font-serif text-xs">
                      <Camera className="w-3.5 h-3.5 text-[#23221f]" /> 機材・EXIFデータ（キュレーター管理用）
                    </span>
                    <span className="text-[10px] text-[#6f6d67] bg-[#edeae4] px-2 py-0.5 rounded border border-[#2a2926]/15">
                      ※ 鑑賞者（一般来訪者）画面では非表示
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs font-mono bg-[#edeae4]/60 p-3 rounded">
                    <div>
                      <span className="text-[10px] text-[#6f6d67] block">カメラ</span>
                      <span className="truncate block font-medium">
                        {currentPhoto.cameraInfo.camera || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6f6d67] block">レンズ</span>
                      <span className="truncate block font-medium">
                        {currentPhoto.cameraInfo.lens || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6f6d67] block">焦点距離</span>
                      <span className="block font-medium">
                        {currentPhoto.cameraInfo.focalLength || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6f6d67] block">絞り</span>
                      <span className="block font-medium">
                        {currentPhoto.cameraInfo.aperture || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6f6d67] block">シャッター</span>
                      <span className="block font-medium">
                        {currentPhoto.cameraInfo.shutter || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6f6d67] block">ISO</span>
                      <span className="block font-medium">
                        {currentPhoto.cameraInfo.iso || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom link to return */}
            <div className="pt-2">
              <a
                href="#/"
                className="font-serif text-sm tracking-widest text-[#23221f] hover:underline"
              >
                ← 一覧へ戻る (Back to Archive)
              </a>
            </div>
          </section>
        ) : (
          /* =========================================================================
             2. GALLERY WALL VIEW: Organized by Themes & Search / Collections Filtering
             ========================================================================= */
          <div className="space-y-10">
            {/* Search & Tag Filter Bar */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6f6d67]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="作品名・場所・季節・キーワードで検索..."
                    className="w-full pl-9 pr-4 py-2 bg-white/70 focus:bg-white border border-[#2a2926]/20 focus:border-[#23221f] rounded text-xs transition-colors focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#6f6d67] hover:text-[#23221f]"
                    >
                      クリア
                    </button>
                  )}
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1 bg-white/70 p-1 border border-[#2a2926]/20 rounded text-xs shadow-sm">
                    <button
                      onClick={() => setViewLayout('wall')}
                      className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                        viewLayout === 'wall'
                          ? 'bg-[#23221f] text-[#f6f6f3]'
                          : 'text-[#6f6d67] hover:text-[#23221f]'
                      }`}
                      title="壁面展示ビュー（テーマ別・額装壁面）"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">壁面展示</span>
                    </button>

                    <button
                      onClick={() => setViewLayout('catalog')}
                      className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                        viewLayout === 'catalog'
                          ? 'bg-[#23221f] text-[#f6f6f3]'
                          : 'text-[#6f6d67] hover:text-[#23221f]'
                      }`}
                      title="目録カタログビュー（全作品一覧・レイアウト確認）"
                    >
                      <Columns className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">目録カタログ</span>
                    </button>

                    <button
                      onClick={() => {
                        setViewLayout('slideshow');
                        setActiveSlideIndex(0);
                      }}
                      className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                        viewLayout === 'slideshow'
                          ? 'bg-[#23221f] text-[#f6f6f3]'
                          : 'text-[#6f6d67] hover:text-[#23221f]'
                      }`}
                      title="展示室スライド鑑賞（1作品ずつ大画面で確認）"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">展示室鑑賞</span>
                    </button>
                  </div>

                  <div className="hidden md:flex items-center gap-2 text-xs text-[#6f6d67] font-serif">
                    <span>全 {photos.length} 作品収録</span>
                    <span>•</span>
                    <span>{themes.length} テーマ</span>
                  </div>
                </div>
              </div>

              {/* Collection Tags */}
              <nav className="flex gap-1.5 flex-wrap items-center">
                <span className="text-xs text-[#6f6d67] font-serif mr-1">絞り込み:</span>
                <button
                  onClick={() => setSelectedTag('')}
                  aria-pressed={!selectedTag}
                  className={`text-xs px-3 py-1 rounded transition-colors font-serif ${
                    !selectedTag
                      ? 'bg-[#23221f] text-[#f6f6f3]'
                      : 'bg-white/50 hover:bg-white text-[#23221f] border border-[#2a2926]/20'
                  }`}
                >
                  すべて ({photos.length})
                </button>
                {allTags.map((t) => {
                  const tagCount = photos.filter((p) => p.collections.includes(t)).length;
                  return (
                    <button
                      key={t}
                      onClick={() => setSelectedTag(t)}
                      aria-pressed={selectedTag === t}
                      className={`text-xs px-3 py-1 rounded transition-colors font-serif ${
                        selectedTag === t
                          ? 'bg-[#23221f] text-[#f6f6f3]'
                          : 'bg-white/50 hover:bg-white text-[#23221f] border border-[#2a2926]/20'
                      }`}
                    >
                      {t} ({tagCount})
                    </button>
                  );
                })}
                {isCuratorMode && (
                  <button
                    onClick={() => setIsLabelManagerOpen(true)}
                    className="text-xs px-2.5 py-1 bg-white/70 hover:bg-white text-[#23221f] border border-[#2a2926]/30 rounded font-serif transition-colors flex items-center gap-1 ml-1"
                    title="ラベル・コレクションタグの編集・追加・削除"
                  >
                    <Tag className="w-3 h-3 text-[#6f6d67]" />
                    <span>ラベル管理</span>
                  </button>
                )}
              </nav>
            </div>

            {/* View Layout 1: Wall Mode */}
            {viewLayout === 'wall' && (
              <div className="space-y-16">
                {themes.map((t) => {
                  const list = photos.filter((p) => {
                    const matchTheme = p.theme === t.id;
                    const matchTag = !selectedTag || p.collections.includes(selectedTag);
                    const matchSearch =
                      !searchQuery ||
                      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (p.subtitle && p.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
                      p.location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.location.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.season.includes(searchQuery);

                    return matchTheme && matchTag && matchSearch;
                  });

                  if (!list.length && (selectedTag || searchQuery)) return null;

                  const formatLabel =
                    t.format === 'landscape'
                      ? '16:9 Landscape'
                      : t.format === 'portrait'
                      ? '3:4 Portrait'
                      : '1:1 Square';

                  return (
                    <section key={t.id} className="space-y-6">
                      {/* Theme Header with Japanese Aesthetics */}
                      <div className="flex items-baseline justify-between border-b border-[#2a2926]/20 pb-3 flex-wrap gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="font-serif text-xl md:text-2xl font-normal text-[#23221f] tracking-wide">
                              {t.title}
                            </h2>
                            <span className="text-[11px] bg-[#23221f] text-[#f6f6f3] px-2 py-0.5 rounded font-mono">
                              {formatLabel}
                            </span>
                          </div>
                          {t.subtitle && (
                            <p className="text-xs text-[#6f6d67] tracking-wider font-serif">
                              {t.subtitle}
                            </p>
                          )}
                          {t.description && (
                            <p className="text-xs text-[#23221f]/70 max-w-xl font-sans mt-0.5">
                              {t.description}
                            </p>
                          )}
                        </div>

                        {isCuratorMode && (
                          <button
                            onClick={() => {
                              setEditingPhoto(null);
                              setIsEditorOpen(true);
                            }}
                            className="text-xs text-[#6f6d67] hover:text-[#23221f] flex items-center gap-1 font-serif py-1 px-2 hover:bg-black/5 rounded transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            このテーマに作品を追加
                          </button>
                        )}
                      </div>

                      {/* Exhibition Wall Grid */}
                      {list.length > 0 ? (
                        <div className="flex flex-wrap gap-8 items-end">
                          {list.map((p) => {
                            const widthClass =
                              t.format === 'landscape'
                                ? 'w-72'
                                : t.format === 'portrait'
                                ? 'w-56'
                                : 'w-60';

                            return (
                              <div key={p.id} className={`group ${widthClass}`}>
                                <a
                                  href={`#/photo/${p.id}`}
                                  className="block text-inherit no-underline"
                                >
                                  {/* Gallery Mat & Frame */}
                                  <div className="p-2.5 bg-[#f6f6f3] border border-[#2a2926] shadow-md group-hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-1 relative">
                                    <div className="overflow-hidden bg-[#22211e]">
                                      <img
                                        src={imageUrl(p.images.thumbnail)}
                                        alt={p.title}
                                        loading="lazy"
                                        draggable={false}
                                        className="w-full h-auto block object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                      />
                                    </div>

                                    {/* Quick Edit Overlay button (curator mode only) */}
                                    {isCuratorMode && (
                                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setEditingPhoto(p);
                                            setIsEditorOpen(true);
                                          }}
                                          className="p-1.5 bg-[#23221f] text-[#f6f6f3] rounded shadow hover:bg-black"
                                          title="作品を編集"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Caption Beneath Frame */}
                                  <div className="mt-2.5 px-0.5 space-y-0.5">
                                    <div className="flex items-baseline justify-between gap-2">
                                      <span className="font-serif text-sm font-medium text-[#23221f] block truncate">
                                        {p.title}
                                      </span>
                                      <span className="text-[10px] font-mono text-[#6f6d67] shrink-0">
                                        {p.id}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-[11px] text-[#6f6d67] truncate">
                                      <span>{p.location.name}</span>
                                      <span>•</span>
                                      <span>{p.season}</span>
                                    </div>
                                  </div>
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-white/30 border border-dashed border-[#2a2926]/20 rounded text-xs text-[#6f6d67]">
                          このテーマにはまだ作品が登録されていません。
                          <button
                            onClick={() => {
                              setEditingPhoto(null);
                              setIsEditorOpen(true);
                            }}
                            className="ml-2 text-[#23221f] underline hover:no-underline font-medium"
                          >
                            最初の作品を追加する
                          </button>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}

            {/* View Layout 2: Catalog Mode */}
            {viewLayout === 'catalog' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#2a2926]/20 pb-3 flex-wrap gap-2">
                  <div>
                    <h2 className="font-serif text-xl font-normal text-[#23221f]">
                      アーカイブ目録カタログ (Archive Catalog Grid)
                    </h2>
                    <p className="text-xs text-[#6f6d67] mt-0.5">
                      全 {filteredPhotos.length} 作品の比率・配置・機材EXIF・メタデータ一覧
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPhotos.map((p) => {
                    const themeObj = themes.find((t) => t.id === p.theme);
                    const format = themeObj?.format || 'landscape';
                    const formatInfo = FORMAT_DIMENSIONS[format];

                    return (
                      <div
                        key={p.id}
                        className="bg-[#f6f6f3] border border-[#2a2926]/20 rounded p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group"
                      >
                        <div className="space-y-3">
                          {/* Top row with format badge & ID */}
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[#23221f]">
                              {p.id}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#23221f] text-[#f6f6f3] rounded">
                              {formatInfo.ratio} ({formatInfo.w}×{formatInfo.h})
                            </span>
                          </div>

                          {/* Image preview with hover zoom */}
                          <a
                            href={`#/photo/${p.id}`}
                            className="block relative overflow-hidden rounded bg-[#1e1d1b] border border-[#2a2926]/20"
                            style={{ aspectRatio: `${formatInfo.w} / ${formatInfo.h}` }}
                          >
                            <img
                              src={imageUrl(p.images.thumbnail)}
                              alt={p.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-xs px-3 py-1 rounded flex items-center gap-1 font-serif">
                                <Eye className="w-3.5 h-3.5" /> 額装で鑑賞
                              </span>
                            </div>
                          </a>

                          {/* Meta & titles */}
                          <div>
                            <h3 className="font-serif text-base font-semibold text-[#23221f]">
                              {p.title}
                            </h3>
                            {p.subtitle && (
                              <p className="text-xs text-[#6f6d67] italic truncate">{p.subtitle}</p>
                            )}
                            <p className="text-xs text-[#6f6d67] mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#23221f]" />
                              {p.location.name} ({p.location.area}) • {p.season}
                            </p>
                          </div>

                          {/* Collection Tags */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {p.collections.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-serif bg-[#edeae4] text-[#6f6d67] px-2 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* EXIF Snapshot (Curator Studio only) */}
                          {isCuratorMode && p.cameraInfo && (
                            <div className="text-[10px] font-mono bg-[#edeae4] p-1.5 rounded text-[#6f6d67] flex items-center justify-between">
                              <span className="truncate">{p.cameraInfo.camera || 'Camera'}</span>
                              <span>{p.cameraInfo.aperture} • {p.cameraInfo.shutter}</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[#2a2926]/10">
                          <a
                            href={`#/photo/${p.id}`}
                            className="flex-1 py-1.5 px-3 bg-[#23221f] text-[#f6f6f3] text-xs rounded text-center font-serif hover:bg-[#3b3a37] transition-colors flex items-center justify-center gap-1.5"
                          >
                            <span>作品を額装で鑑賞する</span>
                            <span className="text-[11px]">→</span>
                          </a>
                          {isCuratorMode && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPhoto(p);
                                setIsEditorOpen(true);
                              }}
                              className="p-1.5 border border-[#2a2926]/30 rounded hover:bg-black/5 text-[#23221f]"
                              title="作品情報を編集"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* View Layout 3: Slideshow Mode */}
            {viewLayout === 'slideshow' && filteredPhotos.length > 0 && (
              <div className="bg-[#181715] text-[#f6f6f3] rounded-lg p-6 sm:p-10 shadow-2xl flex flex-col items-center space-y-6">
                <div className="w-full flex items-center justify-between border-b border-neutral-800 pb-3 flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-sm font-bold text-white">
                      展示室スライド鑑賞シミュレーション
                    </span>
                    <span className="font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">
                      作品 {activeSlideIndex + 1} / {filteredPhotos.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewLayout('wall')}
                      className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded"
                    >
                      通常壁面に戻る
                    </button>
                  </div>
                </div>

                {/* Centered Large Spotlight Artwork */}
                <div className="relative py-4 flex items-center justify-center w-full">
                  <button
                    onClick={() =>
                      setActiveSlideIndex((prev) =>
                        prev > 0 ? prev - 1 : filteredPhotos.length - 1
                      )
                    }
                    className="absolute left-0 z-20 p-2 sm:p-3 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors"
                    title="前の作品へ (←)"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>

                  <div className="max-w-2xl w-full flex justify-center">
                    <Frame
                      photo={filteredPhotos[activeSlideIndex]}
                      format={formatOf(filteredPhotos[activeSlideIndex])}
                      matColor={filteredPhotos[activeSlideIndex].framing?.matColor ?? 'mat-karegane'}
                      frameBorder={filteredPhotos[activeSlideIndex].framing?.frameBorder ?? 'frame-oak'}
                      matPadding={filteredPhotos[activeSlideIndex].framing?.matPadding ?? 'normal'}
                    />
                  </div>

                  <button
                    onClick={() =>
                      setActiveSlideIndex((prev) =>
                        prev < filteredPhotos.length - 1 ? prev + 1 : 0
                      )
                    }
                    className="absolute right-0 z-20 p-2 sm:p-3 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors"
                    title="次の作品へ (→)"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                {/* Bottom Filmstrip navigation */}
                <div className="w-full overflow-x-auto pt-4 border-t border-neutral-800 flex items-center gap-3 justify-center pb-2">
                  {filteredPhotos.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setActiveSlideIndex(idx)}
                      className={`relative shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                        activeSlideIndex === idx
                          ? 'border-emerald-400 scale-105 shadow-md'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imageUrl(p.images.thumbnail)}
                        alt={p.title}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 py-8 px-6 md:px-12 border-t border-[#2a2926]/15 text-xs text-[#6f6d67] font-serif bg-[#d4d2cb]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-semibold text-[#23221f] tracking-widest uppercase">
              VIDE SIGNIFIANT — Kyoto Photo Archive & Studio
            </p>
            <p className="text-[11px] mt-0.5">
              4分割画像保護システム • 16:9 / 3:4 / 1:1 比率規定アーカイブ • 額装展示
            </p>
          </div>

          {!isViewerOnly && isCuratorMode ? (
            <div className="flex items-center gap-4 text-[11px]">
              <button
                onClick={() => setIsExportOpen(true)}
                className="hover:underline flex items-center gap-1"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>データ入出力 (JSON / R2)</span>
              </button>
              <span>•</span>
              <button
                onClick={handleResetToDefaults}
                className="hover:underline"
              >
                初期データに戻す
              </button>
              <span>•</span>
              <button
                onClick={() => setIsCuratorMode(false)}
                className="hover:underline text-[#23221f] font-semibold"
              >
                鑑賞者モードへ
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 text-[11px]">
              <span>© VIDE SIGNIFIANT. All rights reserved.</span>
              {!isViewerOnly && (
                <>
                  <span>•</span>
                  <button
                    onClick={() => setIsCuratorMode(true)}
                    className="hover:underline text-[#6f6d67] opacity-60 hover:opacity-100"
                    title="キュレーター編集スタジオを開く"
                  >
                    Curator Studio
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </footer>

      {/* Modals */}
      <EditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingPhoto(null);
        }}
        onSave={handleSavePhoto}
        initialPhoto={editingPhoto}
        themes={themes}
        existingIds={photos.map((p) => p.id)}
        allAvailableTags={allTags}
      />

      <ThemeEditorModal
        isOpen={isThemeEditorOpen}
        onClose={() => setIsThemeEditorOpen(false)}
        themes={themes}
        onSaveThemes={setThemes}
        photosCountByTheme={photosCountByTheme}
      />

      <LabelManagerModal
        isOpen={isLabelManagerOpen}
        onClose={() => setIsLabelManagerOpen(false)}
        photos={photos}
        onUpdatePhotos={setPhotos}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        photos={photos}
        themes={themes}
        onResetToDefaults={handleResetToDefaults}
        imageBaseUrl={imageBaseUrl}
        onUpdateImageBaseUrl={handleUpdateImageBaseUrl}
      />

      {currentPhoto && (
        <SeamInspectionModal
          isOpen={isSeamModalOpen}
          onClose={() => setIsSeamModalOpen(false)}
          photo={currentPhoto}
          format={formatOf(currentPhoto)}
        />
      )}
    </div>
  );
}
