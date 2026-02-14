import { beforeEach, describe, expect, it } from "vitest";
import { COLOR_THEMES } from "../utils/constants.js";
import { ColorGrading } from "./color-grading.js";

describe("ColorGrading", () => {
	let colorGrading: ColorGrading;

	beforeEach(() => {
		colorGrading = new ColorGrading();
	});

	it("should initialize with cyber theme", () => {
		expect(colorGrading.getParams().theme).toBe("cyber");
	});

	it("should initialize with default saturation and brightness", () => {
		const params = colorGrading.getParams();
		expect(params.saturation).toBe(1.0);
		expect(params.brightness).toBe(1.0);
	});

	it("should change theme", () => {
		colorGrading.setTheme("ocean");
		expect(colorGrading.getParams().theme).toBe("ocean");
	});

	it("should return correct theme colors after change", () => {
		colorGrading.setTheme("fire");
		const colors = colorGrading.getThemeColors();
		expect(colors).toEqual(COLOR_THEMES.fire);
	});

	it("should return correct theme colors for each theme", () => {
		for (const themeName of Object.keys(COLOR_THEMES) as Array<keyof typeof COLOR_THEMES>) {
			colorGrading.setTheme(themeName);
			expect(colorGrading.getThemeColors()).toEqual(COLOR_THEMES[themeName]);
		}
	});

	it("should set partial params", () => {
		colorGrading.setParams({ saturation: 0.5 });
		expect(colorGrading.getParams().saturation).toBe(0.5);
		expect(colorGrading.getParams().brightness).toBe(1.0);
	});

	it("getParams should return a copy", () => {
		const params1 = colorGrading.getParams();
		const params2 = colorGrading.getParams();
		expect(params1).toEqual(params2);
		expect(params1).not.toBe(params2);
	});
});
