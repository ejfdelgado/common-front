import { DomSanitizer } from '@angular/platform-browser';
import { AuthenticatedComponent } from '../components/authenticated.component';
import { FullscreenService } from '../services/fullscreen.service';
import { AuthService } from '../services/auth.service';
import { ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CameraPickerDialogComponent } from '../components/fields/camera-picker/camera-picker-dialog';
import { ConfigService } from '../services/config.service';
import { CameraDataType } from 'src/types/CameraTypes';
import { ModuloSonido } from '../services/sonido.service';
import { ComponentP2P } from './ComponentP2P';
import { MenuOptionType } from 'src/types/StatusBar';
import {
  AvatarModel,
  AvatarStoredDataType,
  GameMode,
  GameScenario,
  WorldAvatar,
  WorldAvatarEdit,
} from 'src/types/WorldAvatar';
import { getBucketPath } from '../tools/BucketPaths';
import { FileService } from '../services/file.srv';
import { FirestoreService } from '../services/firestore.service';
import { sortify } from 'ejfdelgado-common-ts';
import { sleep } from '../tools/rxjsUtils';
import { getUrlQueryParams } from '../tools/UrlUtil';

export abstract class ConfigurableGame extends AuthenticatedComponent {
  room: AvatarStoredDataType | null = null;
  menuOptions: MenuOptionType[] = [];
  isUserOwner: boolean = false;

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public override authSrv: AuthService,
    public override cdr: ChangeDetectorRef,
    // Local imports
    public dialog: MatDialog,
    public configSrv: ConfigService,
    public fileSrv: FileService,
    public firestoreSrv: FirestoreService,
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);
    this.authSrv.authState$.subscribe(async (user) => {
      if (user) {
        do {
          await sleep(100);
        } while (!this.authSrv.token());
        this.isUserOwner = await this.authSrv.isUserOwner();
        this.updateLogedMenuOptions();
      }
    });
  }

  abstract getTrackerComponent(): ComponentP2P;

  abstract getFirestoremodelName(): string;

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
    ModuloSonido.play('/assets/sounds/message.mp3');
  }

  updateCurrentLang() {
    const lang = this.getTrackerComponent().currentLang;
    const children = this.menuOptions.find((a) => a.name == 'langs')?.children;
    if (!children) {
      return;
    }
    children
      .filter((a) => a.name && ['es-ES', 'en-US', 'fr-FR'].indexOf(a.name) >= 0)
      .forEach((a) => {
        a.inUse = a.name == lang;
      });
  }

  useLanguage(name: string) {
    const lang = this.getTrackerComponent().getLang(name);
    if (lang) {
      this.getTrackerComponent().defineLanguage(lang);
      this.emitToc();
      this.updateCurrentLang();
    }
  }

  updateLogedMenuOptions() {
    const visible = !!this.user;
    this.menuOptions
      .find((a) => a.name && ['config'].indexOf(a.name) >= 0)
      ?.children?.filter((a) => a.name && a.name.startsWith('loged_'))
      .forEach((e) => {
        e.visible = visible && !!this.room;
      });
    // Check the levels
    const scenarioMenu = this.menuOptions.find((a) => a.name == 'scenarios');
    if (scenarioMenu) {
      const children = scenarioMenu.children;
      console.log(JSON.stringify(children, null, 4));
      if (children && !this.isUserOwner) {
        // Discovery logic
        children.forEach((e, i) => {
          if (i == 0) {
            e.visible = true;
          } else {
            e.visible = false;
          }
        });
      }
    }
  }

  recomputeModeMenu(world: WorldAvatar) {
    const scenariosMenu = this.menuOptions.find(
      (a) => a.name && ['scenarios'].indexOf(a.name) >= 0,
    );
    if (scenariosMenu) {
      scenariosMenu.children = [];
      const modeKeys = Object.keys(world.modes);
      scenariosMenu.children = modeKeys
        .sort((a, b) => {
          return world.modes[a].order - world.modes[b].order;
        })
        .map((name) => {
          const reference = world.modes[name];
          return {
            label: reference.menu.name,
            isPlainIcon: true,
            icon: reference.menu.icon,
            name: name,
            children: [],
            callback: async () => {
              const scenarioId = undefined;
              await this.getTrackerComponent().applyMode(name, scenarioId, true);
              this.emitToc();
              scenariosMenu.children?.forEach((m) => {
                m.inUse = m.name === name;
              });
            },
          };
        });
      scenariosMenu.children?.forEach((m) => {
        m.inUse = m.name === world.defaultMode;
      });
      this.updateLogedMenuOptions();
      this.cdr.detectChanges();
    }
  }

  async localLoadWorld(firestoreEntity: AvatarStoredDataType) {
    const world = await this.getTrackerComponent().loadWorld(firestoreEntity);
    if (world) {
      this.recomputeModeMenu(world);
    }
  }

  public async writeStoredModel(data: WorldAvatar): Promise<boolean> {
    try {
      const room = await this.getRoom();
      const modelName = this.getFirestoremodelName();
      if (!room) {
        return false;
      }
      // Write into bucket
      const template = 'avatar/${user.uid}/${date.year}-${date.month}-${date.day}/${random}.json';
      const nextPath = getBucketPath(template, room.jsonModel ? room?.jsonModel : '', {
        user: AuthService.userStatic,
      });
      const promesas = [];
      const jsonString = JSON.stringify(data, null, 2);
      const jsonBlob = new Blob([jsonString], { type: 'application/json' });
      promesas.push(this.fileSrv.upload(nextPath, jsonBlob, 'bucket'));
      await Promise.all(promesas);
      // Then update model on firestore
      room.jsonModel = nextPath;
      await this.firestoreSrv.createUpdate(modelName, room, {});
      return true;
    } catch (err) {
      return false;
    }
  }

  async loadCollection() {
    const params = getUrlQueryParams();
    const col = params.get('col');
    const id = params.get('id');
    if (col && id) {
      const temp = await this.firestoreSrv.readById(col, id);
      if (temp) {
        this.room = temp as AvatarStoredDataType;
        document.title = this.room.title;
        this.localLoadWorld(this.room);
      } else {
        this.room = null;
      }
      const trackerComponent = await this.getTrackerComponent();
      trackerComponent.setRoomData(this.room);
      this.cdr.detectChanges();
    }
  }

  async getRoom(): Promise<AvatarStoredDataType | null> {
    return this.room;
  }

  async saveAndApplyWorld(data: WorldAvatarEdit) {
    const tracker = this.getTrackerComponent();
    if (
      sortify(tracker.world.modes) != sortify(data.modes) ||
      tracker.world.defaultMode != data.defaultMode
    ) {
      tracker.world.defaultMode = data.defaultMode;
      tracker.world.modes = data.modes;
      this.recomputeModeMenu(tracker.world);
      const defaultMode = tracker.world.modes[tracker.world.defaultMode];
      await tracker.applyModeBeforeSave(defaultMode);
      await this.writeStoredModel(tracker.world);
      await tracker.reloadModeAndScenario();
    }
  }

  async saveAndApplyMode(data: GameMode) {
    const tracker = this.getTrackerComponent();
    await tracker.applyModeBeforeSave(data);
    await this.writeStoredModel(tracker.world);
    await tracker.reloadModeAndScenario();
  }

  async saveAndApplyScenario(data: GameScenario) {
    const tracker = this.getTrackerComponent();
    await tracker.applyScenarioBeforeSave(data);
    await this.writeStoredModel(tracker.world);
    await tracker.reloadModeAndScenario();
  }

  async saveAndApplyAvatar(data: AvatarModel) {
    const tracker = this.getTrackerComponent();
    await tracker.applyAvatarBeforeSave(data);
    await this.writeStoredModel(tracker.world);
    await tracker.reloadModeAndScenario();
  }
}
