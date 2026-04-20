import { ChangeDetectorRef } from "@angular/core";
import { ComponentBodyTracker } from "./ComponentBodyTracker";
import { VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { IndicatorService } from "@services/indicator.service";
import { BooleanStateService } from "@services/boolean-state.service";
import { DomSanitizer } from "@angular/platform-browser";
import { FullscreenService } from "@services/fullscreen.service";
import { AvatarService } from "@services/avatar.service";
import { P2PService } from "@services/p2p.service";
import { getPeerAvatarName } from "./utils/AvatarUtilities";
import { AVATAR_PELVIS_HEIGHT, ROOT_PATH } from "@mytypes/BodyTypes";
import { GameAction, RoomGameType } from "@mytypes/ActionGameTypes";
import { Room } from "@trystero-p2p/firebase";
import { ModuloSonido } from "@services/sonido.service";
import { enterFullscreen } from "@tools/ScreenUtils";

export abstract class ComponentP2P extends ComponentBodyTracker {
    roomLive: Room | null = null;
    constructor(
        public override voiceSrv: VoiceRecognitionService,
        public override speechSrv: SpeechSynthesisService,
        public override indicatorSrv: IndicatorService,
        public override booleanService: BooleanStateService,
        public override sanitizer: DomSanitizer,
        public override fullScreenSrv: FullscreenService,
        public override cdr: ChangeDetectorRef,
        public override avatarSrv: AvatarService,
        //
        public p2pSrv: P2PService,
    ) {
        super(
            voiceSrv,
            speechSrv,
            indicatorSrv,
            booleanService,
            sanitizer,
            fullScreenSrv,
            cdr,
            avatarSrv,
        );

        this.p2pSrv.status.subscribe((status) => {
            if (status.value == "offline") {
                // destroy the room
                this.roomLive = null;
                // Remove all peers
                this.connectedPeerIds.forEach((peerId) => {
                    const avatarContainer = this.getAvatarContainer();
                    if (!avatarContainer || !avatarContainer.scene) {
                        return;
                    }
                    const name = getPeerAvatarName(peerId);
                    const avatar = avatarContainer.scene.getObjectByName(name);
                    if (avatar) {
                        avatarContainer.scene.remove(avatar);
                    }
                });
            } else if (status.value == "online") {
                // get the room
                if (status.room) {
                    this.roomLive = status.room;
                    // Subscribe to room events
                    this.p2pSrv.peerJoin.subscribe(async (peerId) => {
                        const name = getPeerAvatarName(peerId);
                        this.connectedPeerIds.push(peerId);
                        // Add an avatar to represent this peer
                        const avatarContainer = this.getAvatarContainer();
                        if (!avatarContainer || !avatarContainer.scene) {
                            return;
                        }
                        const autoAdd: boolean = true;
                        const avatar = await avatarContainer.scene.addModel({
                            name: name,
                            url: ROOT_PATH + "avatar005.glb",
                        }, autoAdd);
                        avatarContainer.scene.applyLR(
                            avatar, 0, 0, 0, undefined, AVATAR_PELVIS_HEIGHT
                        );
                    });
                    this.p2pSrv.peerLeave.subscribe(async (peerId) => {
                        const name = getPeerAvatarName(peerId);
                        const peerIndex = this.connectedPeerIds.indexOf(peerId);
                        if (peerIndex >= 0) {
                            this.connectedPeerIds.splice(peerIndex, 1);
                        }
                        const avatarContainer = this.getAvatarContainer();
                        if (!avatarContainer || !avatarContainer.scene) {
                            return;
                        }
                        // Remove the avatar representing this peer
                        const avatar = avatarContainer.scene.getObjectByName(name);
                        if (avatar) {
                            avatarContainer.scene.remove(avatar);
                        }
                    });
                    this.p2pSrv.events.subscribe((ev) => {
                        const { peer, payload } = ev;
                        const event: GameAction = payload;
                        if (event.type == "pos") {
                            const name = getPeerAvatarName(peer);
                            const avatarContainer = this.getAvatarContainer();
                            if (!avatarContainer || !avatarContainer.scene) {
                                return;
                            }
                            // Get the data and apply it to the avatar
                            const avatar = avatarContainer.scene.getObjectByName(name);
                            if (avatar) {
                                avatarContainer.scene.applyAvatarState(avatar, event.data);
                            }
                        } else if (event.type == "mode") {
                            this.applyMode(event.data);
                        }
                    });
                }
            }
        });
    }

    override startAll() {
        this.activity = this.indicatorSrv.start();
        try {
            super.startAll();
            if (this.room) {
                this.p2pSrv.connectToRoom(this.room.id);
            }
            this.started = true;
        } catch (err) {
            console.log(err);

        } finally {
            if (this.activity) {
                this.activity.done();
            }
        }
    }

    override stopAll() {
        super.stopAll();
        this.started = false;
    }

    setRoomData(room: RoomGameType | null) {
        this.room = room;
        if (room === null) {
            this.p2pSrv.disconnectFromRoom();
        }
    }

    public override broadcastBinaryData(command: GameAction): Promise<void> {
        return this.p2pSrv.broadcastBinaryData(command);
    }

}