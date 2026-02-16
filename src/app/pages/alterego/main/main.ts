import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { AlterEgoService, ItemToSearchType, SearchLangsType } from '@services/alterego.service';
import { AuthService } from '@services/auth.service';
import { FullscreenService } from '@services/fullscreen.service';
import { Subscription } from 'rxjs';
import { MenuOptionType } from 'types/StatusBar';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { SearchInputComponent } from '@components/search-input/search-input';
import { EpochDatePipe } from '@pipes/epoch-date.pipe';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { AllFieldsDataType } from 'types/fieldsTypes';
import { FormSimpleWithout } from '@components/form-simple/form-simple-without';
import { ChangeFieldType, FlatJsonDataType } from '@components/form-simple/form-simple';
import { marked } from 'marked';
import { html2text } from '@tools/HtmlUtil';
import { Router } from '@angular/router';
import { IndicatorService } from '@services/indicator.service';
import { BasicDataType, FirestoreService, PageDataType, SimpleDataType } from '@services/firestore.service';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { UINotificationSrv } from '@services/uinotifications.service';

const MODEL_NAME = "fact";

export interface KnowledgeTagType {
  id: string;
  txt: string;
};

export interface KnowledgeDataType extends SimpleDataType {
  type: "fact" | "question";
  txt: string;
  txtFormat: string;
  answer?: string;
  answerFormat?: string;
  created: number;
  tags?: KnowledgeTagType[];
};

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    Statusbar,
    SideMenu,
    MatCardModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    SearchInputComponent,
    EpochDatePipe,
    FormSimpleWithout,
  ],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class AlterEgoMain extends AuthenticatedComponent implements OnInit, OnDestroy {

  @ViewChild('sidenav') sidenav!: MatSidenav;

  menuOptions: MenuOptionType[] = [];
  authSubscription: Subscription | null = null;
  language: SearchLangsType = "es";
  knowledge: KnowledgeDataType[] = [];
  currentSelected: KnowledgeDataType | null = null;
  collection: BasicDataType | null = null;
  pendingToSave: KnowledgeDataType[] = [];

  fields: AllFieldsDataType[] = [];
  model: FlatJsonDataType = {
    "txt": []
  };

  constructor(
    public override authSrv: AuthService,
    public override cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public alterEgoSrv: AlterEgoService,
    public confirmSrv: ConfirmDialogService,
    private router: Router,
    private indicatorSrv: IndicatorService,
    private firestoreSrv: FirestoreService,
    private uiNotificationSrv: UINotificationSrv,
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);

    this.menuOptions.push({
      label: "Back to databases",
      icon: "arrow_back",
      children: [],
      callback: () => {
        this.router.navigate([`alterego/index`], {
          queryParams: {}
        });
      },
    });

    this.menuOptions.push({
      label: "Train model",
      icon: "psychology",
      children: [],
      callback: () => {
        this.initialize();
      },
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.loadCollection();
      await this.pageAll();
      this.selectItem(0);
    } catch (err: any) {
      this.uiNotificationSrv.show(err.message);
    }
  }

  getTitle(): string {
    if (!this.collection) {
      return "Database";
    } else {
      return this.collection.title;
    }
  }

  async loadCollection() {
    const params = getUrlQueryParams();
    const col = params.get("col");
    const id = params.get("id");
    if (col && id) {
      const temp = await this.firestoreSrv.readById(col, id);
      if (temp) {
        this.collection = temp as BasicDataType;
      } else {
        this.collection = null;
      }
      this.cdr.detectChanges();
    }
  }

  selectItem(index: number) {
    this.currentSelected = null;
    this.fields = [];
    if (this.knowledge.length <= index || index < 0) {
      this.cdr.detectChanges();
      return;
    }

    requestAnimationFrame(() => {
      this.currentSelected = this.knowledge[index];
      const isQuestion = this.currentSelected.type == 'question';
      this.fields = [
        { label: "Is question?", type: "toggle", key: "type" },
        { label: "Knowledge", type: "md", key: "txtFormat", md: { maxHeight: "200px", minHeight: "200px" } },
      ];
      if (isQuestion) {
        this.fields.push({ label: "Answer", type: "md", key: "answerFormat", md: { maxHeight: "200px", minHeight: "200px" } },)
      }
      this.model['type'] = isQuestion;
      this.model["txtFormat"] = this.currentSelected.txtFormat;
      this.model["answerFormat"] = this.currentSelected.answerFormat;
      this.cdr.detectChanges();
    });
  }

  toggle() {
    this.sidenav.toggle();
  }

  async initialize() {
    const mockData = this.knowledge.map((elem) => {
      const temp: ItemToSearchType = {
        id: elem.id,
        title: elem.txt,
        url: elem.type == "question" && elem.answer ? elem.answer : "",
      };
      return temp;
    });
    const response = await this.alterEgoSrv.initialize(mockData, this.language);
  }

  async search() {
    const response = await this.alterEgoSrv.search('Necesito saber de desarrollo de software', this.language);
    console.log(JSON.stringify(response, null, 4));
  }

  async echo() {
    const response = await this.alterEgoSrv.echo();
    console.log(JSON.stringify(response));
  }

  async searchKnowledge(event: any) {

  }

  selectThisKnowledge(item: KnowledgeDataType) {
    const index = this.knowledge.indexOf(item);
    this.selectItem(index);
  }

  async deleteKnowledge(item: KnowledgeDataType, event: any) {
    event.preventDefault();
    const confirm = await this.confirmSrv.confirm({
      title: "Sure?",
      message: "This action can't be undone",
    });
    if (!confirm) {
      return;
    }
    try {
      const index = this.knowledge.indexOf(item);
      // Delete from database
      await this.firestoreSrv.delete(this.getCollectionName(), item.id);
      this.knowledge.splice(index, 1);
      if (this.knowledge.length > 0) {
        if (index == 0) {
          this.selectItem(0);
        } else {
          this.selectItem(index - 1);
        }
      } else {
        this.selectItem(-1);
      }
    } catch (err: any) {
      this.uiNotificationSrv.show(err.message);
    }
  }

  getCollectionName() {
    const params = getUrlQueryParams();
    const id = params.get("id");
    if (!id) {
      throw new Error("Missed parent");
    }
    return `knowledge/${id}/${MODEL_NAME}`;
  }

  async addKnowledge() {
    const created: KnowledgeDataType = {
      created: 0,
      updated: 0,
      txt: "This is a new knowledge",
      txtFormat: "This is a new knowledge",
      type: 'fact',
      id: "",
    };
    // Call to create
    const createdId = await this.firestoreSrv.createUpdate(this.getCollectionName(), created, {
      autoAuthor: false,
      useAuthor: false,
      autoOwner: false,
      searchFields: [],
    });
    created.id = createdId.id;
    created.created = createdId.created;
    this.knowledge.unshift(created);
    this.selectItem(0);
  }

  updateCurrentModel() {

  }

  indexOfNamedFieldAnswer(name: string) {
    const el = this.fields.filter((el) => el.key == name);
    if (el.length > 0) {
      return this.fields.indexOf(el[0]);
    } else {
      return -1;
    }
  }

  async editionMade(event: ChangeFieldType) {
    let hasChanged: boolean = false;

    if (event.name == "txtFormat") {
      const txt = event.val;
      const htmlText = await marked.parse(txt);
      if (this.currentSelected) {
        this.currentSelected.txtFormat = txt;
        this.currentSelected.txt = html2text(htmlText);
      }
    } else if (event.name == "answerFormat") {
      const answer = event.val;
      const htmlAnswer = await marked.parse(answer);
      if (this.currentSelected) {
        this.currentSelected.answerFormat = answer;
        this.currentSelected.answer = html2text(htmlAnswer);
      }
    } else if (event.name == 'type') {
      if (this.currentSelected) {
        if (event.val === true) {
          this.currentSelected.type = "question";
          const index = this.indexOfNamedFieldAnswer("answerFormat");
          if (index < 0) {
            hasChanged = true;
          }
        } else {
          this.currentSelected.type = "fact";
          const index = this.indexOfNamedFieldAnswer("answerFormat");
          if (index >= 0) {
            hasChanged = true;
          }
        }
      }
    }
    if (this.currentSelected) {
      if (this.pendingToSave.indexOf(this.currentSelected) < 0) {
        this.pendingToSave.push(this.currentSelected);
      }
    }
    if (hasChanged) {
      if (this.currentSelected) {
        this.selectItem(this.knowledge.indexOf(this.currentSelected));
      }
    }

  }

  async pageAll() {
    let isFirstTime: boolean = true;
    let responses: BasicDataType[] = [];
    const LIMIT = 100;
    do {
      responses = await this.pageFacts(LIMIT, isFirstTime);
      isFirstTime = false;
    } while (responses.length > 0);
  }

  async pageFacts(limit: number, startover: boolean = false): Promise<BasicDataType[]> {
    const indicator = this.indicatorSrv.start();
    try {
      if (startover && this.knowledge.length > 0) {
        this.knowledge.splice(0, this.knowledge.length);
      }
      const pagingOptions: PageDataType = {
        collectionName: this.getCollectionName(),
        orderColumn: "created",
        orderDirection: "desc",
        top: limit,
      };
      if (!startover) {
        if (this.knowledge.length > 0) {
          pagingOptions.lastDoc = this.knowledge[this.knowledge.length - 1];
        }
      }
      const page = (await this.firestoreSrv.paging(pagingOptions));
      this.knowledge.push(...(page as any[]));
      this.cdr.detectChanges();
      return page;
    } catch (err: any) {
      this.uiNotificationSrv.show(err.message);
      return [];
    } finally {
      indicator.done();
    }
  }

  async savePending() {
    try {
      do {
        const first = this.pendingToSave[0];
        await this.firestoreSrv.createUpdate(this.getCollectionName(), first);
        this.pendingToSave.splice(0, 1);
      } while (this.pendingToSave.length > 0);
    } catch (err: any) {
      this.uiNotificationSrv.show(err.message);
    } finally {
      this.cdr.detectChanges();
    }
  }
}
