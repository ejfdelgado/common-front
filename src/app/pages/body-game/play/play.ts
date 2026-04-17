import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
import { ComponentBodyTracker } from '@avatar/ComponentBodyTracker';
import { Router } from '@angular/router';
import { P2PService, P2PStatus } from '@services/p2p.service';
import { Subscription } from 'rxjs';

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

  @ViewChild("tracker_component") trackerComponent!: ComponentBodyTracker;
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
      label: "End call",
      name: "end_call",
      isPlainIcon: true,
      icon: "❌",
      visible: false,
      children: [],
      callback: () => {
        this.p2pSrv.disconnectFromRoom();
      },
    });

    this.menuOptions.push({
      label: "Permissions",
      name: "permissions",
      isPlainIcon: true,
      icon: "🔒",
      visible: false,
      children: [],
      callback: () => {
        this.openPermissions();
      },
    });

    this.menuOptions.push({
      label: "Scenarios",
      isPlainIcon: true,
      icon: "🌎",
      children: [
        {
          label: "Park",
          isPlainIcon: true,
          icon: "🏞️",
          children: [],
          callback: () => {
            //this.trackerComponent.loadWorld("", "mode01");
            this.trackerComponent.applyMode("mode01", true);
          },
        },
        {
          label: "Wardrove",
          isPlainIcon: true,
          icon: "👖",
          children: [],
          callback: () => {
            //this.trackerComponent.loadWorld("", "mode00");
            this.trackerComponent.applyMode("mode00", true);
          },
        }
      ],
    });

    this.menuOptions.push({
      label: "Voice",
      name: "langs",
      icon: "record_voice_over",
      children: [
        {
          label: "Español",
          name: "es-ES",
          icon: "🇪🇸",
          isPlainIcon: true,
          callback: () => {
            const lang = this.trackerComponent.getLang("es-ES");
            if (lang) {
              this.trackerComponent.defineLanguage(lang);
              this.updateCurrentLang();
            }
          },
        },
        {
          label: "English",
          name: "en-US",
          icon: "🇬🇧",
          isPlainIcon: true,
          callback: () => {
            const lang = this.trackerComponent.getLang("en-US");
            if (lang) {
              this.trackerComponent.defineLanguage(lang);
              this.updateCurrentLang();
            }
          },
        },
        {
          label: "Français",
          name: "fr-FR",
          icon: "🇫🇷",
          isPlainIcon: true,
          callback: () => {
            const lang = this.trackerComponent.getLang("fr-FR");
            if (lang) {
              this.trackerComponent.defineLanguage(lang);
              this.updateCurrentLang();
            }
          },
        }
      ],
    });

    this.menuOptions.push({
      label: "Back to rooms",
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

  updateLogedMenuOptions() {
    const visible = !!this.user;
    this.menuOptions
      .filter(a => a.name && ['permissions'].indexOf(a.name) >= 0)
      .forEach((e) => {
        if (e.name == "permissions") {
          e.visible = visible && !!this.room;
        } else {
          e.visible = visible;
        }
      })
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

  ngAfterViewInit(): void {
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
    this.trackerComponent.loadWorld("", "mode01");
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
