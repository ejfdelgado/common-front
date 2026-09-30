import { Base64 } from '../tools/Base64';

export interface ModeEntryType {
  id: String;
}

const modesRegistry: { won: ModeEntryType[] } = {
  won: [],
};

let updated: boolean = false;

export class ModeDiscovery {
  private static getCopy() {
    return JSON.parse(JSON.stringify(modesRegistry));
  }

  static async readFromDatabase() {
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

  static async checkWonMode(modeId: string) {
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
}
