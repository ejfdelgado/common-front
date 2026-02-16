import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation, withInMemoryScrolling } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { routes } from './app.routes';
import { AuthInterceptor } from '@interceptors/auth.interceptor';
import { ErrorInterceptor } from '@interceptors/error.interceptor';
import { LoadingInterceptor } from '@interceptors/loading.interceptor';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';

import moment from 'moment';
import 'moment/locale/es';
import { defaultFirebaseApp } from '@services/firebase';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';

const DATE_LOCALE = "es";

moment.locale(DATE_LOCALE);

export const appConfig: ApplicationConfig = {
  providers: [
    provideFirebaseApp(() => {
      return defaultFirebaseApp;
    }
    ),
    provideAuth(() => getAuth(defaultFirebaseApp)),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(
      withInterceptorsFromDi()
    ),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true },
    provideRouter(
      routes,
      withHashLocation(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
      withComponentInputBinding()
    ),
    provideMomentDateAdapter(),
    {
      provide: MAT_DATE_LOCALE,
      useValue: DATE_LOCALE
    }
  ]
};
