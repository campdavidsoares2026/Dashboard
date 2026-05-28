// frontend/lib/supabase.ts
// Thin REST helper used by TanStack Query hooks. Same pattern as painel.html.

export const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const HDR = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
};

if (typeof window !== "undefined" && (!SUPA_URL || !KEY)) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing"
  );
}

/** GET /rest/v1/<path>. `path` should include any query params already. */
export async function sb<T = unknown>(path: string): Promise<T> {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: HDR,
    cache: "no-store",
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Supabase ${r.status}: ${body.slice(0, 300)}`);
  }
  return r.json() as Promise<T>;
}
