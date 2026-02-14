import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CAMERA_DEFAULTS, COLOR_THEMES, DEFAULT_THEME } from "../utils/constants.js";

export interface SceneContext {
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	controls: OrbitControls;
}

/** Scene・Camera・OrbitControlsを構築 */
export function createScene(domElement: HTMLElement): SceneContext {
	const scene = new THREE.Scene();
	const theme = COLOR_THEMES[DEFAULT_THEME];
	scene.background = new THREE.Color(theme.background);
	scene.fog = new THREE.FogExp2(theme.background, 0.008);

	const aspect = domElement.clientWidth / domElement.clientHeight;
	const camera = new THREE.PerspectiveCamera(
		CAMERA_DEFAULTS.fov,
		aspect,
		CAMERA_DEFAULTS.near,
		CAMERA_DEFAULTS.far,
	);
	camera.position.set(
		CAMERA_DEFAULTS.position.x,
		CAMERA_DEFAULTS.position.y,
		CAMERA_DEFAULTS.position.z,
	);

	// ライティング
	const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
	scene.add(ambientLight);

	const pointLight = new THREE.PointLight(0xffffff, 1, 100);
	pointLight.position.set(0, 20, 0);
	scene.add(pointLight);

	// OrbitControlsはrenderer.domElementが必要なので、一旦ダミーで作成
	// initRenderer後にdomElementを差し替える
	const controls = new OrbitControls(camera, domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;
	controls.autoRotate = true;
	controls.autoRotateSpeed = 0.5;
	controls.maxDistance = 100;
	controls.minDistance = 5;

	return { scene, camera, controls };
}

/** OrbitControlsのdomElementをrenderer.domElementに差し替え */
export function attachControlsToRenderer(
	controls: OrbitControls,
	camera: THREE.Camera,
	rendererDomElement: HTMLElement,
): void {
	controls.dispose();
	const newControls = new OrbitControls(camera, rendererDomElement);
	newControls.enableDamping = true;
	newControls.dampingFactor = 0.05;
	newControls.autoRotate = true;
	newControls.autoRotateSpeed = 0.5;
	newControls.maxDistance = 100;
	newControls.minDistance = 5;
	Object.assign(controls, newControls);
}
