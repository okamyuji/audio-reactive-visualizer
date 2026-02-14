import * as THREE from "three";
import type { BandEnergy } from "../core/audio-analyzer.js";
import { COLOR_THEMES, DEFAULT_THEME, PARTICLE_COUNT } from "../utils/constants.js";
import { lerp } from "../utils/math.js";
import { BaseVisualizer } from "./base-visualizer.js";
import type { VisualizerData } from "./base-visualizer.js";

interface ParticleContext {
	i3: number;
	baseX: number;
	baseY: number;
	baseZ: number;
}

/** スパーク値を計算 */
function computeSpark(highEnergy: number): number {
	return highEnergy > 0.3 ? (Math.random() - 0.5) * highEnergy * 2 : 0;
}

/** GPUパーティクルフィールド */
export class ParticleField extends BaseVisualizer {
	private points: THREE.Points;
	private positions: Float32Array;
	private velocities: Float32Array;
	private colors: Float32Array;
	private sizes: Float32Array;
	private basePositions: Float32Array;

	constructor(scene: THREE.Scene) {
		super(scene);

		this.positions = new Float32Array(PARTICLE_COUNT * 3);
		this.velocities = new Float32Array(PARTICLE_COUNT * 3);
		this.colors = new Float32Array(PARTICLE_COUNT * 3);
		this.sizes = new Float32Array(PARTICLE_COUNT);
		this.basePositions = new Float32Array(PARTICLE_COUNT * 3);

		this.initializeParticles();

		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
		geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
		geometry.setAttribute("size", new THREE.BufferAttribute(this.sizes, 1));

		const material = new THREE.PointsMaterial({
			size: 0.8,
			vertexColors: true,
			transparent: true,
			opacity: 0.8,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			sizeAttenuation: true,
		});

		this.points = new THREE.Points(geometry, material);
		this.group.add(this.points);
	}

	private initializeParticles(): void {
		const theme = COLOR_THEMES[DEFAULT_THEME];
		const primaryColor = new THREE.Color(theme.primary);
		const secondaryColor = new THREE.Color(theme.secondary);

		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const i3 = i * 3;
			const radius = 5 + Math.random() * 20;
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);

			const x = radius * Math.sin(phi) * Math.cos(theta);
			const y = radius * Math.sin(phi) * Math.sin(theta);
			const z = radius * Math.cos(phi);

			this.positions[i3] = x;
			this.positions[i3 + 1] = y;
			this.positions[i3 + 2] = z;
			this.basePositions[i3] = x;
			this.basePositions[i3 + 1] = y;
			this.basePositions[i3 + 2] = z;

			const t = Math.random();
			const color = primaryColor.clone().lerp(secondaryColor, t);
			this.colors[i3] = color.r;
			this.colors[i3 + 1] = color.g;
			this.colors[i3 + 2] = color.b;

			this.sizes[i] = 0.5 + Math.random() * 1.5;
		}
	}

	private updateVelocity(
		ctx: ParticleContext,
		bandEnergy: BandEnergy,
		dt: number,
		elapsedTime: number,
	): void {
		const { i3, baseX, baseY, baseZ } = ctx;
		const waveStrength = bandEnergy.low * 3;
		const waveOffset = Math.sin(elapsedTime * 0.5 + baseX * 0.1 + baseZ * 0.1) * waveStrength;
		const spreadFactor = 1.0 + bandEnergy.mid * 0.5;

		const targetX = baseX * spreadFactor + computeSpark(bandEnergy.high);
		const targetY = baseY * spreadFactor + waveOffset + computeSpark(bandEnergy.high);
		const targetZ = baseZ * spreadFactor + computeSpark(bandEnergy.high);

		this.velocities[i3] = lerp(
			this.velocities[i3] ?? 0,
			(targetX - (this.positions[i3] ?? 0)) * 2,
			dt * 3,
		);
		this.velocities[i3 + 1] = lerp(
			this.velocities[i3 + 1] ?? 0,
			(targetY - (this.positions[i3 + 1] ?? 0)) * 2,
			dt * 3,
		);
		this.velocities[i3 + 2] = lerp(
			this.velocities[i3 + 2] ?? 0,
			(targetZ - (this.positions[i3 + 2] ?? 0)) * 2,
			dt * 3,
		);
	}

	private applyBeatImpulse(ctx: ParticleContext): void {
		const { i3, baseX, baseY, baseZ } = ctx;
		const dir = Math.sqrt(baseX * baseX + baseY * baseY + baseZ * baseZ) || 1;
		const vx = this.velocities[i3];
		const vy = this.velocities[i3 + 1];
		const vz = this.velocities[i3 + 2];
		if (vx !== undefined) this.velocities[i3] = vx + (baseX / dir) * 5;
		if (vy !== undefined) this.velocities[i3 + 1] = vy + (baseY / dir) * 5;
		if (vz !== undefined) this.velocities[i3 + 2] = vz + (baseZ / dir) * 5;
	}

	private updateColor(
		i: number,
		i3: number,
		energy: number,
		elapsedTime: number,
		primaryColor: THREE.Color,
		secondaryColor: THREE.Color,
		accentColor: THREE.Color,
	): void {
		const t = (i / PARTICLE_COUNT + elapsedTime * 0.1) % 1;
		const base = energy > 0.5 ? accentColor : primaryColor;
		const target = energy > 0.5 ? primaryColor : secondaryColor;
		const color = base.clone().lerp(target, t);
		color.multiplyScalar(lerp(0.3, 1.5, energy));

		this.colors[i3] = color.r;
		this.colors[i3 + 1] = color.g;
		this.colors[i3 + 2] = color.b;
	}

	update(data: VisualizerData): void {
		const { bandEnergy, isBeat, deltaTime, elapsedTime } = data;
		const theme = COLOR_THEMES[data.theme];
		const primaryColor = new THREE.Color(theme.primary);
		const secondaryColor = new THREE.Color(theme.secondary);
		const accentColor = new THREE.Color(theme.accent);
		const dt = Math.min(deltaTime, 0.05);
		const energy = bandEnergy.low * 0.5 + bandEnergy.mid * 0.3 + bandEnergy.high * 0.2;

		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const i3 = i * 3;
			const ctx: ParticleContext = {
				i3,
				baseX: this.basePositions[i3] ?? 0,
				baseY: this.basePositions[i3 + 1] ?? 0,
				baseZ: this.basePositions[i3 + 2] ?? 0,
			};

			this.updateVelocity(ctx, bandEnergy, dt, elapsedTime);
			if (isBeat) this.applyBeatImpulse(ctx);

			this.positions[i3] = (this.positions[i3] ?? 0) + (this.velocities[i3] ?? 0) * dt;
			this.positions[i3 + 1] = (this.positions[i3 + 1] ?? 0) + (this.velocities[i3 + 1] ?? 0) * dt;
			this.positions[i3 + 2] = (this.positions[i3 + 2] ?? 0) + (this.velocities[i3 + 2] ?? 0) * dt;

			this.updateColor(i, i3, energy, elapsedTime, primaryColor, secondaryColor, accentColor);
			this.sizes[i] = lerp(0.3, 2.0, energy) + (isBeat ? 0.5 : 0);
		}

		this.points.geometry.getAttribute("position").needsUpdate = true;
		this.points.geometry.getAttribute("color").needsUpdate = true;
		this.points.geometry.getAttribute("size").needsUpdate = true;
	}
}
