import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IndicatorService } from './indicator.service';
import {
  AvatarModel,
  AvatarStoredDataType,
  GameControllerEnum,
  GameMode,
  GameScenario,
  WorldAvatar,
  WorldAvatarEdit,
} from '@mytypes/WorldAvatar';
import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { WorldEditComponent } from '../avatar/dialogs/world-edit/world-edit';
import { QuestionaireEditComponent } from '../avatar/dialogs/questionaire-edit/questionaire-edit';
import { AvatarEditComponent } from '../avatar/dialogs/avatar-edit/avatar-edit';
import { getJSONUrl } from '../tools/BucketPaths';
import { FileService } from './file.srv';
import { ModeCrudComponent } from '../avatar/dialogs/mode-crud/mode-crud';
import { MediaPipePerformanceType, MediaPipePoseEnum } from 'src/types/BodyTypes';
import { PerformanceEditComponent } from '../avatar/dialogs/performance-edit/performance-edit';
import { sortify } from 'ejfdelgado-common-ts';
import { MESH_OPTIONS } from 'src/types/WorldAvatarLibrary';
import { readMyAvatar } from '../avatar/utils/AvatarUtilities';

@Injectable({
  providedIn: 'root',
})
export class AvatarService {
  constructor(
    private http: HttpClient,
    private indicatorSrv: IndicatorService,
    public dialog: MatDialog,
    private fileSrv: FileService,
  ) {}

  async editAvatar(avatar: AvatarModel): Promise<AvatarModel | null> {
    // Open modal
    const dialogRef = this.dialog.open(AvatarEditComponent, {
      //width: '350px',
      disableClose: true,
      data: JSON.parse(JSON.stringify(avatar)),
    });
    return firstValueFrom(dialogRef.afterClosed());
  }

  async editScenario(scenario: GameScenario): Promise<GameScenario | null> {
    // Open modal
    const dialogRef = this.dialog.open(QuestionaireEditComponent, {
      //width: '80vw',
      disableClose: true,
      data: JSON.parse(JSON.stringify(scenario)),
    });
    return firstValueFrom(dialogRef.afterClosed());
  }

  async editWorld(mode: WorldAvatar): Promise<WorldAvatar | null> {
    // Open modal
    const dialogRef = this.dialog.open(WorldEditComponent, {
      //width: '350px',
      disableClose: true,
      data: JSON.parse(JSON.stringify(mode)),
    });
    return firstValueFrom(dialogRef.afterClosed());
  }

  async editModes(world: WorldAvatar): Promise<WorldAvatarEdit | null> {
    // Open modal
    const dialogRef = this.dialog.open(ModeCrudComponent, {
      //width: '350px',
      disableClose: true,
      data: JSON.parse(JSON.stringify(world)),
    });
    return firstValueFrom(dialogRef.afterClosed());
  }

  async editPerformance(
    performance: MediaPipePerformanceType,
  ): Promise<MediaPipePerformanceType | null> {
    const old = sortify(performance);
    // Open modal
    const dialogRef = this.dialog.open(PerformanceEditComponent, {
      //width: '350px',
      disableClose: true,
      data: JSON.parse(JSON.stringify(performance)),
    });
    const data = await firstValueFrom<MediaPipePerformanceType>(dialogRef.afterClosed());
    if (data) {
      const actual = sortify(data);
      if (old != actual) {
        //save
        this.writePerformance(data);
        // refresh
        location.reload();
      }
    }
    return data;
  }

  async loadWorld(firestoreEntity: AvatarStoredDataType): Promise<WorldAvatar> {
    if (!firestoreEntity.jsonModel) {
      // Fetch from default
      const read = await firstValueFrom(
        this.http.get('/assets/scenarios/base.json', {
          responseType: 'json',
        }),
      );
      return read as any;
    } else {
      // fetch from bucket
      //console.log(`Reading from ${firestoreEntity.jsonModel}`);
      const read = await this.fileSrv.getJSON(getJSONUrl(firestoreEntity.jsonModel));
      return read as any;
    }
  }

  writePerformance(performance: MediaPipePerformanceType) {
    localStorage.setItem('PERSONAL_PERFORMANCE', JSON.stringify(performance));
  }

  readPerformance(): MediaPipePerformanceType {
    const defaultValue: MediaPipePerformanceType = {
      pose: MediaPipePoseEnum.lite,
      filterBackPeople: false,
    };
    const old = localStorage.getItem('PERSONAL_PERFORMANCE');
    if (!old) {
      return defaultValue;
    }
    try {
      const parsed = JSON.parse(old);
      return Object.assign({}, defaultValue, parsed);
    } catch (e) {
      return defaultValue;
    }
  }

  async readMyAvatar(useDafault: boolean): Promise<AvatarModel | null> {
    return await readMyAvatar(useDafault);
  }

  async writeMyAvatar(avatar: AvatarModel) : Promise<void> {
    localStorage.setItem('MY_AVATAR', JSON.stringify(avatar));
  }
}
