import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { AuthService } from '@services/auth.service';
import { FullscreenService } from '@services/fullscreen.service';
import { QueryUser, UsersService } from '@services/users.service';
import { Subscription } from 'rxjs';
import { MenuOptionType } from 'types/StatusBar';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    SideMenu,
    MatCardModule,
  ],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class UsersView extends AuthenticatedComponent implements OnInit, OnDestroy {

  menuOptions: MenuOptionType[] = [];
  authSubscription: Subscription | null = null;

  usersList: User[] = [];

  constructor(
    public override authSrv: AuthService,
    public override cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public userSrv: UsersService,
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);

    /*
    this.menuOptions.push({
      label: "Agregar libro",
      icon: "add",
      children: [],
      callback: () => {

      }
    });
    */

    this.authSubscription = this.authSrv.authState$.subscribe((user) => {
      if (!user) {

      } else {

      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  ngOnInit(): void {

  }

  async pageUsers(reset: boolean = false) {
    const query: QueryUser = {
      limit: 3,
    };
    if (reset) {
      this.usersList.splice(0, this.usersList.length);
    }
    if (this.usersList.length > 0) {
      const lastOffset = this.usersList[this.usersList.length - 1].uid;
      query.offset = lastOffset;
    }
    const response = await this.userSrv.pageUsers(query);
    if (response.success) {
      this.usersList.push(response.data.list);
    }
    console.log(JSON.stringify(this.usersList, null, 4));
    this.cdr.detectChanges();
  }
}

