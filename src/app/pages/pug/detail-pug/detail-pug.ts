import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { FlatJsonDataType } from '@components/form-simple/form-simple';
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
import { escapeHtml, html2text } from '@tools/HtmlUtil';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { Unsubscribe } from 'firebase/firestore';
import { AllFieldsDataType, FieldJSONDataType, ImageGalleryType } from 'types/fieldsTypes';
import { MenuOptionType } from 'types/StatusBar';
import WordCloud from 'wordcloud';

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
  ],
  templateUrl: './detail-pug.html',
  styleUrls: [
    './detail-pug.scss',
  ],
})
export class DetailPug extends AuthenticatedComponent implements OnInit {
  @ViewChild('inner_form') innerForm!: FormSimpleWith;
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

  renderWordCloud() {
    const canvas1 = document.getElementById('wordcloud1') as HTMLCanvasElement;
    const canvas2 = document.getElementById('wordcloud2') as HTMLCanvasElement;
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

    const config = {
      list: [],
      gridSize: 2,
      weightFactor: 2,
      fontFamily: 'Finger Paint, cursive, sans-serif',
      color: (word: string, weight: number) => {
        return '#000000';
      },
      backgroundColor: '#ffffff',
      rotateRatio: 0.5,
      rotationSteps: 2,
    };

    WordCloud(canvas1, Object.assign({}, config, { list: words1 }));
    WordCloud(canvas2, Object.assign({}, config, { list: words2 }));
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
}
