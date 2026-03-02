import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { SearchInputComponent } from '@components/search-input/search-input';
import { UsersService } from '@services/users.service';

@Component({
  selector: 'app-search-user',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIcon,
    SearchInputComponent,
  ],
  templateUrl: './search-user.html',
  styleUrl: './search-user.scss',
})
export class SearchUser {

  constructor(
    private dialogRef: MatDialogRef<SearchUser>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public userSrv: UsersService,
  ) {

  }

  close(): void {
    this.dialogRef.close();
  }

  searchUser(text: string) {

  }
}
