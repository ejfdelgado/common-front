// src/app/interceptors/error.interceptor.ts

import { Injectable } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(
        private snackBar: MatSnackBar,
        private router: Router
    ) { }

    intercept(
        request: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                let errorMessage: string | null = null;

                if (error.error instanceof ErrorEvent) {
                    // Client-side error
                    errorMessage = error.error.message;
                } else {
                    // Server-side error
                    errorMessage = error.error?.message || error.message;

                    if (!errorMessage) {
                        switch (error.status) {
                            case 400:
                                errorMessage = error.error?.message || 'Bad request';
                                break;
                            case 401:
                                // Handled by AuthInterceptor
                                break;
                            case 403:
                                errorMessage = 'You do not have permission to access this resource';
                                this.router.navigate(['/forbidden']);
                                break;
                            case 404:
                                errorMessage = 'Resource not found';
                                break;
                            case 429:
                                errorMessage = 'Too many requests. Please try again later';
                                break;
                            case 500:
                                errorMessage = 'Internal server error';
                                break;
                            case 503:
                                errorMessage = 'Service temporarily unavailable';
                                break;
                        }
                    }
                }

                if (!errorMessage) {
                    errorMessage = 'An error occurred';
                }

                // Show error message to user (except for 401)
                if (error.status !== 401) {
                    this.showErrorMessage(errorMessage);
                }

                console.error('HTTP Error:', error);

                return throwError(() => new Error(errorMessage));
            })
        );
    }

    private showErrorMessage(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
        });
    }
}