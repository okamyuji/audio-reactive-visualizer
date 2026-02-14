import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BloomParams } from "../effects/bloom.js";
import { AUDIO_DEFAULTS, BLOOM_DEFAULTS, DEFAULT_THEME } from "../utils/constants.js";
import type { ColorThemeName } from "../utils/constants.js";
import { type ControlsConfig, createControls } from "./controls.js";

/** テスト用のモックControlsConfig */
function createMockConfig(): ControlsConfig & {
	getVolume: () => number;
	getSmoothingFactor: () => number;
	getBeatThreshold: () => number;
	getBloomApplied: () => Partial<BloomParams> | null;
	getTheme: () => ColorThemeName;
} {
	let volume = AUDIO_DEFAULTS.volume as number;
	let smoothingFactor = AUDIO_DEFAULTS.sensitivity as number;
	let beatThreshold = AUDIO_DEFAULTS.beatThreshold as number;
	let lastBloomApplied: Partial<BloomParams> | null = null;
	let currentTheme: ColorThemeName = DEFAULT_THEME;

	const audioAnalyzer = {
		setVolume: (v: number) => {
			volume = v;
		},
		get smoothingFactor() {
			return smoothingFactor;
		},
		set smoothingFactor(v: number) {
			smoothingFactor = v;
		},
		get beatThreshold() {
			return beatThreshold;
		},
		set beatThreshold(v: number) {
			beatThreshold = v;
		},
		isMicrophone: false,
	};

	const bloomEffect = {
		getParams: () => ({
			strength: BLOOM_DEFAULTS.strength as number,
			radius: BLOOM_DEFAULTS.radius as number,
			threshold: BLOOM_DEFAULTS.threshold as number,
		}),
		apply: (params: Partial<BloomParams>) => {
			lastBloomApplied = params;
		},
		pulse: () => {},
		recover: () => {},
	};

	const colorGrading = {
		getParams: () => ({ theme: DEFAULT_THEME }),
		setTheme: () => {},
		applyToScene: () => {},
	};

	return {
		audioAnalyzer: audioAnalyzer as unknown as ControlsConfig["audioAnalyzer"],
		bloomEffect: bloomEffect as unknown as ControlsConfig["bloomEffect"],
		colorGrading: colorGrading as unknown as ControlsConfig["colorGrading"],
		visualizers: {},
		onThemeChange: (theme: ColorThemeName) => {
			currentTheme = theme;
		},
		onMicrophoneToggle: vi.fn(),
		onStop: vi.fn(),
		onFullscreen: vi.fn(),
		getVolume: () => volume,
		getSmoothingFactor: () => smoothingFactor,
		getBeatThreshold: () => beatThreshold,
		getBloomApplied: () => lastBloomApplied,
		getTheme: () => currentTheme,
	};
}

/** lil-guiのフォルダーを取得（見つからなければテスト失敗） */
function getFolder(gui: ReturnType<typeof createControls>, title: string) {
	const folder = gui.folders.find((f) => f._title === title);
	if (!folder) throw new Error(`Folder "${title}" not found`);
	return folder;
}

/** lil-guiのコントローラーをpropertyで取得 */
function getController(
	gui: ReturnType<typeof createControls>,
	folderTitle: string,
	property: string,
) {
	const folder = getFolder(gui, folderTitle);
	const ctrl = folder.controllers.find((c) => c.property === property);
	if (!ctrl) throw new Error(`Controller "${property}" not found in "${folderTitle}"`);
	return ctrl;
}

/** lil-guiのコントローラーをnameで取得 */
function getControllerByName(
	gui: ReturnType<typeof createControls>,
	folderTitle: string,
	name: string,
) {
	const folder = getFolder(gui, folderTitle);
	const ctrl = folder.controllers.find((c) => c._name === name);
	if (!ctrl) throw new Error(`Controller named "${name}" not found in "${folderTitle}"`);
	return ctrl;
}

describe("createControls", () => {
	let mockConfig: ReturnType<typeof createMockConfig>;

	beforeEach(() => {
		// lil-guiのNumberControllerがwindow.matchMediaを使うためモック
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		});
		mockConfig = createMockConfig();
		for (const el of document.querySelectorAll(".lil-gui")) {
			el.remove();
		}
	});

	it("should create a GUI instance", () => {
		const gui = createControls(mockConfig);
		expect(gui).toBeDefined();
		gui.destroy();
	});

	it("should have Audio, Bloom, Color, Visualizers, General folders", () => {
		const gui = createControls(mockConfig);
		const folderNames = gui.folders.map((f) => f._title);
		expect(folderNames).toContain("Audio");
		expect(folderNames).toContain("Bloom");
		expect(folderNames).toContain("Color");
		expect(folderNames).toContain("Visualizers");
		expect(folderNames).toContain("General");
		gui.destroy();
	});

	it("should have Stop and Reset to Defaults buttons in General folder", () => {
		const gui = createControls(mockConfig);
		const generalFolder = getFolder(gui, "General");
		const controllerNames = generalFolder.controllers.map((c) => c._name);
		expect(controllerNames).toContain("Stop");
		expect(controllerNames).toContain("Reset to Defaults");
		gui.destroy();
	});

	it("should call onStop when Stop button is clicked", () => {
		const gui = createControls(mockConfig);
		const stopCtrl = getControllerByName(gui, "General", "Stop");
		stopCtrl.getValue()();
		expect(mockConfig.onStop).toHaveBeenCalled();
		gui.destroy();
	});

	it("should propagate volume changes to audioAnalyzer", () => {
		const gui = createControls(mockConfig);
		getController(gui, "Audio", "volume").setValue(0.5);
		expect(mockConfig.getVolume()).toBe(0.5);
		gui.destroy();
	});

	it("should propagate bloom strength changes to bloomEffect", () => {
		const gui = createControls(mockConfig);
		getController(gui, "Bloom", "strength").setValue(3.0);
		expect(mockConfig.getBloomApplied()).toEqual({ strength: 3.0 });
		gui.destroy();
	});

	it("should propagate theme changes", () => {
		const gui = createControls(mockConfig);
		getController(gui, "Color", "theme").setValue("ocean");
		expect(mockConfig.getTheme()).toBe("ocean");
		gui.destroy();
	});

	describe("Reset to Defaults", () => {
		it("should reset audio params to defaults", () => {
			const gui = createControls(mockConfig);

			getController(gui, "Audio", "volume").setValue(0.3);
			getController(gui, "Audio", "sensitivity").setValue(0.4);
			getController(gui, "Audio", "beatThreshold").setValue(0.7);

			gui.reset();

			expect(mockConfig.getVolume()).toBe(AUDIO_DEFAULTS.volume);
			expect(mockConfig.getSmoothingFactor()).toBe(AUDIO_DEFAULTS.sensitivity);
			expect(mockConfig.getBeatThreshold()).toBe(AUDIO_DEFAULTS.beatThreshold);
			gui.destroy();
		});

		it("should reset bloom params to defaults", () => {
			const gui = createControls(mockConfig);

			getController(gui, "Bloom", "strength").setValue(4.0);
			getController(gui, "Bloom", "radius").setValue(1.5);
			getController(gui, "Bloom", "threshold").setValue(0.8);

			gui.reset();

			// gui.reset()は各コントローラーのonChangeを順に発火する
			// 最後に発火するthresholdのonChangeが lastBloomApplied に残る
			expect(mockConfig.getBloomApplied()).toEqual({ threshold: BLOOM_DEFAULTS.threshold });
			gui.destroy();
		});

		it("should reset theme to default", () => {
			const gui = createControls(mockConfig);

			getController(gui, "Color", "theme").setValue("fire");
			expect(mockConfig.getTheme()).toBe("fire");

			gui.reset();

			expect(mockConfig.getTheme()).toBe(DEFAULT_THEME);
			gui.destroy();
		});

		it("should be triggered by Reset to Defaults button", () => {
			const gui = createControls(mockConfig);

			getController(gui, "Audio", "volume").setValue(0.1);

			// Reset to Defaultsボタンの関数を取得して実行
			const resetCtrl = getControllerByName(gui, "General", "Reset to Defaults");
			resetCtrl.getValue()();

			expect(mockConfig.getVolume()).toBe(AUDIO_DEFAULTS.volume);
			gui.destroy();
		});
	});
});
