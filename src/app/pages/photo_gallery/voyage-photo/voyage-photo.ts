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
import { Fullscreen } from '@components/fullscreen/fullscreen';
import { PhotoGallery } from '@components/photo-gallery/photo-gallery';
import { SearchInputComponent } from '@components/search-input/search-input';
import { SideMenu } from '@components/side-menu/side-menu';
import { MarkType, SimpleMapComponent } from '@components/simple-map/simple-map';
import { Statusbar } from '@components/statusbar/statusbar';
import { AuthService } from '@services/auth.service';
import { FileService } from '@services/file.srv';
import { BasicDataType, FirestoreService } from '@services/firestore.service';
import { FullscreenService } from '@services/fullscreen.service';
import { IndicatorService } from '@services/indicator.service';
import { LocationService } from '@services/location.service';
import { ShareSrv } from '@services/share.service';
import { getBucketPath, getSquarePath } from '@tools/BucketPaths';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { Unsubscribe } from 'firebase/firestore';
import { Subscription } from 'rxjs';
import { ImageGalleryType } from 'types/fieldsTypes';
import { MenuOptionType } from 'types/StatusBar';

export interface PhotoGPSDataType extends BasicDataType {
  lat: number;
  lon: number
};

const MODEL_NAME = "photogps";

@Component({
  selector: 'app-voyage-photo',
  standalone: true,
  imports: [
    CommonModule,
    SimpleMapComponent,
    MatButtonModule,
    Statusbar,
    SearchInputComponent,
    CardDoc,
    SideMenu,
    Fullscreen,
    PhotoGallery,
  ],
  templateUrl: './voyage-photo.html',
  styleUrl: './voyage-photo.scss',
})
export class VoyagePhoto extends AuthenticatedComponent implements OnInit {
  @ViewChild("simple_map") simpleMap!: SimpleMapComponent;
  @ViewChild("local_gallery") localGallery!: PhotoGallery;
  menuOptions: MenuOptionType[] = [];
  notes: PhotoGPSDataType[] = [];
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
  gallery: ImageGalleryType[] = [];

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
      label: "Regresar a álbumes",
      icon: "arrow_back",
      children: [],
      callback: () => {
        this.router.navigate([`photo_gallery/all`], {
          queryParams: {}
        });
      },
    });
  }

  getAlbumTitle(): string {
    if (!this.collection) {
      return "Álbum";
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

  async transformMark(data: MarkType) {
    if (data.id == "fake") {
      return `<b class="white_subtitle" style="font-size: 2em;">⭐</b>`;
    } else {
      return `<b class="white_subtitle" style="font-size: 2em;">📍</b>`;
    }
  }

  async capturePhoto() {
    if (!this.authSrv.isLoggedIn()) {
      this.authSrv.login();
      return;
    }
    const posPromise = this.locationSrv.getCurrentPosition();
    const blobPromise = this.fileSrv.openCamera();

    const promises: Promise<any>[] = [];
    promises.push(posPromise);
    promises.push(blobPromise);

    const blob = await blobPromise;

    if (!blob) {
      return;
    }
    let activity = this.indicatorSrv.start();
    try {
      const template = "photo_gallery/${user.uid}/${collection.id}/${date.year}-${date.month}-${date.day}/${random}.jpg";
      const nextPath = getBucketPath(template, "", {
        collection: this.collection,
        user: AuthService.userStatic,
      }, false);
      const limitedBlob = await this.fileSrv.resizeImageBlob(
        blob,
        1024,
        1024,
        'image/jpeg',
        0.9
      );
      const squaredBlob = await this.fileSrv.squareImageCover(
        blob,
        512,
        'image/jpeg',
        0.9
      );
      const pos = await posPromise;
      const model: any = {
        title: this.epochTo(Date.now()),
        image: nextPath,
        lat: pos.latitude,
        lon: pos.longitude,
      };
      const promesas: Promise<any>[] = [];
      promesas.push(this.fileSrv.upload(model.image, limitedBlob, "bucket"));
      promesas.push(this.fileSrv.upload(getSquarePath(nextPath), squaredBlob, "bucket"));
      await Promise.all(promesas);

      // Ask save
      await this.firestoreSrv.createUpdate(this.getCollectionName(), model, {
        autoAuthor: true,
        searchFields: ["title"],
      });
      this.pageNotes(true);
    } catch (err) {
      console.log(err);
    } finally {
      activity.done();
    }
  }

  getCollectionName() {
    const params = getUrlQueryParams();
    const id = params.get("id");
    if (!id) {
      throw new Error("Missed parent");
    }
    return `photocollection/${id}/${MODEL_NAME}`;
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

  async pageNotesNoRealtime() {
    if (this.liveMode) {
      this.unsubscribeLiveUpdates();
      this.liveMode = false;
    }
    await this.pageNotes(false);
    this.recomputeAllMarkers();
    this.cdr.detectChanges();
  }

  async pageNotes(startover: boolean = false) {
    if (startover && this.notes.length > 0) {
      this.notes.splice(0, this.notes.length);
    }
    const searchable: string | undefined = this.searchable == "" ? undefined : this.searchable;
    const page = (await this.firestoreSrv.paging({
      collectionName: this.getCollectionName(),
      searchText: searchable,
      lastDoc: this.notes[this.notes.length - 1],
    }));
    this.notes.push(...(page as PhotoGPSDataType[]));
    this.cdr.detectChanges();
  }

  unsubscribeLiveUpdates() {
    if (this.liveSubscription != null) {
      this.liveSubscription();
    }
  }

  setRefreshMethod(live: boolean) {
    this.liveMode = live;
    this.unsubscribeLiveUpdates();
    if (live) {
      this.liveSubscription = this.firestoreSrv.livePaging(this.getCollectionName(), (page: any) => {
        this.notes.splice(0, this.notes.length);
        this.notes.push(...(page as PhotoGPSDataType[]));
        this.recomputeAllMarkers();
        this.cdr.detectChanges();
      });
    } else {
      this.pageNotes(true);
    }
  }

  async search(text: string) {
    this.searchable = text;
    this.pageNotes(true);
  }

  async localShare({ model, type }: { model: any, type: "link" | "qr" }) {
    const { id, title, description, updated } = model;
    this.shareSrv.share({
      collection: this.getCollectionName(),
      path: "/photo_gallery/single",
      id,
      title,
      description,
      updated,
    }, type);
  }

  async addSingleMarker(model: PhotoGPSDataType) {
    const marker: MarkType = {
      id: model.id,
      lat: model.lat,
      lon: model.lon,
      title: model.title,
    };
    const observable = await this.simpleMap.addMarker(marker);
    this.markerSubscriptions.push(observable.subscribe((mark) => {
      const note = this.notes.filter(note => note.id == mark.id)[0]
      console.log(note);
    }));
  }

  recomputeAllMarkers() {
    if (!this.simpleMap) {
      return;
    }
    this.simpleMap.clearOverlays();
    this.markerSubscriptions.forEach((subs) => {
      subs.unsubscribe();
    })
    for (let i = 0; i < this.notes.length; i++) {
      const note: any = this.notes[i];
      this.addSingleMarker(note);
    }
  }

  async cardEvents($event: any) {
    const { action, model } = $event;
    if (action == "location_on") {
      this.simpleMap.center(model.lat, model.lon);
      // add a fake marker at this position
      const FAKE_ID = "fake";
      this.simpleMap.removeMarkById(FAKE_ID);
      this.addSingleMarker({
        id: FAKE_ID,
        lat: model.lat,
        lon: model.lon,
        title: "",
        description: "",
        author: "",
        author_name: "",
        author_picture: "",
        created: 0,
        updated: 0,
      });
    }
  }

  openGallery(event: PhotoGPSDataType) {
    this.gallery.splice(0, this.gallery.length - 1);
    this.notes.forEach((item) => {
      const element: any = {
        id: item.id,
        image: (item as any).image,
        description: item.description,
      };
      this.gallery.push(element);
    });
    this.localGallery.show();
    this.localGallery.gotToId(event.id);
  }
}
