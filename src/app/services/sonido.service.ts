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

export interface RecordFromMicOptions {
  deviceId?: string; // Specific microphone, see navigator.mediaDevices.enumerateDevices()
  mimeType?: string; // Preferred mime type, falls back to the first supported one
  audioBitsPerSecond?: number;
}

export interface MicRecordingResult {
  url: string; // In-memory object URL, usable as new Audio(url)
  blob: Blob;
  mimeType: string;
  durationMillis: number;
}

export interface MicRecordingHandler {
  stop: () => Promise<MicRecordingResult>;
  cancel: () => void; // Stops and discards the recording
  readonly stream: MediaStream;
  readonly recorder: MediaRecorder;
}

function pickSupportedMimeType(preferred?: string): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  const candidates = [
    preferred,
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ].filter((m): m is string => !!m);
  return candidates.find((m) => MediaRecorder.isTypeSupported(m));
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

  /*
  const handler = await ModuloSonido.recordFromMic();
  // ... later
  const { url } = await handler.stop();
  const audio = new Audio(url);
  audio.play();
  // When no longer needed: URL.revokeObjectURL(url);
  */
  static async recordFromMic(options: RecordFromMicOptions = {}): Promise<MicRecordingHandler> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia no está disponible en este navegador');
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder no está disponible en este navegador');
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: options.deviceId ? { deviceId: { exact: options.deviceId } } : true,
    });
    const mimeType = pickSupportedMimeType(options.mimeType);
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: options.audioBitsPerSecond,
      });
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      throw err;
    }

    const chunks: Blob[] = [];
    recorder.addEventListener('dataavailable', (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    const releaseStream = () => stream.getTracks().forEach((t) => t.stop());
    const startedAt = Date.now();
    let stopPromise: Promise<MicRecordingResult> | null = null;

    recorder.start();

    const stop = (): Promise<MicRecordingResult> => {
      if (stopPromise) {
        return stopPromise;
      }
      stopPromise = new Promise<MicRecordingResult>((resolve, reject) => {
        recorder.addEventListener(
          'stop',
          () => {
            releaseStream();
            const type = recorder.mimeType || mimeType || 'audio/webm';
            const blob = new Blob(chunks, { type });
            resolve({
              url: URL.createObjectURL(blob),
              blob,
              mimeType: type,
              durationMillis: Date.now() - startedAt,
            });
          },
          { once: true },
        );
        recorder.addEventListener(
          'error',
          (event: Event) => {
            releaseStream();
            reject((event as any).error || new Error('Error grabando el audio'));
          },
          { once: true },
        );
        if (recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          releaseStream();
          reject(new Error('La grabación ya fue detenida'));
        }
      });
      return stopPromise;
    };

    const cancel = () => {
      chunks.length = 0;
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      releaseStream();
      stopPromise = Promise.reject(new Error('La grabación fue cancelada'));
      stopPromise.catch(() => {});
    };

    return { stop, cancel, stream, recorder };
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
