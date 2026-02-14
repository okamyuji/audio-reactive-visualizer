import { beforeEach, describe, expect, it } from "vitest";
import type { PostProcessingPipeline } from "../core/renderer.js";
import { BLOOM_DEFAULTS } from "../utils/constants.js";
import { BloomEffect } from "./bloom.js";

/** PostProcessingPipelineのモック */
function createMockPipeline(): PostProcessingPipeline {
	let strength: number = BLOOM_DEFAULTS.strength;
	let radius: number = BLOOM_DEFAULTS.radius;
	let threshold: number = BLOOM_DEFAULTS.threshold;

	return {
		render: () => {},
		setSize: () => {},
		setBloomStrength: (v: number) => {
			strength = v;
		},
		setBloomRadius: (v: number) => {
			radius = v;
		},
		setBloomThreshold: (v: number) => {
			threshold = v;
		},
		getBloomStrength: () => strength,
		// テスト用の追加アクセサ
		get _radius() {
			return radius;
		},
		get _threshold() {
			return threshold;
		},
	} as PostProcessingPipeline & { _radius: number; _threshold: number };
}

describe("BloomEffect", () => {
	let bloomEffect: BloomEffect;
	let mockPipeline: ReturnType<typeof createMockPipeline>;

	beforeEach(() => {
		mockPipeline = createMockPipeline();
		bloomEffect = new BloomEffect(mockPipeline);
	});

	it("should initialize with default params", () => {
		const params = bloomEffect.getParams();
		expect(params.strength).toBe(BLOOM_DEFAULTS.strength);
		expect(params.radius).toBe(BLOOM_DEFAULTS.radius);
		expect(params.threshold).toBe(BLOOM_DEFAULTS.threshold);
	});

	it("should apply strength changes", () => {
		bloomEffect.apply({ strength: 3.0 });
		expect(mockPipeline.getBloomStrength()).toBe(3.0);
		expect(bloomEffect.getParams().strength).toBe(3.0);
	});

	it("should apply radius changes", () => {
		bloomEffect.apply({ radius: 1.0 });
		expect(bloomEffect.getParams().radius).toBe(1.0);
	});

	it("should apply threshold changes", () => {
		bloomEffect.apply({ threshold: 0.5 });
		expect(bloomEffect.getParams().threshold).toBe(0.5);
	});

	it("should apply partial params without affecting others", () => {
		bloomEffect.apply({ strength: 5.0 });
		expect(bloomEffect.getParams().radius).toBe(BLOOM_DEFAULTS.radius);
		expect(bloomEffect.getParams().threshold).toBe(BLOOM_DEFAULTS.threshold);
	});

	it("should pulse bloom strength based on energy", () => {
		bloomEffect.pulse(1.0);
		expect(mockPipeline.getBloomStrength()).toBeGreaterThan(BLOOM_DEFAULTS.strength);
	});

	it("should not change strength on pulse with zero energy", () => {
		bloomEffect.pulse(0);
		expect(mockPipeline.getBloomStrength()).toBe(BLOOM_DEFAULTS.strength);
	});

	it("should recover towards base strength", () => {
		bloomEffect.pulse(1.0);
		const pulsedStrength = mockPipeline.getBloomStrength();
		bloomEffect.recover(0.5);
		expect(mockPipeline.getBloomStrength()).toBeLessThan(pulsedStrength);
		expect(mockPipeline.getBloomStrength()).toBeGreaterThan(BLOOM_DEFAULTS.strength);
	});

	it("getParams should return a copy", () => {
		const params1 = bloomEffect.getParams();
		const params2 = bloomEffect.getParams();
		expect(params1).toEqual(params2);
		expect(params1).not.toBe(params2);
	});
});
