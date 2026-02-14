import * as THREE from "three";
import { COLOR_THEMES } from "../utils/constants.js";
import type { ColorThemeName } from "../utils/constants.js";

export interface ColorGradingParams {
	theme: ColorThemeName;
	saturation: number;
	brightness: number;
}

/** カラーグレーディング管理 */
export class ColorGrading {
	private params: ColorGradingParams;

	constructor() {
		this.params = {
			theme: "cyber",
			saturation: 1.0,
			brightness: 1.0,
		};
	}

	/** テーマを変更 */
	setTheme(theme: ColorThemeName): void {
		this.params.theme = theme;
	}

	/** 現在のテーマカラーを取得 */
	getThemeColors(): (typeof COLOR_THEMES)[ColorThemeName] {
		return COLOR_THEMES[this.params.theme];
	}

	/** 背景色をSceneに適用 */
	applyToScene(scene: THREE.Scene): void {
		const theme = this.getThemeColors();
		scene.background = new THREE.Color(theme.background);
		if (scene.fog instanceof THREE.FogExp2) {
			scene.fog.color.set(theme.background);
		}
	}

	getParams(): ColorGradingParams {
		return { ...this.params };
	}

	setParams(params: Partial<ColorGradingParams>): void {
		Object.assign(this.params, params);
	}
}
