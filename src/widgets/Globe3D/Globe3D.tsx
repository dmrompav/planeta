import { useEffect, useRef } from 'react';
import type { CSSProperties, MutableRefObject } from 'react';
import * as THREE from 'three';
import type {
  FeatureCollection,
  Polygon as GJPolygon,
  MultiPolygon as GJMultiPolygon,
} from 'geojson';

// ──────────────────────────────────────────────────────────────────────────────
// Типы

type LngLat = [number, number];
type Ring = LngLat[];
type BBox = [number, number, number, number];

type NEProps = Partial<{
  ISO_A2_EH: string;
  ISO_A2: string;
  WB_A2: string;
  ISO_A3_EH: string;
  ISO_A3: string;
  ADM0_A3: string;
  NAME_LONG: string;
  ADMIN: string;
  NAME: string;
  SOVEREIGNT: string;
  GEOUNIT: string;
}>;

type PolygonIdx = { outer: Ring; holes: Ring[]; bbox: BBox };
type FeatureIdx = { props: NEProps; polygons: PolygonIdx[] };

type Globe3DProps = {
  selectedCca2?: string | null;
  setSelectedCca2?: (code: string | null) => void;
  style?: CSSProperties;
  className?: string;
  canvasId?: string;
};

// ──────────────────────────────────────────────────────────────────────────────
// Константы

const R = 1;

const COLORS = {
  background: 0x000000,
  ocean: 0x0b3d91,
  land: 0x2e8b57,
  borders: 0xffffff,
  selectedFill: 0xff3b30,
  selectedStroke: 0xff3b30,
  hoverFill: 0xffc04d,
} as const;

const NAV = {
  minDistance: 1.2,
  maxDistance: 6,
  dragYawPerPx: 0.004, // горизонтальный drag: вращение вокруг локальной оси Y
  dragPitchPerPx: 0.004, // вертикальный drag: наклон вокруг правой оси камеры
  wheelZoomStrength: 0.0018,
  pinchZoomStrength: 0.008,
  clickPxTolerance: 6,
  clickMsTolerance: 300,
} as const;

const AUTO = {
  degPerSec: 0.8,
  idleMs: 1200,
} as const;

const STARS = {
  count: 2800,
  radius: 60,
  size: 0.45,
  opacity: 0.9,
} as const;

// ──────────────────────────────────────────────────────────────────────────────
// Вспомогательные функции

const lonLatToVec3 = (lonDeg: number, latDeg: number, radius: number) => {
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const lat = THREE.MathUtils.degToRad(latDeg);
  const x = radius * Math.cos(lat) * Math.sin(lon);
  const y = radius * Math.sin(lat);
  const z = radius * Math.cos(lat) * Math.cos(lon);
  return new THREE.Vector3(x, y, z);
};

const densifyAndPush = (
  aLon: number,
  aLat: number,
  bLon: number,
  bLat: number,
  radius: number,
  out: THREE.Vector3[]
) => {
  const v0 = lonLatToVec3(aLon, aLat, radius).normalize();
  const v1 = lonLatToVec3(bLon, bLat, radius).normalize();
  const angle = v0.angleTo(v1);
  const maxStep = (2 * Math.PI) / 180; // ~2°
  const steps = Math.max(2, Math.ceil(angle / maxStep));
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    out.push(
      new THREE.Vector3()
        .copy(v0)
        .lerp(v1, t)
        .normalize()
        .multiplyScalar(radius)
    );
  }
};

const addRingToGroup = (
  ring: Ring,
  group: THREE.Group,
  radius: number,
  material: THREE.LineBasicMaterial
) => {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < ring.length; i++) {
    const [lon, lat] = ring[i];
    if (i === 0) pts.push(lonLatToVec3(lon, lat, radius));
    else {
      const [plon, plat] = ring[i - 1];
      densifyAndPush(plon, plat, lon, lat, radius, pts);
    }
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    densifyAndPush(last[0], last[1], first[0], first[1], radius, pts);
  }
  if (pts.length >= 2) {
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(geom, material));
  }
};

const buildBordersGroup = (idx: FeatureIdx[], radius = R * 1.0015) => {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({
    color: COLORS.borders,
    transparent: true,
    opacity: 0.9,
  });
  for (const f of idx) {
    for (const poly of f.polygons) {
      addRingToGroup(poly.outer, group, radius, material);
      for (const h of poly.holes) addRingToGroup(h, group, radius, material);
    }
  }
  return group;
};

const buildFeatureIndex = (
  fc: FeatureCollection<GJPolygon | GJMultiPolygon, NEProps>
): FeatureIdx[] => {
  const idx: FeatureIdx[] = [];

  const pushPoly = (rings: LngLat[][]): PolygonIdx | null => {
    if (!rings.length) return null;
    const outer = rings[0];
    const holes = rings.slice(1);
    let minLon = +Infinity,
      minLat = +Infinity,
      maxLon = -Infinity,
      maxLat = -Infinity;
    for (const [lon, lat] of outer) {
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
    }
    return { outer, holes, bbox: [minLon, minLat, maxLon, maxLat] };
  };

  for (const f of fc.features) {
    const geom = f.geometry;
    if (!geom) continue;
    const polys: PolygonIdx[] = [];
    if (geom.type === 'Polygon') {
      const p = pushPoly(geom.coordinates as LngLat[][]);
      if (p) polys.push(p);
    } else {
      for (const rings of geom.coordinates as LngLat[][][]) {
        const p = pushPoly(rings);
        if (p) polys.push(p);
      }
    }
    if (polys.length) idx.push({ props: f.properties ?? {}, polygons: polys });
  }
  return idx;
};

// 2D point-in-polygon helpers
const inBbox = (lon: number, lat: number, b: BBox) =>
  lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3];

const pointInRing = (lon: number, lat: number, ring: Ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

const pointInPolygon = (lon: number, lat: number, poly: PolygonIdx) => {
  if (!inBbox(lon, lat, poly.bbox)) return false;
  if (!pointInRing(lon, lat, poly.outer)) return false;
  for (const h of poly.holes) if (pointInRing(lon, lat, h)) return false;
  return true;
};

const pickFeature = (idx: FeatureIdx[] | null, lon: number, lat: number) => {
  if (!idx) return null;
  for (const f of idx)
    for (const p of f.polygons) if (pointInPolygon(lon, lat, p)) return f;
  return null;
};

// Нормализация ISO
const normalizeISO2 = (s?: string | null) =>
  (!s ? undefined : s.trim().toUpperCase() || undefined)?.replace(/^-99$/, '');
const iso2FromProps = (p: NEProps): string | undefined => {
  const candidates = [p.ISO_A2_EH, p.ISO_A2, p.WB_A2];
  for (const c of candidates) {
    const v = normalizeISO2(c);
    if (v) return v;
  }
  return undefined;
};

// Построение текстуры карты с выделением и hover
function createMapTexture(renderer: THREE.WebGLRenderer) {
  const cv = document.createElement('canvas');
  cv.width = 2048;
  cv.height = 1024;
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;

  const draw = (
    features: FeatureIdx[],
    selectedF?: FeatureIdx | null,
    hoverF?: FeatureIdx | null
  ) => {
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = cv.width,
      H = cv.height;

    ctx.fillStyle = `#${COLORS.ocean.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, W, H);

    const proj = (lon: number, lat: number): [number, number] => {
      const x = ((lon + 180) / 360) * W;
      const y = ((90 - lat) / 180) * H;
      return [x, y];
    };

    const traceRing = (ring: Ring, begin = false) => {
      if (!ring.length) return;
      const [x0, y0] = proj(ring[0][0], ring[0][1]);
      if (begin) ctx.beginPath();
      ctx.moveTo(x0, y0);
      for (let i = 1; i < ring.length; i++) {
        const [x, y] = proj(ring[i][0], ring[i][1]);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    const fillPoly = (poly: PolygonIdx, colorHex: number, alpha = 1) => {
      traceRing(poly.outer, true);
      for (const h of poly.holes) traceRing(h, false);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
      ctx.fill('evenodd');
      ctx.restore();
    };

    for (const f of features) {
      if (f === selectedF || f === hoverF) continue;
      for (const p of f.polygons) fillPoly(p, COLORS.land, 1);
    }

    if (hoverF && hoverF !== selectedF) {
      for (const p of hoverF.polygons) fillPoly(p, COLORS.hoverFill, 0.35);
    }

    if (selectedF) {
      for (const p of selectedF.polygons) fillPoly(p, COLORS.selectedFill, 1);
    }

    tex.needsUpdate = true;
  };

  return { canvas: cv, texture: tex, draw };
}

// Рендерер
function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  const setDPR = () =>
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  setDPR();
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(COLORS.background, 1);
  return { renderer, setDPR };
}

// Сцена/камера
function createScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(5, 2, 4);
  scene.add(dir);

  return { scene, camera };
}

// Подгон расстояния камеры так, чтобы сфера влезала по меньшей стороне
function fitCameraToSphere(
  camera: THREE.PerspectiveCamera,
  radius: number,
  aspect: number,
  margin = 1.05
) {
  const halfV = THREE.MathUtils.degToRad(camera.fov * 0.5);
  const dVert = radius / Math.tan(halfV);
  const dHorz = radius / (Math.tan(halfV) * aspect);
  const dist = Math.max(dVert, dHorz) * margin;
  camera.position.set(0, 0, dist);
  camera.updateProjectionMatrix();
  return dist;
}

// Resize: ResizeObserver + debounce + fit по меньшей стороне
function createResizeWatcher(
  canvas: HTMLCanvasElement,
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  setDPR: () => void,
  baseDistRef: MutableRefObject<number>,
  camDistRef: MutableRefObject<number>,
  minDistRef: MutableRefObject<number>,
  maxDistRef: MutableRefObject<number>
) {
  const doResize = () => {
    const parent = canvas.parentElement ?? document.body;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;

    renderer.setSize(w, h, true);
    camera.aspect = w / h;

    const base = fitCameraToSphere(camera, R * 1.01, camera.aspect, 1.06);
    baseDistRef.current = base;
    minDistRef.current = NAV.minDistance * base;
    maxDistRef.current = NAV.maxDistance * base;

    // если ещё не было зума — ставим базовую дистанцию
    if (camDistRef.current === 0) camDistRef.current = base;
    camDistRef.current = THREE.MathUtils.clamp(
      camDistRef.current,
      minDistRef.current,
      maxDistRef.current
    );
    camera.position.setLength(camDistRef.current);

    setDPR();
  };

  let t: number | undefined;
  const debounced = () => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(doResize, 150);
  };

  let ro: ResizeObserver | null = null;
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(debounced);
    ro.observe(canvas.parentElement ?? document.body);
  }
  window.addEventListener('resize', debounced);

  doResize();
  return () => {
    if (ro) ro.disconnect();
    window.removeEventListener('resize', debounced);
    if (t) window.clearTimeout(t);
  };
}

// Пикер
function createPicker(
  camera: THREE.PerspectiveCamera,
  world: THREE.Group,
  globe: THREE.Mesh,
  idxRef: MutableRefObject<FeatureIdx[] | null>
) {
  const raycaster = new THREE.Raycaster();

  const pickAt = (clientX: number, clientY: number, domRect: DOMRect) => {
    const ndc = new THREE.Vector2(
      ((clientX - domRect.left) / domRect.width) * 2 - 1,
      -((clientY - domRect.top) / domRect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(globe, false)[0];
    if (!hit) return null;

    const pLocal = world.worldToLocal(hit.point.clone()).normalize();
    const lat = THREE.MathUtils.radToDeg(Math.asin(pLocal.y));
    const lon = THREE.MathUtils.radToDeg(Math.atan2(pLocal.x, pLocal.z));

    return pickFeature(idxRef.current, lon, lat);
  };

  return { pickAt };
}

// Выбор «главного» полигона
const primaryPolygon = (polys: PolygonIdx[]) => {
  let best: PolygonIdx | null = null;
  let bestScore = -Infinity;
  for (const p of polys) {
    const [minLon, minLat, maxLon, maxLat] = p.bbox;
    const dLon = Math.abs(maxLon - minLon);
    const dLat = Math.abs(maxLat - minLat);
    const latMid = THREE.MathUtils.degToRad((minLat + maxLat) * 0.5);
    const score =
      dLon * dLat * Math.max(0.2, Math.cos(latMid)) + p.outer.length * 1e-3;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best!;
};

// Направление на страну
const featureDirection = (f: FeatureIdx): THREE.Vector3 => {
  const poly = primaryPolygon(f.polygons);
  const sum = new THREE.Vector3(0, 0, 0);
  for (const [lon, lat] of poly.outer) {
    sum.add(lonLatToVec3(lon, lat, 1).normalize());
  }
  if (sum.lengthSq() < 1e-6) {
    const [minLon, minLat, maxLon, maxLat] = poly.bbox;
    const lon = (minLon + maxLon) * 0.5;
    const lat = (minLat + maxLat) * 0.5;
    return lonLatToVec3(lon, lat, 1).normalize();
  }
  return sum.normalize();
};

// Фокусировщик
function createFocuser(world: THREE.Group, camera: THREE.PerspectiveCamera) {
  const viewAxisToCamera = () => camera.position.clone().normalize();

  let anim: {
    t0: number;
    dur: number;
    from: THREE.Quaternion;
    to: THREE.Quaternion;
  } | null = null;

  const easeInOut = (t: number) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const start = (dirLocal: THREE.Vector3, ms = 650) => {
    const dirWorld = world.localToWorld(dirLocal.clone()).normalize();
    const target = viewAxisToCamera();
    const dq = new THREE.Quaternion().setFromUnitVectors(dirWorld, target);
    const from = world.quaternion.clone();
    const to = dq.multiply(from);
    anim = { t0: performance.now(), dur: ms, from, to };
  };

  const cancel = () => {
    anim = null;
  };

  const update = (now: number) => {
    if (!anim) return;
    const t = Math.min(1, (now - anim.t0) / anim.dur);
    const k = easeInOut(t);
    world.quaternion.copy(anim.from).slerp(anim.to, k);
    if (t >= 1) anim = null;
  };

  const isActive = () => anim !== null;

  return { start, cancel, update, isActive };
}

// Звёздный фон
function createStars() {
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(STARS.count * 3);
  for (let i = 0; i < STARS.count; i++) {
    const v = new THREE.Vector3()
      .randomDirection()
      .multiplyScalar(STARS.radius * (0.95 + Math.random() * 0.1));
    positions[i * 3 + 0] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
  }
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size: STARS.size,
    sizeAttenuation: true,
    transparent: true,
    opacity: STARS.opacity,
    depthWrite: false,
  });
  const stars = new THREE.Points(geom, mat);
  stars.renderOrder = -1;
  return stars;
}

// Автовращение при простое
function createIdleAuto(
  world: THREE.Group,
  opts: {
    selectedRef: MutableRefObject<FeatureIdx | null>;
    hoveredRef: MutableRefObject<FeatureIdx | null>;
    focuserActive: () => boolean;
  }
) {
  let interacting = false;
  let lastInputAt = performance.now();
  const qTmp = new THREE.Quaternion();
  const axisLocalY = new THREE.Vector3(0, 1, 0);

  const markInput = () => {
    lastInputAt = performance.now();
  };
  const onStart = () => {
    interacting = true;
    markInput();
  };
  const onEnd = () => {
    interacting = false;
    markInput();
  };

  const update = (now: number, dtSec: number) => {
    if (interacting) return;
    if (opts.focuserActive()) return;
    if (opts.selectedRef.current) return;
    if (opts.hoveredRef.current) return;
    if (now - lastInputAt < AUTO.idleMs) return;

    const ang = THREE.MathUtils.degToRad(AUTO.degPerSec) * dtSec;
    qTmp.setFromAxisAngle(axisLocalY, ang);
    world.quaternion.multiply(qTmp); // локальный yaw
  };

  return { onStart, onEnd, markInput, update };
}

// Очистка ресурсов без any
function disposeAll(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    } else if (obj instanceof THREE.Line) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    } else if (obj instanceof THREE.Points) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Компонент

export const Globe3D = ({
  selectedCca2,
  setSelectedCca2,
  style,
  className,
  canvasId = 'globe-scene',
}: Globe3DProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedRef = useRef<FeatureIdx | null>(null);
  const hoveredRef = useRef<FeatureIdx | null>(null);

  const idxRef = useRef<FeatureIdx[] | null>(null);
  const iso2MapRef = useRef<Map<string, FeatureIdx>>(new Map());
  const applySelectionRef = useRef<(f: FeatureIdx | null) => void>(null);

  const setSelectedRef = useRef<Globe3DProps['setSelectedCca2']>(null);

  // камера/дистанции — ВСЕ рефы объявлены на верхнем уровне (не внутри коллбэков)
  const baseDistRef = useRef<number>(0);
  const camDistRef = useRef<number>(0);
  const minDistRef = useRef<number>(0);
  const maxDistRef = useRef<number>(0);

  useEffect(() => {
    setSelectedRef.current = setSelectedCca2;
  }, [setSelectedCca2]);

  useEffect(() => {
    const canvas =
      canvasRef.current ??
      (document.getElementById(canvasId) as HTMLCanvasElement | null);
    if (!canvas) return;

    const { renderer, setDPR } = createRenderer(canvas);
    renderer.domElement.style.touchAction = 'none';
    const { scene, camera } = createScene();

    const world = new THREE.Group();
    scene.add(world);

    const { texture: mapTex, draw: drawMap } = createMapTexture(renderer);

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(
        R,
        64,
        64,
        -Math.PI / 2,
        Math.PI * 2,
        0,
        Math.PI
      ),
      new THREE.MeshStandardMaterial({
        map: mapTex,
        roughness: 0.95,
        metalness: 0,
      })
    );
    world.add(globe);

    const stars = createStars();
    scene.add(stars);

    const highlightRef: { current: THREE.Group | null } = { current: null };
    const setHighlight = (f: FeatureIdx | null) => {
      if (highlightRef.current) {
        world.remove(highlightRef.current);
        disposeAll(highlightRef.current);
        highlightRef.current = null;
      }
      if (!f) return;
      const g = new THREE.Group();
      const mat = new THREE.LineBasicMaterial({
        opacity: 1,
        transparent: true,
        color: COLORS.selectedStroke,
      });
      const radius = R * 1.003;
      for (const poly of f.polygons) {
        addRingToGroup(poly.outer, g, radius, mat);
        for (const h of poly.holes) addRingToGroup(h, g, radius, mat);
      }
      world.add(g);
      highlightRef.current = g;
    };

    const focuser = createFocuser(world, camera);
    const idle = createIdleAuto(world, {
      selectedRef,
      hoveredRef,
      focuserActive: () => focuser.isActive(),
    });

    applySelectionRef.current = (f: FeatureIdx | null) => {
      selectedRef.current = f;
      setHighlight(f);
      if (idxRef.current)
        drawMap(idxRef.current, selectedRef.current, hoveredRef.current);
      if (f) {
        const dir = featureDirection(f);
        focuser.start(dir);
      }
    };

    // Загрузка geojson
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch('geo/world.geojson', { signal: ac.signal });
        const geo = (await res.json()) as FeatureCollection<
          GJPolygon | GJMultiPolygon,
          NEProps
        >;
        const idx = buildFeatureIndex(geo);
        idxRef.current = idx;

        const map = new Map<string, FeatureIdx>();
        for (const f of idx) {
          const code = iso2FromProps(f.props);
          if (code) map.set(code, f);
        }
        iso2MapRef.current = map;

        const borders = buildBordersGroup(idx);
        world.add(borders);

        drawMap(idx, selectedRef.current, hoveredRef.current);

        const code = normalizeISO2(selectedCca2) ?? null;
        const f = code ? map.get(code) ?? null : null;
        applySelectionRef.current?.(f);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          console.error('[globe] geojson load error:', e);
        }
      }
    })();

    // Пикер
    const { pickAt } = createPicker(camera, world, globe, idxRef);

    // Resize / camera distances
    const stopResize = createResizeWatcher(
      canvas,
      renderer,
      camera,
      setDPR,
      baseDistRef,
      camDistRef,
      minDistRef,
      maxDistRef
    );

    // ── Управление: drag yaw/pitch, wheel и pinch-zoom
    const activePointers = new Map<number, { x: number; y: number }>();
    let downX = 0;
    let downY = 0;
    let downT = 0;
    let moved = false;
    let lastMoveX = 0;
    let lastMoveY = 0;

    const pinchRef: { active: boolean; startDist: number; curDist: number } = {
      active: false,
      startDist: 0,
      curDist: 0,
    };

    const qYaw = new THREE.Quaternion();
    const qPitch = new THREE.Quaternion();
    const axisLocalY = new THREE.Vector3(0, 1, 0);
    const axisRightWorld = new THREE.Vector3();

    const getCameraRight = () => {
      const forward = camera.getWorldDirection(new THREE.Vector3()).normalize();
      return axisRightWorld.copy(forward).cross(camera.up).normalize();
    };

    const applyDrag = (dx: number, dy: number) => {
      const yaw = dx * NAV.dragYawPerPx;
      qYaw.setFromAxisAngle(axisLocalY, yaw);
      world.quaternion.multiply(qYaw); // локальный yaw

      const right = getCameraRight();
      const pitch = dy * NAV.dragPitchPerPx;
      qPitch.setFromAxisAngle(right, pitch);
      world.quaternion.premultiply(qPitch); // мировой pitch

      world.quaternion.normalize();
    };

    const zoomByFactor = (factor: number) => {
      const next = THREE.MathUtils.clamp(
        camera.position.length() * factor,
        minDistRef.current,
        maxDistRef.current
      );
      camDistRef.current = next;
    };

    const onPointerDown = (ev: PointerEvent) => {
      idle.onStart();
      focuser.cancel();

      activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

      if (activePointers.size === 1) {
        downX = ev.clientX;
        downY = ev.clientY;
        lastMoveX = ev.clientX;
        lastMoveY = ev.clientY;
        downT = performance.now();
        moved = false;
      } else if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        pinchRef.startDist = Math.hypot(dx, dy);
        pinchRef.curDist = pinchRef.startDist;
        pinchRef.active = true;
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      const p = activePointers.get(ev.pointerId);
      if (!p) return;

      p.x = ev.clientX;
      p.y = ev.clientY;

      if (activePointers.size === 1) {
        const dx = ev.clientX - lastMoveX;
        const dy = ev.clientY - lastMoveY;
        lastMoveX = ev.clientX;
        lastMoveY = ev.clientY;

        if (!moved) {
          const mdx = ev.clientX - downX;
          const mdy = ev.clientY - downY;
          if (mdx * mdx + mdy * mdy > NAV.clickPxTolerance ** 2) moved = true;
        }

        applyDrag(dx, dy);
      } else if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        const dist = Math.hypot(dx, dy);

        if (pinchRef.active && pinchRef.startDist > 0) {
          const delta = dist - pinchRef.curDist;
          const factor = Math.exp((-delta * NAV.pinchZoomStrength) / 100);
          zoomByFactor(factor);
        }
        pinchRef.curDist = dist;
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      activePointers.delete(ev.pointerId);

      if (activePointers.size < 2) {
        pinchRef.active = false;
        pinchRef.startDist = 0;
        pinchRef.curDist = 0;
      }

      if (activePointers.size === 0 && ev.isPrimary) {
        const dt = performance.now() - downT;
        const isTap = !moved && dt <= NAV.clickMsTolerance;
        if (isTap) {
          const rect = renderer.domElement.getBoundingClientRect();
          const f = pickAt(ev.clientX, ev.clientY, rect);
          if (f) {
            applySelectionRef.current?.(f);
            const iso2 = iso2FromProps(f.props) ?? null;
            setSelectedRef.current?.(iso2);
          }
        }
        moved = false;
      }

      idle.onEnd();
    };

    const onPointerCancel = (ev: PointerEvent) => {
      activePointers.delete(ev.pointerId);
      moved = false;
      pinchRef.active = false;
      idle.onEnd();
    };

    const onPointerLeave = () => {
      if (hoveredRef.current) {
        hoveredRef.current = null;
        if (idxRef.current) {
          drawMap(idxRef.current, selectedRef.current, hoveredRef.current);
        }
      }
    };

    const onHoverMove = (ev: PointerEvent) => {
      if (activePointers.size > 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const f = pickAt(ev.clientX, ev.clientY, rect);
      if (hoveredRef.current !== f) {
        hoveredRef.current = f;
        if (idxRef.current) {
          drawMap(idxRef.current, selectedRef.current, hoveredRef.current);
        }
      }
    };

    const onWheel = (ev: WheelEvent) => {
      idle.markInput();
      const factor = Math.exp(ev.deltaY * NAV.wheelZoomStrength);
      zoomByFactor(factor);
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerCancel);
    dom.addEventListener('pointerleave', onPointerLeave);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointermove', onHoverMove);
    dom.addEventListener('wheel', onWheel, { passive: true });

    // animation
    let lastT = 0;
    renderer.setAnimationLoop((t: number) => {
      if (!lastT) lastT = t;
      const dt = (t - lastT) / 1000;
      lastT = t;

      focuser.update(t);
      idle.update(t, dt);

      if (camDistRef.current > 0) camera.position.setLength(camDistRef.current);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    });

    return () => {
      ac.abort();
      const parent = dom.parentElement;
      if (parent) {
        // noop, just to keep TypeScript happy if you later attach more nodes
      }

      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerCancel);
      dom.removeEventListener('pointerleave', onPointerLeave);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointermove', onHoverMove);
      dom.removeEventListener('wheel', onWheel);

      renderer.setAnimationLoop(null);
      disposeAll(scene);
      renderer.dispose();
      mapTex.dispose();
      stopResize();
    };
  }, [canvasId]);

  // реакция на смену selectedCca2 (без перезапуска сцены)
  useEffect(() => {
    const code = normalizeISO2(selectedCca2) ?? null;
    const f = code ? iso2MapRef.current.get(code) ?? null : null;
    applySelectionRef.current?.(f);
  }, [selectedCca2]);

  return (
    <canvas
      id={canvasId}
      ref={canvasRef}
      className={className}
      style={{ width: '100%', display: 'block', ...style }}
    />
  );
};
