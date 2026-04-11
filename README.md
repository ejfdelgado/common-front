# CommonFront

comparacion: (3 numeros de salida)
angulo entre front y front
entre left y left y up y up.

extremidades cercanas: (4 numeros salida)
comparacion vectorial:
producto punto normalizado min -1 max 1

extremidades lejanas: (4 numeros de salida)
abs(angulo-angulo)

Interactuar con menu.
Izquierda, derecha, aplauso.
patada salir.

interactuar con botones:
esfera
cuadrado.

------------------------------------------------------------------------

Comparar poses y asignar un score.
Agnostico de la orientación del avatar:
- Usando frente del avatar
- Angulos de antebrazo y femur relativos al frente del avatar, usando 3 ejes de coordenadas canónico con respecto al eje de coordenadas del avatar.
- Angulo mímimo de brazo relativo a antebrazo y de pie relativo a femur.

------------------------------------------------------------------------

Evitar que se vuelva loco cuando no detecta bien el body.

Agregar a manos y pies capacidad de colision (aplicar matriz a la pose y evaluar manos o pies)
para detectar cuando el usuario toca algo.
Agregar controlador tipo menú 3D.

Agregar mundo para:
- Evaluar equilibrio.
- Evaluar hasta donde puede pegar patadas con el pie.
- Máximo tiempo con los brazos a los lados.
- Trotoar sin parar.
- Ritmo (tambores).

Hacer un vestier.
- Interact with body.
- Interact with voice commands.

Usar menú de arriba para alojar:
- Play/Pause. (voice on/of) (camera pose on/off)
- Idioma.
- Login/Logout

Permitir construir un mundo 3d:
Permitiendo cargar N partes el mundo:
Cuando se carga el objeto 3d se calcula el bounding box y se agrega junto con el archivo
min, x, y, z, max, x, y, z.

Permitir que cuando aplaude, sirva para agarrar objetos y trasladarlos.
Permitir interactuar con voz con los asistentes virtuales.
El sistema de navegación debe manejar colisiones para evitar overlaping.

Agregar soporte para animaciones largas.

Agregar login con microsoft.
En los eventos tal vez enviar el walkBody, porque en algún momento pueden ser varios?

-------------------------------------------------------------------

Permitir cargar el mundo haciendo referencia al modelo guardado previamente.
Permitir cargar unicamente la región donde está ubicado el usuario.

Fix mirror al caminar.

-------------------------------------------------------------------

- Comentarios del inicio de la vista de Clientes.

- Login with email on chat.
- Automatizar que al final de la entrevista inicial, se envíe el correo de OnBoarding, solo requiere del email.
- Automatizar crear un cliente, con los datos básicos a nombre del autor.

TEST: Calendar, poder filtrar por nombre de calendario, uno tiene varios.

Recover history:
- Guardar solo la history del agente.
- Una vez logeado guardar la history desde el backend.
- En front end cargar de lo mas reciente a lo mas viejo, interpretando como si fuera un chat nuevo, en vez de usar push, usar unshift en posicion 0.
- Usar auto autor y created DESC.

--------------------------------------------------------------------

Hacer una tool que pida al usuario logearse.
Permitir que el agente siempre sepa cual es el usuario logeado.
Si es usuario logeado, guardar el historial.
Cargar el historial.

Calendar:
Buscar los eventos existentes dado un inicio y final de tiempo (o por día!). (agregarlo a la consulta existente!)
Enable test calendar.

Permitir renderizar algunas variables del modelo en los textos.

Hacer un backend para ingesta de un archivo.***

Pagar Supabase
Pagar Sendgrid IP privada.
Mostrar página cuando no está publicado.

Allow filter history given the type.

Hacer el servicio de borrar todo en supabase y firestore.
Agregar max length a text, md, texarea y rich text.

Paginar usuarios.

Capturar mejor la foto o permitir rotar.

Allow to configure with the url query param, set the size of the shared url.

Credits to:
https://loading.io/

Allow host models on own url, not remote.

https://matdash-angular-dark.netlify.app/apps/employee

gsutil setmeta -h "Cache-Control:private, max-age=0, no-cache" gs://stg-playtolearn/index.html

gsutil -m setmeta -r -h "Cache-Control:private, max-age=0, no-cache" gs://stg-playtolearn/

```
npx @angular/cli@20 new common-front
```

```bash
ng serve
```

```bash
npx ng generate component --standalone --skip-tests components/login-options
```

```bash
npx ng generate component --standalone --skip-tests pages/alterego/land
```

```bash
ng generate component component-name
```

```bash
ng build
```

Configure branding at:
[OAuth branding](https://console.cloud.google.com/auth/branding?project=ejfexperiments)

[Stage page](https://stg-playtolearn.storage.googleapis.com/index.html)
[Stage page](https://pro-playtolearn.storage.googleapis.com/index.html)

[Pano Game Sample](https://localhost:4200/#/panogame?q=2025-07%2F001)
[pano Sample](https://localhost:4200/#/pano?q=2025-07%2F001)
[Left right](https://localhost:4200/#/rightleft?lan=fr-FR&n=5)
[Stage page](https://stg-playtolearn.storage.googleapis.com/index.html#/pano?q=2025-07%2F001)
[Stage page](https://stg-playtolearn.storage.googleapis.com/index.html#/read)
[Left right french](https://stg-playtolearn.storage.googleapis.com/index.html#/rightleft?lan=fr-FR&n=5)
[Left right english](https://stg-playtolearn.storage.googleapis.com/index.html#/rightleft?lan=en-US&n=5)
[Left right spanish](https://stg-playtolearn.storage.googleapis.com/index.html#/rightleft?lan=es-ES&n=5)

[local song](https://localhost:4200/#/practicesong?q=runaway.json)

[stage song](https://music.pais.tv/#/?q=hall_of_fame.json&t=1)
[stage song](https://music.pais.tv/#/?q=unstopable.json&t=1)
[stage song](https://music.pais.tv/#/?q=karma.json)
[stage song](https://music.pais.tv/#/?q=love_song_to_the_earth.json)
[stage song](https://music.pais.tv/#/?q=in_the_name_of_love2.json)

[love song](https://music.pais.tv/#/?q=love_song_to_the_earth.json)

[Pano Game](https://stg-playtolearn.storage.googleapis.com/index.html#/panogame?q=2025-07%2F001)

[Index](https://stg-playtolearn.storage.googleapis.com/index.html)

[photo gallery](https://stg-playtolearn.storage.googleapis.com/index.html#/photo_gallery/all)

[photo gallery](https://stg-playtolearn.storage.googleapis.com/index.html#/books_gallery/all)

[Documents](https://stg-playtolearn.storage.googleapis.com/index.html#/docs/all)

[Notes](https://stg-playtolearn.storage.googleapis.com/index.html#/notes)

[Play sound](https://stg-playtolearn.storage.googleapis.com/index.html#/playsound)

https://music.pais.tv/#/?q=love_song_to_the_earth2.json

https://music.pais.tv/#/?q=count_on_me.json

https://music.pais.tv/#/?q=colors.json

https://music.pais.tv/#/?q=what_a_wonderful_world.json

https://music.pais.tv/#/?q=try_everything.json

https://chat.pais.tv

https://chat.pais.tv#/alterego/use?col=pubknowledge&id=A0Awcqw4y26UXLVsOcxh

```
gsutil cors get gs://pro-ejflab-assets
```

## TODO

- camera capture support for landscape and selfie weird! or use rotate, mirror.

- Place thumbnail scroll of gallery after next or previous button.
- Add multilanguage, service, and pipe.
- Add alert service with support of multilanguage, multiaction.

- Create an email field.
- Create address widget with map and address search.
- Create a drop down with search for multiple choices selected.
- Create a drop down with search for single choice selected.

- Counters with event list strategy with time gap.

- webrtc: https://webrtc.org/getting-started/firebase-rtc-codelab?hl=en

- Add google analytics.

- Add url link capability to richtext editor.

- Configuration over convention: Add env variables to force entities:
    - bucket, permisos de usuario y tamanio
    - firestore, permisos de escritura por usuario que solo puede modificar lo que fue el autor.

- Reload Right/Left game (avoid win notification after finishing)
- Notify: your device don't support voice recognition

- Creditos:
https://sketchfab.com/3d-models/cute-bunny-7d30845d69c4474ebeddd177df6b7f02
https://sketchfab.com/3d-models/chessboard-da15b92a3a584a8387036ff688391d45
https://sketchfab.com/3d-models/treasure-chest-773a2f35025b4e2e9ac48fd84c16b3ab


## Bugs

- Avoid to use execCommand on contenteditable
- PDF using jspdf error on:
  - links
  - spaces
  - font

css masonry

.container {
  columns: 3 200px; /* Shorthand for column-count and column-width */
  gap: 1rem; /* Creates space between columns */
}

.item {
  /* The break-inside property prevents items from being split across columns */
  break-inside: avoid;
  background: #f0f0f0;
  margin-bottom: 1rem; /* Creates space between items */
  padding: 1rem;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

-----

private async confirmLoadState(userName: string) {
  const popUpParameter: GenericData = {
    translateFolder: 'nogales_assessment_single',
    title: 'popups.load_previous.title',
    txt: 'popups.load_previous.text',
    model: {
      userName,
    },
    ishtml: true,
    choices: [
      { txt: 'popups.choices.yes_word', val: 'yes', icon: "check" },
      { txt: 'popups.choices.no_word', val: 'no', icon: "close", class: "secondary_button" },
    ],
  };
  const modalResponse = (await this.modalSrv.generic(popUpParameter)) as {
    choice: string;
  };

  if (!modalResponse || modalResponse.choice === 'no') {
    return false;
  }
  return true;
}