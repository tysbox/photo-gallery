import { useState } from 'react';
import type { Photo, Format } from '../types';
import { DISPLAY } from '../types';
import { imageUrl } from '../lib/imageUrl';

interface SplitImageViewProps {
  photo: Photo;
  format: Format;
  showSeamDiagnostic?: boolean;
  zoomLevel?: number;
  onTileClick?: (tileIndex: number, tileName: string) => void;
}

const TILE_NAMES = ['左上 (TL)', '右上 (TR)', '左下 (BL)', '右下 (BR)'] as const;

export function SplitImageView({
  photo,
  format,
  showSeamDiagnostic = false,
  zoomLevel = 1,
  onTileClick,
}: SplitImageViewProps) {
  const { w, h } = DISPLAY[format];
  const [loadedTiles, setLoadedTiles] = useState<Record<number, boolean>>({});

  const block = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  const handleTileLoad = (index: number) => {
    setLoadedTiles((prev) => ({ ...prev, [index]: true }));
  };

  return (
    <div
      className="relative select-none overflow-hidden transition-transform duration-200"
      style={{
        width: `min(${Math.round(w * zoomLevel)}px, 100%)`,
        aspectRatio: `${w} / ${h}`,
        touchAction: 'none',
      }}
      role="img"
      aria-label={photo.title}
    >
      {/* 2x2 Seamless Grid for 4 Quadrants */}
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
            className="relative w-full h-full overflow-hidden bg-[#22211e]"
            onClick={() => onTileClick?.(i, TILE_NAMES[i])}
          >
            <img
              src={imageUrl(name)}
              alt=""
              draggable={false}
              decoding="async"
              onLoad={() => handleTileLoad(i)}
              className="w-full h-full object-fill block pointer-events-none transition-opacity duration-300"
              style={{
                imageRendering: 'auto',
                opacity: loadedTiles[i] ? 1 : 0.85,
              }}
            />

            {/* Diagnostic Seam Indicator (when toggled on) */}
            {showSeamDiagnostic && (
              <div className="absolute inset-0 border border-emerald-500/30 pointer-events-none flex items-center justify-center">
                <span className="text-[10px] bg-black/70 text-emerald-400 px-1.5 py-0.5 rounded tracking-widest font-mono">
                  {['TL', 'TR', 'BL', 'BR'][i]}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Seam hairline overlay to test seamless pixel alignment */}
      {showSeamDiagnostic && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-red-500/40 -translate-x-1/2" />
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-red-500/40 -translate-y-1/2" />
        </div>
      )}

      {/* Transparent Protective Shield to deter direct right-click and dragging */}
      <div
        className="absolute inset-0 z-10 cursor-default bg-transparent"
        onContextMenu={block}
        onDragStart={block}
        title={showSeamDiagnostic ? '継ぎ目検査モード有効' : undefined}
      />
    </div>
  );
}
