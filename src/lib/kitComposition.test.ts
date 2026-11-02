/// <reference types="node" />
// Rodar: npm test  (node --test, sem dependências)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  comprimentoGrelhaCm,
  compositionFromPieces,
  describeComposition,
  kitComposition,
  peCm,
} from "./kitComposition.ts";

test("estado padrão 55 × 45 (plano do projeto de design)", () => {
  const c = kitComposition(55, 45)!;
  assert.equal(c.suporteLarguraCm, 55);
  assert.deepEqual(c.uruguaia, { larguraCm: 22, comprimentoCm: 45, porNivel: 2, quantidade: 2 });
  assert.deepEqual(c.descanso, { larguraCm: 44, quantidade: 1 });
  assert.deepEqual(c.espetos, { tipo: "duplo", comprimentoCm: 70, quantidade: 2 });
  assert.equal(c.peCm, 7);
});

test("70 × 60 bate com o Modelo 3D / GLB exportado", () => {
  const c = kitComposition(70, 60)!;
  assert.equal(c.uruguaia.larguraCm, 32);
  assert.equal(c.uruguaia.comprimentoCm, 55);
  assert.deepEqual(c.descanso, { larguraCm: 64, quantidade: 1 });
  assert.equal(c.espetos.comprimentoCm, 80);
  assert.equal(c.peCm, 10);
});

test("95 × 70: descanso 40 × 2 e pé 20", () => {
  const c = kitComposition(95, 70)!;
  assert.equal(c.uruguaia.larguraCm, 40);
  assert.equal(c.uruguaia.comprimentoCm, 55);
  assert.deepEqual(c.descanso, { larguraCm: 40, quantidade: 2 });
  assert.equal(c.espetos.comprimentoCm, 80);
  assert.equal(c.peCm, 20);
});

test("fora da faixa devolve null", () => {
  assert.equal(kitComposition(120, 60), null);
  assert.equal(kitComposition(45, 50), null);
  assert.equal(kitComposition(60, 35), null);
  assert.equal(kitComposition(60, 80), null);
  assert.equal(kitComposition(Number.NaN, 50), null);
});

test("todas as larguras da tabela", () => {
  const esperado: Record<number, [number, number, number]> = {
    50: [22, 44, 1],
    55: [22, 44, 1],
    60: [27, 54, 1],
    65: [27, 54, 1],
    70: [32, 64, 1],
    75: [32, 64, 1],
    80: [37, 37, 2],
    85: [37, 37, 2],
    90: [37, 37, 2],
    95: [40, 40, 2],
  };
  for (const [a, [u, d, dq]] of Object.entries(esperado)) {
    const c = kitComposition(Number(a), 50)!;
    assert.equal(c.uruguaia.larguraCm, u, `uruguaia em ${a}`);
    assert.equal(c.descanso?.larguraCm, d, `descanso em ${a}`);
    assert.equal(c.descanso?.quantidade, dq, `qtd descanso em ${a}`);
  }
});

test("A arredonda para baixo na faixa de 5 (57 → 55)", () => {
  assert.equal(kitComposition(57, 47)!.suporteLarguraCm, 55);
  assert.equal(kitComposition(99, 74)!.suporteLarguraCm, 95);
});

test("pé e comprimento da grelha por B", () => {
  assert.deepEqual([40, 45, 50, 55, 60, 65, 70].map(peCm), [7, 7, 7, 7, 10, 15, 20]);
  assert.deepEqual(
    [40, 45, 50, 55, 60, 65, 70].map(comprimentoGrelhaCm),
    [40, 45, 50, 55, 55, 55, 55],
  );
});

test("toda grelha calculada existe como variação vendida (35 a 55 cm)", () => {
  for (let b = 40; b <= 70; b += 5) {
    const g = comprimentoGrelhaCm(b);
    assert.ok(g >= 35 && g <= 55 && g % 5 === 0, `B ${b} -> ${g}`);
  }
});

test("Monte o seu traduz as peças escolhidas", () => {
  const c = compositionFromPieces(
    [
      { item_id: "suporte_suspenso", width_cm: 60, depth_cm: 0, qty: 1 },
      { item_id: "grelha_uruguaia", width_cm: 27, depth_cm: 45, qty: 2 },
      { item_id: "espeto_v", width_cm: 70, depth_cm: 0, qty: 3 },
    ],
    62,
    48,
  )!;
  assert.equal(c.suporteLarguraCm, 60);
  assert.deepEqual(c.uruguaia, { larguraCm: 27, comprimentoCm: 45, porNivel: 2, quantidade: 2 });
  assert.equal(c.descanso, null);
  assert.deepEqual(c.espetos, { tipo: "simples", comprimentoCm: 70, quantidade: 3 });
});

test("aria-label descreve o estado", () => {
  const txt = describeComposition(kitComposition(55, 45)!, 57, 47);
  assert.match(txt, /Kit suporte suspenso 55 cm, 3 níveis/);
  assert.match(txt, /2 grelhas uruguaias de 22 por 45 cm/);
  assert.match(txt, /churrasqueira de 57 por 47 cm/);
});
