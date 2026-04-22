export type MetaPixelSettings = {
  enabled: boolean;
  metaPixelId: string;
  metaTestEventCode: string | null;
};

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: (...args: any[]) => void;
  }
}

let loadedForId: string | null = null;

function ensureScriptLoaded(pixelId: string) {
  if (typeof window === "undefined") return;
  if (loadedForId === pixelId && typeof window.fbq === "function") return;

  // Standard Meta Pixel snippet (adaptado)
  if (!window.fbq) {
    const fbq: any = function (...args: any[]) {
      fbq.callMethod ? fbq.callMethod.apply(fbq, args) : fbq.queue.push(args);
    };
    fbq.queue = [];
    fbq.version = "2.0";
    fbq.loaded = true;
    fbq.push = fbq;
    window.fbq = fbq;
    window._fbq = fbq;

    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
  }

  loadedForId = pixelId;
}

export function metaPixelInit(settings: MetaPixelSettings) {
  if (typeof window === "undefined") return;
  if (!settings.enabled) return;
  const id = settings.metaPixelId.trim();
  if (!id) return;

  ensureScriptLoaded(id);
  window.fbq?.("init", id);
}

export function metaPixelPageView() {
  if (typeof window === "undefined") return;
  window.fbq?.("track", "PageView");
}

export function metaPixelTrack(
  event: "InitiateCheckout" | "Purchase",
  payload: Record<string, unknown>,
  settings?: MetaPixelSettings | null
) {
  if (typeof window === "undefined") return;
  const testCode = settings?.metaTestEventCode?.trim();
  const trackOptions = testCode ? { test_event_code: testCode } : undefined;
  if (trackOptions) {
    window.fbq?.("track", event, payload, trackOptions);
  } else {
    window.fbq?.("track", event, payload);
  }
}

