import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '@services/auth.service';

export interface LoginOptionsData {

}

@Component({
  selector: 'app-login-options',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIcon,
  ],
  templateUrl: './login-options.html',
  styleUrl: './login-options.scss',
})
export class LoginOptions {
  constructor(
    public authSrv: AuthService,
    private dialogRef: MatDialogRef<LoginOptions>,
    @Inject(MAT_DIALOG_DATA) public data: LoginOptionsData
  ) { }

  async loginWithGoogle() {
    this.authSrv.loginWithGoogle();
    this.dialogRef.close(true);
  }

  async loginWithEmail() {
    this.dialogRef.close(true);
  }
}
