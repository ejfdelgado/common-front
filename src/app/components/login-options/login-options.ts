import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '@services/auth.service';
import { Auth, RecaptchaVerifier } from '@angular/fire/auth';

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
  isResettingPassword = false;
  isPhoneAuth = false;
  phoneNumber = '';
  verificationCode = '';
  codeSent = false;
  recaptchaVerifier?: RecaptchaVerifier;

  constructor(
    public auth: Auth,
    public authSrv: AuthService,
    public cdr: ChangeDetectorRef,
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
        this.errorMessage = e.customData?.message || 'Error registering';
        this.cdr.detectChanges();
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
        this.errorMessage = e.customData?.message || 'Invalid email or password';
        this.cdr.detectChanges();
      }
    }
  }

  async resetPassword() {
    this.errorMessage = '';
    if (!this.email) {
      this.errorMessage = 'Please enter your email';
      return;
    }
    try {
      await this.authSrv.resetPassword(this.email);
      this.errorMessage = 'Password reset email sent!';
      this.cdr.detectChanges();
    } catch (e: any) {
      this.errorMessage = e.customData?.message || 'Error resetting password';
      this.cdr.detectChanges();
    }
  }

  toggleResetPassword() {
    this.isResettingPassword = !this.isResettingPassword;
    this.errorMessage = '';
    this.password = '';
    this.confirmPassword = '';
  }

  toggleRegister() {
    this.isRegistering = !this.isRegistering;
    this.isResettingPassword = false;
    this.errorMessage = '';
    this.password = '';
    this.confirmPassword = '';
  }

  togglePhoneAuth() {
    this.isPhoneAuth = true;
    this.showEmailForm = false;
    this.isRegistering = false;
    this.isResettingPassword = false;
    this.errorMessage = '';
    this.phoneNumber = '';
    this.verificationCode = '';
    this.codeSent = false;
  }

  async sendCode() {
    this.errorMessage = '';
    if (!this.phoneNumber) {
      this.errorMessage = 'Please enter phone number (e.g. +1234567890)';
      return;
    }
    try {
      if (!this.recaptchaVerifier) {
        this.recaptchaVerifier = new RecaptchaVerifier(this.auth, 'recaptcha-container', { size: 'invisible' });
      }
      await this.authSrv.signInWithPhoneNumber(this.phoneNumber, this.recaptchaVerifier);
      this.codeSent = true;
      this.cdr.detectChanges();
    } catch (e: any) {
      this.errorMessage = e.message || 'Error sending code';
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = undefined;
      }
      this.cdr.detectChanges();
    }
  }

  async verifyCode() {
    this.errorMessage = '';
    if (!this.verificationCode) {
      this.errorMessage = 'Please enter the verification code';
      return;
    }
    try {
      await this.authSrv.verifyCode(this.verificationCode);
      this.dialogRef.close(true);
    } catch (e: any) {
      this.errorMessage = e.message || 'Invalid code';
      this.cdr.detectChanges();
    }
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
