// Peças e cenário 3D da LP "Monte seu kit" que não existem no gerador do kit
// (geometry.ts): base do cooktop, grelha argentina, acessórios e a própria
// churrasqueira (fechada, abertura lateral, bancada cooktop e nicho gourmet).
// Mesmas unidades e eixos do buildKit: metros, y para cima, o suporte no plano
// z = -0,1 com as grelhas saindo para +z; base do suporte em y = 0,16.
import * as THREE from "three";

export const BASE_Y = 0.16;
export const FRAME_Z = -0.1;
const TUBO = 0.03;
const ALTURAS = [0.048, 0.175, 0.302].map((y) => y + BASE_Y);

export type Ambiente = "estudio" | "fechada" | "lateral" | "bancada" | "gourmet";
export type Instalacao = "suspenso" | "cooktop";
export type Acessorios = { cesto: boolean; giratorio: boolean; bandeja: boolean };

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function tubo(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, seg = 14) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), seg), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

function caixa(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  // textura em escala real: cada face repete o desenho pelo tamanho dela em metros
  const tile = mat.userData.tile as number | undefined;
  if (tile) {
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    const faces: [number, number][] = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ];
    for (let f = 0; f < 6; f++)
      for (let i = 0; i < 4; i++) {
        const k = f * 4 + i;
        uv.setXY(k, (uv.getX(k) * faces[f][0]) / tile, (uv.getY(k) * faces[f][1]) / tile);
      }
  }
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

// ---------- texturas desenhadas em canvas (nada para baixar) ----------

function canvasTex(
  w: number,
  h: number,
  desenhar: (x: CanvasRenderingContext2D) => void,
  repetir = true,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  desenhar(x);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** pseudoaleatório fixo: a cena sai igual em todo aparelho */
function sorteio(semente: number) {
  let s = semente;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function texTijolo() {
  const r = sorteio(7);
  return canvasTex(512, 512, (x) => {
    x.fillStyle = "#cfc6b8"; // rejunte
    x.fillRect(0, 0, 512, 512);
    const lh = 64;
    for (let fila = 0; fila < 8; fila++) {
      const off = fila % 2 ? -64 : 0;
      for (let col = -1; col < 5; col++) {
        const v = 0.85 + r() * 0.3;
        x.fillStyle = `rgb(${Math.round(196 * v)},${Math.round(150 * v)},${Math.round(116 * v)})`;
        x.fillRect(col * 128 + off + 4, fila * lh + 4, 120, lh - 8);
      }
    }
  });
}

function texGranito(base: string, pontos: string[]) {
  const r = sorteio(11);
  return canvasTex(512, 512, (x) => {
    x.fillStyle = base;
    x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      x.fillStyle = pontos[Math.floor(r() * pontos.length)];
      const s = 1 + r() * 2.2;
      x.fillRect(r() * 512, r() * 512, s, s);
    }
  });
}

function texMarmore() {
  const r = sorteio(23);
  return canvasTex(1024, 1024, (x) => {
    x.fillStyle = "#e9e7e3";
    x.fillRect(0, 0, 1024, 1024);
    x.strokeStyle = "rgba(120,120,128,0.35)";
    for (let v = 0; v < 14; v++) {
      x.lineWidth = 0.6 + r() * 2.4;
      x.beginPath();
      let px = r() * 1024;
      let py = 0;
      x.moveTo(px, py);
      while (py < 1024) {
        px += (r() - 0.5) * 90;
        py += 30 + r() * 60;
        x.lineTo(px, py);
      }
      x.stroke();
    }
  });
}

function texEscovado() {
  const r = sorteio(5);
  return canvasTex(256, 256, (x) => {
    x.fillStyle = "#808080";
    x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
      x.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},0.06)`;
      x.fillRect(0, r() * 256, 256, 1);
    }
  });
}

/** chapa perfurada: furos redondos em alpha (bandeja de coração) */
function texFuros() {
  return canvasTex(256, 256, (x) => {
    x.fillStyle = "#fff";
    x.fillRect(0, 0, 256, 256);
    x.fillStyle = "#000";
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++) {
        x.beginPath();
        x.arc(21 + i * 43 + (j % 2) * 21, 21 + j * 43, 11, 0, Math.PI * 2);
        x.fill();
      }
  });
}

export type CenaMateriais = ReturnType<typeof criarMateriaisCena>;

export function criarMateriaisCena(inox: THREE.Material) {
  const tijolo = texTijolo();
  const granitoPreto = texGranito("#262628", [
    "#36363a",
    "#141415",
    "#48484c",
    "#1d1d1f",
    "#5a5a5e",
  ]);
  const marmore = texMarmore();
  const refratario = texTijolo();
  const escovado = texEscovado();
  const furos = texFuros();
  return {
    inox,
    tijolo: new THREE.MeshStandardMaterial({
      name: "tijolo",
      map: tijolo,
      roughness: 0.92,
      metalness: 0,
      userData: { tile: 0.52 },
    }),
    refratario: new THREE.MeshStandardMaterial({
      name: "refratario",
      map: refratario,
      color: 0xb08a6a, // tijolo refratário já pegou fumaça
      roughness: 0.95,
      userData: { tile: 0.4 },
    }),
    granito: new THREE.MeshStandardMaterial({
      name: "granito",
      map: granitoPreto,
      roughness: 0.3,
      metalness: 0.05,
      userData: { tile: 0.6 },
    }),
    marmore: new THREE.MeshStandardMaterial({
      name: "marmore",
      map: marmore,
      color: 0xe6e2dc,
      roughness: 0.22,
      metalness: 0,
      userData: { tile: 1.4 },
    }),
    chapa: new THREE.MeshStandardMaterial({
      name: "chapa_escovada",
      color: 0xe4e7ea,
      metalness: 0.85,
      roughness: 0.42,
      roughnessMap: escovado,
    }),
    vidro: new THREE.MeshStandardMaterial({
      name: "vidro",
      color: 0xcfe3e6,
      metalness: 0.1,
      roughness: 0.05,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
    carvao: new THREE.MeshStandardMaterial({ name: "carvao", color: 0x1b1715, roughness: 0.9 }),
    brasa: new THREE.MeshStandardMaterial({
      name: "brasa",
      color: 0x3a120a,
      emissive: 0xff4a12,
      emissiveIntensity: 1.6,
      roughness: 0.8,
    }),
    preto: new THREE.MeshStandardMaterial({
      name: "plastico_preto",
      color: 0x111111,
      roughness: 0.4,
    }),
    perfurado: new THREE.MeshStandardMaterial({
      name: "inox_perfurado",
      color: 0xeef1f4,
      metalness: 1,
      roughness: 0.12,
      alphaMap: furos,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    }),
    texturas: [tijolo, granitoPreto, marmore, refratario, escovado, furos],
  };
}

// ---------- peças ----------

/** Quadro de tubo quadrado que apoia na bancada (encaixe cooktop). */
export function baseCooktop(M: CenaMateriais, larguraM: number, profM: number) {
  const g = new THREE.Group();
  g.name = "cooktop_base";
  const t = 0.025;
  const y = BASE_Y - t / 2;
  const z0 = FRAME_Z - TUBO;
  const z1 = FRAME_Z + Math.max(profM - 0.04, 0.3);
  const w = larguraM + 0.02;
  g.add(caixa(w, t, t, M.inox, 0, y, z0 + t / 2));
  g.add(caixa(w, t, t, M.inox, 0, y, z1 - t / 2));
  g.add(caixa(t, t, z1 - z0, M.inox, -w / 2 + t / 2, y, (z0 + z1) / 2));
  g.add(caixa(t, t, z1 - z0, M.inox, w / 2 - t / 2, y, (z0 + z1) / 2));
  // abas que seguram o suporte na base
  [-1, 1].forEach((s) =>
    g.add(caixa(0.004, 0.06, 0.05, M.inox, s * (w / 2 - t - 0.002), BASE_Y + 0.03, z0 + 0.04)),
  );
  return g;
}

/** Grelha argentina: canaletas em V levemente inclinadas, dois cabos na frente. */
export function grelhaArgentina(M: CenaMateriais, gw: number, gd: number, idx: number) {
  const g = new THREE.Group();
  g.name = "grelha_argentina_" + idx;
  const xo = gw / 2 - 0.006;
  [-1, 1].forEach((s) =>
    g.add(tubo(V(s * xo, 0, -gd / 2 - 0.04), V(s * xo, 0, gd / 2 + 0.02), 0.0035, M.inox)),
  );
  [-(gd / 2 - 0.01), gd / 2 - 0.01].forEach((z) =>
    g.add(tubo(V(-gw / 2, -0.006, z), V(gw / 2, -0.006, z), 0.0035, M.inox)),
  );
  const n = Math.max(Math.floor((gw - 0.02) / 0.026), 3);
  const passo = (gw - 0.03) / (n - 1);
  for (let i = 0; i < n; i++) {
    const x = -gw / 2 + 0.015 + i * passo;
    const canal = new THREE.Group();
    const lado = 0.011;
    [-1, 1].forEach((s) => {
      const aba = caixa(0.0015, lado, gd, M.inox);
      aba.position.set(s * 0.0045, 0.002, 0);
      aba.rotation.z = s * 0.45;
      canal.add(aba);
    });
    canal.position.x = x;
    canal.rotation.x = -0.035; // caimento para a gordura escorrer
    g.add(canal);
  }
  [-1, 1].forEach((s) => {
    const x = s * (gw / 2 - 0.03);
    g.add(tubo(V(x, -0.004, gd / 2), V(x, -0.016, gd / 2 + 0.06), 0.003, M.inox));
    g.add(tubo(V(x, -0.016, gd / 2 + 0.06), V(x, -0.016, gd / 2 + 0.19), 0.0155, M.inox, 24));
  });
  return g;
}

/** Cesto de miúdos: gaiola cilíndrica no espeto (com motor no combo giratório). */
export function cestoMiudos(M: CenaMateriais, comMotor: boolean) {
  const g = new THREE.Group();
  g.name = comMotor ? "acc_giratorio" : "acc_cesto";
  const r = 0.06;
  const len = 0.26;
  const z0 = 0.03;
  [z0, z0 + len].forEach((z) => {
    const disco = new THREE.Mesh(
      new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.003, 32),
      M.inox,
    );
    disco.rotation.x = Math.PI / 2;
    disco.position.z = z;
    g.add(disco);
  });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    g.add(
      tubo(
        V(Math.cos(a) * r, Math.sin(a) * r, z0),
        V(Math.cos(a) * r, Math.sin(a) * r, z0 + len),
        0.0024,
        M.inox,
        8,
      ),
    );
  }
  g.add(tubo(V(0, 0, -0.02), V(0, 0, z0 + len + 0.12), 0.0035, M.inox));
  const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.025, 12), M.inox);
  ponta.rotation.x = -Math.PI / 2;
  ponta.position.z = -0.032;
  g.add(ponta);
  const zc = z0 + len + 0.12;
  if (comMotor) {
    g.add(tubo(V(0, 0, zc), V(0, 0, zc + 0.2), 0.022, M.inox, 28));
    const tampa = new THREE.Mesh(new THREE.CylinderGeometry(0.0225, 0.0225, 0.012, 28), M.preto);
    tampa.rotation.x = Math.PI / 2;
    tampa.position.z = zc + 0.206;
    g.add(tampa);
  } else g.add(tubo(V(0, 0, zc), V(0, 0, zc + 0.13), 0.0155, M.inox, 24));
  g.userData.alturaExtra = r;
  return g;
}

/** Bandeja de coração: caixa perfurada com duas pontas e cabo. */
export function bandejaCoracao(M: CenaMateriais) {
  const g = new THREE.Group();
  g.name = "acc_bandeja";
  const w = 0.085;
  const h = 0.045;
  const len = 0.24;
  const z0 = 0.02;
  const zc = z0 + len / 2;
  g.add(caixa(w, 0.002, len, M.perfurado, 0, -h / 2, zc));
  [-1, 1].forEach((s) => g.add(caixa(0.002, h, len, M.perfurado, (s * w) / 2, 0, zc)));
  [z0, z0 + len].forEach((z) => g.add(caixa(w, h, 0.002, M.inox, 0, 0, z)));
  g.add(caixa(0.002, h, len, M.inox, 0, 0, zc)); // divisória do meio
  [-1, 1].forEach((s) => {
    g.add(tubo(V(s * 0.02, -h / 2 + 0.01, z0), V(s * 0.02, -h / 2 + 0.01, -0.12), 0.003, M.inox));
    g.add(tubo(V(s * 0.03, 0, z0 + len), V(0, 0, z0 + len + 0.06), 0.003, M.inox));
  });
  g.add(tubo(V(0, 0, z0 + len + 0.06), V(0, 0, z0 + len + 0.18), 0.0155, M.inox, 24));
  g.userData.alturaExtra = h / 2;
  return g;
}

/** Posição dos acessórios no suporte: nível do meio, encostados nas laterais. */
export function posicionarAcessorio(
  peca: THREE.Object3D,
  larguraM: number,
  lado: -1 | 1,
  nivelOcupado: boolean,
) {
  const extra = (peca.userData.alturaExtra as number) ?? 0.03;
  const y = ALTURAS[1] + extra + 0.006 + (nivelOcupado ? 0.05 : 0);
  peca.position.set(lado * (larguraM / 2 - 0.09), y, FRAME_Z + 0.005);
}

// ---------- a churrasqueira ----------

export type AmbienteParams = {
  tipo: Ambiente;
  instalacao: Instalacao;
  /** boca (A) e profundidade (B) em metros */
  a: number;
  b: number;
  peM: number;
  /** largura do suporte em metros (o cooktop precisa da bancada um pouco maior) */
  suporteM: number;
};

/** Monta a churrasqueira em volta do kit. Nada aqui projeta sombra (só recebe). */
export function criarAmbiente(M: CenaMateriais, p: AmbienteParams) {
  const g = new THREE.Group();
  g.name = "ambiente_" + p.tipo;
  if (p.tipo === "estudio") return g;
  const cook = p.instalacao === "cooktop";
  const A = Math.max(p.a, p.suporteM + 0.02);
  const B = Math.max(p.b, 0.4);
  const fundoZ = cook ? FRAME_Z - TUBO - 0.012 : FRAME_Z - TUBO - p.peM - 0.004;
  const frenteZ = fundoZ + B;
  const pisoY = cook ? BASE_Y - 0.025 : 0; // bancada do cooktop ou piso do braseiro
  const altura = 0.82;
  const topoY = pisoY + altura;
  const parede = 0.12;
  const cz = (fundoZ + frenteZ) / 2;

  // revestimento por tipo
  const casca = p.tipo === "fechada" ? M.tijolo : p.tipo === "lateral" ? M.marmore : M.granito;
  const interno = p.tipo === "fechada" ? M.refratario : M.chapa;

  // piso: braseiro aberto (suspenso) ou bancada com a boca do braseiro (cooktop)
  if (cook) {
    const furoW = A - 0.04;
    const furoD = B - 0.08;
    const zf0 = fundoZ + 0.04;
    const larg = p.tipo === "bancada" ? A + 0.9 : A;
    const esp = 0.03;
    const yb = pisoY - esp / 2;
    const tampo =
      p.tipo === "fechada"
        ? M.granito
        : p.tipo === "lateral"
          ? M.marmore
          : p.tipo === "bancada"
            ? M.granito
            : M.chapa;
    const prof = p.tipo === "bancada" ? B + 0.35 : B;
    const zTampo0 = fundoZ;
    const zTampo1 = fundoZ + prof;
    // quatro faixas em volta do furo
    g.add(caixa(larg, esp, zf0 - zTampo0, tampo, 0, yb, (zTampo0 + zf0) / 2));
    g.add(caixa(larg, esp, zTampo1 - (zf0 + furoD), tampo, 0, yb, (zf0 + furoD + zTampo1) / 2));
    const lat = (larg - furoW) / 2;
    [-1, 1].forEach((s) =>
      g.add(caixa(lat, esp, furoD, tampo, s * (furoW / 2 + lat / 2), yb, zf0 + furoD / 2)),
    );
    // poço do braseiro
    const fundoPoco = pisoY - 0.32;
    [-1, 1].forEach((s) =>
      g.add(
        caixa(
          0.02,
          0.32,
          furoD,
          M.refratario,
          s * (furoW / 2 + 0.01),
          pisoY - 0.16 - esp,
          zf0 + furoD / 2,
        ),
      ),
    );
    g.add(caixa(furoW, 0.32, 0.02, M.refratario, 0, pisoY - 0.16 - esp, zf0 - 0.01));
    g.add(caixa(furoW, 0.32, 0.02, M.refratario, 0, pisoY - 0.16 - esp, zf0 + furoD + 0.01));
    g.add(caixa(furoW, 0.02, furoD, M.refratario, 0, fundoPoco, zf0 + furoD / 2));
    brasas(g, M, furoW - 0.04, furoD - 0.04, fundoPoco + 0.01, zf0 + furoD / 2);
    if (p.tipo === "bancada") {
      // bancada solta: só o painel de inox atrás, como nas fotos do showroom
      g.add(caixa(larg, 0.62, 0.012, M.chapa, 0, pisoY + 0.31, fundoZ - 0.006));
      g.add(caixa(larg, 0.86, 0.6, M.granito, 0, pisoY - 0.03 - 0.43, cz + 0.05)); // corpo abaixo da bancada
      return g;
    }
  } else {
    g.add(caixa(A, 0.06, B, M.refratario, 0, pisoY - 0.03, cz));
    brasas(g, M, A - 0.1, B - 0.12, pisoY, cz);
  }

  // paredes da churrasqueira (fechada, lateral e nicho gourmet)
  const larguraExt = A + parede * 2;
  const baseY = pisoY - 0.7; // corpo até o chão da área gourmet (fora de quadro)
  g.add(caixa(A, topoY - pisoY, 0.012, interno, 0, (pisoY + topoY) / 2, fundoZ - 0.006));
  g.add(
    caixa(
      larguraExt,
      topoY - baseY,
      parede,
      casca,
      0,
      (baseY + topoY) / 2,
      fundoZ - 0.012 - parede / 2,
    ),
  );
  // esquerda sempre
  g.add(caixa(0.012, topoY - pisoY, B, interno, -A / 2 - 0.006, (pisoY + topoY) / 2, cz));
  g.add(
    caixa(
      parede,
      topoY - baseY,
      B + 0.012,
      casca,
      -A / 2 - 0.012 - parede / 2,
      (baseY + topoY) / 2,
      cz,
    ),
  );
  // direita: vidro na abertura lateral
  if (p.tipo === "lateral") {
    g.add(caixa(0.01, topoY - pisoY, B, M.vidro, A / 2 + 0.005, (pisoY + topoY) / 2, cz));
    g.add(caixa(0.5, 0.04, B + 0.1, M.marmore, A / 2 + 0.25, pisoY - 0.02, cz + 0.05));
  } else {
    g.add(caixa(0.012, topoY - pisoY, B, interno, A / 2 + 0.006, (pisoY + topoY) / 2, cz));
    g.add(
      caixa(
        parede,
        topoY - baseY,
        B + 0.012,
        casca,
        A / 2 + 0.012 + parede / 2,
        (baseY + topoY) / 2,
        cz,
      ),
    );
  }
  // teto, frente abaixo da boca e bancada da frente
  g.add(caixa(larguraExt, 0.14, B + 0.13, casca, 0, topoY + 0.07, cz - 0.06));
  g.add(
    caixa(
      larguraExt,
      pisoY - 0.04 - baseY,
      0.1,
      casca,
      0,
      (baseY + pisoY - 0.04) / 2,
      frenteZ - 0.05,
    ),
  );
  const bancada = p.tipo === "fechada" ? M.granito : casca;
  g.add(caixa(larguraExt + 0.5, 0.04, 0.42, bancada, 0, pisoY - 0.02, frenteZ + 0.16));
  if (p.tipo === "fechada") {
    // coifa em alvenaria
    const coifa = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, larguraExt * 0.62, 0.55, 4, 1),
      M.tijolo,
    );
    coifa.rotation.y = Math.PI / 4;
    coifa.scale.z = (B * 0.9) / larguraExt;
    coifa.position.set(0, topoY + 0.14 + 0.275, cz - 0.05);
    g.add(coifa);
  }
  if (p.tipo === "gourmet") {
    // nicho largo em granito, com respiro de inox em cima
    g.add(caixa(larguraExt + 0.4, 0.5, B + 0.25, M.granito, 0, topoY + 0.14 + 0.25, cz - 0.02));
  }
  return g;
}

function brasas(g: THREE.Group, M: CenaMateriais, w: number, d: number, y: number, cz: number) {
  const r = sorteio(3);
  const n = Math.round(Math.min(Math.max(w * d * 1400, 40), 160));
  const pedras = new THREE.IcosahedronGeometry(0.5, 0);
  const carvao = new THREE.InstancedMesh(pedras, M.carvao, n);
  const acesas = new THREE.InstancedMesh(pedras, M.brasa, Math.round(n * 0.45));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const esc = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const s = 0.014 + r() * 0.018;
    pos.set((r() - 0.5) * w, y + s * 0.4, cz + (r() - 0.5) * d);
    e.set(r() * 3, r() * 3, r() * 3);
    esc.set(s, s * 0.7, s * 1.2);
    m.compose(pos, q.setFromEuler(e), esc);
    if (i < acesas.count) acesas.setMatrixAt(i, m);
    else carvao.setMatrixAt(i - acesas.count, m);
  }
  carvao.count = n - acesas.count;
  g.add(carvao, acesas);
}
