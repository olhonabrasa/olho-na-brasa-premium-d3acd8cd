// Passo das medidas: A (largura da boca) e B (comprimento interno), caixa + régua.
import { A_MAX, A_MIN, B_MAX, B_MIN, faixaKit, montagemSugerida } from "../builder";
import type { Ctx } from "./estado";

export function pintarRegua(r: HTMLInputElement) {
  const min = Number(r.min);
  const max = Number(r.max);
  r.style.setProperty("--p", `${((Number(r.value) - min) / (max - min || 1)) * 100}%`);
}

export function montarMedidas(ctx: Ctx) {
  const { root, $, s } = ctx;
  root.querySelectorAll<HTMLInputElement>(".onb-calc-range[data-par]").forEach(pintarRegua);

  function ler(nome: "a" | "b", bruto: number, final: boolean) {
    const [min, max] = nome === "a" ? [A_MIN, A_MAX] : [B_MIN, B_MAX];
    const inp = root.querySelector<HTMLInputElement>(`input[name="${nome}"]`)!;
    const range = root.querySelector<HTMLInputElement>(`input[name="${nome}-range"]`)!;
    const v = Math.round(bruto);
    const ok = Number.isFinite(v) && v >= min && v <= max;
    inp.setAttribute("aria-invalid", String(!ok));
    $(`#onb-msg-${nome}`).textContent = ok ? "" : `Entre ${min} e ${max} cm`;
    if (!ok) return;
    if (document.activeElement !== inp) inp.value = String(v);
    range.value = String(v);
    pintarRegua(range);
    if (!final) return;
    if (nome === "a") s.a = v;
    else s.b = v;
    s.m = montagemSugerida(s.a, s.b);
    if (s.modo === "kit" && !faixaKit(s.a, s.b)) s.modo = "pecas";
    ctx.acoes.desenhar();
  }

  let tMedida = 0;
  /** `input` na caixa ou na régua de A/B. Devolve true se era daqui. */
  function aoInput(t: HTMLInputElement) {
    if (t.name === "a" || t.name === "b") {
      clearTimeout(tMedida);
      tMedida = window.setTimeout(() => ler(t.name as "a" | "b", Number(t.value), true), 450);
      return true;
    }
    if (t.dataset.par) {
      const nome = t.dataset.par as "a" | "b";
      ler(nome, Number(t.value), false);
      clearTimeout(tMedida);
      tMedida = window.setTimeout(() => ler(nome, Number(t.value), true), 180);
      return true;
    }
    return false;
  }

  function aoChange(t: HTMLInputElement) {
    if (t.name !== "a" && t.name !== "b") return false;
    ler(t.name, Number(t.value), true);
    return true;
  }

  return { ler, aoInput, aoChange };
}
