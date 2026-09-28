// Gerador procedural do Kit Suporte Suspenso — porte do kit3d/geometria.js do
// projeto de design (Claude Design, "Configurador 3D Churrascaria", usado pelo
// three-d-stage.js / Modelo 3D.html). A geometria é a mesma; mudou só:
//  - recebe a Composicao pronta (src/lib/kitComposition.ts), sem regra própria;
//  - materiais criados uma vez e reaproveitados entre reconstruções;
//  - no celular, menos segmentos nos cilindros e material sem clearcoat.
// Unidades em metros, y para cima; o suporte fica no plano z = -0,1 e as
// grelhas saem para +z (em direção à boca).
import * as THREE from "three";
import type { Composicao } from "@/lib/kitComposition";

export type KitMaterials = {
  inox: THREE.MeshStandardMaterial;
  tubo: THREE.MeshStandardMaterial;
  placa: THREE.MeshStandardMaterial;
  logo: THREE.MeshStandardMaterial;
  parafuso: THREE.MeshStandardMaterial;
};

export type Quality = { mobile: boolean };

function carregarLogo(url: string) {
  const mat = new THREE.MeshStandardMaterial({
    name: "logo_gravado",
    color: 0x1c1c1c,
    metalness: 0.3,
    roughness: 0.55,
    transparent: true,
    alphaTest: 0.3,
  });
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 342;
    const x = c.getContext("2d");
    if (!x) return;
    x.drawImage(img, 0, 0, c.width, c.height);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = "#fff";
    x.fillRect(0, 0, c.width, c.height);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    mat.alphaMap = tex;
    mat.needsUpdate = true;
  };
  img.src = url;
  return mat;
}

export function criarMateriais(q: Quality, logoUrl: string): KitMaterials {
  const espelho = (name: string, color: number, rough: number) => {
    const m = q.mobile
      ? new THREE.MeshStandardMaterial({ name, color, metalness: 1, roughness: rough })
      : new THREE.MeshPhysicalMaterial({
          name,
          color,
          metalness: 1,
          roughness: rough,
          clearcoat: 0.35,
          clearcoatRoughness: 0.04,
        });
    m.envMapIntensity = 1.15;
    return m;
  };
  return {
    inox: espelho("inox_polido_espelhado", 0xf4f6f8, 0.045),
    tubo: espelho("inox_estrutura_espelhado", 0xeef1f4, 0.06),
    placa: espelho("placa_inox_escovada", 0xe2e5e8, 0.22),
    logo: carregarLogo(logoUrl),
    parafuso: espelho("fixacao_inox", 0xd9dde1, 0.14),
  };
}

/**
 * Ambiente de estúdio sintético do projeto de design (aplicarEstudio): usado
 * enquanto o HDRI carrega e se ele falhar. Sala escura, softboxes e faixas pretas.
 */
export function ambienteEstudio(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x2e2b27);
  const painel = (
    cor: number,
    int: number,
    w: number,
    h: number,
    pos: [number, number, number],
    rot: [number, number, number],
  ) => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(cor).multiplyScalar(int),
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    env.add(m);
  };
  painel(0xfff6ea, 7, 7, 1.6, [0, 4, -1.2], [Math.PI / 2, 0, 0]);
  painel(0xfff6ea, 5, 7, 1.0, [0, 4, 1.4], [Math.PI / 2, 0, 0]);
  painel(0xffffff, 4, 3.2, 4.2, [-4.5, 1.6, -0.6], [0, Math.PI / 2, 0]);
  painel(0xffffff, 3, 3.2, 4.2, [4.5, 1.6, 0.6], [0, -Math.PI / 2, 0]);
  painel(0xffe6c8, 3, 7, 1.4, [0, 0.6, 5], [0, Math.PI, 0]);
  painel(0xffffff, 2, 5, 3, [0, 1.6, -5], [0, 0, 0]);
  painel(0x8a8378, 1, 14, 14, [0, -1.5, 0], [-Math.PI / 2, 0, 0]);
  painel(0x0c0b0a, 1, 2.2, 4, [-4.4, 1.6, 3.2], [0, Math.PI / 2, 0]);
  painel(0x0c0b0a, 1, 2.2, 4, [4.4, 1.6, -3.0], [0, -Math.PI / 2, 0]);
  painel(0x0c0b0a, 1, 7, 1.2, [0, 2.4, 4.9], [0, Math.PI, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  env.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  return tex;
}

/* ---------- peças ---------- */

let SEG = { grosso: 40, fino: 16, cone: 20, curva: 6, bevel: 4 };

function roundedBox(
  w: number,
  h: number,
  d: number,
  r: number,
  mat: THREE.Material,
  name?: string,
) {
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4);
  const sh = new THREE.Shape();
  const x = -w / 2 + r,
    y = -h / 2 + r,
    iw = w - 2 * r,
    ih = h - 2 * r;
  sh.moveTo(x, y - r);
  sh.lineTo(x + iw, y - r);
  sh.quadraticCurveTo(x + iw + r, y - r, x + iw + r, y);
  sh.lineTo(x + iw + r, y + ih);
  sh.quadraticCurveTo(x + iw + r, y + ih + r, x + iw, y + ih + r);
  sh.lineTo(x, y + ih + r);
  sh.quadraticCurveTo(x - r, y + ih + r, x - r, y + ih);
  sh.lineTo(x - r, y);
  sh.quadraticCurveTo(x - r, y - r, x, y - r);
  const br = Math.min(r, d / 2 - 1e-4);
  const geo = new THREE.ExtrudeGeometry(sh, {
    depth: d - 2 * br,
    bevelEnabled: true,
    bevelThickness: br,
    bevelSize: 0,
    bevelSegments: SEG.bevel,
    curveSegments: SEG.curva,
  });
  geo.translate(0, 0, -(d - 2 * br) / 2);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  if (name) m.name = name;
  return m;
}

function box(w: number, h: number, d: number, mat: THREE.Material, name?: string) {
  if (/espelhado|polido/.test(mat.name) && Math.min(w, h, d) > 0.005)
    return roundedBox(w, h, d, Math.min(w, h, d) * 0.22, mat, name);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  if (name) m.name = name;
  return m;
}

function tube(
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
  mat: THREE.Material,
  name?: string,
  seg?: number,
) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, len, seg || (r > 0.008 ? SEG.grosso : SEG.fino)),
    mat,
  );
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  if (name) m.name = name;
  return m;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function suporteFrame(
  MAT: KitMaterials,
  W: number,
  H: number,
  alturasLocais: number[],
  peM: number,
  nDiv: number,
) {
  const g = new THREE.Group();
  g.name = "suporte";
  const t = 0.03;

  const colEsq = box(t, H, t, MAT.tubo, "coluna_esq");
  colEsq.position.set(-W / 2 + t / 2, H / 2, -t / 2);
  g.add(colEsq);
  const colDir = box(t, H, t, MAT.tubo, "coluna_dir");
  colDir.position.set(W / 2 - t / 2, H / 2, -t / 2);
  g.add(colDir);
  const travSup = box(W - 2 * t, t, t, MAT.tubo, "travessa_superior");
  travSup.position.set(0, H - t / 2, -t / 2);
  g.add(travSup);
  const travInf = box(W - 2 * t, t, t, MAT.tubo, "travessa_inferior");
  travInf.position.set(0, t / 2, -t / 2);
  g.add(travInf);

  const divXs: number[] = [];
  for (let d = 1; d <= nDiv; d++) divXs.push(-W / 2 + (d * W) / (nDiv + 1));
  divXs.forEach((x, i) => {
    const mv = box(0.006, H - 2 * t, 0.018, MAT.tubo, "montante_" + i);
    mv.position.set(x, H / 2, -0.012);
    g.add(mv);
  });

  const cw = W - 2 * t;
  alturasLocais.forEach((y, ni) => {
    const barB = box(cw, 0.011, 0.028, MAT.inox, "trilho_inferior_nivel" + ni);
    barB.position.set(0, y - 0.0095, 0.016);
    g.add(barB);
    const barT = box(cw, 0.011, 0.028, MAT.inox, "trilho_superior_nivel" + ni);
    barT.position.set(0, y + 0.0135, 0.016);
    g.add(barT);
    const supXs = [-cw / 2 + 0.012, cw / 2 - 0.012].concat(divXs);
    supXs.forEach((x, si) => {
      const s = box(0.012, 0.036, 0.016, MAT.inox, "suporte_trilho_n" + ni + "_" + si);
      s.position.set(x, y + 0.002, 0.002);
      g.add(s);
    });
  });

  // pés: haste + chapa dobrada + parafuso, atrás das colunas
  [-1, 1].forEach((sd, si) => {
    [0.085, H - 0.085].forEach((y, yi) => {
      const xP = sd * (W / 2 - t - 0.004);
      const haste = box(0.006, 0.046, peM, MAT.inox, `pe_haste_${si}_${yi}`);
      haste.position.set(xP, y, -t - peM / 2);
      g.add(haste);
      const chapa = box(0.03, 0.05, 0.004, MAT.inox, `pe_chapa_${si}_${yi}`);
      chapa.position.set(xP, y, -t - peM - 0.002);
      g.add(chapa);
      const par = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.006, 24), MAT.parafuso);
      par.name = `pe_parafuso_${si}_${yi}`;
      par.rotation.x = Math.PI / 2;
      par.position.set(xP, y, -t - peM - 0.006);
      g.add(par);
    });
  });

  const placa = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.061, 0.004), MAT.placa);
  placa.name = "placa_marca";
  placa.position.set(0, H - 0.085, 0.012);
  g.add(placa);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.072, 0.024), MAT.logo);
  logo.name = "logo_gravado";
  logo.position.set(0, H - 0.085, 0.0142);
  g.add(logo);

  return g;
}

function grelhaUruguaia(MAT: KitMaterials, gw: number, gd: number, idx: number) {
  const g = new THREE.Group();
  g.name = "grelha_uruguaia_" + idx;
  const gr = 0.0024,
    xo = gw / 2 - 0.004;
  [-1, 1].forEach((s, i) =>
    g.add(
      tube(
        V(s * xo, 0, -gd / 2 - 0.045),
        V(s * xo, 0, gd / 2 + 0.028),
        0.0028,
        MAT.inox,
        "varao_externo_" + i,
      ),
    ),
  );
  const n = Math.floor((gw - 0.02) / 0.018);
  for (let i = 0; i <= n; i++) {
    const x = -gw / 2 + 0.012 + i * 0.018;
    if (x > gw / 2 - 0.01) break;
    g.add(tube(V(x, 0, -gd / 2), V(x, 0, gd / 2), gr, MAT.inox, "varao_" + i));
  }
  [-(gd / 2 - 0.008), 0, gd / 2 - 0.008].forEach((z, i) => {
    g.add(tube(V(-gw / 2, -0.0055, z), V(gw / 2, -0.0055, z), 0.0028, MAT.inox, "travessa_" + i));
  });
  [-1, 1].forEach((s, i) => {
    const x1 = s * xo,
      x2 = s * (xo - 0.009),
      yH = -0.016;
    const pA = V(x1, 0, gd / 2 + 0.028);
    const pB = V(x2, yH, gd / 2 + 0.052);
    g.add(tube(pA, pB, 0.0028, MAT.inox, "curva_s_" + i));
    g.add(tube(pB, V(x2, yH, gd / 2 + 0.058), 0.0028, MAT.inox, "entrada_cabo_" + i));
    g.add(
      tube(V(x2, yH, gd / 2 + 0.058), V(x2, yH, gd / 2 + 0.188), 0.0155, MAT.inox, "cabo_" + i),
    );
  });
  return g;
}

function grelhaDescanso(MAT: KitMaterials, dw: number, dd: number, idx: number) {
  const g = new THREE.Group();
  g.name = "grelha_descanso_" + idx;
  const xo = dw / 2 - 0.003;
  [-1, 1].forEach((s, i) =>
    g.add(
      tube(
        V(s * xo, 0, -dd / 2 - 0.04),
        V(s * xo, 0, dd / 2),
        0.0026,
        MAT.inox,
        "varao_externo_" + i,
      ),
    ),
  );
  const n = Math.floor((dw - 0.016) / 0.0135);
  for (let i = 0; i <= n; i++) {
    const x = -dw / 2 + 0.009 + i * 0.0135;
    if (x > dw / 2 - 0.008) break;
    g.add(tube(V(x, 0, -dd / 2), V(x, 0, dd / 2), 0.002, MAT.inox, "varao_" + i));
  }
  [-(dd / 2 - 0.006), dd / 2 - 0.006].forEach((z, i) => {
    g.add(tube(V(-dw / 2, -0.005, z), V(dw / 2, -0.005, z), 0.0026, MAT.inox, "travessa_" + i));
  });
  return g;
}

function espetoPeca(MAT: KitMaterials, totalM: number, duplo: boolean, idx: number) {
  const g = new THREE.Group();
  g.name = (duplo ? "espeto_duplo_" : "espeto_simples_") + idx;
  const cabo = 0.13;
  const Lp = Math.max(totalM - cabo - 0.016, 0.25);
  const tips: number[] = [];
  g.add(tube(V(0, 0, cabo), V(0, 0, 0), 0.0155, MAT.inox, "cabo"));
  if (duplo) {
    [-1, 1].forEach((s, i) => {
      g.add(tube(V(0, 0, 0), V(s * 0.023, 0, -0.1), 0.0042, MAT.inox, "v_" + i));
      g.add(tube(V(s * 0.023, 0, -0.1), V(s * 0.023, 0, -Lp), 0.0038, MAT.inox, "ponta_" + i));
      tips.push(s * 0.023);
    });
  } else {
    g.add(tube(V(0, 0, 0), V(0, 0, -Lp), 0.004, MAT.inox, "ponta_0"));
    tips.push(0);
  }
  tips.forEach((x, i) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.0042, 0.032, SEG.cone), MAT.inox);
    cone.name = "ponteira_" + i;
    cone.rotation.x = -Math.PI / 2;
    cone.position.set(x, 0, -Lp - 0.015);
    g.add(cone);
  });
  g.userData.Lp = Lp;
  return g;
}

function alturasNiveis(n: number, H: number) {
  const m = 0.048,
    span = H - 2 * m,
    a: number[] = [];
  for (let i = 0; i < n; i++) a.push(m + (n === 1 ? 0 : (i * span) / (n - 1)));
  return a;
}

/** Monta o kit a partir da composição. Mesmo algoritmo de posicionamento do buildKit original. */
export function buildKit(c: Composicao, MAT: KitMaterials, q: Quality) {
  SEG = q.mobile
    ? { grosso: 24, fino: 10, cone: 12, curva: 4, bevel: 2 }
    : { grosso: 40, fino: 16, cone: 20, curva: 6, bevel: 4 };

  const W = c.suporteLarguraCm / 100;
  const peM = c.peCm / 100;
  const niveis = c.niveis;
  const H = 0.35;
  const base = 0.16;
  const nPorNivel = Math.max(c.uruguaia.porNivel, 1);
  const nDiv = Math.max(nPorNivel - 1, 1);
  const g = new THREE.Group();
  g.name = "kit_suporte_suspenso";

  const frameZ = -0.1;
  const alturasLocais = alturasNiveis(niveis, H);
  const frame = suporteFrame(MAT, W, H, alturasLocais, peM, nDiv);
  frame.position.set(0, base, frameZ);
  g.add(frame);
  const alturas = alturasLocais.map((y) => y + base);

  const temDescanso = !!(c.descanso && c.descanso.quantidade > 0);
  const nDisp = Math.max(niveis - (temDescanso ? 1 : 0), 1);

  const gw = c.uruguaia.larguraCm / 100,
    gd = c.uruguaia.comprimentoCm / 100;
  const folga = Math.max(W - nPorNivel * gw, 0.02);
  const unit = folga / (nPorNivel + 1);
  const passo = gw + unit;
  const x0 = -W / 2 + unit + gw / 2;

  let contGrelha = 0;
  if (gw > 0 && gd > 0) {
    for (let idx = 0; idx < c.uruguaia.quantidade; idx++) {
      const nivel = Math.floor(idx / nPorNivel);
      if (nivel >= nDisp) break;
      const pos = idx % nPorNivel;
      const gr = grelhaUruguaia(MAT, gw, gd, idx);
      gr.position.set(x0 + pos * passo, alturas[nivel] + 0.002, frameZ + 0.006 + 0.045 + gd / 2);
      g.add(gr);
      contGrelha++;
    }
  }

  const esp: boolean[] = [];
  if (c.espetos.comprimentoCm > 0)
    for (let i = 0; i < c.espetos.quantidade; i++) esp.push(c.espetos.tipo === "duplo");
  const levelsComGrelha = Math.min(Math.ceil(contGrelha / nPorNivel), nDisp);
  const livres: number[] = [];
  for (let L = levelsComGrelha; L < nDisp; L++) livres.push(L);
  const divXs: number[] = [];
  for (let d = 1; d <= nDiv; d++) divXs.push(-W / 2 + (d * W) / (nDiv + 1));
  const mE = esp.length;
  esp.forEach((duplo, k) => {
    const e = espetoPeca(MAT, c.espetos.comprimentoCm / 100, duplo, k);
    const Lp = e.userData.Lp as number;
    let yLvl: number, yOff: number;
    if (livres.length) {
      yLvl = livres[k % livres.length];
      yOff = 0.002;
    } else {
      yLvl = Math.max(levelsComGrelha - 1, 0);
      yOff = 0.05 + 0.016 * Math.floor(k / 2);
    }
    const sx = mE > 1 ? Math.min(0.11, (W * 0.5) / (mE - 1)) : 0;
    let xr = (k - (mE - 1) / 2) * sx;
    for (let v = 0; v < divXs.length; v++) {
      if (Math.abs(xr - divXs[v]) < 0.034) xr += 0.05;
    }
    e.position.set(xr, alturas[yLvl] + yOff, frameZ - 0.025 + Lp + 0.015);
    g.add(e);
  });

  if (temDescanso && c.descanso) {
    const dw = c.descanso.larguraCm / 100;
    const dd = 0.2;
    const ndDes = c.descanso.quantidade;
    const folgaD = Math.max(W - ndDes * dw, 0.02);
    const passoD = dw + folgaD / (ndDes + 1);
    const xd0 = -W / 2 + folgaD / (ndDes + 1) + dw / 2;
    for (let i = 0; i < ndDes; i++) {
      const gdm = grelhaDescanso(MAT, dw, dd, i);
      gdm.position.set(
        xd0 + i * passoD,
        alturas[niveis - 1] + 0.002,
        frameZ + 0.006 + 0.04 + dd / 2,
      );
      g.add(gdm);
    }
  }
  return g;
}
