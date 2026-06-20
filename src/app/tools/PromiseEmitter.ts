import { EventEmitter } from '@angular/core';

export class PromiseEmitter {
  promise: Promise<any>;
  emmiter: EventEmitter<any> = new EventEmitter();
  isResolved: boolean = false;
  constructor() {
    this.promise = new Promise((resolve) => {
      this.emmiter.subscribe((data) => {
        if (this.isResolved) {
          // Could lost reference if some one ales had it
          this.promise = Promise.resolve(data);
        } else {
          resolve(data);
        }
      });
    });
  }

  resolve(data?: any) {
    this.emmiter.emit(data);
  }

  async then() {
    return this.promise;
  }
}
