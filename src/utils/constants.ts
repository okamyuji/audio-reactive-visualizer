/** FFT解析サイズ */
export const FFT_SIZE = 2048;

/** 周波数バーの本数 */
export const BAR_COUNT = 128;

/** パーティクル数 */
export const PARTICLE_COUNT = 5000;

/** 波形リボンの履歴フレーム数 */
export const WAVEFORM_HISTORY_LENGTH = 60;

/** 周波数帯域の境界 (Hz) */
export const FREQ_BANDS = {
	low: { min: 20, max: 250 },
	mid: { min: 250, max: 4000 },
	high: { min: 4000, max: 20000 },
} as const;

/** カラーテーマ */
export const COLOR_THEMES = {
	cyber: {
		primary: 0x00ffff,
		secondary: 0xff00ff,
		accent: 0xffff00,
		background: 0x0a0a1a,
	},
	ocean: {
		primary: 0x0077be,
		secondary: 0x00d4aa,
		accent: 0x66ccff,
		background: 0x001122,
	},
	fire: {
		primary: 0xff4400,
		secondary: 0xff8800,
		accent: 0xffcc00,
		background: 0x1a0a00,
	},
	aurora: {
		primary: 0x00ff88,
		secondary: 0x8800ff,
		accent: 0x00ccff,
		background: 0x050a15,
	},
} as const;

export type ColorThemeName = keyof typeof COLOR_THEMES;

/** デフォルトテーマ */
export const DEFAULT_THEME: ColorThemeName = "cyber";

/** オーディオパラメータのデフォルト値 */
export const AUDIO_DEFAULTS = {
	volume: 1.0,
	sensitivity: 0.15,
	beatThreshold: 0.3,
} as const;

/** Bloomパラメータのデフォルト値 */
export const BLOOM_DEFAULTS = {
	strength: 1.5,
	radius: 0.4,
	threshold: 0.2,
} as const;

/** カメラ初期位置 */
export const CAMERA_DEFAULTS = {
	fov: 60,
	near: 0.1,
	far: 1000,
	position: { x: 0, y: 15, z: 30 },
} as const;
