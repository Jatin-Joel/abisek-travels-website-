/**
 * journey.js  —  Abisek Travels · 3D Scroll-Driven Road Journey
 * Three.js r165 (ES module via importmap) + GSAP ScrollTrigger (global)
 *
 * Architecture:
 *   - CatmullRomCurve3 spline: Pathankot → Himachal → Kashmir → Ladakh
 *   - Single large terrain PlaneGeometry with zone-blending vertex shader
 *   - Instanced vegetation per zone (grass, pines, boulders)
 *   - Custom sky hemisphere shader
 *   - EffectComposer + UnrealBloomPass
 *   - GSAP ScrollTrigger binds scroll → scrollT (0‒1)
 *   - Camera lerped toward spline point each rAF frame
 *   - Mouse → subtle camera parallax + road marker lean
 *   - prefers-reduced-motion → snap mode (no continuous flight)
 */

import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';

/* ═══════════════════════════════════════════════════════════════════════════
   0.  CONSTANTS & ZONE DATA
═══════════════════════════════════════════════════════════════════════════ */

const SCROLL_HEIGHT_VH = 500; // must match --journey-height in journey.css

const ZONES = [
  {
    tCenter:     0.10,
    tStart:      0.00,
    tEnd:        0.22,
    name:        'Punjab Plains',
    desc:        'Local & airport runs from Pathankot',
    sunColor:    new THREE.Color(0xFFB347),
    zenithColor: new THREE.Color(0x7EC8E3),
    horizColor:  new THREE.Color(0xFFE0A0),
    fogColor:    new THREE.Color(0xFFD580),
    fogDensity:  0.0018,
    ambientCol:  new THREE.Color(0xFFF0C0),
    ambientInt:  0.85,
    sunInt:      2.2,
    fov:         56,
  },
  {
    tCenter:     0.33,
    tStart:      0.18,
    tEnd:        0.47,
    name:        'Himachal Pradesh',
    desc:        'Scenic hill routes — Dharamshala & Shimla',
    sunColor:    new THREE.Color(0xFFF0E0),
    zenithColor: new THREE.Color(0x3A78C9),
    horizColor:  new THREE.Color(0xB0D0F0),
    fogColor:    new THREE.Color(0xC0D5E8),
    fogDensity:  0.005,
    ambientCol:  new THREE.Color(0xD0E4FF),
    ambientInt:  0.65,
    sunInt:      1.9,
    fov:         52,
  },
  {
    tCenter:     0.58,
    tStart:      0.43,
    tEnd:        0.72,
    name:        'Kashmir',
    desc:        'Multi-day valley & alpine tours',
    sunColor:    new THREE.Color(0xE8EFFF),
    zenithColor: new THREE.Color(0x1E5090),
    horizColor:  new THREE.Color(0x8AADCC),
    fogColor:    new THREE.Color(0xA8C0D8),
    fogDensity:  0.007,
    ambientCol:  new THREE.Color(0xBBCCF0),
    ambientInt:  0.55,
    sunInt:      1.7,
    fov:         50,
  },
  {
    tCenter:     0.85,
    tStart:      0.68,
    tEnd:        1.00,
    name:        'Ladakh',
    desc:        'Extended expeditions — Leh, Nubra & Pangong',
    sunColor:    new THREE.Color(0xFFD888),
    zenithColor: new THREE.Color(0x0E2A55),
    horizColor:  new THREE.Color(0x6080A0),
    fogColor:    new THREE.Color(0x707890),
    fogDensity:  0.003,
    ambientCol:  new THREE.Color(0x8898B8),
    ambientInt:  0.45,
    sunInt:      2.4,
    fov:         46,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   1.  DEVICE / WEBGL DETECTION
═══════════════════════════════════════════════════════════════════════════ */

const canvas = document.getElementById('journeyCanvas');
if (!canvas) throw new Error('journey: #journeyCanvas not found');

function isLowPower() {
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return true;
  if (window.devicePixelRatio < 1) return true;
  // Safari on A-series chips reports hardwareConcurrency = 0 – let it through
  return false;
}

function showFallback() {
  window.dispatchEvent(new CustomEvent('journey:fallback'));
}

// Try to get a WebGL context
let testCtx;
try {
  testCtx = canvas.getContext('webgl2') || canvas.getContext('webgl');
} catch (_) { testCtx = null; }

if (!testCtx) { showFallback(); throw new Error('journey: WebGL unavailable'); }

// On low-power, also fall back
if (isLowPower()) { showFallback(); throw new Error('journey: low-power device'); }

// Signal that we are running (used by journey-fallback.js timeout guard)
canvas._journeyRunning = true;
window.dispatchEvent(new CustomEvent('journey:running'));

/* ═══════════════════════════════════════════════════════════════════════════
   2.  RENDERER, SCENE, CAMERA
═══════════════════════════════════════════════════════════════════════════ */

const isMobile  = window.innerWidth < 768;
const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1.0 : 1.5);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias:        !isMobile,
  powerPreference: 'high-performance',
  alpha:            false,
  stencil:          false,
  depth:            true,
});
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping      = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.5, 2000);

// Fog – will be updated per zone
scene.fog = new THREE.FogExp2(0xFFD580, 0.0018);

/* ═══════════════════════════════════════════════════════════════════════════
   3.  POST-PROCESSING
═══════════════════════════════════════════════════════════════════════════ */

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.32,   // strength  – restrained, not neon
  0.42,   // radius
  0.88    // threshold – only very bright highlights bloom
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ═══════════════════════════════════════════════════════════════════════════
   4.  LIGHTING
═══════════════════════════════════════════════════════════════════════════ */

const ambientLight = new THREE.AmbientLight(0xFFF0C0, 0.85);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xFFB347, 2.2);
sunLight.position.set(120, 200, -80);
sunLight.castShadow = false;
scene.add(sunLight);

/* ═══════════════════════════════════════════════════════════════════════════
   5.  ROUTE SPLINE
   World: Y is up. Camera travels from Z=0 (Punjab) toward Z=-600 (Ladakh).
   X provides lateral variance (the winding road feel).
═══════════════════════════════════════════════════════════════════════════ */

const CURVE_POINTS = [
  // Punjab plains (t ≈ 0–0.22) — flat, Y=12–18
  new THREE.Vector3(  0,  13,    0),
  new THREE.Vector3( 18,  13,  -55),
  new THREE.Vector3( -8,  14,  -105),
  new THREE.Vector3( 12,  15,  -155),
  // Himachal foothills (t ≈ 0.22–0.47) — rising, Y=20–55
  new THREE.Vector3( -15,  22,  -205),
  new THREE.Vector3(  20,  32,  -250),
  new THREE.Vector3(  -5,  42,  -295),
  new THREE.Vector3(  15,  52,  -340),
  new THREE.Vector3( -12,  56,  -380),
  // Kashmir (t ≈ 0.47–0.72) — valley bowl then alpine, Y=45–72
  new THREE.Vector3(  18,  50,  -415),
  new THREE.Vector3( -10,  45,  -450),
  new THREE.Vector3(   8,  48,  -485),
  new THREE.Vector3( -16,  60,  -520),
  new THREE.Vector3(  12,  68,  -555),
  // Ladakh plateau (t ≈ 0.72–1.0) — barren high, Y=72–96
  new THREE.Vector3( -10,  75,  -590),
  new THREE.Vector3(  16,  82,  -625),
  new THREE.Vector3(  -8,  88,  -660),
  new THREE.Vector3(   6,  92,  -700),
  new THREE.Vector3(   0,  95,  -740),
];

const curve = new THREE.CatmullRomCurve3(CURVE_POINTS, false, 'catmullrom', 0.5);

/* ═══════════════════════════════════════════════════════════════════════════
   6.  TERRAIN (single large mesh, zone-blending vertex shader)
═══════════════════════════════════════════════════════════════════════════ */

const TERRAIN_SEGS = isMobile ? 80 : 160;

const terrainGeo = new THREE.PlaneGeometry(900, 850, TERRAIN_SEGS, TERRAIN_SEGS);
terrainGeo.rotateX(-Math.PI / 2);
// Center the plane at Z=-370 (mid-route)
terrainGeo.translate(0, 0, -370);

const TERRAIN_VERT = /* glsl */`
  uniform float uTime;
  varying vec3 vWorldPos;
  varying float vElevation;
  varying float vZone; // 0=punjab,1=himachal,2=kashmir,3=ladakh

  // --- value noise helpers ---
  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(
      mix(hash2(i),           hash2(i+vec2(1,0)), u.x),
      mix(hash2(i+vec2(0,1)), hash2(i+vec2(1,1)), u.x),
      u.y
    );
  }
  float fbm(vec2 p, int oct) {
    float v=0.0, a=0.5, f=1.0;
    for(int i=0;i<8;i++){
      if(i>=oct) break;
      v += a*noise2(p*f);
      a *= 0.48; f *= 2.1;
    }
    return v;
  }

  // Zone weights based on world Z (0 to -850, mapped to 0..1 path progress)
  float zoneBlend(float wz, float zStart, float zEnd) {
    // wz is negative (going into screen)
    float t = clamp((-wz - zStart) / (zEnd - zStart), 0.0, 1.0);
    return t;
  }

  void main() {
    vec3 pos = position;
    float wz  = pos.z; // negative as we go "forward"

    // --- Zone blend factors ---
    float tP = 1.0 - zoneBlend(wz, 0.0,   190.0); // Punjab 0..190 from centre
    float tH =       zoneBlend(wz, 0.0,   190.0)  * (1.0 - zoneBlend(wz, 190.0, 360.0));
    float tK =       zoneBlend(wz, 190.0, 360.0)  * (1.0 - zoneBlend(wz, 360.0, 555.0));
    float tL =       zoneBlend(wz, 360.0, 555.0);
    // Renormalise so they sum to 1
    float wTotal = tP+tH+tK+tL + 0.0001;
    tP/=wTotal; tH/=wTotal; tK/=wTotal; tL/=wTotal;

    // --- Dominant zone for fragment ---
    vZone = 0.0*tP + 1.0*tH + 2.0*tK + 3.0*tL;

    // --- Noise samples ---
    vec2 uv1 = pos.xz * 0.012;
    vec2 uv2 = pos.xz * 0.030;
    vec2 uv3 = pos.xz * 0.065;

    float n1 = fbm(uv1,            5);
    float n2 = fbm(uv2 + 4.3,      4);
    float n3 = fbm(uv3 + vec2(8.7, 3.1), 3);
    float ridge = abs(n1*2.0-1.0); // ridge noise for dramatic peaks

    // --- Zone heights ---
    float hP = n1 * 6.0  + sin(uTime*0.35 + pos.x*0.35)*0.18; // Punjab: flat + grass sway
    float hH = n1 * 42.0 + n2 * 16.0;                          // Himachal: moderate hills
    float hK = n1 * 75.0 + n2 * 28.0  + n3 * 12.0;            // Kashmir: steep peaks
    float hL = n1 * 118.0 + ridge*55.0 + n3 * 22.0;            // Ladakh: dramatic jagged

    float h = tP*hP + tH*hH + tK*hK + tL*hL;

    // Carve a gentle "road valley" along the centre of the spline path
    // (terrain dips near x≈0 so camera doesn't clip into peaks)
    float roadMask = smoothstep(0.0, 55.0, abs(pos.x));
    h *= mix(0.25, 1.0, roadMask);

    pos.y += h;
    vElevation = h;
    vWorldPos  = pos;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const TERRAIN_FRAG = /* glsl */`
  uniform float uTime;
  uniform vec3  uSunDir;
  varying vec3  vWorldPos;
  varying float vElevation;
  varying float vZone;

  // Approximate per-fragment normal via dFdx/dFdy
  vec3 computeNormal() {
    vec3 dx = dFdx(vWorldPos);
    vec3 dy = dFdy(vWorldPos);
    return normalize(cross(dx, dy));
  }

  void main() {
    vec3 norm = computeNormal();
    float NdotL = max(dot(norm, normalize(uSunDir)), 0.0);
    float ambient = 0.35;
    float diffuse = NdotL * 0.65;
    float light = ambient + diffuse;

    // --- Zone colours by elevation ---
    // Punjab (vZone≈0)
    vec3 cPunjabLow  = vec3(0.38, 0.42, 0.10); // dry grass
    vec3 cPunjabHigh = vec3(0.55, 0.60, 0.18); // bright field
    vec3 cPunjab = mix(cPunjabLow, cPunjabHigh, clamp(vElevation/6.0, 0.0, 1.0));

    // Himachal (vZone≈1)
    vec3 cHimLow  = vec3(0.10, 0.28, 0.10); // deep pine forest
    vec3 cHimMid  = vec3(0.18, 0.35, 0.14); // lighter pine slope
    vec3 cHimHigh = vec3(0.45, 0.44, 0.40); // rocky ridge
    float hf = clamp(vElevation/42.0, 0.0, 1.0);
    vec3 cHimachal = mix(cHimLow, mix(cHimMid, cHimHigh, smoothstep(0.5,0.85,hf)), hf);

    // Kashmir (vZone≈2)
    vec3 cKasLow  = vec3(0.06, 0.18, 0.08); // valley green
    vec3 cKasMid  = vec3(0.40, 0.42, 0.38); // scree
    vec3 cKasSnow = vec3(0.90, 0.93, 1.00); // snow cap
    float kf = clamp(vElevation/75.0, 0.0, 1.0);
    vec3 cKashmir = mix(cKasLow, mix(cKasMid, cKasSnow, smoothstep(0.78,0.92,kf)), kf);

    // Ladakh (vZone≈3)
    vec3 cLadLow  = vec3(0.30, 0.24, 0.16); // warm sandstone
    vec3 cLadMid  = vec3(0.48, 0.38, 0.25); // sunlit rock
    vec3 cLadCold = vec3(0.22, 0.20, 0.28); // shadow rock (blue-grey)
    vec3 cLadSnow = vec3(0.88, 0.90, 0.95); // high snow
    float lf = clamp(vElevation/118.0, 0.0, 1.0);
    // Warm/cold split by NdotL
    vec3 cLadBase = mix(cLadCold, cLadMid, NdotL*0.7+0.3);
    vec3 cLadakh = mix(cLadBase, mix(cLadBase, cLadSnow, smoothstep(0.82,0.96,lf)), lf);

    // Blend zone colours
    float z = vZone;
    vec3 col;
    if      (z < 0.5) col = mix(cPunjab, cHimachal, clamp(z*2.0, 0.0,1.0));
    else if (z < 1.5) col = mix(cHimachal, cKashmir, clamp((z-0.5)*2.0, 0.0,1.0));
    else if (z < 2.5) col = mix(cKashmir, cLadakh,  clamp((z-1.5)*2.0, 0.0,1.0));
    else              col = cLadakh;

    col *= light;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const terrainMat = new THREE.ShaderMaterial({
  vertexShader:   TERRAIN_VERT,
  fragmentShader: TERRAIN_FRAG,
  uniforms: {
    uTime:   { value: 0 },
    uSunDir: { value: new THREE.Vector3(0.6, 0.8, 0.3).normalize() },
  },
  side: THREE.FrontSide,
  extensions: { derivatives: true },
});

const terrain = new THREE.Mesh(terrainGeo, terrainMat);
scene.add(terrain);

/* ═══════════════════════════════════════════════════════════════════════════
   7.  SKY DOME
═══════════════════════════════════════════════════════════════════════════ */

const SKY_VERT = /* glsl */`
  varying vec3 vWorldDir;
  void main() {
    vWorldDir = (modelMatrix * vec4(position, 0.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAG = /* glsl */`
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSunDir;
  uniform float uSunSize;
  varying vec3 vWorldDir;

  void main() {
    vec3 dir = normalize(vWorldDir);
    float h   = clamp(dir.y, 0.0, 1.0);
    vec3 sky  = mix(uHorizon, uZenith, pow(h, 0.55));

    // Sun disc
    float sunDot = dot(dir, normalize(uSunDir));
    float sun    = smoothstep(uSunSize - 0.005, uSunSize + 0.003, sunDot);
    float corona = smoothstep(uSunSize - 0.12, uSunSize - 0.005, sunDot) * 0.25;
    sky = mix(sky, vec3(1.0, 0.96, 0.88), corona);
    sky = mix(sky, vec3(1.05, 1.0, 0.95), sun);

    gl_FragColor = vec4(sky, 1.0);
  }
`;

const skyGeo = new THREE.SphereGeometry(900, 32, 16);
const skyMat = new THREE.ShaderMaterial({
  vertexShader:   SKY_VERT,
  fragmentShader: SKY_FRAG,
  uniforms: {
    uZenith:  { value: new THREE.Color(0x7EC8E3) },
    uHorizon: { value: new THREE.Color(0xFFE0A0) },
    uSunDir:  { value: new THREE.Vector3(0.6, 0.55, -0.4).normalize() },
    uSunSize: { value: 0.9985 },
  },
  side: THREE.BackSide,
  depthWrite: false,
});
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

/* ═══════════════════════════════════════════════════════════════════════════
   8.  INSTANCED VEGETATION
═══════════════════════════════════════════════════════════════════════════ */

const dummy = new THREE.Object3D();

/* ── 8a. Punjab grass blades ─────────────────────────────────────────────── */
{
  const bladeGeo = new THREE.PlaneGeometry(0.4, 1.8, 1, 3);
  bladeGeo.translate(0, 0.9, 0); // pivot at base
  const bladeMat = new THREE.MeshBasicMaterial({
    color: 0x6B8C28,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const count = isMobile ? 400 : 900;
  const grassMesh = new THREE.InstancedMesh(bladeGeo, bladeMat, count);
  grassMesh.frustumCulled = false;

  const rng = mulberry32(1);
  for (let i = 0; i < count; i++) {
    const x  = (rng() - 0.5) * 800;
    const z  = -(rng() * 190 + 0);   // Punjab Z range: 0 to -190
    const sx = 0.7 + rng() * 0.6;
    const sy = 0.8 + rng() * 0.5;
    dummy.position.set(x, 0, z);
    dummy.scale.set(sx, sy, sx);
    dummy.rotation.y = rng() * Math.PI * 2;
    dummy.updateMatrix();
    grassMesh.setMatrixAt(i, dummy.matrix);
  }
  grassMesh.instanceMatrix.needsUpdate = true;
  scene.add(grassMesh);
}

/* ── 8b. Himachal pine trees ─────────────────────────────────────────────── */
{
  const trunkGeo  = new THREE.CylinderGeometry(0.3, 0.5, 5, 5, 1);
  const crownGeo  = new THREE.ConeGeometry(3.5, 10, 6, 1);
  crownGeo.translate(0, 10, 0);
  const treeGeo = mergeGeometries(trunkGeo, crownGeo);
  const treeMat = new THREE.MeshLambertMaterial({ color: 0x1A3A1A });
  const count = isMobile ? 120 : 280;
  const pineMesh = new THREE.InstancedMesh(treeGeo, treeMat, count);
  pineMesh.frustumCulled = false;

  const rng = mulberry32(2);
  for (let i = 0; i < count; i++) {
    const x  = (rng() - 0.5) * 700 + (rng() > 0.5 ? 60 : -60); // away from road
    const z  = -(rng() * 190 + 190); // Himachal Z range: -190 to -380
    const s  = 0.6 + rng() * 0.8;
    dummy.position.set(x, 0, z);
    dummy.scale.setScalar(s);
    dummy.rotation.y = rng() * Math.PI * 2;
    dummy.updateMatrix();
    pineMesh.setMatrixAt(i, dummy.matrix);
  }
  pineMesh.instanceMatrix.needsUpdate = true;
  scene.add(pineMesh);
}

/* ── 8c. Kashmir sparse pines + snow peak rocks ──────────────────────────── */
{
  const crownK = new THREE.ConeGeometry(2.5, 8, 5, 1);
  crownK.translate(0, 6, 0);
  const trunkK = new THREE.CylinderGeometry(0.2, 0.4, 4, 5);
  const treeGeoK = mergeGeometries(trunkK, crownK);
  const treeMK = new THREE.MeshLambertMaterial({ color: 0x0D2A14 });
  const countK = isMobile ? 40 : 90;
  const kashmirPines = new THREE.InstancedMesh(treeGeoK, treeMK, countK);
  kashmirPines.frustumCulled = false;

  const rng = mulberry32(3);
  for (let i = 0; i < countK; i++) {
    const x = (rng() - 0.5) * 500 + (rng() > 0.5 ? 70 : -70);
    const z = -(rng() * 170 + 380); // Kashmir range: -380 to -550
    dummy.position.set(x, 0, z);
    dummy.scale.setScalar(0.5 + rng() * 0.7);
    dummy.rotation.y = rng() * Math.PI * 2;
    dummy.updateMatrix();
    kashmirPines.setMatrixAt(i, dummy.matrix);
  }
  kashmirPines.instanceMatrix.needsUpdate = true;
  scene.add(kashmirPines);
}

/* ── 8d. Ladakh boulders ─────────────────────────────────────────────────── */
{
  const boulderGeo = new THREE.DodecahedronGeometry(4, 0);
  const boulderMat = new THREE.MeshLambertMaterial({ color: 0x4A3C28 });
  const countL = isMobile ? 80 : 200;
  const boulders = new THREE.InstancedMesh(boulderGeo, boulderMat, countL);
  boulders.frustumCulled = false;

  const rng = mulberry32(4);
  for (let i = 0; i < countL; i++) {
    const x = (rng() - 0.5) * 600;
    const z = -(rng() * 190 + 555); // Ladakh range: -555 to -745
    const s = 0.3 + rng() * 1.6;
    dummy.position.set(x, s * 2, z);
    dummy.scale.set(s, s * 0.65, s);
    dummy.rotation.set(rng() * 0.5, rng() * Math.PI, rng() * 0.5);
    dummy.updateMatrix();
    boulders.setMatrixAt(i, dummy.matrix);
  }
  boulders.instanceMatrix.needsUpdate = true;
  scene.add(boulders);
}

/* ═══════════════════════════════════════════════════════════════════════════
   9.  PARTICLES (dust/haze/mist)
═══════════════════════════════════════════════════════════════════════════ */

function makeParticles(count, zMin, zMax, spread, color, size) {
  const positions = new Float32Array(count * 3);
  const rng = mulberry32(zMin | 0);
  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (rng() - 0.5) * spread;
    positions[i * 3 + 1] = rng() * 60 + 5;
    positions[i * 3 + 2] = -(rng() * (zMax - zMin) + zMin);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color, size, transparent: true, opacity: 0.22, depthWrite: false, sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

const particleCount = isMobile ? 80 : 220;
const dustPunjab   = makeParticles(particleCount, 0,   190, 700, 0xFFD080, 1.8);
const mistHimachal = makeParticles(particleCount, 190, 380, 500, 0xC0D8F0, 2.4);
const mistKashmir  = makeParticles(particleCount, 380, 550, 400, 0xA8C8E8, 2.8);
const dustLadakh   = makeParticles(particleCount, 550, 740, 600, 0xB8A080, 1.6);

scene.add(dustPunjab, mistHimachal, mistKashmir, dustLadakh);

/* ═══════════════════════════════════════════════════════════════════════════
   10.  ROAD MARKER (gold cone fixed to curve at scrollT)
═══════════════════════════════════════════════════════════════════════════ */

const markerGeo = new THREE.ConeGeometry(0.5, 1.4, 6, 1);
markerGeo.rotateX(Math.PI); // tip points forward
const markerMat = new THREE.MeshBasicMaterial({ color: 0xF59E0B });
const roadMarker = new THREE.Mesh(markerGeo, markerMat);
roadMarker.visible = !isMobile; // hide on mobile (no fine pointer)
scene.add(roadMarker);

/* ═══════════════════════════════════════════════════════════════════════════
   11.  SCROLL BINDING (GSAP ScrollTrigger — global UMD)
═══════════════════════════════════════════════════════════════════════════ */

let scrollT = 0;
let scrollTSmooth = 0; // double-buffered: ScrollTrigger writes, rAF reads

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (window.gsap && window.ScrollTrigger) {
  window.gsap.registerPlugin(window.ScrollTrigger);

  const section = document.getElementById('home');
  if (section) {
    window.ScrollTrigger.create({
      trigger: section,
      start:   'top top',
      end:     'bottom bottom',
      scrub:   reducedMotion ? 0 : 1.4,  // tight snap vs. smooth scrub
      onUpdate(self) {
        scrollT = self.progress;
      },
    });
  }
} else {
  // Fallback: listen to scroll events directly if GSAP didn't load
  const section = document.getElementById('home');
  if (section) {
    const updateT = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      scrollT = Math.max(0, Math.min(1, -rect.top / total));
    };
    window.addEventListener('scroll', updateT, { passive: true });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   12.  MOUSE PARALLAX
═══════════════════════════════════════════════════════════════════════════ */

let mouseNX = 0; // normalised -1 to +1
let mouseNY = 0;

if (!isMobile) {
  window.addEventListener('mousemove', (e) => {
    mouseNX = (e.clientX / window.innerWidth)  * 2 - 1;
    mouseNY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════════════════════════
   13.  REGION LABEL HUD
═══════════════════════════════════════════════════════════════════════════ */

const labelEl  = document.getElementById('journeyRegionLabel');
const scrollCue = document.getElementById('journeyScrollCue');
const heroCopy = document.getElementById('journeyHeroCopy');
const progressEl = document.getElementById('journeyProgress');

let activeZoneIdx = -1;

function getNearestZoneIdx(t) {
  let best = 0, bestDist = Infinity;
  for (let i = 0; i < ZONES.length; i++) {
    const d = Math.abs(t - ZONES[i].tCenter);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

function updateRegionLabel(t) {
  const idx = getNearestZoneIdx(t);
  if (idx === activeZoneIdx) return;
  activeZoneIdx = idx;
  const z = ZONES[idx];
  if (!labelEl) return;
  labelEl.style.opacity = '0';
  setTimeout(() => {
    labelEl.innerHTML = `<span class="journey-label-region">${z.name}</span><span class="journey-label-desc">${z.desc}</span>`;
    labelEl.style.opacity = t > 0.04 ? '1' : '0';
  }, 350);
}

/* ═══════════════════════════════════════════════════════════════════════════
   14.  REDUCED MOTION SNAP MODE
═══════════════════════════════════════════════════════════════════════════ */

// In reduced-motion mode the camera jumps between 4 fixed positions.
// Continuous lerp and particles are disabled.
const SNAP_POSITIONS = ZONES.map(z => curve.getPointAt(z.tCenter));

/* ═══════════════════════════════════════════════════════════════════════════
   15.  CAMERA STATE (lerped)
═══════════════════════════════════════════════════════════════════════════ */

const camPos   = new THREE.Vector3();
const camLook  = new THREE.Vector3();
const camUp    = new THREE.Vector3(0, 1, 0);

// Parallax offsets (world space, accumulated in rAF)
let parallaxX = 0;
let parallaxY = 0;
let markerLean = 0;

// Initialise to curve start
{
  const p0 = curve.getPointAt(0);
  const p1 = curve.getPointAt(0.015);
  camPos.copy(p0);
  camLook.copy(p1);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

/* ═══════════════════════════════════════════════════════════════════════════
   16.  ZONE ATMOSPHERE BLENDING
═══════════════════════════════════════════════════════════════════════════ */

// Lerp helper for Three.js Color
function lerpColor(out, a, b, t) {
  out.r = a.r + (b.r - a.r) * t;
  out.g = a.g + (b.g - a.g) * t;
  out.b = a.b + (b.b - a.b) * t;
}

const _tmpColor = new THREE.Color();

function blendZoneAtmosphere(t) {
  // Find the two zones that bracket t
  let zA = ZONES[0], zB = ZONES[0];
  let alpha = 0;
  for (let i = 0; i < ZONES.length - 1; i++) {
    if (t >= ZONES[i].tCenter && t <= ZONES[i + 1].tCenter) {
      zA = ZONES[i]; zB = ZONES[i + 1];
      alpha = (t - zA.tCenter) / (zB.tCenter - zA.tCenter);
      break;
    }
  }
  if (t < ZONES[0].tCenter) { zA = zB = ZONES[0]; alpha = 0; }
  if (t > ZONES[ZONES.length - 1].tCenter) { zA = zB = ZONES[ZONES.length - 1]; alpha = 0; }

  const s = Math.max(0, Math.min(1, alpha));

  // Sky
  lerpColor(_tmpColor, zA.zenithColor, zB.zenithColor, s);
  skyMat.uniforms.uZenith.value.copy(_tmpColor);
  lerpColor(_tmpColor, zA.horizColor, zB.horizColor, s);
  skyMat.uniforms.uHorizon.value.copy(_tmpColor);

  // Sun
  lerpColor(_tmpColor, zA.sunColor, zB.sunColor, s);
  sunLight.color.copy(_tmpColor);
  sunLight.intensity = zA.sunInt + (zB.sunInt - zA.sunInt) * s;

  // Ambient
  lerpColor(_tmpColor, zA.ambientCol, zB.ambientCol, s);
  ambientLight.color.copy(_tmpColor);
  ambientLight.intensity = zA.ambientInt + (zB.ambientInt - zA.ambientInt) * s;

  // Fog
  lerpColor(_tmpColor, zA.fogColor, zB.fogColor, s);
  scene.fog.color.copy(_tmpColor);
  scene.fog.density = zA.fogDensity + (zB.fogDensity - zA.fogDensity) * s;

  // FOV
  camera.fov = zA.fov + (zB.fov - zA.fov) * s;
  camera.updateProjectionMatrix();

  // Particle visibility — only activate zone-relevant sets
  dustPunjab.material.opacity   = Math.max(0, (0.22 - Math.abs(t - 0.10) * 2.0));
  mistHimachal.material.opacity = Math.max(0, (0.18 - Math.abs(t - 0.33) * 2.0));
  mistKashmir.material.opacity  = Math.max(0, (0.18 - Math.abs(t - 0.58) * 2.0));
  dustLadakh.material.opacity   = Math.max(0, (0.22 - Math.abs(t - 0.85) * 2.0));

  // Bloom intensity — peaks at Ladakh bright highlights
  bloom.strength = 0.22 + t * 0.18;
}

/* ═══════════════════════════════════════════════════════════════════════════
   17.  MAIN RENDER LOOP
═══════════════════════════════════════════════════════════════════════════ */

let lastTime = 0;

function tick(now) {
  requestAnimationFrame(tick);

  const dt   = Math.min((now - lastTime) / 1000, 0.05); // cap dt to 50ms
  lastTime   = now;
  const time = now * 0.001;

  // --- Smooth scrollT toward raw value ---
  const lerpFactor = reducedMotion ? 1.0 : Math.min(1, dt * 3.5);
  scrollTSmooth += (scrollT - scrollTSmooth) * lerpFactor;
  const t = scrollTSmooth;

  // --- Camera position along curve ---
  const tSafe     = Math.max(0, Math.min(1, t));
  const tAhead    = Math.min(tSafe + 0.018, 1.0);

  const targetPos  = curve.getPointAt(tSafe);
  const targetLook = curve.getPointAt(tAhead);

  if (reducedMotion) {
    // Snap mode: jump to nearest zone position
    const snapIdx = getNearestZoneIdx(t);
    camPos.copy(SNAP_POSITIONS[snapIdx]);
    const ahead = Math.min(tSafe + 0.05, 1.0);
    camLook.copy(curve.getPointAt(ahead));
  } else {
    // Smooth lerp
    const camLerp = Math.min(1, dt * 3.8);
    camPos.lerp(targetPos,  camLerp);
    camLook.lerp(targetLook, camLerp);
  }

  // --- Mouse parallax (world-space camera look offset) ---
  if (!isMobile && !reducedMotion) {
    const pxLerp = Math.min(1, dt * 2.5);
    parallaxX += (mouseNX * 4.5 - parallaxX) * pxLerp;
    parallaxY += (-mouseNY * 2.5 - parallaxY) * pxLerp;
    markerLean += (mouseNX * 0.38 - markerLean) * pxLerp;
  }

  camera.position.copy(camPos);

  // Add parallax offset to lookAt target
  const lookTarget = camLook.clone();
  lookTarget.x += parallaxX;
  lookTarget.y += parallaxY;
  camera.lookAt(lookTarget);

  // Subtle camera Y roll based on curve tangent
  const tangent = curve.getTangentAt(tSafe);
  const rollAmt = tangent.x * 0.06;
  camera.up.set(rollAmt, 1, 0).normalize();

  // --- Road marker ---
  if (roadMarker.visible) {
    const markerPos = curve.getPointAt(tSafe);
    markerPos.y -= 1.5; // sit slightly below camera (on road surface)
    roadMarker.position.copy(markerPos);

    // Orient along curve tangent
    const tan = curve.getTangentAt(tSafe);
    roadMarker.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), tan);
    roadMarker.rotation.z = markerLean;
  }

  // --- Sky follows camera (dome centred on camera) ---
  sky.position.copy(camPos);

  // --- Terrain time uniform (grass sway) ---
  terrainMat.uniforms.uTime.value = time;

  // --- Zone atmosphere blend ---
  blendZoneAtmosphere(t);

  // --- Region label HUD ---
  updateRegionLabel(t);

  // --- Hero copy fade (0% → 15% scroll = 100% → 0% opacity) ---
  if (heroCopy) {
    heroCopy.style.opacity = String(Math.max(0, 1 - t / 0.15));
    heroCopy.style.pointerEvents = t > 0.12 ? 'none' : '';
  }

  // --- Scroll cue hide on first scroll ---
  if (scrollCue) scrollCue.style.opacity = t > 0.015 ? '0' : '1';

  // --- Region label: show only once past very start ---
  if (labelEl) {
    if (t < 0.04) labelEl.style.opacity = '0';
  }

  // --- Progress bar ---
  if (progressEl) progressEl.style.width = `${t * 100}%`;

  // --- Render ---
  composer.render();
}

requestAnimationFrame(tick);

/* ═══════════════════════════════════════════════════════════════════════════
   18.  RESIZE HANDLER
═══════════════════════════════════════════════════════════════════════════ */

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
}, { passive: true });

/* ═══════════════════════════════════════════════════════════════════════════
   19.  UTILITY FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/** Deterministic pseudo-random (seeded) — avoids layout jitter between visits */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Merge two BufferGeometries into one (simple concat — no groups needed here) */
function mergeGeometries(geoA, geoB) {
  const merged = new THREE.BufferGeometry();
  const posA = geoA.attributes.position;
  const posB = geoB.attributes.position;
  const positions = new Float32Array(posA.count * 3 + posB.count * 3);
  positions.set(posA.array, 0);
  positions.set(posB.array, posA.count * 3);
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Normals
  if (geoA.attributes.normal && geoB.attributes.normal) {
    const nA = geoA.attributes.normal, nB = geoB.attributes.normal;
    const normals = new Float32Array(nA.count * 3 + nB.count * 3);
    normals.set(nA.array, 0);
    normals.set(nB.array, nA.count * 3);
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  }

  // Indices
  if (geoA.index && geoB.index) {
    const iA = geoA.index.array, iB = geoB.index.array;
    const off = posA.count;
    const indices = new Uint32Array(iA.length + iB.length);
    indices.set(iA, 0);
    for (let i = 0; i < iB.length; i++) indices[iA.length + i] = iB[i] + off;
    merged.setIndex(new THREE.BufferAttribute(indices, 1));
  }

  return merged;
}
