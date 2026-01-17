import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { GoogleAuthService, GoogleUser } from "@services/google-auth.service";
import { CommonComponent } from "./common.component";
import { ChangeDetectorRef } from "@angular/core";

export class AuthenticatedComponent extends CommonComponent {
    user: GoogleUser | null = null;

    constructor(
        public override sanitizer: DomSanitizer,
        public authSrv: GoogleAuthService,
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