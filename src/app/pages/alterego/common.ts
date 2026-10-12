import { DomSanitizer } from '@angular/platform-browser';
import { Base64 } from '@tools/Base64';
import { getUrlQueryParams } from '@tools/UrlUtil';

export function getClientRef(useLocalStorage: boolean = true) {
  const params = getUrlQueryParams();
  const ref = params.get('ref');
  const oldLocal = localStorage.getItem('ref');
  if (typeof ref == 'string' && ref.length > 0) {
    const decoded = JSON.parse(Base64.decode(ref));
    localStorage.setItem('ref', ref);
    if (useLocalStorage) {
      // Remove from url
      window.history.replaceState({}, '', '/#/');
    }
    return { decoded, ref };
  } else if (oldLocal) {
    if (!useLocalStorage) {
      return null;
    }
    const decoded = JSON.parse(Base64.decode(oldLocal));
    return { decoded, ref: oldLocal };
  }
  return null;
}

export function getAssistanteIframeSrc(id: string, sanitizer: DomSanitizer) {
  const ref = getClientRef();
  let host = `${location.origin}/#/alterego/use?col=pubknowledge`;
  let base = `${host}&id=${id}&origin=${encodeURIComponent(location.origin)}`;
  if (ref) {
    base = `${base}&mode=embedded&ref=${ref.ref}`;
  } else {
    base = `${base}&mode=embedded`;
  }
  return sanitizer.bypassSecurityTrustResourceUrl(base);
}
