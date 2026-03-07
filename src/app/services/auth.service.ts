import { Injectable, computed, signal } from '@angular/core';
import {
    Auth,
    GoogleAuthProvider,
    User,
    authState,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
} from '@angular/fire/auth';
import { getAuth } from 'firebase/auth';
import { BehaviorSubject, firstValueFrom, from, Observable, Subscription } from 'rxjs';
import { UINotificationSrv } from './uinotifications.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { ApiResponse } from 'types/file';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly _user = signal<User | null>(null);
    private readonly _token = signal<string | null>(null);
    readonly isLoggedIn = computed(() => !!this._user());

    private authSub?: Subscription;

    static userStatic: User | null = null;
    private authStateSubject = new BehaviorSubject<User | null>(null);

    readonly authState$: Observable<User | null> =
        this.authStateSubject.asObservable();

    constructor(
        private auth: Auth,
        private notifSrv: UINotificationSrv,
        private http: HttpClient,
    ) {
        this.authSub = authState(this.auth).subscribe(async user => {
            getAuth();//Without this line, firestore frontend operations did not include token
            this._user.set(user);

            this.authStateSubject.next(user);
            AuthService.userStatic = user;

            if (user) {
                // Force a refresh to get the latest custom claims from the server
                const forceRefresh = true;
                const token = await user.getIdToken(forceRefresh);
                this._token.set(token);
            } else {
                this._token.set(null);
            }
        });
    }

    /** 🔐 Public signals */
    readonly user = computed(() => this._user());
    readonly token = computed(() => this._token());
    readonly isAuthenticated = computed(() => !!this._user());

    async waitForToken() {
        return new Promise<boolean>((resolve) => {
            let resolved = false;
            const interval = setInterval(() => {
                if (this.token()) {
                    resolved = true;
                    clearInterval(interval);
                    clearTimeout(timeout);
                    resolve(true);
                }
            }, 500);
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolve(false);
                }
                clearInterval(interval);
                clearTimeout(timeout);
            }, 5000);
        });
    }

    async login() {
        await this.loginWithGoogle();
    }

    /** 🔑 Google login */
    loginWithGoogle(): Promise<void> {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(this.auth, provider).then(() => { });
    }

    /** 📧 Email login */
    loginWithEmail(email: string, password: string): Promise<void> {
        return signInWithEmailAndPassword(this.auth, email, password).then(() => { });
    }

    /** ✍️ Email signup */
    registerWithEmail(email: string, password: string): Promise<void> {
        return createUserWithEmailAndPassword(this.auth, email, password).then(
            () => { }
        );
    }

    /** 🚪 Logout */
    logout(): Promise<void> {
        return signOut(this.auth);
    }

    ngOnDestroy() {
        this.authSub?.unsubscribe();
    }

    askForOfflineCalendarScope() {
        const auth = getAuth();
        const provider = new GoogleAuthProvider();

        // 1. Add the specific Calendar scope
        provider.addScope('https://www.googleapis.com/auth/calendar.events');

        // 2. IMPORTANT: Force Google to provide a Refresh Token
        provider.setCustomParameters({
            access_type: 'offline',
            prompt: 'consent'
        });

        /*
        const login2 = async () => {
            const client = google.accounts.oauth2.initCodeClient({
                client_id: 'YOUR_GOOGLE_CLIENT_ID',
                scope: 'https://www.googleapis.com/auth/calendar.events',
                ux_mode: 'popup', // A popup appears for the user
                callback: (response) => {
                    // THIS IS IT! 
                    // Google sends the 'code' into this response object.
                    const authorizationCode = response.code;

                    // Now you send it to your Node.js server
                    sendCodeToBackend(authorizationCode);
                },
            });

            client.requestCode();
        }
        */

        const loginWithGoogle = async () => {
            try {
                const result = await signInWithPopup(auth, provider);
                // This credential contains the ONE-TIME code or temporary token
                const credential = GoogleAuthProvider.credentialFromResult(result);
                if (credential) {
                    const payload = {
                        credential
                    };
                    const response = await firstValueFrom(this.http.put<ApiResponse>(environment.apiUrl + "admin/user/tokens",
                        payload,
                    ));
                } else {
                    throw new Error("No token found");
                }

                // Note: Firebase doesn't always put the refresh_token in the 'result' object.
                // You usually need to handle the 'code' exchange on your Node.js server.
            } catch (error: any) {
                this.notifSrv.show(error.message);
            }
        };

        loginWithGoogle();
    }
}
