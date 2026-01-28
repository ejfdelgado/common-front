# CommonFront

Songs:
In the name of love
Luca Disney song
Love song to the earth: https://www.youtube.com/watch?v=pLCSTn6_uU0

```
npx @angular/cli@20 new common-front
```

```bash
ng serve
```

```bash
npx ng generate component --standalone components/fields/image-gallery
```

```bash
npx ng generate component --standalone pages/photo_gallery/collections
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

[local song](http://localhost:4200/#/practicesong?q=runaway.json)

[stage song](https://stg-playtolearn.storage.googleapis.com/index.html#/practicesong?q=hall_of_fame.json&t=1)
[stage song](https://stg-playtolearn.storage.googleapis.com/index.html#/practicesong?q=unstopable.json&t=1)
[stage song](https://stg-playtolearn.storage.googleapis.com/index.html#/practicesong?q=karma.json)


[Pano Game](https://stg-playtolearn.storage.googleapis.com/index.html#/panogame?q=2025-07%2F001)

[Index](https://stg-playtolearn.storage.googleapis.com/index.html)

[photo gallery](https://stg-playtolearn.storage.googleapis.com/index.html#/photo_gallery/all)

```
gsutil cors get gs://pro-ejflab-assets
```

## TODO

http://localhost:8080/social?col=note&id=Szt6YABx5TEiGElFHpZB&path=/voyage_photo

https://pro-common-backend-1066977671859.us-central1.run.app/social?col=note&id=Szt6YABx5TEiGElFHpZB&path=/voyage_photo


- Create an image gallery component.

- Create an email field.
- Create address widget with map and address search.
- Create comments component. -> suggest store in firebase (multiple users update).
- Create a drop down with search for multiple choices selected.
- Create a drop down with search for single choice selected.

- Counters with event list strategy with time gap.

- Add google analytics.

- On/Off allow: lock/unlock, eye see/hide, check/uncheck

- Add url link capability to richtext editor.

- Enable Sendgrid email service to welcome or send notifications with templates.

- Configuration over convention: Add env variables to force entities:
    - bucket, permisos de usuario y tamanio
    - firestore, permisos de escritura por usuario que solo puede modificar lo que fue el autor.

- Reload Right/Left game (avoid win notification after finishing)
- Fullscreen toggle
- Notify: your device don't support voice recognition
- Creditos:
https://sketchfab.com/3d-models/cute-bunny-7d30845d69c4474ebeddd177df6b7f02
https://sketchfab.com/3d-models/chessboard-da15b92a3a584a8387036ff688391d45
https://sketchfab.com/3d-models/treasure-chest-773a2f35025b4e2e9ac48fd84c16b3ab


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