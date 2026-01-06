import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GoogleGsiLoaderService {
  private loadPromise?: Promise<void>;

  load(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      // Already loaded
      if ((window as any).google?.accounts) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error('Failed to load Google Identity Services'));

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }
}
