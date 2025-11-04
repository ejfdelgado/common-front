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

export class ModuloSonido {
	static sonidos: { [key: string]: any } = {};
	static sincId: string | null = null;
	static createAudio(input: CreateSoundDataType) {
		if (typeof input.volume !== "number") {
			input.volume = 100;
		}
		if (typeof input.loop !== "boolean") {
			input.loop = false;
		}
		const { source, volume, loop } = input;
		return new Promise((resolve, reject) => {
			const audio = new Audio();
			audio.volume = volume / 100;
			audio.loop = loop;
			audio.addEventListener("error", (err) => {
				reject(new Error(`Error leyendo el audio ${source}`));
			});
			audio.addEventListener("loadeddata", () => {
				let duration = audio.duration;
				console.log(`duration:${duration}`);
				resolve(audio);
			});
			audio.src = source;
		});
	}

	static async preload(lista: any[] = []) {
		const promesas: Promise<any>[] = [];
		lista.forEach((llave) => {
			if (llave in ModuloSonido.sonidos) {
				promesas.push(Promise.resolve(ModuloSonido.sonidos[llave]));
			} else {
				const promesa = ModuloSonido.createAudio({ source: llave });
				promesa.then((audio: any) => {
					ModuloSonido.sonidos[llave] = audio;
				});
				promesas.push(promesa);
			}
		});
		return await Promise.all(promesas);
	};

	static setSincId(id: string) {
		ModuloSonido.sincId = id;
	}

	static async play(llave: string, loop = false, volume = 1) {
		let ref = null;
		if (llave in ModuloSonido.sonidos) {
			ref = ModuloSonido.sonidos[llave];
		} else {
			ref = (await ModuloSonido.preload([llave]))[0];
		}
		ref.volume = volume;
		let isPlaying = ref.currentTime > 0 && !ref.paused && !ref.ended
			&& ref.readyState > 2;
		if (!isPlaying) {
			ref.loop = loop;
			if (ModuloSonido.sincId) {
				ref.setSinkId(ModuloSonido.sincId);
			}
			ref.play();
		}
	};

	static stop(llave: string) {
		const sonido = ModuloSonido.sonidos[llave];
		if (sonido) {
			sonido.pause();
			sonido.currentTime = 0;
		}
	}

	static stopAll() {
		const llaves = Object.keys(ModuloSonido.sonidos);
		for (let i = 0; i < llaves.length; i++) {
			const llave = llaves[i];
			const sonido = ModuloSonido.sonidos[llave];
			sonido.pause();
			sonido.currentTime = 0;
		}
	}
}
