// Odaly API — Cloudflare Worker
// Gerekli gizli değişken (Secret): REPLICATE_TOKEN
// İsteğe bağlı değişkenler: ALLOWED_ORIGIN (örn. https://kullanici.github.io), DAILY_LIMIT (varsayılan 20)
// İsteğe bağlı KV bağlantısı: LIMITS (günlük kullanım sınırı için)

const MODEL = "adirik/interior-design";
const NEGATIVE =
  "lowres, watermark, banner, logo, text, deformed, blurry, out of focus, surreal, ugly, distorted walls";

let cachedVersion = null;

function quotaKey(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "x";
  return `${new Date().toISOString().slice(0, 10)}:${ip}`;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": allowed === "*" ? "*" : allowed,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    const reply = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { "Content-Type": "application/json", ...cors },
      });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (allowed !== "*" && origin !== allowed) return reply({ error: "İzin yok." }, 403);
    if (!env.REPLICATE_TOKEN) return reply({ error: "Sunucu ayarı eksik." }, 500);

    const url = new URL(request.url);
    const auth = { Authorization: `Bearer ${env.REPLICATE_TOKEN}` };

    try {
      if (request.method === "POST" && url.pathname === "/api/generate") {
        const body = await request.json();
        const image = String(body.image || "");
        const prompt = String(body.prompt || "").slice(0, 600);
        let strength = Number(body.strength);
        if (!(strength >= 0.3 && strength <= 0.95)) strength = 0.65;

        if (!image.startsWith("data:image/jpeg;base64,") || image.length > 3_000_000) {
          return reply({ error: "Görsel geçersiz veya çok büyük." }, 400);
        }
        if (!prompt) return reply({ error: "İstem boş." }, 400);

        // Günlük sınır (KV bağlıysa)
        const max = Number(env.DAILY_LIMIT) || 20;
        let used = 0;
        const key = quotaKey(request);
        if (env.LIMITS) {
          used = Number(await env.LIMITS.get(key)) || 0;
          if (used >= max) return reply({ error: "Günlük hakkınız doldu. Yarın tekrar deneyin." }, 429);
          await env.LIMITS.put(key, String(used + 1), { expirationTtl: 90000 });
        }
        const refund = async () => {
          if (env.LIMITS) await env.LIMITS.put(key, String(Math.max(0, used)), { expirationTtl: 90000 });
        };

        if (!cachedVersion) {
          const m = await fetch(`https://api.replicate.com/v1/models/${MODEL}`, { headers: auth });
          const mj = await m.json();
          cachedVersion = mj.latest_version && mj.latest_version.id;
          if (!cachedVersion) { await refund(); return reply({ error: "Model bulunamadı." }, 502); }
        }

        const r = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({
            version: cachedVersion,
            input: {
              image,
              prompt,
              negative_prompt: NEGATIVE,
              prompt_strength: strength,
              guidance_scale: 12,
              num_inference_steps: 40,
            },
          }),
        });
        const j = await r.json();
        if (!r.ok || !j.id) { await refund(); return reply({ error: "Üretim başlatılamadı, tekrar deneyin." }, 502); }
        return reply({ id: j.id, left: env.LIMITS ? Math.max(0, max - used - 1) : null });
      }

      if (request.method === "GET" && url.pathname === "/api/quota") {
        const max = Number(env.DAILY_LIMIT) || 20;
        if (!env.LIMITS) return reply({ left: null, max });
        const used = Number(await env.LIMITS.get(quotaKey(request))) || 0;
        return reply({ left: Math.max(0, max - used), max });
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/status/")) {
        const id = url.pathname.split("/").pop();
        if (!/^[a-z0-9]{10,40}$/i.test(id)) return reply({ error: "Geçersiz kimlik." }, 400);
        const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, { headers: auth });
        const j = await r.json();
        if (!r.ok) return reply({ error: "Durum alınamadı." }, 502);
        const out = Array.isArray(j.output) ? j.output[0] : j.output;
        return reply({ status: j.status, output: out || null, error: j.error || null });
      }

      return reply({ error: "Bulunamadı." }, 404);
    } catch (e) {
      return reply({ error: "Sunucu hatası." }, 500);
    }
  },
};
