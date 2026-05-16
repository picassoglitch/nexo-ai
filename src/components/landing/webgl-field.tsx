'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function WebGLField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isMobile = window.innerWidth <= 820;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 14;

    const COUNT = 900;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const rand = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const r = 6 + Math.random() * 3;
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
      rand[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));

    const uTime = { value: 0 };
    const uScroll = { value: 0 };
    const uMouse = { value: new THREE.Vector2(0, 0) };
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime, uScroll, uMouse },
      vertexShader: `
        uniform float uTime;
        uniform float uScroll;
        uniform vec2 uMouse;
        attribute float aRand;
        varying float vA;
        varying float vM;
        void main() {
          vec3 p = position;
          float w = sin(uTime * 0.5 + aRand * 12.0) * 0.6;
          p += normalize(p) * w;
          float m = smoothstep(0.0, 1.0, uScroll);
          vec3 g = vec3(
            (aRand - 0.5) * 22.0,
            (fract(aRand * 97.0) - 0.5) * 14.0,
            sin(aRand * 30.0 + uTime * 0.3) * 2.0
          );
          p = mix(p, g, m * 0.85);
          p.x += uMouse.x * 1.5;
          p.y += uMouse.y * 1.5;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (2.2 + aRand * 2.5) * (10.0 / -mv.z);
          vA = 0.35 + aRand * 0.5;
          vM = m;
        }
      `,
      fragmentShader: `
        varying float vA;
        varying float vM;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float gl = smoothstep(0.5, 0.0, d);
          vec3 acid = vec3(0.776, 0.949, 0.306);
          vec3 plasma = vec3(0.357, 0.239, 0.961);
          vec3 col = mix(plasma, acid, vM);
          gl_FragColor = vec4(col, gl * vA * 0.38);
        }
      `,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const coreGeo = new THREE.IcosahedronGeometry(3.4, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x5b3df5,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    let tScroll = 0,
      cScroll = 0,
      tmx = 0,
      tmy = 0,
      cmx = 0,
      cmy = 0;

    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      tScroll = h > 0 ? window.scrollY / h : 0;
    };
    const onMouse = (e: MouseEvent) => {
      tmx = e.clientX / window.innerWidth - 0.5;
      tmy = -(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouse);

    const clock = new THREE.Clock();
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const tm = clock.getElapsedTime();
      cScroll += (tScroll - cScroll) * 0.06;
      cmx += (tmx - cmx) * 0.05;
      cmy += (tmy - cmy) * 0.05;
      uTime.value = tm;
      uScroll.value = cScroll;
      uMouse.value.set(cmx, cmy);
      points.rotation.y = tm * 0.04 + cScroll * (isMobile ? 2.0 : 1.2);
      points.rotation.x = cScroll * (isMobile ? 0.9 : 0.5);
      core.rotation.y = tm * 0.08;
      core.rotation.x = tm * 0.05;
      core.scale.setScalar(1 - cScroll * 0.6);
      coreMat.opacity = 0.12 * (1 - cScroll);
      camera.position.z = 14 + cScroll * (isMobile ? 10 : 6);
      camera.position.x = cmx * 2;
      camera.position.y = cmy * 2;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', onResize);
      geo.dispose();
      mat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} id="webgl" />;
}
