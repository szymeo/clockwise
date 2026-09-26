import { CLOCK_FACE_SIZE, CLOCK_HAND_HEIGHT, CLOCK_PITCH } from '../domain/consts.ts';
import { Has, MAX_ENTITIES } from './components.ts';
import type { Game } from './game.ts';

const QUERY = Has.Cell | Has.Hands;
const RADIUS = CLOCK_FACE_SIZE / 2;

const rgb = (hex: number) => [hex >> 16, (hex >> 8) & 255, hex & 255].map((c) => c / 255);
/**
 * Faces are transparent, `background` must match the page background in app.css.
 * `lightness` is the OKLCH lightness of colored hands.
 */
const THEMES = {
	light: { background: rgb(0xffffff), border: rgb(0xe5e5e5), hand: rgb(0x000000), lightness: 0.62 },
	dark: { background: rgb(0x0a0a0a), border: rgb(0x262626), hand: rgb(0xf5f5f5), lightness: 0.78 }
};
const FLOATS_PER_CLOCK = 7;
/** Radians per second the colored hue drifts. */
const HUE_DRIFT = 0.3;

// One instanced quad per clock. Border and hands are distance fields, crisp at any pixel ratio.
const VERTEX = `#version 300 es
uniform vec2 u_viewport;
uniform vec3 u_background;
uniform vec3 u_hand;
uniform float u_colors;
uniform float u_lightness;
uniform float u_hue;
layout(location = 0) in vec4 a_clock; // center x, center y (CSS px), hand angles (deg)
layout(location = 1) in vec3 a_motion; // hand speeds (deg/s), clock size
out vec2 v_local;
flat out vec2 v_angles;
flat out vec3 v_color1;
flat out vec3 v_color2;

const float LIGHT = ${(-Math.PI / 4).toFixed(8)}; // top right

// OKLCH to sRGB, so every hue reads equally bright.
vec3 oklch(float l, float c, float h) {
	vec3 lms = l + c * (cos(h) * vec3(0.3963377774, -0.1055613458, -0.0894841775)
		+ sin(h) * vec3(0.2158037573, -0.0638541728, -1.2914855480));
	vec3 linear = clamp(mat3(
		4.0767416621, -1.2684380046, -0.0041960863,
		-3.3077115913, 2.6097574011, -0.7034186147,
		0.2309699292, -0.3413193965, 1.7076147010
	) * (lms * lms * lms), 0.0, 1.0);
	return mix(12.92 * linear, 1.055 * pow(linear, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, linear));
}

// Grayscale: full contrast at rest. As a hand speeds up it takes its own gray, bright facing the light, dim facing away.
// Colors: hue from the hand angle plus a slow drift, more saturated the faster it turns.
vec3 tint(float angle, float speed) {
	float energy = 1.0 - exp(-abs(speed) / 60.0);
	float lit = 0.2 + 0.8 * (0.5 + 0.5 * cos(angle - LIGHT));
	vec3 gray = mix(u_background, u_hand, mix(1.0, lit, energy));
	if (u_colors == 0.0) return gray;
	return mix(gray, oklch(u_lightness, 0.13 + 0.06 * energy, angle + u_hue), u_colors);
}

void main() {
	v_local = (vec2(gl_VertexID & 1, gl_VertexID >> 1) * 2.0 - 1.0) * ${(RADIUS + 1).toFixed(1)};
	v_angles = radians(a_clock.zw);
	// Second hand shade is turned half a circle, so both halves of a straight line share a gray.
	v_color1 = tint(v_angles.x, a_motion.x);
	v_color2 = tint(v_angles.y + ${Math.PI.toFixed(8)}, a_motion.y);
	gl_Position = vec4((a_clock.xy + v_local * a_motion.z) / u_viewport * vec2(2, -2) + vec2(-1, 1), 0, 1);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec3 u_border;
in vec2 v_local;
flat in vec2 v_angles;
flat in vec3 v_color1;
flat in vec3 v_color2;
out vec4 color;

const float RADIUS = ${RADIUS.toFixed(1)};
const float BORDER = 1.0;
const float HAND_RADIUS = ${(CLOCK_HAND_HEIGHT / 2).toFixed(1)};
const float HAND_LENGTH = RADIUS - 2.0 - HAND_RADIUS;

float coverage(float distance, float aa) {
	return clamp(0.5 - distance / aa, 0.0, 1.0);
}

float hand(vec2 p, float angle, float aa) {
	vec2 dir = vec2(cos(angle), sin(angle));
	return coverage(length(p - dir * clamp(dot(p, dir), 0.0, HAND_LENGTH)) - HAND_RADIUS, aa);
}

void main() {
	float aa = fwidth(v_local.x);
	float r = length(v_local);
	float ring = coverage(r - RADIUS, aa) - coverage(r - RADIUS + BORDER, aa);
	// Premultiplied: ring, second hand over it, first hand on top.
	color = mix(vec4(u_border, 1.0) * ring, vec4(v_color2, 1.0), hand(v_local, v_angles.y, aa));
	color = mix(color, vec4(v_color1, 1.0), hand(v_local, v_angles.x, aa));
}`;

export type Renderer = ReturnType<typeof createRenderer>;

export function createRenderer(canvas: HTMLCanvasElement) {
	const gl = canvas.getContext('webgl2', { antialias: false });
	if (!gl) throw new Error('WebGL2 is not supported.');

	const program = gl.createProgram();
	for (const [type, source] of [
		[gl.VERTEX_SHADER, VERTEX],
		[gl.FRAGMENT_SHADER, FRAGMENT]
	] as const) {
		const shader = gl.createShader(type)!;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
			throw new Error(gl.getShaderInfoLog(shader)!);
		gl.attachShader(program, shader);
	}
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS))
		throw new Error(gl.getProgramInfoLog(program)!);

	gl.useProgram(program);
	gl.bindVertexArray(gl.createVertexArray());
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	const stride = FLOATS_PER_CLOCK * 4;
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 4, gl.FLOAT, false, stride, 0);
	gl.vertexAttribDivisor(0, 1);
	gl.enableVertexAttribArray(1);
	gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 16);
	gl.vertexAttribDivisor(1, 1);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

	return {
		gl,
		canvas,
		viewport: gl.getUniformLocation(program, 'u_viewport'),
		border: gl.getUniformLocation(program, 'u_border'),
		hand: gl.getUniformLocation(program, 'u_hand'),
		background: gl.getUniformLocation(program, 'u_background'),
		colors: gl.getUniformLocation(program, 'u_colors'),
		lightness: gl.getUniformLocation(program, 'u_lightness'),
		hue: gl.getUniformLocation(program, 'u_hue'),
		instances: new Float32Array(MAX_ENTITIES * FLOATS_PER_CLOCK)
	};
}

/** Redraws every visible clock in one draw call, only when something changed or colors drift. */
export function sys_draw(game: Game) {
	const renderer = game.renderer;
	const drifting = game.colors > 0 && !game.reducedMotion;
	if (!renderer || !(game.dirty || drifting)) return;
	game.dirty = false;

	const { gl, canvas, instances } = renderer;
	if (canvas.width !== game.pixelWidth || canvas.height !== game.pixelHeight) {
		canvas.width = game.pixelWidth;
		canvas.height = game.pixelHeight;
	}
	gl.viewport(0, 0, game.pixelWidth, game.pixelHeight);
	gl.uniform2f(renderer.viewport, game.width, game.height);
	const theme = game.dark ? THEMES.dark : THEMES.light;
	gl.uniform3fv(renderer.border, theme.border);
	gl.uniform3fv(renderer.hand, theme.hand);
	gl.uniform3fv(renderer.background, theme.background);
	gl.uniform1f(renderer.colors, game.colors);
	gl.uniform1f(renderer.lightness, theme.lightness);
	gl.uniform1f(renderer.hue, drifting ? game.seconds * HUE_DRIFT : 0);

	let n = 0;
	for (let e = 0; e < game.size; e++) {
		if ((game.mask[e] & (QUERY | Has.Reveal)) !== QUERY) continue;

		instances[n++] = game.originX + game.cell.col[e] * CLOCK_PITCH + RADIUS;
		instances[n++] = game.originY + game.cell.row[e] * CLOCK_PITCH + RADIUS;
		instances[n++] = game.hands.angle1[e];
		instances[n++] = game.hands.angle2[e];
		instances[n++] = game.hands.velocity1[e];
		instances[n++] = game.hands.velocity2[e];
		instances[n++] = game.scale.value[e];
	}

	gl.bufferData(gl.ARRAY_BUFFER, instances.subarray(0, n), gl.DYNAMIC_DRAW);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n / FLOATS_PER_CLOCK);
}
