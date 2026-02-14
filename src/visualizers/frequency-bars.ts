import * as THREE from "three";
import { BAR_COUNT, COLOR_THEMES } from "../utils/constants.js";
import { lerp, normalizeFrequency } from "../utils/math.js";
import { BaseVisualizer } from "./base-visualizer.js";
import type { VisualizerData } from "./base-visualizer.js";

/** 周波数バー — 128本を円形配置 */
export class FrequencyBars extends BaseVisualizer {
	private mesh: THREE.InstancedMesh;
	private dummy = new THREE.Object3D();
	private colors: Float32Array;
	private readonly radius = 12;
	private readonly barWidth = 0.4;
	private readonly maxHeight = 15;

	constructor(scene: THREE.Scene) {
		super(scene);

		const geometry = new THREE.BoxGeometry(this.barWidth, 1, this.barWidth);
		// ジオメトリの原点をY底面にずらす
		geometry.translate(0, 0.5, 0);

		const material = new THREE.MeshStandardMaterial({
			metalness: 0.3,
			roughness: 0.4,
		});

		this.mesh = new THREE.InstancedMesh(geometry, material, BAR_COUNT);
		this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

		// インスタンスカラーを有効化
		this.colors = new Float32Array(BAR_COUNT * 3);
		this.mesh.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);
		this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

		// 初期位置を設定
		for (let i = 0; i < BAR_COUNT; i++) {
			const angle = (i / BAR_COUNT) * Math.PI * 2;
			this.dummy.position.set(Math.cos(angle) * this.radius, 0, Math.sin(angle) * this.radius);
			this.dummy.rotation.y = -angle;
			this.dummy.scale.set(1, 0.01, 1);
			this.dummy.updateMatrix();
			this.mesh.setMatrixAt(i, this.dummy.matrix);
		}

		this.group.add(this.mesh);
	}

	update(data: VisualizerData): void {
		const { frequencyData, bandEnergy } = data;
		const theme = COLOR_THEMES[data.theme];
		const primaryColor = new THREE.Color(theme.primary);
		const secondaryColor = new THREE.Color(theme.secondary);
		const accentColor = new THREE.Color(theme.accent);

		// 周波数データからバーのサブセットを取得
		const binStep = Math.floor(frequencyData.length / BAR_COUNT);

		for (let i = 0; i < BAR_COUNT; i++) {
			const binIndex = i * binStep;
			const value = normalizeFrequency(frequencyData[binIndex] ?? 0);
			const height = Math.max(0.01, value * this.maxHeight);

			const angle = (i / BAR_COUNT) * Math.PI * 2;
			// ビート時に半径をわずかに拡大
			const r = this.radius + (data.isBeat ? bandEnergy.low * 2 : 0);

			this.dummy.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
			this.dummy.rotation.y = -angle;
			this.dummy.scale.set(1, height, 1);
			this.dummy.updateMatrix();
			this.mesh.setMatrixAt(i, this.dummy.matrix);

			// 色: 低い周波数=primary、中=secondary、高い=accent
			const t = i / BAR_COUNT;
			let color: THREE.Color;
			if (t < 0.33) {
				color = primaryColor.clone().lerp(secondaryColor, t / 0.33);
			} else if (t < 0.66) {
				color = secondaryColor.clone().lerp(accentColor, (t - 0.33) / 0.33);
			} else {
				color = accentColor.clone().lerp(primaryColor, (t - 0.66) / 0.34);
			}

			// エネルギーに応じて明るさをブースト
			const brightness = lerp(0.5, 1.5, value);
			color.multiplyScalar(brightness);

			this.colors[i * 3] = color.r;
			this.colors[i * 3 + 1] = color.g;
			this.colors[i * 3 + 2] = color.b;
		}

		this.mesh.instanceMatrix.needsUpdate = true;
		if (this.mesh.instanceColor) {
			this.mesh.instanceColor.needsUpdate = true;
		}
	}
}
