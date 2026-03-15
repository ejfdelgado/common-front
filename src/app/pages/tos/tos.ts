import { Component } from '@angular/core';
import { MessageContentType, MessagePage } from '@components/message-page/message-page';

@Component({
  selector: 'app-tos',
  standalone: true,
  imports: [
    MessagePage
  ],
  templateUrl: './tos.html',
  styleUrl: './tos.scss',
})
export class Tos {
  content: MessageContentType = {
    title: "title",
    content: "content",
    footer: "footer",
    actionLabel: "action",
    actionUrl: "",
    urlImage: "https://storage.googleapis.com/pro-ejflab-assets/images/landscape.jpg",
  };
}
