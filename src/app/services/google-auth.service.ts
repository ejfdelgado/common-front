import { Injectable, signal, computed, effect, ChangeDetectorRef, NgZone } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { GoogleGsiLoaderService } from './google-gsi-loader.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
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

    /* ---------------- Signals (internal state) ---------------- */

    private userSignal = signal<GoogleUser | null>(null);

    readonly user = computed(() => this.userSignal());
    readonly isLoggedIn = computed(() => !!this.userSignal());

    /* ---------------- RxJS Observer API ---------------- */

    private authStateSubject = new BehaviorSubject<GoogleUser | null>(null);

    /** Observable for subscribers */
    readonly authState$: Observable<GoogleUser | null> =
        this.authStateSubject.asObservable();

    private tokenClient!: any;
    private accessToken?: string;

    constructor(
        private loader: GoogleGsiLoaderService,
        private http: HttpClient,
        private zone: NgZone,
    ) {
        /* Bridge Signal → RxJS */
        effect(() => {
            this.authStateSubject.next(this.userSignal());
        });
        this.initialize();
    }

    getAccessToken() {
        return this.accessToken;
    }

    isTokenExpired(token: string) {
        try {
            const decoded = jwtDecode<any>(token);
            const currentTime = Date.now() / 1000;
            return decoded.exp < currentTime;
        } catch (error) {
            console.log(error);
            return true;
        }
    }

    /* ---------------- OAuth Setup ---------------- */

    private async initialize(): Promise<void> {
        await this.loader.load();
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: 'openid profile email',
            callback: (response: any) => {
                if (response.access_token) {
                    this.accessToken = response.access_token;
                    localStorage.setItem(AUTH_FLAG_KEY, 'true');
                    this.zone.run(() => {
                        this.fetchUserInfo(response.access_token).subscribe();
                    });
                }
            },
        });

        if (localStorage.getItem(AUTH_FLAG_KEY) === 'true') {
            this.silentLogin();
        }
    }

    private silentLogin(): void {
        this.tokenClient?.requestAccessToken({
            prompt: 'none'
        });
    }

    /* ---------------- Public API ---------------- */

    login(): void {
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
    }

    logout(): void {
        this.zone.run(() => {
            this.accessToken = undefined;
            localStorage.removeItem(AUTH_FLAG_KEY);
            this.userSignal.set(null);
            //window.google.accounts.oauth2.revoke(this.clientId, () => { });
        });
    }

    /* ---------------- Internal ---------------- */

    private fetchUserInfo(accessToken: string): Observable<GoogleUser> {
        return this.http
            .get<any>('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: new HttpHeaders({
                    Authorization: `Bearer ${accessToken}`,
                }),
            })
            .pipe(
                map((user) => {
                    return {
                        id: user.sub,
                        email: user.email,
                        name: user.name,
                        token: accessToken,
                        picture: user.picture
                    };
                }),
                tap((user: GoogleUser) => {
                    // fire your signal after mapping
                    this.userSignal.set(user);
                }),
            );
    }

}

export interface GoogleUser {
    id: string;
    email: string;
    name: string;
    token: string; // OAuth access token
    picture: string;
}
