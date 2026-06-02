import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
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
import { getUrlQueryParams } from '@tools/UrlUtil';
import { Unsubscribe } from 'firebase/firestore';
import { DialogFormComponent, FormDataType } from 'src/app/components/dialog-form/dialog-form.component';
import { AllFieldsDataType, FieldJSONDataType, ImageGalleryType, MDDataType } from 'types/fieldsTypes';
import { MenuOptionType } from 'types/StatusBar';

const MODEL_NAME = "document";

export interface DocumentDataType extends BasicDataType {
  description: string;
  gallery: ImageGalleryType[];
};

@Component({
  selector: 'app-document-single',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    FormSimpleWith,
    SideMenu,
  ],
  templateUrl: './document-single.html',
  styleUrls: [
    './document-single.scss',
  ],
})
export class DocumentSingle extends AuthenticatedComponent implements OnInit {
  @ViewChild('inner_form') innerForm!: FormSimpleWith;
  menuOptions: MenuOptionType[] = [];
  liveSubscription: Unsubscribe | null = null;
  liveMode: boolean = true;
  searchable: string = "";
  collection: BasicDataType | null = null;
  cardActions: string[] = [];
  fields: AllFieldsDataType[] = [
    {
      label: "Json",
      type: "json",
      key: "json",
      json: {
        template: "document/${user.uid}/${date.year}-${date.month}-${date.day}/${random}.json",
        fields: [
          {
            label: "Descripción", type: "md", key: "document",
            md: { minHeight: "3em", maxHeight: "80vh" }
          },
        ]
      },
    },
  ];

  constructor(
    private indicatorSrv: IndicatorService,
    public override authSrv: AuthService,
    private http: HttpClient,
    private fileSrv: FileService,
    private firestoreSrv: FirestoreService,
    public override cdr: ChangeDetectorRef,
    public locationSrv: LocationService,
    private dialog: MatDialog,
    public override sanitizer: DomSanitizer,
    public shareSrv: ShareSrv,
    private router: Router,
    public override fullScreenSrv: FullscreenService,
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
          label: "Edit",
          icon: "edit",
          callback: () => {
            this.openUpdateDialog({ model: this.collection });
          },
        },
        {
          label: "Regresar",
          icon: "arrow_back",
          callback: () => {
            this.router.navigate([`docs/all`], {
              queryParams: {}
            });
          },
        },
      ],
    });
  }

  getTitle(): string {
    if (!this.collection) {
      return "Document";
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
        const field1 = (this.fields[0] as FieldJSONDataType);
        field1.json.secret = (this.collection as any).secret;
        const field2 = (field1.json.fields[0] as MDDataType);
        const title = this.collection.title + " - " + epochTo(this.collection.updated);
        document.title = title;
        field2.md.saveName = title;
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
    // Apply the secret check
    (this.fields[0] as FieldJSONDataType).json.secret = (this.collection as any).secret;
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

  async openUpdateDialog(payload: any) {
    let model: any = null;
    if (payload) {
      model = payload.model;
    }
    const formConfig: FormDataType = {
      title: model ? "Actualizar" : "Crear",
      autoAuthor: true,
      modelName: MODEL_NAME,
      searchFields: ["title"],
      fields: [
        { label: "Título", type: "text", key: "title", required: true },
        { label: "Secret", type: "toggle", key: "secret", required: true },
      ],
      model: {
        title: '',
      }
    };
    if (model) {
      formConfig.model = model;
    }
    const dialogRef = this.dialog.open(DialogFormComponent, {
      width: '800px',
      panelClass: 'custom-emoji-picker',
      autoFocus: !this.isMobile(),
      data: formConfig,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        Object.assign(this.collection as any, result);
      }
    });
  }
}
