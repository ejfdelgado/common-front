import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from './common.component';
import { ChangeDetectorRef, Directive } from '@angular/core';
import { AuthService } from '@services/auth.service';
import { User } from '@angular/fire/auth';
import { FullscreenService } from '@services/fullscreen.service';
import { Subscription } from 'rxjs';

@Directive()
export class AuthenticatedComponent extends CommonComponent {
  user: User | null = null;
  private authSubscription: Subscription | null = null;

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public authSrv: AuthService,
    public cdr: ChangeDetectorRef,
  ) {
    super(sanitizer, fullScreenSrv);
    this.authSubscription = this.authSrv.authState$.subscribe((user) => {
      this.user = user;
      try {
        this.cdr.detectChanges();
      } catch (err) {}
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }
}
