import { Component, Inject, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { FirestoreConfigDataType, FirestoreService } from '@services/firestore.service';
import { FormSimpleWith } from '@components/form-simple/form-simple-with';
import { AllFieldsDataType } from 'types/fieldsTypes';
import { UINotificationSrv } from '@services/uinotifications.service';



export interface FormDataType {
    modelName: string;
    autoAuthor: boolean;
    title: string;
    fields: AllFieldsDataType[],
    model: { [key: string]: any },
    searchFields: string[],
}

@Component({
    standalone: true,
    imports: [
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        ReactiveFormsModule,
        MatIcon,
        FormSimpleWith,
    ],
    selector: 'app-dialog-form',
    templateUrl: './dialog-form.component.html',
    styleUrls: ["./dialog-form.component.scss",],
})
export class DialogFormComponent {
    @ViewChild('inner_form') innerForm!: FormSimpleWith;
    config!: FormDataType;

    constructor(
        private dialogRef: MatDialogRef<DialogFormComponent>,
        private firestoreSrv: FirestoreService,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private uiNotif: UINotificationSrv,
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
            const response = await this.internalSave(data);
            Object.assign(data, response);
            this.dialogRef.close(data);
        }

    }

    async internalSave(data: { [key: string]: any }) {
        const conf: FirestoreConfigDataType = {
            autoAuthor: this.config.autoAuthor,
            searchFields: this.config.searchFields,
        };
        try {
            const response = await this.firestoreSrv.createUpdate(this.config.modelName, data, conf);
            return response;
        } catch (err: any) {
            this.uiNotif.show(err.message);
            throw err;
        }
    }

    isInvalid() {
        return this.innerForm?.getForm().invalid;
    }
}
