// Server-side proxy: the painel runs on HTTPS so it can't fetch
// http://187.77.203.55:8000 directly (mixed content). This route does
// the check from the Vercel edge and returns ok/ms.

export const dynamic = "force-dynamic"; // never cache

const VPS_URL = process.env.VPS_HEALTH_URL ?? "http://187.77.203.55:8000";
const TIMEOUT_MS = 5000;

export async function GET() {
  const started = Date.now();
  try {
    const ctl = AbortSignal.timeout(TIMEOUT_MS);
    const r = await fetch(VPS_URL, {
      method: "HEAD",
      signal: ctl,
      // Don't follow redirects, we just want reachability
      redirect: "manual",
    });
    const ms = Date.now() - started;
    // 2xx, 3xx, 401, 403 all mean "host is up and responding"
    const ok = r.status < 500;
    return Response.json({ ok, ms, status: r.status });
  } catch (e: unknown) {
    const ms = Date.now() - started;
    const msg = e instanceof Error ? e.message : String(e);
    // Try GET as fallback (some servers reject HEAD)
    try {
      const r2 = await fetch(VPS_URL, {
        method: "GET",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "manual",
      });
      const ms2 = Date.now() - started;
      return Response.json({ ok: r2.status < 500, ms: ms2, status: r2.status, via: "GET" });
    } catch {
      return Response.json({ ok: false, ms, error: msg }, { status: 200 });
    }
  }
}
