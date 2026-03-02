import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { SearchInputComponent } from '@components/search-input/search-input';
import { UsersService } from '@services/users.service';
import { User } from '@angular/fire/auth';
import { SearchUser } from '../search-user/search-user';
import { CommonComponent } from '@components/common.component';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';

@Component({
  selector: 'app-shared-with',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIcon,
    SearchInputComponent,
    SearchUser,
  ],
  templateUrl: './shared-with.html',
  styleUrl: './shared-with.scss',
})
export class SharedWith extends CommonComponent {
  users: User[] = [];
  collection: string = "";
  id: string = "";

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    private dialogRef: MatDialogRef<SearchUser>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public cdr: ChangeDetectorRef,
    public userSrv: UsersService,
    private dialog: MatDialog,
  ) {
    super(sanitizer, fullScreenSrv);
    const config = JSON.parse(JSON.stringify(data));
    this.collection = config.collection;
    this.id = config.id;
    this.userSrv.getSharedUsers(this.collection, this.id).then((users) => {
      this.users = users;
      this.cdr.detectChanges();
    }).catch((err) => { });
  }

  close(): void {
    this.dialogRef.close();
  }

  async save() {

  }

  openSearchUser() {
    const dialogRef = this.dialog.open(SearchUser, {
      width: '800px',
      panelClass: 'custom-emoji-picker',
      autoFocus: !this.isMobile(),
      data: {
      },
    });
    dialogRef.afterClosed().subscribe(async (result: User | undefined) => {
      if (result) {
        const exists = this.users.find(u => u.uid == result.uid)
        if (!exists) {
          this.users.push(result);
          this.cdr.detectChanges();
        }
      }
    });
  }
}
