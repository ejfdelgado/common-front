import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Chatsession } from '@components/chatsession/chatsession';
import { GenerateContentConfig } from '@google/genai';
import { FileService } from '@services/file.srv';
import { FirestoreService } from '@services/firestore.service';
import { UINotificationSrv } from '@services/uinotifications.service';
import { getUrlQueryParams } from "@tools/UrlUtil";
import {
  AssistantDataType,
  DEF_ASSISTANT_MODEL,
  FoundKnowledge,
  KnowledgeDataType,
  SearchLangsType,
  ToolDataType,
} from 'types/ragTypes';
import { decode } from '@msgpack/msgpack';
import { AlterEgoSplash } from '@components/chatsession/splash/splash';
import { CommonModule } from '@angular/common';
import { Base64 } from '@tools/Base64';
import { getClientRef } from '../common';

const MODEL_NAME_PARENT_CLONE = "pubknowledge";

@Component({
  selector: 'app-use',
  standalone: true,
  imports: [
    CommonModule,
    Chatsession,
    AlterEgoSplash,
  ],
  templateUrl: './use.html',
  styleUrl: './use.scss',
})
export class AlterEgoUse implements OnInit {
  language: SearchLangsType = "en";
  top: number = 3;
  distance: number = 10;
  knowledge: KnowledgeDataType[] = [];
  tools: ToolDataType[] | null = null;
  collection: AssistantDataType | null = null;
  lastModified: number = 0;
  chatConfig: GenerateContentConfig = {
    systemInstruction: "You are an assistant giving some information",
    tools: [],
  }

  constructor(
    public cdr: ChangeDetectorRef,
    private firestoreSrv: FirestoreService,
    private uinotificationSrv: UINotificationSrv,
    private fileSrv: FileService,
  ) {
  }
  async ngOnInit(): Promise<void> {
    try {
      const params = getUrlQueryParams();
      const id = params.get("id");
      if (!id) {
        throw new Error("Invalid assistant");
      }
      this.collection = (await this.firestoreSrv.readById(MODEL_NAME_PARENT_CLONE, id) as any);
      if (!this.collection) {
        throw new Error("The assistant is not published yet");
      }
      document.title = this.collection.title;
      this.cdr.detectChanges();
      this.updateProperties();
      if (!this.collection.knowledge_path) {
        throw new Error("The assistant is not well configured");
      }
      const knowledgeBin = await this.fileSrv.getBinary(this.collection.knowledge_path);
      const { tools } = decode(knowledgeBin) as any;
      this.tools = tools;
      this.cdr.detectChanges();
    } catch (err: any) {
      this.uinotificationSrv.show(`Error: ${err.message}`);
    }
  }



  updateProperties() {
    const withDefaults = Object.assign({}, DEF_ASSISTANT_MODEL, this.collection);
    this.top = withDefaults.top;
    this.distance = withDefaults.distance;
    this.language = withDefaults.language;
    this.chatConfig.systemInstruction = withDefaults.instruct;
    this.chatConfig.maxOutputTokens = withDefaults.maxOutputTokens;
    this.chatConfig.temperature = withDefaults.temperature;

    // Add extra data:
    const ref = getClientRef(false);
    if (ref) {
      this.chatConfig.systemInstruction += "\n\nHint: Information about the current user: ";
      this.chatConfig.systemInstruction += JSON.stringify(ref.decoded);
    }

  }

  receiveSearch(search: FoundKnowledge[]) {

  }
}
