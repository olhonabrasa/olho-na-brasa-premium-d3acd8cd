import { createClient } from "@supabase/supabase-js";

// Projeto Supabase usado pela landing page (leads, storage de fotos e painel admin).
// A chave publishable pode ficar no código — o acesso é controlado por RLS.
const supabaseUrl = "https://pwpfpseatkwluahjqclc.supabase.co";
const supabasePublishableKey = "sb_publishable_wubznX7fTM8oRiJK1vAf3A_LBZVVGzd";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
