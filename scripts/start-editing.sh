#!/usr/bin/env bash
#
# 編集セッションを開始するランチャー。
#
#   - scripts/start-editing.sh : 本体（どのターミナルからでも実行できる）
#   - start-deit.command       : Finder からダブルクリックするための入口（リポジトリ直下）
#
# 手順:
#   1. node_modules を自己修復する（欠落していれば npm install）
#   2. Git インデックスを自己修復する（.git/index が欠落していれば再構築）
#   3. 開発サーバー（vite, ポート 3000）を起動し、応答したらブラウザで開く
#      （ポート 3000 が別プロセスに占用されている場合はエラーで停止）
#
# 使い分け:
#   - ターミナルから : npm run dev
#   - Finder から   : start-deit.command をダブルクリック
#
# 環境変数:
#   PG_NO_OPEN=1 … ブラウザを自動で開かない（動作確認用）
#   PG_SKIP_GIT=1 … Git インデックスの再構築を行わない
#
# 冪等性:
#   各ステップは「今の状態を検査し、壊れていれば直す」判定のみを行い、
#   正常なら何もしません。
#
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}" || exit 1

HOST="127.0.0.1"
PORT="3000"
BASE_URL="http://${HOST}:${PORT}"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '  \033[36m•\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; }

# Finder から起動した場合 PATH が最小になるため、よくある場所を補完する
# （~/.local/bin や nvm など、ユーザー環境で一般的な場所を網羅的に追加）
for p in \
  "${HOME}/.local/bin" \
  "${HOME}/.nvm/versions/node"/*/bin \
  "${HOME}/.volta/bin" \
  "${HOME}/.asdf/shims" \
  "${HOME}/.rye/shims" \
  "${HOME}/bin" \
  "/opt/homebrew/bin" \
  "/opt/homebrew/sbin" \
  "/usr/local/bin" \
  "/usr/bin" \
  "/bin" \
  "/usr/sbin" \
  "/sbin"; do
  [ -d "${p}" ] && case ":${PATH}:" in *":${p}:"*) ;; *) PATH="${p}:${PATH}" ;; esac
done
export PATH

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  fail "node / npm が見つかりません。Node.js をインストールしてから再実行してください。"
  exit 1
fi

bold "=== 編集セッションを開始します ==="
info "作業ディレクトリ: ${REPO_ROOT}"

# ---------------------------------------------------------------------------
# 1) node_modules を自己修復する
# ---------------------------------------------------------------------------
if [ ! -d node_modules ] || ! npm ls --depth=0 >/dev/null 2>&1; then
  info "依存パッケージをインストールします…"
  # このプロジェクトは bun.lock ベースで、esbuild の peer 依存が競合するため
  # --legacy-peer-deps で解決する（なければ素の install を試す）
  if npm install --legacy-peer-deps && npm ls --depth=0 >/dev/null 2>&1; then
    info "依存パッケージをインストールしました ✓"
  elif npm install && npm ls --depth=0 >/dev/null 2>&1; then
    info "依存パッケージをインストールしました ✓"
  else
    fail "npm install に失敗しました。ログを確認してください。"
    exit 1
  fi
else
  info "依存パッケージは正常です"
fi

# ---------------------------------------------------------------------------
# 2) Git インデックスを自己修復する
# ---------------------------------------------------------------------------
if [ "${PG_SKIP_GIT:-0}" != "1" ] && [ -d .git ]; then
  if [ ! -f .git/index ]; then
    info "Git インデックスを再構築します…"
    if git read-tree HEAD >/dev/null 2>&1; then
      info "Git インデックスを再構築しました ✓"
    elif ! git rev-parse --verify HEAD >/dev/null 2>&1; then
      if [ -f .git/FETCH_HEAD ] && git read-tree FETCH_HEAD >/dev/null 2>&1; then
        info "Git インデックスを FETCH_HEAD から再構築しました ✓"
      else
        warn "Git インデックスの再構築に失敗しました（コミットが存在しない可能性があります）。続行します。"
      fi
    else
      warn "Git インデックスの再構築に失敗しました。続行します。"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# 3) 開発サーバーが既に起動していればブラウザだけ開いて終了
# ---------------------------------------------------------------------------
open_browser() {
  if [ "${PG_NO_OPEN:-0}" = "1" ]; then
    return 0
  fi
  # まず `open` を試す（自動化権限不要で確実）。失敗したら osascript で Safari を直接操作。
  if ! open "${BASE_URL}" 2>/dev/null; then
    osascript - "${BASE_URL}" <<'APPLESCRIPT' 2>/dev/null || true
on run argv
  set siteURL to item 1 of argv
  tell application "Safari"
    activate
    if (count of windows) = 0 then
      make new document with properties {URL:siteURL}
    else
      tell front window to set current tab to (make new tab with properties {URL:siteURL})
    end if
  end tell
end run
APPLESCRIPT
  fi
  return 0
}

if curl -sf -o /dev/null --max-time 2 "${BASE_URL}"; then
  info "開発サーバーは既に起動しています（${BASE_URL}）"
  open_browser
  exit 0
fi

# --- ポート占有ガード ------------------------------------------------------
if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  warn "ポート ${PORT} は開発サーバー以外のプロセスが使用中です。"
  lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN | sed -n '2p' >&2 || true
  fail "該当プロセスを停止してから再実行してください（例: 対象のターミナルで Ctrl+C）。"
  exit 1
fi

# ---------------------------------------------------------------------------
# 4) 開発サーバーを起動し、準備ができたらブラウザを開く
# ---------------------------------------------------------------------------
(
  for _ in $(seq 1 90); do
    if curl -sf -o /dev/null --max-time 2 "${BASE_URL}"; then
      if [ "${PG_NO_OPEN:-0}" = "1" ]; then
        info "サーバーが起動しました: ${BASE_URL}"
      else
        open_browser
      fi
      break
    fi
    sleep 1
  done
) &

bold "--- 開発サーバーを起動します（Ctrl+C で停止）: ${BASE_URL} ---"

npm run dev

bold "--- 開発サーバーを停止しました ---"
