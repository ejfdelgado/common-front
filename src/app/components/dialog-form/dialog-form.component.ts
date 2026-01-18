import { Component, Inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { EditableInput } from '@components/editable-input/editable-input';
import { MatIcon } from '@angular/material/icon';
import { FirestoreService } from '@services/firestore.service';
import { OnOffToggleComponent } from '@components/on-off-toggle/on-off-toggle';
import { RatingComponent } from '@components/rating/rating';
import { ImageFileComponent } from '@components/image-field/image-field';

export interface ImageDetailDataType {
    template: string;
    withThumbnail?: boolean;
}

export interface FieldDataType {
    type: "text" | "textarea" | "contenteditable" | "toggle" | "rating" | "image";
    label: string;
    key: string;
    required?: boolean;
    image?: ImageDetailDataType;
};

export interface FormDataType {
    modelName: string;
    autoAuthor: boolean;
    title: string;
    fields: FieldDataType[],
    model: { [key: string]: any },
}

@Component({
    standalone: true,
    imports: [
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        ReactiveFormsModule,
        EditableInput,
        OnOffToggleComponent,
        RatingComponent,
        ImageFileComponent,
        MatIcon,
    ],
    selector: 'app-dialog-form',
    templateUrl: './dialog-form.component.html',
    styleUrls: ["./dialog-form.component.scss",],
})
export class DialogFormComponent {
    form: FormGroup;
    config!: FormDataType;
    formControlMap: { [key: string]: FormControl } = {};
    fieldNames: string[] = [];

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<DialogFormComponent>,
        private firestoreSrv: FirestoreService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.config = data;
        this.form = this.fb.group({
            dynamicFields: this.fb.array([]),
        });

        const dynamicFields = this.form.get('dynamicFields') as FormArray;
        for (const field of this.config.fields) {
            const newField = new FormControl(this.config.model[field.key]);
            if (field.required === true) {
                newField.addValidators(Validators.required);
            }
            dynamicFields.push(newField);
            this.fieldNames.push(field.key);
            this.formControlMap[field.key] = newField;
        }
    }

    get dynamicFields() {
        return this.form.get('dynamicFields') as FormArray;
    }

    close(): void {
        this.dialogRef.close();
    }

    async save(): Promise<void> {
        if (this.form.valid) {
            const dataArray = this.form.value.dynamicFields;
            const data: { [key: string]: any } = {};
            // Add id if provided
            const PASSTRHU = ["id"];
            PASSTRHU.forEach((key) => {
                if (this.config.model[key] !== undefined) {
                    data[key] = this.config.model[key];
                }
            });

            for (let i = 0; i < this.fieldNames.length; i++) {
                const fieldName = this.fieldNames[i];
                if (!data["id"] || this.formControlMap[fieldName].dirty) {
                    data[fieldName] = dataArray[i];
                }
            }
            await this.internalSave(data);

            this.dialogRef.close(data);
        }
    }

    async internalSave(data: { [key: string]: any }) {
        const conf: any = {
            autoAuthor: this.config.autoAuthor,
        };
        await this.firestoreSrv.createUpdate(this.config.modelName, data, conf);
    }
}
