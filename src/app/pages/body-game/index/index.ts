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
import { getAssistanteIframeSrc, getClientRef } from '../../alterego/common';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { ANALYTICS_ID, ASISTANT_ID } from 'src/types/WorldAvatar';

@Component({
  selector: 'app-index',
  imports: [FormsModule, CommonModule, TranslatePipe, AsyncPipe],
  templateUrl: './index.html',
  styleUrls: ['./index.scss', '../../../../assets/css/chat.scss'],
})
export class Index {
  isAssistantOpened: boolean = false;
  currentLang: string = '';
  sendEmailPending: boolean = false;
  reason: string = '';
  emailSent: boolean = false;
  user: User | null = null;
  WORLDS: { [key: string]: { url: string } } = {
    mars_es: {
      url: '/#/action/play?col=room-public&id=KTxO0ViGYUsDJvGGUbvw',
    },
    dynos_es: {
      url: '/#/action/play?col=room-public&id=hMi5auHc6KIORgvhiikr',
    },
    future_es: {
      url: '/#/action/play?col=room-public&id=efVxakYjL0oxDSoeVhC0',
    },
    ocean_es: {
      url: '/#/action/play?col=room-public&id=HmiwGLJcSVHl8cDBviL0',
    },
    mars_en: {
      url: '/#/action/play?col=room-public&id=Mg7FEr01b1SUr77WXYTE',
    },
    dynos_en: {
      url: '/#/action/play?col=room-public&id=pDzPweuGTK7hJumH9Tej',
    },
    future_en: {
      url: '/#/action/play?col=room-public&id=OUUeFagbzxxkoSn2jDXU',
    },
    ocean_en: {
      url: '/#/action/play?col=room-public&id=tncg7IYoxTJegrFPlBTl',
    },
  };

  constructor(
    private autSrv: AuthService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private configSrv: ConfigService,
    public sanitizer: DomSanitizer,
    private router: Router,
    private analyticsSrv: AnalyticsService,
  ) {
    this.analyticsSrv.gtagConfig(ANALYTICS_ID);
    this.autSrv.authState$.subscribe((user) => {
      this.user = user;
      this.cdr.detectChanges();
      if (this.sendEmailPending && user && user.email) {
        this.sendEmail(user.email);
      }
    });
    this.currentLang = this.configSrv.getCurrentLanguage();
  }

  ngOnInit(): void {
    window.addEventListener('message', (event) => {
      if (event.origin !== location.origin) return;
      if (event.data.type === 'close') {
        this.isAssistantOpened = false;
        this.cdr.detectChanges();
      }
    });
  }

  openAssistant() {
    this.isAssistantOpened = true;
  }

  getIframeSrc() {
    const lang = this.configSrv.getCurrentLanguage();
    return getAssistanteIframeSrc(ASISTANT_ID[lang], this.sanitizer);
  }

  openWorld(id: string) {
    const lang = this.configSrv.getCurrentLanguage();
    const world = this.WORLDS[id + '_' + lang];
    if (world) {
      const url = `${location.origin}${world.url}`;
      window.open(url, '_blank', 'noopener');
    }
  }

  async sendEmail(email: string) {
    const lang = this.configSrv.getCurrentLanguage();
    const response: any = await firstValueFrom(
      this.http.post(environment.apiUrl + 'srv/email/body_game_welcome', {
        email,
        interest: this.reason,
        lang,
      }),
    );
    if (response.success) {
      this.emailSent = true;
      this.cdr.detectChanges();
      this.createYourOwnGame();
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
    this.currentLang = lang;
  }

  async openTos() {
    const TOS: any = {
      es: '/assets/tos/move_and_learn_es.html',
      en: '/assets/tos/move_and_learn_en.html',
    };
    const lang = this.configSrv.getCurrentLanguage();
    let url = TOS['en'];
    if (lang in TOS) {
      url = TOS[lang];
    }
    window.open(url, '_blank', 'noopener');
  }

  createYourOwnGame() {
    if (this.user) {
      this.router.navigate([`action/rooms`], {
        queryParams: {},
      });
    } else {
      location.href = '#beta';
    }
  }
}
