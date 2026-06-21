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
import { AuthenticatedComponent } from '@components/authenticated.component';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { MenuOptionType, StatusBarConfigType } from '@mytypes/StatusBar';
import { AuthService } from '@services/auth.service';
import { FullscreenService } from '@services/fullscreen.service';
import { BodyTracker } from './components/body-tracker/body-tracker';
import { RoomGameType } from '@mytypes/ActionGameTypes';
import { UINotificationSrv } from '@services/uinotifications.service';
import { MatDialog } from '@angular/material/dialog';
import { SharedWith } from 'app/pages/admin/users/shared-with/shared-with';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { FirestoreService } from '@services/firestore.service';
import { AssistantDataType } from '@mytypes/ragTypes';
import { SideMenuService } from '@services/side-menu.service';
import { Router } from '@angular/router';
import { P2PService, P2PStatus } from '@services/p2p.service';
import { Subscription } from 'rxjs';
import { ComponentP2P } from '@avatar/ComponentP2P';
import { ModuloSonido } from '@services/sonido.service';
import { CameraPickerDialogComponent } from '@components/fields/camera-picker/camera-picker-dialog';
import { CameraDataType } from '@mytypes/CameraTypes';
import { ConfigService } from '@services/config.service';

const MODEL_NAME_PARENT = "room-private";

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
export class PlayComponent extends AuthenticatedComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild("tracker_component") trackerComponent!: ComponentP2P;
  statusBarConfig: StatusBarConfigType = {
    hamburgerHighlight: true,
  };
  menuOptions: MenuOptionType[] = [];
  room: RoomGameType | null = null;
  status: P2PStatus = { value: "offline" };
  p2pStatusSubscription: Subscription | null = null;

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public override authSrv: AuthService,
    public override cdr: ChangeDetectorRef,
    //
    private uiNotificationSrv: UINotificationSrv,
    private dialog: MatDialog,
    private firestoreSrv: FirestoreService,
    public sideMenuSrv: SideMenuService,
    private router: Router,
    public p2pSrv: P2PService,
    public configSrv: ConfigService,
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);

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
      label: "menu.voice_lang",
      translateFolder: "avatar",
      name: "langs",
      icon: "remove",
      children: [
        {
          label: "Español",
          name: "es-ES",
          icon: "🇪🇸",
          isPlainIcon: true,
          callback: () => {
            this.useLanguage("es-ES");
          },
        },
        {
          label: "English",
          name: "en-US",
          icon: "🇬🇧",
          isPlainIcon: true,
          callback: () => {
            this.useLanguage("en-US");
          },
        },
        {
          label: "Français",
          name: "fr-FR",
          icon: "🇫🇷",
          isPlainIcon: true,
          callback: () => {
            this.useLanguage("fr-FR");
          },
        }
      ],
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

  openCameraPicker() {
    const ref = this.dialog.open(CameraPickerDialogComponent, {
      data: {
        currentCamera: this.configSrv.getCamera(),
      },
      disableClose: true,
      width: '480px',
    });

    ref.afterClosed().subscribe((result: CameraDataType | null) => {
      if (result) {
        this.configSrv.setCamera(result);
      }
    });
  }

  emitToc() {
    ModuloSonido.play("/assets/sounds/message.mp3");
  }

  useLanguage(name: string) {
    const lang = this.trackerComponent.getLang(name);
    if (lang) {
      this.trackerComponent.defineLanguage(lang);
      this.emitToc();
      this.updateCurrentLang();
    }
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

  updateCurrentLang() {
    const lang = this.trackerComponent.currentLang;
    const children = this.menuOptions
      .find(a => a.name == "langs")?.children;
    if (!children) {
      return;
    }
    children.filter(a => a.name && ["es-ES", "en-US", "fr-FR"].indexOf(a.name) >= 0)
      .forEach((a) => {
        a.inUse = a.name == lang;
      });
  }

  async ngAfterViewInit(): Promise<void> {
    this.trackerComponent.applyMode("mode");
    this.updateCurrentLang();
    this.authSrv.authState$.subscribe(async (user) => {
      try {
        await this.loadCollection();
        this.updateLogedMenuOptions();
      } catch (err: any) {
        this.uiNotificationSrv.show(err.message);
      } finally {
        this.trackerComponent.setUser(null);
      }
    });
    const world = await this.trackerComponent.loadWorld("");
    if (world) {
      const scenariosMenu = this.menuOptions
        .find(a => a.name && ['scenarios'].indexOf(a.name) >= 0);
      if (scenariosMenu) {
        scenariosMenu.children = [];
        const modeKeys = Object.keys(world.modes);
        scenariosMenu.children = modeKeys.sort((a, b) => b.localeCompare(a)).map(name => {
          const reference = world.modes[name];
          return {
            label: reference.menu.name,
            isPlainIcon: true,
            icon: reference.menu.icon,
            name: name,
            children: [],
            callback: async () => {
              await this.trackerComponent.applyMode(name, true);
              this.emitToc();;
              scenariosMenu.children?.forEach(m => {
                m.inUse = m.name === name;
              });
            },
          }
        });
        scenariosMenu.children?.forEach(m => {
          m.inUse = m.name === world.defaultMode;
        });
        this.cdr.detectChanges();
      }
    }
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
        this.room = temp as AssistantDataType;
        document.title = this.room.title;
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
}
