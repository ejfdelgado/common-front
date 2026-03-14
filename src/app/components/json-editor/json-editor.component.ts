import {
    Component,
    Input,
    forwardRef
} from '@angular/core';
import {
    ControlValueAccessor,
    FormsModule,
    NG_VALUE_ACCESSOR
} from '@angular/forms';
import { JsonNodeComponent } from './json-node.component';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'json-editor',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        JsonNodeComponent,
    ],
    templateUrl: './json-editor.component.html',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => JsonEditorComponent),
            multi: true
        }
    ],
    styleUrls: ["./json-editor.component.scss"],
})
export class JsonEditorComponent implements ControlValueAccessor {

    @Input() model: any = {};

    value: any = {};

    onChange: any = () => { };
    onTouched: any = () => { };

    writeValue(obj: any): void {
        this.value = structuredClone(obj ?? {});
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    update() {
        this.onChange(this.value);
    }

}