// Same-origin module worker entry for FFmpeg.wasm.
// Loading the actual worker as a module from its CDN URL preserves
// relative imports (./const.js, ./errors.js) that break when the worker
// source itself is copied into an anonymous blob: URL.
import "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/esm/worker.js";
