import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  effect,
  OnDestroy,
  OnInit,
  untracked,
  ViewChild,
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
import { FirestoreService } from '@services/firestore.service';
import { SideMenuService } from '@services/side-menu.service';
import { Router } from '@angular/router';
import { P2PService, P2PStatus } from '@services/p2p.service';
import { Subscription } from 'rxjs';
import { ComponentP2P } from '@avatar/ComponentP2P';
import { ModuloSonido } from '@services/sonido.service';
import { ConfigService } from '@services/config.service';
import { ConfigurableGame } from 'src/app/avatar/ConfigurableGame';
import { FileService } from 'src/app/services/file.srv';
import { getAssistanteIframeSrc, getClientRef } from '../../alterego/common';
import { ANALYTICS_ID, ASISTANT_ID } from 'src/types/WorldAvatar';
import { AnalyticsService } from 'src/app/services/analytics.service';

const MODEL_NAME_PARENT = 'room-public';

@Component({
  selector: 'app-play',
  imports: [CommonModule, MatButtonModule, Statusbar, SideMenu, BodyTracker],
  templateUrl: './play.html',
  styleUrls: ['./play.scss', '../../../../assets/css/chat.scss'],
})
export class PlayComponent extends ConfigurableGame implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('tracker_component') trackerComponent!: ComponentP2P;
  statusBarConfig: StatusBarConfigType = {
    hamburgerHighlight: true,
  };
  status: P2PStatus = { value: 'offline' };
  p2pStatusSubscription: Subscription | null = null;
  isAssistantOpened: boolean = false;

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
    private analyticsSrv: AnalyticsService,
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr, dialog, configSrv, fileSrv, firestoreSrv);
    this.analyticsSrv.gtagConfig(ANALYTICS_ID);
    this.p2pStatusSubscription = this.p2pSrv.status.subscribe((ev) => {
      this.status = ev;
      const found = this.menuOptions.find((a) => a.name == 'end_call');
      if (found) {
        found.visible = ev.value == 'online';
      }
      this.cdr.detectChanges();
    });

    this.menuOptions.push({
      label: 'menu.end_call',
      translateFolder: 'avatar',
      name: 'end_call',
      isPlainIcon: true,
      icon: '🚪',
      visible: false,
      children: [],
      callback: () => {
        this.p2pSrv.disconnectFromRoom();
        ModuloSonido.play('/assets/sounds/hangdown.mp3');
      },
    });

    this.menuOptions.push({
      label: 'menu.scenarios',
      translateFolder: 'avatar',
      name: 'scenarios',
      icon: 'remove',
      children: [],
    });

    this.menuOptions.push({
      label: 'menu.config',
      translateFolder: 'avatar',
      name: 'config',
      icon: 'remove',
      children: [
        {
          label: 'menu.camera',
          translateFolder: 'avatar',
          name: 'edit_camera',
          isPlainIcon: true,
          icon: '🎥',
          visible: true,
          children: [],
          callback: () => {
            this.emitToc();
            this.openCameraPicker();
          },
        },
        {
          label: 'menu.editPerformance',
          translateFolder: 'avatar',
          name: 'edit_performance',
          isPlainIcon: true,
          icon: '⚙️',
          visible: true,
          children: [],
          callback: async () => {
            this.emitToc();
            await this.trackerComponent.editPerformance();
          },
        },
        {
          label: 'menu.editAvatar',
          translateFolder: 'avatar',
          name: 'loged_edit_avatar',
          autovisible: true,
          roles: ['body_game_editor', 'owner', 'logged'],
          isPlainIcon: true,
          icon: '🎭',
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
          label: 'menu.editScenario',
          translateFolder: 'avatar',
          name: 'loged_edit_scenario',
          autovisible: true,
          roles: ['body_game_editor', 'owner', 'logged'],
          isPlainIcon: true,
          icon: '📑',
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
          label: 'menu.editModes',
          translateFolder: 'avatar',
          name: 'loged_edit_modes',
          autovisible: true,
          roles: ['body_game_editor', 'owner', 'logged'],
          isPlainIcon: true,
          icon: '👾',
          visible: true,
          children: [],
          callback: async () => {
            this.emitToc();
            const response = await this.trackerComponent.editModes();
            if (response) {
              this.saveAndApplyWorldModes(response);
            }
          },
        },
        {
          label: 'menu.editWorld',
          translateFolder: 'avatar',
          name: 'loged_edit_world',
          autovisible: true,
          roles: ['body_game_editor', 'owner'],
          isPlainIcon: true,
          icon: '🌍',
          visible: true,
          children: [],
          callback: async () => {
            this.emitToc();
            const response = await this.trackerComponent.editWorld();
            if (response) {
              await this.saveAndApplyWorld(response);
            }
          },
        },
        {
          label: 'menu.friends',
          translateFolder: 'avatar',
          name: 'loged_permissions',
          autovisible: true,
          roles: ['logged', 'owner'],
          isPlainIcon: true,
          icon: '👫',
          visible: false,
          children: [],
          callback: () => {
            this.emitToc();
            this.openPermissions();
          },
        },
      ],
    });

    this.menuOptions.push({
      label: 'menu.back_rooms',
      translateFolder: 'avatar',
      icon: 'arrow_back',
      autovisible: true,
      roles: ['logged'],
      name: 'loged_go_back',
      children: [],
      callback: () => {
        this.router.navigate([`action/rooms`], {
          queryParams: {},
        });
      },
    });

    this.menuOptions.push({
      label: 'menu.back_home',
      translateFolder: 'avatar',
      icon: '🏠',
      autovisible: true,
      roles: ['not_logged'],
      name: 'go_home',
      children: [],
      callback: () => {
        this.router.navigate([''], {
          queryParams: {},
        });
      },
    });

    this.sideMenuSrv.getState().subscribe(() => {
      setTimeout(() => {
        this.trackerComponent.onResize();
      }, 500);
    });

    effect(() => {
      this.authSrv.roles();
      untracked(() => this.updateLogedMenuOptions());
    });
  }

  getFirestoremodelName(): string {
    return MODEL_NAME_PARENT;
  }

  override getTrackerComponent(): ComponentP2P {
    return this.trackerComponent;
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
        mode: 'normal',
      },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      //console.log(result);
    });
  }

  async ngOnInit(): Promise<void> {
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

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  openAssistant() {
    this.isAssistantOpened = true;
  }

  getIframeSrc() {
    const lang = this.configSrv.getCurrentLanguage();
    return getAssistanteIframeSrc(ASISTANT_ID[lang], this.sanitizer);
  }
}
