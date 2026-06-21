import { CommonModule } from '@angular/common';
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
import { RoomGameType } from '@mytypes/ActionGameTypes';
import { MenuOptionType } from '@mytypes/StatusBar';
import { AuthService } from '@services/auth.service';
import { FirestoreService, PageDataType } from '@services/firestore.service';
import { FullscreenService } from '@services/fullscreen.service';
import { IndicatorService } from '@services/indicator.service';
import { ShareSrv } from '@services/share.service';
import { Subscription } from 'rxjs';

const MODEL_NAME = "room-private";

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    CardDoc,
    SideMenu
  ],
  templateUrl: './rooms.html',
  styleUrl: './rooms.scss',
})
export class RoomsComponent extends AuthenticatedComponent implements OnInit, OnDestroy {

  menuOptions: MenuOptionType[] = [];
  rooms: RoomGameType[] = [];
  authSubscription: Subscription | null = null;
  cardConfig: CardDocDataType = {
    shareLink: true,
    shareQR: true,
    hasImage: false,
    showAuthorImg: true,
  };

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public override authSrv: AuthService,
    public override cdr: ChangeDetectorRef,
    //
    private dialog: MatDialog,
    private firestoreSrv: FirestoreService,
    private indicatorSrv: IndicatorService,
    public shareSrv: ShareSrv,
    private router: Router,
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);

    this.menuOptions.push({
      label: "Add room",
      icon: "add",
      children: [],
      callback: this.openDialog.bind(this),
    });

    this.authSubscription = this.authSrv.authState$.subscribe((user) => {
      if (!user) {
        this.rooms = [];
        try {
          this.cdr.detectChanges();
        } catch (err) { }
      } else {
        this.pageRooms(true);
      }
    });
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
          label: "Description", type: "contenteditable", key: "description",
          contenteditable: { minHeight: "10em", maxHeight: "20em" }
        },
        {
          label: "QR Emoji", type: "contenteditable", key: "emoji",
          contenteditable: { minHeight: "20px", maxHeight: "20px" }
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

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.pageRooms(true);
      }
    });
  }

  async deleteRoom({ model }: { model: any }) {
    await this.firestoreSrv.delete(MODEL_NAME, model.id);
    const index = this.rooms.indexOf(model);
    if (index >= 0) {
      this.rooms.splice(index, 1);
      this.cdr.detectChanges();
    }
  }

  async pageRooms(startover: boolean = false) {
    const indicator = this.indicatorSrv.start();
    try {
      if (startover && this.rooms.length > 0) {
        this.rooms.splice(0, this.rooms.length);
      }
      const pagingOptions: PageDataType = {
        collectionName: MODEL_NAME,
        orderColumn: "updated",
        orderDirection: "desc",
        owner: this.user?.uid,
        top: 20,
      };
      if (!startover) {
        if (this.rooms.length > 0) {
          pagingOptions.lastDoc = this.rooms[this.rooms.length - 1];
        }
      }
      const page = (await this.firestoreSrv.paging(pagingOptions));
      this.rooms.push(...(page as RoomGameType[]));
      this.cdr.detectChanges();
    } catch (err) {

    } finally {
      indicator.done();
    }
  }

  async localShare({ model, type }: { model: any, type: "link" | "qr" }) {
    const { id, title, description, updated, emoji } = model;
    this.shareSrv.share({
      collection: MODEL_NAME,
      path: "/action/play",
      id,
      title,
      description,
      updated,
      emoji,
    }, type);
  }

  ngOnInit(): void {

  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  async openRoom(model: any) {
    this.router.navigate([`action/play`], {
      queryParams: { col: MODEL_NAME, id: model.id }
    });
  }

}
