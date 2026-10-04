package com.wm.personalblog;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.res.AssetManager;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.util.UUID;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final String APP_ASSET_HOST = "appassets.local";
    private static final String APP_START_URL = "http://" + APP_ASSET_HOST + "/index.html";
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private int webViewInsetLeft;
    private int webViewInsetTop;
    private int webViewInsetRight;
    private int webViewInsetBottom;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        boolean isDebuggable =
                (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(isDebuggable);

        webView = new WebView(this);
        setContentView(webView);
        View decorView = getWindow().getDecorView();
        decorView.setOnApplyWindowInsetsListener(this::applyWindowInsets);
        decorView.requestApplyInsets();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                applyWebViewInsetsToPage();
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(
                    WebView view,
                    WebResourceRequest request
            ) {
                return interceptAppAsset(request.getUrl());
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams fileChooserParams
            ) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }

                filePathCallback = callback;

                try {
                    startActivityForResult(fileChooserParams.createIntent(), FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception error) {
                    filePathCallback = null;
                    return false;
                }
            }
        });

        webView.loadUrl(APP_START_URL);
    }

    private WindowInsets applyWindowInsets(View view, WindowInsets insets) {
        updateWindowInsets(insets);
        applyWebViewInsetsToPage();
        return insets;
    }

    private void updateWindowInsets(WindowInsets insets) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Insets systemInsets = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout()
            );
            Insets gestureInsets = insets.getInsets(
                    WindowInsets.Type.systemGestures() | WindowInsets.Type.mandatorySystemGestures()
            );
            webViewInsetLeft = systemInsets.left;
            webViewInsetTop = systemInsets.top;
            webViewInsetRight = systemInsets.right;
            webViewInsetBottom = Math.max(systemInsets.bottom, gestureInsets.bottom);
        } else {
            webViewInsetLeft = insets.getSystemWindowInsetLeft();
            webViewInsetTop = insets.getSystemWindowInsetTop();
            webViewInsetRight = insets.getSystemWindowInsetRight();
            webViewInsetBottom = insets.getSystemWindowInsetBottom();
        }
    }

    private void applyWebViewInsetsToPage() {
        if (webView == null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            WindowInsets rootInsets = getWindow().getDecorView().getRootWindowInsets();
            if (rootInsets != null) {
                updateWindowInsets(rootInsets);
            }
        }

        String script = "(() => {"
                + "const root = document.documentElement;"
                + "root.style.setProperty('--safe-area-inset-left', '" + webViewInsetLeft + "px');"
                + "root.style.setProperty('--safe-area-inset-top', '" + webViewInsetTop + "px');"
                + "root.style.setProperty('--safe-area-inset-right', '" + webViewInsetRight + "px');"
                + "root.style.setProperty('--safe-area-inset-bottom', '" + webViewInsetBottom + "px');"
                + "})();";
        webView.evaluateJavascript(script, null);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) {
            return;
        }

        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                results = new Uri[count];
                for (int index = 0; index < count; index++) {
                    results[index] = data.getClipData().getItemAt(index).getUri();
                }
            } else if (data.getData() != null) {
                results = new Uri[]{data.getData()};
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
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }

        super.onDestroy();
    }

    private WebResourceResponse interceptAppAsset(Uri uri) {
        if (
                uri == null
                        || !"http".equalsIgnoreCase(uri.getScheme())
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

        if (assetPath.startsWith("health-images/")) {
            return interceptHealthImage(assetPath.substring("health-images/".length()));
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

    private WebResourceResponse interceptHealthImage(String imageId) {
        File imageFile = healthImageFile(imageId);
        if (imageFile == null || !imageFile.isFile()) {
            return createErrorResponse(404, "Not Found");
        }

        try {
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "private, max-age=31536000, immutable");
            headers.put("Access-Control-Allow-Origin", "*");
            return new WebResourceResponse(
                    mimeTypeFor(imageFile.getName()),
                    null,
                    200,
                    "OK",
                    headers,
                    new FileInputStream(imageFile)
            );
        } catch (IOException error) {
            return createErrorResponse(404, "Not Found");
        }
    }

    private File healthImageDirectory() {
        File directory = new File(getFilesDir(), "health-images");
        if (!directory.exists() && !directory.mkdirs()) {
            return null;
        }
        return directory;
    }

    private File healthImageFile(String imageId) {
        if (imageId == null || !imageId.matches("[A-Za-z0-9-]+\\.(webp|jpg|jpeg|png)")) {
            return null;
        }
        File directory = healthImageDirectory();
        return directory == null ? null : new File(directory, imageId);
    }

    private final class AndroidBridge {
        private static final int MAX_IMAGE_BYTES = 2 * 1024 * 1024;

        @JavascriptInterface
        public int getSystemInsetBottom() {
            return webViewInsetBottom;
        }

        @JavascriptInterface
        public String saveHealthImage(String dataUrl) {
            if (dataUrl == null || dataUrl.length() < 32) {
                return "";
            }

            int comma = dataUrl.indexOf(',');
            if (comma <= 0 || comma == dataUrl.length() - 1) {
                return "";
            }

            String header = dataUrl.substring(0, comma).toLowerCase(Locale.US);
            String extension;
            if (header.startsWith("data:image/webp;base64")) {
                extension = ".webp";
            } else if (header.startsWith("data:image/jpeg;base64") || header.startsWith("data:image/jpg;base64")) {
                extension = ".jpg";
            } else if (header.startsWith("data:image/png;base64")) {
                extension = ".png";
            } else {
                return "";
            }

            try {
                byte[] bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
                if (bytes.length == 0 || bytes.length > MAX_IMAGE_BYTES) {
                    return "";
                }

                File directory = healthImageDirectory();
                if (directory == null) {
                    return "";
                }

                String imageId = UUID.randomUUID().toString().replace("-", "") + extension;
                File target = new File(directory, imageId);
                try (FileOutputStream output = new FileOutputStream(target)) {
                    output.write(bytes);
                }
                return imageId;
            } catch (IllegalArgumentException | IOException error) {
                return "";
            }
        }

        @JavascriptInterface
        public boolean deleteHealthImage(String imageId) {
            File imageFile = healthImageFile(imageId);
            return imageFile != null && imageFile.isFile() && imageFile.delete();
        }
    }

    private WebResourceResponse createErrorResponse(int statusCode, String reason) {
        byte[] bytes = reason.getBytes(java.nio.charset.StandardCharsets.UTF_8);
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
}
