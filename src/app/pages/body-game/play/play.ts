import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer } from '@angular/platform-browser';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { StatusBarConfigType } from '@mytypes/StatusBar';
import { AuthService } from '@services/auth.service';
import { FullscreenService } from '@services/fullscreen.service';
import { BodyTracker } from './components/body-tracker/body-tracker';
import { UINotificationSrv } from '@services/uinotifications.service';
import { MatDialog } from '@angular/material/dialog';
import { SharedWith } from 'app/pages/admin/users/shared-with/shared-with';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { FirestoreService } from '@services/firestore.service';
import { SideMenuService } from '@services/side-menu.service';
import { Router } from '@angular/router';
import { P2PService, P2PStatus } from '@services/p2p.service';
import { Subscription } from 'rxjs';
import { ComponentP2P } from '@avatar/ComponentP2P';
import { ModuloSonido } from '@services/sonido.service';
import { ConfigService } from '@services/config.service';
import { ConfigurableGame } from 'src/app/avatar/ConfigurableGame';
import { AvatarStoredDataType, WorldAvatar } from 'src/types/WorldAvatar';
import { getBucketPath } from 'src/app/tools/BucketPaths';
import { FileService } from 'src/app/services/file.srv';

const MODEL_NAME_PARENT = "room-public";

@Component({
  selector: 'app-play',
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    SideMenu,
    BodyTracker,
  ],
  templateUrl: './play.html',
  styleUrl: './play.scss',
})
export class PlayComponent extends ConfigurableGame implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild("tracker_component") trackerComponent!: ComponentP2P;
  statusBarConfig: StatusBarConfigType = {
    hamburgerHighlight: true,
  };
  room: AvatarStoredDataType | null = null;
  status: P2PStatus = { value: "offline" };
  p2pStatusSubscription: Subscription | null = null;

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public override authSrv: AuthService,
    public override cdr: ChangeDetectorRef,
    //
    public override dialog: MatDialog,
    public override configSrv: ConfigService,
    public override fileSrv: FileService,
    public override firestoreSrv: FirestoreService,
    //
    private uiNotificationSrv: UINotificationSrv,
    public sideMenuSrv: SideMenuService,
    private router: Router,
    public p2pSrv: P2PService,

  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr, dialog, configSrv, fileSrv, firestoreSrv);

    this.p2pStatusSubscription = this.p2pSrv.status.subscribe((ev) => {
      this.status = ev;
      const found = this.menuOptions.find(a => a.name == "end_call");
      if (found) {
        found.visible = ev.value == "online";
      }
      this.cdr.detectChanges();
    });

    this.menuOptions.push({
      label: "menu.end_call",
      translateFolder: "avatar",
      name: "end_call",
      isPlainIcon: true,
      icon: "🚪",
      visible: false,
      children: [],
      callback: () => {
        this.p2pSrv.disconnectFromRoom();
        ModuloSonido.play("/assets/sounds/hangdown.mp3");
      },
    });

    this.menuOptions.push({
      label: "menu.scenarios",
      translateFolder: "avatar",
      name: "scenarios",
      icon: "remove",
      children: [],
    });

    this.menuOptions.push({
      label: "menu.config",
      translateFolder: "avatar",
      name: "config",
      icon: "remove",
      children: [
        {
          label: "menu.camera",
          translateFolder: "avatar",
          name: "camera",
          isPlainIcon: true,
          icon: "🎥",
          visible: true,
          children: [],
          callback: () => {
            this.emitToc();
            this.openCameraPicker();
          },
        },
        {
          label: "menu.editWorld",
          translateFolder: "avatar",
          name: "editWorld",
          isPlainIcon: true,
          icon: "✏️",
          visible: true,
          children: [],
          callback: async () => {
            this.emitToc();
            const response = await this.trackerComponent.editMode();
            if (response) {
              await this.saveAndApplyMode(response);
            }
          },
        },
        {
          label: "menu.editScenario",
          translateFolder: "avatar",
          name: "editScenario",
          isPlainIcon: true,
          icon: "📑",
          visible: true,
          children: [],
          callback: async () => {
            this.emitToc();
            const response = await this.trackerComponent.editScenario();
            if (response) {
              await this.saveAndApplyScenario(response);
            }
          },
        },
        {
          label: "menu.editAvatar",
          translateFolder: "avatar",
          name: "editAvatar",
          isPlainIcon: true,
          icon: "🎭",
          visible: true,
          children: [],
          callback: async () => {
            this.emitToc();
            const response = await this.trackerComponent.editAvatar();
            if (response) {
              await this.saveAndApplyAvatar(response);
            }
          },
        },
        {
          label: "menu.friends",
          translateFolder: "avatar",
          name: "loged_permissions",
          isPlainIcon: true,
          icon: "👫",
          visible: false,
          children: [],
          callback: () => {
            this.emitToc();
            this.openPermissions();
          },
        },
      ]
    });

    this.menuOptions.push({
      label: "menu.back_rooms",
      translateFolder: "avatar",
      icon: "arrow_back",
      children: [],
      callback: () => {
        this.router.navigate([`action/rooms`], {
          queryParams: {}
        });
      },
    });

    this.sideMenuSrv.getState().subscribe(() => {
      setTimeout(() => {
        this.trackerComponent.onResize();
      }, 500);
    });
  }

  getFirestoremodelName(): string {
    return MODEL_NAME_PARENT;
  }

  override getTrackerComponent(): ComponentP2P {
    return this.trackerComponent;
  }

  updateLogedMenuOptions() {
    const visible = !!this.user;
    this.menuOptions
      .find(a => a.name && ['config']
        .indexOf(a.name) >= 0)?.children?.filter(a => a.name && a.name.startsWith("loged_"))
      .forEach((e) => {
        e.visible = visible && !!this.room;
      });;
  }

  async ngAfterViewInit(): Promise<void> {
    this.updateCurrentLang();
    this.authSrv.authState$.subscribe(async (user) => {
      try {
        this.updateLogedMenuOptions();
      } catch (err: any) {
        this.uiNotificationSrv.show(err.message);
      } finally {
        this.trackerComponent.setUser(null);
      }
    });
    await this.loadCollection();
    this.updateLogedMenuOptions();
  }

  async openPermissions() {
    if (!this.room) {
      return;
    }
    const dialogRef = this.dialog.open(SharedWith, {
      width: '800px',
      panelClass: 'custom-emoji-picker',
      autoFocus: !this.isMobile(),
      data: {
        id: this.room.id,
        collection: MODEL_NAME_PARENT,
        mode: "normal",
      },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      //console.log(result);
    });
  }

  async ngOnInit(): Promise<void> {

  }

  async loadCollection() {
    const params = getUrlQueryParams();
    const col = params.get("col");
    const id = params.get("id");
    if (col && id) {
      const temp = await this.firestoreSrv.readById(col, id);
      if (temp) {
        this.room = temp as AvatarStoredDataType;
        document.title = this.room.title;
        this.localLoadWorld(this.room);
      } else {
        this.room = null;
      }
      this.trackerComponent.setRoomData(this.room);
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    if (this.p2pStatusSubscription) {
      this.p2pStatusSubscription.unsubscribe();
    }
  }

  async getRoom(): Promise<AvatarStoredDataType | null> {
    return this.room;
  }
}
