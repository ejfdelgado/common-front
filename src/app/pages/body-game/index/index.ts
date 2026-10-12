import { AsyncPipe, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from 'src/app/pipes/translate.pipe';
import { AuthService } from 'src/app/services/auth.service';
import { ConfigService } from 'src/app/services/config.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-index',
  imports: [FormsModule, CommonModule, TranslatePipe, AsyncPipe],
  templateUrl: './index.html',
  styleUrl: './index.scss',
})
export class Index {
  sendEmailPending: boolean = false;
  reason: string = '';
  emailSent: boolean = false;
  user: User | null = null;
  WORLDS: { [key: string]: { url: string } } = {
    mars: {
      url: '/#/action/play?col=room-public&id=KTxO0ViGYUsDJvGGUbvw',
    },
    dynos: {
      url: '/#/action/play?col=room-public&id=hMi5auHc6KIORgvhiikr',
    },
    future: {
      url: '/#/action/play?col=room-public&id=efVxakYjL0oxDSoeVhC0',
    },
    ocean: {
      url: '/#/action/play?col=room-public&id=HmiwGLJcSVHl8cDBviL0',
    },
  };

  constructor(
    private autSrv: AuthService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private configSrv: ConfigService,
  ) {
    this.autSrv.authState$.subscribe((user) => {
      this.user = user;
      this.cdr.detectChanges();
      if (this.sendEmailPending && user && user.email) {
        this.sendEmail(user.email);
      }
    });
  }

  openWorld(id: string) {
    const world = this.WORLDS[id];
    if (world) {
      const url = `${location.origin}${world.url}`;
      window.open(url, '_blank', 'noopener');
    }
  }

  async sendEmail(email: string) {
    const response: any = await firstValueFrom(
      this.http.post(environment.apiUrl + 'srv/email/body_game_welcome', {
        email,
        interest: this.reason,
      }),
    );
    if (response.success) {
      this.emailSent = true;
      this.cdr.detectChanges();
    } else {
      console.log(JSON.stringify(response));
    }
  }

  hasReason(): boolean {
    return this.reason.trim().length >= 10;
  }

  async onBoard() {
    if (!this.hasReason()) {
      return;
    }
    if (!this.user) {
      await this.autSrv.login();
      this.sendEmailPending = true;
    } else {
      if (this.user.email) {
        this.sendEmail(this.user.email);
      }
    }
  }

  async setLang(lang: string) {
    this.configSrv.setLanguage(lang);
  }
}
