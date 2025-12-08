import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { BasicScene } from './BasicScene';
import { IndicatorService, Wait } from '@services/indicator.service';
import { ModuloSonido } from '@services/sonido.service';
import { MatIconModule } from '@angular/material/icon';
import { PromiseEmitter } from "@tools/PromiseEmitter";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PanoConfig {
  title: string;
  subtitle: string;
  imageUrl: string;
  audioUrl: string | null;
  lat?: number;
  lon?: number;
  phone?: number;
}

@Component({
  standalone: true,
  selector: 'app-threejs',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
  ],
  templateUrl: './threejs.component.html',
  styleUrls: ['./threejs.component.css'],
})
export class ThreejsComponent implements OnInit, AfterViewInit {
  @ViewChild('mycanvas') canvasRef!: ElementRef;
  @ViewChild('myparent') parentRef!: ElementRef;
  scene: BasicScene | null = null;
  bounds: DOMRect | null = null;
  soundActivated: boolean = false;
  queryParam: string = "";
  tParam: string = "0";
  viewState: "photo" | "map" | "print" = "photo";
  sceneCreated: PromiseEmitter = new PromiseEmitter();
  isFullScreen: boolean = false;
  hasMobile: boolean;
  useStereo: boolean = false;
  configuration: PanoConfig = {
    title: "Las mejores cosas de la vida",
    subtitle: "toman tiempo...",
    imageUrl: "",
    audioUrl: null,
  };

  constructor(
    private indicatorSrv: IndicatorService,
    private cdr: ChangeDetectorRef,
  ) {
    this.hasMobile = this.isMobile();
  }

  setViewState(nextState: "map" | "photo" | "print") {
    this.viewState = nextState;
    setTimeout(() => {
      this.onResize({});
    }, 0);
  }

  @HostListener('window:resize', ['$event'])
  public onResize(event: any) {
    this.computeDimensions();
    if (this.scene != null && this.bounds != null) {
      this.scene.setBounds(this.bounds);
    }
  }

  toggleStereo() {
    this.useStereo = !this.useStereo;
    this.onResize(null);
    this.cdr.detectChanges();
  }

  ngAfterViewInit(): void {
    this.computeDimensions();
    if (this.bounds == null) {
      return;
    }
    const theCanvas = this.canvasRef.nativeElement;
    this.scene = new BasicScene(theCanvas, this.bounds, this.indicatorSrv);
    this.scene.initialize();
    this.sceneCreated.resolve();
    this.loop();
  }

  loop() {
    if (this.scene != null && this.scene.camera) {
      this.scene.camera?.updateProjectionMatrix();
      this.scene.localRender(this.useStereo);
      this.scene.orbitals?.update();
      requestAnimationFrame(() => {
        this.loop();
      });
    }
  }

  public computeDimensions() {
    const parentNativeElement = this.parentRef.nativeElement;
    this.bounds = parentNativeElement.getBoundingClientRect();
  }

  getUrlQueryParams() {
    return new URLSearchParams(window.location.hash.split("?")[1]);
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.onResize({});
    }, 0);
    const urlParams = this.getUrlQueryParams();
    const queryParam = urlParams.get("q");
    if (!queryParam) {
      return;
    }
    const tParam = urlParams.get("t");
    if (tParam) {
      this.tParam = tParam;
    }
    this.queryParam = queryParam;
    this.loadConfiguration().then(async () => {
      await this.sceneCreated.promise;
      if (this.scene) {
        await this.scene.setConfig(this.configuration);
      }
      this.cdr.detectChanges();
    });
  }

  async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    const data: T = await response.json();
    return data;
  }

  async loadConfiguration() {
    const promise: Wait = this.indicatorSrv.start();
    const configUrl = `https://storage.googleapis.com/pro-ejflab-assets/pano/${this.queryParam}/config.json?t=${this.tParam}`;
    try {
      this.configuration = await this.fetchJson(configUrl);
    } catch (err) {

    } finally {
      promise.done();
    }
  }

  stopSound() {
    ModuloSonido.stop(this.configuration.audioUrl + `?t=${this.tParam}`);
    this.soundActivated = false;
  }

  enterFullscreen(element: any) {
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) { // Safari
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { // IE11
      element.msRequestFullscreen();
    }
  }

  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) { // Safari
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) { // IE11
      (document as any).msExitFullscreen();
    }
  }

  setFullScreen(value: boolean) {
    this.isFullScreen = value;
    if (value) {
      const elem = document.documentElement;
      this.enterFullscreen(elem);
    } else {
      this.exitFullscreen();
    }
  }

  isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      .test(navigator.userAgent);
  }
}
