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
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { Content, GenerateContentConfig, GenerateContentResponse } from '@google/genai';
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
  MessageLocalDataType,
  CalendarEventType,
  InnerToolResponseType,
} from 'types/ragTypes';
import { marked } from 'marked';
import { UINotificationSrv } from '@services/uinotifications.service';
import { AlterEgoSplash } from './splash/splash';
import { html2text } from '@tools/HtmlUtil';
import { normalizeName } from '@tools/Texts';
import { AlterEgo2Service } from '@services/alteregov2.service';
import { PhotoGallery } from '@components/photo-gallery/photo-gallery';
import { MatDialog } from '@angular/material/dialog';
import { ContactUs } from '@components/contact-us/contact-us';
import { SimpleObj } from 'ejfdelgado-common-ts';
import { environment } from 'environments/environment';
import { ShareSrv } from '@services/share.service';
import { CalendarEvent } from '@components/calendar-event/calendar-event';
import { epochTo } from '@tools/DateUtils';

const MODEL_NAME_CLONE = "pubknowledge";

const renderer: any = {
  link({ href, raw, text, tokens, type }: any) {
    return `<a href="${href}" title="${text ?? ''}" target="_blank">${text}</a>`;
  }
};

marked.use({ renderer });


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
    CalendarEvent,
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
  @Input() autowarm: boolean = true;
  @Input() useIndicator: boolean = true;
  @Input() showSplash: boolean = false;

  @Input() maxHistoryLength: number = 25;

  @Output() foundFacts: EventEmitter<FoundKnowledge[]> = new EventEmitter();
  @Output() foundTools: EventEmitter<ToolDataType[]> = new EventEmitter();
  @Output() foundArticles: EventEmitter<ArticleDataType[]> = new EventEmitter();
  @Output() startSearch: EventEmitter<void> = new EventEmitter();
  @Output() toolStateChange: EventEmitter<string | null> = new EventEmitter();
  @Output() toolModelChange: EventEmitter<any> = new EventEmitter();

  loading: number = 0;

  public history: any[] = [];
  public visualHistory: MessageLocalDataType[] = [];
  private initialized: boolean = false;
  query: string = '';
  lastTrained: number = -1;
  mdAssistanteDescription: string = "";

  toolModel: any = {};
  toolState: string | null = null;

  timeOffset: number = 0;

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
    public shareSrv: ShareSrv,
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

  processFiredTools(
    input: Content,
    toolsStatus: ToolResponseType[],
  ): ToolDataType[] {
    const toolsFired: ToolDataType[] = [];
    let toolsStatusIndex = 0;
    if (input.parts) {
      input.parts.forEach(async (el, index) => {
        if (el.functionCall) {
          const responseRef = toolsStatus[toolsStatusIndex];
          // Search on tools what to answer
          const name = el.functionCall.name;
          const args = el.functionCall.args;
          if (name && args) {
            // Make a copy of the tool
            const toolRef = JSON.parse(JSON.stringify(this.searchNamedTool(name))) as ToolDataType | null;
            if (toolRef) {
              // Set message
              if (responseRef) {
                toolRef.message = responseRef.message;
              }

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
          toolsStatusIndex++;
        }
      });
    }
    return toolsFired;
  }

  processVisualInput(input: Content): void {
    if (input.parts) {
      input.parts.forEach(async (el, index) => {
        if (el.functionResponse) {
          const response = el.functionResponse.response;
          if (response) {
            const result = response['result'];
            if (typeof result == "string") {
              this.visualHistory.push({
                date: Date.now() + index + this.timeOffset,
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
    }
  }

  clearHistory() {
    this.history = [];
    this.visualHistory = [];
    this.toolState = null;
    this.toolModel = {};
    this.useFirstMessage();
    this.notifyToolModelChange();
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
        this.useFirstMessage();
        this.notifyToolModelChange();
        this.initialized = true;
      }
    } catch (err: any) {
      this.uinotificationSrv.show(`Error: ${err.message}`);
      throw err;
    } finally {
      this.decrementLoading();
    }
  }

  useFirstMessage() {
    if (typeof this.assistant.startConversation == "string" && this.assistant.startConversation.trim().length > 0) {
      this.visualHistory.push({
        date: Date.now() - 1,
        role: "tool",
        txt: this.assistant.startConversation,
      });
      this.history.push({
        role: "model",
        parts: [{ text: this.assistant.startConversation }]
      });
    }
  }

  async sendMessageInternal(userInput: string): Promise<void> {
    let indicator: Wait | null = null;
    if (this.useIndicator) {
      indicator = this.indicatorSrv.start();
    }
    try {
      this.timeOffset = 0;
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

      // Clean
      this.foundArticles.emit([]);
      this.foundTools.emit([]);

      const {
        result,
        toolsStatus,
        searchedResult,
      } = await this.chatSrv.generateContent(
        this.getLimitedHistory(),
        extra,
        this.config,
        this.assistant.author,
        this.getEnabledTools(),
        {
          model: this.toolModel,
          state: this.toolState,
        },
        this.assistant.useFacts,
      );

      this.history.push({
        role: "user",
        parts: [{ text: userInput }]
      });

      await this.interpretThis(result, toolsStatus, searchedResult);

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

  async interpretThis(
    result: GenerateContentResponse[],
    toolsStatus: ToolResponseType[],
    searchedResult: FoundKnowledge[],
  ) {
    this.foundFacts.emit(searchedResult);

    const articleUnion: ArticleDataType[] = [];
    const toolsUnion: ToolDataType[] = [];
    let modelChanges: number = 0;

    // Gater tools matches...
    result.forEach((result) => {
      if (result && result.candidates && result.candidates.length > 0) {
        const assistantMessage: Content = {
          role: "model",
          parts: result.candidates[0].content?.parts?.map((el) => el),
        };
        // Assign val on args
        const temp = this.processFiredTools(assistantMessage, toolsStatus);
        toolsUnion.push(...temp);

        // Affect inner model...
        temp.forEach((toolRef) => {
          if (toolRef.affectModel === true) {
            // Adjust model
            toolRef.args.forEach((arg) => {
              const path = arg.modelPath;
              if (path && path.trim().length > 0) {
                if (arg.modelIsArray === true) {
                  // First read to get index where to place the val
                  const old = SimpleObj.getValue(this.toolModel, path, []);
                  //console.log("Adjust model", `${path}.${old.length}`, arg.val);
                  SimpleObj.recreate(this.toolModel, `${path}.${old.length}`, arg.val);
                  modelChanges++;
                } else {
                  // Just write
                  //console.log("Adjust model", path, arg.val);
                  SimpleObj.recreate(this.toolModel, path, arg.val);
                  modelChanges++;
                }
              }
            });
          }
        });
      }
    });

    // Interpret tools
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
      // Display gallery if needed
      if (tool.articles) {
        tool.articles.forEach((article) => {
          articleUnion.push(article);
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
      // Display events if needed
      if (tool.events) {
        this.visualHistory.push({
          date: Date.now() - 1,
          role: "tool",
          txt: "",
          events: tool.events,
        });
      }

      if (
        (typeof tool.message == "string" && tool.message.length > 0)
        || (tool.message as InnerToolResponseType).data != undefined
      ) {
        this.timeOffset++;
        if (tool.hidden !== true) {
          // Display text if needed
          this.processVisualInput(toolMessage);
        }
        this.history.push(toolMessage);
      }
      // Adjust state
      const toolRef = this.searchNamedTool(standardName);
      //console.log(tool.name, standardName, toolRef);
      if (toolRef) {
        if (toolRef.useStates === true) {
          if (typeof toolRef.nextState == "string" && toolRef.nextState.trim().length > 0) {
            // Apply next state
            this.toolState = toolRef.nextState.trim();
          }
        }
      }
    });
    // Display messages
    result.forEach((result) => {
      if (result && result.candidates && result.candidates.length > 0) {
        const assistantMessage: Content = {
          role: "model",
          parts: result.candidates[0].content?.parts?.map((el) => el),
        };
        this.timeOffset++;
        this.processVisualInput(assistantMessage);
        this.history.push(assistantMessage);
      }
    });
    // emit
    if (articleUnion.length > 0) {
      this.foundArticles.emit(articleUnion);
    }
    if (toolsUnion.length > 0) {
      this.foundTools.emit(toolsUnion);
    }
    if (modelChanges > 0) {
      this.notifyToolModelChange();
    }

    this.query = "";
  }

  async sendMessage() {
    if (this.query.trim().length == 0) {
      return;
    }
    if (this.loading > 0) {
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
        allowOpen: this.assistant.id != environment.contactUsAssistant,
      },
    });
    dialogRef.afterClosed().subscribe(async (sent) => {
      // Show a notification
      if (sent) {
        this.uinotificationSrv.show("Te estaremos contactando!");
      }
    });
  }

  setToolState(state: string | null) {
    this.toolState = state;
    this.toolStateChange.emit(state);
  }

  notifyToolModelChange() {
    this.toolModelChange.emit(this.toolModel);
  }

  parseStates(t: ToolDataType): string[] {
    if (t.useInState === undefined || t.useInState == null || t.useStates !== true) {
      return [""];
    }
    return t.useInState.split(/[,;]/).map(a => a.trim());
  }

  getEnabledTools() {
    return this.tools.filter((t) => {
      const states = this.parseStates(t);
      if (this.toolState == null) {
        return states.indexOf("") >= 0;
      } else {
        return states.indexOf(this.toolState) >= 0;
      }
    });
  }

  getLimitedHistory() {
    return this.history.slice(-1 * this.assistant.maxHistory);
  }

  shareFun() {
    const temp: any = {
      collection: MODEL_NAME_CLONE,
      path: "/alterego/use",
      ...this.assistant
    };
    this.shareSrv.share(temp, "link");
  }

  selectThisEvent(event: CalendarEventType) {
    const millis = new Date(event.start.dateTime).getTime();
    const texto = epochTo(millis, "v5");
    this.sendMessageInternal(`**${texto}**`);
  }
}
