import { useState } from 'react';
import type { Theme, Format } from '../types';
import { FORMAT_DIMENSIONS } from '../types';
import { X, Plus, Trash2, Edit2, Check } from 'lucide-react';

interface ThemeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  themes: Theme[];
  onSaveThemes: (themes: Theme[]) => void;
  photosCountByTheme: Record<string, number>;
}

export function ThemeEditorModal({
  isOpen,
  onClose,
  themes,
  onSaveThemes,
  photosCountByTheme,
}: ThemeEditorModalProps) {
  const [themeList, setThemeList] = useState<Theme[]>(themes);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for adding or editing
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [format, setFormat] = useState<Format>('landscape');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const startEdit = (theme: Theme) => {
    setEditingId(theme.id);
    setId(theme.id);
    setTitle(theme.title);
    setSubtitle(theme.subtitle || '');
    setFormat(theme.format);
    setDescription(theme.description || '');
  };

  const startNew = () => {
    const nextNum = themeList.length + 1;
    setEditingId('__NEW__');
    setId(`theme-${nextNum}`);
    setTitle('');
    setSubtitle('');
    setFormat('landscape');
    setDescription('');
  };

  const handleSaveThemeItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !title.trim()) {
      alert('テーマIDとタイトルを入力してください。');
      return;
    }

    let updated: Theme[];
    if (editingId === '__NEW__') {
      if (themeList.some((t) => t.id === id.trim())) {
        alert('このテーマIDは既に存在します。別のIDを指定してください。');
        return;
      }
      updated = [
        ...themeList,
        {
          id: id.trim(),
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          format,
          description: description.trim() || undefined,
        },
      ];
    } else {
      updated = themeList.map((t) =>
        t.id === editingId
          ? {
              ...t,
              title: title.trim(),
              subtitle: subtitle.trim() || undefined,
              format,
              description: description.trim() || undefined,
            }
          : t
      );
    }

    setThemeList(updated);
    onSaveThemes(updated);
    setEditingId(null);
  };

  const handleDelete = (themeId: string) => {
    const count = photosCountByTheme[themeId] || 0;
    if (count > 0) {
      if (
        !confirm(
          `このテーマには ${count} 件の作品が割り当てられています。削除すると作品のテーマ設定が無効になる恐れがあります。本当に削除しますか？`
        )
      ) {
        return;
      }
    } else {
      if (!confirm('このテーマを削除しますか？')) return;
    }

    const updated = themeList.filter((t) => t.id !== themeId);
    setThemeList(updated);
    onSaveThemes(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#f6f6f3] text-[#23221f] border border-[#2a2926] shadow-2xl rounded max-w-2xl w-full flex flex-col overflow-hidden my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2926]/20 bg-[#edeae4]">
          <div>
            <h3 className="font-serif text-lg font-bold tracking-wide">
              テーマ管理 (Theme Management)
            </h3>
            <p className="text-xs text-[#6f6d67] tracking-wider">
              テーマごとに写真フォーマット (16:9, 3:4, 1:1) が一元規定されます
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6f6d67] hover:text-[#23221f] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {editingId ? (
            <form onSubmit={handleSaveThemeItem} className="p-4 bg-white border border-[#2a2926]/20 rounded space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-serif text-sm font-semibold">
                  {editingId === '__NEW__' ? '新規テーマ追加' : `テーマ編集: ${editingId}`}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-xs text-[#6f6d67] hover:underline"
                >
                  キャンセル
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#6f6d67] mb-1">テーマID *</label>
                  <input
                    type="text"
                    required
                    disabled={editingId !== '__NEW__'}
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-[#2a2926]/30 rounded p-1.5 disabled:bg-gray-100"
                    placeholder="kyoto-new-theme"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#6f6d67] mb-1">規定フォーマット *</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as Format)}
                    className="w-full text-xs bg-white border border-[#2a2926]/30 rounded p-1.5"
                  >
                    <option value="landscape">横位置 (16:9 Landscape) - 1200×676</option>
                    <option value="portrait">縦位置 (3:4 Portrait) - 900×1200</option>
                    <option value="square">正方形 (1:1 Square) - 960×960</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#6f6d67] mb-1">テーマタイトル *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm font-serif bg-white border border-[#2a2926]/30 rounded p-1.5"
                  placeholder="例: 古都の朝霧 — Kyoto Morning Mist"
                />
              </div>

              <div>
                <label className="block text-xs text-[#6f6d67] mb-1">副題 / 英語表記</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full text-xs bg-white border border-[#2a2926]/30 rounded p-1.5"
                  placeholder="Misty Horizons and Dawn Silhouettes"
                />
              </div>

              <div>
                <label className="block text-xs text-[#6f6d67] mb-1">説明文</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs bg-white border border-[#2a2926]/30 rounded p-1.5"
                  placeholder="テーマの意図や展示コンセプト..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1.5 text-xs border rounded"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-[#23221f] text-[#f6f6f3] rounded font-medium flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> 保存
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-[#6f6d67]">登録テーマ一覧 ({themeList.length} 件)</span>
              <button
                type="button"
                onClick={startNew}
                className="px-3 py-1.5 bg-[#23221f] text-[#f6f6f3] text-xs rounded flex items-center gap-1.5 hover:bg-[#3b3a37] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> 新規テーマ追加
              </button>
            </div>
          )}

          {/* Themes List */}
          <div className="space-y-2">
            {themeList.map((t) => {
              const count = photosCountByTheme[t.id] || 0;
              const formatInfo = FORMAT_DIMENSIONS[t.format];
              return (
                <div
                  key={t.id}
                  className="p-3.5 bg-white/70 border border-[#2a2926]/20 rounded flex items-center justify-between gap-3 hover:bg-white transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif text-sm font-semibold text-[#23221f]">
                        {t.title}
                      </span>
                      <span className="text-[11px] bg-[#edeae4] text-[#6f6d67] px-2 py-0.5 rounded font-mono">
                        {formatInfo.label}
                      </span>
                      <span className="text-[11px] text-[#6f6d67]">
                        ({count} 作品)
                      </span>
                    </div>

                    {t.subtitle && (
                      <p className="text-xs text-[#6f6d67] italic mt-0.5 truncate">{t.subtitle}</p>
                    )}
                    {t.description && (
                      <p className="text-xs text-[#23221f]/80 mt-1 line-clamp-1">{t.description}</p>
                    )}
                    <span className="text-[10px] text-[#6f6d67] font-mono mt-0.5 block">
                      ID: {t.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      className="p-1.5 text-[#6f6d67] hover:text-[#23221f] hover:bg-black/5 rounded"
                      title="テーマを編集"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                      title="テーマを削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2a2926]/20 bg-[#edeae4] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#23221f] text-[#f6f6f3] text-sm rounded font-medium"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
}
