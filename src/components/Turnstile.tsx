import { useEffect, useRef, useState } from "react";

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact";
}

declare global {
  interface Window {
    turnstile: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: string;
          size?: string;
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export const Turnstile = ({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = "auto",
  size = "normal",
}: TurnstileProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    // Check if script is already loaded
    if (window.turnstile) {
      setIsLoaded(true);
      return;
    }

    // Set timeout for loading - bypass if takes too long
    const loadTimeout = setTimeout(() => {
      if (!window.turnstile) {
        console.warn("Turnstile failed to load, bypassing verification");
        setLoadFailed(true);
        onVerify("bypass-turnstile-load-failed");
      }
    }, 5000);

    // Load Turnstile script
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      console.warn("Turnstile script failed to load");
      setLoadFailed(true);
      onVerify("bypass-turnstile-script-error");
    };

    window.onTurnstileLoad = () => {
      clearTimeout(loadTimeout);
      setIsLoaded(true);
    };

    document.head.appendChild(script);

    return () => {
      clearTimeout(loadTimeout);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete window.onTurnstileLoad;
    };
  }, [onVerify]);

  useEffect(() => {
    if (loadFailed || !isLoaded || !containerRef.current || !window.turnstile) return;

    // Remove existing widget if any
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {
        // Widget might not exist
      }
    }

    // Render new widget
    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        "error-callback": () => {
          console.warn("Turnstile verification error, bypassing");
          onVerify("bypass-turnstile-error");
        },
        "expired-callback": onExpire,
        theme,
        size,
      });
    } catch (e) {
      console.warn("Turnstile render failed, bypassing");
      onVerify("bypass-turnstile-render-failed");
    }

    return () => {
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Widget might not exist
        }
      }
    };
  }, [loadFailed, isLoaded, siteKey, onVerify, onExpire, theme, size]);

  if (loadFailed) {
    return null; // Don't show anything if Turnstile failed
  }

  return <div ref={containerRef} className="flex justify-center my-4" />;
};

export const resetTurnstile = (widgetId: string) => {
  if (window.turnstile && widgetId) {
    window.turnstile.reset(widgetId);
  }
};
