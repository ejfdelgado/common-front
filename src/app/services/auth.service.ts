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
import { BehaviorSubject, from, Observable, Subscription } from 'rxjs';

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

    constructor(private auth: Auth) {
        this.authSub = authState(this.auth).subscribe(async user => {
            getAuth();//Without this line, firestore frontend operations did not include token
            this._user.set(user);

            this.authStateSubject.next(user);
            AuthService.userStatic = user;

            if (user) {
                const token = await user.getIdToken();
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
}
