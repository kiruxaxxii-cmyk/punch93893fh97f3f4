import { useEffect, useRef, useState } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

const DEFAULT_COLOR = "#ffffff";

const hexToRgb = (hex) => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (match) {
    return [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255];
  }
  return [1, 1, 1];
};

const originPreset = (origin, width, height) => {
  const margin = 0.2;
  const topOffset = -290;
  switch (origin) {
    case "top-left":
      return { anchor: [0, topOffset], dir: [0, 1] };
    case "top-right":
      return { anchor: [width, topOffset], dir: [0, 1] };
    case "left":
      return { anchor: [-margin * width, height * 0.5], dir: [1, 0] };
    case "right":
      return { anchor: [(1 + margin) * width, height * 0.5], dir: [-1, 0] };
    case "bottom-left":
      return { anchor: [0, (1 + margin) * height], dir: [0, -1] };
    case "bottom-center":
      return { anchor: [width * 0.5, (1 + margin) * height], dir: [0, -1] };
    case "bottom-right":
      return { anchor: [width, (1 + margin) * height], dir: [0, -1] };
    default:
      return { anchor: [width * 0.5, topOffset], dir: [0, 1] };
  }
};

const vertex = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragment = `precision highp float;

uniform float iTime;
uniform vec2  iResolution;

uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2  mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);

  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;

  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);

  float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0, 1.0
  );

  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);

  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }

  vec4 rays1 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349,
                           1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234,
                           1.1 * raysSpeed);

  fragColor = rays1 * 0.5 + rays2 * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }

  float brightness = 1.0 - (coord.y / iResolution.y);
  fragColor.x *= 0.1 + brightness * 0.8;
  fragColor.y *= 0.3 + brightness * 0.6;
  fragColor.z *= 0.5 + brightness * 0.5;

  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }

  fragColor.rgb *= raysColor;
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor  = color;
}`;

export default function LightRays({
  raysOrigin = "top-center",
  raysColor = DEFAULT_COLOR,
  raysSpeed = 1,
  lightSpread = 1,
  rayLength = 2,
  pulsating = false,
  fadeDistance = 1,
  saturation = 1,
  followMouse = true,
  mouseInfluence = 0.1,
  noiseAmount = 0,
  distortion = 0,
  className = ""
}) {
  const containerRef = useRef(null);
  const uniformsRef = useRef(null);
  const rendererRef = useRef(null);
  const mouseTarget = useRef({ x: 0.5, y: 0.5 });
  const mouseSmoothed = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef(null);
  const meshRef = useRef(null);
  const cleanupRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observerRef.current.observe(containerRef.current);
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible || !containerRef.current) return undefined;
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    (async () => {
      if (!containerRef.current) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (!containerRef.current) return;

      const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), alpha: true });
      rendererRef.current = renderer;
      const gl = renderer.gl;
      gl.canvas.style.width = "100%";
      gl.canvas.style.height = "100%";
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(gl.canvas);

      const uniforms = {
        iTime: { value: 0 },
        iResolution: { value: [1, 1] },
        rayPos: { value: [0, 0] },
        rayDir: { value: [0, 1] },
        raysColor: { value: hexToRgb(raysColor) },
        raysSpeed: { value: raysSpeed },
        lightSpread: { value: lightSpread },
        rayLength: { value: rayLength },
        pulsating: { value: +!!pulsating },
        fadeDistance: { value: fadeDistance },
        saturation: { value: saturation },
        mousePos: { value: [0.5, 0.5] },
        mouseInfluence: { value: mouseInfluence },
        noiseAmount: { value: noiseAmount },
        distortion: { value: distortion }
      };
      uniformsRef.current = uniforms;

      const program = new Program(gl, { vertex, fragment, uniforms });
      const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
      meshRef.current = mesh;

      const resize = () => {
        if (!containerRef.current || !renderer) return;
        renderer.dpr = Math.min(window.devicePixelRatio, 2);
        const { clientWidth: w, clientHeight: h } = containerRef.current;
        renderer.setSize(w, h);
        const dpr = renderer.dpr;
        const W = w * dpr;
        const H = h * dpr;
        uniforms.iResolution.value = [W, H];
        const { anchor, dir } = originPreset(raysOrigin, W, H);
        uniforms.rayPos.value = anchor;
        uniforms.rayDir.value = dir;
      };

      const loop = (time) => {
        if (!rendererRef.current || !uniformsRef.current || !meshRef.current) return;
        uniforms.iTime.value = time * 0.001;
        if (followMouse && mouseInfluence > 0) {
          const ease = 0.92;
          mouseSmoothed.current.x = mouseSmoothed.current.x * ease + mouseTarget.current.x * (1 - ease);
          mouseSmoothed.current.y = mouseSmoothed.current.y * ease + mouseTarget.current.y * (1 - ease);
          uniforms.mousePos.value = [mouseSmoothed.current.x, mouseSmoothed.current.y];
        }
        try {
          renderer.render({ scene: mesh });
          rafRef.current = requestAnimationFrame(loop);
        } catch (err) {
          console.warn("WebGL rendering error:", err);
        }
      };

      window.addEventListener("resize", resize);
      resize();
      rafRef.current = requestAnimationFrame(loop);

      cleanupRef.current = () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        window.removeEventListener("resize", resize);
        if (renderer) {
          try {
            const canvas = renderer.gl.canvas;
            const ext = renderer.gl.getExtension("WEBGL_lose_context");
            if (ext) ext.loseContext();
            if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
          } catch (err) {
            console.warn("Error during WebGL cleanup:", err);
          }
        }
        rendererRef.current = null;
        uniformsRef.current = null;
        meshRef.current = null;
      };
    })();

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [isVisible, raysOrigin, raysColor, raysSpeed, lightSpread, rayLength, pulsating, fadeDistance, saturation, followMouse, mouseInfluence, noiseAmount, distortion]);

  useEffect(() => {
    if (!uniformsRef.current || !containerRef.current || !rendererRef.current) return;
    const uniforms = uniformsRef.current;
    const renderer = rendererRef.current;
    uniforms.raysColor.value = hexToRgb(raysColor);
    uniforms.raysSpeed.value = raysSpeed;
    uniforms.lightSpread.value = lightSpread;
    uniforms.rayLength.value = rayLength;
    uniforms.pulsating.value = +!!pulsating;
    uniforms.fadeDistance.value = fadeDistance;
    uniforms.saturation.value = saturation;
    uniforms.mouseInfluence.value = mouseInfluence;
    uniforms.noiseAmount.value = noiseAmount;
    uniforms.distortion.value = distortion;
    const { clientWidth: w, clientHeight: h } = containerRef.current;
    const dpr = renderer.dpr;
    const { anchor, dir } = originPreset(raysOrigin, w * dpr, h * dpr);
    uniforms.rayPos.value = anchor;
    uniforms.rayDir.value = dir;
  }, [raysColor, raysSpeed, lightSpread, raysOrigin, rayLength, pulsating, fadeDistance, saturation, mouseInfluence, noiseAmount, distortion]);

  useEffect(() => {
    const onMove = (event) => {
      if (!containerRef.current || !rendererRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseTarget.current = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height
      };
    };
    if (followMouse) {
      window.addEventListener("mousemove", onMove);
      return () => window.removeEventListener("mousemove", onMove);
    }
  }, [followMouse]);

  return <div ref={containerRef} className={("light-rays-container " + className).trim()} />;
}
