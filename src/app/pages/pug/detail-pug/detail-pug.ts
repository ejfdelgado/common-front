import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { FormSimpleWith } from '@components/form-simple/form-simple-with';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { AuthService } from '@services/auth.service';
import { FileService } from '@services/file.srv';
import { BasicDataType, FirestoreConfigDataType, FirestoreService } from '@services/firestore.service';
import { FullscreenService } from '@services/fullscreen.service';
import { IndicatorService } from '@services/indicator.service';
import { LocationService } from '@services/location.service';
import { ShareSrv } from '@services/share.service';
import { epochTo } from '@tools/DateUtils';
import { html2text } from '@tools/HtmlUtil';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { Unsubscribe } from 'firebase/firestore';
import { AllFieldsDataType, ImageGalleryType } from 'types/fieldsTypes';
import { MenuOptionType } from 'types/StatusBar';
import WordCloud from 'wordcloud';
import { ThreejsComponent } from '../components/threejs/threejs.component';
import { MatIcon } from '@angular/material/icon';

const MODEL_NAME = "pug";

export interface DocumentDataType extends BasicDataType {
  description: string;
  gallery: ImageGalleryType[];
};

@Component({
  selector: 'app-detail-pug',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    FormSimpleWith,
    SideMenu,
    ThreejsComponent,
    MatIcon,
  ],
  templateUrl: './detail-pug.html',
  styleUrls: [
    './detail-pug.scss',
  ],
})
export class DetailPug extends AuthenticatedComponent implements OnInit {
  @ViewChild('inner_form') innerForm!: FormSimpleWith;
  @ViewChild("three_pug_component") threePugComponent!: ThreejsComponent;
  @ViewChild('full_texture') canvasFullTexture!: ElementRef;
  @ViewChild('word_cloud_1') canvasWordCloud1!: ElementRef;
  @ViewChild('word_cloud_2') canvasWordCloud2!: ElementRef;
  menuOptions: MenuOptionType[] = [];
  liveSubscription: Unsubscribe | null = null;
  liveMode: boolean = true;
  searchable: string = "";
  collection: BasicDataType | null = null;
  cardActions: string[] = [];
  words: [string, number][] = [];
  fields: AllFieldsDataType[] = [
    {
      label: "Json",
      type: "json",
      key: "json",
      json: {
        template: "pugs/${user.uid}/${date.year}-${date.month}-${date.day}/${random}.json",
        fields: [
          {
            label: "Lista de palabras", type: "contenteditable", key: "description", contenteditable: {
              configs: {
                useBold: false,
                useEmoji: true,
                useItalic: false,
                useUnderline: false,
              }
            }
          },
        ]
      },
    },
  ];

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public override authSrv: AuthService,
    public override cdr: ChangeDetectorRef,
    //
    private indicatorSrv: IndicatorService,
    private http: HttpClient,
    private fileSrv: FileService,
    private firestoreSrv: FirestoreService,
    public locationSrv: LocationService,
    private dialog: MatDialog,
    public shareSrv: ShareSrv,
    private router: Router,
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);

    if (!this.isMobile()) {
      this.cardActions = ['location_on'];
    }

    this.menuOptions.push({
      label: "OPCIONES",
      children: [
        {
          label: "Guardar",
          icon: "save",
          callback: () => {
            this.save();
          },
        },
        {
          label: "Regresar",
          icon: "arrow_back",
          callback: () => {
            this.router.navigate([`pug/all`], {
              queryParams: {}
            });
          },
        },
      ],
    });
  }

  getTitle(): string {
    if (!this.collection) {
      return "Pug";
    } else {
      return this.collection.title;
    }
  }

  ngOnInit(): void {
    this.loadCollection();
  }

  async loadCollection() {
    const params = getUrlQueryParams();
    const col = params.get("col");
    const id = params.get("id");
    if (col && id) {
      const temp = await this.firestoreSrv.readById(col, id);
      if (temp) {
        this.collection = temp as BasicDataType;

        const title = this.collection.title + " - " + epochTo(this.collection.updated);
        document.title = title;
      } else {
        this.collection = null;
      }
      this.cdr.detectChanges();
    }
  }

  getCollectionName() {
    return MODEL_NAME;
  }

  async save() {
    const { valid, data } = await this.innerForm.save();
    if (valid) {
      const conf: FirestoreConfigDataType = {
        autoAuthor: true,
        searchFields: ["title"],
      };
      const complete = Object.assign({}, this.collection, data);
      await this.firestoreSrv.createUpdate(MODEL_NAME, complete, conf);
    }
  }

  async getMaskLoaded(): Promise<HTMLImageElement> {
    const maskImg = document.getElementById('mask') as HTMLImageElement;
    if (!maskImg) {
      throw new Error("No mask image");
    }
    if (!maskImg.complete) {
      return new Promise((resolve, reject) => {
        maskImg.onload = () => {
          resolve(maskImg);
        };
      });
    }
    return maskImg;
  }

  private applyMaskToCanvas(canvas: HTMLCanvasElement, maskImg: HTMLImageElement, backgroundColor: string): void {
    // Step 1: convert mask image to binary: dark opaque pixels → shape, bright/transparent → background
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = maskImg.naturalWidth;
    maskCanvas.height = maskImg.naturalHeight;
    const maskCtx = maskCanvas.getContext('2d')!;
    maskCtx.drawImage(maskImg, 0, 0);

    const srcData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const binaryData = maskCtx.createImageData(srcData);
    for (let i = 0; i < srcData.data.length; i += 4) {
      const tone = srcData.data[i] + srcData.data[i + 1] + srcData.data[i + 2];
      const alpha = srcData.data[i + 3];
      if (alpha < 128 || tone > 128 * 3) {
        // background: white transparent
        binaryData.data[i] = binaryData.data[i + 1] = binaryData.data[i + 2] = 255;
        binaryData.data[i + 3] = 0;
      } else {
        // shape: black opaque
        binaryData.data[i] = binaryData.data[i + 1] = binaryData.data[i + 2] = 0;
        binaryData.data[i + 3] = 255;
      }
    }
    maskCtx.putImageData(binaryData, 0, 0);

    // Step 2: get bgPixel from backgroundColor
    const bctx = document.createElement('canvas').getContext('2d')!;
    bctx.fillStyle = backgroundColor;
    bctx.fillRect(0, 0, 1, 1);
    const bgPixel = bctx.getImageData(0, 0, 1, 1).data;

    // Step 3: scale binary mask to canvas size and remap pixels to bgPixel variants
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = canvas.width;
    scaledCanvas.height = canvas.height;
    const scaledCtx = scaledCanvas.getContext('2d')!;
    scaledCtx.drawImage(maskCanvas, 0, 0, maskCanvas.width, maskCanvas.height, 0, 0, canvas.width, canvas.height);

    const scaledData = scaledCtx.getImageData(0, 0, canvas.width, canvas.height);
    const outputData = scaledCtx.createImageData(scaledData);
    for (let i = 0; i < scaledData.data.length; i += 4) {
      outputData.data[i] = bgPixel[0];
      outputData.data[i + 1] = bgPixel[1];
      outputData.data[i + 2] = bgPixel[2];
      if (scaledData.data[i + 3] > 128) {
        // shape area → exact bgPixel → available for words
        outputData.data[i + 3] = bgPixel[3];
      } else {
        // background area → bgPixel alpha-1 → forbidden (differs from bgPixel)
        outputData.data[i + 3] = bgPixel[3] ? bgPixel[3] - 1 : 0;
      }
    }
    scaledCtx.putImageData(outputData, 0, 0);

    const targetCtx = canvas.getContext('2d')!;
    targetCtx.clearRect(0, 0, canvas.width, canvas.height);
    targetCtx.drawImage(scaledCanvas, 0, 0);
  }

  async waitUntilFont(font: string): Promise<void> {
    await document.fonts.load(`16px "${font}"`);
    if (!document.fonts.check(`16px "${font}"`)) {
      await new Promise<void>((resolve) => {
        document.fonts.ready.then(() => resolve());
      });
    }
  }

  async makeAll() {
    await this.renderWordCloud();
    await this.compose();
  }

  async renderWordCloud() {
    const wait = this.indicatorSrv.start();
    try {
      const canvas1 = this.canvasWordCloud1.nativeElement as HTMLCanvasElement;
      const canvas2 = this.canvasWordCloud2.nativeElement as HTMLCanvasElement;
      const maskImg = await this.getMaskLoaded();
      await this.waitUntilFont("Finger Paint");

      if (!canvas1 || !canvas2) {
        console.error('Canvas element not found');
        return;
      }

      const words1 = this.words.filter((a, i) => {
        return i % 2 == 0;
      });
      const words2 = this.words.filter((a, i) => {
        return i % 2 == 1;
      });

      const backgroundColor = '#ffffff';
      const config = {
        list: [],
        gridSize: 1,
        weightFactor: 4,
        fontFamily: 'Finger Paint, cursive, sans-serif',
        color: (word: string, weight: number) => {
          return '#000000';
        },
        backgroundColor,
        rotateRatio: 0.5,
        rotationSteps: 2,
      };

      const promise1 = new Promise<void>((resolve) => {
        canvas1.addEventListener('wordcloudstop', () => {
          resolve();
        }, { once: true });
      });
      WordCloud(canvas1, Object.assign({}, config, { list: words1 }));
      await promise1;

      const promise2 = new Promise<void>((resolve) => {
        canvas2.addEventListener('wordcloudstop', () => {
          resolve();
        }, { once: true });
      });
      this.applyMaskToCanvas(canvas2, maskImg, backgroundColor);
      WordCloud(canvas2, Object.assign({}, config, {
        list: words2,
        clearCanvas: false,
      }));
      await promise2;
    } catch (err) {
      console.log(err);
    } finally {
      wait.done();
    }
  }

  jsonDataChange(data: any) {
    if (data.key == "json") {
      const text = data.val.description;
      const parts = text.split(/<\/?div>/);
      const realWords = parts.filter((e: string) => { return e.trim().length > 0 });
      const tam = realWords.length;
      this.words = realWords.map((word: string, i: number) => {
        return [html2text(word), tam - i];
      });
    }
  }

  async compose() {
    const finalComposition = this.canvasFullTexture.nativeElement as HTMLCanvasElement;
    const leftCanvas = this.canvasWordCloud1.nativeElement as HTMLCanvasElement;
    const rightCanvas = this.canvasWordCloud2.nativeElement as HTMLCanvasElement;

    const ctx = finalComposition.getContext('2d')!;
    const destW = finalComposition.width;
    const destH = finalComposition.height;

    // Step 1: fill white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, destW, destH);

    const marginBottom = 50;

    // Step 2: left canvas rotated 90° CW, placed at screen top-left (0, 0).
    // After CW rotation: local (lx, ly) → screen (-ly + tx, lx + ty).
    // Bounding box X: [tx - srcH, tx], Y: [ty, ty + srcW].
    // To anchor at (0,0): tx = srcH, ty = 0.
    ctx.save();
    ctx.translate(leftCanvas.height, 0);
    ctx.rotate(Math.PI / 2);
    //ctx.translate(marginBottom, 0);
    ctx.drawImage(leftCanvas, 0, -marginBottom);
    ctx.restore();

    // Step 3: right canvas rotated 90° CCW, top at y=0, right edge at destW.
    // After CCW rotation: local (lx, ly) → screen (ly + tx, -lx + ty).
    // Bounding box X: [tx, tx + srcH], Y: [ty - srcW, ty].
    // To anchor top at 0 and right at destW: ty = srcW, tx = destW - srcH.
    ctx.save();
    ctx.translate(destW - rightCanvas.height, rightCanvas.width);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(rightCanvas, 0, -marginBottom);
    ctx.restore();

    this.threePugComponent.replacePugSkin(finalComposition);
  }
}
