import { useState } from 'react';
import type { Photo, Theme } from '../types';
import { X, Download, Copy, Check, Terminal, FileJson, RefreshCw, GitBranch } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  themes: Theme[];
  onResetToDefaults: () => void;
  imageBaseUrl: string;
  onUpdateImageBaseUrl: (url: string) => void;
}

export function ExportModal({
  isOpen,
  onClose,
  photos,
  themes,
  onResetToDefaults,
  imageBaseUrl,
  onUpdateImageBaseUrl,
}: ExportModalProps) {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState(imageBaseUrl);
  const [isUrlSaved, setIsUrlSaved] = useState(false);

  if (!isOpen) return null;

  // Generate clean photos.json compatible with VIDE SIGNIFIANT specification
  const cleanPhotos = photos.map((p) => ({
    id: p.id,
    title: p.title,
    theme: p.theme,
    collections: p.collections,
    location: {
      name: p.location.name,
      area: p.location.area,
    },
    date: p.date,
    season: p.season,
    description: p.description,
    images: {
      thumbnail: p.images.thumbnail.startsWith('data:')
        ? `${p.id}_thumb.webp`
        : p.images.thumbnail,
      split: p.images.split.map((s, idx) =>
        s.startsWith('data:')
          ? `${p.id}_${['tl', 'tr', 'bl', 'br'][idx]}.webp`
          : s
      ),
    },
  }));

  const cleanThemes = themes.map((t) => ({
    id: t.id,
    title: t.title,
    format: t.format,
  }));

  const photosJsonStr = JSON.stringify(cleanPhotos, null, 2);
  const themesJsonStr = JSON.stringify(cleanThemes, null, 2);

  const downloadJson = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string, filename: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  const handleSaveBaseUrl = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateImageBaseUrl(customUrl);
    setIsUrlSaved(true);
    setTimeout(() => setIsUrlSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#f6f6f3] text-[#23221f] border border-[#2a2926] shadow-2xl rounded max-w-3xl w-full flex flex-col overflow-hidden my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2926]/20 bg-[#edeae4]">
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-[#23221f]" />
            <div>
              <h3 className="font-serif text-lg font-bold tracking-wide">
                データ入出力 & デプロイ同期 (Export & Sync)
              </h3>
              <p className="text-xs text-[#6f6d67] tracking-wider">
                VIDE SIGNIFIANT の実運用（Cloudflare R2 / 本番配置）用ファイル出力
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6f6d67] hover:text-[#23221f] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: JSON Data Downloads */}
          <div className="space-y-4">
            <h4 className="text-sm font-serif font-bold text-[#23221f] border-b pb-1">
              1. 設定JSONファイルのエクスポート
            </h4>
            <p className="text-xs text-[#6f6d67]">
              編集した作品（{photos.length} 件）およびテーマ（{themes.length} 件）を、プロジェクトの <code>public/data/</code> に配置可能な規格JSONとしてダウンロードします。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* photos.json */}
              <div className="p-4 bg-white border border-[#2a2926]/20 rounded flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-bold text-[#23221f]">
                      photos.json
                    </span>
                    <span className="text-[11px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-mono">
                      {photos.length} 作品
                    </span>
                  </div>
                  <p className="text-xs text-[#6f6d67] mb-3">
                    各作品の4分割ファイル名、テーマ、位置情報、解説を含みます。
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadJson('photos.json', photosJsonStr)}
                    className="flex-1 py-1.5 px-3 bg-[#23221f] text-[#f6f6f3] text-xs rounded flex items-center justify-center gap-1.5 hover:bg-[#383733]"
                  >
                    <Download className="w-3.5 h-3.5" /> ダウンロード
                  </button>
                  <button
                    onClick={() => copyToClipboard(photosJsonStr, 'photos')}
                    className="py-1.5 px-3 border border-[#2a2926]/30 text-xs rounded hover:bg-black/5"
                    title="JSONをクリップボードにコピー"
                  >
                    {copiedFile === 'photos' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* themes.json */}
              <div className="p-4 bg-white border border-[#2a2926]/20 rounded flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-bold text-[#23221f]">
                      themes.json
                    </span>
                    <span className="text-[11px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-mono">
                      {themes.length} テーマ
                    </span>
                  </div>
                  <p className="text-xs text-[#6f6d67] mb-3">
                    landscape (16:9), portrait (3:4), square (1:1) のテーマ定義。
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadJson('themes.json', themesJsonStr)}
                    className="flex-1 py-1.5 px-3 bg-[#23221f] text-[#f6f6f3] text-xs rounded flex items-center justify-center gap-1.5 hover:bg-[#383733]"
                  >
                    <Download className="w-3.5 h-3.5" /> ダウンロード
                  </button>
                  <button
                    onClick={() => copyToClipboard(themesJsonStr, 'themes')}
                    className="py-1.5 px-3 border border-[#2a2926]/30 text-xs rounded hover:bg-black/5"
                    title="JSONをクリップボードにコピー"
                  >
                    {copiedFile === 'themes' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Image Delivery Base URL */}
          <div className="space-y-3">
            <h4 className="text-sm font-serif font-bold text-[#23221f] border-b pb-1">
              2. 画像配信元ドメイン設定 (VITE_IMAGE_BASE)
            </h4>
            <p className="text-xs text-[#6f6d67]">
              Cloudflare R2 や AWS S3 のカスタムドメイン、またはローカル <code>/images/</code> を切り替えます。
            </p>
            <form onSubmit={handleSaveBaseUrl} className="flex gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="/images/ または https://img.vide-signifiant.com/"
                className="flex-1 text-xs font-mono bg-white border border-[#2a2926]/30 rounded p-2"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#23221f] text-[#f6f6f3] text-xs rounded flex items-center gap-1.5"
              >
                {isUrlSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                適用
              </button>
            </form>
          </div>

          {/* Section 3: GitHub Repository Package & Push Guide */}
          <div className="space-y-3 p-4 bg-white border border-[#2a2926]/20 rounded">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#23221f]" />
                <h4 className="text-sm font-serif font-bold text-[#23221f]">
                  GitHub リポジトリ（tysbox/photo-gallery）への登録
                </h4>
              </div>
              <a
                href="/photo-gallery.zip"
                download="photo-gallery.zip"
                className="py-1.5 px-3 bg-[#23221f] text-[#f6f6f3] text-xs rounded flex items-center gap-1.5 hover:bg-[#383733] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                リポジトリ一式をダウンロード (.zip)
              </a>
            </div>

            <p className="text-xs text-[#6f6d67] leading-relaxed">
              コミット済みリポジトリ一式（全ソースコード・設定・スクリプト・ドキュメント）をダウンロードし、お手元のPCから以下のコマンドで GitHub へプッシュできます：
            </p>

            <pre className="font-mono text-[11px] text-[#edeae4] bg-[#1e1d1b] p-3 rounded leading-relaxed overflow-x-auto">
{`# 1. ダウンロードした zip を解凍して移動
unzip photo-gallery.zip -d photo-gallery && cd photo-gallery

# 2. GitHub リモートを追加してプッシュ
git init && git branch -M main && git add . && git commit -m "Initial commit: VIDE SIGNIFIANT Kyoto Photo Archive"
git remote add origin https://github.com/tysbox/photo-gallery.git
git push -u origin main`}
            </pre>
          </div>

          {/* Section 4: README Deployment Guide */}
          <div className="p-4 bg-[#1e1d1b] text-neutral-300 rounded text-xs space-y-2">
            <div className="flex items-center gap-2 text-white font-mono text-[11px] mb-1">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>本番デプロイ手順 (VIDE SIGNIFIANT ガイドライン)</span>
            </div>
            <pre className="font-mono text-[11px] text-[#edeae4] leading-relaxed overflow-x-auto p-2 bg-black/40 rounded">
{`# 1. 編集した JSON を配置
cp photos.json public/data/photos.json
cp themes.json public/data/themes.json

# 2. 画像を R2 バケットへアップロード (Cloudflare Wrangler)
wrangler r2 object put <bucket>/KYOTO-0001_tl.webp --file dist-images/KYOTO-0001_tl.webp

# 3. 本番デプロイ
npm run build && wrangler deploy`}
            </pre>
          </div>

          {/* Section 4: Reset Database */}
          <div className="pt-2 border-t border-[#2a2926]/20 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#23221f]">京都アーカイブ初期データにリセット</p>
              <p className="text-[11px] text-[#6f6d67]">
                厳選された9点の京都名所写真作品と3つのテーマ状態に戻します。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('現在の編集内容を破棄し、初期の京都アーカイブデータに戻しますか？')) {
                  onResetToDefaults();
                  onClose();
                }
              }}
              className="py-1.5 px-3 border border-red-300 text-red-700 hover:bg-red-50 text-xs rounded flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> 初期状態に戻す
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2a2926]/20 bg-[#edeae4] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#23221f] text-[#f6f6f3] text-sm rounded font-medium"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
