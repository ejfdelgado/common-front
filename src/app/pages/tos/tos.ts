import { ChangeDetectorRef, Component, effect, OnDestroy } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { MessageContentType, MessagePage } from '@components/message-page/message-page';
import { AuthService } from '@services/auth.service';
import { FullscreenService } from '@services/fullscreen.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tos',
  standalone: true,
  imports: [
    MessagePage
  ],
  templateUrl: './tos.html',
  styleUrl: './tos.scss',
})
export class Tos extends AuthenticatedComponent implements OnDestroy {
  content: MessageContentType = {
    title: "Términos y condiciones del Servicio",
    content: "content",
    footer: "footer",
    actionUrl: "",
    urlImage: "https://storage.googleapis.com/pro-ejflab-assets/images/letter.jpg",
  };
  canEdit: boolean = true;
  authSubscription: Subscription | null = null;

  constructor(
    public override authSrv: AuthService,
    public override cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);
    document.title = "Términos y condiciones del Servicio";
    this.authSubscription = this.authSrv.authState$.subscribe(async (user) => {
      if (user) {
        this.canEdit = true;
      }
    });
    effect(() => {
      this.authSrv.roles();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  async save(data: MessageContentType) {
    console.log(data);
  }
}
