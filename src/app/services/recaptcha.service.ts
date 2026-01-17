import { Injectable } from "@angular/core";

import { environment } from "../../environments/environment";

declare global {
  interface Window {
    grecaptcha?: {
      execute?: (siteKey: string, options: { action: string }) => Promise<string>;
      enterprise?: {
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
      ready?: (cb: () => void) => void;
      enterpriseReady?: (cb: () => void) => void;
    };
  }
}

@Injectable({ providedIn: "root" })
export class RecaptchaService {
  private loadPromise: Promise<void> | null = null;
  private readonly siteKey = environment.recaptchaSiteKey;

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
      script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
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

    if (grecaptcha.enterprise?.execute) {
      return grecaptcha.enterprise.execute(this.siteKey, { action });
    }

    if (grecaptcha.execute) {
      return grecaptcha.execute(this.siteKey, { action });
    }

    throw new Error("reCAPTCHA execute not available");
  }
}
