import { describe, expect, it } from "vitest";
import {
	averageEnergy,
	binToFrequency,
	clamp,
	degToRad,
	frequencyToBin,
	lerp,
	normalizeFrequency,
	smoothStep,
} from "./math.js";

describe("clamp", () => {
	it("should return the value when within range", () => {
		expect(clamp(5, 0, 10)).toBe(5);
	});

	it("should clamp to minimum", () => {
		expect(clamp(-5, 0, 10)).toBe(0);
	});

	it("should clamp to maximum", () => {
		expect(clamp(15, 0, 10)).toBe(10);
	});

	it("should handle equal min and max", () => {
		expect(clamp(5, 3, 3)).toBe(3);
	});
});

describe("lerp", () => {
	it("should return a when t=0", () => {
		expect(lerp(0, 10, 0)).toBe(0);
	});

	it("should return b when t=1", () => {
		expect(lerp(0, 10, 1)).toBe(10);
	});

	it("should return midpoint when t=0.5", () => {
		expect(lerp(0, 10, 0.5)).toBe(5);
	});

	it("should handle negative values", () => {
		expect(lerp(-10, 10, 0.5)).toBe(0);
	});
});

describe("normalizeFrequency", () => {
	it("should normalize 0 to 0", () => {
		expect(normalizeFrequency(0)).toBe(0);
	});

	it("should normalize 255 to 1", () => {
		expect(normalizeFrequency(255)).toBe(1);
	});

	it("should normalize 128 to approximately 0.502", () => {
		expect(normalizeFrequency(128)).toBeCloseTo(0.502, 2);
	});

	it("should clamp values above 255", () => {
		expect(normalizeFrequency(300)).toBe(1);
	});

	it("should clamp negative values to 0", () => {
		expect(normalizeFrequency(-10)).toBe(0);
	});
});

describe("smoothStep", () => {
	it("should return current when factor=0", () => {
		expect(smoothStep(5, 10, 0)).toBe(5);
	});

	it("should return target when factor=1", () => {
		expect(smoothStep(5, 10, 1)).toBe(10);
	});

	it("should interpolate at factor=0.5", () => {
		expect(smoothStep(0, 10, 0.5)).toBe(5);
	});
});

describe("degToRad", () => {
	it("should convert 0 degrees", () => {
		expect(degToRad(0)).toBe(0);
	});

	it("should convert 180 degrees", () => {
		expect(degToRad(180)).toBeCloseTo(Math.PI, 10);
	});

	it("should convert 360 degrees", () => {
		expect(degToRad(360)).toBeCloseTo(Math.PI * 2, 10);
	});

	it("should convert 90 degrees", () => {
		expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 10);
	});
});

describe("binToFrequency", () => {
	it("should convert bin 0 to 0 Hz", () => {
		expect(binToFrequency(0, 44100, 2048)).toBe(0);
	});

	it("should correctly compute frequency at bin index", () => {
		// bin 1 at 44100 Hz sample rate with 2048 FFT = 44100/2048 ≈ 21.53 Hz
		expect(binToFrequency(1, 44100, 2048)).toBeCloseTo(21.53, 1);
	});

	it("should handle Nyquist frequency", () => {
		// bin 1024 (half of 2048) should be 22050 Hz (Nyquist)
		expect(binToFrequency(1024, 44100, 2048)).toBe(22050);
	});
});

describe("frequencyToBin", () => {
	it("should convert 0 Hz to bin 0", () => {
		expect(frequencyToBin(0, 44100, 2048)).toBe(0);
	});

	it("should be inverse of binToFrequency for exact values", () => {
		expect(frequencyToBin(22050, 44100, 2048)).toBe(1024);
	});

	it("should round to nearest bin", () => {
		// 440 Hz → 440 * 2048 / 44100 ≈ 20.43 → round to 20
		expect(frequencyToBin(440, 44100, 2048)).toBe(20);
	});
});

describe("averageEnergy", () => {
	it("should return 0 for empty range", () => {
		const data = new Uint8Array([100, 200]);
		expect(averageEnergy(data, 0, 0)).toBe(0);
	});

	it("should return 0 for empty data", () => {
		const data = new Uint8Array([]);
		expect(averageEnergy(data, 0, 5)).toBe(0);
	});

	it("should compute average of all 255 values as 1", () => {
		const data = new Uint8Array([255, 255, 255, 255]);
		expect(averageEnergy(data, 0, 4)).toBe(1);
	});

	it("should compute average of all 0 values as 0", () => {
		const data = new Uint8Array([0, 0, 0, 0]);
		expect(averageEnergy(data, 0, 4)).toBe(0);
	});

	it("should compute correct partial range average", () => {
		const data = new Uint8Array([0, 255, 255, 0]);
		// average of [255, 255] = 255, normalized = 1
		expect(averageEnergy(data, 1, 3)).toBe(1);
	});

	it("should clamp out-of-bounds indices", () => {
		const data = new Uint8Array([128, 128]);
		// start=-1 clamped to 0, end=10 clamped to 2
		expect(averageEnergy(data, -1, 10)).toBeCloseTo(128 / 255, 5);
	});
});
