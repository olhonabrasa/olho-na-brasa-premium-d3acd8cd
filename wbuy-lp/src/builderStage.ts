// Palco 3D "jogável" da LP de campanha. Usa o mesmo gerador procedural do
// configurador da LP Premium (src/components/checkout/kit3d/geometry.ts); o que
// muda aqui é a interação:
//  - cada peça (suporte, cada grelha, cada espeto) vira um grupo clicável,
//    ainda com poucas chamadas de desenho (malhas unidas por material dentro da peça);
//  - peça nova entra deslizando; peça escolhida acende;
//  - o suporte pode aparecer "fantasma" quando o cliente ainda não o incluiu;
//  - pontos de "+" (HTML sobre o canvas) acompanham a câmera.
// Carregado com import() dinâmico: three.js não entra no script inicial.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Composicao } from "@/lib/kitComposition";
import { ambienteEstudio, buildKit, criarMateriais } from "@/components/checkout/kit3d/geometry";
import logoSvg from "../../public/3d/logo-olho-na-brasa.svg?raw";

export type StageOptions = {
  mobile: boolean;
  reducedMotion: boolean;
  /** pasta com os .hdr (precisa liberar CORS para a loja) */
  assetBase: string;
  onProgress?: (p: number) => void;
  /** clique numa peça (nome do grupo: suporte, grelha_uruguaia_0, espeto_simples_1...) ou no vazio */
  onPick?: (parte: string | null, x: number, y: number) => void;
  /** chamado depois de cada quadro desenhado (para reposicionar os pontos de "+") */
  onRender?: () => void;
};

export type UpdateOptions = { fantasma?: string[]; destaque?: string | null };

export type BuilderStage = {
  update: (c: Composicao, o?: UpdateOptions) => void;
  highlight: (parte: string | null) => void;
  /** posição na tela (px, relativa ao canvas) de um ponto do kit em metros */
  project: (p: [number, number, number]) => { x: number; y: number; atras: boolean };
  setActive: (on: boolean) => void;
  resetView: () => void;
  stats: () => { fps: number; calls: number; triangles: number };
  dispose: () => void;
};

const ENV_ROTATION_Y = -2.3;
const ENTRADA_MS = 520;

export function createBuilderStage(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  opts: StageOptions,
): BuilderStage {
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
  controls.autoRotate = false; // aqui o cliente mexe; giro só no "ver de novo"
  let interacted = false;
  controls.addEventListener("start", () => (interacted = true));
  controls.addEventListener("change", () => (dirty = true));

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

  const logoUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(logoSvg);
  const mats = criarMateriais({ mobile: opts.mobile }, logoUrl);
  const fantasmaMat = new THREE.MeshStandardMaterial({
    name: "fantasma",
    color: 0xbfc5cc,
    metalness: 0.2,
    roughness: 0.6,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const acesos = new Map<THREE.Material, THREE.Material>();
  const acender = (m: THREE.Material) => {
    let a = acesos.get(m);
    if (!a) {
      a = m.clone();
      (a as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xff8a3d);
      (a as THREE.MeshStandardMaterial).emissiveIntensity = 0.16;
      acesos.set(m, a);
    }
    return a;
  };

  let kit: THREE.Group | null = null;
  let nomesAntes = new Set<string>();
  let destaque: string | null = null;
  let dirty = true;
  let active = false;
  let disposed = false;
  let framedOnce = false;
  let raioAntes = 0;
  const entradas: { obj: THREE.Object3D; de: THREE.Vector3; ate: THREE.Vector3; t0: number }[] = [];

  new HDRLoader().load(
    opts.assetBase + (opts.mobile ? "3d/white_home_studio_1k.hdr" : "3d/white_home_studio_2k.hdr"),
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
    (ev) => ev.lengthComputable && opts.onProgress?.(ev.loaded / ev.total),
    () => opts.onProgress?.(1),
  );

  /** Une as malhas de mesmo material dentro de uma peça. */
  function unirPeca(peca: THREE.Object3D) {
    const inv = new THREE.Matrix4().copy(peca.matrixWorld).invert();
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    peca.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      let g = (o.geometry as THREE.BufferGeometry)
        .clone()
        .applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      if (g.index) g = g.toNonIndexed();
      for (const n of Object.keys(g.attributes))
        if (!["position", "normal", "uv"].includes(n)) g.deleteAttribute(n);
      g.clearGroups();
      const mat = o.material as THREE.Material;
      (buckets.get(mat) ?? buckets.set(mat, []).get(mat)!).push(g);
      (o.geometry as THREE.BufferGeometry).dispose();
    });
    const out = new THREE.Group();
    out.name = peca.name;
    out.position.copy(peca.position);
    out.quaternion.copy(peca.quaternion);
    for (const [mat, geos] of buckets) {
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.userData.base = mat;
      mesh.castShadow = true;
      mesh.receiveShadow = !opts.mobile;
      out.add(mesh);
    }
    return out;
  }

  function aplicarMateriais(fantasma: string[]) {
    kit?.children.forEach((peca) => {
      const f = fantasma.includes(peca.name);
      const on = !f && peca.name === destaque;
      peca.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const base = o.userData.base as THREE.Material;
        o.material = f ? fantasmaMat : on ? acender(base) : base;
        o.castShadow = !f;
      });
      peca.userData.fantasma = f;
    });
  }
  let fantasmaAtual: string[] = [];

  function frame(obj: THREE.Object3D, manterCamera: boolean) {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    ground.position.y = box.min.y;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    // enquadra pela menor dimensão do canvas (no celular o palco é mais estreito que alto)
    const dist =
      (sphere.radius / (Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, camera.aspect))) *
      1.05;
    controls.minDistance = dist * 0.45;
    controls.maxDistance = dist * 2.2;
    // só reenquadra quando o tamanho muda de verdade (trocar suporte), não a cada grelha
    const mudou = Math.abs(sphere.radius - raioAntes) / (raioAntes || 1) > 0.15;
    raioAntes = sphere.radius;
    if (!framedOnce || (!manterCamera && mudou)) {
      const dir = new THREE.Vector3(1, 0.55, 1.25).normalize();
      camera.position.copy(sphere.center).add(dir.multiplyScalar(dist));
    }
    camera.near = Math.max(dist / 100, 0.005);
    camera.far = dist * 20;
    camera.updateProjectionMatrix();
    controls.target.copy(sphere.center);
    controls.update();
    const span = sphere.radius * 2.2;
    Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span });
    key.shadow.camera.updateProjectionMatrix();
    key.target.position.copy(sphere.center);
    key.target.updateMatrixWorld();
    framedOnce = true;
  }

  function disposeKit() {
    if (!kit) return;
    scene.remove(kit);
    kit.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose());
    kit = null;
  }

  // --- clique e passar o mouse ---
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pecaEm(clientX: number, clientY: number): string | null {
    if (!kit) return null;
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(kit.children, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && o.parent !== kit) o = o.parent;
      if (o) return o.name;
    }
    return null;
  }
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (!down) return;
    const moveu = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6;
    down = null;
    if (moveu) return;
    const r = canvas.getBoundingClientRect();
    opts.onPick?.(pecaEm(e.clientX, e.clientY), e.clientX - r.left, e.clientY - r.top);
  };
  let hoverPend = false;
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || down || hoverPend) return;
    hoverPend = true;
    requestAnimationFrame(() => {
      hoverPend = false;
      canvas.style.cursor = pecaEm(e.clientX, e.clientY) ? "pointer" : "grab";
    });
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointermove", onMove);

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

  let last = performance.now();
  let acc = 0;
  let n = 0;
  let fps = 0;
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);

  const tick = () => {
    const moved = controls.update();
    if (entradas.length) {
      const agora = performance.now();
      for (let i = entradas.length - 1; i >= 0; i--) {
        const e = entradas[i];
        const t = Math.min((agora - e.t0) / ENTRADA_MS, 1);
        e.obj.position.lerpVectors(e.de, e.ate, ease(t));
        if (t >= 1) {
          entradas.splice(i, 1);
          renderer.shadowMap.needsUpdate = true;
        }
      }
      dirty = true;
    }
    if (!moved && !dirty && !controls.autoRotate) return;
    renderer.render(scene, camera);
    dirty = false;
    opts.onRender?.();
    const now = performance.now();
    acc += now - last;
    last = now;
    if (++n >= 60) {
      fps = Math.round((1000 * n) / acc);
      acc = 0;
      n = 0;
    }
  };

  const v = new THREE.Vector3();
  return {
    update(c, o = {}) {
      const novo = buildKit(c, mats, { mobile: opts.mobile });
      novo.updateMatrixWorld(true);
      const pecas = novo.children.slice().map(unirPeca);
      disposeKit();
      kit = new THREE.Group();
      kit.name = novo.name;
      pecas.forEach((p) => kit!.add(p));
      scene.add(kit);
      if (o.destaque !== undefined) destaque = o.destaque;
      fantasmaAtual = o.fantasma ?? [];
      aplicarMateriais(fantasmaAtual);
      // peça que não existia antes entra deslizando de frente (ou de cima, o suporte)
      if (!opts.reducedMotion && framedOnce) {
        for (const p of pecas) {
          if (nomesAntes.has(p.name)) continue;
          const ate = p.position.clone();
          const de = ate
            .clone()
            .add(
              p.name === "suporte"
                ? new THREE.Vector3(0, 0.25, 0)
                : new THREE.Vector3(0, 0.04, 0.3),
            );
          p.position.copy(de);
          entradas.push({ obj: p, de, ate, t0: performance.now() });
        }
      }
      nomesAntes = new Set(pecas.map((p) => p.name));
      frame(kit, interacted);
      renderer.shadowMap.needsUpdate = true;
      dirty = true;
    },
    highlight(parte) {
      destaque = parte;
      aplicarMateriais(fantasmaAtual);
      dirty = true;
    },
    project([x, y, z]) {
      v.set(x, y, z).project(camera);
      return {
        x: ((v.x + 1) / 2) * host.clientWidth,
        y: ((1 - v.y) / 2) * host.clientHeight,
        atras: v.z > 1,
      };
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
      raioAntes = 0;
      if (kit) frame(kit, false);
      dirty = true;
    },
    stats: () => ({
      fps,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
    }),
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointermove", onMove);
      controls.dispose();
      disposeKit();
      Object.values(mats).forEach((m: THREE.Material & { alphaMap?: THREE.Texture | null }) => {
        m.alphaMap?.dispose();
        m.dispose();
      });
      acesos.forEach((m) => m.dispose());
      fantasmaMat.dispose();
      scene.environment?.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };
}
