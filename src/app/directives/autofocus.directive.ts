import { Directive, ElementRef, Input, OnChanges } from '@angular/core';

@Directive({
    selector: '[appAutofocus]'
})
export class AutofocusDirective implements OnChanges {

    @Input() appAutofocus = false;

    constructor(private el: ElementRef<HTMLInputElement>) { }

    ngOnChanges() {
        if (this.appAutofocus) {
            setTimeout(() => this.el.nativeElement.focus());
        }
    }
}