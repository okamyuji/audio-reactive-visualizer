import GUI from "lil-gui";
import type { AudioAnalyzer } from "../core/audio-analyzer.js";
import type { BloomEffect } from "../effects/bloom.js";
import type { ColorGrading } from "../effects/color-grading.js";
import { AUDIO_DEFAULTS, BLOOM_DEFAULTS, COLOR_THEMES, DEFAULT_THEME } from "../utils/constants.js";
import type { ColorThemeName } from "../utils/constants.js";
import type { BaseVisualizer } from "../visualizers/base-visualizer.js";

export interface ControlsConfig {
	audioAnalyzer: AudioAnalyzer;
	bloomEffect: BloomEffect;
	colorGrading: ColorGrading;
	visualizers: Record<string, BaseVisualizer>;
	onThemeChange: (theme: ColorThemeName) => void;
	onMicrophoneToggle: () => void;
	onStop: () => void;
	onFullscreen: () => void;
}

/** lil-gui パラメータUI構築 */
export function createControls(config: ControlsConfig): GUI {
	const gui = new GUI({ title: "Controls" });

	// --- Audio ---
	const audioFolder = gui.addFolder("Audio");
	const audioParams = {
		volume: AUDIO_DEFAULTS.volume as number,
		sensitivity: AUDIO_DEFAULTS.sensitivity as number,
		beatThreshold: AUDIO_DEFAULTS.beatThreshold as number,
		microphone: false,
	};

	audioFolder.add(audioParams, "volume", 0, 1, 0.01).onChange((v: number) => {
		config.audioAnalyzer.setVolume(v);
	});
	audioFolder.add(audioParams, "sensitivity", 0.01, 0.5, 0.01).onChange((v: number) => {
		config.audioAnalyzer.smoothingFactor = v;
	});
	audioFolder.add(audioParams, "beatThreshold", 0.1, 0.8, 0.01).onChange((v: number) => {
		config.audioAnalyzer.beatThreshold = v;
	});
	audioFolder.add(audioParams, "microphone").onChange(() => {
		config.onMicrophoneToggle();
	});
	// --- Bloom ---
	const bloomFolder = gui.addFolder("Bloom");
	const bloomParams = {
		strength: BLOOM_DEFAULTS.strength as number,
		radius: BLOOM_DEFAULTS.radius as number,
		threshold: BLOOM_DEFAULTS.threshold as number,
	};
	bloomFolder.add(bloomParams, "strength", 0, 5, 0.1).onChange((v: number) => {
		config.bloomEffect.apply({ strength: v });
	});
	bloomFolder.add(bloomParams, "radius", 0, 2, 0.01).onChange((v: number) => {
		config.bloomEffect.apply({ radius: v });
	});
	bloomFolder.add(bloomParams, "threshold", 0, 1, 0.01).onChange((v: number) => {
		config.bloomEffect.apply({ threshold: v });
	});

	// --- Color ---
	const colorFolder = gui.addFolder("Color");
	const colorParams = {
		theme: DEFAULT_THEME as string,
	};
	colorFolder.add(colorParams, "theme", Object.keys(COLOR_THEMES)).onChange((v: string) => {
		config.onThemeChange(v as ColorThemeName);
	});

	// --- Visualizers ---
	const vizFolder = gui.addFolder("Visualizers");
	for (const [name, viz] of Object.entries(config.visualizers)) {
		vizFolder.add(viz, "visible").name(name);
	}

	// --- General ---
	const generalFolder = gui.addFolder("General");
	generalFolder.add({ fullscreen: config.onFullscreen }, "fullscreen").name("Fullscreen");
	generalFolder
		.add(
			{
				reset: () => {
					gui.reset();
				},
			},
			"reset",
		)
		.name("Reset to Defaults");
	generalFolder.add({ stop: () => config.onStop() }, "stop").name("Stop");

	return gui;
}
