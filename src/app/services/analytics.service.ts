import { Injectable } from '@angular/core';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private loadPromise?: Promise<void>;
  private configuredIds = new Set<string>();
  private readonly disabled = window.location.hostname === 'localhost';

  constructor() {

  }

  gtagConfig(id: string, config: Record<string, any> = {}): Promise<void> {
    if (this.disabled) {
      return Promise.resolve();
    }
    this.ensureGtag();
    if (!this.configuredIds.has(id)) {
      this.configuredIds.add(id);
      window.gtag('config', id, config);
    }
    return this.loadScript(id);
  }

  event(name: string, params: Record<string, any> = {}) {
    if (this.disabled || !window.gtag) {
      return;
    }
    window.gtag('event', name, params);
  }

  setUserId(userId: string | null) {
    if (this.disabled || !window.gtag) {
      return;
    }
    window.gtag('set', { user_id: userId });
  }

  private ensureGtag() {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      // gtag.js expects the Arguments object itself, not an array
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
    }
  }

  private loadScript(id: string): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      script.async = true;

      script.onload = () => resolve();
      script.onerror = () => {
        this.loadPromise = undefined;
        reject(new Error('Failed to load Google Analytics gtag.js'));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }
}
