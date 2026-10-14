const state = {
  imageBase64: null,
  selectedStyle: null,
};

const $ = (id) => document.getElementById(id);

function getApiKey() { return localStorage.getItem("replicate_key") || ""; }
function setApiKey(k) { localStorage.setItem("replicate_key", k); }

$("apiKeyBtn").addEventListener("click", () => {
  $("apiInput").value = getApiKey();
  $("apiDialog").showModal();
});
$("apiSaveBtn").addEventListener("click", () => {
  const val = $("apiInput").value.trim();
  if (val) setApiKey(val);
});

const grid = $("styleGrid");
window.STYLES.forEach((s) => {
  const btn = document.createElement("button");
  btn.className = "style-chip";
  btn.textContent = s.label;
  btn.dataset.id = s.id;
  btn.addEventListener("click", () => {
    document.querySelectorAll(".style-chip").forEach((c) => c.classList.remove("selected"));
    btn.classList.add("selected");
    state.selectedStyle = s;
  });
  grid.appendChild(btn);
});

$("uploadBox").addEventListener("click", () => $("fileInput").click());

$("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const base64 = await fileToResizedBase64(file, 1024, 0.85);
  state.imageBase64 = base64;
  const preview = $("preview");
  preview.src = `data:image/jpeg;base64,${base64}`;
  preview.hidden = false;
  $("uploadHint").hidden = true;
});

function fileToResizedBase64(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const bigger = Math.max(img.width, img.height);
        const scale = bigger > maxDim ? maxDim / bigger : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl.split(",")[1]);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

$("generateBtn").addEventListener("click", async () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    $("apiInput").value = "";
    $("apiDialog").showModal();
    return;
  }
  if (!state.imageBase64) { alert("Önce bir fotoğraf seç."); return; }
  if (!state.selectedStyle) { alert("Bir tarz seç."); return; }

  const resultSection = $("resultSection");
  const loader = $("loader");
  const errorText = $("errorText");
  const resultImage = $("resultImage");
  const downloadLink = $("downloadLink");

  resultSection.hidden = false;
  resultImage.hidden = true;
  downloadLink.hidden = true;
  errorText.hidden = true;
  loader.hidden = false;
  $("resultTitle").textContent = `${state.selectedStyle.label} tarzı oluşturuluyor...`;
  $("generateBtn").disabled = true;

  const measures = {
    w: parseFloat($("mWidth").value) || null,
    l: parseFloat($("mLength").value) || null,
    h: parseFloat($("mHeight").value) || null,
  };

  let prompt = state.selectedStyle.prompt;
  if (measures.w && measures.l && measures.h) {
    prompt += `, room dimensions approximately ${measures.w}m by ${measures.l}m, ceiling ${measures.h}m`;
  }

  try {
    const imageUrl = await window.Replicate.run(
      apiKey,
      state.imageBase64,
      prompt,
      (status) => {
        $("resultTitle").textContent = `${state.selectedStyle.label} — ${status}`;
      }
    );
    loader.hidden = true;
    resultImage.src = imageUrl;
    resultImage.hidden = false;
    downloadLink.href = imageUrl;
    downloadLink.hidden = false;
    $("resultTitle").textContent = `${state.selectedStyle.label} tarzı`;
    resultSection.scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    loader.hidden = true;
    errorText.textContent = e.message || "Bir hata oluştu.";
    errorText.hidden = false;
    $("resultTitle").textContent = "Hata";
  } finally {
    $("generateBtn").disabled = false;
  }
});
