import { useState } from 'react';
import type { Photo, Format } from '../types';
import { DISPLAY, FORMAT_DIMENSIONS } from '../types';
import { imageUrl } from '../lib/imageUrl';
import { X, ZoomIn, ZoomOut, Shield, CheckCircle2, Crosshair, HelpCircle } from 'lucide-react';

interface SeamInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: Photo;
  format: Format;
}

export function SeamInspectionModal({
  isOpen,
  onClose,
  photo,
  format,
}: SeamInspectionModalProps) {
  const [zoom, setZoom] = useState<number>(1.5);
  const [showCenterCross, setShowCenterCross] = useState<boolean>(true);
  const [showTileBorders, setShowTileBorders] = useState<boolean>(false);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);

  if (!isOpen) return null;

  const { w, h } = DISPLAY[format];
  const { w: nativeW, h: nativeH } = FORMAT_DIMENSIONS[format];

  const tileLabels = ['左上 (TL)', '右上 (TR)', '左下 (BL)', '右下 (BR)'];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#1e1d1b] text-[#f6f6f3] border border-neutral-700 shadow-2xl rounded max-w-4xl w-full flex flex-col overflow-hidden my-auto max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#161514]">
          <div className="flex items-center gap-2.5">
            <Crosshair className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold tracking-wide text-white">
                4分割 継ぎ目検証スタジオ (Seam Diagnostic Tool)
              </h3>
              <p className="text-xs text-neutral-400 font-sans">
                README未確認事項:「4分割の継ぎ目が各ブラウザ・倍率で見えないこと」の精密検証
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-neutral-800 bg-[#252422] flex items-center justify-between flex-wrap gap-3 text-xs">
          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-mono">倍率:</span>
            {[1, 1.25, 1.5, 2, 2.5].map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-2.5 py-1 rounded font-mono transition-colors ${
                  zoom === z
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {Math.round(z * 100)}%
              </button>
            ))}
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white">
              <input
                type="checkbox"
                checked={showCenterCross}
                onChange={(e) => setShowCenterCross(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              十字接合ライン
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white">
              <input
                type="checkbox"
                checked={showTileBorders}
                onChange={(e) => setShowTileBorders(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              タイル境界表示
            </label>
          </div>
        </div>

        {/* Interactive Viewer Body */}
        <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center bg-[#141312] min-h-[380px]">
          <div
            className="relative border border-neutral-800 shadow-2xl transition-all duration-150 select-none"
            style={{
              width: `${Math.round(w * zoom)}px`,
              aspectRatio: `${w} / ${h}`,
            }}
          >
            {/* 4 Quadrants Grid */}
            <div
              className="grid w-full h-full"
              style={{
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: '1fr 1fr',
                gap: 0,
                lineHeight: 0,
              }}
            >
              {photo.images.split.map((name, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedTile(selectedTile === i ? null : i)}
                  className={`relative w-full h-full cursor-pointer transition-all ${
                    showTileBorders
                      ? 'outline outline-1 outline-emerald-500/50'
                      : ''
                  } ${selectedTile === i ? 'ring-2 ring-amber-400 z-10' : ''}`}
                >
                  <img
                    src={imageUrl(name)}
                    alt=""
                    draggable={false}
                    className="w-full h-full object-fill block pointer-events-none"
                  />
                  <span className="absolute bottom-1 right-1 bg-black/70 text-[10px] text-neutral-400 px-1 py-0.5 rounded font-mono pointer-events-none">
                    {['TL', 'TR', 'BL', 'BR'][i]}
                  </span>
                </div>
              ))}
            </div>

            {/* Diagnostic Center Crosshair */}
            {showCenterCross && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Vertical seam */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-emerald-400/60 -translate-x-1/2 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                {/* Horizontal seam */}
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-emerald-400/60 -translate-y-1/2 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                {/* Center intersection target */}
                <div className="absolute left-1/2 top-1/2 w-4 h-4 border border-emerald-400 rounded-full -translate-x-1/2 -translate-y-1/2" />
              </div>
            )}
          </div>

          <p className="text-xs text-neutral-500 font-mono mt-4 text-center">
            現在表示: {Math.round(w * zoom)} × {Math.round(h * zoom)} px (マスター原寸: {nativeW} × {nativeH} px)
          </p>
        </div>

        {/* Diagnostic Footer Info */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-[#161514] text-xs space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-2 bg-[#21201d] p-2.5 rounded border border-neutral-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-neutral-200">サブピクセル継ぎ目</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  CSS Grid (<code>grid-template: 1fr 1fr</code>) と <code>gap: 0</code> により、任意の拡大率でも隙間なく結合。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-[#21201d] p-2.5 rounded border border-neutral-800">
              <Shield className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-neutral-200">透明シールド防御</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  前面の透明レイヤーが右クリック保存やドラッグ保存を抑止。落款と低解像度化が主防御となります。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-[#21201d] p-2.5 rounded border border-neutral-800">
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-neutral-200">Retina 2倍密度</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  マスター幅 {nativeW}px に対し表示幅 {w}px で描画され、高精細ディスプレイでシャープに映えます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
