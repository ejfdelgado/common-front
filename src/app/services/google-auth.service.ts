import { Injectable, signal, computed, effect, ChangeDetectorRef, NgZone } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { GoogleGsiLoaderService } from './google-gsi-loader.service';
import { environment } from 'environments/environment';

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

    private authStateSubject = new BehaviorSubject<GoogleUser | null>(null);

    readonly authState$: Observable<GoogleUser | null> =
        this.authStateSubject.asObservable();

    private token: string = "";

    constructor(
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

        window.google.accounts.id.initialize({
            client_id: this.clientId,
            callback: (resp: any) => this.handleCredential(resp),
            auto_select: false
        });

        if (localStorage.getItem(AUTH_FLAG_KEY) === 'true') {
            this.silentLogin();
        }
    }

    private silentLogin(): void {
        window.google.accounts.id.prompt();
    }

    login(): void {
        window.google.accounts.id.prompt();
    }

    logout(): void {
        this.zone.run(() => {
            this.token = "";
            localStorage.removeItem(AUTH_FLAG_KEY);
            this.userSignal.set(null);
            window.google.accounts.id.disableAutoSelect();
        });
    }

    private handleCredential(response: any) {
        const idToken = response.credential;
        localStorage.setItem(AUTH_FLAG_KEY, 'true');
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
