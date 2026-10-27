import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Marked } from 'marked';

const renderer: any = {
  link({ href, text, tokens }: any) {
    return `<a href="${href}" title="${text ?? ''}" target="_blank">${this.parser.parseInline(tokens)}</a>`;
  },
};

const marked = new Marked({ renderer, breaks: true });

@Pipe({
  name: 'markdown',
  standalone: true,
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) { }

  transform(text: string | null | undefined): SafeHtml {
    if (!text) {
      return '';
    }
    const html = marked.parse(text) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
