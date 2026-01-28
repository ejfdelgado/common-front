import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { CardDoc, CardDocDataType } from '@components/card-doc/card-doc';
import { DialogFormComponent, FormDataType } from '@components/dialog-form/dialog-form.component';
import { SearchInputComponent } from '@components/search-input/search-input';
import { MenuOptionType, Statusbar } from '@components/statusbar/statusbar';
import { AuthService } from '@services/auth.service';
import { FileService } from '@services/file.srv';
import { BasicDataType, FirestoreService } from '@services/firestore.service';
import { IndicatorService } from '@services/indicator.service';
import { LocationService } from '@services/location.service';
import { ShareSrv } from '@services/share.service';
import { getBucketPath, getSquarePath } from '@tools/BucketPaths';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { Unsubscribe } from 'firebase/firestore';
import { Subscription } from 'rxjs';

const MODEL_NAME = "book";

export interface BookDataType extends BasicDataType {
  description: string;
  image: string;
};

@Component({
  selector: 'app-book-single',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    SearchInputComponent,
    CardDoc,
  ],
  templateUrl: './book-single.html',
  styleUrl: './book-single.scss',
})
export class BookSingle extends AuthenticatedComponent implements OnInit {
  menuOptions: MenuOptionType[] = [];
  notes: BookDataType[] = [];
  liveSubscription: Unsubscribe | null = null;
  liveMode: boolean = true;
  searchable: string = "";
  collection: BasicDataType | null = null;
  markerSubscriptions: Subscription[] = [];
  cardConfig: CardDocDataType = {
    shareLink: true,
    showAuthorImg: true,
    shareQR: false,
    hasImage: true,
  };
  cardActions: string[] = [];

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
      label: "Regresar a biblioteca",
      icon: "arrow_back",
      callback: () => {
        this.router.navigate([`books_gallery/all`], {
          queryParams: {}
        });
      },
    });
  }

  getTitle(): string {
    if (!this.collection) {
      return "Book";
    } else {
      return this.collection.title;
    }
  }

  ngOnInit(): void {
    this.loadCollection();
    this.setRefreshMethod(true);
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
    const params = getUrlQueryParams();
    const id = params.get("id");
    if (!id) {
      throw new Error("Missed parent");
    }
    return `book_collection/${id}/${MODEL_NAME}`;
  }

  async openDialog(payload: any) {
    let model: any = null;
    if (payload) {
      model = payload.model;
    }
    const formConfig: FormDataType = {
      title: model ? "Actualizar" : "Crear",
      autoAuthor: true,
      modelName: this.getCollectionName(),
      searchFields: ["title", "description"],
      fields: [
        { label: "Título", type: "text", key: "title", required: true },
        { label: "Descripción", type: "contenteditable", key: "description" },
      ],
      model: {
        title: '',
        description: '',
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
        if (!model) {
          // Creation
          if (!this.liveMode) {
            this.pageNotes(true);
          }
        } else {
          // Update
          // mix objects
          Object.assign(model, result);
          this.cdr.detectChanges();
        }
      }
    });
  }

  async deleteNote({ model }: { model: any }) {
    await this.firestoreSrv.delete(this.getCollectionName(), model.id);
    // If all is ok, just remove from the list
    const index = this.notes.indexOf(model);
    if (index >= 0) {
      this.notes.splice(index, 1);
      this.cdr.detectChanges();
    }
  }

  async pageNotes(startover: boolean = false) {
    if (startover && this.notes.length > 0) {
      this.notes.splice(0, this.notes.length);
    }
    const searchable: string | undefined = this.searchable == "" ? undefined : this.searchable;
    const page = (await this.firestoreSrv.paging({
      collectionName: this.getCollectionName(),
      searchText: searchable,
    }));
    this.notes.push(...(page as BookDataType[]));
    this.cdr.detectChanges();
  }

  setRefreshMethod(live: boolean) {
    this.liveMode = live;
    if (this.liveSubscription != null) {
      this.liveSubscription();
    }
    if (live) {
      this.liveSubscription = this.firestoreSrv.livePaging(this.getCollectionName(), (page: any) => {
        this.notes.splice(0, this.notes.length);
        this.notes.push(...(page as BookDataType[]));
        this.cdr.detectChanges();
      });
    } else {
      this.pageNotes(true);
    }
  }
}
