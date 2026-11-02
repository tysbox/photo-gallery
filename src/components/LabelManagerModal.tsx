import { useState } from 'react';
import type { Photo } from '../types';
import { X, Tag, Plus, Edit2, Trash2, Check, AlertCircle } from 'lucide-react';

interface LabelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  onUpdatePhotos: (updatedPhotos: Photo[]) => void;
}

export function LabelManagerModal({
  isOpen,
  onClose,
  photos,
  onUpdatePhotos,
}: LabelManagerModalProps) {
  const [newLabelName, setNewLabelName] = useState('');
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editLabelTargetName, setEditLabelTargetName] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate all labels and photo counts
  const labelMap: Record<string, Photo[]> = {};
  for (const p of photos) {
    for (const tag of p.collections) {
      if (!labelMap[tag]) labelMap[tag] = [];
      labelMap[tag].push(p);
    }
  }

  const allLabels = Object.keys(labelMap).sort();

  const handleAddLabelToArchive = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLabelName.trim();
    if (!trimmed) return;
    if (labelMap[trimmed]) {
      setFeedbackMsg(`ラベル「${trimmed}」は既に存在します。`);
      return;
    }

    // Add empty placeholder or alert
    setFeedbackMsg(`新しいラベル「${trimmed}」を作成しました。作品編集画面で作品に付与できます。`);
    setNewLabelName('');
  };

  const handleRenameLabel = (oldName: string) => {
    const trimmed = editLabelTargetName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingLabel(null);
      return;
    }

    // Update across all photos
    const updated = photos.map((p) => {
      if (p.collections.includes(oldName)) {
        return {
          ...p,
          collections: p.collections.map((tag) => (tag === oldName ? trimmed : tag)),
        };
      }
      return p;
    });

    onUpdatePhotos(updated);
    setEditingLabel(null);
    setEditLabelTargetName('');
    setFeedbackMsg(`ラベル「${oldName}」を「${trimmed}」に変更し、全作品に反映しました。`);
  };

  const handleDeleteLabel = (labelName: string) => {
    const count = labelMap[labelName]?.length || 0;
    if (
      !confirm(
        `ラベル「${labelName}」を削除しますか？\n（このラベルが付与されている ${count} 件の作品から削除されます）`
      )
    ) {
      return;
    }

    const updated = photos.map((p) => ({
      ...p,
      collections: p.collections.filter((tag) => tag !== labelName),
    }));

    onUpdatePhotos(updated);
    setFeedbackMsg(`ラベル「${labelName}」を削除しました。`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#f6f6f3] text-[#23221f] border border-[#2a2926] shadow-2xl rounded max-w-xl w-full flex flex-col overflow-hidden my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2926]/20 bg-[#edeae4]">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#23221f]" />
            <div>
              <h3 className="font-serif text-lg font-bold tracking-wide">
                ラベル・コレクション管理 (Label Studio)
              </h3>
              <p className="text-xs text-[#6f6d67] tracking-wider">
                鑑賞者が絞り込みに使用するラベル（キーワードタグ）の一元管理
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
        <div className="p-6 overflow-y-auto space-y-5">
          {feedbackMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-emerald-900 text-xs flex items-center justify-between">
              <span>{feedbackMsg}</span>
              <button
                onClick={() => setFeedbackMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
              >
                ×
              </button>
            </div>
          )}

          {/* Add new label form */}
          <form onSubmit={handleAddLabelToArchive} className="flex gap-2">
            <input
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="新しいラベル名（例: 枯山水, 嵐山, 陰翳...）"
              className="flex-1 text-xs bg-white border border-[#2a2926]/30 rounded p-2 focus:outline-none focus:border-[#23221f]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#23221f] text-[#f6f6f3] text-xs rounded font-medium hover:bg-[#383733] flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              追加
            </button>
          </form>

          {/* Labels List */}
          <div className="space-y-2">
            <div className="text-xs text-[#6f6d67] font-serif flex items-center justify-between">
              <span>登録ラベル一覧 ({allLabels.length} 件)</span>
              <span>該当作品数</span>
            </div>

            <div className="divide-y divide-[#2a2926]/10 border border-[#2a2926]/20 rounded bg-white overflow-hidden">
              {allLabels.map((tag) => {
                const count = labelMap[tag]?.length || 0;
                const isEditingThis = editingLabel === tag;

                return (
                  <div
                    key={tag}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-[#faf9f7] transition-colors"
                  >
                    {isEditingThis ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editLabelTargetName}
                          onChange={(e) => setEditLabelTargetName(e.target.value)}
                          className="flex-1 text-xs bg-white border border-[#2a2926] rounded px-2 py-1"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameLabel(tag)}
                          className="p-1 bg-[#23221f] text-[#f6f6f3] rounded text-xs"
                          title="確定"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingLabel(null)}
                          className="p-1 border text-xs rounded text-[#6f6d67]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-serif text-xs font-semibold text-[#23221f] truncate">
                            {tag}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono bg-[#edeae4] text-[#6f6d67] px-2 py-0.5 rounded">
                            {count} 作品
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLabel(tag);
                              setEditLabelTargetName(tag);
                            }}
                            className="p-1 text-[#6f6d67] hover:text-[#23221f] rounded"
                            title="ラベル名を変更"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLabel(tag)}
                            className="p-1 text-red-600 hover:text-red-700 rounded"
                            title="ラベルを削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2a2926]/20 bg-[#edeae4] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-[#23221f] text-[#f6f6f3] text-xs rounded font-medium"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
}
