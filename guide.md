
# How to create a new content

## The collection configuration

### Firestore permissions:

If collection can be read without authentication
```
match /pro-animals/{document=**} {
    allow read: if true;
}
```

If collection must be read only if authenticated
```
match /pro-book_collection/{document=**} {
    allow read: if
    request.auth != null
}
```

If collection must be read only by the author
```
match /pro-document/{document=**} {
    allow read: if
    request.auth != null &&
    #resource.data.author == request.auth.token.email;
    resource.data.author == request.auth.uid;
}
```

If the collection must be read only by owners
```
match /pro-room-private/{document=**} {
    allow read: if
    request.auth != null && request.auth.uid in resource.data.owners;
}
```

### Add index to allow search

```
[] search, updated (desc), __name__ (desc)
```

Important, when author is constrained, also add:
```
author (asc), updated (desc), __name__ (desc)
[] search, author (asc), updated (desc), __name__ (desc)
```

When using owners

```
[] owners, updated (desc), __name__ (desc)
```

## The Components

After creating the component, configure:
```
npx ng generate component --standalone --skip-tests pages/pug/index-pug
```

### App routing 
Configure file common-front/src/app/app.routes.ts
```
{
    path: 'books_gallery/all',
    loadComponent: () => import('./pages/books/book-collection/book-collection').then(m => m.BookCollection),
},
```

# Adjust a subdomain

### On file app.routes.ts add at bottom:
```
if (["subdomain.pais.tv"].indexOf(location.hostname) >= 0) {
    routes.unshift({
        path: 'pug/detail',
        loadComponent: () => import('./pages/pug/detail-pug/detail-pug').then(m => m.DetailPug),
    });
}
```

### Check on App Engine > Settings > Custom domains:
Add a custom domain: 
subdomain.pais.tv

On the registar add:
CNAME	ghs.googlehosted.com	subdomain

### Remember to adjust the CORS on the infra
variables.tf cors_allowed



## Blender
Select 1. Mesh, then 2. Skeleton, then Ctrl + P -> Armature Deform -> With Automatic Weights
Then to refine:
Change Object Mode to Weight Paint, then select the Data (the triangle in the right panel)
Select every bone and redefine with a brush


```
npm install -g @gltf-transform/cli

# resize all textures to max 1024 and convert to WebP
gltf-transform resize female_dog_joined.glb female_dog_joined2.glb --width 1024 --height 1024
gltf-transform webp female_dog_joined2.glb female_dog_joined3.glb

# or KTX2/Basis compression (GPU-friendly, best for web/three.js)
gltf-transform etc1s out.glb compressed.glb
```