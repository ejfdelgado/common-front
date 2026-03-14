import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AskNamePopUp } from './ask-name/ask-name';
import { ConfirmDialogService } from '@services/confirm-dialog.service';

@Component({
    selector: 'json-node',
    standalone: true,
    imports: [
        CommonModule,
        MatIconModule,
        FormsModule,
    ],
    templateUrl: './json-node.component.html',
    styleUrls: ["./json-node.component.scss"],
})
export class JsonNodeComponent {

    @Input() node: any;
    @Input() key: string | number | null = null;

    @Output() nodeChange = new EventEmitter<void>();

    collapsed = false;

    constructor(
        private dialog: MatDialog,
        public confirmSrv: ConfirmDialogService,
    ) {

    }

    toggle() {
        this.collapsed = !this.collapsed;
    }

    isObject(v: any) {
        return v && typeof v === 'object' && !Array.isArray(v);
    }

    isArray(v: any) {
        return Array.isArray(v);
    }

    isPrimitive(v: any) {
        return !this.isObject(v) && !this.isArray(v);
    }

    objectKeys() {
        return Object.keys(this.node).sort();
    }

    detectType(v: any) {
        if (v === null) return "null";
        if (Array.isArray(v)) return "array";
        if (typeof v === "object") return "object";
        return typeof v;
    }

    updatePrimitive(container: any, key: any, value: any) {
        const type = this.detectType(container[key]);
        if (type === "number")
            container[key] = Number(value);
        else if (type === "boolean")
            container[key] = value === 'true' || value === true;
        else
            container[key] = value;
        this.nodeChange.emit();
    }

    tempPrimitiveInArray: any = undefined;
    updatePrimitiveInArray(container: any, key: any, value: any) {
        const type = this.detectType(container[key]);
        if (type === "number")
            this.tempPrimitiveInArray = Number(value);
        else if (type === "boolean")
            this.tempPrimitiveInArray = value === 'true' || value === true;
        else
            this.tempPrimitiveInArray = value;
    }
    updatePrimitiveInArrayBlur(container: any, key: any) {
        if (this.tempPrimitiveInArray === undefined) {
            return;
        }
        container[key] = this.tempPrimitiveInArray;
        this.nodeChange.emit();
        this.tempPrimitiveInArray = undefined;
    }

    renameKey(oldKey: string, newKey: string) {
        if (!newKey || newKey === oldKey)
            return;
        const value = this.node[oldKey];
        delete this.node[oldKey];
        this.node[newKey] = value;
        this.nodeChange.emit();
    }

    renameTemporal: any = undefined;
    renameKeyTemporal(oldKey: string, newKey: string) {
        if (!newKey || newKey === oldKey)
            return;
        this.renameTemporal = newKey;
    }
    renameKeyBlur(oldKey: string, newKey: any) {
        if (this.renameTemporal === undefined) {
            return;
        }
        this.renameKey(oldKey, this.renameTemporal);
        this.renameTemporal = undefined;
    }

    addProperty() {
        const dialogRef = this.dialog.open(AskNamePopUp, {
            width: '350px',
            autoFocus: true,
            panelClass: 'custom-emoji-picker'
        });
        dialogRef.afterClosed().subscribe((name: any) => {
            if (!name || name in this.node) return;
            this.node[name] = null;
            this.nodeChange.emit();
        });
    }

    async removeProperty(key: string) {
        const confirm = await this.confirmSrv.confirm({
            title: "Sure?",
            message: "This operation can't be undone",
        });
        if (!confirm) {
            return;
        }
        delete this.node[key];
        this.nodeChange.emit();
    }

    addArrayItem() {
        this.node.push(null);
        this.nodeChange.emit();
    }

    removeArrayItem(index: number) {
        this.node.splice(index, 1);
        this.nodeChange.emit();
    }

    changeType(container: any, key: any, type: string) {
        switch (type) {
            case "string":
                container[key] = [null, undefined].indexOf(container[key]) >= 0 ? "" : `${container[key]}`;
                break;
            case "number":
                container[key] = isNaN(parseFloat(container[key])) ? 0 : parseFloat(container[key]);
                break;
            case "boolean":
                container[key] = false;
                break;
            case "object":
                container[key] = {};
                break;
            case "array":
                container[key] = [];
                break;
            case "null":
                container[key] = null;
                break;
        }

        this.nodeChange.emit();
    }

}