import { EventEmitter } from '@angular/core';

export class EmitterThen<Type> {
  lastData: any = undefined;
  emmiter: EventEmitter<Type> = new EventEmitter();
  constructor() {}

  update(data: Type) {
    this.emmiter.emit(data);
    this.lastData = data;
  }

  async then(myFun: Function) {
    if (this.lastData) {
      myFun(this.lastData);
    }
    return this.emmiter.subscribe((next: Type) => {
      myFun(next);
    });
  }
}
