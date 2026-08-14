export function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isValidCep(value: string) {
  return /^\d{5}-\d{3}$/.test(value);
}

export type CepLookupResult =
  | { ok: true; data: { cidade: string; uf: string; bairro: string } | null; degraded?: boolean }
  | { ok: false; msg: string };

const cache = new Map<string, CepLookupResult>();

export async function lookupCep(cep: string): Promise<CepLookupResult> {
  const digits = (cep || "").replace(/\D/g, "");
  if (digits.length !== 8) {
    return { ok: false, msg: "CEP incompleto. Precisa de 8 dígitos." };
  }

  const cached = cache.get(digits);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });
    const json = (await res.json()) as {
      erro?: boolean | string;
      localidade?: string;
      uf?: string;
      bairro?: string;
    };
    if (json.erro) {
      const result: CepLookupResult = { ok: false, msg: "CEP não encontrado. Confira o número." };
      cache.set(digits, result);
      return result;
    }
    const result: CepLookupResult = {
      ok: true,
      data: {
        cidade: json.localidade || "",
        uf: json.uf || "",
        bairro: json.bairro || "",
      },
    };
    cache.set(digits, result);
    return result;
  } catch (err) {
    console.warn("[cep] ViaCEP indisponível, seguindo em modo degradado:", err);
    return { ok: true, data: null, degraded: true };
  } finally {
    clearTimeout(timer);
  }
}
