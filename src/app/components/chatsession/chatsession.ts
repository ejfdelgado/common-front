import { Component, Input } from '@angular/core';
import { GenerateContentConfig } from '@google/genai';
import { ChatGeminiService } from '@services/chat-gemini.service';

@Component({
  selector: 'app-chatsession',
  imports: [],
  templateUrl: './chatsession.html',
  styleUrl: './chatsession.scss',
})
export class Chatsession {

  @Input() config!: GenerateContentConfig;
  private history: any[] = [];
  private initialized: boolean = false;

  constructor(
    public chatSrv: ChatGeminiService,
  ) {

  }

  async sendMessage(userInput: string): Promise<string | null> {
    if (!this.initialized) {
      await this.chatSrv.initialize();
    }
    // Add user message to local history
    this.history.push({ role: "user", parts: [{ text: userInput }] });

    const result = await this.chatSrv.generateContent(this.history, this.config);

    if (result && result.text) {
      const textResponse = result.text;
      return textResponse;
    }
    return null;
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
