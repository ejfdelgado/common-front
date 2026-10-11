import { ChangeDetectorRef, Component } from '@angular/core';
import { User } from 'firebase/auth';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-index',
  imports: [],
  templateUrl: './index.html',
  styleUrl: './index.scss',
})
export class Index {
  sendEmailPending: boolean = false;
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
    console.log(`Send email to ${email}`);
  }

  async onBoard(message: string) {
    if (!this.user) {
      await this.autSrv.login();
      this.sendEmailPending = true;
    } else {
      if (this.user.email) {
        this.sendEmail(this.user.email);
      }
    }
  }
}
