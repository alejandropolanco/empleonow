import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-script";

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve) => existing.addEventListener("load", () => resolve()));
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Turnstile"));
    document.head.appendChild(script);
  });
}

/**
 * Widget de Cloudflare Turnstile. Si no hay VITE_TURNSTILE_SITE_KEY
 * configurada no renderiza nada y el backend opera en modo bypass.
 */
export function Turnstile({
  onToken,
  theme = "auto",
  resetSignal = 0,
}: {
  onToken: (token: string) => void;
  theme?: "light" | "dark" | "auto";
  resetSignal?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Guardamos el callback en un ref para no re-renderizar el widget cuando
  // el componente padre cambia de estado.
  const callbackRef = useRef(onToken);
  callbackRef.current = onToken;
  const widgetIdRef = useRef<string | undefined>(undefined);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme,
          callback: (token) => callbackRef.current(token),
          "expired-callback": () => callbackRef.current(""),
          "error-callback": () => callbackRef.current(""),
        });
      })
      .catch(() => callbackRef.current(""));

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    };
  }, [siteKey, theme]);

  // Los tokens de Turnstile son de un solo uso: si el backend rechaza el
  // intento, el padre incrementa resetSignal para pedir uno nuevo.
  useEffect(() => {
    if (resetSignal === 0) return;
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    callbackRef.current("");
  }, [resetSignal]);

  if (!siteKey) return null;
  return <div ref={ref} className="flex justify-center" />;
}
