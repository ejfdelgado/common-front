import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'json-node',
    standalone: true,
    imports: [
        CommonModule,
    ],
    templateUrl: './json-node.component.html'
})
export class JsonNodeComponent {

    @Input() node: any;
    @Input() key: string | number | null = null;

    @Output() nodeChange = new EventEmitter<void>();

    collapsed = false;

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
        return Object.keys(this.node);
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

    renameKey(oldKey: string, newKey: string) {
        if (!newKey || newKey === oldKey)
            return;
        const value = this.node[oldKey];
        delete this.node[oldKey];
        this.node[newKey] = value;
        this.nodeChange.emit();
    }

    addProperty() {
        const name = prompt("Property name");
        if (!name) return;
        this.node[name] = null;
        this.nodeChange.emit();
    }

    removeProperty(key: string) {
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
                container[key] = "";
                break;
            case "number":
                container[key] = 0;
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