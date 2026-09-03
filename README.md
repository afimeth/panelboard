# Panelboard

Panelboard, iki farklı arayüz fikrini tek bir çalışma alanında birleştiren bir
ön yüz prototipidir:

- **Dockable panel sistemi** ([dockview-react](https://github.com/mathuo/dockview)
  tabanlı): kullanıcı panelleri sürükleyip bırakarak yeniden düzenleyebilir,
  yan yana yerleştirebilir ya da sekmeleyebilir.
- **Node tabanlı workflow canvas** ([reactflow](https://reactflow.dev/)
  tabanlı): bir işlem hattını (pipeline) düğümler ve akan bağlantı çizgileriyle
  görselleştiren, pan/zoom destekli bir tuval.

Arayüz, koyu temalı bir "HUD" (heads-up display) estetiğiyle tasarlanmıştır:
camsı paneller, neon kenarlık parıltıları ve canlı nabız animasyonları.

## Paneller

Uygulama; arka planda çalışan ajan/servis süreçlerini, harici API çağrılarının
kullanım ve maliyet verisini, bir görev kuyruğunun akışını ve genel sistem
istatistiklerini (CPU/RAM) izlemek üzere tasarlanmış örnek panellerle gelir:

- **Ajan durumu** — arka planda çalışan bir ajan sürecinin aktif/pasif
  durumunu ve süreç kimliklerini gösterir.
- **API kullanımı** — harici bir API'ye yapılan çağrıların token ve maliyet
  (USD) dökümünü görev bazında gruplayarak listeler.
- **Görev akışı** — bir görev kuyruğundaki kayıtları durumlarına (açık,
  işleniyor, incelemede, tamamlandı) göre canlı olarak akıtır.
- **Aktif modeller** — arka planda çalışan model/ajan süreçlerinin anlık
  meşgul/boşta durumunu ve üzerinde çalıştıkları görevi listeler.
- **Son belgeler** — bir belge dizinindeki en son güncellenen dosyaları
  önizlemeleriyle birlikte gösterir.
- **Oturumlar** ve **sistem istatistikleri** — açık editör pencerelerini ve
  anlık CPU/RAM kullanımını izler.

Tüm paneller, `server/index.ts` altında çalışan basit bir Node.js HTTP
sunucusundan (varsayılan port `4317`) veri çeker; sunucu kapalıyken paneller
zarifçe "bağlantı yok" durumuna düşer.

## Kullanılan teknolojiler

- React 18 + TypeScript + Vite
- [dockview-react](https://github.com/mathuo/dockview) — dockable panel motoru
- [reactflow](https://reactflow.dev/) — node/edge tabanlı canvas motoru
- Node.js `http` modülü ile yazılmış hafif bir arka uç (harici bağımlılık yok)

## Çalıştırma

Bağımlılıkları kurun:

```bash
npm install
```

Ön yüzü geliştirme modunda başlatın (varsayılan olarak `http://localhost:5173`):

```bash
npm run dev
```

Arka uç sunucusunu ayrı bir terminalde başlatın (varsayılan olarak
`http://localhost:4317`):

```bash
npm run server
```

Diğer kullanışlı komutlar:

```bash
npm run typecheck   # yalnızca TypeScript tip kontrolü (tsc --noEmit)
npm run build       # tip kontrolü + üretim derlemesi (vite build)
npm run preview     # üretim derlemesini yerelde önizleme
```

## Not

Bu depo bir portföy/prototip amaçlı yayındır. Arka uç sunucusu, gerçek
kullanımda kendi veri kaynaklarınıza (bir görev kuyruğu, bir kullanım/log
dosyası, kendi süreç izleme mantığınız) bağlanacak şekilde uyarlanmalıdır;
depoda örnek/gerçek veri dosyası bulunmaz.
