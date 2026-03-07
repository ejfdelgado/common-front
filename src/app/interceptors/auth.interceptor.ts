// src/app/interceptors/auth.interceptor.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpErrorResponse,
    HttpResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from 'environments/environment';
import { AuthService } from '@services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    constructor(
        private authService: AuthService,
        private router: Router,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    intercept(
        request: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        // Skip interceptor for specific requests
        if (this.shouldSkipInterceptor(request)) {
            return next.handle(request);
        }

        // Add token to request
        const authReq = this.addTokenToRequest(request);

        return next.handle(authReq).pipe(
            catchError((error: HttpErrorResponse) => {
                // Handle 401 Unauthorized errors
                if (error.status === 401 && !request.url.includes('/auth/refresh')) {
                    return this.handle401Error(authReq, next);
                }

                // Handle 403 Forbidden errors
                if (error.status === 403) {
                    this.router.navigate(['/forbidden']);
                }

                // Handle token expired errors
                if (error.error?.code === 'TOKEN_EXPIRED') {
                    return this.handleTokenExpired(authReq, next);
                }

                return throwError(() => error);
            }),
        );
    }

    /**
     * Add authorization header to request
     */
    private addTokenToRequest(request: HttpRequest<any>): HttpRequest<any> {
        const token = this.authService.token();
        if (token) {
            return request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
        }

        return request;
    }

    /**
     * Handle 401 Unauthorized errors
     */
    private handle401Error(
        request: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        return throwError(() => new Error());
    }

    /**
     * Handle token expired errors from server
     */
    private handleTokenExpired(
        request: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        return throwError(() => new Error());
    }

    /**
     * Check if interceptor should be skipped for this request
     */
    private shouldSkipInterceptor(request: HttpRequest<any>): boolean {
        const skipUrls = [
            '/public/'
        ];

        if (!request.url.startsWith(environment.apiUrl)) {
            return true;
        }

        // Skip token addition for specific URLs
        if (skipUrls.some(url => request.url.includes(url))) {
            return true;
        }

        return false;
    }
}