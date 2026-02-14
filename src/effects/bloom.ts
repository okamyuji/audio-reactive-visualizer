import type { PostProcessingPipeline } from "../core/renderer.js";
import { BLOOM_DEFAULTS } from "../utils/constants.js";
import { lerp } from "../utils/math.js";

export interface BloomParams {
	strength: number;
	radius: number;
	threshold: number;
}

/** Bloomエフェクト管理（WebGPU/WebGL両対応） */
export class BloomEffect {
	private baseParams: BloomParams;

	constructor(private pipeline: PostProcessingPipeline) {
		this.baseParams = { ...BLOOM_DEFAULTS };
		this.apply(this.baseParams);
	}

	/** パラメータを適用 */
	apply(params: Partial<BloomParams>): void {
		if (params.strength !== undefined) {
			this.baseParams.strength = params.strength;
			this.pipeline.setBloomStrength(params.strength);
		}
		if (params.radius !== undefined) {
			this.baseParams.radius = params.radius;
			this.pipeline.setBloomRadius(params.radius);
		}
		if (params.threshold !== undefined) {
			this.baseParams.threshold = params.threshold;
			this.pipeline.setBloomThreshold(params.threshold);
		}
	}

	/** ビート時にBloomを一時的に強化 */
	pulse(energy: number): void {
		this.pipeline.setBloomStrength(
			lerp(this.baseParams.strength, this.baseParams.strength * 2.5, energy),
		);
	}

	/** ベースに戻す（スムーズに） */
	recover(factor: number): void {
		const current = this.pipeline.getBloomStrength();
		this.pipeline.setBloomStrength(lerp(current, this.baseParams.strength, factor));
	}

	getParams(): BloomParams {
		return { ...this.baseParams };
	}
}
