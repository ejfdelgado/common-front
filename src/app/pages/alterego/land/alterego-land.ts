import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { EditableInput } from '@components/fields/editable-input/editable-input';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { AuthService } from '@services/auth.service';
import { FileService } from '@services/file.srv';
import { BasicDataType, FirestoreService } from '@services/firestore.service';
import { FullscreenService } from '@services/fullscreen.service';
import { IndicatorService } from '@services/indicator.service';
import { LocationService } from '@services/location.service';
import { ShareSrv } from '@services/share.service';
import { getBucketPath, getJSONUrl } from '@tools/BucketPaths';
import { epochTo } from '@tools/DateUtils';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { SharedWith } from 'app/pages/admin/users/shared-with/shared-with';
import { Unsubscribe } from 'firebase/firestore';
import { MenuOptionType } from 'types/StatusBar';

const MODEL_NAME = "client";

// The json bucket
export interface ClientDataType {
  profile: {
    user?: {
      name?: string;
      business?: string;
    },
    frustraciones?: string,
    alegrias?: string,
    medio?: string,
    habito?: string,
  },
  golden: {
    why?: string;
    how?: string;
    what?: string;
  }
};

@Component({
  selector: 'app-alterego-land',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    SideMenu,
    EditableInput,
    FormsModule,
  ],
  templateUrl: './alterego-land.html',
  styleUrls: [
    './alterego-land.scss',
  ],
})
export class AlteregoLandComponent extends AuthenticatedComponent implements OnInit {
  menuOptions: MenuOptionType[] = [];
  collection: BasicDataType | null = null;

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
      label: "OPCIONES",
      children: [
        {
          label: "Administrar asistentes",
          icon: "design_services",
          callback: () => {
            this.router.navigate([`alterego/index`], {
              queryParams: {}
            });
          },
        },
      ],
    });

    this.menuOptions.push({
      label: "Perfil de clientes",
      icon: "face_up",
      children: [],
      callback: () => {
        this.router.navigate([`clients/index`], {
          queryParams: {}
        });
      },
    });

  }

  getTitle(): string {
    if (!this.collection) {
      return "Crea asistentes virtuales";
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
}
