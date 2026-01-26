import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { CardDoc, CardDocDataType } from '@components/card-doc/card-doc';
import { DialogFormComponent, FormDataType } from '@components/dialog-form/dialog-form.component';
import { SearchInputComponent } from '@components/search-input/search-input';
import { SimpleMapComponent } from '@components/simple-map/simple-map';
import { MenuOptionType, Statusbar } from '@components/statusbar/statusbar';
import { AuthService } from '@services/auth.service';
import { FileService } from '@services/file.srv';
import { BasicDataType, FirestoreService, PageDataType } from '@services/firestore.service';
import { IndicatorService } from '@services/indicator.service';
import { LocationService } from '@services/location.service';
import { ShareSrv } from '@services/share.service';
import { Unsubscribe } from 'firebase/firestore';
import { Subscription } from 'rxjs';

export interface NoteDataType extends BasicDataType {

};

const MODEL_NAME = "photocollection";

@Component({
  selector: 'app-collections',
  standalone: true,
  imports: [
    CommonModule,
    SimpleMapComponent,
    MatButtonModule,
    Statusbar,
    SearchInputComponent,
    CardDoc,
  ],
  templateUrl: './collections.html',
  styleUrl: './collections.scss',
})
export class CollectionsComponent extends AuthenticatedComponent implements OnInit, OnDestroy {
  menuOptions: MenuOptionType[] = [];
  notes: NoteDataType[] = [];
  createUpdateFun!: Function;
  deleteNoteFun!: Function;
  localShareFun!: Function;
  liveSubscription: Unsubscribe | null = null;
  searchable: string = "";
  authSubscription: Subscription | null = null;
  cardConfig: CardDocDataType = {
    shareLink: true,
    shareQR: true,
    showAuthorImg: true,
  };

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
  ) {
    super(sanitizer, authSrv, cdr);

    this.createUpdateFun = this.openDialog.bind(this);
    this.deleteNoteFun = this.deleteNote.bind(this);
    this.localShareFun = this.localShare.bind(this);

    this.menuOptions.push({
      label: "Agregar álbum",
      icon: "add",
      callback: this.openDialog.bind(this),
    });

    this.authSubscription = this.authSrv.authState$.subscribe((user) => {
      if (!user) {
        this.notes = [];
        try {
          this.cdr.detectChanges();
        } catch (err) { }
      } else {
        this.pageNotes(true);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  ngOnInit(): void {

  }

  async openDialog(oldModel: any) {
    const formConfig: FormDataType = {
      title: oldModel ? "Actualizar" : "Crear",
      autoAuthor: true,
      modelName: MODEL_NAME,
      searchFields: ["title", "description"],
      fields: [
        { label: "Título", type: "text", key: "title", required: true },
        {
          label: "Imagen", type: "image", key: "image", image: {
            template: "photo_collection/${user.email}/${date.year}-${date.month}-${date.day}/${random}.jpg",
          }
        },
        { label: "Descripción", type: "contenteditable", key: "description", contenteditable: { minHeight: 10, maxHeight: 20 } },
      ],
      model: {
        title: '',
        description: '',
      }
    };
    if (oldModel) {
      formConfig.model = oldModel;
    }
    const dialogRef = this.dialog.open(DialogFormComponent, {
      width: '800px',
      panelClass: 'custom-emoji-picker',
      autoFocus: !this.isMobile(),
      data: formConfig,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.pageNotes(true);
      }
    });
  }

  async deleteNote(item: any) {
    await this.firestoreSrv.delete(MODEL_NAME, item.id);
    const index = this.notes.indexOf(item);
    if (index >= 0) {
      this.notes.splice(index, 1);
      this.cdr.detectChanges();
    }
  }

  async pageNotes(startover: boolean = false) {
    const indicator = this.indicatorSrv.start();
    try {
      if (startover && this.notes.length > 0) {
        this.notes.splice(0, this.notes.length);
      }
      const searchable: string | undefined = this.searchable == "" ? undefined : this.searchable;
      const pagingOptions: PageDataType = {
        collectionName: MODEL_NAME, searchText: searchable,
        orderColumn: "updated",
        orderDirection: "desc",
        top: 20,
      };
      if (!startover) {
        if (this.notes.length > 0) {
          pagingOptions.lastDoc = this.notes[this.notes.length - 1];
        }
      }
      const page = (await this.firestoreSrv.paging(pagingOptions));
      this.notes.push(...(page as NoteDataType[]));
      this.cdr.detectChanges();
    } catch (err) {

    } finally {
      indicator.done();
    }
  }

  async search(text: string) {
    this.searchable = text;
    this.pageNotes(true);
  }

  async localShare(model: any, type: any) {
    const { id, title, description, updated } = model;
    this.shareSrv.share({
      collection: MODEL_NAME,
      path: "/photocollection",
      id,
      title,
      description,
      updated,
    }, type);
  }
}
