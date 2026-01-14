import { Injectable, signal, computed, effect, NgZone } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { GoogleGsiLoaderService } from './google-gsi-loader.service';
import { environment } from 'environments/environment';
import { HttpClient } from '@angular/common/http';

const AUTH_FLAG_KEY = 'google_auth_logged_in';

declare global {
    interface Window {
        google: any;
    }
}

@Injectable({
    providedIn: 'root',
})
export class GoogleAuthService {
    private readonly clientId = environment.googleClientId;

    private userSignal = signal<GoogleUser | null>(null);

    readonly user = computed(() => this.userSignal());
    readonly isLoggedIn = computed(() => !!this.userSignal());

    initializer: any;

    private authStateSubject = new BehaviorSubject<GoogleUser | null>(null);

    readonly authState$: Observable<GoogleUser | null> =
        this.authStateSubject.asObservable();

    private token: string = "";

    constructor(
        private http: HttpClient,
        private loader: GoogleGsiLoaderService,
        private zone: NgZone,
    ) {
        effect(() => {
            this.authStateSubject.next(this.userSignal());
        });
        this.initialize();
    }

    getAccessToken() {
        return this.token;
    }

    private async initialize(): Promise<void> {
        await this.loader.load();

        this.initializer = window.google.accounts.id.initialize({
            client_id: this.clientId,
            callback: (resp: any) => this.handleCredential(resp),
            auto_select: false,
            redirect_uri: this.getRedirectUrl(),
        });

        this.checkStoredSession();
    }

    private getRedirectUrl() {
        return location.origin;
    }

    login(): void {
        this.loginFrontend();
    }

    loginFrontend(): void {
        window.google.accounts.id.prompt((notification: any) => {
            if (notification.isNotDisplayed()) {
                console.log('Not displayed:', notification.getNotDisplayedReason());
            }

            if (notification.isSkippedMoment()) {
                const cause = notification.getSkippedReason();
                console.log('Skipped:', cause);
                if (cause == "tap_outside") {
                    this.logout();
                } else if (cause == "unknown_reason") {
                    this.logout();
                }
            }

            if (notification.isDismissedMoment()) {
                const cause = notification.getDismissedReason();
                console.log('Dismissed:', cause);
                if (cause == "credential_returned") {

                } else if (cause == "unknown_reason") {
                    this.logout();
                }
            }
        });
    }

    loginBackend(): void {
        const redirect_uri = this.getRedirectUrl()
        window.google.accounts.oauth2.initCodeClient({
            client_id: this.clientId,
            scope: 'openid email profile',
            callback: async (response: any) => {
                const tokens: any = await firstValueFrom(this.http.post(environment.apiUrl + 'public/auth/google', {
                    code: response.code,
                    redirect_uri: redirect_uri,
                }));
                this.handleCredential({
                    credential: tokens.id_token,
                });
            },
            auto_select: false,
        }).requestCode();
    }

    persistToken(token: string | null, type: "session" | "local" = "local") {
        const store = type == "local" ? localStorage : sessionStorage;
        if (token == null) {
            store.removeItem("access_token");
        } else {
            store.setItem("access_token", token);
        }
    }

    loadToken(type: "session" | "local" = "local") {
        const store = type == "local" ? localStorage : sessionStorage;
        return store.getItem("access_token");
    }

    logout(): void {
        this.zone.run(() => {
            this.token = "";
            localStorage.removeItem(AUTH_FLAG_KEY);
            this.persistToken(null);
            this.userSignal.set(null);
            window.google.accounts.id.disableAutoSelect();
        });
    }

    isTokenExpired(token: string) {
        if (!token) return true;

        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64);
        const payload = JSON.parse(payloadJson);

        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
    }

    checkStoredSession() {
        const oldIdToken = this.loadToken();
        if (oldIdToken && !this.isTokenExpired(oldIdToken)) {
            this.handleCredential({
                credential: oldIdToken
            });
        }
    }

    private handleCredential(response: any) {
        const idToken = response.credential;
        localStorage.setItem(AUTH_FLAG_KEY, 'true');
        // Store it on session storage
        this.persistToken(idToken);
        this.token = idToken;
        // Decode locally ONLY for UI (NOT trust)
        const payload = JSON.parse(atob(idToken.split('.')[1]));

        this.userSignal.set({
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            token: idToken
        });
    }
}

export interface GoogleUser {
    id: string;
    email: string;
    name: string;
    token: string; // OAuth access token
    picture: string;
}
