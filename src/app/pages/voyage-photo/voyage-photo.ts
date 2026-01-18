import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { CardDoc } from '@components/card-doc/card-doc';
import { DialogFormComponent, FormDataType } from '@components/dialog-form/dialog-form.component';
import { SearchInputComponent } from '@components/search-input/search-input';
import { MarkType, SimpleMapComponent } from '@components/simple-map/simple-map';
import { MenuOptionType, Statusbar } from '@components/statusbar/statusbar';
import { FileService } from '@services/file.srv';
import { BasicDataType, FirestoreService } from '@services/firestore.service';
import { GoogleAuthService } from '@services/google-auth.service';
import { IndicatorService } from '@services/indicator.service';
import { LocationService } from '@services/location.service';

export interface NoteDataType extends BasicDataType {

};

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
  ],
  templateUrl: './voyage-photo.html',
  styleUrl: './voyage-photo.scss',
})
export class VoyagePhoto extends AuthenticatedComponent implements OnInit {
  @ViewChild("simple_map") simpleMap!: SimpleMapComponent;
  menuOptions: MenuOptionType[] = [];
  notes: NoteDataType[] = [];
  createUpdateFun!: Function;
  deleteNoteFun!: Function;

  constructor(
    private indicatorSrv: IndicatorService,
    public override authSrv: GoogleAuthService,
    private http: HttpClient,
    private fileSrv: FileService,
    private firestoreSrv: FirestoreService,
    public override cdr: ChangeDetectorRef,
    public locationSrv: LocationService,
    private dialog: MatDialog,
    public override sanitizer: DomSanitizer,
  ) {
    super(sanitizer, authSrv, cdr);

    this.createUpdateFun = this.openDialog.bind(this);
    this.deleteNoteFun = this.deleteNote.bind(this);

    this.menuOptions.push({
      label: "Tomar foto",
      icon: "photo_camera",
      callback: this.capturePhoto.bind(this),
    });

    this.menuOptions.push({
      label: "Tomar ubicación",
      icon: "add_location",
      callback: this.addMark.bind(this),
    });

    this.menuOptions.push({
      label: "Open form",
      icon: "add",
      callback: this.openDialog.bind(this),
    });
  }

  ngOnInit(): void {
    this.pageNotes();
  }

  async transformMark(data: MarkType) {
    return `<b class="white_subtitle" style="font-size: 2em;">📍</b>`;
  }

  async addMark() {
    const activity = this.indicatorSrv.start();
    try {
      const pos = await this.locationSrv.getCurrentPosition();
      const marker: MarkType = {
        id: "",
        lat: pos.latitude,
        lon: pos.longitude,
        title: new Date().toDateString(),
      };
      const observable = await this.simpleMap.addMarker(marker);
      observable.subscribe((mark) => {
        console.log(mark);
      });
    } catch (err) { }
    activity.done();
  }

  async capturePhoto() {
    const blob = await this.fileSrv.openCamera();
    if (!blob) {
      return;
    }
    try {
      const response = await this.fileSrv.upload("prueba/archivo.jpg", blob, "bucket");
    } catch (err) { }
  }

  async openDialog(oldModel: any) {
    const formConfig: FormDataType = {
      title: "Crear / actualizar",
      autoAuthor: true,
      modelName: "note",
      fields: [
        { label: "Título", type: "text", key: "title", required: true },
        { label: "Descripción", type: "contenteditable", key: "description" },
        { label: "Habilitado", type: "toggle", key: "enabled" },
        { label: "Calificación", type: "rating", key: "rate" },
        
        
      ],
      model: {
        title: 'Título...',
        description: 'Descripción...',
      }
    };
    if (oldModel) {
      formConfig.model = oldModel;
    }
    const dialogRef = this.dialog.open(DialogFormComponent, {
      width: '400px',
      panelClass: 'custom-emoji-picker',
      autoFocus: !this.isMobile(),
      data: formConfig,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (!oldModel) {
          // Creation
          this.pageNotes(true);
        } else {
          // Update
          // mix objects
          Object.assign(oldModel, result);
          this.cdr.detectChanges();
        }
      }
    });
  }

  async deleteNote(item: any) {
    await this.firestoreSrv.delete("note", item.id);
    // If all is ok, just remove from the list
    const index = this.notes.indexOf(item);
    if (index >= 0) {
      this.notes.splice(index, 1);
      this.cdr.detectChanges();
    }
  }

  async pageNotes(startover: boolean = false) {
    if (startover && this.notes.length > 0) {
      this.notes.splice(0, this.notes.length);
    }
    const page = (await this.firestoreSrv.paging("pro-note"));
    this.notes.push(...(page as NoteDataType[]));
    this.cdr.detectChanges();
  }
}
