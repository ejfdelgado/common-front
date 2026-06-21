import { EventEmitter, Injectable } from '@angular/core';
import { Subscription } from 'rxjs';

interface WaitPayload {
  done: number;
  autor: Wait;
}

export interface IndicatorPayload {
  esperas: Array<Wait>;
  loading: boolean;
}

export interface IndicatorDetail {
  description: string;
  html?: boolean;
}

export class Wait {
  desc: string | undefined;
  detail?: IndicatorDetail;
  evento: EventEmitter<WaitPayload>;
  subscription!: Subscription;
  constructor(escucha: Function, desc?: string | IndicatorDetail) {
    this.evento = new EventEmitter();
    if (typeof desc == "string") {
      this.desc = desc;
    } else if (desc) {
      this.desc = desc.description;
      this.detail = desc;
    }
    this.subscribe(escucha);
  }
  unsubscribe() {
    this.subscription.unsubscribe();
  }
  private subscribe(escucha: Function) {
    this.subscription = this.evento.subscribe(escucha);
  }
  done() {
    this.evento.emit({ done: 100, autor: this });
  }
}

@Injectable({
  providedIn: 'root',
})
export class IndicatorService {
  evento: EventEmitter<IndicatorPayload>;
  esperas: Array<Wait> = [];
  constructor() {
    this.evento = new EventEmitter<IndicatorPayload>();
  }
  private escucha(evento: WaitPayload) {
    if (evento.done == 100) {
      const indice = this.esperas.indexOf(evento.autor);
      if (indice >= 0) {
        this.esperas.splice(indice, 1);
        evento.autor.unsubscribe();
        this.notify();
      }
    }
  }
  private notify() {
    const loading = this.esperas.length > 0;
    this.evento.emit({ esperas: this.esperas, loading });
  }
  subscribe(escucha: Function): Subscription {
    return this.evento.subscribe(escucha);
  }
  start(desc?: string | IndicatorDetail): Wait {
    const escuchaThis = this.escucha.bind(this);
    let wait;
    wait = new Wait(escuchaThis, desc);
    this.esperas.push(wait);
    this.notify();
    return wait;
  }
  wait(promesa: Promise<any>) {
    const luego = this.start();
    promesa.finally(() => {
      luego.done();
    });
  }

  getTasks() {
    // return only tasks with detail to show
    return this.esperas.filter((task) => {
      return !!task.detail;
    });
  }
}
