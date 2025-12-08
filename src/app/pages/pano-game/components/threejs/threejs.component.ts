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
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import jsPDF from 'jspdf';
import { toCanvas } from 'qrcode';
import { MatIconModule } from '@angular/material/icon';
import { PromiseEmitter } from "@tools/PromiseEmitter";
import { Base64 } from "@tools/Base64";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

setOptions({ key: Base64.decode('QUl6YVN5Q0NoUUpEOXMweV9rVFVoZXVoN3NzdWJWc1dPSl9IaW9j') });

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
  @ViewChild('qrcanvas') canvasQRRef!: ElementRef;
  @ViewChild('myprintcanvas') printCanvasRef!: ElementRef;
  @ViewChild('myparent') parentRef!: ElementRef;
  @ViewChild('myprintparent') printParentRef!: ElementRef;
  scene: BasicScene | null = null;
  bounds: DOMRect | null = null;
  soundActivated: boolean = false;
  queryParam: string = "";
  tParam: string = "0";
  viewState: "photo" | "map" | "print" = "photo";
  mapLib: any;
  map: any = null;
  markers: Array<any> = [];
  sceneCreated: PromiseEmitter = new PromiseEmitter();
  isFullScreen: boolean = false;
  hasMobile: boolean;
  configuration: PanoConfig = {
    title: "Las mejores cosas de la vida",
    subtitle: "toman tiempo...",
    imageUrl: "",
    audioUrl: null,
  };
  extMap: any = {
    "jpeg": {
      attr1: "image/jpeg",
      attr2: "JPEG"
    },
    "png": {
      attr1: "image/png",
      attr2: "PNG"
    }
  };
  dpi: number = 200;
  dpiOptions = [
    { id: 100, name: '100 dpi' },
    { id: 200, name: '200 dpi' },
    { id: 300, name: '300 dpi' },
  ]
  extensionOptions = [
    { id: "jpeg", name: 'JPEG' },
    { id: "png", name: 'PNG' },
  ];
  selectedExtension = "jpeg";
  paperOptions = [
    { id: "letter", name: 'Carta' },
    { id: "legal", name: 'Oficio' },
    { id: "legal_letter", name: 'Legal-Letter' },
    { id: "b1", name: 'B1 (pliego)' },
    { id: "b2", name: 'B2 (medio pliego)' },
    { id: "b3", name: 'B3 (cuarto)' },
    { id: "b3_like", name: '48x32' },
    { id: "b4", name: 'B4 (octavo)' },
  ];
  paperSelectedOption = "legal_letter";
  papers: { [key: string]: any } = {
    "letter": {
      orientation: 'portrait',
      unit: 'in',
      format: [8.5, 11],
    },
    "legal": {
      orientation: 'portrait',
      unit: 'in',
      format: [8.5, 14],
    },
    "legal_letter": {
      orientation: 'portrait',
      unit: 'in',
      format: [8.5, 13.11],
    },
    "b4": {
      orientation: 'portrait',
      unit: 'in',
      format: [9.8, 13.8],
    },
    "b3": {
      orientation: 'portrait',
      unit: 'in',
      format: [13.9, 19.7],
    },
    "b3_like": {
      orientation: 'portrait',
      unit: 'in',
      format: [12.559, 18.858],
    },
    "b2": {
      orientation: 'portrait',
      unit: 'in',
      format: [19.7, 27.8],
    },
    "b1": {
      orientation: 'portrait',
      unit: 'in',
      format: [27.8, 39.4],
    }
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

  goToMap() {
    if (this.isMobile()) {
      let url = `https://www.google.com/maps/dir/?api=1&destination=${this.configuration.lat},${this.configuration.lon}`;
      window.open(url, "_blank");
    } else {
      this.setViewState('map');
    }
  }

  hasValidLocation() {
    return (typeof this.configuration.lat == "number" && typeof this.configuration.lon == "number");
  }

  hasPhone() {
    return (typeof this.configuration.phone == "number");
  }

  async importMapLibraries() {
    const { Map } = await importLibrary("maps");
    const { AdvancedMarkerElement } = await importLibrary("marker");
    this.mapLib = {
      Map,
      AdvancedMarkerElement,
    };
  }

  addMarker(lat: number, lon: number) {
    const marker = new this.mapLib.AdvancedMarkerElement({
      map: this.map,
      position: { lat: lat, lng: lon },
    });
    this.markers.push(marker);
  }

  loadMap() {
    const mapOptions = {
      center: {
        lat: this.configuration.lat,
        lng: this.configuration.lon,
      },
      zoom: 16,
      mapId: 'DEMO_MAP_ID',
      mapTypeId: 'satellite',
    };

    const elem = document.getElementById('map');
    if (elem) {
      this.map = new this.mapLib.Map(elem, mapOptions);
      if (this.configuration.lat && this.configuration.lon) {
        this.addMarker(this.configuration.lat, this.configuration.lon);
      }
    }
  }

  @HostListener('window:resize', ['$event'])
  public onResize(event: any) {
    this.computeDimensions();
    if (this.scene != null && this.bounds != null) {
      this.scene.setBounds(this.bounds);
    }
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
      this.scene.renderer?.render(this.scene, this.scene.camera);
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

  setSubtitle(text: string) {
    const span = document.getElementById("my_subtitle");
    if (!span) {
      return;
    }
    span.innerHTML = text
      .split(' ')
      .map(word => `<span class="outlined">${word}</span>`)
      .join(' ');
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

      if (this.hasValidLocation()) {
        await this.importMapLibraries();
        this.loadMap();
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
