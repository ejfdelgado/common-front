import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input } from '@angular/core';
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
import { Content, GenerateContentConfig } from '@google/genai';
import { ChatGeminiService } from '@services/chat-gemini.service';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { FullscreenService } from '@services/fullscreen.service';
import { IndicatorService } from '@services/indicator.service';
import { AssistantDataType } from 'app/pages/alterego/main/main';

export interface MessageLocalDataType {
  date: number;
  role: string;
  txt: string;
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
export class Chatsession extends CommonComponent {

  @Input() config!: GenerateContentConfig;
  @Input() assistant!: AssistantDataType;
  public history: any[] = [];
  public visualHistory: MessageLocalDataType[] = [];
  private initialized: boolean = false;
  query: string = '';

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public confirmSrv: ConfirmDialogService,
    public chatSrv: ChatGeminiService,
    public cdr: ChangeDetectorRef,
    private indicatorSrv: IndicatorService,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  processVisualInput(input: Content) {
    this.history.push(input);
    if (input.parts) {
      input.parts.forEach((el, index) => {
        this.visualHistory.push({
          date: Date.now() + index,
          role: input.role ? input.role : "na",
          txt: el.text ? el.text : "",
        });
      });
    }
  }

  async sendMessageInternal(userInput: string): Promise<string | null> {
    const indicator = this.indicatorSrv.start();
    try {
      if (!this.initialized) {
        await this.chatSrv.initialize();
      }
      // Add user message to local history
      const userInputRaw = { role: "user", parts: [{ text: userInput }] };
      this.processVisualInput(userInputRaw);

      const result = await this.chatSrv.generateContent(this.history, this.config);

      if (result && result.text) {
        const textResponse = result.text;
        const assistantMessage: Content = {
          role: "model",
          parts: [{ text: textResponse }]
        };
        this.processVisualInput(assistantMessage);
        this.query = "";
        return textResponse;
      }
      return null;
    } catch (err: any) {
      throw err;
    } finally {
      indicator.done();
    }
  }

  async sendMessage() {
    if (this.query.trim().length == 0) {
      return;
    }
    const response = await this.sendMessageInternal(this.query);
    console.log(response);
    this.cdr.detectChanges();
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
