import { beforeEach, describe, expect, it } from "vitest";
import { FFT_SIZE } from "../utils/constants.js";
import { AudioAnalyzer } from "./audio-analyzer.js";

describe("AudioAnalyzer", () => {
	let analyzer: AudioAnalyzer;

	beforeEach(() => {
		analyzer = new AudioAnalyzer();
	});

	it("should initialize with default state", () => {
		expect(analyzer.isPlaying).toBe(false);
		expect(analyzer.isMicrophone).toBe(false);
		expect(analyzer.smoothingFactor).toBe(0.15);
		expect(analyzer.beatThreshold).toBe(0.3);
	});

	it("should return frequency data of correct size", () => {
		const data = analyzer.getFrequencyData();
		expect(data).toBeInstanceOf(Uint8Array);
		expect(data.length).toBe(FFT_SIZE / 2);
	});

	it("should return time domain data of correct size", () => {
		const data = analyzer.getTimeDomainData();
		expect(data).toBeInstanceOf(Uint8Array);
		expect(data.length).toBe(FFT_SIZE);
	});

	it("should return zero band energy when not playing", () => {
		analyzer.update();
		const energy = analyzer.getBandEnergy();
		expect(energy.low).toBe(0);
		expect(energy.mid).toBe(0);
		expect(energy.high).toBe(0);
	});

	it("should return zero overall energy when not playing", () => {
		analyzer.update();
		expect(analyzer.getOverallEnergy()).toBe(0);
	});

	it("should not detect beat when not playing", () => {
		analyzer.update();
		expect(analyzer.detectBeat()).toBe(false);
	});

	it("should allow setting smoothing factor", () => {
		analyzer.smoothingFactor = 0.5;
		expect(analyzer.smoothingFactor).toBe(0.5);
	});

	it("should allow setting beat threshold", () => {
		analyzer.beatThreshold = 0.5;
		expect(analyzer.beatThreshold).toBe(0.5);
	});

	it("should stop cleanly when not playing", () => {
		expect(() => analyzer.stop()).not.toThrow();
		expect(analyzer.isPlaying).toBe(false);
	});

	it("should dispose cleanly", () => {
		expect(() => analyzer.dispose()).not.toThrow();
		expect(analyzer.isPlaying).toBe(false);
	});

	it("getBandEnergy should return a copy", () => {
		const energy1 = analyzer.getBandEnergy();
		const energy2 = analyzer.getBandEnergy();
		expect(energy1).toEqual(energy2);
		expect(energy1).not.toBe(energy2);
	});
});
