import {
    Component,
    Input,
    forwardRef
} from '@angular/core';
import {
    ControlValueAccessor,
    NG_VALUE_ACCESSOR
} from '@angular/forms';
import { JsonNodeComponent } from './json-node.component';

@Component({
    selector: 'json-editor',
    standalone: true,
    imports: [
        JsonNodeComponent
    ],
    templateUrl: './json-editor.component.html',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => JsonEditorComponent),
            multi: true
        }
    ]
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