// Rastreamento próprio da LP: cada visitante ganha um visitor_id (localStorage)
// e cada visita um session_id. Registramos entrada, tempo ativo, rolagem,
// seções vistas, todos os cliques, interações do configurador e do checkout.
// Envio em lotes para a RPC `track` (security definer, com limites no banco).
// NUNCA registramos o valor digitado em campos (só o nome do campo).

const SUPABASE_URL = "https://pwpfpseatkwluahjqclc.supabase.co";
const SUPABASE_KEY = "sb_publishable_wubznX7fTM8oRiJK1vAf3A_LBZVVGzd";

const VISITOR_KEY = "onb_vid";
const SESSION_KEY = "onb_sid";
const SESSION_TS_KEY = "onb_sid_ts";
const SESSION_IDLE_MS = 30 * 60 * 1000;
const FLUSH_MS = 5000;
const ACTIVE_WINDOW_MS = 30_000;
const MAX_BATCH = 60;

type EventIn = {
  type: string;
  section?: string | null;
  x?: number;
  y?: number;
  data?: Record<string, unknown>;
};
type QueuedEvent = EventIn & { ts: string; t: number; scroll: number };

type State = {
  sid: string;
  vid: string;
  start: number;
  queue: QueuedEvent[];
  maxScroll: number;
  activeMs: number;
  lastTick: number;
  lastInteraction: number;
  sections: Record<string, number>;
  visibleSections: Map<string, number>;
  furthest: string | null;
  flags: { configured: boolean; checkout_started: boolean; whatsapp_clicked: boolean };
  sentSession: boolean;
  milestones: Set<number>;
  clickBurst: { t: number; x: number; y: number }[];
};

let S: State | null = null;

function uuid() {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function store(kind: "local" | "session") {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function ids() {
  const ls = store("local");
  let vid = ls?.getItem(VISITOR_KEY) ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(vid)) {
    vid = uuid();
    ls?.setItem(VISITOR_KEY, vid);
  }
  const lastTs = Number(ls?.getItem(SESSION_TS_KEY) ?? 0);
  let sid = ls?.getItem(SESSION_KEY) ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(sid) || Date.now() - lastTs > SESSION_IDLE_MS) sid = uuid();
  ls?.setItem(SESSION_KEY, sid);
  ls?.setItem(SESSION_TS_KEY, String(Date.now()));
  return { vid, sid };
}

export function getTrackingIds(): { session_id: string | null; visitor_id: string | null } {
  return { session_id: S?.sid ?? null, visitor_id: S?.vid ?? null };
}

function docHeight() {
  const d = document.documentElement;
  return Math.max(d.scrollHeight, document.body?.scrollHeight ?? 0);
}

function scrollPct() {
  const h = docHeight() - window.innerHeight;
  if (h <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((window.scrollY / h) * 100)));
}

function sectionAt(el: Element | null): string | null {
  const s = el?.closest?.("[data-track-section]");
  return s?.getAttribute("data-track-section") ?? null;
}

function device() {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Outro";
  const browser = /Instagram/.test(ua)
    ? "Instagram"
    : /FBAN|FBAV/.test(ua)
      ? "Facebook"
      : /Edg\//.test(ua)
        ? "Edge"
        : /SamsungBrowser/.test(ua)
          ? "Samsung"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : /Firefox\//.test(ua)
                ? "Firefox"
                : "Outro";
  const w = Math.min(window.screen?.width ?? 0, window.innerWidth || 9999);
  const kind =
    /Mobi|iPhone|Android.+Mobile/.test(ua) || w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  return { device: kind, os, browser };
}

function sessionPayload(ended = false) {
  if (!S) return null;
  const params = new URLSearchParams(window.location.search);
  const base: Record<string, unknown> = {
    id: S.sid,
    visitor_id: S.vid,
    page_h: docHeight(),
    max_scroll_pct: S.maxScroll,
    active_ms: Math.round(S.activeMs),
    sections: Object.fromEntries(Object.entries(S.sections).map(([k, v]) => [k, Math.round(v)])),
    furthest_section: S.furthest,
    ...S.flags,
    ended,
  };
  if (!S.sentSession) {
    Object.assign(base, {
      landing_url: window.location.href.slice(0, 600),
      referrer: document.referrer.slice(0, 600),
      utm_source: params.get("utm_source") ?? "",
      utm_medium: params.get("utm_medium") ?? "",
      utm_campaign: params.get("utm_campaign") ?? "",
      utm_content: params.get("utm_content") ?? "",
      utm_term: params.get("utm_term") ?? "",
      gclid: params.get("gclid") ?? params.get("gbraid") ?? params.get("wbraid") ?? "",
      fbclid: params.get("fbclid") ?? "",
      ...device(),
      screen_w: window.screen?.width ?? null,
      screen_h: window.screen?.height ?? null,
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
      lang: navigator.language,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    });
  }
  return base;
}

function flush(ended = false) {
  if (!S) return;
  const events = S.queue.splice(0, MAX_BATCH);
  const session = sessionPayload(ended);
  if (!session) return;
  const wasFirst = !S.sentSession;
  S.sentSession = true;
  const body = JSON.stringify({ p_session: session, p_events: events });
  fetch(`${SUPABASE_URL}/rest/v1/rpc/track`, {
    method: "POST",
    keepalive: body.length < 60_000,
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
    body,
  }).catch(() => {
    // volta pra fila na próxima tentativa (sem crescer para sempre)
    if (S && S.queue.length < 400) S.queue.unshift(...events);
    if (S && wasFirst) S.sentSession = false;
  });
  if (S.queue.length) setTimeout(() => flush(ended), 250);
}

export function track(type: string, data?: Record<string, unknown>, extra?: Partial<EventIn>) {
  if (!S) return;
  const safe = data ? clampData(data) : undefined;
  S.queue.push({
    type,
    section: extra?.section ?? null,
    x: extra?.x,
    y: extra?.y,
    data: safe,
    ts: new Date().toISOString(),
    t: Math.round(performance.now() - S.start),
    scroll: scrollPct(),
  });
  if (type === "configurator_change" || type === "configurator_mode") S.flags.configured = true;
  if (type === "checkout_open") S.flags.checkout_started = true;
  if (type === "whatsapp_click") S.flags.whatsapp_clicked = true;
  if (S.queue.length >= 40) flush();
}

/** Mantém o payload pequeno: strings cortadas em 200 chars, objetos aninhados só no 1º nível. */
function clampData(data: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data).slice(0, 20)) {
    if (v === undefined) continue;
    if (typeof v === "string") out[k] = v.slice(0, 200);
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
    else out[k] = JSON.stringify(v).slice(0, 300);
  }
  return out;
}

function describe(el: HTMLElement) {
  const target =
    (el.closest(
      "a,button,[role=button],input,select,textarea,label,summary,[data-track]",
    ) as HTMLElement | null) ?? el;
  const tag = target.tagName.toLowerCase();
  const label =
    target.getAttribute("data-track") ||
    target.getAttribute("aria-label") ||
    (tag === "input" || tag === "select" || tag === "textarea"
      ? target.getAttribute("name") || target.id || tag
      : "") ||
    (target.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) ||
    target.getAttribute("alt") ||
    tag;
  const href = tag === "a" ? (target as HTMLAnchorElement).href.slice(0, 200) : undefined;
  let sel = tag;
  if (target.id) sel += `#${target.id}`;
  else if (typeof target.className === "string" && target.className)
    sel += "." + target.className.trim().split(/\s+/).slice(0, 2).join(".");
  return {
    tag,
    label,
    href,
    sel: sel.slice(0, 120),
    interactive: target !== el || /^(a|button|input|select|textarea)$/.test(tag),
  };
}

export function initTracking() {
  if (typeof window === "undefined" || S) return;
  const url = new URL(window.location.href);
  if (url.searchParams.has("notrack") || /painel-leads|\/admin/.test(url.pathname)) return;
  if (navigator.webdriver) return; // robôs/automação não poluem o painel

  const { vid, sid } = ids();
  S = {
    sid,
    vid,
    start: performance.now(),
    queue: [],
    maxScroll: 0,
    activeMs: 0,
    lastTick: performance.now(),
    lastInteraction: performance.now(),
    sections: {},
    visibleSections: new Map(),
    furthest: null,
    flags: { configured: false, checkout_started: false, whatsapp_clicked: false },
    sentSession: false,
    milestones: new Set(),
    clickBurst: [],
  };

  track("page_view", { path: url.pathname, title: document.title.slice(0, 120) });

  const touch = () => {
    if (S) S.lastInteraction = performance.now();
  };

  // tempo ativo: aba visível + interação nos últimos 30s
  window.setInterval(() => {
    if (!S) return;
    const now = performance.now();
    const dt = now - S.lastTick;
    S.lastTick = now;
    if (document.visibilityState === "visible" && now - S.lastInteraction < ACTIVE_WINDOW_MS)
      S.activeMs += dt;
    for (const [name, since] of S.visibleSections) {
      if (document.visibilityState === "visible")
        S.sections[name] = (S.sections[name] ?? 0) + (now - since);
      S.visibleSections.set(name, now);
    }
    store("local")?.setItem(SESSION_TS_KEY, String(Date.now()));
  }, 1000);

  window.setInterval(() => flush(), FLUSH_MS);

  // rolagem: marcos de 10 em 10%
  let scrollRaf = 0;
  window.addEventListener(
    "scroll",
    () => {
      touch();
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        if (!S) return;
        const p = scrollPct();
        if (p > S.maxScroll) S.maxScroll = p;
        const m = Math.floor(p / 10) * 10;
        for (let k = 10; k <= m; k += 10) {
          if (!S.milestones.has(k)) {
            S.milestones.add(k);
            track("scroll_depth", { pct: k });
          }
        }
      });
    },
    { passive: true },
  );
  ["pointerdown", "keydown", "touchstart", "mousemove"].forEach((ev) =>
    window.addEventListener(ev, touch, { passive: true }),
  );

  // seções: tempo visível e ordem de chegada
  const io = new IntersectionObserver(
    (entries) => {
      if (!S) return;
      const now = performance.now();
      for (const e of entries) {
        const name = e.target.getAttribute("data-track-section");
        if (!name) continue;
        if (e.isIntersecting) {
          if (!S.visibleSections.has(name)) {
            S.visibleSections.set(name, now);
            if (!(name in S.sections)) {
              S.sections[name] = 0;
              S.furthest = name;
              track("section_view", {}, { section: name });
            }
          }
        } else if (S.visibleSections.has(name)) {
          const since = S.visibleSections.get(name)!;
          S.sections[name] = (S.sections[name] ?? 0) + (now - since);
          S.visibleSections.delete(name);
        }
      }
    },
    { threshold: 0.35 },
  );
  const observeAll = () =>
    document.querySelectorAll("[data-track-section]").forEach((el) => io.observe(el));
  observeAll();
  new MutationObserver(() => observeAll()).observe(document.body, {
    childList: true,
    subtree: true,
  });

  // todos os cliques (coordenadas: x relativo à largura, y em px do documento)
  document.addEventListener(
    "click",
    (ev) => {
      if (!S) return;
      touch();
      const el = ev.target as HTMLElement | null;
      if (!el || !(el instanceof HTMLElement)) return;
      const d = describe(el);
      const x = +(ev.pageX / Math.max(1, document.documentElement.clientWidth)).toFixed(4);
      const y = Math.round(ev.pageY);
      const isWa = !!d.href && /wa\.me|api\.whatsapp\.com/.test(d.href);
      track(
        isWa ? "whatsapp_click" : "click",
        {
          label: d.label,
          tag: d.tag,
          sel: d.sel,
          href: d.href,
          vw: window.innerWidth,
          dead: !d.interactive || undefined,
        },
        { section: sectionAt(el), x, y },
      );
      // rage click: 3+ cliques em 700ms no mesmo lugar
      const now = performance.now();
      S.clickBurst = S.clickBurst.filter((c) => now - c.t < 700 && Math.abs(c.y - y) < 40);
      S.clickBurst.push({ t: now, x, y });
      if (S.clickBurst.length === 3)
        track("rage_click", { label: d.label }, { section: sectionAt(el), x, y });
    },
    true,
  );

  // formulários: foco e preenchimento (nome do campo, nunca o valor)
  document.addEventListener(
    "focusin",
    (ev) => {
      const el = ev.target as HTMLInputElement;
      if (!el?.matches?.("input,select,textarea")) return;
      track("field_focus", { field: el.name || el.id || el.type }, { section: sectionAt(el) });
    },
    true,
  );
  document.addEventListener(
    "change",
    (ev) => {
      const el = ev.target as HTMLInputElement;
      if (!el?.matches?.("input,select,textarea") || el.type === "range") return;
      track(
        "field_filled",
        { field: el.name || el.id || el.type, filled: !!el.value },
        { section: sectionAt(el) },
      );
    },
    true,
  );

  // vídeos
  document.addEventListener(
    "play",
    (ev) => {
      const v = ev.target as HTMLVideoElement;
      if (v?.tagName === "VIDEO")
        track(
          "video_play",
          { src: (v.currentSrc || "").split("/").pop()?.slice(0, 80) },
          { section: sectionAt(v) },
        );
    },
    true,
  );

  const end = () => {
    if (!S) return;
    for (const [name, since] of S.visibleSections)
      S.sections[name] = (S.sections[name] ?? 0) + (performance.now() - since);
    S.visibleSections.clear();
    track("page_hide", { active_ms: Math.round(S.activeMs), max_scroll: S.maxScroll });
    flush(true);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") end();
    else if (S) {
      const now = performance.now();
      S.lastTick = now;
      document.querySelectorAll("[data-track-section]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const name = el.getAttribute("data-track-section");
        if (name && r.bottom > 0 && r.top < window.innerHeight) S!.visibleSections.set(name, now);
      });
      track("page_return");
    }
  });
  window.addEventListener("pagehide", end);
}
