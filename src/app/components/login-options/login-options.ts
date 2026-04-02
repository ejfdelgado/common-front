import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '@services/auth.service';

export interface LoginOptionsData {

}

@Component({
  selector: 'app-login-options',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIcon,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './login-options.html',
  styleUrl: './login-options.scss',
})
export class LoginOptions {
  email = '';
  password = '';
  showEmailForm = false;
  errorMessage = '';
  isRegistering = false;
  confirmPassword = '';

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
    this.errorMessage = '';
    
    if (this.isRegistering) {
      if (!this.email || !this.password || !this.confirmPassword) {
        this.errorMessage = 'Please enter email, password, and confirm password';
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.errorMessage = 'Passwords do not match';
        return;
      }
      try {
        await this.authSrv.registerWithEmail(this.email, this.password);
        this.dialogRef.close(true);
      } catch (e: any) {
        this.errorMessage = e.message || 'Error registering';
      }
    } else {
      if (!this.email || !this.password) {
        this.errorMessage = 'Please enter both email and password';
        return;
      }
      try {
        await this.authSrv.loginWithEmail(this.email, this.password);
        this.dialogRef.close(true);
      } catch (e: any) {
        this.errorMessage = e.message || 'Invalid email or password';
      }
    }
  }

  toggleRegister() {
    this.isRegistering = !this.isRegistering;
    this.errorMessage = '';
    this.password = '';
    this.confirmPassword = '';
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
