package com.wm.personalblog;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
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
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final String APP_ASSET_HOST = "appassets.local";
    private static final String APP_START_URL = "http://" + APP_ASSET_HOST + "/index.html";
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        boolean isDebuggable =
                (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(isDebuggable);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        webView.setWebViewClient(new WebViewClient() {
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

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) {
            return;
        }

        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null && data.getData() != null) {
            results = new Uri[]{data.getData()};
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
