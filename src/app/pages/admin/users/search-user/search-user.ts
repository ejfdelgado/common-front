import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { SearchInputComponent } from '@components/search-input/search-input';
import { UsersService } from '@services/users.service';
import { User } from '@angular/fire/auth';
import { UserCard } from '../user-card/user-card';

@Component({
  selector: 'app-search-user',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIcon,
    SearchInputComponent,
    UserCard,
  ],
  templateUrl: './search-user.html',
  styleUrl: './search-user.scss',
})
export class SearchUser {

  usersMatched: User[] = [];

  constructor(
    private dialogRef: MatDialogRef<SearchUser>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public cdr: ChangeDetectorRef,
    public userSrv: UsersService,
  ) {

  }

  close(): void {
    this.dialogRef.close();
  }

  async searchUser(text: string) {
    if (text.length == 0) {
      this.usersMatched = [];
    } else {
      const response = await this.userSrv.pageUsers({ limit: 5, email: text });
      if (response.success) {
        this.usersMatched = response.data.list;
      } else {
        this.usersMatched = [];
      }
      this.cdr.detectChanges();
    }
  }

  selectUser(user: User) {
    this.dialogRef.close(user);
  }
}
