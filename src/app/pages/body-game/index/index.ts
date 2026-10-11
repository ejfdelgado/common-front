import { Component } from '@angular/core';

@Component({
  selector: 'app-index',
  imports: [],
  templateUrl: './index.html',
  styleUrl: './index.scss',
})
export class Index {
  WORLDS: { [key: string]: { url: string } } = {
    mars: {
      url: '/#/action/play?col=room-public&id=KTxO0ViGYUsDJvGGUbvw',
    },
    dynos: {
      url: '/#/action/play?col=room-public&id=hMi5auHc6KIORgvhiikr',
    },
    future: {
      url: '/#/action/play?col=room-public&id=efVxakYjL0oxDSoeVhC0',
    },
    ocean: {
      url: '/#/action/play?col=room-public&id=HmiwGLJcSVHl8cDBviL0',
    },
  };

  openWorld(id: string) {
    const world = this.WORLDS[id];
    if (world) {
      const url = `${location.origin}${world.url}`;
      window.open(url, '_blank', 'noopener');
    }
  }
}
