import { Stockfish17 } from "./stockfish17";

export const isWasmSupported = () => {
  if (typeof WebAssembly !== "object") return false;
  try {
    return WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
  } catch {
    return false;
  }
};

export const isMultiThreadSupported = () => {
  try {
    return typeof SharedArrayBuffer !== "undefined" && !isIosDevice();
  } catch {
    return false;
  }
};

export const isIosDevice = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

export const isMobileDevice = () => isIosDevice() || /Android|Opera Mini/i.test(navigator.userAgent);

export const isEngineSupported = () => Stockfish17.isSupported();