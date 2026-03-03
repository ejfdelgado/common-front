import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { Content, GenerateContentConfig } from '@google/genai';
import { ChatGeminiService } from '@services/chat-gemini.service';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { FullscreenService } from '@services/fullscreen.service';
import { IndicatorService, Wait } from '@services/indicator.service';
import {
  AssistantDataType,
  KnowledgeDataType,
  SearchLangsType,
  ToolDataType,
  ToolResponseType,
  QueryChatType,
  FoundKnowledge,
  ArticleDataType,
} from 'types/ragTypes';
import { marked } from 'marked';
import { UINotificationSrv } from '@services/uinotifications.service';
import { AlterEgoSplash } from './splash/splash';
import { html2text } from '@tools/HtmlUtil';
import { normalizeName } from '@tools/Texts';
import { AlterEgo2Service } from '@services/alteregov2.service';
import { ImageGalleryType } from 'types/fieldsTypes';
import { PhotoGallery } from '@components/photo-gallery/photo-gallery';
import { MatDialog } from '@angular/material/dialog';
import { ContactUs } from '@components/contact-us/contact-us';

const renderer: any = {
  link({ href, raw, text, tokens, type }: any) {
    return `<a href="${href}" title="${text ?? ''}" target="_blank">${text}</a>`;
  }
};

marked.use({ renderer });

export interface MessageLocalDataType {
  date: number;
  role: string;
  txt: SafeHtml;
  gallery?: ImageGalleryType[];
};

@Component({
  selector: 'app-chatsession',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    AlterEgoSplash,
    PhotoGallery,
  ],
  templateUrl: './chatsession.html',
  styleUrl: './chatsession.scss',
})
export class Chatsession extends CommonComponent implements AfterViewInit {

  @Input() config!: GenerateContentConfig;
  @Input() assistant!: AssistantDataType;
  @Input() lastModified: number = 0;
  @Input() knowledge: KnowledgeDataType[] = [];
  @Input() tools: ToolDataType[] = [];
  @Input() language: SearchLangsType = "en";
  @Input() top: number = 5;
  @Input() distance: number = 0.3;
  @Input() autowarm: boolean = false;
  @Input() useIndicator: boolean = true;
  @Input() showSplash: boolean = false;

  @Output() foundFacts: EventEmitter<FoundKnowledge[]> = new EventEmitter();
  @Output() foundTools: EventEmitter<ToolDataType[]> = new EventEmitter();
  @Output() foundArticles: EventEmitter<ArticleDataType[]> = new EventEmitter();
  @Output() startSearch: EventEmitter<void> = new EventEmitter();

  loading: number = 0;

  public history: any[] = [];
  public visualHistory: MessageLocalDataType[] = [];
  private initialized: boolean = false;
  query: string = '';
  lastTrained: number = -1;
  mdAssistanteDescription: string = "";

  @ViewChild('scrolled_container') private scrollContainer!: ElementRef;

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public confirmSrv: ConfirmDialogService,
    public chatSrv: ChatGeminiService,
    public cdr: ChangeDetectorRef,
    public alterEgo2Srv: AlterEgo2Service,
    private indicatorSrv: IndicatorService,
    private uinotificationSrv: UINotificationSrv,
    private dialog: MatDialog,
  ) {
    super(sanitizer, fullScreenSrv);
  }
  async ngAfterViewInit(): Promise<void> {
    if (this.autowarm) {
      await this.setup();
      this.cdr.detectChanges();
    }
  }

  incrementLoading() {
    this.loading += 1;
    this.cdr.detectChanges();
  }

  decrementLoading() {
    this.loading -= 1;
    this.cdr.detectChanges();
  }

  searchNamedTool(simpleName: string): ToolDataType | null {
    for (let i = 0; i < this.tools.length; i++) {
      const tool = this.tools[i];
      const normalizedName = normalizeName(tool.name);
      if (normalizedName == simpleName) {
        return tool;
      }
    }
    return null;
  }

  processVisualInput(input: Content, emitTools: boolean = true) {
    if (input.parts) {
      const toolsFired: ToolDataType[] = [];
      input.parts.forEach(async (el, index) => {
        if (el.functionCall) {
          // Search on tools what to answer
          const name = el.functionCall.name;
          const args = el.functionCall.args;
          if (name && args) {
            const toolRef = this.searchNamedTool(name);
            if (toolRef) {
              // Set found values
              Object.keys(args).forEach((key) => {
                const argsFound = toolRef.args.filter((arg) => normalizeName(arg.name) == key);
                if (argsFound.length > 0) {
                  argsFound[0].val = args[key];
                }
              });
              toolsFired.push(toolRef);
            }
          }
        }
        if (el.functionResponse) {
          const response = el.functionResponse.response;
          if (response) {
            const result = response['result'];
            if (typeof result == "string") {
              this.visualHistory.push({
                date: Date.now() + index,
                role: input.role ? input.role : "na",
                txt: this.sanitizeText(result),
              });
            }
          }
        }
        if (el.text) {
          let textMD = el.text;
          const formated = await marked.parse(textMD);
          this.visualHistory.push({
            date: Date.now() + index,
            role: input.role ? input.role : "na",
            txt: this.sanitizeText(formated),
          });
        }
      });
      // Tools could be empty, but it needs to be fired
      if (emitTools) {
        requestAnimationFrame(() => {
          this.foundTools.emit(toolsFired);
        });
      }
    }
  }

  clearHistory() {
    this.history = [];
    this.visualHistory = [];
  }

  md2plain(md: string) {
    const htmlText = marked.parse(md) as string;
    const plainText = html2text(htmlText);
    return plainText;
  }

  async setup() {
    try {
      this.incrementLoading();
      if (!this.initialized) {
        await this.chatSrv.initialize();
      }

    } catch (err: any) {
      this.uinotificationSrv.show(`Error: ${err.message}`);
      throw err;
    } finally {
      this.decrementLoading();
    }
  }

  async sendMessageInternal(userInput: string): Promise<void> {
    let indicator: Wait | null = null;
    if (this.useIndicator) {
      indicator = this.indicatorSrv.start();
    }
    try {
      this.startSearch.emit();
      this.incrementLoading();
      await this.setup();
      // Fecth closest facts

      // Add user message to local history
      const userInputRaw = { role: "user", parts: [{ text: userInput }] };
      this.processVisualInput(userInputRaw);

      const extra: QueryChatType = {
        q: userInput,
        assistantId: this.assistant.id,
        distance: this.distance / 100,
        language: this.language,
        top: this.top,
      };

      const { result, toolsStatus, searchedResult } = await this.chatSrv.generateContent(this.history, extra, this.config, this.assistant.author, this.tools);

      this.foundFacts.emit(searchedResult);

      this.history.push({
        role: "user",
        parts: [{ text: userInput }]
      });

      if (result && result.candidates && result.candidates.length > 0) {
        const assistantMessage: Content = {
          role: "model",
          parts: result.candidates[0].content?.parts?.map((el) => el),
        };
        this.processVisualInput(assistantMessage);
        this.history.push(assistantMessage);
        // Add response and process visual Input
        // Is it necesary to keep assistantMessage.parts[0].thoughtSignature ??
        toolsStatus.forEach((tool: ToolResponseType) => {
          const standardName = normalizeName(tool.name);
          const toolMessage: Content = {
            role: "tool",
            parts: [{
              functionResponse: {
                name: standardName,
                response: { result: tool.message }
              }
            }]
          };
          //const toolRef = this.searchNamedTool(standardName);
          //console.log(JSON.stringify(toolRef, null, 4));
          if (tool.articles) {
            this.foundArticles.emit(tool.articles);
            tool.articles.forEach((article) => {
              if (article.gallery && article.gallery.length > 0) {
                this.visualHistory.push({
                  date: Date.now() - 1,
                  role: "tool",
                  txt: "",
                  gallery: article.gallery
                });
              }
            });
          }
          this.processVisualInput(toolMessage, false);
          this.history.push(toolMessage);

        });

        this.query = "";
      }


    } catch (err: any) {
      this.uinotificationSrv.show(`Error: ${err.message}`);
      throw err;
    } finally {
      if (indicator) {
        indicator.done();
      }
      this.decrementLoading();
      requestAnimationFrame(() => {
        this.scrollToBottom();
      });
    }
  }

  async sendMessage() {
    if (this.query.trim().length == 0) {
      return;
    }
    await this.sendMessageInternal(this.query);
    this.cdr.detectChanges();
  }

  scrollToBottom(): void {
    const element = this.scrollContainer.nativeElement;
    element.scrollTop = element.scrollHeight;
  }

  contactUs() {
    const dialogRef = this.dialog.open(ContactUs, {
      width: '400px',
      panelClass: 'custom-emoji-picker',
      autoFocus: !this.isMobile(),
      data: {
      },
    });
    dialogRef.afterClosed().subscribe(async (sent) => {
      // Show a notification
      if (sent) {
        this.uinotificationSrv.show("Gracias por contactarnos!");
      }
    });
  }
}
