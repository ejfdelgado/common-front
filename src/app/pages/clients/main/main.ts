import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { EditableInput } from '@components/fields/editable-input/editable-input';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { ApiResponse } from '@mytypes/file';
import { AuthService } from '@services/auth.service';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { FileService } from '@services/file.srv';
import { BasicDataType, FirestoreService } from '@services/firestore.service';
import { FullscreenService } from '@services/fullscreen.service';
import { IndicatorService } from '@services/indicator.service';
import { LocationService } from '@services/location.service';
import { ShareSrv } from '@services/share.service';
import { UINotificationSrv } from '@services/uinotifications.service';
import { getBucketPath, getJSONUrl } from '@tools/BucketPaths';
import { epochTo } from '@tools/DateUtils';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { SharedWith } from 'app/pages/admin/users/shared-with/shared-with';
import { environment } from 'environments/environment';
import { Unsubscribe } from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';
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
  selector: 'app-client-main',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    Statusbar,
    SideMenu,
    EditableInput,
    FormsModule,
  ],
  templateUrl: './main.html',
  styleUrls: [
    './main.scss',
  ],
})
export class ClientMainComponent extends AuthenticatedComponent implements OnInit {
  menuOptions: MenuOptionType[] = [];
  liveSubscription: Unsubscribe | null = null;
  liveMode: boolean = true;
  searchable: string = "";
  collection: BasicDataType | null = null;
  cardActions: string[] = [];
  currentUrl: string = "";
  content: ClientDataType = {
    profile: {
      alegrias: "",
      frustraciones: "",
      habito: "",
      medio: "",
    },
    golden: {
      why: "",
      how: "",
      what: "",
    }
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
    public confirmSrv: ConfirmDialogService,
    private notifSrv: UINotificationSrv,
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
      ],
    });

    this.menuOptions.push({
      label: "Permissions",
      icon: "lock",
      children: [],
      callback: () => {
        this.openPermissions();
      },
    });

    this.menuOptions.push({
      label: "Back to databases",
      icon: "arrow_back",
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
        const title = this.collection.title + " - " + epochTo(this.collection.updated);
        document.title = title;
        await this.readJSONFile();
      } else {
        this.collection = null;
      }
      this.cdr.detectChanges();
    }
  }

  getCollectionName() {
    return MODEL_NAME;
  }

  async openPermissions() {
    if (!this.collection) {
      return;
    }
    const dialogRef = this.dialog.open(SharedWith, {
      width: '800px',
      panelClass: 'custom-emoji-picker',
      autoFocus: !this.isMobile(),
      data: {
        id: this.collection.id,
        collection: MODEL_NAME,
        mode: "normal",
      },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      //console.log(result);
    });
  }

  async readJSONFile() {
    try {
      if (!this.collection) {
        return;
      }
      const id = this.collection.id;
      const collection = await this.firestoreSrv.readById(MODEL_NAME, id);
      if (collection) {
        this.currentUrl = (collection as any).url;
        if (this.currentUrl) {
          const temp = await this.fileSrv.getJSON(getJSONUrl(this.currentUrl));
          this.content = Object.assign({
            profile: {
              alegrias: "",
              frustraciones: "",
              habito: "",
              medio: "",
              user: {
                name: "",
                business: "",
              }
            },
            golden: {
              how: "",
              what: "",
              why: "",
            }
          } as ClientDataType, temp);
          this.cdr.detectChanges();
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  async save() {
    if (!this.collection) {
      return;
    }
    const model = {
      id: this.collection.id,
      url: this.currentUrl,
    };
    // Generate next url
    const template = "clients/${user.uid}/${collection.id}/${date.year}-${date.month}-${date.day}/${random}.jpg";
    this.currentUrl = getBucketPath(template, this.currentUrl, {
      collection: this.collection,
      user: AuthService.userStatic,
    }, true);
    await this.fileSrv.uploadJsonFile(this.currentUrl, this.content);
    model.url = this.currentUrl;
    await this.firestoreSrv.createUpdate(MODEL_NAME, model);
  }

  async sendOnBoardingEmail() {
    const { email, person, company } = this.collection as any;
    const confirm = await this.confirmSrv.confirm({
      title: "Sure?",
      message: `Email will be sent to ${person} ${email} of ${company}`,
    });
    if (!confirm) {
      return;
    }
    const payload = { email };
    const response = await firstValueFrom(this.http.post<ApiResponse>(`${environment.apiUrl}srv/email/invite`, payload));
    if (response.success) {
      this.notifSrv.show("Email sent");
    } else {
      this.notifSrv.show(response.message);
    }
  }
}
