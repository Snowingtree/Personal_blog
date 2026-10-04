package com.wm.personalblog;

/** Standalone regression checks; runs with the JDK without an emulator. */
public final class WebViewSafeAreaTest {
    public static void main(String[] args) {
        expect("3x edge-to-edge status bar", 24f, 72, 0, 3f);
        expect("3x gesture bar", 28f, 84, 0, 3f);
        expect("already fitted status bar", 0f, 72, 72, 3f);
        expect("already fitted navigation bar", 0f, 84, 84, 3f);
        expect("partially fitted window", 12f, 72, 36, 3f);
        expect("keyboard resized window", 0f, 84, 800, 3f);
        expect("hidden keyboard inset", 0f, 0, 0, 3f);
        expect("landscape side navigation", 24f, 72, 0, 3f);
        expect("fractional density", 30f, 84, 0, 2.8f);
        expect("ldpi screen", 24f, 18, 0, 0.75f);
        expect("invalid density fallback", 24f, 24, 0, 0f);
        expect("negative native margin", 24f, 72, -10, 3f);
        System.out.println("12 safe-area regression checks passed.");
    }

    private static void expect(String label, float expected, int inset, int margin, float density) {
        float actual = WebViewSafeArea.toCssOverlap(inset, margin, density);
        if (Math.abs(actual - expected) > 0.001f) {
            throw new AssertionError(label + ": expected " + expected + ", got " + actual);
        }
    }
}
