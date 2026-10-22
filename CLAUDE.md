# Odaly — Proje Kuralları

## Amaç
Kadınlar/ev hanımları için yapay zekâ iç mimari PWA'sı. Kullanıcı oda fotoğrafı, 360° fotoğraf veya video yükler, tarz seçer; yapay zekâ mevcut eşyalarıyla odanın yeni tasarımını üretir. Önce/sonra karşılaştırma ve indirme var. Şimdilik yalnızca eşi kullanıyor; hedef ticari ürün.

## Altyapı (ücretsiz)
- Kod: GitHub `nalciguler-netizen/-mimari-AI`, dal `main`.
- Yayın: Cloudflare Worker `odaly-api`, GitHub'a bağlı otomatik build (Workers Builds). Site ve `/api/*` aynı Worker'dan sunulur: https://odaly-api.yolhava-destek.workers.dev/index.html
- `wrangler.jsonc` bağlamları tanımlar: `ASSETS`, `AI` (Workers AI), `LIMITS` (KV, günlük hak sayacı). Worker adı `odaly-api` olarak kalmalı.
- `.assetsignore` zorunlu: `_worker.js`, `wrangler.jsonc`, `worker`, `README.md` herkese açık dosya olarak yayınlanmasın.
- Yapay zekâ: Workers AI `@cf/black-forest-labs/flux-2-klein-4b` (multipart, `input_image_0`, görsel 512 px). Ücretsiz katman günde 10.000 nöron, hesaptaki tüm Workers AI kullanımıyla ortak.
- Günlük hak: IP başına `DAILY_LIMIT` (şu an varsayılan 30, test için). Yayından önce düşürülecek.

## Alınan kararlar
- Replicate bırakıldı (ücretli). Runway img2img (hata 5018) ve SDXL (hata 3030) bu hesapta çalışmıyor; FLUX.2 klein çalışıyor.
- Hafif / Dengeli / Cesur ayarı model parametresi değil, komut metnini değiştirir (`_worker.js` içinde): Hafif eşyaları ve odayı aynı bırakır, Dengeli renk ve dekoru değiştirir, Cesur eşyaları yeniden yerleştirebilir.
- Eşyaları gerçekten taşıma (nesne ayırma) yok; model sahneyi yeniden çizer. Garanti verilmez.
- Arayüz Türkçe; kamera ile çekim, 360° kırpma (90° görünüm), video kare seçimi, Temizle düğmesi mevcut.
- Dosyalar GitHub'a Hakan tarafından web arayüzünden yüklenir (Claude oturumunun push yetkisi yok).

## Yapılmayacaklar
- Kazanç gelmeden ücretli servis seçme.
- API anahtarı, token, şifre dosyaya veya sohbete yazma (Replicate anahtarı iptal edilmeli).
- Cloudflare editörüne kod yapıştırtma; her güncelleme GitHub'a dosya yükleyerek yapılır.
- Her seferinde tüm paketi gönderme; yalnızca değişen dosyaları ver, tek adım tarif et.
- Başka uygulamanın dosyalarını bu sohbete karıştırma.
- Dosya kartlarını (index.html vb.) Claude içinde açtırma; indirip yükletmesini söyle.
- Adresi cümle sonu noktasıyla verme; adresi tek başına, noktasız yaz.
- Uygulama düzgün çalışmadan "tamam" deme; gerçek cihazda dene.

## Ticari kullanım kuralları
- Her özellik ticari düşünülerek tasarlanır: gizlilik ve şartlar sayfaları (`gizlilik.html`, `sartlar.html`) güncel kalır, iletişim `yolhava.destek@gmail.com`.
- Yayından önce FLUX.2 klein (Black Forest Labs) lisansı ve Cloudflare şartları ticari kullanım için doğrulanır.
- Abonelik/kredi için Google Play Faturalandırma sonra eklenecek; o zamana kadar yalnızca günlük ücretsiz hak.
- Play geliştirici hesabı eşinin adına; yayın hazırlığı buna göre yapılır.
- Kullanıcı fotoğrafları sunucuda saklanmaz; yalnızca üretim için Workers AI'ya gönderilir (gizlilik metniyle uyumlu kalmalı).
- İkon stili: koyu arka plan, tek parlak neon merkez sembol, 3D görünüm (henüz yapılmadı).
