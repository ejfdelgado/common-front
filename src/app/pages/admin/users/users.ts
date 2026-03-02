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
import { SearchInputComponent } from '@components/search-input/search-input';
import { MatIconModule } from '@angular/material/icon';
import { FormDataType } from '@components/dialog-form/dialog-form.component';
import { MatDialog } from '@angular/material/dialog';
import { UserPermissions } from './permissions/permissions';
import { AllFieldsDataType } from 'types/fieldsTypes';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    SideMenu,
    MatCardModule,
    SearchInputComponent,
    MatIconModule,
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
    private dialog: MatDialog,
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
        this.usersList = [];
        this.cdr.detectChanges();
      } else {
        this.pageUsers();
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

  async pageUsers(email?: string, reset: boolean = false) {
    const query: QueryUser = {
      limit: PAGE_SIZE,
    };
    if (reset) {
      this.usersList.splice(0, this.usersList.length);
    }
    if (email && email.trim().length > 0) {
      query.email = email;
    }
    if (this.usersList.length > 0) {
      const lastOffset = this.usersList[this.usersList.length - 1].uid;
      query.offset = lastOffset;
    }
    const response = await this.userSrv.pageUsers(query);
    if (response.success) {
      this.usersList.push(...response.data.list);
    }
    this.cdr.detectChanges();
  }

  async searchUsers(val: string) {
    await this.pageUsers(val, true);
  }

  async editRoles(user: User) {
    let fields: AllFieldsDataType[] = [];
    fields = [
      {
        label: "Title", type: "chip", key: "roles", required: false, chip: {
          stringOptions: ["superadmin", "alterego_publisher", "alterego_editor"]
        }
      },
    ];
    const formConfig: FormDataType = {
      title: "Edit roles",
      autoAuthor: true,
      modelName: "",
      searchFields: [],
      fields: fields,
      model: {},
    };
    const dialogRef = this.dialog.open(UserPermissions, {
      width: '800px',
      panelClass: 'custom-emoji-picker',
      autoFocus: !this.isMobile(),
      data: formConfig,
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        console.log(result);
      }
    });
  }
}

