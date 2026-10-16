// Replicate'e doğrudan değil, Cloudflare Worker üzerinden gider (anahtar sunucuda gizli kalır).
window.Replicate = (function () {
  const base = () => (window.ODALY_API || "").replace(/\/$/, "");

  async function net(p) {
    try { return await p; } catch (e) { throw new Error("Bağlantı kurulamadı. İnternetinizi kontrol edin."); }
  }

  async function quota() {
    try {
      const j = await (await fetch(base() + "/api/quota")).json();
      return j.left == null ? null : j;
    } catch (e) { return null; }
  }

  async function json(res) {
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error(data.error || `Sunucu hatası ${res.status}`);
    return data;
  }

  async function run(imageDataUrl, prompt, strength, onProgress) {
    const start = await json(await net(fetch(base() + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageDataUrl, prompt, strength }),
    })));
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const st = await json(await net(fetch(base() + "/api/status/" + start.id)));
      if (onProgress) onProgress(st.status);
      if (st.status === "succeeded") {
        if (!st.output) throw new Error("Model çıktı vermedi.");
        return st.output;
      }
      if (st.status === "failed" || st.status === "canceled") {
        throw new Error(st.error || "Tasarım üretilemedi.");
      }
    }
    throw new Error("Zaman aşımı, tekrar deneyin.");
  }

  return { run, quota };
})();
