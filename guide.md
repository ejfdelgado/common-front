
# How to create a new content

## The collection configuration

After creating the component, configure:

### App routing 
Configure file common-front/src/app/app.routes.ts
```
{
    path: 'books_gallery/all',
    loadComponent: () => import('./pages/books/book-collection/book-collection').then(m => m.BookCollection),
},
```


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
match /pro-note/{document=**} {
    allow read: if
    request.auth != null &&
    resource.data.author == request.auth.token.email;
}
```

### Add index to allow search

[] search, updated (desc), __name__ (desc)