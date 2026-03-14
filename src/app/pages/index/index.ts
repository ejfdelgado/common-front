import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { IndicatorService } from "@services/indicator.service";
import { CameraCaptureComponent } from '@components/camera-capture/camera-capture';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { FileService, StorageType } from '@services/file.srv';
import { FirestoreService } from '@services/firestore.service';
import { LocationService } from '@services/location.service';
import { AuthService } from '@services/auth.service';
import { FormSimpleWithout } from '@components/form-simple/form-simple-without';
import { FlatJsonDataType } from '@components/form-simple/form-simple';
import { AllFieldsDataType } from 'types/fieldsTypes';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MyTemplate } from "ejfdelgado-common-ts";
import { JsonEditorComponent } from '@components/json-editor/json-editor.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-index',
  standalone: true,
  imports: [
    CommonModule,
    CameraCaptureComponent,
    FormSimpleWithout,
    JsonEditorComponent,
    FormsModule,
  ],
  templateUrl: './index.html',
  styleUrl: './index.scss',
})
export class Index implements AfterViewInit {

  @ViewChild("camera_capture_bucket") cameraBucket!: CameraCaptureComponent;
  @ViewChild("camera_capture_harddrive") cameraHarddrive!: CameraCaptureComponent;

  openCamera$ = new Subject<void>();
  html: SafeHtml = "";

  config = {
    name: "demo",
    enabled: true,
    settings: {
      retries: 3
    },
    list: [
      {name: "Edgar"}
    ]
  };

  firestoreTemporal: any = { count: 0 };
  pageList: any[] = [];
  fields: AllFieldsDataType[] = [
    { label: "Título", type: "text", key: "title", required: true },
    { label: "Numero", type: "number", key: "age", required: true },
    {
      label: "Color", type: "select", key: "color", required: true, select: {
        options: [
          { txt: "Rojo", val: "red" },
          { txt: "Amarillo", val: "yellow" },
        ]
      }
    },
    /*
    { label: "Descripción", type: "md", key: "document", md: { maxHeight: "30em", minHeight: "3em" } },
    { label: "Descripción", type: "contenteditable", key: "description" },
    {
      label: "", type: "image-gallery", key: "gallery", required: true, gallery: {
        template: "voyage_note/${user.uid}/${date.year}-${date.month}-${date.day}/${random}.jpg",
      }
    },
    { label: "Título", type: "text", key: "title", required: true },
    {
      label: "Imagen", type: "image", key: "image", image: {
        template: "voyage_note/${user.uid}/${date.year}-${date.month}-${date.day}/${random}.jpg",
      }
    },
    { label: "Descripción", type: "contenteditable", key: "description" },
    { label: "Habilitado", type: "toggle", key: "enabled" },
    { label: "Calificación", type: "rating", key: "rate" },
    { label: "Teléfono", type: "phone", key: "phone", required: false },
    { label: "Categorías", type: "chip", key: "cathegory", required: false, chip: { stringOptions: ["Manzana", "Pera"] } },
    */
  ];
  model: FlatJsonDataType = {
    "gallery": []
  };

  constructor(
    private indicatorSrv: IndicatorService,
    public authSrv: AuthService,
    private http: HttpClient,
    private fileSrv: FileService,
    private firestoreSrv: FirestoreService,
    public cdr: ChangeDetectorRef,
    public locationSrv: LocationService,
    public sanitizer: DomSanitizer,
  ) {
    this.authSrv.authState$.subscribe(user => {
      if (user) {
        console.log('Logged in:', user.displayName);
      } else {
        console.log('Logged out');
      }
    });
  }

  ngAfterViewInit(): void {
    this.cameraBucket.getResult$().subscribe({
      next: async (blob) => {
        try {
          const response = await this.fileSrv.upload("prueba/archivo.jpg", blob, "bucket");
        } catch (err) { }
      },
      error: (err) => console.error('Camera error', err),
      complete: () => console.log('Camera closed')
    });
    this.cameraHarddrive.getResult$().subscribe({
      next: async (blob) => {
        try {
          const response = await this.fileSrv.upload("prueba/archivo.jpg", blob, "hard_drive");
        } catch (err) { }
      },
      error: (err) => console.error('Camera error', err),
      complete: () => console.log('Camera closed')
    });
  }

  callPublic() {
    this.http.get(`${environment.apiUrl}public/health`).subscribe((res) => {
      console.log(res);
    });
  }

  callPrivate() {
    this.http.get(`${environment.apiUrl}check_user`).subscribe((res) => {
      console.log(res);
    });
  }

  async deleteFile(type: StorageType) {
    await this.fileSrv.delete("prueba/archivo.jpg", type);
  }

  async openFile(type: StorageType) {
    await this.fileSrv.open("prueba/archivo.jpg", type);
  }

  async firestoreCreateUpdate() {
    const data = {
      id: "dog",
      name: "Laica",
      created: Date.now(),
    };
    const conf: any = {
      autoAuthor: true,
    };
    await this.firestoreSrv.createUpdate("animals", data, conf);
  }

  async firestoreCreateUpdate2() {
    const conf: any = {
      autoAuthor: true,
    };
    const response = await this.firestoreSrv.createUpdate("animals", this.firestoreTemporal, conf);
    this.firestoreTemporal.id = response.id;
    this.firestoreTemporal.count += 1;
  }

  async firestorePaginate() {
    this.pageList = await this.firestoreSrv.paging({
      collectionName: "animals",
    });
    this.cdr.detectChanges();
  }

  async login() {
    this.authSrv.loginWithGoogle();
  }

  async logout() {
    this.authSrv.logout();
  }

  async loadTemplate() {
    const contenido = await this.fileSrv.getText("/assets/templates/emails/chat_history_orig.html");

    const renderer = new MyTemplate();
    const text = renderer.render(
      contenido,//template
      {
        tool: {
          "args": [
            {
              "type": "STRING",
              "desc": "",
              "name": "User contact info",
              "val": "edgar@gmail.com",
            }
          ],
          "to": "edgar.jose.fernando.delgado@gmail.com",
          "name": "Notify user contact information",
        },
        history: [
          {
            "role": "user",
            "parts": [
              {
                "text": "Do you provide immigration services?"
              }
            ]
          },
          {
            "role": "model",
            "parts": [
              {
                "text": "The response"
              }
            ]
          },
        ]
      }
    );

    this.html = this.sanitizer.bypassSecurityTrustHtml(text);
    this.cdr.detectChanges();
  }
}
