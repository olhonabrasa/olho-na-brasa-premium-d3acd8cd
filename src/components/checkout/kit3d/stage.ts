// Palco 3D do configurador — porte do three-d-stage.js do projeto de design
// (renderer, luz de estúdio, sombra suave no chão, órbita e enquadramento
// automático pelo volume do objeto), sem os botões de exportar OBJ/GLB.
// Acrescentado para a LP: HDRI de reflexo, malhas unidas por material,
// render só quando algo muda, pausa fora da tela e medição de fps.
// Carregado com import() dinâmico: nada disto entra no bundle da página.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Composicao } from "@/lib/kitComposition";
import { ambienteEstudio, buildKit, criarMateriais, type KitMaterials } from "./geometry";

export type StageOptions = {
  mobile: boolean;
  reducedMotion: boolean;
  onProgress?: (p: number) => void;
};

export type Kit3DStage = {
  update: (c: Composicao) => void;
  setActive: (on: boolean) => void;
  resetView: () => void;
  stats: () => { fps: number; frameMs: number; calls: number; triangles: number };
  dispose: () => void;
};

/** Giro do HDRI para a softbox cair na diagonal superior esquerda da câmera padrão. */
const ENV_ROTATION_Y = -2.3;

export function createKitStage(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  opts: StageOptions,
): Kit3DStage {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: opts.mobile ? "default" : "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // O kit é estático e a luz não se move: a sombra só é recalculada quando o kit muda.
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  scene.environment = ambienteEstudio(renderer);
  scene.environmentRotation.y = ENV_ROTATION_Y;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
  camera.position.set(0.9, 0.7, 1.1);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !opts.reducedMotion;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = !opts.reducedMotion;
  controls.autoRotateSpeed = 2.5; // ~24 s por volta
  let interacted = false;
  controls.addEventListener("start", () => {
    interacted = true;
    controls.autoRotate = false; // para ao primeiro toque
  });
  controls.addEventListener("change", () => (dirty = true));

  // Luz do three-d-stage (hemisfério + chave com sombra + preenchimento), mais baixa
  // porque o HDRI já ilumina o metal.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2622, 0.35));
  const key = new THREE.DirectionalLight(0xfff1e0, 1.6);
  key.position.set(-2.5, 4, 2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(opts.mobile ? 1024 : 2048, opts.mobile ? 1024 : 2048);
  key.shadow.bias = -0.0003;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfeaff, 0.6);
  rim.position.set(3, 2, -3);
  scene.add(rim);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.45 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const mats: KitMaterials = criarMateriais({ mobile: opts.mobile }, "/3d/logo-olho-na-brasa.svg");
  let kit: THREE.Group | null = null;
  let dirty = true;
  let active = false;
  let disposed = false;
  let framedOnce = false;

  // HDRI de reflexo: 1K no celular, 2K no desktop. O estúdio sintético segura até lá.
  new HDRLoader().load(
    opts.mobile ? "/3d/white_home_studio_1k.hdr" : "/3d/white_home_studio_2k.hdr",
    (tex) => {
      if (disposed) return tex.dispose();
      tex.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromEquirectangular(tex).texture;
      pmrem.dispose();
      tex.dispose();
      scene.environment?.dispose();
      scene.environment = env;
      dirty = true;
      opts.onProgress?.(1);
    },
    (ev) => {
      if (ev.lengthComputable) opts.onProgress?.(ev.loaded / ev.total);
    },
    () => opts.onProgress?.(1), // falhou: fica o estúdio sintético
  );

  /** Junta todas as malhas de mesmo material numa só (poucas chamadas de desenho). */
  function mergeByMaterial(root: THREE.Group) {
    root.updateMatrixWorld(true);
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      let g = (o.geometry as THREE.BufferGeometry).clone().applyMatrix4(o.matrixWorld);
      if (g.index) g = g.toNonIndexed();
      for (const name of Object.keys(g.attributes))
        if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
      g.clearGroups();
      const mat = o.material as THREE.Material;
      (buckets.get(mat) ?? buckets.set(mat, []).get(mat)!).push(g);
      (o.geometry as THREE.BufferGeometry).dispose();
    });
    const out = new THREE.Group();
    out.name = root.name;
    for (const [mat, geos] of buckets) {
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = mat.name;
      mesh.castShadow = true;
      mesh.receiveShadow = !opts.mobile;
      out.add(mesh);
    }
    return out;
  }

  function frame(obj: THREE.Object3D, animateTarget: boolean) {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    ground.position.y = box.min.y;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const dist = (sphere.radius / Math.tan((camera.fov * Math.PI) / 360)) * 0.92;
    controls.minDistance = dist * 0.5;
    controls.maxDistance = dist * 2.2;
    if (!animateTarget || !framedOnce) {
      // mesmo enquadramento do three-d-stage: 3/4 de frente, levemente de cima
      const dir = new THREE.Vector3(1, 0.55, 1.25).normalize();
      camera.position.copy(sphere.center).add(dir.multiplyScalar(dist));
    }
    camera.near = Math.max(dist / 100, 0.005);
    camera.far = dist * 20;
    camera.updateProjectionMatrix();
    controls.target.copy(sphere.center);
    controls.update();
    const span = sphere.radius * 2.2;
    key.shadow.camera.left = -span;
    key.shadow.camera.right = span;
    key.shadow.camera.top = span;
    key.shadow.camera.bottom = -span;
    key.shadow.camera.updateProjectionMatrix();
    key.target.position.copy(sphere.center);
    key.target.updateMatrixWorld();
    framedOnce = true;
  }

  function disposeKit() {
    if (!kit) return;
    scene.remove(kit);
    kit.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    kit = null;
  }

  const fit = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(host);

  // medição de fps (média móvel de 60 quadros renderizados)
  let last = performance.now();
  let acc = 0;
  let n = 0;
  let fps = 0;
  let frameMs = 0;

  const tick = () => {
    const moved = controls.update();
    if (!moved && !dirty && !controls.autoRotate) return;
    const t0 = performance.now();
    renderer.render(scene, camera);
    frameMs = frameMs * 0.9 + (performance.now() - t0) * 0.1;
    dirty = false;
    const now = performance.now();
    acc += now - last;
    last = now;
    if (++n >= 60) {
      fps = Math.round((1000 * n) / acc);
      acc = 0;
      n = 0;
    }
  };

  return {
    update(c) {
      disposeKit();
      kit = mergeByMaterial(buildKit(c, mats, { mobile: opts.mobile }));
      scene.add(kit);
      frame(kit, interacted);
      renderer.shadowMap.needsUpdate = true;
      dirty = true;
    },
    setActive(on) {
      if (on === active || disposed) return;
      active = on;
      last = performance.now();
      acc = 0;
      n = 0;
      renderer.setAnimationLoop(on ? tick : null);
    },
    resetView() {
      interacted = false;
      if (kit) frame(kit, false);
      controls.autoRotate = !opts.reducedMotion;
      dirty = true;
    },
    stats() {
      return {
        fps,
        frameMs: Math.round(frameMs * 100) / 100,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      };
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      controls.dispose();
      disposeKit();
      Object.values(mats).forEach((m: THREE.Material & { alphaMap?: THREE.Texture | null }) => {
        m.alphaMap?.dispose();
        m.dispose();
      });
      scene.environment?.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };
}
