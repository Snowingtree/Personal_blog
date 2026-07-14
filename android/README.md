# Android APK

The Android application loads the production assets from `../dist-android` into a local WebView.

From the project root, build the web assets and APK together:

```powershell
npm run package:android
```

The installable debug APK is copied to:

```text
wm-personal-blog-debug.apk
```

The original Gradle output is also available at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

The WebView enables ordinary HTTP traffic for the private-network services and exposes `AndroidBridge.saveImage` for the Xianyu image export action.
