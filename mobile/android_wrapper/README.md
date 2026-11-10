# PANDUAN BUILD FLUTTER ANDROID WEBVIEW — HITUNG BANTER

Aplikasi ini merupakan pembungkus resmi (Android WebView Wrapper) untuk aplikasi web **HITUNG BANTER**.

## 1. Prasyarat
- Flutter SDK (versi >= 3.0.0)
- Android Studio / Android SDK (API level minimal 21 / Android 5.0 Lollipop)
- Java Development Kit (JDK 17 disarankan)

## 2. Konfigurasi URL Produksi
Secara default, aplikasi memuat URL dari konfigurasi environment `APP_URL`. Anda dapat menentukan URL website saat build:

```bash
flutter run --dart-define=APP_URL=https://app.banter.id
```

Atau ubah konstanta default di `lib/main.dart`:
```dart
static const String appUrl = String.fromEnvironment(
  'APP_URL',
  defaultValue: 'https://app.banter.id',
);
```

## 3. Instalasi Dependensi
Jalankan di dalam folder `mobile/android_wrapper`:
```bash
flutter pub get
```

## 4. Menjalankan di Emulator / Perangkat Nyata
```bash
flutter run
```

## 5. Build APK Release (Untuk Diinstal di HP Driver/Admin)
```bash
flutter build apk --release --dart-define=APP_URL=https://app.banter.id
```
File APK output terletak di:
`build/app/outputs/flutter-apk/app-release.apk`

## 6. Build Android App Bundle (AAB untuk Google Play Store)
```bash
flutter build appbundle --release --dart-define=APP_URL=https://app.banter.id
```
File AAB output terletak di:
`build/app/outputs/bundle/release/app-release.aab`
