# Audio Reactive Visualizer

Three.js (WebGPU) + WebAudio API による音楽連動3Dビジュアライザー。

## 機能

- 音楽ファイル（MP3/WAV）のドラッグ&ドロップ / ファイル選択
- FFTベースのリアルタイム周波数解析
- 3つのビジュアライザーモード
    - **周波数バー** — 128本のバーを円形配置、周波数振幅に連動
    - **パーティクルフィールド** — 数千パーティクルが帯域に応じて反応
    - **波形リボン** — 波形データの3Dリボンメッシュ
- Bloomポストプロセスエフェクト
- カラーグレーディング / テーマ切替
- ビート検出（カメラシェイク / フラッシュ）
- マイク入力対応
- lil-gui によるリアルタイムパラメータ調整

## セットアップ

```bash
pnpm install
pnpm run dev
```

Chrome 113+ または Edge 113+ で `http://localhost:5173` にアクセス。

## スクリプト

| コマンド | 説明 |
| ------- | ---- |
| `pnpm run dev` | 開発サーバー起動 |
| `pnpm run build` | TypeScript型チェック + プロダクションビルド |
| `pnpm run preview` | ビルド成果物プレビュー |
| `pnpm run lint` | Biome リント |
| `pnpm run lint:fix` | Biome リント（自動修正） |
| `pnpm run format` | Biome フォーマット |
| `pnpm run test` | Vitest ユニットテスト |

## 技術スタック

- **Vite 6** — HMR高速ビルド
- **TypeScript 5.x** — 厳格モード
- **Three.js r174+** — WebGPURenderer（WebGLフォールバック付き）
- **WebAudio API** — AnalyserNode / FFT
- **Biome** — Linter / Formatter
- **Vitest** — ユニットテスト
- **lil-gui** — パラメータUI
