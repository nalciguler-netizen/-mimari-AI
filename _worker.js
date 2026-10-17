// Odaly — Cloudflare Pages "_worker.js": hem siteyi hem /api yolunu sunar (Workers AI, ücretsiz katman)
// Gerekli bağlama (Binding): AI (Workers AI)
// İsteğe bağlı: KV bağlaması LIMITS, değişken DAILY_LIMIT (varsayılan 10), ALLOWED_ORIGIN

const MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
const NEGATIVE =
  "lowres, watermark, text, logo, deformed, blurry, distorted walls, extra furniture, people";

function quotaKey(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "x";
  return `${new Date().toISOString().slice(0, 10)}:${ip}`;
}

function toBase64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

const clamp8 = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(n) / 8) * 8)) || lo;

const api = {
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

    const url = new URL(request.url);
    const max = Number(env.DAILY_LIMIT) || 10;

    if (request.method === "GET" && url.pathname === "/api/quota") {
      if (!env.LIMITS) return reply({ left: null, max });
      const used = Number(await env.LIMITS.get(quotaKey(request))) || 0;
      return reply({ left: Math.max(0, max - used), max });
    }

    if (request.method === "POST" && url.pathname === "/api/generate") {
      if (!env.AI) return reply({ error: "Sunucu ayarı eksik (AI)." }, 500);

      let body;
      try { body = await request.json(); } catch (e) { return reply({ error: "Geçersiz istek." }, 400); }

      const image = String(body.image || "");
      const prompt = String(body.prompt || "").slice(0, 500);
      let strength = Number(body.strength);
      if (!(strength >= 0.3 && strength <= 0.95)) strength = 0.65;
      const width = clamp8(body.width || 512, 256, 768);
      const height = clamp8(body.height || 512, 256, 768);

      if (!image.startsWith("data:image/jpeg;base64,") || image.length > 1_500_000) {
        return reply({ error: "Görsel geçersiz veya çok büyük." }, 400);
      }
      if (!prompt) return reply({ error: "İstem boş." }, 400);

      // Günlük sınır (KV bağlıysa)
      let used = 0;
      const key = quotaKey(request);
      if (env.LIMITS) {
        used = Number(await env.LIMITS.get(key)) || 0;
        if (used >= max) return reply({ error: "Günlük hakkınız doldu. Yarın tekrar deneyin." }, 429);
        await env.LIMITS.put(key, String(used + 1), { expirationTtl: 90000 });
      }
      const refund = async () => {
        if (env.LIMITS) await env.LIMITS.put(key, String(used), { expirationTtl: 90000 });
      };

      // Base64 → bayt dizisi (modelin beklediği biçim)
      const bin = atob(image.slice("data:image/jpeg;base64,".length));
      const imgBytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) imgBytes[i] = bin.charCodeAt(i);

      const base = {
        prompt,
        negative_prompt: NEGATIVE,
        image: [...imgBytes],
        strength,
        guidance: 8,
        num_steps: 20,
      };
      const capacity = (m) => /429|3040|capacity|neuron|limit|quota/i.test(m);

      let out, lastErr = "";
      for (const extra of [{ width, height }, {}]) {
        try {
          out = await env.AI.run(MODEL, { ...base, ...extra });
          break;
        } catch (e) {
          lastErr = String((e && e.message) || e);
          if (capacity(lastErr)) break;
        }
      }

      if (!out) {
        await refund();
        if (capacity(lastErr)) {
          return reply({ error: "Bugünlük ücretsiz üretim kapasitesi doldu. Yarın tekrar deneyin." }, 503);
        }
        return reply({ error: `Üretim başarısız oldu (${lastErr.slice(0, 120)}), tekrar deneyin.` }, 502);
      }

      try {
        const bytes = new Uint8Array(await new Response(out).arrayBuffer());
        if (!bytes.length) throw new Error("boş çıktı");
        return reply({
          output: "data:image/png;base64," + toBase64(bytes),
          left: env.LIMITS ? Math.max(0, max - used - 1) : null,
        });
      } catch (e) {
        await refund();
        return reply({ error: `Çıktı okunamadı (${String((e && e.message) || e).slice(0, 80)}).` }, 502);
      }
    }

    return reply({ error: "Bulunamadı." }, 404);
  },
};

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);
    return api.fetch(request, env, ctx);
  },
};
