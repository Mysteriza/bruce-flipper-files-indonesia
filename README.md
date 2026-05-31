# Bruce SD Card — Edisi Indonesia

Koleksi file IR, SubGHz, BadUSB, dan Evil Portal untuk **Flipper Zero** dan **Bruce** (ESP32 firmware), dikurasi khusus untuk perangkat yang tersedia di Indonesia.

## Struktur Direktori

```
├── bad-usb/               — Script BadUSB (grabber, dll)
├── bruce-web-ui/          — Web UI untuk Bruce ESP32
├── infrared/              — Remote control IR
│   ├── acs/               — AC (21 brand Indonesia)
│   ├── audio-and-video-receivers/ — AV Receiver (20 brand)
│   ├── cameras/           — Kamera (10 brand)
│   ├── car-multimedia/    — Multimedia mobil (JVC, Kenwood, Pioneer, Toyota, Volvo)
│   ├── cctv/              — CCTV (Hikvision + generic)
│   ├── computers/         — Komputer (Apple)
│   ├── fans/              — Kipas angin (14 brand Indonesia)
│   ├── projectors/        — Proyektor (24 brand)
│   ├── speakers/          — Speaker aktif (14 brand)
│   ├── touchscreen-displays/   — Layar interaktif (7 brand)
│   ├── tvs/               — TV (20 brand Indonesia)
│   └── universal-tv-remotes/   — Remote universal
├── interpreter/           — Script interpreter untuk berbagai protokol
├── subghz/                — File SubGHz
│   ├── garages/           — Garasi (CAME, de Bruijn, Security 2.0)
│   ├── gas-sign/          — Papan harga BBM
│   ├── projection-screens/— Layar proyektor
│   └── vehicles/          — Kendaraan (Honda, Isuzu, LDV, Lexus, Mazda, Nissan)
├── themes/                — Tema tampilan Bruce
└── wifi/
    └── evil-portal/       — 12 halaman evil portal untuk pentesting edukasi
```

## Tentang

SD card ini adalah hasil kurasi dari repositori internasional seperti [Flipper-IRDB](https://github.com/logickworkshop/Flipper-IRDB) dan [UberGuidoZ](https://github.com/UberGuidoZ/Flipper), yang telah dibersihkan hanya menyisakan brand-brand yang **tersedia di Indonesia** dari era 2000-an hingga 2026.

Brand-brand luar negeri (Amazon, Vizio, Grundig, Frigidaire, dll) yang tidak pernah dijual resmi di Indonesia telah dihapus agar navigasi lebih cepat dan relevan.

## Penggunaan

1. Copy seluruh isi ke microSD Flipper Zero / Bruce ESP32
2. Navigasi melalui menu Infrared / SubGHz / BadUSB / WiFi
3. Untuk evil portal: gunakan di menu WiFi Bruce, pilih file .html sesuai target

## Peringatan

Konten ini untuk **tujuan edukasi dan pengujian keamanan** pada perangkat milik sendiri. Penggunaan untuk akses tidak sah ke jaringan atau perangkat orang lain adalah ilegal.

## Sumber

- [Flipper-IRDB](https://github.com/logickworkshop/Flipper-IRDB)
- [UberGuidoZ Flipper](https://github.com/UberGuidoZ/Flipper)
- [flipper-zero-evil-portal](https://github.com/bigbrodude6119/flipper-zero-evil-portal)
