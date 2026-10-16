// Uygulama, Cloudflare Worker (Workers AI) ile konuşur.
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

  async function run(imageDataUrl, prompt, strength, size) {
    const res = await net(fetch(base() + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: imageDataUrl, prompt, strength,
        width: size && size.width, height: size && size.height,
      }),
    }));
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error(data.error || `Sunucu hatası ${res.status}`);
    if (!data.output) throw new Error("Model çıktı vermedi.");
    return data.output;
  }

  return { run, quota };
})();
