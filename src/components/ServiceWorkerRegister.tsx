"use client";

import { useEffect } from "react";
import { BASE_PATH } from "@/lib/assetPath";

/**
 * Registers /sw.js so the tracker keeps working offline (game companion
 * use-case: alt-tab while playing). Skipped during development so it never
 * interferes with HMR and the dev server.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register(`${BASE_PATH}/sw.js`).catch(() => {
        /* offline support is best-effort — never surface an error */
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
