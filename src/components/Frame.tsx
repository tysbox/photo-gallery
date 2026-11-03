import type { Photo, Format, MatColor, FrameBorder, MatPadding } from '../types';
import { SplitImageView } from './SplitImageView';

interface FrameProps {
  photo: Photo;
  format: Format;
  matColor?: MatColor;
  frameBorder?: FrameBorder;
  matPadding?: MatPadding;
  /** 枠幅を2倍にする（額縁を太く強調） */
  doubleFrameWidth?: boolean;
  showSeamDiagnostic?: boolean;
  zoomLevel?: number;
  onTileClick?: (tileIndex: number, tileName: string) => void;
}

const MAT_CLASSES: Record<MatColor, { bg: string; text: string; subText: string; border: string }> = {
  'mat-washi': {
    bg: 'bg-[#f6f6f3]',
    text: 'text-[#23221f]',
    subText: 'text-[#6f6d67]',
    border: 'border-[#2a2926]',
  },
  'mat-charcoal': {
    bg: 'bg-[#1e1d1b]',
    text: 'text-[#edeae4]',
    subText: 'text-[#a49f96]',
    border: 'border-[#383633]',
  },
  'mat-karegane': {
    bg: 'bg-[#bfa776]',
    text: 'text-[#252016]',
    subText: 'text-[#615235]',
    border: 'border-[#8f794d]',
  },
  'mat-indigo': {
    bg: 'bg-[#141b24]',
    text: 'text-[#e5edf7]',
    subText: 'text-[#879ab3]',
    border: 'border-[#253345]',
  },
  'mat-wamurasaki': {
    bg: 'bg-[#4a2e52]',
    text: 'text-[#f5ecf7]',
    subText: 'text-[#c4aecf]',
    border: 'border-[#6b4576]',
  },
  'mat-kurenai': {
    bg: 'bg-[#bc002d]',
    text: 'text-[#fdeef0]',
    subText: 'text-[#e8a5b1]',
    border: 'border-[#8f0021]',
  },
};

const FRAME_CLASSES: Record<FrameBorder, string> = {
  'frame-ebony': 'shadow-2xl ring-1 ring-[#1b1a18] p-1.5 bg-[#181715]',
  'frame-hinoki': 'shadow-2xl ring-1 ring-[#cfb591] p-1.5 bg-[#d4ba94]',
  'frame-oak': 'shadow-2xl ring-1 ring-[#3b271a] p-1.5 bg-gradient-to-br from-[#664b35] via-[#4d3624] to-[#362417] border border-[#7a583d]',
  'frame-susutake': 'shadow-xl ring-1 ring-[#8e9296] p-1 bg-gradient-to-br from-[#c9ccd0] via-[#a8adb3] to-[#878c92]',
  'frame-shunuri': 'shadow-2xl ring-1 ring-[#8c1f18] p-1.5 bg-gradient-to-br from-[#c0392b] via-[#a5281f] to-[#7d1d16]',
  'frame-float': 'shadow-xl p-0',
};

const PADDING_CLASSES: Record<MatPadding, string> = {
  none: 'p-0',
  compact: 'p-4 sm:p-6',
  normal: 'p-6 sm:p-10 md:p-12',
  wide: 'p-8 sm:p-14 md:p-16',
};

export function Frame({
  photo,
  format,
  matColor = 'mat-washi',
  frameBorder = 'frame-susutake',
  matPadding = 'normal',
  doubleFrameWidth = false,
  showSeamDiagnostic = false,
  zoomLevel = 1,
  onTileClick,
}: FrameProps) {
  const currentMat = MAT_CLASSES[matColor];
  const frameClass = FRAME_CLASSES[frameBorder];
  // 枠幅2倍: 額縁のパディングとリングを太くする
  const widthScale = doubleFrameWidth ? 'p-3 ring-[3px]' : '';

  return (
    <figure className="m-0 inline-flex flex-col gap-4 max-w-full">
      {/* Outer Wood/Metal Frame */}
      <div className={`transition-all duration-300 ${frameClass} ${widthScale} rounded-sm`}>
        {/* Gallery Mat (台紙 / パスパートゥ) */}
        <div
          className={`transition-colors duration-300 ${currentMat.bg} border ${currentMat.border} ${PADDING_CLASSES[matPadding]} flex justify-center items-center shadow-inner`}
        >
          <SplitImageView
            photo={photo}
            format={format}
            showSeamDiagnostic={showSeamDiagnostic}
            zoomLevel={zoomLevel}
            onTileClick={onTileClick}
          />
        </div>
      </div>

      {/* Frame Caption Plate (作品銘板) */}
      <figcaption className="flex flex-col gap-1 px-1">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <span className="font-serif text-[17px] tracking-wide text-[#23221f] font-medium">
            {photo.title}
          </span>
          <span className="text-[12px] font-mono tracking-wider text-[#6f6d67] uppercase">
            {photo.id}
          </span>
        </div>

        {photo.subtitle && (
          <span className="text-[13px] text-[#6f6d67] tracking-normal font-sans italic">
            {photo.subtitle}
          </span>
        )}

        <div className="flex items-center gap-3 text-[12px] text-[#6f6d67] tracking-wider mt-0.5">
          <span>{photo.location.name} ({photo.location.area})</span>
          <span>•</span>
          <span>{photo.date}</span>
          <span>•</span>
          <span>{photo.season}</span>
        </div>
      </figcaption>
    </figure>
  );
}
