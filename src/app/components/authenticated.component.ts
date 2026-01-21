import { DomSanitizer } from "@angular/platform-browser";
import { CommonComponent } from "./common.component";
import { ChangeDetectorRef } from "@angular/core";
import { AuthService } from "@services/auth.service";
import {
    User,
} from '@angular/fire/auth';

export class AuthenticatedComponent extends CommonComponent {
    user: User | null = null;

    constructor(
        public override sanitizer: DomSanitizer,
        public authSrv: AuthService,
        public cdr: ChangeDetectorRef,
    ) {
        super(sanitizer);
        this.authSrv.authState$.subscribe(user => {
            this.user = user;
            try {
                this.cdr.detectChanges();
            } catch (err) { }
        });
    }
}