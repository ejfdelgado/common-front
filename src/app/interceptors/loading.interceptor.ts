// src/app/interceptors/loading.interceptor.ts

import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { IndicatorService } from '@services/indicator.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private totalRequests = 0;

  constructor(private loadingService: IndicatorService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    this.totalRequests++;
    const promise = this.loadingService.start();

    return next.handle(request).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          promise.done();
        }
      }),
      finalize(() => {
        promise.done();
      })
    );
  }
}