import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
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


export interface PacaDataType extends BasicDataType {

};

const MODEL_NAME = "paca";

@Component({
  selector: 'app-index-paca',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    SideMenu,
  ],
  templateUrl: './index-paca.html',
  styleUrl: './index-paca.scss',
})
export class IndexPaca extends AuthenticatedComponent implements OnInit, OnDestroy {
  menuOptions: MenuOptionType[] = [];
  pacas: PacaDataType[] = [];
  liveSubscription: Unsubscribe | null = null;
  searchable: string = "";
  authSubscription: Subscription | null = null;
  cardConfig: CardDocDataType = {
    shareLink: true,
    shareQR: true,
    showAuthorImg: true,
    hasImage: false,
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
      label: "Mapa de Pacas",
      icon: "🌎",
      isPlainIcon: true,
      children: [],
      callback: () => {
        //this.openDialog();
      },
    });
    this.menuOptions.push({
      label: "Registrar nueva Paca",
      icon: "➕",
      isPlainIcon: true,
      children: [],
      callback: () => {
        //this.openDialog();
      },
    });
    this.menuOptions.push({
      label: "Ver indicadores ambientales",
      icon: "📊",
      isPlainIcon: true,
      children: [],
      callback: () => {
        //this.openDialog();
      },
    });

    this.authSubscription = this.authSrv.authState$.subscribe((user) => {
      if (!user) {
        this.pacas = [];
        try {
          this.cdr.detectChanges();
        } catch (err) { }
      } else {
        this.pageDocuments(true);
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
      title: model ? "Actualizar" : "Crear",
      autoAuthor: true,
      modelName: MODEL_NAME,
      searchFields: ["title"],
      fields: [
        { label: "Título", type: "text", key: "title", required: true },
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
        this.pageDocuments(true);
      }
    });
  }

  async deleteDocument({ model }: { model: any }) {
    await this.firestoreSrv.delete(MODEL_NAME, model.id);
    const index = this.pacas.indexOf(model);
    if (index >= 0) {
      this.pacas.splice(index, 1);
      this.cdr.detectChanges();
    }
  }

  async pageDocuments(startover: boolean = false) {
    const indicator = this.indicatorSrv.start();
    try {
      if (startover && this.pacas.length > 0) {
        this.pacas.splice(0, this.pacas.length);
      }
      const searchable: string | undefined = this.searchable == "" ? undefined : this.searchable;
      const pagingOptions: PageDataType = {
        collectionName: MODEL_NAME,
        searchText: searchable,
        orderColumn: "updated",
        //author: this.user?.uid,
        orderDirection: "desc",
        top: 20,
      };
      if (!startover) {
        if (this.pacas.length > 0) {
          pagingOptions.lastDoc = this.pacas[this.pacas.length - 1];
        }
      }
      const page = (await this.firestoreSrv.paging(pagingOptions));
      this.pacas.push(...(page as PacaDataType[]));
      this.cdr.detectChanges();
    } catch (err) {

    } finally {
      indicator.done();
    }
  }

  async search(text: string) {
    this.searchable = text;
    this.pageDocuments(true);
  }

  async localShare({ model, type }: { model: any, type: "link" | "qr" }) {
    const { id, title, description, updated } = model;
    this.shareSrv.share({
      collection: MODEL_NAME,
      path: "/pug/detail",
      id,
      title,
      description,
      updated,
    }, type);
  }

  async openDocument(model: any) {
    this.router.navigate([`pug/detail`], {
      queryParams: { col: MODEL_NAME, id: model.id }
    });
  }

  async cardEvents($event: any) {
    const { action, model } = $event;
    if (action == "arrow_outward") {
      this.openDocument(model);
    }
  }
}
