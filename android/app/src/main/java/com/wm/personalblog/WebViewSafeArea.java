package com.wm.personalblog;

/** Converts only the system-bar area not already excluded by native layout. */
final class WebViewSafeArea {
    private WebViewSafeArea() {}

    static float toCssOverlap(int insetPixels, int nativeMarginPixels, float density) {
        int overlap = Math.max(0, insetPixels - Math.max(0, nativeMarginPixels));
        return toCssPixels(overlap, density);
    }

    static float toCssPixels(int physicalPixels, float density) {
        return physicalPixels / (density > 0f ? density : 1f);
    }
}
