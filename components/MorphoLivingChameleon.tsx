'use client';

// ============================================================================
// Morpho godarty didius tingomarensis — activo vivo camaleónico.
// WebGL2 directo (sin depender del resize/frameloop de R3F): silueta SDF,
// escamas voronoi regenerativas, iridiscencia por ratón/scroll, ciclo 15s.
// Alfa limpio sobre fondo oscuro.
// ============================================================================
import { useEffect, useRef } from 'react';

const CYCLE_MS = 15_000;

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform float uTime;
uniform float uCycle;
uniform vec2 uMouse;
uniform float uScroll;
uniform vec2 uRes;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.07;
    a *= 0.5;
  }
  return v;
}

vec2 voronoi(vec2 x) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  float md = 8.0;
  vec2 mr = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = vec2(hash21(n + g), hash21(n + g + 17.1));
      o = 0.5 + 0.5 * sin(uTime * 0.45 + 6.2831 * o);
      vec2 r = g + o - f;
      float dd = dot(r, r);
      if (dd < md) { md = dd; mr = n + g; }
    }
  }
  return vec2(sqrt(md), hash21(mr));
}

float sdEllipse(vec2 p, vec2 r) {
  return (length(p / r) - 1.0) * min(r.x, r.y);
}

float morphoMask(vec2 uv) {
  // Micro-respiración UV
  vec2 b = uv + 0.004 * vec2(
    sin(uTime * 1.7 + uv.y * 12.0),
    cos(uTime * 1.3 + uv.x * 10.0)
  );
  vec2 p = (b - 0.5) * vec2(2.05, 2.25);
  float flap = sin(uTime * 2.1) * 0.02;
  p.x *= 1.0 + flap * sign(p.x) * 0.15;
  float body = sdEllipse(p - vec2(0.0, -0.02), vec2(0.07, 0.42));
  float wingTL = sdEllipse(p - vec2(-0.50, 0.18), vec2(0.64, 0.56));
  float wingTR = sdEllipse(p - vec2(0.50, 0.18), vec2(0.64, 0.56));
  float wingBL = sdEllipse(p - vec2(-0.38, -0.42), vec2(0.48, 0.42));
  float wingBR = sdEllipse(p - vec2(0.38, -0.42), vec2(0.48, 0.42));
  return min(body, min(min(wingTL, wingTR), min(wingBL, wingBR)));
}

void main() {
  float d = morphoMask(vUv);
  float alpha = 1.0 - smoothstep(-0.03, 0.012, d);
  if (alpha < 0.01) {
    outColor = vec4(0.0);
    return;
  }

  vec2 cell = voronoi(vUv * 42.0);
  float rim = smoothstep(0.24, 0.03, cell.x);
  float scaleBody = smoothstep(0.42, 0.05, cell.x);
  float grain = fbm(vUv * 70.0 + uTime * 0.12);

  float regenPhase = fract(cell.y * 0.97 + uCycle * 1.25 + uTime * 0.02);
  float regen = smoothstep(0.0, 0.2, regenPhase) * smoothstep(1.0, 0.48, regenPhase);
  regen *= 0.45 + 0.55 * sin(uCycle * 6.2831 + cell.y * 6.2831);

  // Iridiscencia: ángulo falso + ratón + scroll + ciclo 15s
  vec3 N = normalize(vec3((vUv.x - 0.5) * 2.6 + uMouse.x * 0.55, (vUv.y - 0.5) * 1.8 + uMouse.y * 0.55, 0.75));
  float fresnel = pow(clamp(1.0 - max(N.z, 0.0), 0.0, 1.0), 1.5);
  float viewShift = fresnel * 0.55 + uMouse.x * 0.34 + uMouse.y * 0.24 + uScroll * 0.42;
  float hueCycle = fract(uCycle + viewShift * 0.38);

  vec3 deepBlue = vec3(0.12, 0.34, 1.0);
  vec3 teal = vec3(0.0, 0.83, 0.91);
  vec3 emerald = vec3(0.08, 0.88, 0.63);
  vec3 purple = vec3(0.71, 0.30, 1.0);
  vec3 bright = vec3(0.54, 0.83, 1.0);

  vec3 iri = deepBlue;
  iri = mix(iri, teal, smoothstep(0.0, 0.3, hueCycle));
  iri = mix(iri, emerald, smoothstep(0.22, 0.55, hueCycle));
  iri = mix(iri, purple, smoothstep(0.48, 0.8, hueCycle));
  iri = mix(iri, bright, smoothstep(0.75, 1.0, hueCycle));
  iri = mix(iri, emerald, fresnel * 0.5);
  iri = mix(iri, purple, pow(fresnel, 2.4) * 0.55);

  iri *= 0.9 + 0.5 * scaleBody;
  iri += bright * rim * 0.5;
  iri += vec3(0.35, 0.85, 1.0) * regen * rim * 0.9;
  iri += vec3(grain * 0.12);
  iri += bright * pow(fresnel, 2.8) * 0.45;

  float border = smoothstep(0.03, 0.0, d) * (1.0 - smoothstep(0.0, -0.055, d));
  vec3 col = mix(iri, vec3(0.02, 0.03, 0.04), border * 0.9);

  float bodyZone = 1.0 - smoothstep(0.015, 0.1, length((vUv - vec2(0.5, 0.48)) * vec2(9.0, 2.5)));
  col = mix(col, vec3(0.22, 0.12, 0.05), bodyZone * 0.7);

  // Rotación camaleónica sutil del brillo en el ciclo 15s
  col *= 1.15 + 0.25 * sin(uCycle * 6.2831);

  alpha *= smoothstep(0.0, 0.06, alpha);
  outColor = vec4(col, alpha);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('shader alloc');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) || 'compile fail';
    gl.deleteShader(sh);
    throw new Error(log);
  }
  return sh;
}

export interface MorphoLivingChameleonProps {
  className?: string;
  cycleMs?: number;
  label?: string;
}

export default function MorphoLivingChameleon({
  className = '',
  cycleMs = CYCLE_MS,
  label = 'Morpho godarty didius tingomarensis — activo vivo camaleónico',
}: MorphoLivingChameleonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const scrollRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) return;

    let program: WebGLProgram | null = null;
    let raf = 0;
    let disposed = false;

    try {
      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      program = gl.createProgram();
      if (!program) throw new Error('program');
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'link fail');
      }
      gl.deleteShader(vs);
      gl.deleteShader(fs);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

      const aPos = gl.getAttribLocation(program, 'aPos');
      const uTime = gl.getUniformLocation(program, 'uTime');
      const uCycle = gl.getUniformLocation(program, 'uCycle');
      const uMouse = gl.getUniformLocation(program, 'uMouse');
      const uScroll = gl.getUniformLocation(program, 'uScroll');
      const uRes = gl.getUniformLocation(program, 'uRes');

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);

      const resize = () => {
        const parent = canvas.parentElement;
        const w = Math.max(1, parent?.clientWidth || canvas.clientWidth || 1);
        const h = Math.max(1, parent?.clientHeight || canvas.clientHeight || 1);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        gl.viewport(0, 0, canvas.width, canvas.height);
      };

      resize();
      const ro = new ResizeObserver(resize);
      if (canvas.parentElement) ro.observe(canvas.parentElement);

      const onMove = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current.x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
        mouseRef.current.y = -(((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
      };
      const onScroll = () => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        scrollRef.current = window.scrollY / max;
      };
      canvas.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      const t0 = performance.now();
      const draw = (now: number) => {
        if (disposed || !program) return;
        const t = (now - t0) / 1000;
        const cycle = ((now - t0) % cycleMs) / cycleMs;

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1f(uTime, t);
        gl.uniform1f(uCycle, cycle);
        gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
        gl.uniform1f(uScroll, scrollRef.current);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);

      return () => {
        disposed = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        canvas.removeEventListener('pointermove', onMove);
        window.removeEventListener('scroll', onScroll);
        if (program) gl.deleteProgram(program);
      };
    } catch (err) {
      console.error('[MorphoLivingChameleon]', err);
      return;
    }
  }, [cycleMs]);

  return (
    <div
      className={`relative h-full w-full min-h-[280px] bg-transparent ${className}`}
      role="img"
      aria-label={label}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full bg-transparent"
        style={{ background: 'transparent' }}
      />
    </div>
  );
}
