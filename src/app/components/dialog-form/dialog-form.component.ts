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

export interface FieldDataType {
    type: "text" | "textarea" | "contenteditable";
    label: string;
    key: string;
    required?: boolean;
};

export interface FormDataType {
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
        MatIcon,
    ],
    selector: 'app-dialog-form',
    templateUrl: './dialog-form.component.html'
})
export class DialogFormComponent {
    form: FormGroup;
    config!: FormDataType;
    formControlMap: { [key: string]: FormControl } = {};

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<DialogFormComponent>,
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
            this.formControlMap[field.key] = newField;
        }
    }

    get dynamicFields() {
        return this.form.get('dynamicFields') as FormArray;
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        if (this.form.valid) {
            this.dialogRef.close(this.form.value);
        }
    }
}
