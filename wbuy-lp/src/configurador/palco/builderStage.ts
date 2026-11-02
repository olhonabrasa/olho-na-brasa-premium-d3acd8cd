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
import {
  ambienteEstudio,
  buildKit,
  criarMateriais,
  espetoPeca,
  grelhaUruguaia,
} from "@/components/checkout/kit3d/geometry";
import logoSvg from "../../../../public/3d/logo-olho-na-brasa.svg?raw";
import {
  bandejaCoracao,
  baseCooktop,
  cestoMiudos,
  criarAmbiente,
  defumador,
  espetoGiratorio,
  posicionarDefumador,
  criarMateriaisCena,
  grelhaArgentina,
  posicionarAcessorio,
  type Acessorios,
  type Ambiente,
  type Instalacao,
} from "./cena3d";

export type StageOptions = {
  mobile: boolean;
  reducedMotion: boolean;
  /** pasta com os .hdr (precisa liberar CORS para a loja) */
  assetBase: string;
  onProgress?: (p: number) => void;
  /** clique numa peça (nome do grupo: suporte, grelha_uruguaia_0, espeto_simples_1...) ou no vazio */
  onPick?: (parte: string | null, x: number, y: number) => void;
  /** chamado depois de cada quadro desenhado (para reposicionar as cotas sobre o canvas) */
  onRender?: () => void;
};

export type UpdateOptions = {
  fantasma?: string[];
  destaque?: string | null;
  instalacao?: Instalacao;
  ambiente?: Ambiente;
  grelha?: "uruguaia" | "argentina";
  /** uma entrada por grelha física (tipo e medida de cada uma); sem isso, todas como na composição */
  grelhas?: { tipo: "uruguaia" | "argentina"; larguraCm: number; comprimentoCm: number }[];
  /** uma entrada por espeto (tipo e comprimento) */
  espetos?: { tipo: "espeto_duplo" | "espeto_chata" | "espeto_v"; comprimentoCm: number }[];
  acessorios?: Acessorios;
  /** boca da churrasqueira em cm, para desenhar o cenário */
  boca?: { a: number; b: number };
};

export type BuilderStage = {
  update: (c: Composicao, o?: UpdateOptions) => void;
  /** acende uma peça (nome exato) ou um grupo (lista de prefixos de nome) */
  highlight: (parte: string | string[] | null) => void;
  /** foco de leitura: só esta peça (prefixo de nome) fica a 1, as outras caem para 0,35; null desfaz */
  focar: (parte: string | null) => void;
  /** posição na tela (px, relativa ao canvas) de um ponto do kit em metros */
  project: (p: [number, number, number]) => { x: number; y: number; atras: boolean };
  setActive: (on: boolean) => void;
  resetView: () => void;
  stats: () => { fps: number; calls: number; triangles: number };
  dispose: () => void;
};

const ENV_ROTATION_Y = -2.3;
const ENV_FRENTE = 1.6;
const ENTRADA_MS = 520;
/** acessório adicionado: entra de cima com fade, sem quique */
const ENTRADA_ACC_MS = 320;
/** foco de leitura (passo 3): opacidade das outras peças e tempo da fusão */
const ESMAECIDO = 0.35;
const FOCO_MS = 150;

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
  const cenaMat = criarMateriaisCena(mats.inox);
  let ambiente: THREE.Group | null = null;
  let chaveAmbiente = "";
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

  // foco de leitura: as peças fora de foco usam uma cópia translúcida do material
  const esmaecidos = new Map<THREE.Material, THREE.Material>();
  const esmaecer = (m: THREE.Material) => {
    let e = esmaecidos.get(m);
    if (!e) {
      e = m.clone();
      e.transparent = true;
      e.opacity = 1;
      esmaecidos.set(m, e);
    }
    return e;
  };
  let foco: string | null = null;
  /** 0 = tudo a 1; 1 = outras peças a ESMAECIDO. Anda em FOCO_MS. */
  let focoAtual = 0;
  const casaFoco = (nome: string) => !!foco && (nome === foco || nome.startsWith(foco));

  let kit: THREE.Group | null = null;
  let nomesAntes = new Set<string>();
  let destaque: string[] = [];
  const casa = (nome: string) => destaque.some((d) => nome === d || nome.startsWith(d));
  let dirty = true;
  let active = false;
  let disposed = false;
  let framedOnce = false;
  let raioAntes = 0;
  const entradas: {
    obj: THREE.Object3D;
    de: THREE.Vector3;
    ate: THREE.Vector3;
    t0: number;
    ms: number;
    /** materiais translúcidos da peça que entra com fade */
    fade?: THREE.Material[];
  }[] = [];

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
  function unirPeca(peca: THREE.Object3D): THREE.Group {
    const gira = peca.getObjectByName("gira");
    if (gira && gira.parent === peca) {
      peca.remove(gira);
      const fixo = unirPeca(peca);
      gira.updateMatrixWorld(true);
      const g = unirPeca(gira);
      g.name = "gira";
      fixo.add(g);
      return fixo;
    }
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
    out.userData.base = true;
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
    const comFoco = focoAtual > 0;
    kit?.children.forEach((peca) => {
      const f = fantasma.includes(peca.name);
      const on = !f && (casa(peca.name) || casaFoco(peca.name));
      const fora = !f && comFoco && !casaFoco(peca.name);
      peca.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const base = o.userData.base as THREE.Material;
        o.material = f ? fantasmaMat : on ? acender(base) : fora ? esmaecer(base) : base;
        o.castShadow = !f;
      });
      peca.userData.fantasma = f;
    });
  }
  /** Opacidade das peças fora de foco acompanha focoAtual. */
  function aplicarFoco() {
    const op = 1 - (1 - ESMAECIDO) * focoAtual;
    esmaecidos.forEach((m) => (m.opacity = op));
  }
  let fantasmaAtual: string[] = [];

  function frame(obj: THREE.Object3D, manterCamera: boolean) {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    ground.position.y = box.min.y;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    // enquadra pela menor dimensão do canvas (no celular o palco é mais estreito que alto)
    // com a churrasqueira em volta, a câmera recua um pouco para mostrar o contexto
    const dist =
      (sphere.radius / (Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, camera.aspect))) *
      (ambiente?.children.length ? 0.98 : 1.05);
    controls.minDistance = dist * 0.45;
    controls.maxDistance = dist * 2.2;
    // só reenquadra quando o tamanho muda de verdade (trocar suporte), não a cada grelha
    const mudou = Math.abs(sphere.radius - raioAntes) / (raioAntes || 1) > 0.15;
    raioAntes = sphere.radius;
    if (!framedOnce || (!manterCamera && mudou)) {
      // com churrasqueira, de frente para a boca (como o cliente vê a dele); sem, 3/4 de estúdio
      const dir = (
        ambiente?.children.length
          ? new THREE.Vector3(0.42, 0.42, 1.35)
          : new THREE.Vector3(1, 0.55, 1.25)
      ).normalize();
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

  function montarAmbiente(o: UpdateOptions, c: Composicao) {
    const tipo = o.ambiente ?? "estudio";
    const a = (o.boca?.a ?? c.suporteLarguraCm) / 100;
    const b = (o.boca?.b ?? 60) / 100;
    const chave = [tipo, o.instalacao, a, b, c.peCm, c.suporteLarguraCm].join("|");
    if (chave === chaveAmbiente) return;
    chaveAmbiente = chave;
    if (ambiente) {
      scene.remove(ambiente);
      ambiente.traverse((m) => m instanceof THREE.Mesh && m.geometry.dispose());
    }
    ambiente = criarAmbiente(cenaMat, {
      tipo,
      instalacao: o.instalacao ?? "suspenso",
      a,
      b,
      peM: c.peCm / 100,
      suporteM: c.suporteLarguraCm / 100,
    });
    ambiente.traverse((m) => {
      if (m instanceof THREE.Mesh) {
        m.castShadow = false;
        m.receiveShadow = true;
      }
    });
    scene.add(ambiente);
    ground.visible = tipo === "estudio";
    // a câmera vai de frente com churrasqueira: o reflexo do estúdio gira junto,
    // para a softbox continuar caindo no inox
    scene.environmentRotation.y = ENV_ROTATION_Y + (tipo === "estudio" ? 0 : ENV_FRENTE);
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
    // palco largo: o kit vai um pouco para a direita e deixa a coluna de pílulas livre
    if (w >= 640) camera.setViewOffset(w, h, -w * 0.1, 0, w, h);
    else camera.clearViewOffset();
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

  let ultimoTick = performance.now();
  const tick = () => {
    const moved = controls.update();
    const agoraTick = performance.now();
    const dt = Math.min((agoraTick - ultimoTick) / 1000, 0.05);
    ultimoTick = agoraTick;
    if (!opts.reducedMotion && kit) {
      const gira = kit.getObjectByName("acc_giratorio")?.getObjectByName("gira");
      if (gira) {
        gira.rotation.z += dt * 1.6; // ~15 voltas por minuto, como o motor de verdade
        dirty = true;
      }
    }
    if (entradas.length) {
      const agora = performance.now();
      for (let i = entradas.length - 1; i >= 0; i--) {
        const e = entradas[i];
        const t = Math.min((agora - e.t0) / e.ms, 1);
        e.obj.position.lerpVectors(e.de, e.ate, ease(t));
        e.fade?.forEach((m) => (m.opacity = ease(t)));
        if (t >= 1) {
          entradas.splice(i, 1);
          if (e.fade) {
            aplicarMateriais(fantasmaAtual); // volta aos materiais de verdade
            e.fade.forEach((m) => m.dispose());
          }
          renderer.shadowMap.needsUpdate = true;
        }
      }
      dirty = true;
    }
    // foco de leitura: as outras peças descem para 0,35 (ou voltam) em FOCO_MS
    const focoAlvo = foco ? 1 : 0;
    if (focoAtual !== focoAlvo) {
      const passo = opts.reducedMotion ? 1 : (dt * 1000) / FOCO_MS;
      focoAtual =
        focoAlvo > focoAtual
          ? Math.min(focoAlvo, focoAtual + passo)
          : Math.max(0, focoAtual - passo);
      aplicarFoco();
      if (focoAtual === 0) aplicarMateriais(fantasmaAtual); // tudo de volta ao material base
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
      const cooktop = o.instalacao === "cooktop";
      const W = c.suporteLarguraCm / 100;
      // cooktop: o suporte apoia na base, sem os pés de parafusar na parede
      if (cooktop) {
        const sup = novo.getObjectByName("suporte");
        const pes: THREE.Object3D[] = [];
        sup?.traverse((m) => /^pe_/.test(m.name) && pes.push(m));
        pes.forEach((m) => m.removeFromParent());
        novo.add(baseCooktop(cenaMat, W, (o.boca?.b ?? 60) / 100));
      }
      // cada grelha física com o seu tipo e a sua medida (o buildKit desenha todas iguais)
      const FRAME_Z = -0.1;
      const grelhasOrig = novo.children.filter((x) => x.name.startsWith("grelha_uruguaia_"));
      grelhasOrig.forEach((g, i) => {
        const item = o.grelhas?.[i] ?? {
          tipo: o.grelha ?? "uruguaia",
          larguraCm: c.uruguaia.larguraCm,
          comprimentoCm: c.uruguaia.comprimentoCm,
        };
        const igual =
          item.tipo === "uruguaia" &&
          item.larguraCm === c.uruguaia.larguraCm &&
          item.comprimentoCm === c.uruguaia.comprimentoCm;
        if (igual) return;
        const gw = item.larguraCm / 100;
        const gd = item.comprimentoCm / 100;
        const nova =
          item.tipo === "argentina"
            ? grelhaArgentina(cenaMat, gw, gd, i)
            : grelhaUruguaia(mats, gw, gd, i);
        nova.position.set(g.position.x, g.position.y, FRAME_Z + 0.006 + 0.045 + gd / 2);
        novo.remove(g);
        novo.add(nova);
      });
      // cada espeto com o seu tipo (duplo ou simples) e comprimento
      const espetosOrig = novo.children.filter((x) => x.name.startsWith("espeto_"));
      espetosOrig.forEach((e, k) => {
        const item = o.espetos?.[k];
        if (!item) return;
        const duplo = item.tipo === "espeto_duplo";
        const novoEsp = espetoPeca(mats, item.comprimentoCm / 100, duplo, k);
        const Lp = novoEsp.userData.Lp as number;
        novoEsp.position.set(e.position.x, e.position.y, FRAME_Z - 0.025 + Lp + 0.015);
        if (item.tipo === "espeto_chata") novoEsp.name = "espeto_chata_" + k;
        if (item.tipo === "espeto_v") novoEsp.name = "espeto_v_" + k;
        novo.remove(e);
        novo.add(novoEsp);
      });
      const acc = o.acessorios;
      const meioOcupado = c.uruguaia.quantidade > c.uruguaia.porNivel;
      if (acc?.giratorio) {
        const gir = espetoGiratorio(cenaMat, !!acc.cesto);
        posicionarAcessorio(gir, W, 1, meioOcupado);
        novo.add(gir);
      } else if (acc?.cesto) {
        const cesto = cestoMiudos(cenaMat);
        posicionarAcessorio(cesto, W, 1, meioOcupado);
        novo.add(cesto);
      }
      if (acc?.bandeja) {
        const b = bandejaCoracao(cenaMat);
        posicionarAcessorio(b, W, -1, meioOcupado);
        novo.add(b);
      }
      if (acc?.defumador) {
        const d = defumador(cenaMat);
        posicionarDefumador(d, W, cooktop);
        novo.add(d);
      }
      montarAmbiente(o, c);
      novo.updateMatrixWorld(true);
      const pecas = novo.children.slice().map(unirPeca);
      disposeKit();
      kit = new THREE.Group();
      kit.name = novo.name;
      pecas.forEach((p) => kit!.add(p));
      scene.add(kit);
      if (o.destaque !== undefined) destaque = o.destaque ? [o.destaque] : [];
      fantasmaAtual = o.fantasma ?? [];
      aplicarMateriais(fantasmaAtual);
      // peça que não existia antes entra deslizando de frente (ou de cima, o suporte);
      // acessório entra de cima com fade, em 320 ms, sem quique
      if (!opts.reducedMotion && framedOnce) {
        for (const p of pecas) {
          if (nomesAntes.has(p.name)) continue;
          const acessorio = p.name.startsWith("acc_");
          const ate = p.position.clone();
          const de = ate
            .clone()
            .add(
              acessorio
                ? new THREE.Vector3(0, 0.06, 0)
                : p.name === "suporte"
                  ? new THREE.Vector3(0, 0.25, 0)
                  : new THREE.Vector3(0, 0.04, 0.3),
            );
          p.position.copy(de);
          let fade: THREE.Material[] | undefined;
          if (acessorio) {
            fade = [];
            p.traverse((o) => {
              if (!(o instanceof THREE.Mesh)) return;
              const m = (o.material as THREE.Material).clone();
              m.transparent = true;
              m.opacity = 0;
              o.material = m;
              fade!.push(m);
            });
          }
          entradas.push({
            obj: p,
            de,
            ate,
            t0: performance.now(),
            ms: acessorio ? ENTRADA_ACC_MS : ENTRADA_MS,
            fade,
          });
        }
      }
      nomesAntes = new Set(pecas.map((p) => p.name));
      frame(kit, interacted);
      renderer.shadowMap.needsUpdate = true;
      dirty = true;
    },
    highlight(parte) {
      destaque = parte === null ? [] : Array.isArray(parte) ? parte : [parte];
      aplicarMateriais(fantasmaAtual);
      dirty = true;
    },
    focar(parte) {
      if (parte === foco) return;
      foco = parte;
      if (opts.reducedMotion) {
        focoAtual = foco ? 1 : 0;
        aplicarFoco();
      } else if (foco && focoAtual === 0) focoAtual = 0.001; // já entra com a cópia translúcida
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
      cenaMat.texturas.forEach((t) => t.dispose());
      Object.values(cenaMat).forEach(
        (m) => m instanceof THREE.Material && m !== mats.inox && m.dispose(),
      );
      ambiente?.traverse((m) => m instanceof THREE.Mesh && m.geometry.dispose());
      fantasmaMat.dispose();
      esmaecidos.forEach((m) => m.dispose());
      scene.environment?.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };
}
