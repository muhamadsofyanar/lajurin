"use client";

import { useEffect } from "react";

type Props = {
  productId: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  facebookPixelId?: string | null;
  tiktokPixelId?: string | null;
  providerEvent?: "PageView" | "InitiateCheckout" | "Purchase";
  value?: number;
};

type FacebookQueue = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  loaded: boolean;
  version: string;
  push: (...args: unknown[]) => void;
};

type TikTokQueue = unknown[][] & {
  _i?: Record<string, unknown[]>;
  _t?: Record<string, number>;
  _o?: Record<string, unknown>;
  methods?: string[];
  track?: (...args: unknown[]) => void;
  load?: (id: string) => void;
};

export function ConversionTracker({ productId, utmSource, utmMedium, utmCampaign, facebookPixelId, tiktokPixelId, providerEvent = "PageView", value }: Props) {
  useEffect(() => {
    const key = "rizqhub_visitor";
    const legacyKey = "lajurin_visitor";
    let visitorId = window.localStorage.getItem(key) ?? window.localStorage.getItem(legacyKey);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
    }
    window.localStorage.setItem(key, visitorId);
    if (providerEvent === "PageView") {
      const viewKey = `rizqhub_view_${productId}`;
      const legacyViewKey = `lajurin_view_${productId}`;
      const lastView = Number(window.sessionStorage.getItem(viewKey) ?? window.sessionStorage.getItem(legacyViewKey) ?? 0);
      if (Date.now() - lastView > 30 * 60 * 1000) {
        window.sessionStorage.setItem(viewKey, String(Date.now()));
        void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, visitorId, utmSource, utmMedium, utmCampaign }), keepalive: true });
      }
    }

    if (facebookPixelId) {
      const win = window as typeof window & { fbq?: FacebookQueue; _fbq?: FacebookQueue };
      if (!win.fbq) {
        const fbq = ((...args: unknown[]) => fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args)) as FacebookQueue;
        fbq.queue = [];
        fbq.loaded = true;
        fbq.version = "2.0";
        fbq.push = fbq;
        win.fbq = fbq;
        win._fbq = fbq;
        fbq("init", facebookPixelId);
      }
      if (!document.querySelector(`script[data-meta-pixel="${facebookPixelId}"]`)) {
        const script = document.createElement("script");
        script.async = true;
        script.src = "https://connect.facebook.net/en_US/fbevents.js";
        script.dataset.metaPixel = facebookPixelId;
        document.head.appendChild(script);
      }
      if (value) win.fbq("track", providerEvent, { value, currency: "IDR" });
      else win.fbq("track", providerEvent);
    }
    if (tiktokPixelId) {
      const win = window as typeof window & { TiktokAnalyticsObject?: string; ttq?: TikTokQueue };
      win.TiktokAnalyticsObject = "ttq";
      const ttq = (win.ttq ?? []) as TikTokQueue;
      win.ttq = ttq;
      if (!ttq.track) ttq.track = (...args: unknown[]) => { ttq.push(["track", ...args]); };
      if (!ttq.load) ttq.load = (id: string) => {
          ttq._i ??= {};
          ttq._t ??= {};
          ttq._o ??= {};
          ttq._i[id] = [];
          ttq._t[id] = Date.now();
          ttq._o[id] = {};
          const script = document.createElement("script");
          script.async = true;
          script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(id)}&lib=ttq`;
          script.dataset.tiktokPixel = id;
          document.head.appendChild(script);
        };
      const tiktokEvent = providerEvent === "Purchase" ? "CompletePayment" : providerEvent === "InitiateCheckout" ? "InitiateCheckout" : "ViewContent";
      if (!document.querySelector(`script[data-tiktok-pixel="${tiktokPixelId}"]`)) ttq.load(tiktokPixelId);
      ttq.track(tiktokEvent, value ? { value, currency: "IDR" } : {});
    }
  }, [productId, utmSource, utmMedium, utmCampaign, facebookPixelId, tiktokPixelId, providerEvent, value]);
  return null;
}
