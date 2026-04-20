import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { UsersService } from '@services/users.service';
import { User } from '@angular/fire/auth';
import { SearchUser } from '../search-user/search-user';
import { CommonComponent } from '@components/common.component';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { UserCard } from '../user-card/user-card';
import { TranslatePipe } from '@pipes/translate.pipe';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-shared-with',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIcon,
    UserCard,
    TranslatePipe,
  ],
  templateUrl: './shared-with.html',
  styleUrl: './shared-with.scss',
})
export class SharedWith extends CommonComponent {
  users: User[] = [];
  collection: string = "";
  id: string = "";
  changesCount: number = 0;
  mode: string = "";

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    private dialogRef: MatDialogRef<SearchUser>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public cdr: ChangeDetectorRef,
    public userSrv: UsersService,
    private dialog: MatDialog,
    public confirmSrv: ConfirmDialogService,
  ) {
    super(sanitizer, fullScreenSrv);
    const config = JSON.parse(JSON.stringify(data));
    this.collection = config.collection;
    this.id = config.id;
    this.mode = config.mode;
    this.userSrv.getSharedUsers(this.collection, this.id).then((users) => {
      this.users = users;
      this.cdr.detectChanges();
    }).catch((err) => { });
  }

  close(): void {
    this.dialogRef.close();
  }

  async save() {
    const uidArray = this.users.map(u => u.uid);
    try {
      await this.userSrv.writeSharedUsers(this.collection, this.id, uidArray);
      this.dialogRef.close();
    } catch (err) {

    }
  }

  async removeUser(user: User) {
    const confirm = await this.confirmSrv.confirm({
      title: "Sure?",
      message: `You will remove "${user.displayName}" (${user.email}) from owners.`,
    });
    if (!confirm) {
      return;
    }
    const index = this.users.indexOf(user);
    if (index >= 0) {
      this.users.splice(index, 1);
      this.changesCount++;
      this.cdr.detectChanges();
    }
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
          this.changesCount++;
          this.cdr.detectChanges();
        }
      }
    });
  }

  async pickThis(user: User) {
    if (this.mode == "pick_one") {
      this.dialogRef.close(user);
    }
  }
}
