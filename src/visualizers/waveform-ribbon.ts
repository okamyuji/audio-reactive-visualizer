import * as THREE from "three";
import { COLOR_THEMES, WAVEFORM_HISTORY_LENGTH } from "../utils/constants.js";
import { lerp } from "../utils/math.js";
import { BaseVisualizer } from "./base-visualizer.js";
import type { VisualizerData } from "./base-visualizer.js";

/** 波形リボンメッシュ — 波形データの3D履歴表示 */
export class WaveformRibbon extends BaseVisualizer {
	private mesh: THREE.Mesh;
	private geometry: THREE.BufferGeometry;
	private positions: Float32Array;
	private colors: Float32Array;
	private readonly segmentCount = 128;
	private readonly ribbonWidth = 30;
	private readonly historyDepth = 40;
	private historyIndex = 0;
	private waveformHistory: Float32Array[];

	constructor(scene: THREE.Scene) {
		super(scene);

		this.waveformHistory = Array.from(
			{ length: WAVEFORM_HISTORY_LENGTH },
			() => new Float32Array(this.segmentCount),
		);

		// リボンメッシュ: segmentCount x WAVEFORM_HISTORY_LENGTH のグリッド
		const vertexCount = this.segmentCount * WAVEFORM_HISTORY_LENGTH;
		this.positions = new Float32Array(vertexCount * 3);
		this.colors = new Float32Array(vertexCount * 3);

		// インデックスバッファ
		const indices: number[] = [];
		for (let z = 0; z < WAVEFORM_HISTORY_LENGTH - 1; z++) {
			for (let x = 0; x < this.segmentCount - 1; x++) {
				const a = z * this.segmentCount + x;
				const b = a + 1;
				const c = a + this.segmentCount;
				const d = c + 1;
				indices.push(a, c, b);
				indices.push(b, c, d);
			}
		}

		this.geometry = new THREE.BufferGeometry();
		this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
		this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
		this.geometry.setIndex(indices);

		const material = new THREE.MeshBasicMaterial({
			vertexColors: true,
			transparent: true,
			opacity: 0.6,
			side: THREE.DoubleSide,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			wireframe: false,
		});

		this.mesh = new THREE.Mesh(this.geometry, material);
		this.mesh.position.y = -5;
		this.group.add(this.mesh);
	}

	update(data: VisualizerData): void {
		const { timeDomainData, bandEnergy, elapsedTime } = data;
		const theme = COLOR_THEMES[data.theme];
		const primaryColor = new THREE.Color(theme.primary);
		const secondaryColor = new THREE.Color(theme.secondary);

		// 波形データを履歴に記録
		const step = Math.floor(timeDomainData.length / this.segmentCount);
		const currentWaveform = this.waveformHistory[this.historyIndex % WAVEFORM_HISTORY_LENGTH];
		if (currentWaveform) {
			for (let x = 0; x < this.segmentCount; x++) {
				currentWaveform[x] = ((timeDomainData[x * step] ?? 128) - 128) / 128;
			}
		}
		this.historyIndex++;

		// 頂点位置と色を更新
		for (let z = 0; z < WAVEFORM_HISTORY_LENGTH; z++) {
			const histIdx =
				(this.historyIndex - WAVEFORM_HISTORY_LENGTH + z + WAVEFORM_HISTORY_LENGTH * 100) %
				WAVEFORM_HISTORY_LENGTH;
			const waveform = this.waveformHistory[histIdx];
			const age = z / WAVEFORM_HISTORY_LENGTH; // 0=古い, 1=新しい

			for (let x = 0; x < this.segmentCount; x++) {
				const vertIdx = z * this.segmentCount + x;
				const v3 = vertIdx * 3;

				// X: 左右に広がる
				const xPos = (x / this.segmentCount - 0.5) * this.ribbonWidth;
				// Y: 波形の高さ（エネルギーで増幅）
				const amplitude = lerp(1, 5, bandEnergy.low);
				const yPos = (waveform?.[x] ?? 0) * amplitude;
				// Z: 奥行き方向に並ぶ
				const zPos = (z / WAVEFORM_HISTORY_LENGTH - 0.5) * this.historyDepth;

				this.positions[v3] = xPos;
				this.positions[v3 + 1] = yPos;
				this.positions[v3 + 2] = zPos;

				// 色: 新しいほど明るく、位置でグラデーション
				const t = (x / this.segmentCount + elapsedTime * 0.05) % 1;
				const color = primaryColor.clone().lerp(secondaryColor, t);
				const brightness = lerp(0.1, 1.0, age);
				color.multiplyScalar(brightness);

				this.colors[v3] = color.r;
				this.colors[v3 + 1] = color.g;
				this.colors[v3 + 2] = color.b;
			}
		}

		const posAttr = this.geometry.getAttribute("position");
		posAttr.needsUpdate = true;
		const colorAttr = this.geometry.getAttribute("color");
		colorAttr.needsUpdate = true;
		this.geometry.computeVertexNormals();
	}
}
