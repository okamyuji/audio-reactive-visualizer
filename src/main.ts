import * as THREE from "three";
import { AudioAnalyzer } from "./core/audio-analyzer.js";
import { createRenderer, setupResizeHandler } from "./core/renderer.js";
import { createScene } from "./core/scene.js";
import { BloomEffect } from "./effects/bloom.js";
import { ColorGrading } from "./effects/color-grading.js";
import { createControls } from "./ui/controls.js";
import type { ColorThemeName } from "./utils/constants.js";
import { COLOR_THEMES } from "./utils/constants.js";
import type { VisualizerData } from "./visualizers/base-visualizer.js";
import { FrequencyBars } from "./visualizers/frequency-bars.js";
import { ParticleField } from "./visualizers/particle-field.js";
import { WaveformRibbon } from "./visualizers/waveform-ribbon.js";

async function main(): Promise<void> {
	const container = document.getElementById("canvas-container");
	const dropZone = document.getElementById("drop-zone");
	const fileInput = document.getElementById("file-input") as HTMLInputElement | null;

	if (!container || !dropZone || !fileInput) {
		throw new Error("Required DOM elements not found");
	}

	// --- Core Setup ---
	const { scene, camera, controls } = createScene(container);
	const rendererCtx = await createRenderer(container, scene, camera);
	const cleanupResize = setupResizeHandler(container, camera, rendererCtx);

	// OrbitControlsをrendererのdomElementに再接続
	controls.dispose();
	const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
	const orbitControls = new OrbitControls(camera, rendererCtx.renderer.domElement);
	orbitControls.enableDamping = true;
	orbitControls.dampingFactor = 0.05;
	orbitControls.autoRotate = true;
	orbitControls.autoRotateSpeed = 0.5;
	orbitControls.maxDistance = 100;
	orbitControls.minDistance = 5;

	// --- Audio ---
	const audioAnalyzer = new AudioAnalyzer();

	// --- Visualizers ---
	const frequencyBars = new FrequencyBars(scene);
	const particleField = new ParticleField(scene);
	const waveformRibbon = new WaveformRibbon(scene);

	// --- Effects ---
	const bloomEffect = new BloomEffect(rendererCtx.pipeline);
	const colorGrading = new ColorGrading();

	// --- Camera shake state ---
	let cameraShakeIntensity = 0;
	const cameraBasePosition = camera.position.clone();

	// --- Theme change handler ---
	const handleThemeChange = (themeName: ColorThemeName) => {
		colorGrading.setTheme(themeName);
		colorGrading.applyToScene(scene);
		const theme = COLOR_THEMES[themeName];
		scene.traverse((child) => {
			if (child instanceof THREE.PointLight) {
				child.color.set(theme.primary);
			}
		});
	};

	// --- Microphone toggle ---
	const handleMicToggle = async () => {
		if (audioAnalyzer.isMicrophone) {
			audioAnalyzer.stop();
		} else {
			await audioAnalyzer.startMicrophone();
			dropZone.classList.add("hidden");
		}
	};

	// --- Stop ---
	const handleStop = () => {
		audioAnalyzer.stop();
		dropZone.classList.remove("hidden");
		fileInput.value = "";
	};

	// --- Fullscreen ---
	const handleFullscreen = () => {
		if (document.fullscreenElement) {
			void document.exitFullscreen();
		} else {
			void document.documentElement.requestFullscreen();
		}
	};

	// --- UI ---
	const gui = createControls({
		audioAnalyzer,
		bloomEffect,
		colorGrading,
		visualizers: {
			"Frequency Bars": frequencyBars,
			"Particle Field": particleField,
			"Waveform Ribbon": waveformRibbon,
		},
		onThemeChange: handleThemeChange,
		onMicrophoneToggle: () => void handleMicToggle(),
		onStop: handleStop,
		onFullscreen: handleFullscreen,
	});

	// --- File Input ---
	const handleFile = async (file: File) => {
		await audioAnalyzer.loadFile(file);
		dropZone.classList.add("hidden");
	};

	fileInput.addEventListener("change", () => {
		const file = fileInput.files?.[0];
		if (file) void handleFile(file);
	});

	// Drag & Drop
	document.addEventListener("dragover", (e) => {
		e.preventDefault();
		dropZone.classList.remove("hidden");
	});

	document.addEventListener("drop", (e) => {
		e.preventDefault();
		const file = e.dataTransfer?.files[0];
		if (file) void handleFile(file);
	});

	// Fullscreen keyboard shortcut
	document.addEventListener("keydown", (e) => {
		if (e.key === "F11") {
			e.preventDefault();
			handleFullscreen();
		}
	});

	// --- Animation Loop ---
	const clock = new THREE.Clock();

	const animate = () => {
		const deltaTime = clock.getDelta();
		const elapsedTime = clock.getElapsedTime();

		// Audio update
		audioAnalyzer.update();
		const bandEnergy = audioAnalyzer.getBandEnergy();
		const overallEnergy = audioAnalyzer.getOverallEnergy();
		const isBeat = audioAnalyzer.detectBeat();

		const vizData: VisualizerData = {
			frequencyData: audioAnalyzer.getFrequencyData(),
			timeDomainData: audioAnalyzer.getTimeDomainData(),
			bandEnergy,
			overallEnergy,
			isBeat,
			deltaTime,
			elapsedTime,
			theme: colorGrading.getParams().theme,
		};

		// Visualizer updates
		if (frequencyBars.visible) frequencyBars.update(vizData);
		if (particleField.visible) particleField.update(vizData);
		if (waveformRibbon.visible) waveformRibbon.update(vizData);

		// Beat effects
		if (isBeat) {
			bloomEffect.pulse(overallEnergy);
			cameraShakeIntensity = overallEnergy * 0.5;
		} else {
			bloomEffect.recover(deltaTime * 3);
		}

		// Camera shake
		if (cameraShakeIntensity > 0.01) {
			camera.position.set(
				cameraBasePosition.x + (Math.random() - 0.5) * cameraShakeIntensity,
				cameraBasePosition.y + (Math.random() - 0.5) * cameraShakeIntensity,
				cameraBasePosition.z + (Math.random() - 0.5) * cameraShakeIntensity,
			);
			cameraShakeIntensity *= 0.9;
		}

		// Controls update
		orbitControls.update();
		cameraBasePosition.copy(camera.position);

		// Render
		rendererCtx.pipeline.render();
	};

	rendererCtx.renderer.setAnimationLoop(animate);

	// --- Cleanup (for HMR) ---
	if (import.meta.hot) {
		import.meta.hot.dispose(() => {
			cleanupResize();
			audioAnalyzer.dispose();
			frequencyBars.dispose();
			particleField.dispose();
			waveformRibbon.dispose();
			gui.destroy();
			rendererCtx.renderer.dispose();
			while (container.firstChild) {
				container.removeChild(container.firstChild);
			}
		});
	}
}

main().catch((err: unknown) => {
	const message = err instanceof Error ? err.message : String(err);
	const errorDiv = document.createElement("div");
	errorDiv.style.cssText = "color:red;padding:2rem;font-family:monospace";
	errorDiv.textContent = message;
	document.body.appendChild(errorDiv);
});
