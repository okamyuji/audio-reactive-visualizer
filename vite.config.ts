/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		target: "es2022",
		sourcemap: true,
	},
	test: {
		environment: "jsdom",
		globals: true,
		include: ["src/**/*.test.ts"],
	},
});
