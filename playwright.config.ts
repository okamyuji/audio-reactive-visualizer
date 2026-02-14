import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	timeout: 30000,
	retries: 0,
	use: {
		baseURL: "http://localhost:5173",
		headless: true,
		launchOptions: {
			args: ["--use-gl=angle", "--use-angle=swiftshader"],
		},
	},
	webServer: {
		command: "npx vite --port 5173",
		port: 5173,
		reuseExistingServer: true,
		timeout: 10000,
	},
	projects: [
		{
			name: "chromium",
			use: {
				browserName: "chromium",
			},
		},
	],
});
