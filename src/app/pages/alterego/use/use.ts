import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Chatsession } from '@components/chatsession/chatsession';
import { GenerateContentConfig } from '@google/genai';
import { SearchAnswerDataType, SearchLangsType } from '@services/alterego.service';
import { FirestoreService } from '@services/firestore.service';
import { FullscreenService } from '@services/fullscreen.service';
import { UINotificationSrv } from '@services/uinotifications.service';
import { getUrlQueryParams } from "@tools/UrlUtil";
import { AssistantDataType, DEF_ASSISTANT_MODEL, KnowledgeDataType } from 'types/ragTypes';

const MODEL_NAME_PARENT_CLONE = "pubknowledge";

@Component({
  selector: 'app-use',
  standalone: true,
  imports: [
    Chatsession,
  ],
  templateUrl: './use.html',
  styleUrl: './use.scss',
})
export class AlterEgoUse implements OnInit {
  language: SearchLangsType = "en";
  top: number = 3;
  distance: number = 10;
  knowledge: KnowledgeDataType[] = [];
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
      this.updateProperties();
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
  }

  receiveSearch(search: SearchAnswerDataType | null) {

  }
}
