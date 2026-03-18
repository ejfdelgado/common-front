# CommonFront

- Automatizar que al final de la entrevista inicial, se envíe el correo de OnBoarding, solo requiere del email.
- Automatizar crear un cliente, con los datos básicos a nombre del autor.

- Login with email on chat.

TEST: Calendar, poder filtrar por nombre de calendario, uno tiene varios.

Borrar indices:
// pro-knowledge [] owners, ASC search, DESC updated, DESC __name__
// pro-knowledge [] search, DESC updated, DESC __name__

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
Buscar los eventos existentes dado un inicio y final de tiempo. (agregarlo a la consulta existente!)
Enable test calendar.

Permitir renderizar algunas variables del modelo en los textos.

Hacer un backend para ingesta de un archivo.***

Permitir embeber el chat en una página externa.

Pagar Supabase
Pagar Sendgrid IP privada.
Mostrar página cuando no está publicado.

Create an alternative email template, but for canvas user profile.

Allow filter history given the type.

Hacer el servicio de borrar todo en supabase y firestore.
Agregar max length a text, md, texarea y rich text.

Paginar usuarios.

Capturar mejor la foto o permitir rotar.

Cual es el max length del embeeding text?
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
npx ng generate component --standalone --skip-tests components/message-page
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


  async openDialog(payload: any) {
    let model: any = null;
    if (payload) {
      model = payload.model;
    }
    const formConfig: FormDataType = {
      title: "Crear / actualizar",
      autoAuthor: true,
      modelName: "note",
      searchFields: ["title", "description", "cathegory"],
      fields: [
        {
          label: "Json", type: "json", key: "json", json: {
            template: "voyage_note/${user.email}/${date.year}-${date.month}-${date.day}/${random}.json",
            fields: [
              { label: "Título", type: "text", key: "tit", required: true },
              {
                label: "Imagen", type: "image", key: "image", image: {
                  template: "voyage_note/${user.email}/${date.year}-${date.month}-${date.day}/${random}.jpg",
                }
              },
              { label: "Descripción", type: "contenteditable", key: "desc" },
              { label: "Habilitado", type: "toggle", key: "enabled" },
              { label: "Calificación", type: "rating", key: "rate" },
              { label: "Teléfono", type: "phone", key: "phone", required: false },
              { label: "Categorías", type: "chip", key: "cathegory", required: false, chip: { stringOptions: ["Manzana", "Pera"] } },
            ],
          }
        },
      ],
      model: {
        title: '',
        description: '',
        json: "./assets/json/sample.json"
      }
    };
    if (model) {
      formConfig.model = model;
    }
    const dialogRef = this.dialog.open(DialogFormComponent, {
      width: '800px',
      panelClass: 'custom-emoji-picker',
      autoFocus: !this.isMobile(),
      data: formConfig,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (!model) {
          // Creation
          if (!this.liveMode) {
            this.pageNotes(true);
          }
        } else {
          // Update
          // mix objects
          Object.assign(model, result);
          this.cdr.detectChanges();
        }
      }
    });
  }