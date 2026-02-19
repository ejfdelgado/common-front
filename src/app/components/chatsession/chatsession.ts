import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
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
import { AssistantDataType, KnowledgeDataType } from 'types/ragTypes';
import { marked } from 'marked';
import { AlterEgoService, ItemToSearchType, SearchAnswerDataType, SearchLangsType } from '@services/alterego.service';
import { UINotificationSrv } from '@services/uinotifications.service';

const renderer: any = {
  link({ href, raw, text, tokens, type }: any) {
    return `<a href="${href}" title="${text ?? ''}" target="_blank">${text}</a>`;
    return "";
  }
};

marked.use({ renderer });

export interface MessageLocalDataType {
  date: number;
  role: string;
  txt: SafeHtml;
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
  ],
  templateUrl: './chatsession.html',
  styleUrl: './chatsession.scss',
})
export class Chatsession extends CommonComponent implements AfterViewInit {

  @Input() config!: GenerateContentConfig;
  @Input() assistant!: AssistantDataType;
  @Input() lastModified: number = 0;
  @Input() knowledge: KnowledgeDataType[] = [];
  @Input() language: SearchLangsType = "en";
  @Input() top: number = 5;
  @Input() distance: number = 0.3;
  @Input() autowarm: boolean = false;
  @Input() useIndicator: boolean = true;

  @Output() foundFacts: EventEmitter<SearchAnswerDataType> = new EventEmitter();

  loading: number = 0;

  public history: any[] = [];
  public visualHistory: MessageLocalDataType[] = [];
  private initialized: boolean = false;
  query: string = '';
  lastTrained: number = -1;

  @ViewChild('scrolled_container') private scrollContainer!: ElementRef;

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public confirmSrv: ConfirmDialogService,
    public chatSrv: ChatGeminiService,
    public cdr: ChangeDetectorRef,
    private indicatorSrv: IndicatorService,
    public alterEgoSrv: AlterEgoService,
    private uinotificationSrv: UINotificationSrv,
  ) {
    super(sanitizer, fullScreenSrv);
  }
  async ngAfterViewInit(): Promise<void> {
    if (this.autowarm) {
      setTimeout(async () => {
        await this.setup();
      }, 2000);
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

  processVisualInput(input: Content) {
    if (input.parts) {
      input.parts.forEach(async (el, index) => {
        let textMD = el.text ? el.text : "";
        const formated = await marked.parse(textMD);
        this.visualHistory.push({
          date: Date.now() + index,
          role: input.role ? input.role : "na",
          txt: this.sanitizeText(formated),
        });
      });
    }
  }

  clearHistory() {
    this.history = [];
    this.visualHistory = [];
  }

  async ensureLastTrained() {
    if (this.lastTrained != this.lastModified) {
      //train
      const mockData = this.knowledge.map((elem) => {
        const temp: ItemToSearchType = {
          id: elem.id,
          title: elem.txt,
          url: elem.type == "question" && elem.answer ? elem.answer : "",
        };
        return temp;
      });
      const response = await this.alterEgoSrv.initialize(mockData, this.language, this.useIndicator);
      this.lastTrained = this.lastModified;
    }
  }

  async setup() {
    try {
      this.incrementLoading();
      if (!this.initialized) {
        await this.chatSrv.initialize();
      }
      await this.ensureLastTrained();
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
      this.incrementLoading();
      await this.setup();
      // Fecth closest facts
      let retrievedFacts: string[] = [];
      //console.log(`top: ${this.top} distance: ${this.distance} language: ${this.language}`);
      //console.log(JSON.stringify(this.config, null, 4));
      const searchedResult = await this.alterEgoSrv.search(
        userInput,
        this.top,
        this.distance / 100,
        this.language,
        this.useIndicator,
      );
      this.foundFacts.emit(searchedResult);
      if (searchedResult.payload.length > 0) {
        retrievedFacts = searchedResult.payload.map((el) => {
          return el.title;
        });
      }

      // Add user message to local history
      const userInputRaw = { role: "user", parts: [{ text: userInput }] };
      this.processVisualInput(userInputRaw);

      const contextBlock = retrievedFacts.length > 0
        ? `[CONTEXT DATA]\n${retrievedFacts.join("\n")}\n\n[USER QUESTION]\n`
        : "";
      const userMessage: Content = {
        role: "user",
        parts: [{ text: contextBlock + userInput }]
      };

      const usedHistory = [...this.history, userMessage];

      const result = await this.chatSrv.generateContent(usedHistory, this.config);

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

  async handleTools() {
    /*
    const candidate = response.candidates[0];

    // 3. Handle Tool Calls (Function Calls)
    const call = candidate.content.parts.find(p => p.function_call);

    if (call?.function_call) {
      const { name, args } = call.function_call;

      if (name === "send_email") {
        const { recipient, subject, body } = args as any;
        this.openMailClient(recipient, subject, body);

        // Add the tool call and its response to history to maintain context
        this.history.push(candidate.content);
        this.history.push({
          role: "tool",
          parts: [{
            function_response: {
              name: "send_email",
              response: { result: "Success: Mail client opened." }
            }
          }]
        });

        return `I've opened your email app to message ${recipient}.`;
      }
    }
    this.history.push(candidate.content);
    */
  }
}
