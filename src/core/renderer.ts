import * as THREE from "three";
import { BLOOM_DEFAULTS } from "../utils/constants.js";

/** PostProcessingパイプラインの統一インターフェース */
export interface PostProcessingPipeline {
	render(): void;
	setSize(width: number, height: number): void;
	setBloomStrength(value: number): void;
	setBloomRadius(value: number): void;
	setBloomThreshold(value: number): void;
	getBloomStrength(): number;
}

export interface RendererContext {
	renderer: THREE.WebGLRenderer;
	pipeline: PostProcessingPipeline;
	isWebGPU: boolean;
}

/** WebGPU用ノードベースPostProcessingを構築 */
async function createWebGPUPipeline(
	// biome-ignore lint/suspicious/noExplicitAny: WebGPURendererはWebGLRendererにキャストされており、PostProcessingにはRenderer型が必要
	gpuRenderer: any,
	scene: THREE.Scene,
	camera: THREE.Camera,
): Promise<PostProcessingPipeline> {
	const { PostProcessing } = await import("three/webgpu");
	const { pass, renderOutput } = await import("three/tsl");
	const { bloom } = await import("three/addons/tsl/display/BloomNode.js");

	const postProcessing = new PostProcessing(gpuRenderer);
	postProcessing.outputColorTransform = false;

	const scenePass = pass(scene, camera);
	const scenePassColor = scenePass.getTextureNode("output");
	const bloomPass = bloom(scenePassColor, BLOOM_DEFAULTS.strength, BLOOM_DEFAULTS.radius);
	bloomPass.threshold.value = BLOOM_DEFAULTS.threshold;

	const outputNode = renderOutput(scenePassColor.add(bloomPass));
	postProcessing.outputNode = outputNode;
	postProcessing.needsUpdate = true;

	return {
		render: () => postProcessing.render(),
		setSize: () => {
			// PostProcessingは自動リサイズ
		},
		setBloomStrength: (v: number) => {
			bloomPass.strength.value = v;
		},
		setBloomRadius: (v: number) => {
			bloomPass.radius.value = v;
		},
		setBloomThreshold: (v: number) => {
			bloomPass.threshold.value = v;
		},
		getBloomStrength: () => bloomPass.strength.value as number,
	};
}

/** WebGPUレンダラーでPostProcessingが使えない場合のフォールバック（Bloom無し） */
function createBasicPipeline(
	// biome-ignore lint/suspicious/noExplicitAny: WebGPURendererはWebGLRendererにキャストされている
	gpuRenderer: any,
	scene: THREE.Scene,
	camera: THREE.Camera,
): PostProcessingPipeline {
	let currentStrength: number = BLOOM_DEFAULTS.strength;
	return {
		render: () => gpuRenderer.render(scene, camera),
		setSize: () => {},
		setBloomStrength: (v: number) => {
			currentStrength = v;
		},
		setBloomRadius: () => {},
		setBloomThreshold: () => {},
		getBloomStrength: () => currentStrength,
	};
}

/** WebGL用従来EffectComposerベースのPostProcessingを構築 */
async function createWebGLPipeline(
	renderer: THREE.WebGLRenderer,
	scene: THREE.Scene,
	camera: THREE.Camera,
): Promise<PostProcessingPipeline> {
	const { EffectComposer } = await import("three/addons/postprocessing/EffectComposer.js");
	const { RenderPass } = await import("three/addons/postprocessing/RenderPass.js");
	const { UnrealBloomPass } = await import("three/addons/postprocessing/UnrealBloomPass.js");
	const { OutputPass } = await import("three/addons/postprocessing/OutputPass.js");

	const composer = new EffectComposer(renderer);
	composer.addPass(new RenderPass(scene, camera));

	const size = renderer.getSize(new THREE.Vector2());
	const bloomPass = new UnrealBloomPass(
		size,
		BLOOM_DEFAULTS.strength,
		BLOOM_DEFAULTS.radius,
		BLOOM_DEFAULTS.threshold,
	);
	composer.addPass(bloomPass);
	composer.addPass(new OutputPass());

	return {
		render: () => composer.render(),
		setSize: (w: number, h: number) => composer.setSize(w, h),
		setBloomStrength: (v: number) => {
			bloomPass.strength = v;
		},
		setBloomRadius: (v: number) => {
			bloomPass.radius = v;
		},
		setBloomThreshold: (v: number) => {
			bloomPass.threshold = v;
		},
		getBloomStrength: () => bloomPass.strength,
	};
}

/**
 * レンダラーを初期化。WebGPUを試行し、失敗時はWebGLにフォールバック。
 *
 * 重要: WebGPUレンダラー初期化後は絶対にWebGL用EffectComposerを使わない。
 * ShaderMaterialがWebGPUと互換性がないため、混在させるとクラッシュする。
 */
export async function createRenderer(
	container: HTMLElement,
	scene: THREE.Scene,
	camera: THREE.Camera,
): Promise<RendererContext> {
	// --- WebGPUを試行 ---
	try {
		const { WebGPURenderer } = await import("three/webgpu");
		const gpuRenderer = new WebGPURenderer({ antialias: true });
		await gpuRenderer.init();

		const renderer = gpuRenderer as unknown as THREE.WebGLRenderer;

		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(container.clientWidth, container.clientHeight);
		container.appendChild(renderer.domElement);

		// WebGPU PostProcessingを試行、失敗なら基本レンダリング
		let pipeline: PostProcessingPipeline;
		try {
			pipeline = await createWebGPUPipeline(gpuRenderer, scene, camera);
		} catch {
			pipeline = createBasicPipeline(gpuRenderer, scene, camera);
		}

		return { renderer, pipeline, isWebGPU: true };
	} catch {
		// WebGPU非対応 → WebGLフォールバック
	}

	// --- WebGLフォールバック ---
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.0;

	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(container.clientWidth, container.clientHeight);
	container.appendChild(renderer.domElement);

	const pipeline = await createWebGLPipeline(renderer, scene, camera);

	return { renderer, pipeline, isWebGPU: false };
}

/** リサイズハンドラを登録 */
export function setupResizeHandler(
	container: HTMLElement,
	camera: THREE.PerspectiveCamera,
	rendererCtx: RendererContext,
): () => void {
	const onResize = () => {
		const width = container.clientWidth;
		const height = container.clientHeight;
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		rendererCtx.renderer.setSize(width, height);
		rendererCtx.pipeline.setSize(width, height);
	};
	window.addEventListener("resize", onResize);
	return () => window.removeEventListener("resize", onResize);
}
