/*
const response = await ModuloSonido.preload([
'/assets/sounds/finish.mp3',
]);
await ModuloSonido.play('/assets/sounds/finish.mp3');
*/

export interface CreateSoundDataType {
  source: string;
  volume?: number;
  loop?: boolean;
}

function dispose(audioEl: HTMLAudioElement) {
  audioEl.pause(); // Stop any ongoing playback
  audioEl.src = ''; // Release the media resource
  audioEl.load(); // Reset the element (flushes buffers)
  audioEl.remove(); // Remove from DOM (if appended)
}

export class ModuloSonido {
  static sonidos: { [key: string]: any } = {};
  static sincId: string | null = null;
  static createAudio(input: CreateSoundDataType): Promise<HTMLAudioElement> {
    if (typeof input.volume !== 'number') {
      input.volume = 100;
    }
    if (typeof input.loop !== 'boolean') {
      input.loop = false;
    }
    const { source, volume, loop } = input;
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.volume = volume / 100;
      audio.loop = loop;
      audio.addEventListener('error', (err) => {
        reject(new Error(`Error leyendo el audio ${source}`));
      });
      audio.addEventListener('loadeddata', () => {
        let duration = audio.duration;
        //console.log(`duration:${duration}`);
        resolve(audio);
      });
      audio.src = source;
    });
  }

  static async preload(lista: string[] = []) {
    const promesas: Promise<HTMLAudioElement>[] = [];
    lista.forEach((llave) => {
      if (llave in ModuloSonido.sonidos) {
        promesas.push(Promise.resolve(ModuloSonido.sonidos[llave]));
      } else {
        const promesa = ModuloSonido.createAudio({ source: llave });
        promesa.then((audio: HTMLAudioElement) => {
          ModuloSonido.sonidos[llave] = audio;
        });
        promesas.push(promesa);
      }
    });
    return await Promise.all(promesas);
  }

  static setSincId(id: string) {
    ModuloSonido.sincId = id;
  }

  static async play(
    llave: string,
    loop: boolean = false,
    volume: number = 1,
    startMillis: number | null = 0,
  ): Promise<{
    ref: HTMLAudioElement;
    promise: Promise<void>;
  }> {
    let ref: HTMLAudioElement | null = null;
    if (llave in ModuloSonido.sonidos) {
      ref = ModuloSonido.sonidos[llave];
    } else {
      ref = (await ModuloSonido.preload([llave]))[0];
    }
    if (!ref) {
      throw new Error('Audio not loaded');
    }
    ref.volume = volume;
    let isPlaying = ref.currentTime > 0 && !ref.paused && !ref.ended && ref.readyState > 2;
    if (!isPlaying) {
      ref.loop = loop;
      if (ModuloSonido.sincId) {
        ref.setSinkId(ModuloSonido.sincId);
      }
      if (typeof startMillis == 'number') {
        ref.currentTime = startMillis / 1000;
      }
      ref.play();
    } else {
      if (loop) {
        if (typeof startMillis == 'number' && startMillis != 0) {
          ref.currentTime = startMillis / 1000;
        }
      } else {
        // Play multiple instances
        const clone: HTMLAudioElement = ref.cloneNode() as HTMLAudioElement;
        clone.volume = volume;
        if (ModuloSonido.sincId) {
          clone.setSinkId(ModuloSonido.sincId);
        }
        clone.addEventListener('ended', () => {
          dispose(clone);
        });
        if (typeof startMillis == 'number') {
          clone.currentTime = startMillis / 1000;
        }
        clone.play();
      }
    }
    const promise = new Promise<void>((resolve) => {
      const endFun = () => {
        ref.removeEventListener('ended', endFun);
        resolve();
      };
      ref.addEventListener('ended', endFun);
    });
    return { ref, promise };
  }

  static stop(llave: string) {
    const sonido = ModuloSonido.sonidos[llave];
    if (sonido) {
      sonido.pause();
      sonido.currentTime = 0;
    }
  }

  static pause(llave: string) {
    const sonido = ModuloSonido.sonidos[llave];
    if (sonido) {
      sonido.pause();
    }
  }

  static stopAll(whiteList?: string[]) {
    const llaves = Object.keys(ModuloSonido.sonidos);
    for (let i = 0; i < llaves.length; i++) {
      const llave = llaves[i];
      if (whiteList && whiteList.indexOf(llave) >= 0) {
        // Apply white list
        continue;
      }
      const sonido = ModuloSonido.sonidos[llave];
      sonido.pause();
      sonido.currentTime = 0;
    }
  }
}
