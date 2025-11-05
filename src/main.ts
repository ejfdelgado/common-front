import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

(function preserveQueryParams() {
  const { search, hash } = window.location;
  if (search && hash && !hash.includes('?')) {
    window.location.replace(hash + search);
  }
})();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
