import { useEffect, useRef, useState } from "react";
import { X, Send, Paperclip, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sendLeadToDataCrazy, upsertLead, trackWhatsappClick } from "@/lib/sendLead";
import atendenteAsset from "@/assets/atendente.png.asset.json";

type Msg =
  | { id: string; from: "bot" | "user"; kind: "text"; text: string; ts: string }
  | { id: string; from: "user"; kind: "image"; url: string; ts: string };

const WA_BG = "#0B141A";
const WA_HEADER = "#202C33";
const WA_BUBBLE_BOT = "#202C33";
const WA_BUBBLE_USER = "#005C4B";
const WA_TEXT = "#E9EDEF";

const now = () =>
  new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const uid = () => Math.random().toString(36).slice(2);

type Step = "identify" | "photo" | "ready" | "done";

export function WhatsappChatSimulado({
  open,
  onClose,
  onSwitchToForm,
}: {
  open: boolean;
  onClose: () => void;
  onSwitchToForm: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState<Step>("identify");
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fotoUrl, setFotoUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (bootedRef.current) return;
    bootedRef.current = true;
    void bootConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      // reset when closed
      bootedRef.current = false;
      setMessages([]);
      setStep("identify");
      setNome("");
      setWhatsapp("");
      setCidade("");
      setEstado("");
      setFotoUrl("");
      setUploading(false);
      setSending(false);
      setLeadId(null);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const pushBot = async (text: string, delay = 1200) => {
    setTyping(true);
    await new Promise((r) => setTimeout(r, delay));
    setTyping(false);
    setMessages((m) => [...m, { id: uid(), from: "bot", kind: "text", text, ts: now() }]);
  };

  const pushUser = (text: string) =>
    setMessages((m) => [...m, { id: uid(), from: "user", kind: "text", text, ts: now() }]);

  const pushUserImage = (url: string) =>
    setMessages((m) => [...m, { id: uid(), from: "user", kind: "image", url, ts: now() }]);

  const bootConversation = async () => {
    await pushBot("Olá, tudo bem? 🔥", 900);
    await pushBot("Seja bem-vindo ao Olho na Brasa!", 1000);
    await pushBot("Para agilizar seu orçamento, me diga seu nome completo, cidade e estado.", 1200);
  };

  const submitIdentify = async () => {
    if (!nome.trim() || !whatsapp.trim() || !cidade.trim() || !estado.trim()) return;
    pushUser(`${nome}, ${cidade}/${estado.toUpperCase()}`);
    setStep("photo");
    void upsertLead(
      {
        nome,
        whatsapp,
        cidade,
        estado: estado.toUpperCase(),
        tipoProjeto: "Não informado (via chat WhatsApp)",
      },
      "chat_whatsapp",
      null,
    ).then((id) => {
      if (id) setLeadId(id);
    });
    const first = nome.trim().split(" ")[0];
    await pushBot(`Perfeito, ${first}! 👍`, 900);
    await pushBot("Perfeito! Se quiser, envie uma foto da sua churrasqueira ou do projeto — ajuda no orçamento, mas é opcional.", 1200);
    await pushBot("Você também pode seguir direto para falar com o especialista.", 1200);
  };

  const handlePhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    setMessages((m) => [
      ...m,
      { id: uid(), from: "user", kind: "text", text: "Enviando foto...", ts: now() },
    ]);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `churrasqueira_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("churrasqueira-fotos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("churrasqueira-fotos")
        .getPublicUrl(fileName);
      setFotoUrl(urlData.publicUrl);
      pushUserImage(urlData.publicUrl);
      setStep("ready");
      void upsertLead(
        {
          nome,
          whatsapp,
          cidade,
          estado: estado.toUpperCase(),
          tipoProjeto: "Não informado (via chat WhatsApp)",
          fotoUrl: urlData.publicUrl,
        },
        "chat_whatsapp",
        leadId,
      ).then((id) => {
        if (id && !leadId) setLeadId(id);
      });
      await pushBot("Recebi sua foto! 📸 Show!", 900);
      await pushBot(
        "Vou te transferir agora para um dos nossos especialistas finalizar seu orçamento. Só clicar abaixo 👇",
        1400,
      );
    } catch (err) {
      console.error("upload err", err);
      await pushBot("Ops, tive um problema para receber a foto. Tenta enviar de novo?", 800);
    } finally {
      setUploading(false);
    }
  };

  const finalize = async () => {
    if (sending) return;
    setSending(true);
    const leadData = {
      nome,
      whatsapp,
      cidade,
      estado: estado.toUpperCase(),
      estagio: "",
      tipoProjeto: "Não informado (via chat WhatsApp)",
      fotoUrl,
    };
    const savedId = await upsertLead(leadData, "chat_whatsapp", leadId, { clickedWhatsapp: true });
    if (savedId && !leadId) setLeadId(savedId);
    void sendLeadToDataCrazy(leadData, "chat_whatsapp").catch(() => undefined);
    const url = `https://wa.me/554740420956?text=${encodeURIComponent(
      `Olá! Quero montar meu Kit Premium. Vim pela landing page.`,
    )}`;

    setStep("done");
    window.open(url, "_blank");
    setSending(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-0 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex h-[100svh] w-full flex-col overflow-hidden md:h-[85svh] md:max-h-[720px] md:max-w-[420px] md:rounded-2xl"
        style={{ background: WA_BG }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ background: WA_HEADER, color: WA_TEXT }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={atendenteAsset.url}
            alt="Atendente Olho na Brasa"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold">Olho na Brasa</p>
            <p className="text-[11px]" style={{ color: "#8FCEB5" }}>
              online
            </p>
          </div>
        </div>

        {/* Body */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 py-4"
          style={{
            background: `${WA_BG}`,
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          <div className="mx-auto mb-3 w-fit rounded-lg bg-black/40 px-3 py-1 text-[11px]" style={{ color: WA_TEXT }}>
            Hoje
          </div>

          <div className="space-y-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[85%] rounded-lg px-3 py-2 text-sm shadow"
                  style={{
                    background: m.from === "user" ? WA_BUBBLE_USER : WA_BUBBLE_BOT,
                    color: WA_TEXT,
                    borderTopLeftRadius: m.from === "user" ? 8 : 0,
                    borderTopRightRadius: m.from === "user" ? 0 : 8,
                  }}
                >
                  {m.kind === "text" ? (
                    <p className="whitespace-pre-wrap leading-5">{m.text}</p>
                  ) : (
                    <img
                      src={m.url}
                      alt="Foto enviada"
                      className="max-h-56 rounded-md object-cover"
                    />
                  )}
                  <p className="mt-1 text-right text-[10px]" style={{ color: "#8FA6AE" }}>
                    {m.ts}
                  </p>
                </div>
              </div>
            ))}

            {typing ? (
              <div className="flex justify-start">
                <div
                  className="flex items-center gap-1 rounded-lg px-3 py-2 shadow"
                  style={{ background: WA_BUBBLE_BOT, borderTopLeftRadius: 0 }}
                >
                  <span className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:300ms]" />
                </div>
              </div>
            ) : null}

            {step === "identify" && !typing ? (
              <div
                className="mt-3 rounded-xl p-3"
                style={{ background: WA_BUBBLE_BOT, color: WA_TEXT }}
              >
                <div className="grid gap-2">
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome completo"
                    className="rounded-md bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/40"
                  />
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="WhatsApp com DDD"
                    inputMode="tel"
                    className="rounded-md bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/40"
                  />
                  <div className="grid grid-cols-[1fr_80px] gap-2">
                    <input
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Cidade"
                      className="rounded-md bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/40"
                    />
                    <input
                      value={estado}
                      onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="UF"
                      maxLength={2}
                      className="rounded-md bg-black/30 px-3 py-2 text-sm uppercase outline-none placeholder:text-white/40"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={submitIdentify}
                    disabled={!nome || !whatsapp || !cidade || !estado}
                    className="mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-[#00A884] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" /> Enviar
                  </button>
                </div>
              </div>
            ) : null}

            {step === "photo" && !typing ? (
              <div
                className="mt-3 rounded-xl p-3"
                style={{ background: WA_BUBBLE_BOT, color: WA_TEXT }}
              >
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#00A884] px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Paperclip className="h-4 w-4" /> Enviar foto da churrasqueira
                    </>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handlePhoto(f);
                  }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (uploading) return;
                    pushUser("Prefiro seguir sem foto");
                    setStep("ready");
                    await pushBot("Sem problema! Vou te transferir para um especialista finalizar seu orçamento no WhatsApp. Só clicar abaixo 👇", 1200);
                  }}
                  disabled={uploading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-transparent px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/5 disabled:opacity-40"
                >
                  Continuar sem enviar foto
                </button>
              </div>
            ) : null}

            {step === "ready" && !typing ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={finalize}
                  disabled={sending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#00A884] px-4 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-lg disabled:opacity-60"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Falar com especialista agora
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Escape link */}
        {step !== "ready" && step !== "done" ? (
          <div
            className="border-t border-white/10 px-4 py-3 text-center"
            style={{ background: WA_HEADER }}
          >
            <button
              type="button"
              onClick={onSwitchToForm}
              className="text-xs font-medium underline"
              style={{ color: "#8FCEB5" }}
            >
              Prefiro preencher um formulário rápido
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
