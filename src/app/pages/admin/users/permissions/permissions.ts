import { Component, Inject, ViewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { DialogFormComponent, FormDataType } from '@components/dialog-form/dialog-form.component';
import { FormSimpleWith } from '@components/form-simple/form-simple-with';
import { UsersService } from '@services/users.service';

@Component({
  selector: 'app-permissions',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatIcon,
    FormSimpleWith,
  ],
  templateUrl: './permissions.html',
  styleUrl: './permissions.scss',
})
export class UserPermissions {
  @ViewChild('inner_form') innerForm!: FormSimpleWith;
  config!: FormDataType;

  constructor(
    private dialogRef: MatDialogRef<DialogFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public userSrv: UsersService,
  ) {
    // Make a copy to avoid modify original
    this.config = JSON.parse(JSON.stringify(data));
  }

  close(): void {
    this.dialogRef.close();
  }

  async save(): Promise<void> {
    //Child component save()
    const { valid, data } = await this.innerForm.save();
    if (valid) {
      await this.internalSave(data);
      this.dialogRef.close(data);
    }

  }

  async internalSave(data: { [key: string]: any }) {
    await this.userSrv.writeRoles(this.config.model['user'], data['roles']);
  }

  isInvalid() {
    return this.innerForm?.getForm().invalid;
  }
}
