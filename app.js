const $ = (id) => document.getElementById(id);

const roomCanvas = $("roomCanvas");
const ctx = roomCanvas.getContext("2d");

let bgImage = null;
let items = []; // Odadaki sürüklenebilir eşyalar
let selectedItem = null;
let isDragging = false;
let dragStartX, dragStartY;

// 1. Fotoğraf Yükleme ve Tuvali Başlatma
$("uploadBox").addEventListener("click", () => $("fileInput").click());

$("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    bgImage = new Image();
    bgImage.onload = () => {
      initCanvas();
      $("canvasSection").hidden = false;
      $("actionSection").hidden = false;
      $("canvasSection").scrollIntoView({ behavior: "smooth" });
    };
    bgImage.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

function initCanvas() {
  const containerWidth = roomCanvas.parentElement.clientWidth;
  const scale = containerWidth / bgImage.width;
  
  roomCanvas.width = containerWidth;
  roomCanvas.height = bgImage.height * scale;

  render();
}

// Canvas Çizim Döngüsü
function render() {
  ctx.clearRect(0, 0, roomCanvas.width, roomCanvas.height);
  
  // Arka Plan Odasını Çiz
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, roomCanvas.width, roomCanvas.height);
  }

  // Eşyaları Çiz
  items.forEach((item) => {
    ctx.save();
    if (item === selectedItem) {
      ctx.strokeStyle = "#8B6B4A";
      ctx.lineWidth = 3;
      ctx.strokeRect(item.x - 2, item.y - 2, item.w + 4, item.h + 4);
    }
    ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
    ctx.restore();
  });
}

// 2. Dokunma / Sürükleme Mantığı (Mobil Uyumlu Touch Events)
function getCanvasCoords(e) {
  const rect = roomCanvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function handleStart(e) {
  const pos = getCanvasCoords(e);
  selectedItem = null;

  // Tıklanan noktadaki eşyayı seç (üstteki eşyadan başla)
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (pos.x >= it.x && pos.x <= it.x + it.w && pos.y >= it.y && pos.y <= it.y + it.h) {
      selectedItem = it;
      isDragging = true;
      dragStartX = pos.x - it.x;
      dragStartY = pos.y - it.y;
      break;
    }
  }
  render();
}

function handleMove(e) {
  if (!isDragging || !selectedItem) return;
  e.preventDefault();
  const pos = getCanvasCoords(e);
  selectedItem.x = pos.x - dragStartX;
  selectedItem.y = pos.y - dragStartY;
  render();
}

function handleEnd() {
  isDragging = false;
}

roomCanvas.addEventListener("mousedown", handleStart);
roomCanvas.addEventListener("mousemove", handleMove);
roomCanvas.addEventListener("mouseup", handleEnd);

roomCanvas.addEventListener("touchstart", handleStart, { passive: false });
roomCanvas.addEventListener("touchmove", handleMove, { passive: false });
roomCanvas.addEventListener("touchend", handleEnd);

// 3. Eşya Ekleme & Akıllı Düzenleme
$("addFurnitureBtn").addEventListener("click", () => {
  // Test amaçlı kestiğimiz temsili nesneyi ekler (Gelecekte Segmentasyon modeli bağlayacağız)
  if (!bgImage) return;
  const newItem = {
    img: bgImage,
    x: roomCanvas.width / 4,
    y: roomCanvas.height / 3,
    w: roomCanvas.width / 2,
    h: roomCanvas.height / 3
  };
  items.push(newItem);
  selectedItem = newItem;
  render();
});

$("autoLayoutBtn").addEventListener("click", () => {
  // Eşyaları odanın alt/zemin kısmına perspektife göre diler
  if (items.length === 0) return;
  items.forEach((item, index) => {
    item.x = 20 + (index * 40);
    item.y = roomCanvas.height - item.h - 20;
  });
  render();
});

$("clearBtn").addEventListener("click", () => {
  items = [];
  selectedItem = null;
  render();
});

$("downloadCanvasBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "oda-tasarimi.png";
  link.href = roomCanvas.toDataURL("image/png");
  link.click();
});
