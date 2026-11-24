import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  CommandConfigType,
  RecognizedWordId,
  VoiceRecognitionService,
} from '@services/voicerecognition.service';
import { SpeechSynthesisService } from '@services/speechsynthesis.service';
import { IndicatorService } from '@services/indicator.service';
import { BooleanStateService } from '@services/boolean-state.service';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import { AvatarContainer } from '../avatar-container/avatar-container';
import { AvatarService } from '@services/avatar.service';
import { P2PService } from '@services/p2p.service';
import { ComponentP2P } from '@avatar/ComponentP2P';
import { ConfigService } from '@services/config.service';
import { MatDialog } from '@angular/material/dialog';
import { AvatarBodyEvent } from 'src/types/BodyTypes';
import { TranslatePipe } from 'src/app/pipes/translate.pipe';
import { Subscription } from 'rxjs';
import { StartGameOptions } from 'src/types/WorldAvatar';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { SimpleMapComponent } from '@components/simple-map/simple-map';
import { MapGestureData } from '@avatar/controllers/HandsGoogleMapController';

@Component({
  selector: 'app-body-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, AvatarContainer, TranslatePipe, SimpleMapComponent],
  templateUrl: './body-tracker.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./body-tracker.scss', '../../../../../../threejs_styles.scss'],
})
export class BodyTracker extends ComponentP2P implements AfterViewInit {
  @ViewChild('three_component') avatarContainer!: AvatarContainer;
  @ViewChild('video') videoRefGlobal!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRefGlobal!: ElementRef<HTMLCanvasElement>;
  // Only present while mode.type == 'op_google_map' (rendered inside an @if)
  @ViewChild('background_map') backgroundMap?: SimpleMapComponent;
  // Vector rendering is required for setHeading (rotation) and fractional zoom.
  // Hands are the input, so the map ignores mouse/touch/keyboard gestures.
  backgroundMapOptions: google.maps.MapOptions = {
    renderingType: 'VECTOR' as google.maps.RenderingType,
    isFractionalZoomEnabled: true,
    gestureHandling: 'none',
    keyboardShortcuts: false,
  };
  // Map zoom / heading captured when the two-hand gesture starts
  mapGestureBase: { zoom: number; heading: number } | null = null;

  @Output() events: EventEmitter<AvatarBodyEvent> = new EventEmitter();
  headUpLogData: any = {};
  configSubs!: Subscription;
  translateCounter: number = 0;

  constructor(
    public override cdr: ChangeDetectorRef,
    public override voiceSrv: VoiceRecognitionService,
    public override speechSrv: SpeechSynthesisService,
    public override indicatorSrv: IndicatorService,
    public override booleanService: BooleanStateService,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public override avatarSrv: AvatarService,
    public override configSrv: ConfigService,
    public override p2pSrv: P2PService,
    public override dialog: MatDialog,
    private analyticsSrv: AnalyticsService,
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
      configSrv,
      dialog,
      p2pSrv,
    );
    this.voiceSrv.setInterimResults(true);
    this.voiceSrv.setContinuous(false);

    const config: CommandConfigType = {
      confidenceMin: 0.5,
      maxDiffMillis: 600,
    };
    const { word$, command$ } = this.voiceSrv.singleWordConnect(config);

    setInterval(() => {
      if (this.adjustWords()) {
        this.cdr.detectChanges();
      }
    }, 1000);

    const addWordFun = (input: RecognizedWordId) => {
      this.words.push({
        word: input.word,
        time: input.timestamp,
        id: input.id,
        color: this.getNextColor(),
      });
      this.adjustWords();
      this.cdr.detectChanges();
    };

    word$.subscribe(addWordFun);
    command$.subscribe((command) => {
      this.avatarContainer.executeCommand(command);
    });
    //this.voiceSrv.recognizedWord$.subscribe(addWordFun);
    this.configSubs = this.configSrv.events.subscribe(() => {
      this.translateCounter++;
    });
  }

  async ngAfterViewInit() {
    this.registerVideoAndCanvas(this.videoRefGlobal, this.canvasRefGlobal);
    const promise = this.indicatorSrv.start();
    const promises = [];
    promises.push(this.speechSrv.init());
    await Promise.all(promises);
    promise.done();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.configSubs.unsubscribe();
  }

  headUpLog(event: any) {
    this.headUpLogData = event;
    //this.cdr.detectChanges();
  }

  override getAvatarContainer(): AvatarContainer {
    return this.avatarContainer;
  }

  notifyEvent(event: AvatarBodyEvent): void {
    if (event.name == 'MAP_GESTURE') {
      this.applyMapGesture(event.data);
      return;
    }
    this.events.emit(event);
  }

  // Applies the commands produced by HandsGoogleMapController
  applyMapGesture(data: MapGestureData) {
    const map = this.backgroundMap?.map;
    if (!map || !data) {
      return;
    }
    switch (data.type) {
      case 'pan':
        // Grab semantics: the content moves with the hand, so the camera moves opposite
        if (data.live) {
          const center = this.offsetMapCenter(map, -data.dx, -data.dy);
          if (center) {
            map.moveCamera({ center });
            break;
          }
        }
        map.panBy(-data.dx, -data.dy);
        break;
      case 'zoom_rotation_start':
        this.mapGestureBase = {
          zoom: map.getZoom() ?? 0,
          heading: map.getHeading() ?? 0,
        };
        break;
      case 'zoom_rotation':
        if (!this.mapGestureBase) {
          return;
        }
        const zoom = this.mapGestureBase.zoom + data.zoomDelta;
        const heading = this.mapGestureBase.heading + data.headingDelta;
        if (data.live) {
          map.moveCamera({ zoom, heading });
        } else {
          map.setZoom(zoom);
          map.setHeading(heading);
        }
        break;
      case 'zoom_rotation_end':
        this.mapGestureBase = null;
        break;
    }
  }

  /**
   * Returns the LatLng that is (dx, dy) screen pixels away from the current center,
   * accounting for the map heading (tilt is assumed 0). Null if the projection
   * is not ready yet.
   */
  offsetMapCenter(map: google.maps.Map, dx: number, dy: number): google.maps.LatLng | null {
    const projection = map.getProjection();
    const center = map.getCenter();
    const zoom = map.getZoom();
    if (!projection || !center || zoom == null) {
      return null;
    }
    const worldCenter = projection.fromLatLngToPoint(center);
    if (!worldCenter) {
      return null;
    }
    // Screen axes are rotated by the heading (clockwise) relative to world axes
    const h = ((map.getHeading() ?? 0) * Math.PI) / 180;
    const cos = Math.cos(h);
    const sin = Math.sin(h);
    const worldDx = dx * cos - dy * sin;
    const worldDy = dx * sin + dy * cos;
    // World coordinates are 256 units wide at zoom 0, doubling every zoom level
    const scale = Math.pow(2, zoom);
    return projection.fromPointToLatLng(
      new google.maps.Point(worldCenter.x + worldDx / scale, worldCenter.y + worldDy / scale),
    );
  }

  override async startAll(options?: StartGameOptions) {
    super.startAll(options);
    if (this.room) {
      this.analyticsSrv.event('play', { roomId: this.room.id });
    }
  }

  getBackgroundTransformations() {
    if (!this.avatarContainer?.hudData) {
      return "scale(1)";
    }
    const { bgDx, bgDy, bgScale, bgRotateDeg } = this.avatarContainer.hudData;
    return `translate(${bgDx.toFixed(0)}px, ${bgDy.toFixed(0)}px) scale(${bgScale.toFixed(3)}) rotate(${bgRotateDeg.toFixed(0)}deg)`;
  }
}
