import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { cn } from "../lib/utils";

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : null;
}

class TouchTexture {
  constructor() {
    this.size = 64;
    this.width = this.height = this.size;
    this.maxAge = 64;
    this.radius = 0.25 * this.size;
    this.speed = 1 / this.maxAge;
    this.trail = [];
    this.last = null;
    this.initTexture();
  }

  initTexture() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.texture = new THREE.CanvasTexture(this.canvas);
  }

  update() {
    this.clear();
    let speed = this.speed;
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      let f = point.force * speed * (1 - point.age / this.maxAge);
      point.x += point.vx * f;
      point.y += point.vy * f;
      point.age++;
      if (point.age > this.maxAge) {
        this.trail.splice(i, 1);
      } else {
        this.drawPoint(point);
      }
    }
    this.texture.needsUpdate = true;
  }

  clear() {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  addTouch(point) {
    let force = 0;
    let vx = 0;
    let vy = 0;
    const last = this.last;
    if (last) {
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      if (dx === 0 && dy === 0) return;
      const dd = dx * dx + dy * dy;
      let d = Math.sqrt(dd);
      vx = dx / d;
      vy = dy / d;
      force = Math.min(dd * 20000, 2.0);
    }
    this.last = { x: point.x, y: point.y };
    this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
  }

  drawPoint(point) {
    const pos = {
      x: point.x * this.width,
      y: (1 - point.y) * this.height,
    };

    let intensity = 1;
    if (point.age < this.maxAge * 0.3) {
      intensity = Math.sin((point.age / (this.maxAge * 0.3)) * (Math.PI / 2));
    } else {
      const t = 1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7);
      intensity = -t * (t - 2);
    }
    intensity *= point.force;

    const radius = this.radius;
    let color = `${((point.vx + 1) / 2) * 255}, ${((point.vy + 1) / 2) * 255}, ${intensity * 255}`;
    let offset = this.size * 5;
    this.ctx.shadowOffsetX = offset;
    this.ctx.shadowOffsetY = offset;
    this.ctx.shadowBlur = radius * 1;
    this.ctx.shadowColor = `rgba(${color},${0.2 * intensity})`;

    this.ctx.beginPath();
    this.ctx.fillStyle = "rgba(255,0,0,1)";
    this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
}

class GradientBackground {
  constructor(sceneManager, props) {
    this.sceneManager = sceneManager;
    this.mesh = null;
    this.uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(100, 100) },
      uColor1: { value: new THREE.Vector3(0.945, 0.353, 0.133) },
      uColor2: { value: new THREE.Vector3(0.039, 0.055, 0.153) },
      uColor3: { value: new THREE.Vector3(0.945, 0.353, 0.133) },
      uColor4: { value: new THREE.Vector3(0.039, 0.055, 0.153) },
      uColor5: { value: new THREE.Vector3(0.945, 0.353, 0.133) },
      uColor6: { value: new THREE.Vector3(0.039, 0.055, 0.153) },
      uSpeed: { value: props.speed || 1.2 },
      uIntensity: { value: props.intensity || 1.8 },
      uTouchTexture: { value: null },
      uGrainIntensity: { value: props.grainIntensity || 0.08 },
      uZoom: { value: props.zoom || 1.0 },
      uDarkNavy: { value: new THREE.Vector3(0.039, 0.055, 0.153) },
      uGradientSize: { value: props.gradientSize || 1.0 },
      uGradientCount: { value: props.gradientCount || 6.0 },
      uColor1Weight: { value: props.color1Weight || 1.0 },
      uColor2Weight: { value: props.color2Weight || 1.0 },
    };
  }

  init() {
    const viewSize = this.sceneManager.getViewSize();
    const geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vec3 pos = position.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
          vUv = uv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uColor3;
        uniform vec3 uColor4; uniform vec3 uColor5; uniform vec3 uColor6;
        uniform float uSpeed; uniform float uIntensity; uniform sampler2D uTouchTexture;
        uniform float uGrainIntensity; uniform float uZoom; uniform vec3 uDarkNavy;
        uniform float uGradientSize; uniform float uGradientCount;
        uniform float uColor1Weight; uniform float uColor2Weight;

        varying vec2 vUv;

        float grain(vec2 uv, float time) {
          vec2 grainUv = uv * uResolution * 0.5;
          float grainValue = fract(sin(dot(grainUv + time, vec2(12.9898, 78.233))) * 43758.5453);
          return grainValue * 2.0 - 1.0;
        }

        vec3 getGradientColor(vec2 uv, float time) {
          float gradientRadius = uGradientSize;
          vec2 center1 = vec2(0.5 + sin(time * uSpeed * 0.4) * 0.4, 0.5 + cos(time * uSpeed * 0.5) * 0.4);
          vec2 center2 = vec2(0.5 + cos(time * uSpeed * 0.6) * 0.5, 0.5 + sin(time * uSpeed * 0.45) * 0.5);
          vec2 center3 = vec2(0.5 + sin(time * uSpeed * 0.35) * 0.45, 0.5 + cos(time * uSpeed * 0.55) * 0.45);
          vec2 center4 = vec2(0.5 + cos(time * uSpeed * 0.5) * 0.4, 0.5 + sin(time * uSpeed * 0.4) * 0.4);
          vec2 center5 = vec2(0.5 + sin(time * uSpeed * 0.7) * 0.35, 0.5 + cos(time * uSpeed * 0.6) * 0.35);
          vec2 center6 = vec2(0.5 + cos(time * uSpeed * 0.45) * 0.5, 0.5 + sin(time * uSpeed * 0.65) * 0.5);
          vec2 center7 = vec2(0.5 + sin(time * uSpeed * 0.55) * 0.38, 0.5 + cos(time * uSpeed * 0.48) * 0.42);
          vec2 center8 = vec2(0.5 + cos(time * uSpeed * 0.65) * 0.36, 0.5 + sin(time * uSpeed * 0.52) * 0.44);
          vec2 center9 = vec2(0.5 + sin(time * uSpeed * 0.42) * 0.41, 0.5 + cos(time * uSpeed * 0.58) * 0.39);
          vec2 center10 = vec2(0.5 + cos(time * uSpeed * 0.48) * 0.37, 0.5 + sin(time * uSpeed * 0.62) * 0.43);
          vec2 center11 = vec2(0.5 + sin(time * uSpeed * 0.68) * 0.33, 0.5 + cos(time * uSpeed * 0.44) * 0.46);
          vec2 center12 = vec2(0.5 + cos(time * uSpeed * 0.38) * 0.39, 0.5 + sin(time * uSpeed * 0.56) * 0.41);

          float dist1 = length(uv - center1); float dist2 = length(uv - center2);
          float dist3 = length(uv - center3); float dist4 = length(uv - center4);
          float dist5 = length(uv - center5); float dist6 = length(uv - center6);
          float dist7 = length(uv - center7); float dist8 = length(uv - center8);
          float dist9 = length(uv - center9); float dist10 = length(uv - center10);
          float dist11 = length(uv - center11); float dist12 = length(uv - center12);

          float influence1 = 1.0 - smoothstep(0.0, gradientRadius, dist1);
          float influence2 = 1.0 - smoothstep(0.0, gradientRadius, dist2);
          float influence3 = 1.0 - smoothstep(0.0, gradientRadius, dist3);
          float influence4 = 1.0 - smoothstep(0.0, gradientRadius, dist4);
          float influence5 = 1.0 - smoothstep(0.0, gradientRadius, dist5);
          float influence6 = 1.0 - smoothstep(0.0, gradientRadius, dist6);
          float influence7 = 1.0 - smoothstep(0.0, gradientRadius, dist7);
          float influence8 = 1.0 - smoothstep(0.0, gradientRadius, dist8);
          float influence9 = 1.0 - smoothstep(0.0, gradientRadius, dist9);
          float influence10 = 1.0 - smoothstep(0.0, gradientRadius, dist10);
          float influence11 = 1.0 - smoothstep(0.0, gradientRadius, dist11);
          float influence12 = 1.0 - smoothstep(0.0, gradientRadius, dist12);

          vec3 color = vec3(0.0);
          color += uColor1 * influence1 * (0.55 + 0.45 * sin(time * uSpeed)) * uColor1Weight;
          color += uColor2 * influence2 * (0.55 + 0.45 * cos(time * uSpeed * 1.2)) * uColor2Weight;
          color += uColor3 * influence3 * (0.55 + 0.45 * sin(time * uSpeed * 0.8)) * uColor1Weight;
          color += uColor4 * influence4 * (0.55 + 0.45 * cos(time * uSpeed * 1.3)) * uColor2Weight;
          color += uColor5 * influence5 * (0.55 + 0.45 * sin(time * uSpeed * 1.1)) * uColor1Weight;
          color += uColor6 * influence6 * (0.55 + 0.45 * cos(time * uSpeed * 0.9)) * uColor2Weight;

          if (uGradientCount > 6.0) {
            color += uColor1 * influence7 * (0.55 + 0.45 * sin(time * uSpeed * 1.4)) * uColor1Weight;
            color += uColor2 * influence8 * (0.55 + 0.45 * cos(time * uSpeed * 1.5)) * uColor2Weight;
            color += uColor3 * influence9 * (0.55 + 0.45 * sin(time * uSpeed * 1.6)) * uColor1Weight;
            color += uColor4 * influence10 * (0.55 + 0.45 * cos(time * uSpeed * 1.7)) * uColor2Weight;
          }
          if (uGradientCount > 10.0) {
            color += uColor5 * influence11 * (0.55 + 0.45 * sin(time * uSpeed * 1.8)) * uColor1Weight;
            color += uColor6 * influence12 * (0.55 + 0.45 * cos(time * uSpeed * 1.9)) * uColor2Weight;
          }

          color = clamp(color, vec3(0.0), vec3(1.0)) * uIntensity;
          float luminance = dot(color, vec3(0.299, 0.587, 0.114));
          color = mix(vec3(luminance), color, 1.35);
          color = pow(color, vec3(0.92));

          float brightness = length(color);
          if (brightness > 1.0) color = color * (1.0 / brightness);

          return color;
        }

        void main() {
          vec2 uv = vUv;
          vec4 touchTex = texture2D(uTouchTexture, uv);
          float vx = -(touchTex.r * 2.0 - 1.0);
          float vy = -(touchTex.g * 2.0 - 1.0);
          float intensity = touchTex.b;

          uv.x += vx * 0.8 * intensity;
          uv.y += vy * 0.8 * intensity;

          vec2 center = vec2(0.5);
          float dist = length(uv - center);
          float ripple = sin(dist * 20.0 - uTime * 3.0) * 0.04 * intensity;
          float wave = sin(dist * 15.0 - uTime * 2.0) * 0.03 * intensity;
          uv += vec2(ripple + wave);

          vec3 color = getGradientColor(uv, uTime);
          color += grain(uv, uTime) * uGrainIntensity;

          float timeShift = uTime * 0.5;
          color.r += sin(timeShift) * 0.02;
          color.g += cos(timeShift * 1.4) * 0.02;
          color.b += sin(timeShift * 1.2) * 0.02;

          float brightness = length(color);
          float mixFactor = max(brightness * 1.2, 0.15);
          color = mix(uDarkNavy, color, mixFactor);
          color = clamp(color, vec3(0.0), vec3(1.0));

          brightness = length(color);
          if (brightness > 1.0) color = color * (1.0 / brightness);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.z = 0;
    this.sceneManager.scene.add(this.mesh);
  }

  update(delta) {
    if (this.uniforms.uTime) {
      this.uniforms.uTime.value += delta;
    }
  }

  onResize(width, height) {
    const viewSize = this.sceneManager.getViewSize();
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);
    }
    if (this.uniforms.uResolution) {
      this.uniforms.uResolution.value.set(width, height);
    }
  }
}

const colorSchemes = {
  1: { color1: [0.49, 0.141, 0.278], color2: [0.255, 0.314, 0.302], color3: [1.0, 1.0, 1.0] },
  2: { color1: [1.0, 0.424, 0.314], color2: [0.251, 0.878, 0.816] },
  3: { color1: [0.945, 0.353, 0.133], color2: [0.039, 0.055, 0.153], color3: [0.251, 0.878, 0.816] },
  4: { color1: [0.949, 0.4, 0.2], color2: [0.176, 0.42, 0.427], color3: [0.82, 0.686, 0.612] },
  5: { color1: [0.945, 0.353, 0.133], color2: [0.0, 0.259, 0.22], color3: [0.945, 0.353, 0.133], color4: [0.0, 0.0, 0.0], color5: [0.945, 0.353, 0.133], color6: [0.0, 0.0, 0.0] },
};

function setColorScheme(uniforms, scene, scheme, darkNavyColor) {
  const colors = colorSchemes[scheme] || colorSchemes[1];
  const set = (key, arr) => { if (arr) uniforms[key].value.set(arr[0], arr[1], arr[2]); };
  set('uColor1', colors.color1);
  set('uColor2', colors.color2);
  set('uColor3', colors.color3 || colors.color1);
  set('uColor4', colors.color4 || colors.color2);
  set('uColor5', colors.color5 || colors.color3 || colors.color1);
  set('uColor6', colors.color6 || colors.color4 || colors.color2);

  const bgHex = darkNavyColor || "#0a0e27";
  const val = parseInt(bgHex.replace("#", ""), 16);
  scene.background = new THREE.Color(val);
  const rgb = hexToRgb(bgHex);
  if (rgb) uniforms.uDarkNavy.value.set(rgb.r, rgb.g, rgb.b);

  if (scheme === 1 || scheme >= 5) {
    uniforms.uGradientSize.value = 0.45;
    uniforms.uGradientCount.value = 12.0;
    uniforms.uSpeed.value = 1.5;
    uniforms.uColor1Weight.value = 0.5;
    uniforms.uColor2Weight.value = 1.8;
  } else if (scheme === 4) {
    scene.background = new THREE.Color(0xffffff);
    uniforms.uDarkNavy.value.set(0, 0, 0);
  } else {
    uniforms.uGradientSize.value = 1.0;
    uniforms.uGradientCount.value = 6.0;
    uniforms.uSpeed.value = 1.2;
    uniforms.uColor1Weight.value = 1.0;
    uniforms.uColor2Weight.value = 1.0;
  }
}

function createWebGLApp(container, props) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  if (container.children.length > 0) container.innerHTML = "";
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 10000);
  camera.position.z = 50;

  const scene = new THREE.Scene();
  const bgHex = props.darkNavyColor ? parseInt(props.darkNavyColor.replace("#", ""), 16) : 0x0a0e27;
  scene.background = new THREE.Color(bgHex);

  const clock = new THREE.Clock();
  const touchTexture = new TouchTexture();
  const gradient = new GradientBackground({ scene, getViewSize() {
    const fovInRadians = (camera.fov * Math.PI) / 180;
    const height = Math.abs(camera.position.z * Math.tan(fovInRadians / 2) * 2);
    return { width: height * camera.aspect, height };
  }}, props);
  gradient.uniforms.uTouchTexture.value = touchTexture.texture;

  gradient.init();
  setColorScheme(gradient.uniforms, scene, props.scheme || 1, props.darkNavyColor);

  let animationId;

  function tick() {
    const delta = Math.min(clock.getDelta(), 0.1);
    touchTexture.update();
    gradient.update(delta);
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(tick);
  }
  tick();

  return {
    renderer,
    camera,
    scene,
    gradient,
    touchTexture,
    dispose() {
      cancelAnimationFrame(animationId);
      renderer.dispose();
    },
    onResize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      gradient.onResize(w, h);
    },
    handleTouch(x, y, w, h) {
      touchTexture.addTouch({ x: x / w, y: 1 - y / h });
    },
    setScheme(scheme) {
      setColorScheme(gradient.uniforms, scene, scheme, props.darkNavyColor);
    },
  };
}

export default function LiquidSurface({
  className,
  style,
  colors,
  speed,
  intensity,
  grainIntensity,
  zoom,
  gradientSize,
  gradientCount,
  color1Weight,
  color2Weight,
  darkNavyColor,
  scheme,
  heading,
  showCursor = true,
}) {
  const containerRef = useRef(null);
  const cursorRef = useRef(null);
  const appRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const app = createWebGLApp(containerRef.current, {
      speed, intensity, grainIntensity, zoom,
      gradientSize, gradientCount, color1Weight, color2Weight,
      darkNavyColor, scheme, colors,
    });
    appRef.current = app;

    const onResize = () => {
      if (containerRef.current) app.onResize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    const onMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        app.handleTouch(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
      }
      if (showCursor && cursorRef.current) {
        gsap.to(cursorRef.current, { x: e.clientX, y: e.clientY, duration: 0.1, ease: "power2.out" });
      }
    };
    const onTouchMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        app.handleTouch(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, rect.width, rect.height);
      }
    };

    const containerNode = containerRef.current.parentElement;
    if (containerNode) {
      containerNode.addEventListener("mousemove", onMouseMove);
      containerNode.addEventListener("touchmove", onTouchMove, { passive: false });
    }
    window.addEventListener("resize", onResize);

    const timeoutId = setTimeout(onResize, 50);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", onResize);
      if (containerNode) {
        containerNode.removeEventListener("mousemove", onMouseMove);
        containerNode.removeEventListener("touchmove", onTouchMove);
      }
      app.dispose();
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    if (appRef.current && scheme !== undefined) appRef.current.setScheme(scheme);
  }, [scheme]);

  const handleMouseEnter = () => {
    if (showCursor) gsap.to(cursorRef.current, { width: 50, height: 50, borderWidth: 3, duration: 0.2 });
  };
  const handleMouseLeave = () => {
    if (showCursor) gsap.to(cursorRef.current, { width: 40, height: 40, borderWidth: 2, duration: 0.2 });
  };

  return (
    <div
      className={cn("relative w-full h-full overflow-hidden bg-black", className)}
      style={{ ...style, cursor: showCursor ? "none" : "auto" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showCursor && (
        <div
          ref={cursorRef}
          className="fixed top-0 left-0 w-10 h-10 border-2 border-white rounded-full pointer-events-none z-[1000] mix-blend-difference -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
        >
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
      )}
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {heading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10 w-full h-full text-white text-center">
          <h1
            className="font-bold tracking-tight px-4"
            style={{ fontSize: "clamp(3.5rem, 9vw, 9rem)" }}
            dangerouslySetInnerHTML={{ __html: heading }}
          />
        </div>
      )}
    </div>
  );
}
