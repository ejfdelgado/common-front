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
import { getAuth, UserCredential } from 'firebase/auth';
import { BehaviorSubject, firstValueFrom, from, Observable, Subscription } from 'rxjs';
import { UINotificationSrv } from './uinotifications.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { ApiResponse } from 'types/file';
import { MatDialog } from '@angular/material/dialog';
import { LoginOptions, LoginOptionsData } from '@components/login-options/login-options';
import { IndicatorService } from './indicator.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly _user = signal<User | null>(null);
    private readonly _token = signal<string | null>(null);
    private readonly _roles = signal<string[]>([]);
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
        private dialog: MatDialog,
        private indicatorSrv: IndicatorService,
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
                // Get roles
                const rolesResPromise = firstValueFrom(this.http.get<ApiResponse>(environment.apiUrl + "admin/user/myroles"));
                rolesResPromise.then((data: ApiResponse) => {
                    if (data.success) {
                        const roles = data.data;
                        this._roles.set(Object.keys(roles));
                    }
                }).catch(err => {

                });
            } else {
                this._token.set(null);
                this._roles.set([]);
            }
        });
    }

    /** 🔐 Public signals */
    readonly user = computed(() => this._user());
    readonly token = computed(() => this._token());
    readonly roles = computed(() => this._roles());
    readonly isAuthenticated = computed(() => !!this._user());

    hasARole(r: string[]) {
        const roles = this._roles();
        return roles.find(el => r.indexOf(el) >= 0) != undefined;
    }

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
        const data: LoginOptionsData = {};
        this.dialog
            .open(LoginOptions, {
                width: '400px',
                disableClose: true,
                data,
                panelClass: 'custom-emoji-picker',
            });
    }

    /** 🔑 Google login */
    loginWithGoogle(): Promise<void> {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(this.auth, provider).then(() => { });
    }

    /** 📧 Email login */
    loginWithEmail(email: string, password: string): Promise<UserCredential> {
        const promise = this.indicatorSrv.start();
        try {
            return signInWithEmailAndPassword(this.auth, email, password);
        } finally {
            promise.done();
        }
    }

    /** ✍️ Email signup */
    registerWithEmail(email: string, password: string): Promise<UserCredential> {
        const promise = this.indicatorSrv.start();
        try {
            return createUserWithEmailAndPassword(this.auth, email, password);
        } finally {
            promise.done();
        }
    }

    /** 🚪 Logout */
    logout(): Promise<void> {
        return signOut(this.auth);
    }

    ngOnDestroy() {
        this.authSub?.unsubscribe();
    }

    async askForOfflineGrantScope(scopes: string[]) {
        const currentUrl = window.location.href;
        const body = {
            currentUrl,
            scopes,
        };
        const res = await firstValueFrom(this.http.post<ApiResponse>(environment.apiUrl + "admin/user/calendar/allow", body));
        window.location.href = res.data.url;
    }
}
