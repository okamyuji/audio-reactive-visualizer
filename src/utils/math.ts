/** 値を指定範囲にクランプ */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/** 線形補間 */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/** 0-255の周波数データを0-1に正規化 */
export function normalizeFrequency(value: number): number {
	return clamp(value / 255, 0, 1);
}

/** 指数スムージング */
export function smoothStep(current: number, target: number, factor: number): number {
	return current + (target - current) * factor;
}

/** 度数法からラジアンに変換 */
export function degToRad(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

/**
 * 周波数インデックスをHz値に変換
 * @param index - FFTビンのインデックス
 * @param sampleRate - サンプリングレート
 * @param fftSize - FFTサイズ
 */
export function binToFrequency(index: number, sampleRate: number, fftSize: number): number {
	return (index * sampleRate) / fftSize;
}

/**
 * Hz値を周波数インデックスに変換
 * @param frequency - Hz値
 * @param sampleRate - サンプリングレート
 * @param fftSize - FFTサイズ
 */
export function frequencyToBin(frequency: number, sampleRate: number, fftSize: number): number {
	return Math.round((frequency * fftSize) / sampleRate);
}

/**
 * Uint8Array区間の平均エネルギーを計算
 */
export function averageEnergy(data: Uint8Array<ArrayBuffer>, start: number, end: number): number {
	if (start >= end || data.length === 0) return 0;
	const clampedStart = Math.max(0, start);
	const clampedEnd = Math.min(data.length, end);
	let sum = 0;
	for (let i = clampedStart; i < clampedEnd; i++) {
		sum += data[i] ?? 0;
	}
	return sum / (clampedEnd - clampedStart) / 255;
}
