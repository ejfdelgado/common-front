import { Injectable, signal, computed, effect } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { GoogleGsiLoaderService } from './google-gsi-loader.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

declare global {
    interface Window {
        google: any;
    }
}

@Injectable({
    providedIn: 'root',
})
export class GoogleAuthService {
    private readonly clientId = '1066977671859-rpsf2gtmi33chnc0vo5b7u0i354qtd65.apps.googleusercontent.com';

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

    constructor(
        private loader: GoogleGsiLoaderService,
        private http: HttpClient
    ) {
        /* Bridge Signal → RxJS */
        effect(() => {
            this.authStateSubject.next(this.userSignal());
        });
        this.initialize();
    }

    /* ---------------- OAuth Setup ---------------- */

    private async initialize(): Promise<void> {
        await this.loader.load();
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: 'openid profile email',
            callback: (response: any) => {
                if (response.access_token) {
                    this.fetchUserInfo(response.access_token).subscribe(()=>{});
                }
            },
        });
    }

    /* ---------------- Public API ---------------- */

    login(): void {
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
    }

    logout(): void {
        this.userSignal.set(null);
        //window.google.accounts.oauth2.revoke(this.clientId, () => { });
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
