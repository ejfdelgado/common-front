import { AfterViewInit, Component } from '@angular/core';
import { defaultFirebaseApp } from '@services/firebase';
import { joinRoom } from '@trystero-p2p/firebase';

const appId = 'ejfexperiments';

@Component({
  selector: 'app-media-pipe-hand',
  imports: [],
  templateUrl: './media-pipe-hand.html',
  styleUrl: './media-pipe-hand.scss',
})
export class MediaPipeHand implements AfterViewInit {

  ngAfterViewInit(): void {
    this.main();
  }

  async main() {
    const room = await joinRoom({
      firebaseApp: defaultFirebaseApp,
      appId,
    }, 'room-1');

    // Send/receive actions (typed messages between peers)
    const [sendHello, getHello] = room.makeAction('hello');

    // Listen for incoming messages
    getHello((data, peerId) => {
      console.log(`Got hello from ${peerId}:`, data);
    });

    // Send to all peers in the room
    sendHello({ text: 'hi everyone!' });

    // Detect peers joining/leaving
    room.onPeerJoin(peerId => console.log('peer joined:', peerId));
    room.onPeerLeave(peerId => console.log('peer left:', peerId));
  }
}
