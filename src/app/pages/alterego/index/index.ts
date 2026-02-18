import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { CardDoc, CardDocDataType } from '@components/card-doc/card-doc';
import { DialogFormComponent, FormDataType } from '@components/dialog-form/dialog-form.component';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { AuthService } from '@services/auth.service';
import { FileService } from '@services/file.srv';
import { BasicDataType, FirestoreService, PageDataType } from '@services/firestore.service';
import { FullscreenService } from '@services/fullscreen.service';
import { IndicatorService } from '@services/indicator.service';
import { LocationService } from '@services/location.service';
import { ShareSrv } from '@services/share.service';
import { Unsubscribe } from 'firebase/firestore';
import { Subscription } from 'rxjs';
import { MenuOptionType } from 'types/StatusBar';

export interface NoteDataType extends BasicDataType {

};

const MODEL_NAME = "knowledge";

@Component({
  selector: 'app-alterego-index',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    CardDoc,
    SideMenu,
  ],
  templateUrl: './index.html',
  styleUrl: './index.scss',
})
export class AlteregoIndex extends AuthenticatedComponent implements OnInit, OnDestroy {
  menuOptions: MenuOptionType[] = [];
  notes: NoteDataType[] = [];
  liveSubscription: Unsubscribe | null = null;
  searchable: string = "";
  authSubscription: Subscription | null = null;
  cardConfig: CardDocDataType = {
    shareLink: true,
    shareQR: true,
    hasImage: true,
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
    private router: Router,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);

    this.menuOptions.push({
      label: "Add knowledge database",
      icon: "add",
      children: [],
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

  async openDialog(payload: any) {
    let model: any = null;
    if (payload) {
      model = payload.model;
    }
    const formConfig: FormDataType = {
      title: model ? "Update" : "Create",
      autoAuthor: true,
      modelName: MODEL_NAME,
      searchFields: ["title", "description"],
      fields: [
        { label: "Title", type: "text", key: "title", required: true },
        {
          label: "Language", type: "select", key: "language", required: true,
          select: {
            options: [
              { txt: "English", val: "en" },
              { txt: "Español", val: "es" },
              { txt: "Agnostic", val: "multi" },
            ]
          }
        },
        {
          label: "Imagen", type: "image", key: "image", image: {
            thumbnailMaxSizePixels: 200,
            squareMaxSizePixels: 800,//For social
            template: "knowledge_database/${user.uid}/${date.year}-${date.month}-${date.day}/${random}.jpg",
          }
        },
        {
          label: "Description", type: "contenteditable", key: "description",
          contenteditable: { minHeight: "10em", maxHeight: "20em" }
        },
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
        this.pageNotes(true);
      }
    });
  }

  async deleteNote({ model }: { model: any }) {
    await this.firestoreSrv.delete(MODEL_NAME, model.id);
    const index = this.notes.indexOf(model);
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
        collectionName: MODEL_NAME,
        searchText: searchable,
        orderColumn: "updated",
        orderDirection: "desc",
        owner: this.user?.uid,
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

  async localShare({ model, type }: { model: any, type: "link" | "qr" }) {
    const { id, title, description, updated } = model;
    this.shareSrv.share({
      collection: MODEL_NAME,
      path: "/alterego/main",
      id,
      title,
      description,
      updated,
    }, type);
  }

  async openDocument(model: any) {
    this.router.navigate([`alterego/main`], {
      queryParams: { col: MODEL_NAME, id: model.id }
    });
  }
}
