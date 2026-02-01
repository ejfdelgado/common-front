import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { FormSimpleWith } from '@components/form-simple/form-simple-with';
import { MenuOptionType, Statusbar } from '@components/statusbar/statusbar';
import { AuthService } from '@services/auth.service';
import { FileService } from '@services/file.srv';
import { BasicDataType, FirestoreConfigDataType, FirestoreService } from '@services/firestore.service';
import { IndicatorService } from '@services/indicator.service';
import { LocationService } from '@services/location.service';
import { ShareSrv } from '@services/share.service';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { Unsubscribe } from 'firebase/firestore';
import { AllFieldsDataType, ImageGalleryType } from 'types/fieldsTypes';

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
  ],
  templateUrl: './document-single.html',
  styleUrl: './document-single.scss',
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
      label: "Json", type: "json", key: "json", json: {
        template: "document/${user.uid}/${date.year}-${date.month}-${date.day}/${random}.json",
        fields: [
          { label: "Descripción", type: "md", key: "document", md: { maxHeight: 50, minHeight: 3 } },
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

  ) {
    super(sanitizer, authSrv, cdr);

    if (!this.isMobile()) {
      this.cardActions = ['location_on'];
    }

    this.menuOptions.push({
      label: "Guardar",
      icon: "save",
      callback: () => {
        this.save();
      },
    });

    this.menuOptions.push({
      label: "Regresar a documentos",
      icon: "arrow_back",
      callback: () => {
        this.router.navigate([`docs/all`], {
          queryParams: {}
        });
      },
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
}
