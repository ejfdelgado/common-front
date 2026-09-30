import { MAX_LIFE } from 'src/types/WorldAvatar';
import { Base64 } from '../tools/Base64';

export interface ModeEntryType {
  id: String;
}

export interface UserData {
  life: number;
  score: number;
}

export interface GameRegistryData {
  won: ModeEntryType[];
  user: UserData;
}

const modesRegistry: GameRegistryData = {
  won: [],
  user: {
    life: MAX_LIFE,
    score: 0,
  },
};

let updated: boolean = false;

export class ModeDiscovery {
  private static getCopy() {
    return JSON.parse(JSON.stringify(modesRegistry));
  }

  static async readFromDatabase(): Promise<GameRegistryData> {
    if (updated) {
      return ModeDiscovery.getCopy();
    }
    try {
      const base64 = localStorage.getItem('MODES_RECORD');
      if (!base64) {
        throw 'Not found';
      }
      const text = Base64.decode(base64);
      Object.assign(modesRegistry, JSON.parse(text));
    } catch (err) {
      modesRegistry.won = [];
    }
    updated = true;
    return ModeDiscovery.getCopy();
  }

  static async write() {
    const text = JSON.stringify(modesRegistry);
    const base64 = Base64.encode(text);
    localStorage.setItem('MODES_RECORD', base64);
  }

  static async checkDiscoveredMode(modeId: string) {
    if (
      modesRegistry.won.find((mode: ModeEntryType) => {
        return mode.id == modeId;
      }) != undefined
    ) {
      return;
    }
    modesRegistry.won.push({
      id: modeId,
    });
    await ModeDiscovery.write();
  }

  static async setLife(life: number) {
    const old = await ModeDiscovery.readFromDatabase();
    old.user.life = life;
    await ModeDiscovery.write();
  }

  static async setScore(score: number) {
    const old = await ModeDiscovery.readFromDatabase();
    old.user.score = score;
    await ModeDiscovery.write();
  }

  static async setLifeScore(life: number, score: number) {
    const old = await ModeDiscovery.readFromDatabase();
    old.user.life = life;
    old.user.score = score;
    await ModeDiscovery.write();
  }
}
