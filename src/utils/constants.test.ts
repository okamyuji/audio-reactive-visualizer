import { describe, expect, it } from "vitest";
import {
	BAR_COUNT,
	BLOOM_DEFAULTS,
	CAMERA_DEFAULTS,
	COLOR_THEMES,
	DEFAULT_THEME,
	FFT_SIZE,
	FREQ_BANDS,
	PARTICLE_COUNT,
	WAVEFORM_HISTORY_LENGTH,
} from "./constants.js";

describe("constants", () => {
	it("FFT_SIZE should be a power of 2", () => {
		expect(FFT_SIZE).toBe(2048);
		expect(Math.log2(FFT_SIZE) % 1).toBe(0);
	});

	it("BAR_COUNT should be positive", () => {
		expect(BAR_COUNT).toBeGreaterThan(0);
	});

	it("PARTICLE_COUNT should be positive", () => {
		expect(PARTICLE_COUNT).toBeGreaterThan(0);
	});

	it("WAVEFORM_HISTORY_LENGTH should be positive", () => {
		expect(WAVEFORM_HISTORY_LENGTH).toBeGreaterThan(0);
	});

	it("FREQ_BANDS should cover 20Hz-20kHz without gaps", () => {
		expect(FREQ_BANDS.low.min).toBe(20);
		expect(FREQ_BANDS.low.max).toBe(FREQ_BANDS.mid.min);
		expect(FREQ_BANDS.mid.max).toBe(FREQ_BANDS.high.min);
		expect(FREQ_BANDS.high.max).toBe(20000);
	});

	it("DEFAULT_THEME should be a valid theme", () => {
		expect(DEFAULT_THEME in COLOR_THEMES).toBe(true);
	});

	it("all themes should have required color properties", () => {
		for (const [, theme] of Object.entries(COLOR_THEMES)) {
			expect(theme).toHaveProperty("primary");
			expect(theme).toHaveProperty("secondary");
			expect(theme).toHaveProperty("accent");
			expect(theme).toHaveProperty("background");
			expect(typeof theme.primary).toBe("number");
			expect(typeof theme.secondary).toBe("number");
			expect(typeof theme.accent).toBe("number");
			expect(typeof theme.background).toBe("number");
		}
	});

	it("BLOOM_DEFAULTS should have valid ranges", () => {
		expect(BLOOM_DEFAULTS.strength).toBeGreaterThan(0);
		expect(BLOOM_DEFAULTS.radius).toBeGreaterThanOrEqual(0);
		expect(BLOOM_DEFAULTS.threshold).toBeGreaterThanOrEqual(0);
		expect(BLOOM_DEFAULTS.threshold).toBeLessThanOrEqual(1);
	});

	it("CAMERA_DEFAULTS should have valid perspective values", () => {
		expect(CAMERA_DEFAULTS.fov).toBeGreaterThan(0);
		expect(CAMERA_DEFAULTS.fov).toBeLessThan(180);
		expect(CAMERA_DEFAULTS.near).toBeGreaterThan(0);
		expect(CAMERA_DEFAULTS.far).toBeGreaterThan(CAMERA_DEFAULTS.near);
	});
});
