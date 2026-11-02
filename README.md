# VIDE SIGNIFIANT — Kyoto Photo Archive & Studio

京都の写真作品を鑑賞・展示・保護・編集するためのミニマルな写真アーカイブシステムです。  
16:9（横位置）、3:4（縦位置）、1:1（正方形）の3つの比率で写真を規定し、独自の4分割接合表示（`SplitImageView`）と透明保護シールドにより、作品の無断保存や不正コピーを抑止しながら高品位に展示します。

---

## 編集はオンラインが前提ですか？（オフライン / ローカル対応について）

**いいえ、オンライン（クラウド接続）は必須ではありません。完全にローカル（オフライン環境）で編集・運用できます。**

このアプリは **「ローカル完結型（Local-First）」** として設計されており、外部データベースや専用サーバーへのログインは一切不要です。次の2つの方法で編集できます。

### 方法 A: ブラウザのGUIスタジオで編集する（オフライン / ローカル動作）
お手元のPCでローカル開発サーバーを起動し、ブラウザ上で直感的に編集する方法です（インターネット接続不要）。
1. レポジトリをクローンして起動:
   ```bash
   npm install
   npm run dev
   ```
2. ブラウザで `http://localhost:3000` を開く。
3. **「+ 作品を追加」** または **「作品を編集」** をクリック。
   - マスター画像をドラッグ＆ドロップすると、比率（16:9, 3:4, 1:1）の誤差判定（±2%許容）と、**ブラウザ内Canvasによる4分割スライス＋サムネイル生成**が自動で実行されます。
   - 落款印（漢字一文字）やウォーターマーク、作品解説、撮影地、撮影機材EXIFをGUIで編集可能。
4. ヘッダーの **「データ入出力」** を開き、**「photos.json をダウンロード」** および **「themes.json をダウンロード」** をクリック。
5. ダウンロードしたファイルをプロジェクトの `public/data/photos.json` と `public/data/themes.json` に上書き保存し、Gitにコミット（`git commit`）するだけで完了です。

### 方法 B: CLI & エディタで直接編集する（完全オフライン / 職人向け）
ブラウザを起動せず、VSCodeやターミナルだけでバッチ処理とJSON編集を行う方法です。
1. マスター画像（落款・透かし焼き込み済みJPEG/TIFF）を `masters/` フォルダに配置（例: `masters/KYOTO-0010.jpg`）。
2. 画像スライススクリプトを実行:
   ```bash
   npm run images
   ```
   - `dist-images/` に自動で4分割WebP（`_tl.webp`, `_tr.webp`, `_bl.webp`, `_br.webp`）およびサムネイル（`_thumb.webp`）が出力されます。
3. 生成された画像を `public/images/`（ローカル表示用）または Cloudflare R2 / S3（本番CDN配信時）へ配置。
4. `public/data/photos.json` に作品情報（タイトル・場所・日付・タグ等）を追記。
5. `git add . && git commit -m "Add new photo" && git push`

---

## 主な機能

- **4分割画像接合 & 透明保護シールド (`SplitImageView`)**:
  - 画像を4象限（左上・右上・左下・右下）に分割してCSS Gridで隙間なく結合。
  - 最前面の透明シールドレイヤーにより、右クリック保存やドラッグ保存を抑止。
- **4分割 継ぎ目検証ツール (Seam Diagnostic Studio)**:
  - 100%〜250%のズーム表示、十字接合ライン、境界インジケーターにより、ブラウザの倍率変化で継ぎ目が見えないかを精密検査。
- **額装 & 台紙シミュレーター (`Frame`)**:
  - 台紙（和紙 Ecru、墨 Sumi、枯れ金 Kare-gane、藍 Indigo、和紫 Wa-murasaki）
  - 額縁（煤竹 Charcoal、Antique Oak Wood、黒檀 Ebony、檜木 Hinoki、浮かし Float）
- **テーマ & コレクション絞り込み**:
  - 16:9 横位置 (`landscape`)、3:4 縦位置 (`portrait`)、1:1 正方形 (`square`)
  - 寺社・名刹、嵐山・嵯峨野、水辺、陰翳、祇園などのタグ検索・キーワード検索

---

## 本番デプロイ

Cloudflare Pages、Vercel、または GitHub Pages など、静的サイトホスティングへそのままデプロイ可能です。

```bash
# ビルド
npm run build

# Cloudflare Pages / Workers へのデプロイ
npm run deploy
```

画像配信元を Cloudflare R2 や独自ドメインに変更する場合は、環境変数 `VITE_IMAGE_BASE` にURLを設定してください（例: `VITE_IMAGE_BASE=https://img.yourdomain.com/`）。未設定時はローカルの `/images/` から直接配信されます。
