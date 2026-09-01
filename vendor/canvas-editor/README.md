# CanvasEditor vendored runtime

This directory contains the framework-agnostic canvas runtime built from
[WindRunnerMax/CanvasEditor](https://github.com/WindRunnerMax/CanvasEditor) and used by the Vue resume editor.

The upstream project is MIT licensed. See `LICENSE`. The utility entry point and one generated import were narrowed so the canvas runtime can be bundled by Vue/Vite without pulling in the upstream React demo.
