# Odaly

Odanı fotoğraf, 360° fotoğraf veya videoyla yükle, tarzını seç; yapay zekâ mevcut eşyalarınla yeni bir tasarım üretsin.

## Yapı
- `index.html`, `app.js`, `style.css`: uygulama (GitHub Pages)
- `worker/odaly-api.js`: Cloudflare Worker. Replicate anahtarı burada gizli kalır, günlük kullanım sınırı burada uygulanır.
- `config.js`: Worker adresi

## Kurulum
1. Cloudflare → Workers → yeni Worker `odaly-api` → `worker/odaly-api.js` içeriğini yapıştır → Deploy.
2. Worker → Settings → Variables → Secret: `REPLICATE_TOKEN` (replicate.com/account/api-tokens).
3. (İsteğe bağlı) `ALLOWED_ORIGIN` = `https://KULLANICI.github.io`; KV bağlantısı `LIMITS`; `DAILY_LIMIT`.
4. `config.js` içindeki adresi Worker adresiyle değiştir.
5. GitHub Pages: Settings → Pages → `main` / root.

## Not
Model görüntüden görüntü üretir; eşyaları gerçekten taşımaz, istemle yerleşimi yeniden kurmasını ister. "Değişim" ayarı ne kadar farklı olacağını belirler.

## Ticari kullanım notları
- `gizlilik.html` ve `sartlar.html` hazır; `config.js` içindeki `ODALY_CONTACT` adresini kendi e-postanızla değiştirin. Google Play'de gizlilik politikası adresi olarak `https://KULLANICI.github.io/REPO/gizlilik.html` girilir.
- Model `adirik/interior-design` kodu MIT lisanslıdır; temel model (Realistic Vision) ve ControlNet'lerin kendi lisansları vardır. Mağazaya çıkmadan önce bu lisansların ticari kullanıma izin verdiğini sahiplerinin sayfalarından doğrulayın.
- Ücretli abonelik/kredi için Google Play Faturalandırma ayrıca eklenmelidir; şimdilik yalnızca günlük ücretsiz hak (Worker'daki `DAILY_LIMIT`) vardır.
  
