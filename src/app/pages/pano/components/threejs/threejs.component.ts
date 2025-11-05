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
import { PrintBasicScene, PrintConfig, QRConfig } from './PrintBasicScene';
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
  printScene: PrintBasicScene | null = null;
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

  ngOnInit(): void {
    setTimeout(() => {
      this.onResize({});
    }, 0);
    const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
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

  playSound() {
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get("q");
    if (!queryParam) {
      return;
    }
    const loop = true;
    const volume = 1;
    ModuloSonido.play(this.configuration.audioUrl + `?t=${this.tParam}`, loop, volume);
    this.soundActivated = true;
  }

  stopSound() {
    ModuloSonido.stop(this.configuration.audioUrl + `?t=${this.tParam}`);
    this.soundActivated = false;
  }

  canShare() {
    return !!navigator.share;
  }

  getShareUrl() {
    return window.location.origin + "/k.html" + window.location.search;
  }

  waze() {
    if (this.isMobile()) {
      let url = `waze://?ll=${this.configuration.lat},${this.configuration.lon}&navigate=yes`;
      window.open(url, "_blank");
    } else {
      let url = `https://waze.com/ul?ll=${this.configuration.lat},${this.configuration.lon}&navigate=yes`;
      window.open(url, "_blank");
    }
  }

  whatsapp() {
    if (this.isMobile()) {
      let url = `whatsapp://send?phone=${this.configuration.phone}&text=${encodeURIComponent("Hola!")}`;
      window.open(url, "_blank");
    }
  }

  async share() {
    if (!this.configuration) {
      return;
    }
    const shareData = {
      title: this.configuration.title,
      text: this.configuration.subtitle,
      url: this.getShareUrl(),
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        console.log('Shared successfully');
      } catch (err: any) {
        console.error('Share failed:', err.message);
      }
    } else {
      alert('Sharing not supported on this device/browser.');
    }
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

  async recreatePrinted(modelId: string) {
    const activity = this.indicatorSrv.start();

    const paperSelection = this.papers[this.paperSelectedOption];

    const pdf = new jsPDF(paperSelection);

    const qrConfigMap: { [key: string]: { [key: string]: QRConfig } } = {
      "double_wall": {
        "letter": { pg: 0, x: 6.6, y: 4.8, w: 0.8, h: 0.8, },
        "legal": { pg: 0, x: 6.55, y: 6.3, w: 0.8, h: 0.8, },
        "legal_letter": { pg: 0, x: 6.525, y: 4.8, w: 0.8, h: 0.8, },
        "b4": { pg: 0, x: 7.6, y: 6.1, w: 1, h: 1, },
        "b3": { pg: 0, x: 10.7, y: 8.7, w: 1, h: 1, },
        "b2": { pg: 0, x: 15.2, y: 12.2, w: 1, h: 1, },
        "b1": { pg: 0, x: 21.5, y: 17.5, w: 1.5, h: 1.5, },
        "default": { pg: 0, x: 0.5, y: 0.5, w: 1, h: 1, },
      },
      "half_double_wall": {
        "letter": { pg: 0, x: 3.15, y: 3.2, w: 0.8, h: 0.8, },
        "legal": { pg: 0, x: 3.15, y: 5.5 - 0.8, w: 0.8, h: 0.8, },
        "legal_letter": { pg: 0, x: 3.15, y: 5.5 - 0.8, w: 0.8, h: 0.8, },
        "b4": { pg: 0, x: 3.65, y: 4.18, w: 1, h: 1, },
        "b3": { pg: 0, x: 5.14, y: 6.5, w: 1, h: 1, },
        "b2": { pg: 0, x: 7.27, y: 9.51, w: 1, h: 1, },
        "b1": { pg: 0, x: 10.29, y: 13.44, w: 1.5, h: 1.5, },
        "b3_like": { pg: 0, x: 4.58, y: 6.3, w: 1, h: 1, },
        "default": { pg: 0, x: 0.5, y: 0.5, w: 1, h: 1, },
      },
      "double_wall_3": {
        "b3_like": { pg: 0, x: 4, y: 6.2, w: 1, h: 1, },
        "default": { pg: 0, x: 0.5, y: 0.5, w: 1, h: 1, },
      },
      "classic": {
        "b3_like": { pg: 0, x: 4.39, y: 4.84, w: 1, h: 1, },
        "default": { pg: 0, x: 0.5, y: 0.5, w: 1, h: 1, },
      },
      "tiny_world": {
        "default": { pg: 0, x: 0.5, y: 0.5, w: 1, h: 1, },
      },
      "eye_fish": {
        "default": { pg: 0, x: 0.5, y: 0.5, w: 1, h: 1, },
      },
      "mug": {
        "default": { pg: 0, x: 4.9, y: 1.5, w: 1, h: 1, },//9x21cm Fotojapon
        //"default": { pg: 0, x: 5, y: 0.6, w: 1, h: 1, },
      },
      "cube_no_tabs": {
        "default": { pg: 0, x: 0.5, y: 0.5, w: 1, h: 1, },
      },
      "two_halfs": {
        "default": { pg: 2, x: 0.5, y: 0.5, w: 1, h: 1, },
      },
      "simpler": {
        "b3_like": { pg: 0, x: 8.11, y: 12.88, w: 1, h: 1, },
        "default": { pg: 0, x: 0.5, y: 0.5, w: 1, h: 1, },
      },
    };

    let qrConfigLocal = qrConfigMap[modelId];
    let myQRConfig = qrConfigLocal["default"];
    if (this.paperSelectedOption in qrConfigLocal) {
      myQRConfig = qrConfigLocal[this.paperSelectedOption];
    }

    const models: { [key: string]: PrintConfig[] } = {
      "double_wall": [
        {
          width: this.dpi * Math.min(...paperSelection.format),
          height: this.dpi * Math.min(...paperSelection.format),
          zoom: 11,
          center: {
            x: 0.1,
            z: 0,
          },
          root: "/assets/models/",
          objFile: "Cube006.obj",
          mtlFile: "Cube006.mtl",
          materialName: "Material",
        },
      ],
      "half_double_wall": [
        {
          width: this.dpi * Math.min(...paperSelection.format),
          height: 1.257 * this.dpi * Math.min(...paperSelection.format),
          zoom: 9,
          center: {
            x: 0,
            z: 0,
          },
          root: "/assets/models/",
          objFile: "halfDoubleSide.obj",
          mtlFile: "halfDoubleSide.mtl",
          materialName: "Material.001",
        },
      ],
      "double_wall_3": [
        {
          width: this.dpi * Math.min(...paperSelection.format),
          height: 1.301 * this.dpi * Math.min(...paperSelection.format),
          zoom: 7,
          center: {
            x: 0,
            z: 0,
          },
          root: "/assets/models/",
          objFile: "double_side_3.obj",
          mtlFile: "double_side_3.mtl",
          materialName: "Material",
        },
      ],
      "classic": [
        {
          width: this.dpi * Math.min(...paperSelection.format),
          height: this.dpi * Math.min(...paperSelection.format) * 1.41,
          zoom: 9,
          center: {
            x: 0,
            z: 0,
          },
          root: "/assets/models/",
          objFile: "CubeSimple005.obj",
          mtlFile: "CubeSimple005.mtl",
          materialName: "Material",
        },
      ],
      "tiny_world": [
        {
          width: this.dpi * Math.min(...paperSelection.format),
          height: this.dpi * Math.min(...paperSelection.format),
          zoom: 2.1,
          center: {
            x: 0,
            z: 0,
          },
          root: "/assets/models/",
          objFile: "tinyWorld.obj",
          mtlFile: "tinyWorld.mtl",
          materialName: "Material.001",
        },
      ],
      "eye_fish": [
        {
          width: this.dpi * Math.min(...paperSelection.format),
          height: this.dpi * Math.min(...paperSelection.format),
          zoom: 2.1,
          center: {
            x: 0,
            z: 0,
          },
          root: "/assets/models/",
          objFile: "eyeFish.obj",
          mtlFile: "eyeFish.mtl",
          materialName: "Material.001",
        },
      ],
      "mug": [
        {
          width: this.dpi * Math.min(...paperSelection.format),
          height: 2.745 * this.dpi * Math.min(...paperSelection.format),
          //zoom: 6,
          zoom: 6 / 0.9729,//9x21cm Fotojapon
          center: {
            x: 0,
            z: 0,
          },
          root: "/assets/models/",
          objFile: "mug2.obj",
          mtlFile: "mug2.mtl",
          materialName: "Material.001",
        },
      ],
      "cube_no_tabs": [
        {
          width: this.dpi * Math.min(...paperSelection.format),
          height: 1.3333 * this.dpi * Math.min(...paperSelection.format),
          zoom: 8.3,
          center: {
            x: 0,
            z: -0.32,
          },
          root: "/assets/models/",
          objFile: "CubeNoTabs.obj",
          mtlFile: "CubeNoTabs.mtl",
          materialName: "Material",
        },
      ],
      "two_halfs": [
        {
          width: this.dpi * Math.min(...paperSelection.format),
          height: this.dpi * Math.min(...paperSelection.format),
          zoom: 6,
          center: {
            x: 0,
            z: 0,
          },
          root: "/assets/models/",
          objFile: "doubleSide1.obj",
          mtlFile: "doubleSide1.mtl",
          materialName: "Material.001",
        },
        {
          width: this.dpi * Math.min(...paperSelection.format),
          height: this.dpi * Math.min(...paperSelection.format),
          zoom: 6,
          center: {
            x: 0,
            z: 0,
          },
          root: "/assets/models/",
          objFile: "doubleSide2.obj",
          mtlFile: "doubleSide2.mtl",
          materialName: "Material.001",
        },
        {
          width: this.dpi * Math.min(...paperSelection.format),
          height: this.dpi * Math.min(...paperSelection.format),
          zoom: 6,
          center: {
            x: 0,
            z: 0,
          },
          root: "/assets/models/",
          objFile: "doubleSide3.obj",
          mtlFile: "doubleSide3.mtl",
          materialName: "Material.001",
        },
      ],
      "simpler": [
        {
          width: this.dpi * Math.min(...paperSelection.format),
          height: 1.28 * this.dpi * Math.min(...paperSelection.format),
          zoom: 9.5,
          center: {
            x: 0,
            z: 0.05,
          },
          root: "/assets/models/",
          objFile: "simpler.obj",
          mtlFile: "simpler.mtl",
          materialName: "Material",
        },
      ],
    };

    const printConfigs = models[modelId];

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const canvas = this.printCanvasRef.nativeElement;
    const canvasQR = this.canvasQRRef.nativeElement;

    const qrCodeSide = 256;
    await toCanvas(canvasQR, this.getShareUrl(), { width: qrCodeSide, });
    const qrImgData = canvasQR.toDataURL("image/png");

    for (let i = 0; i < printConfigs.length; i++) {
      if (this.printScene) {
        PrintBasicScene.disposeScene(this.printScene);
      }
      this.printScene = new PrintBasicScene(canvas, printConfigs[i], this.indicatorSrv);
      await this.printScene.setConfig(this.configuration);

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Scale the image to fit within the page
      const widthScale = pageWidth / imgWidth;
      const heightScale = pageHeight / imgHeight;
      const scale = Math.min(widthScale, heightScale);

      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;

      const x = (pageWidth - scaledWidth) / 2;
      const y = (pageHeight - scaledHeight) / 2;

      const selected = this.extMap[this.selectedExtension];
      const imgData = canvas.toDataURL(selected.attr1);
      pdf.addImage(imgData, selected.attr2, x, y, scaledWidth, scaledHeight);

      if (myQRConfig.pg == i) {
        pdf.addImage(qrImgData, "PNG", myQRConfig.x, myQRConfig.y, myQRConfig.w, myQRConfig.h);
      }

      if (i < printConfigs.length - 1) {
        pdf.addPage();
      }
    }
    if (this.printScene) {
      PrintBasicScene.disposeScene(this.printScene);
    }

    pdf.save(`paper_model_${this.selectedExtension}_${this.dpi}dpi_${this.paperSelectedOption}_${modelId}.pdf`);

    activity.done();
  }

  isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      .test(navigator.userAgent);
  }
}
