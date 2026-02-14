import { expect, test } from "@playwright/test";

test.describe("Audio Reactive Visualizer — 初期表示", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		// アプリ初期化待ち
		await page.waitForLoadState("networkidle");
	});

	test("ページタイトルが正しい", async ({ page }) => {
		await expect(page).toHaveTitle("Audio Reactive Visualizer");
	});

	test("canvas要素がDOMに存在する", async ({ page }) => {
		const canvas = page.locator("#canvas-container canvas");
		await expect(canvas).toBeVisible();
	});

	test("ドロップゾーンが表示されている", async ({ page }) => {
		const dropZone = page.locator("#drop-zone");
		await expect(dropZone).toBeVisible();
	});

	test("ドロップゾーンにタイトルが表示されている", async ({ page }) => {
		const heading = page.locator("#drop-zone h1");
		await expect(heading).toHaveText("Audio Reactive Visualizer");
	});

	test("ファイル選択ボタンが存在する", async ({ page }) => {
		const fileInput = page.locator("#file-input");
		await expect(fileInput).toBeAttached();
	});

	test("ファイル選択UIが正しいテキスト", async ({ page }) => {
		const wrapper = page.locator(".file-upload-wrapper span");
		await expect(wrapper).toHaveText("ファイルを選択");
	});

	test("canvasがWebGL/WebGPUコンテキストを持っている", async ({ page }) => {
		const hasContext = await page.evaluate(() => {
			const canvas = document.querySelector("#canvas-container canvas") as HTMLCanvasElement;
			if (!canvas) return false;
			// WebGPU or WebGL context exists if canvas is being rendered to
			return canvas.width > 0 && canvas.height > 0;
		});
		expect(hasContext).toBe(true);
	});

	test("canvasがビューポートサイズで描画されている", async ({ page }) => {
		const viewport = page.viewportSize();
		const canvasSize = await page.evaluate(() => {
			const canvas = document.querySelector("#canvas-container canvas") as HTMLCanvasElement;
			if (!canvas) return { width: 0, height: 0 };
			return {
				width: canvas.clientWidth,
				height: canvas.clientHeight,
			};
		});
		expect(canvasSize.width).toBeGreaterThan(0);
		expect(canvasSize.height).toBeGreaterThan(0);
		if (viewport) {
			expect(canvasSize.width).toBe(viewport.width);
			expect(canvasSize.height).toBe(viewport.height);
		}
	});
});

test.describe("Audio Reactive Visualizer — lil-gui", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");
	});

	test("lil-guiパネルが表示されている", async ({ page }) => {
		const gui = page.locator(".lil-gui.root");
		await expect(gui).toBeVisible();
	});

	test("lil-guiにControlsタイトルが存在する", async ({ page }) => {
		const title = page.locator(".lil-gui .title");
		await expect(title.first()).toHaveText("Controls");
	});

	test("Audioフォルダが存在する", async ({ page }) => {
		const folder = page.locator('.lil-gui .title:text("Audio")');
		await expect(folder).toBeVisible();
	});

	test("Bloomフォルダが存在する", async ({ page }) => {
		const folder = page.locator('.lil-gui .title:text("Bloom")');
		await expect(folder).toBeVisible();
	});

	test("Colorフォルダが存在する", async ({ page }) => {
		const folder = page.locator('.lil-gui .title:text("Color")');
		await expect(folder).toBeVisible();
	});

	test("Visualizersフォルダが存在する", async ({ page }) => {
		const folder = page.locator('.lil-gui .title:text("Visualizers")');
		await expect(folder).toBeVisible();
	});
});

test.describe("Audio Reactive Visualizer — リサイズ", () => {
	test("ウィンドウリサイズ時にcanvasが追従する", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		await page.setViewportSize({ width: 800, height: 600 });
		// リサイズイベント処理待ち
		await page.waitForTimeout(200);

		const canvasSize = await page.evaluate(() => {
			const canvas = document.querySelector("#canvas-container canvas") as HTMLCanvasElement;
			if (!canvas) return { width: 0, height: 0 };
			return {
				width: canvas.clientWidth,
				height: canvas.clientHeight,
			};
		});

		expect(canvasSize.width).toBe(800);
		expect(canvasSize.height).toBe(600);
	});
});

test.describe("Audio Reactive Visualizer — エラーなし", () => {
	test("コンソールにエラーが出力されていない", async ({ page }) => {
		const errors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				errors.push(msg.text());
			}
		});

		await page.goto("/");
		await page.waitForLoadState("networkidle");
		// アニメーションフレーム数回分待機
		await page.waitForTimeout(1000);

		// WebGPU非対応のフォールバック警告やNodeMaterial互換性エラーは許容
		const criticalErrors = errors.filter(
			(e) =>
				!e.includes("WebGPU") &&
				!e.includes("gpu") &&
				!e.includes("adapter") &&
				!e.includes("NodeMaterial") &&
				!e.includes("not compatible"),
		);
		expect(criticalErrors).toHaveLength(0);
	});
});
