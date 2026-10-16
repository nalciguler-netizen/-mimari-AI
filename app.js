const $ = (id) => document.getElementById(id);

const state = {
  mode: "photo",     // photo | pano | video
  img: null,         // yüklenen resim (photo/pano)
  video: null,       // yüklenen video
  styleId: null,
  strength: 0.65,
  busy: false,
};

const canvas = $("previewCanvas");
const ctx = canvas.getContext("2d");

/* ---------- Kaynak sekmeleri ---------- */
const MODE_TEXT = { photo: "Fotoğraf Seç", pano: "360° Fotoğraf Seç", video: "Video Seç" };

$("sourceTabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  state.mode = btn.dataset.mode;
  [...$("sourceTabs").children].forEach((b) => b.classList.toggle("active", b === btn));
  $("fileInput").accept = state.mode === "video" ? "video/*" : "image/*";
  $("fileInput").value = "";
  $("cameraInput").accept = state.mode === "video" ? "video/*" : "image/*";
  $("cameraInput").value = "";
  $("cameraBtn").hidden = state.mode === "pano";
  $("cameraBtn").textContent = state.mode === "video" ? "Kamerayla video çek" : "Kamerayla çek";
  $("uploadText").textContent = MODE_TEXT[state.mode];
  resetSource();
});

function resetSource() {
  state.img = null;
  state.video = null;
  canvas.hidden = true;
  $("uploadHint").hidden = false;
  $("sliderBox").hidden = true;
  updateGenerate();
}

/* ---------- Dosya yükleme ---------- */
function onFilePicked(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (state.mode === "video") loadVideo(file);
  else loadImage(file);
}
$("fileInput").addEventListener("change", onFilePicked);
$("cameraInput").addEventListener("change", onFilePicked);
$("cameraBtn").addEventListener("click", () => $("cameraInput").click());

function loadImage(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.img = img;
    state.video = null;
    if (state.mode === "pano") {
      $("sliderLabel").textContent = "Bakış yönü";
      $("viewSlider").max = 100;
      $("viewSlider").value = 0;
      $("sliderBox").hidden = false;
    } else {
      $("sliderBox").hidden = true;
    }
    drawPreview();
    afterLoad();
  };
  img.onerror = () => showError("Fotoğraf okunamadı. Başka bir dosya deneyin.");
  img.src = url;
}

function loadVideo(file) {
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = URL.createObjectURL(file);
  v.onloadedmetadata = () => {
    state.video = v;
    state.img = null;
    $("sliderLabel").textContent = "Kare seç";
    $("viewSlider").max = 100;
    $("viewSlider").value = 0;
    $("sliderBox").hidden = false;
    v.currentTime = 0.1;
  };
  v.onseeked = () => { drawPreview(); afterLoad(); };
  v.onerror = () => showError("Video okunamadı. Başka bir dosya deneyin.");
}

function afterLoad() {
  canvas.hidden = false;
  $("uploadHint").hidden = true;
  hideError();
  updateGenerate();
}

$("viewSlider").addEventListener("input", () => {
  if (state.mode === "video" && state.video) {
    const t = (Number($("viewSlider").value) / 100) * (state.video.duration || 0);
    state.video.currentTime = Math.min(t, Math.max(0, (state.video.duration || 1) - 0.05));
  } else {
    drawPreview();
  }
});

/* ---------- Çizim ---------- */
// Kaynağı hedef tuvale çizer (360° için seçilen yönden 90°'lik görünüm keser)
function drawSource(target, maxSide) {
  const tctx = target.getContext("2d");
  let src, sx = 0, sy = 0, sw, sh;

  if (state.mode === "video" && state.video) {
    src = state.video; sw = src.videoWidth; sh = src.videoHeight;
  } else if (state.img) {
    src = state.img; sw = src.naturalWidth; sh = src.naturalHeight;
  } else return false;

  let outW, outH;
  if (state.mode === "pano" && state.img) {
    const cw = sw / 4;
    const ch = Math.min(sh, cw * 0.75);
    sy = (sh - ch) / 2;
    sx = (Number($("viewSlider").value) / 100) * sw;
    const scale = Math.min(1, maxSide / Math.max(cw, ch));
    outW = Math.round(cw * scale); outH = Math.round(ch * scale);
    target.width = outW; target.height = outH;
    // Kenardan taşarsa başa saran iki parça çiz
    const first = Math.min(cw, sw - sx);
    tctx.drawImage(src, sx, sy, first, ch, 0, 0, first * scale, outH);
    if (first < cw) {
      tctx.drawImage(src, 0, sy, cw - first, ch, first * scale, 0, (cw - first) * scale, outH);
    }
    return true;
  }

  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  outW = Math.round(sw * scale); outH = Math.round(sh * scale);
  target.width = outW; target.height = outH;
  tctx.drawImage(src, 0, 0, sw, sh, 0, 0, outW, outH);
  return true;
}

function drawPreview() { drawSource(canvas, 900); }

/* ---------- Tarz seçimi ---------- */
function buildStyles() {
  const grid = $("styleGrid");
  window.STYLES.forEach((s) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "style-chip";
    b.textContent = s.label;
    b.dataset.id = s.id;
    b.addEventListener("click", () => {
      state.styleId = s.id;
      [...grid.children].forEach((c) => c.classList.toggle("active", c === b));
      updateGenerate();
    });
    grid.appendChild(b);
  });
}
buildStyles();

$("strengthTabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  state.strength = Number(btn.dataset.s);
  [...$("strengthTabs").children].forEach((b) => b.classList.toggle("active", b === btn));
});

function updateGenerate() {
  const ready = (state.img || state.video) && state.styleId && !state.busy;
  $("generateBtn").disabled = !ready;
}

/* ---------- Üretim ---------- */
const STATUS_TR = {
  starting: "Hazırlanıyor…",
  processing: "Tasarlanıyor…",
};

$("generateBtn").addEventListener("click", async () => {
  const style = window.STYLES.find((s) => s.id === state.styleId);
  if (!style) return;

  const work = document.createElement("canvas");
  if (!drawSource(work, 1024)) return;
  const dataUrl = work.toDataURL("image/jpeg", 0.85);

  const prompt =
    `${style.prompt}, redesigned room interior, keep the existing furniture pieces, ` +
    `rearranged into the best possible layout, same walls windows and doors, photorealistic`;

  state.busy = true;
  updateGenerate();
  $("resultSection").hidden = false;
  $("loader").hidden = false;
  $("compare").hidden = true;
  $("downloadLink").hidden = true;
  hideError();
  setStatus("Hazırlanıyor…");
  $("resultSection").scrollIntoView({ behavior: "smooth" });

  try {
    const url = await window.Replicate.run(dataUrl, prompt, state.strength, (s) =>
      setStatus(STATUS_TR[s] || "Tasarlanıyor…")
    );
    await showResult(dataUrl, url);
    refreshQuota();
  } catch (err) {
    showError(err.message || "Bir hata oluştu.");
  } finally {
    state.busy = false;
    $("loader").hidden = true;
    $("statusText").hidden = true;
    updateGenerate();
  }
});

async function showResult(beforeUrl, afterUrl) {
  $("beforeImage").src = beforeUrl;
  $("resultImage").src = afterUrl;
  $("compareSlider").value = 50;
  applyCompare();
  $("compare").hidden = false;

  const link = $("downloadLink");
  try {
    const blob = await (await fetch(afterUrl)).blob();
    link.href = URL.createObjectURL(blob);
    link.removeAttribute("target");
  } catch (e) {
    link.href = afterUrl;
    link.target = "_blank";
  }
  link.hidden = false;
}

function applyCompare() {
  const v = $("compareSlider").value;
  $("resultImage").style.clipPath = `inset(0 ${100 - v}% 0 0)`;
}
$("compareSlider").addEventListener("input", applyCompare);

/* ---------- Mesajlar ---------- */
function setStatus(t) { $("statusText").textContent = t; $("statusText").hidden = false; }
function showError(t) {
  $("resultSection").hidden = false;
  $("errorText").textContent = t;
  $("errorText").hidden = false;
}
function hideError() { $("errorText").hidden = true; }

/* ---------- Günlük hak ---------- */
async function refreshQuota() {
  const q = await window.Replicate.quota();
  if (!q) { $("quotaText").hidden = true; return; }
  $("quotaText").textContent = `Bugün kalan hak: ${q.left}/${q.max}`;
  $("quotaText").hidden = false;
}
refreshQuota();

/* ---------- Kurulum düğmesi ---------- */
let installEvent = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvent = e;
  $("installBtn").hidden = false;
});
$("installBtn").addEventListener("click", async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  $("installBtn").hidden = true;
});
window.addEventListener("appinstalled", () => { $("installBtn").hidden = true; });

/* ---------- PWA ---------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
