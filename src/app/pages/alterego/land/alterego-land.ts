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
import { FileService } from '@services/file.srv';
import { BasicDataType, FirestoreService } from '@services/firestore.service';
import { FullscreenService } from '@services/fullscreen.service';
import { IndicatorService } from '@services/indicator.service';
import { LocationService } from '@services/location.service';
import { ShareSrv } from '@services/share.service';
import { Base64 } from '@tools/Base64';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { environment } from 'environments/environment';
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
  selector: 'app-alterego-land',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
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
  isAssistantOpened: boolean = false;

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
        {
          label: "Perfil de clientes",
          icon: "face_up",
          children: [],
          callback: () => {
            this.router.navigate([`clients/index`], {
              queryParams: {}
            });
          },
        }
      ],
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
    window.addEventListener('message', (event) => {
      // Always validate origin for security
      if (event.origin !== location.origin) return;

      if (event.data.type === 'close') {
        this.isAssistantOpened = false;
        this.cdr.detectChanges();
      } else if (event.data.type === 'echo_response') {
        console.log(JSON.stringify(event.data));
      }
    });
  }

  getRef() {
    const params = getUrlQueryParams();
    const ref = params.get("ref");
    if (ref) {
      const decoded = JSON.parse(Base64.decode(ref));
      localStorage["ref"] = ref;
      return decoded;
    } else if (localStorage["ref"]) {
      const decoded = JSON.parse(Base64.decode(localStorage["ref"]));
      return decoded;
    }
    return null;
  }

  async loadCollection() {
    const decoded = this.getRef();
    if (decoded) {
      if (decoded.email) {
        const loaded = await firstValueFrom(this.http.post<ApiResponse>(`${environment.apiUrl}public/clients`, { email: decoded.email }));
        if (loaded.success) {
          this.collection = loaded.data[0];
          this.cdr.detectChanges();
          // company, email, person
        }
      }
    }
  }

  getGreating() {
    if (this.collection) {
      const { person } = this.collection as any;
      return `Hola ${person}!`;
    } else {
      return "Hola!";
    }
  }

  getCompany() {
    if (this.collection) {
      const { company } = this.collection as any;
      return `${company}!`;
    } else {
      return "";
    }
  }

  getCollectionName() {
    return MODEL_NAME;
  }

  openAssistant() {
    this.isAssistantOpened = true;
  }

  getIframeSrc() {
    const ref = this.getRef();
    let host = `${location.origin}/#/alterego/use?col=pubknowledge`;
    let base = `${host}&id=7es1sDvA8he2HeUFPwOJ&origin=${encodeURIComponent(location.origin)}`;
    if (ref) {
      base = `${base}&mode=embedded&ref=${ref}`;
    } else {
      base = `${base}&mode=embedded`;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(base);
  }

  sendEchoToIframe() {
    const iframe = document.querySelector('iframe');
    iframe?.contentWindow?.postMessage(
      { type: 'echo', payload: JSON.stringify('hello') },
      location.origin,//https://chat.pais.tv
    );
  }
}
