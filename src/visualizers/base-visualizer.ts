import * as THREE from "three";
import type { BandEnergy } from "../core/audio-analyzer.js";
import type { ColorThemeName } from "../utils/constants.js";

/** ビジュアライザー更新用のデータ */
export interface VisualizerData {
	frequencyData: Uint8Array<ArrayBuffer>;
	timeDomainData: Uint8Array<ArrayBuffer>;
	bandEnergy: BandEnergy;
	overallEnergy: number;
	isBeat: boolean;
	deltaTime: number;
	elapsedTime: number;
	theme: ColorThemeName;
}

/** 全ビジュアライザーの基底クラス */
export abstract class BaseVisualizer {
	protected group: THREE.Group;
	protected _visible = true;

	constructor(protected scene: THREE.Scene) {
		this.group = new THREE.Group();
		this.scene.add(this.group);
	}

	get visible(): boolean {
		return this._visible;
	}

	set visible(value: boolean) {
		this._visible = value;
		this.group.visible = value;
	}

	/** 毎フレーム更新 */
	abstract update(data: VisualizerData): void;

	/** リソース解放 */
	dispose(): void {
		this.scene.remove(this.group);
		this.group.traverse((child) => {
			if ("geometry" in child) {
				const mesh = child as THREE.Mesh;
				mesh.geometry.dispose();
				if (Array.isArray(mesh.material)) {
					for (const mat of mesh.material) {
						mat.dispose();
					}
				} else if (mesh.material) {
					mesh.material.dispose();
				}
			}
		});
	}
}
