import { FFT_SIZE, FREQ_BANDS } from "../utils/constants.js";
import { averageEnergy, frequencyToBin, smoothStep } from "../utils/math.js";

/** 帯域別エネルギー */
export interface BandEnergy {
	low: number;
	mid: number;
	high: number;
}

/** 音声解析クラス */
export class AudioAnalyzer {
	private context: AudioContext | null = null;
	private analyser: AnalyserNode | null = null;
	private source: AudioBufferSourceNode | MediaStreamAudioSourceNode | null = null;
	private gainNode: GainNode | null = null;
	private frequencyData: Uint8Array<ArrayBuffer>;
	private timeDomainData: Uint8Array<ArrayBuffer>;
	private smoothedBands: BandEnergy = { low: 0, mid: 0, high: 0 };
	private previousEnergy = 0;
	private _isPlaying = false;
	private _isMicrophone = false;

	/** スムージングファクター (0-1, 小さいほど滑らか) */
	smoothingFactor = 0.15;

	/** ビート検出しきい値 */
	beatThreshold = 0.3;

	constructor() {
		const binCount = FFT_SIZE / 2;
		this.frequencyData = new Uint8Array(binCount);
		this.timeDomainData = new Uint8Array(FFT_SIZE);
	}

	get isPlaying(): boolean {
		return this._isPlaying;
	}

	get isMicrophone(): boolean {
		return this._isMicrophone;
	}

	/** AudioContextを初期化（ユーザージェスチャー後に呼ぶ） */
	private ensureContext(): AudioContext {
		if (!this.context) {
			this.context = new AudioContext();
		}
		return this.context;
	}

	/** AnalyserNodeをセットアップ */
	private setupAnalyser(ctx: AudioContext): AnalyserNode {
		const analyser = ctx.createAnalyser();
		analyser.fftSize = FFT_SIZE;
		analyser.smoothingTimeConstant = 0.8;
		this.analyser = analyser;
		return analyser;
	}

	/** 音楽ファイルを読み込んで再生 */
	async loadFile(file: File): Promise<void> {
		this.stop();
		const ctx = this.ensureContext();
		if (ctx.state === "suspended") {
			await ctx.resume();
		}

		const arrayBuffer = await file.arrayBuffer();
		const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

		const analyser = this.setupAnalyser(ctx);
		const source = ctx.createBufferSource();
		source.buffer = audioBuffer;

		this.gainNode = ctx.createGain();
		source.connect(this.gainNode);
		this.gainNode.connect(analyser);
		analyser.connect(ctx.destination);

		source.start(0);
		source.onended = () => {
			this._isPlaying = false;
		};
		this.source = source;
		this._isPlaying = true;
		this._isMicrophone = false;
	}

	/** マイク入力を開始 */
	async startMicrophone(): Promise<void> {
		this.stop();
		const ctx = this.ensureContext();
		if (ctx.state === "suspended") {
			await ctx.resume();
		}

		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const analyser = this.setupAnalyser(ctx);
		const source = ctx.createMediaStreamSource(stream);

		source.connect(analyser);
		this.source = source;
		this._isPlaying = true;
		this._isMicrophone = true;
	}

	/** 再生停止 */
	stop(): void {
		if (this.source) {
			if ("stop" in this.source) {
				try {
					this.source.stop();
				} catch {
					// 既に停止済みの場合は無視
				}
			}
			this.source.disconnect();
			this.source = null;
		}
		this._isPlaying = false;
		this._isMicrophone = false;
	}

	/** 毎フレーム呼び出してデータ更新 */
	update(): void {
		if (!this.analyser) return;
		this.analyser.getByteFrequencyData(this.frequencyData);
		this.analyser.getByteTimeDomainData(this.timeDomainData);
		this.updateBands();
	}

	/** 帯域別エネルギーを計算 */
	private updateBands(): void {
		if (!this.context) return;
		const sampleRate = this.context.sampleRate;

		const lowStart = frequencyToBin(FREQ_BANDS.low.min, sampleRate, FFT_SIZE);
		const lowEnd = frequencyToBin(FREQ_BANDS.low.max, sampleRate, FFT_SIZE);
		const midEnd = frequencyToBin(FREQ_BANDS.mid.max, sampleRate, FFT_SIZE);
		const highEnd = frequencyToBin(FREQ_BANDS.high.max, sampleRate, FFT_SIZE);

		const rawLow = averageEnergy(this.frequencyData, lowStart, lowEnd);
		const rawMid = averageEnergy(this.frequencyData, lowEnd, midEnd);
		const rawHigh = averageEnergy(this.frequencyData, midEnd, highEnd);

		this.smoothedBands.low = smoothStep(this.smoothedBands.low, rawLow, this.smoothingFactor);
		this.smoothedBands.mid = smoothStep(this.smoothedBands.mid, rawMid, this.smoothingFactor);
		this.smoothedBands.high = smoothStep(this.smoothedBands.high, rawHigh, this.smoothingFactor);
	}

	/** 周波数データ (0-255) を返す */
	getFrequencyData(): Uint8Array<ArrayBuffer> {
		return this.frequencyData;
	}

	/** 波形データ (0-255, 128=無音) を返す */
	getTimeDomainData(): Uint8Array<ArrayBuffer> {
		return this.timeDomainData;
	}

	/** スムージング済みの帯域別エネルギー (0-1) */
	getBandEnergy(): BandEnergy {
		return { ...this.smoothedBands };
	}

	/** 全体エネルギー (0-1) */
	getOverallEnergy(): number {
		const { low, mid, high } = this.smoothedBands;
		return low * 0.5 + mid * 0.3 + high * 0.2;
	}

	/** ビート検出: エネルギーの急激な上昇を検出 */
	detectBeat(): boolean {
		const energy = this.getOverallEnergy();
		const delta = energy - this.previousEnergy;
		this.previousEnergy = energy;
		return delta > this.beatThreshold;
	}

	/** 音量を設定 (0-1) */
	setVolume(value: number): void {
		if (this.gainNode) {
			this.gainNode.gain.value = value;
		}
	}

	/** リソース解放 */
	dispose(): void {
		this.stop();
		if (this.context) {
			void this.context.close();
			this.context = null;
		}
		this.analyser = null;
	}
}
