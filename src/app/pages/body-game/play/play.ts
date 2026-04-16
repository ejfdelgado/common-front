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
import { SelectOptionType } from 'app/pages/commonSpeech';

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
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);

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
      label: "scenario",
      isPlainIcon: true,
      icon: "🌎",
      children: [],
      callback: () => {
        this.trackerComponent.loadWorld("", "mode01");
      },
    });

    this.menuOptions.push({
      label: "Wardrove",
      isPlainIcon: true,
      icon: "👖",
      children: [],
      callback: () => {
        this.trackerComponent.loadWorld("", "mode00");
      },
    });

    this.menuOptions.push({
      label: "Voice",
      icon: "record_voice_over",
      children: [
        {
          label: "Español",
          icon: "🇪🇸",
          isPlainIcon: true,
          callback: () => {
            const lang = this.trackerComponent.getLang("es-ES");
            if (lang) {
              this.trackerComponent.defineLanguage(lang);
            }
          },
        },
        {
          label: "English",
          icon: "🇬🇧",
          isPlainIcon: true,
          callback: () => {
            const lang = this.trackerComponent.getLang("en-US");
            if (lang) {
              this.trackerComponent.defineLanguage(lang);
            }
          },
        },
        {
          label: "Français",
          icon: "🇫🇷",
          isPlainIcon: true,
          callback: () => {
            const lang = this.trackerComponent.getLang("fr-FR");
            if (lang) {
              this.trackerComponent.defineLanguage(lang);
            }
          },
        }
      ],
    });

    this.sideMenuSrv.getState().subscribe(() => {
      setTimeout(() => {
        this.trackerComponent.onResize();
      }, 500);
    });

    this.authSrv.authState$.subscribe(async (user) => {
      try {
        this.updateLogedMenuOptions();
        await this.loadCollection();
      } catch (err: any) {
        this.uiNotificationSrv.show(err.message);
      }
    });
  }

  updateLogedMenuOptions() {
    const visible = !!this.user;
    this.menuOptions
      .filter(a => a.name && ['permissions'].indexOf(a.name) >= 0)
      .forEach((e) => {
        e.visible = visible;
      })
  }

  ngAfterViewInit(): void {
    this.trackerComponent.applyMode("mode");
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
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {

  }



}
