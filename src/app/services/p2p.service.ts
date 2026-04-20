import { EventEmitter, Injectable } from "@angular/core";
import { defaultFirebaseApp } from '@services/firebase';
import {
    ActionReceiver,
    ActionSender,
    DataPayload,
    joinRoom,
    Room
} from '@trystero-p2p/firebase';
import { encode, decode } from "@msgpack/msgpack";

const appId = 'ejfexperiments';

export interface P2PStatus {
    value: "online" | "offline";
    room?: Room;
}

export interface P2PMessage {
    peer: string;
    payload: any;
}

@Injectable({
    providedIn: 'root'
})
export class P2PService {
    room: Room | null = null;
    sendBinaryData: ActionSender<DataPayload> | null = null;
    localStream: MediaStream | null = null;
    remoteAudios: HTMLAudioElement[] = [];
    events: EventEmitter<P2PMessage> = new EventEmitter();
    status: EventEmitter<P2PStatus> = new EventEmitter();
    peerJoin: EventEmitter<string> = new EventEmitter();
    peerLeave: EventEmitter<string> = new EventEmitter();

    async connectToRoom(roomId: string) {
        try {
            if (this.room !== null) {
                //await this.disconnectFromRoom();
                return;
            }

            this.room = await joinRoom({
                firebaseApp: defaultFirebaseApp,
                appId,
            }, roomId);

            this.status.emit({ value: "online", room: this.room });

            const [sendBinaryData, receiveBinaryData] = this.room.makeAction('binary-data');
            this.sendBinaryData = sendBinaryData;
            this.listenBinaryData(receiveBinaryData);

            this.room.onPeerJoin((peerId) => {
                if (this.localStream) {
                    this.room!.addStream(this.localStream, peerId);
                }
                this.peerJoin.emit(peerId);
            });
            this.room.onPeerLeave((peerId) => {
                this.peerLeave.emit(peerId);
            });
            this.room.onPeerStream((stream) => {
                const audio = new Audio();
                audio.srcObject = stream;
                audio.play();
                this.remoteAudios.push(audio);
            });
            requestAnimationFrame(() => {
                this.startVoiceCall();
            });
        } catch (err) {
            this.status.emit({ value: "offline" });
            throw err;
        }
    }

    async disconnectFromRoom() {
        try {
            if (this.localStream) {
                if (this.room) {
                    this.room.removeStream(this.localStream);
                }
                this.localStream.getTracks().forEach(t => t.stop());
                this.localStream = null;
            }
            for (const audio of this.remoteAudios) {
                audio.pause();
                audio.srcObject = null;
            }
            this.remoteAudios = [];
            this.sendBinaryData = null;
            if (this.room) {
                await this.room.leave();
                this.room = null;
            }
        } catch (err) {

        } finally {
            this.status.emit({ value: "offline" });
        }
    }

    async startVoiceCall() {
        if (!this.room) return;
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.room.addStream(this.localStream);
    }

    async broadcastBinaryData(data: any) {
        if (!this.sendBinaryData) return;
        const encoded = encode(data);
        await this.sendBinaryData(encoded);
    }

    listenBinaryData(receiveBinaryData: ActionReceiver<DataPayload>) {
        receiveBinaryData((data, peerId) => {
            const model = decode(data as Uint8Array);
            this.events.emit({ peer: peerId, payload: model });
        });
    }
}