import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, effect, OnDestroy, OnInit, untracked } from '@angular/core';
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
import { TranslatePipe } from 'src/app/pipes/translate.pipe';
import { getAssistanteIframeSrc } from '../../alterego/common';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { ANALYTICS_ID, ASISTANT_ID } from 'src/types/WorldAvatar';
import { ConfigService } from 'src/app/services/config.service';

const MODEL_NAME = 'room-public';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [CommonModule, MatButtonModule, Statusbar, CardDoc, SideMenu, TranslatePipe, AsyncPipe],
  templateUrl: './rooms.html',
  styleUrls: ['./rooms.scss', '../../../../assets/css/chat.scss'],
})
export class RoomsComponent extends AuthenticatedComponent implements OnInit, OnDestroy {
  isAssistantOpened: boolean = false;
  menuOptions: MenuOptionType[] = [];
  rooms: RoomGameType[] = [];
  authSubscriptionLocal: Subscription | null = null;
  cardConfig: CardDocDataType = {
    shareLink: true,
    shareQR: true,
    hasImage: true,
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
    private analyticsSrv: AnalyticsService,
    public configSrv: ConfigService,
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);
    this.analyticsSrv.gtagConfig(ANALYTICS_ID);
    this.menuOptions.push({
      label: 'menu_rooms.add_room.label',
      translateFolder: 'avatar',
      icon: 'add',
      visible: false,
      children: [],
      metaId: 'create',
      callback: this.openDialog.bind(this),
    });

    effect(() => {
      this.authSrv.roles();
      untracked(() => this.adjustPrivileges());
    });

    this.authSubscriptionLocal = this.authSrv.authState$.subscribe((user) => {
      if (!user) {
        this.rooms = [];
        try {
          this.cdr.detectChanges();
        } catch (err) {}
      } else {
        this.pageRooms(true);
      }
    });
  }

  async adjustPrivileges() {
    const createOption = this.menuOptions.find((el) => el.metaId == 'create');
    if (createOption) {
      createOption.visible = this.authSrv.hasARole(['body_game_creator']);
    }
    this.cdr.detectChanges();
  }

  async openDialog(payload: { model: RoomGameType }) {
    let model: any = null;
    let create = true;
    if (payload) {
      model = payload.model;
      create = false;
    }
    if (create) {
      if (!this.authSrv.hasARole(['body_game_creator'])) {
        return;
      }
    }
    const formConfig: FormDataType = {
      title: create ? 'form.room_upsert.create' : 'form.room_upsert.update',
      autoAuthor: true,
      languageFolder: 'avatar',
      modelName: MODEL_NAME,
      searchFields: ['title', 'description'],
      fields: [
        { label: 'form.room_upsert.title.label', type: 'text', key: 'title', required: true },
        {
          label: 'Imagen',
          type: 'image',
          key: 'image',
          image: {
            thumbnailMaxSizePixels: 200,
            squareMaxSizePixels: 800, //For social
            template: 'body_game/${user.uid}/${date.year}-${date.month}-${date.day}/${random}.jpg',
          },
        },
        {
          label: 'form.room_upsert.description.label',
          type: 'contenteditable',
          key: 'description',
          contenteditable: { minHeight: '10em', maxHeight: '20em' },
        },
        {
          label: 'form.room_upsert.emoji_qr.label',
          type: 'emoji',
          key: 'emoji',
          required: true,
        },
      ],
      model: {
        title: '',
        description: '',
      },
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

    dialogRef.afterClosed().subscribe((result: RoomGameType) => {
      if (result) {
        if (create) {
          this.openRoom(result);
        } else {
          this.pageRooms(true);
        }
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
        orderColumn: 'updated',
        orderDirection: 'desc',
        owner: this.user?.uid,
        top: 20,
      };
      if (!startover) {
        if (this.rooms.length > 0) {
          pagingOptions.lastDoc = this.rooms[this.rooms.length - 1];
        }
      }
      const page = await this.firestoreSrv.paging(pagingOptions);
      this.rooms.push(...(page as RoomGameType[]));
      this.cdr.detectChanges();
    } catch (err) {
    } finally {
      indicator.done();
    }
  }

  async localShare({ model, type }: { model: any; type: 'link' | 'qr' }) {
    const { id, title, description, updated, emoji } = model;
    this.shareSrv.share(
      {
        collection: MODEL_NAME,
        path: '/action/play',
        id,
        title,
        description,
        updated,
        emoji,
      },
      type,
    );
  }

  ngOnInit(): void {
    window.addEventListener('message', (event) => {
      if (event.origin !== location.origin) return;
      if (event.data.type === 'close') {
        this.isAssistantOpened = false;
        this.cdr.detectChanges();
      }
    });
  }

  openAssistant() {
    this.isAssistantOpened = true;
  }

  getIframeSrc() {
    const lang = this.configSrv.getCurrentLanguage();
    return getAssistanteIframeSrc(ASISTANT_ID[lang], this.sanitizer);
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.authSubscriptionLocal?.unsubscribe();
  }

  async openRoom(model: any) {
    this.router.navigate([`action/play`], {
      queryParams: { col: MODEL_NAME, id: model.id },
    });
  }
}
