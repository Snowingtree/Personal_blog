package com.wm.personalblog;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int STORAGE_PERMISSION_REQUEST = 1002;
    private static final int MAX_IMAGE_BYTES = 15 * 1024 * 1024;
    private static final String APP_ASSET_HOST = "appassets.local";
    private static final String APP_START_URL = "https://" + APP_ASSET_HOST + "/index.html";

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestLegacyStoragePermission();

        boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(isDebuggable);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return interceptAppAsset(request.getUrl());
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }

                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                intent.setType("image/*");
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception error) {
                    MainActivity.this.filePathCallback = null;
                    showToast("无法打开图片选择器");
                    return false;
                }

                return true;
            }
        });
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.loadUrl(APP_START_URL);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) {
            return;
        }

        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null) {
            Uri uri = data.getData();
            if (uri != null) {
                results = new Uri[]{uri};
            }
        }

        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }

        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(null);
            filePathCallback = null;
        }

        if (webView != null) {
            webView.removeJavascriptInterface("AndroidBridge");
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }

        super.onDestroy();
    }

    private void requestLegacyStoragePermission() {
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.P) {
            return;
        }

        if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, STORAGE_PERMISSION_REQUEST);
        }
    }

    private void showToast(String message) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
    }

    private WebResourceResponse interceptAppAsset(Uri uri) {
        if (
                uri == null
                || !"https".equalsIgnoreCase(uri.getScheme())
                || !APP_ASSET_HOST.equalsIgnoreCase(uri.getHost())
        ) {
            return null;
        }

        String assetPath = uri.getPath();
        if (assetPath == null || assetPath.isEmpty() || "/".equals(assetPath)) {
            assetPath = "index.html";
        } else {
            assetPath = assetPath.replaceFirst("^/+", "");
        }

        if (assetPath.contains("..")) {
            return createErrorResponse(403, "Forbidden");
        }

        try {
            InputStream stream = getAssets().open(assetPath, AssetManager.ACCESS_STREAMING);
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-cache");
            headers.put("Access-Control-Allow-Origin", "*");

            return new WebResourceResponse(
                    mimeTypeFor(assetPath),
                    isTextAsset(assetPath) ? "UTF-8" : null,
                    200,
                    "OK",
                    headers,
                    stream
            );
        } catch (IOException error) {
            return createErrorResponse(404, "Not Found");
        }
    }

    private WebResourceResponse createErrorResponse(int statusCode, String reason) {
        byte[] bytes = reason.getBytes(StandardCharsets.UTF_8);
        return new WebResourceResponse(
                "text/plain",
                "UTF-8",
                statusCode,
                reason,
                new HashMap<>(),
                new ByteArrayInputStream(bytes)
        );
    }

    private boolean isTextAsset(String path) {
        String normalized = path.toLowerCase(Locale.US);
        return normalized.endsWith(".html")
                || normalized.endsWith(".js")
                || normalized.endsWith(".css")
                || normalized.endsWith(".json")
                || normalized.endsWith(".svg")
                || normalized.endsWith(".txt");
    }

    private String mimeTypeFor(String path) {
        String normalized = path.toLowerCase(Locale.US);
        if (normalized.endsWith(".html")) return "text/html";
        if (normalized.endsWith(".js")) return "application/javascript";
        if (normalized.endsWith(".css")) return "text/css";
        if (normalized.endsWith(".json")) return "application/json";
        if (normalized.endsWith(".svg")) return "image/svg+xml";
        if (normalized.endsWith(".png")) return "image/png";
        if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
        if (normalized.endsWith(".webp")) return "image/webp";
        if (normalized.endsWith(".gif")) return "image/gif";
        if (normalized.endsWith(".woff2")) return "font/woff2";
        if (normalized.endsWith(".woff")) return "font/woff";
        if (normalized.endsWith(".ttf")) return "font/ttf";
        return "application/octet-stream";
    }

    public class AndroidBridge {
        @JavascriptInterface
        public String saveImage(String dataUrl, String filename) {
            try {
                ImagePayload payload = ImagePayload.from(dataUrl);
                String safeName = sanitizeFilename(filename);
                String displayName = safeName + "." + payload.extension;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    saveWithMediaStore(payload, displayName);
                } else {
                    saveWithLegacyStorage(payload, displayName);
                }

                return "OK";
            } catch (Exception error) {
                return error.getMessage() == null ? "保存失败" : error.getMessage();
            }
        }
    }

    private void saveWithMediaStore(ImagePayload payload, String displayName) throws Exception {
        ContentResolver resolver = getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, displayName);
        values.put(MediaStore.Images.Media.MIME_TYPE, payload.mimeType);
        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/MeituanCoupons");
        values.put(MediaStore.Images.Media.IS_PENDING, 1);

        Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (uri == null) {
            throw new Exception("无法创建图片文件");
        }

        try {
            try (OutputStream stream = resolver.openOutputStream(uri)) {
                if (stream == null) {
                    throw new Exception("无法写入图片文件");
                }
                stream.write(payload.bytes);
            }

            values.clear();
            values.put(MediaStore.Images.Media.IS_PENDING, 0);
            if (resolver.update(uri, values, null, null) <= 0) {
                throw new Exception("无法发布图片文件");
            }
        } catch (Exception error) {
            resolver.delete(uri, null, null);
            throw error;
        }
    }

    private void saveWithLegacyStorage(ImagePayload payload, String displayName) throws Exception {
        if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            throw new Exception("缺少存储权限");
        }

        File directory = new File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
                "MeituanCoupons"
        );
        if (!directory.exists() && !directory.mkdirs()) {
            throw new Exception("无法创建图片目录");
        }

        File file = new File(directory, displayName);
        try (FileOutputStream stream = new FileOutputStream(file)) {
            stream.write(payload.bytes);
        }

        MediaScannerConnection.scanFile(
                this,
                new String[]{file.getAbsolutePath()},
                new String[]{payload.mimeType},
                null
        );
    }

    private String sanitizeFilename(String filename) {
        String value = filename == null ? "meituan-coupon" : filename.trim();
        if (value.isEmpty()) {
            value = "meituan-coupon";
        }

        return value.replaceAll("[^a-zA-Z0-9._-]", "-");
    }

    private static class ImagePayload {
        final byte[] bytes;
        final String mimeType;
        final String extension;

        private ImagePayload(byte[] bytes, String mimeType, String extension) {
            this.bytes = bytes;
            this.mimeType = mimeType;
            this.extension = extension;
        }

        static ImagePayload from(String dataUrl) throws Exception {
            if (dataUrl == null || !dataUrl.startsWith("data:image/")) {
                throw new Exception("图片数据无效");
            }

            int commaIndex = dataUrl.indexOf(',');
            if (commaIndex < 0) {
                throw new Exception("图片数据格式错误");
            }

            String header = dataUrl.substring(0, commaIndex);
            String base64 = dataUrl.substring(commaIndex + 1);
            int semicolonIndex = header.indexOf(';');
            if (semicolonIndex <= 5 || !"base64".equalsIgnoreCase(header.substring(semicolonIndex + 1))) {
                throw new Exception("图片数据格式错误");
            }

            String mimeType = header.substring(5, semicolonIndex).toLowerCase(Locale.US);
            String extension = extensionFromMimeType(mimeType);
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            if (bytes.length == 0) {
                throw new Exception("图片内容为空");
            }
            if (bytes.length > MAX_IMAGE_BYTES) {
                throw new Exception("图片不能超过 15 MB");
            }

            return new ImagePayload(bytes, mimeType, extension);
        }

        private static String extensionFromMimeType(String mimeType) throws Exception {
            if ("image/jpeg".equals(mimeType)) {
                return "jpg";
            }
            if ("image/webp".equals(mimeType)) {
                return "webp";
            }
            if ("image/gif".equals(mimeType)) {
                return "gif";
            }
            if ("image/png".equals(mimeType)) {
                return "png";
            }
            throw new Exception("不支持的图片格式");
        }
    }
}
