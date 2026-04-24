
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

[] search, updated (desc), __name__ (desc)

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
if (["pug.pais.tv"].indexOf(location.hostname) >= 0) {
    routes.unshift({
        path: 'pug/detail',
        loadComponent: () => import('./pages/pug/detail-pug/detail-pug').then(m => m.DetailPug),
    });
}
```

### Check on App Engine > Settings > Custom domains:
Add a custom domain: 
pug.pais.tv

On the registar add:
CNAME	ghs.googlehosted.com	pug

### Remember to adjust the CORS
run.tf CORS_MAIN_ALLOWED_ORIGIN