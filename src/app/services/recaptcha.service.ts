import { Injectable } from "@angular/core";

import { environment } from "../../environments/environment";

declare global {
  interface Window {
    grecaptcha?: {
      execute?: (siteKey: string, options: { action: string }) => Promise<string>;
      enterprise?: {
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
        ready?: (cb: () => void) => void;
      };
      ready?: (cb: () => void) => void;
      enterpriseReady?: (cb: () => void) => void;
    };
  }
}

type RecaptchaProvider = "v3" | "enterprise";

@Injectable({ providedIn: "root" })
export class RecaptchaService {
  private loadPromise: Promise<void> | null = null;
  private readonly siteKey = environment.recaptchaSiteKey;
  private readonly provider =
    (environment as { recaptchaProvider?: RecaptchaProvider }).recaptchaProvider ||
    "v3";

  load(): Promise<void> {
    if (!this.siteKey) {
      return Promise.reject(new Error("Missing reCAPTCHA site key"));
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    if (window.grecaptcha) {
      this.loadPromise = Promise.resolve();
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const baseUrl =
        this.provider === "enterprise"
          ? "https://www.google.com/recaptcha/enterprise.js"
          : "https://www.google.com/recaptcha/api.js";
      script.src = `${baseUrl}?render=${this.siteKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  async execute(action: string): Promise<string> {
    await this.load();

    const grecaptcha = window.grecaptcha;
    if (!grecaptcha) {
      throw new Error("reCAPTCHA is not available");
    }

    const api =
      this.provider === "enterprise" && grecaptcha.enterprise
        ? grecaptcha.enterprise
        : grecaptcha;

    const ready =
      api.ready || grecaptcha.ready || grecaptcha.enterpriseReady || null;

    if (ready) {
      await new Promise<void>((resolve) => ready(() => resolve()));
    }

    if (!api.execute) {
      throw new Error("reCAPTCHA execute not available");
    }

    return api.execute(this.siteKey, { action });
  }
}
