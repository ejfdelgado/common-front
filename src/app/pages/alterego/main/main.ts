import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { AuthService } from '@services/auth.service';
import { FullscreenService } from '@services/fullscreen.service';
import { map, Observable, shareReplay, Subscription } from 'rxjs';
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
import { Router } from '@angular/router';
import { IndicatorService } from '@services/indicator.service';
import { BasicDataType, FirestoreService, PageDataType } from '@services/firestore.service';
import { getUrlQueryParams } from '@tools/UrlUtil';
import { UINotificationSrv } from '@services/uinotifications.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { Chatsession } from '@components/chatsession/chatsession';
import { GenerateContentConfig, Type } from '@google/genai';
import {
  AssistantDataType,
  KnowledgeDataType,
  DEF_ASSISTANT_MODEL,
  SearchLangsType,
  ToolDataType,
  ArgumentDataType,
  DropDownOptionDataType,
  ArticleDataType,
  FactCursorDataType,
  FoundKnowledge
} from 'types/ragTypes';
import { DialogFormComponent, FormDataType } from '@components/dialog-form/dialog-form.component';
import { MatDialog } from '@angular/material/dialog';
import { PublishDialogComponent } from '@components/publish-dialog/publish-dialog';
import { getBucketPath } from '@tools/BucketPaths';
import { encode } from '@msgpack/msgpack';
import { FileService } from '@services/file.srv';
import { BucketOptionsType } from '@services/bucket.service';
import { ShareSrv } from '@services/share.service';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AlterEgo2Service } from '@services/alteregov2.service';

const MODEL_NAME = "fact";
const MODEL_TOOL_NAME = "tool";
const MODEL_ARTICLE_NAME = "article";
const MODEL_NAME_PARENT = "knowledge";
const MODEL_NAME_PARENT_CLONE = "pubknowledge";

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
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    Chatsession,
    MatTabsModule,
    MatCheckboxModule
  ],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class AlterEgoMain extends AuthenticatedComponent implements OnInit, OnDestroy {

  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild('sidenavTools') sidenavTools!: MatSidenav;
  @ViewChild('article_form') articleForm!: FormSimpleWithout;

  menuOptions: MenuOptionType[] = [];
  authSubscription: Subscription | null = null;
  language: SearchLangsType = "en";
  top: number = 3;
  distance: number = 10;
  knowledge: KnowledgeDataType[] = [];
  tools: ToolDataType[] = [];
  articles: ArticleDataType[] = [];
  currentSelected: KnowledgeDataType | null = null;
  currentToolSelected: ToolDataType | null = null;
  currentArticleSelected: ArticleDataType | null = null;
  collection: AssistantDataType | null = null;
  pendingToSave: KnowledgeDataType[] = [];
  toolsPendingToSave: ToolDataType[] = [];
  articlesPendingToSave: ArticleDataType[] = [];
  searchedResult: FoundKnowledge[] = [];
  searchedToolsResult: ToolDataType[] = [];
  searchedArticleResult: ArticleDataType[] = [];
  lastModified: number = 0;

  argumentTypes: DropDownOptionDataType[] = [
    { val: Type.STRING, txt: "Text" },
    { val: Type.BOOLEAN, txt: "Yes/No" },
    { val: Type.INTEGER, txt: "Integer" },
    { val: Type.NUMBER, txt: "Number" },
  ]

  isHandset$!: Observable<boolean>;

  fields: AllFieldsDataType[] = [];
  toolFields: AllFieldsDataType[] = [];
  articleFields: AllFieldsDataType[] = [];
  model: FlatJsonDataType = {

  };
  toolModel: FlatJsonDataType = {

  };
  articleModel: FlatJsonDataType = {

  };

  chatConfig: GenerateContentConfig = {
    systemInstruction: "You are an assistant giving some information",
    tools: [],
  }

  constructor(
    public override authSrv: AuthService,
    public override cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public alterEgo2Srv: AlterEgo2Service,
    public confirmSrv: ConfirmDialogService,
    private router: Router,
    private indicatorSrv: IndicatorService,
    private firestoreSrv: FirestoreService,
    private uiNotificationSrv: UINotificationSrv,
    private breakpointObserver: BreakpointObserver,
    private dialog: MatDialog,
    private fileSrv: FileService,
    public shareSrv: ShareSrv,
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);

    this.isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
      .pipe(
        map(result => result.matches),
        shareReplay()
      );

    this.menuOptions.push({
      label: "Edit",
      icon: "edit",
      children: [],
      callback: () => {
        this.openDialog({
          model: this.collection,
        }, "general");
      },
    });

    this.menuOptions.push({
      label: "Role",
      icon: "psychology_alt",
      children: [],
      callback: () => {
        this.openDialog({
          model: this.collection,
        }, "chat");
      },
    });

    this.menuOptions.push({
      label: "Whatsapp",
      icon: "sms",
      children: [],
      callback: () => {
        this.openDialog({
          model: this.collection,
        }, "whatsapp");
      },
    });

    this.menuOptions.push({
      label: "Social links",
      icon: "link",
      children: [],
      callback: () => {
        this.openDialog({
          model: this.collection,
        }, "links");
      },
    });

    this.menuOptions.push({
      label: "Options",
      icon: "percent",
      children: [],
      callback: () => {
        this.openDialog({
          model: this.collection,
        }, "maths");
      },
    });

    this.menuOptions.push({
      label: "Publish",
      icon: "upload",
      children: [],
      callback: () => {
        this.openExportDialog();
      },
    });

    this.menuOptions.push({
      label: "QR Code",
      icon: "qr_code",
      children: [],
      callback: () => {
        this.localShare();
      },
    });

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
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.loadCollection();
      const promises: Promise<any>[] = [];
      promises.push(this.pageAll());
      promises.push(this.pageAllTools());
      promises.push(this.pageAllArticles());
      await Promise.all(promises);
      this.selectItem(0);
      this.selectToolItem(0);
      this.selectArticleItem(0);
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
        this.collection = temp as AssistantDataType;
        this.updateProperties();
      } else {
        this.collection = null;
      }
      this.cdr.detectChanges();
    }
  }

  selectItem(index: number) {
    this.currentSelected = null;
    this.fields = [];
    this.cdr.detectChanges();
    if (this.knowledge.length <= index || index < 0) {
      return;
    }

    requestAnimationFrame(() => {
      this.currentSelected = this.knowledge[index];
      const isQuestion = this.currentSelected.type == 'question';
      this.fields = [
        {
          label: "Type", type: "select", key: "type",
          select: {
            options: [
              { txt: "Question", val: "question" },
              { txt: "Fact", val: "fact" },
            ]
          }
        },
        { label: "Knowledge", type: "md", key: "txtFormat", md: { maxHeight: "200px", minHeight: "200px" } },
      ];
      if (isQuestion) {
        this.fields.push({ label: "Answer", type: "md", key: "answerFormat", md: { maxHeight: "200px", minHeight: "200px" } },)
      }
      this.model['type'] = this.currentSelected.type;
      this.model["txtFormat"] = this.currentSelected.txtFormat;
      this.model["answerFormat"] = this.currentSelected.answerFormat;
      this.cdr.detectChanges();
    });
  }

  selectToolItem(index: number) {
    this.currentToolSelected = null;
    this.toolFields = [];
    this.cdr.detectChanges();
    if (this.tools.length <= index || index < 0) {
      return;
    }

    requestAnimationFrame(() => {
      this.currentToolSelected = this.tools[index];

      this.toolFields = [
        {
          label: "Type", type: "select", key: "type", required: true,
          select: {
            options: [
              { txt: "Email", val: "mail" },
              { txt: "Article", val: "article" },
            ]
          }
        },
        { label: "Name", type: "text", key: "name", required: true, },
        { label: "Description", type: "text", key: "desc", required: false, },
      ];
      if (this.currentToolSelected.type == 'mail') {
        this.toolFields.push({ label: "To", type: "text", key: "to", required: true, },);
        this.toolFields.push({ label: "Response (Ok)", type: "text", key: "ok", required: true, },);
        this.toolFields.push({ label: "Response (Error)", type: "text", key: "error", required: true, },);
      } else if (this.currentToolSelected.type == 'article') {
        this.toolFields.push({ label: "Keywords added", type: "text", key: "keywords", required: false, },);
        this.toolFields.push({ label: "Response (Not found)", type: "text", key: "error", required: true, },);
      }

      this.toolModel['type'] = this.currentToolSelected.type;
      this.toolModel["desc"] = this.currentToolSelected.desc;
      this.toolModel["to"] = this.currentToolSelected.to;
      this.toolModel["name"] = this.currentToolSelected.name;
      this.toolModel["ok"] = this.currentToolSelected.ok;
      this.toolModel["error"] = this.currentToolSelected.error;

      this.cdr.detectChanges();
    });
  }

  selectArticleItem(index: number) {
    this.currentArticleSelected = null;
    this.articleFields = [];
    this.cdr.detectChanges();
    if (this.articles.length <= index || index < 0) {
      return;
    }

    requestAnimationFrame(() => {
      this.currentArticleSelected = this.articles[index];
      this.articleFields = [
        { label: "Keywords", type: "text", key: "keywords", required: true, },
        { label: "Description", type: "md", key: "desc", required: false, },
        {
          label: "", type: "image-gallery", key: "gallery", required: false, gallery: {
            thumbnailMaxSizePixels: 100,
            template: "alterego/" + this.getParentId() + "/${date.year}-${date.month}-${date.day}/${random}.jpg",
          }
        },
      ];
      this.articleModel['keywords'] = this.currentArticleSelected.keywords;
      this.articleModel["desc"] = this.currentArticleSelected.desc;
      this.articleModel["gallery"] = this.currentArticleSelected.gallery;

      this.cdr.detectChanges();
    });
  }

  toggle() {
    this.sidenav.toggle();
    this.sidenavTools.toggle();
  }

  get knowledgeFiltered(): KnowledgeDataType[] {
    if (this.searchedResult.length == 0) {
      return this.knowledge;
    } else {
      // In this way, is it not necessary to load all knowledge in the begining
      return this.searchedResult.map((el) => {
        const found = el.metadata;
        const matches = this.knowledge.find((k) => { return k.id == found.id });
        return matches;
      }).filter((el) => el != undefined);
    }
  }

  get toolsFiltered(): ToolDataType[] {
    if (this.searchedToolsResult.length == 0) {
      return this.tools;
    } else {
      return this.searchedToolsResult;
    }
  }

  get articlesFiltered(): ArticleDataType[] {
    if (this.searchedArticleResult.length == 0) {
      return this.articles;
    } else {
      return this.searchedArticleResult;
    }
  }

  getDistanceFromIndex(index: number): number {
    if (this.searchedResult.length == 0) {
      return 0;
    }
    if (this.searchedResult[index].distance) {
      return this.searchedResult[index].distance;
    }
    return 0;
  }

  selectThisKnowledge(item: KnowledgeDataType) {
    const index = this.knowledge.indexOf(item);
    this.selectItem(index);
  }

  selectThisTool(item: ToolDataType) {
    const index = this.tools.indexOf(item);
    this.selectToolItem(index);
  }

  async selectThisArticle(item: ArticleDataType) {
    // First, need to save
    if (this.articleForm) {
      await this.articleForm.saveAllChangedData();
    }
    const index = this.articles.indexOf(item);
    this.selectArticleItem(index);
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
      const parent = this.getParentId();
      await this.alterEgo2Srv.delete(item.id, parent);
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
      this.lastModified += 1;
    } catch (err: any) {
      this.uiNotificationSrv.show(err.message);
    }
  }

  async deleteTool(item: ToolDataType, event: any) {
    event.preventDefault();
    const confirm = await this.confirmSrv.confirm({
      title: "Sure?",
      message: "This action can't be undone",
    });
    if (!confirm) {
      return;
    }
    try {
      const index = this.tools.indexOf(item);
      // Delete from database
      await this.firestoreSrv.delete(this.getToolsCollectionName(), item.id);
      this.tools.splice(index, 1);
      if (this.tools.length > 0) {
        if (index == 0) {
          this.selectToolItem(0);
        } else {
          this.selectToolItem(index - 1);
        }
      } else {
        this.selectToolItem(-1);
      }
      this.lastModified += 1;
    } catch (err: any) {
      this.uiNotificationSrv.show(err.message);
    }
  }

  async deleteArticle(item: ArticleDataType, event: any) {
    event.preventDefault();
    const confirm = await this.confirmSrv.confirm({
      title: "Sure?",
      message: "This action can't be undone",
    });
    if (!confirm) {
      return;
    }
    try {
      const index = this.articles.indexOf(item);
      // Delete from database
      const parent = this.getParentId();
      await this.alterEgo2Srv.deleteArticles(item.id, parent);
      this.articles.splice(index, 1);
      if (this.articles.length > 0) {
        if (index == 0) {
          this.selectArticleItem(0);
        } else {
          this.selectArticleItem(index - 1);
        }
      } else {
        this.selectArticleItem(-1);
      }
      this.lastModified += 1;
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

  getToolsCollectionName() {
    const params = getUrlQueryParams();
    const id = params.get("id");
    if (!id) {
      throw new Error("Missed parent");
    }
    return `knowledge/${id}/${MODEL_TOOL_NAME}`;
  }

  getArticlesCollectionName() {
    const params = getUrlQueryParams();
    const id = params.get("id");
    if (!id) {
      throw new Error("Missed parent");
    }
    return `knowledge/${id}/${MODEL_ARTICLE_NAME}`;
  }

  async addKnowledge() {
    const created: KnowledgeDataType = {
      created: 0,
      updated: 0,
      txtFormat: "This is a new knowledge",
      type: 'fact',
      id: "",
    };
    // Call to create
    const parent = this.getParentId();
    await this.alterEgo2Srv.createUpdate(created, parent);

    this.knowledge.unshift(created);
    requestAnimationFrame(() => {
      this.selectItem(0);
    })
  }

  async addTool() {
    const created: ToolDataType = {
      created: 0,
      updated: 0,
      name: "",
      desc: "",
      type: 'mail',
      id: "",
      ok: "Thank you for your message",
      error: "Please try again later",
      args: [],
    };
    // Call to create
    const createdId = await this.firestoreSrv.createUpdate(this.getToolsCollectionName(), created, {
      autoAuthor: false,
      useAuthor: false,
      autoOwner: false,
      searchFields: [],
    });
    created.id = createdId.id;
    created.created = createdId.created;
    this.tools.unshift(created);
    requestAnimationFrame(() => {
      this.selectToolItem(0);
    })
  }

  async addArticle() {
    const created: ArticleDataType = {
      created: 0,
      updated: 0,
      desc: "",
      id: "",
      keywords: "",
    };
    // Call to create
    const parent = this.getParentId();
    await this.alterEgo2Srv.createUpdateArticles(created, parent);
    this.articles.unshift(created);
    requestAnimationFrame(() => {
      this.selectArticleItem(0);
    })
  }

  indexOfNamedFieldAnswer(name: string) {
    const el = this.fields.filter((el) => el.key == name);
    if (el.length > 0) {
      return this.fields.indexOf(el[0]);
    } else {
      return -1;
    }
  }

  async toolEditionMade(event: ChangeFieldType) {
    if (this.currentToolSelected) {
      (this.currentToolSelected as any)[event.name] = event.val;
      if (this.toolsPendingToSave.indexOf(this.currentToolSelected) < 0) {
        this.toolsPendingToSave.push(this.currentToolSelected);
      }
      if (event.name == 'type') {
        this.selectToolItem(this.tools.indexOf(this.currentToolSelected));
      }
    }
  }

  async articleEditionMade(event: ChangeFieldType) {
    if (this.currentArticleSelected) {
      (this.currentArticleSelected as any)[event.name] = event.val;
      if (this.articlesPendingToSave.indexOf(this.currentArticleSelected) < 0) {
        this.articlesPendingToSave.push(this.currentArticleSelected);
      }
    }
  }

  async editionMade(event: ChangeFieldType) {
    if (this.currentSelected) {
      (this.currentSelected as any)[event.name] = event.val;
      if (this.pendingToSave.indexOf(this.currentSelected) < 0) {
        this.pendingToSave.push(this.currentSelected);
      }
      if (event.name == 'type') {
        this.selectItem(this.knowledge.indexOf(this.currentSelected));
      }
    }
  }

  getParentId() {
    const params = getUrlQueryParams();
    const parent = params.get("id");
    if (!parent) {
      throw new Error("No parent");
    }
    return parent;
  }

  async pageAll() {
    let isFirstTime: boolean = true;
    let responses: KnowledgeDataType[] = [];
    const LIMIT = 50;
    do {
      responses = await this.pageFacts(LIMIT, isFirstTime);
      isFirstTime = false;
      if (responses.length < LIMIT) {
        break;
      }
    } while (responses.length > 0);
  }

  async pageFacts(limit: number, startover: boolean = false): Promise<KnowledgeDataType[]> {
    const indicator = this.indicatorSrv.start();
    try {
      if (startover && this.knowledge.length > 0) {
        this.knowledge.splice(0, this.knowledge.length);
      }
      // parent
      const parent = this.getParentId();
      // paging
      let cursor: FactCursorDataType | null = null;
      if (!startover) {
        const last = this.knowledge[this.knowledge.length - 1];
        cursor = {
          createdAt: last.created,
          id: last.id,
        }
      }
      const pageResult = await this.alterEgo2Srv.pageFacts(parent, limit, cursor);
      const page = pageResult.rows;
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

  async pageAllTools() {
    let isFirstTime: boolean = true;
    let responses: BasicDataType[] = [];
    const LIMIT = 100;
    do {
      responses = await this.pageTools(LIMIT, isFirstTime);
      isFirstTime = false;
    } while (responses.length > 0);
  }

  async pageTools(limit: number, startover: boolean = false): Promise<BasicDataType[]> {
    const indicator = this.indicatorSrv.start();
    try {
      if (startover && this.tools.length > 0) {
        this.tools.splice(0, this.tools.length);
      }
      const pagingOptions: PageDataType = {
        collectionName: this.getToolsCollectionName(),
        orderColumn: "created",
        orderDirection: "desc",
        top: limit,
      };
      if (!startover) {
        if (this.tools.length > 0) {
          pagingOptions.lastDoc = this.tools[this.tools.length - 1];
        }
      }
      const page = (await this.firestoreSrv.paging(pagingOptions));
      this.tools.push(...(page as any[]));
      this.cdr.detectChanges();
      return page;
    } catch (err: any) {
      this.uiNotificationSrv.show(err.message);
      return [];
    } finally {
      indicator.done();
    }
  }

  async pageAllArticles() {
    let isFirstTime: boolean = true;
    let responses: ArticleDataType[] = [];
    const LIMIT = 50;
    do {
      responses = await this.pageArticles(LIMIT, isFirstTime);
      isFirstTime = false;
      if (responses.length < LIMIT) {
        break;
      }
    } while (responses.length > 0);
  }

  async pageArticles(limit: number, startover: boolean = false): Promise<ArticleDataType[]> {
    const indicator = this.indicatorSrv.start();
    try {
      if (startover && this.articles.length > 0) {
        this.articles.splice(0, this.articles.length);
      }
      // parent
      const parent = this.getParentId();
      // paging
      let cursor: FactCursorDataType | null = null;
      if (!startover) {
        const last = this.articles[this.articles.length - 1];
        cursor = {
          createdAt: last.created,
          id: last.id,
        }
      }
      const pageResult = await this.alterEgo2Srv.pageArticles(parent, limit, cursor);
      const page = pageResult.rows;
      this.articles.push(...(page as any[]));
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
    await Promise.all([
      this.saveKnowledgePending(),
      this.saveToolsPending(),
      this.saveArticlesPending(),
    ]);
  }

  async saveKnowledgePending() {
    try {
      if (this.pendingToSave.length == 0) {
        return;
      }
      do {
        const first = this.pendingToSave[0];
        const parent = this.getParentId();
        await this.alterEgo2Srv.createUpdate(first, parent);

        this.pendingToSave.splice(0, 1);
      } while (this.pendingToSave.length > 0);
      this.lastModified += 1;
    } catch (err: any) {
      this.uiNotificationSrv.show(err.message);
    } finally {
      this.cdr.detectChanges();
    }
  }

  deleteTransientToolData() {
    this.tools.forEach((tool) => {
      tool.args.forEach((arg) => {
        delete arg.val;
      })
    });
  }

  async saveToolsPending() {
    try {
      if (this.toolsPendingToSave.length == 0) {
        return;
      }
      this.deleteTransientToolData();
      do {
        const first = this.toolsPendingToSave[0];
        await this.firestoreSrv.createUpdate(this.getToolsCollectionName(), first);
        this.toolsPendingToSave.splice(0, 1);
      } while (this.toolsPendingToSave.length > 0);
      this.lastModified += 1;
    } catch (err: any) {
      this.uiNotificationSrv.show(err.message);
    } finally {
      this.cdr.detectChanges();
    }
  }

  async saveArticlesPending() {
    try {
      if (this.articlesPendingToSave.length == 0) {
        return;
      }
      do {
        await this.articleForm.saveAllChangedData();
        const first = this.articlesPendingToSave[0];
        const parent = this.getParentId();
        await this.alterEgo2Srv.createUpdateArticles(first, parent);
        this.articlesPendingToSave.splice(0, 1);
      } while (this.articlesPendingToSave.length > 0);
      this.lastModified += 1;
    } catch (err: any) {
      this.uiNotificationSrv.show(err.message);
    } finally {
      this.cdr.detectChanges();
    }
  }

  async openExportDialog() {
    if (!this.collection) {
      return;
    }
    const dialogRef = this.dialog.open(PublishDialogComponent, {
      width: '800px',
      panelClass: 'custom-emoji-picker',
      autoFocus: !this.isMobile(),
      data: {
        title: "Do you confirm publish now?",
        message: "The assistant will be updated"
      },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result && result.accept && this.collection) {

        const indicator = this.indicatorSrv.start();
        try {
          let publication: any = null
          // 1. Read the old cloned colletion
          publication = await this.firestoreSrv.readById(MODEL_NAME_PARENT_CLONE, this.collection.id);

          // 2. If it not exist, create a brand new
          if (!publication) {
            publication = { ...this.collection };//A real clone
            delete publication.owners;
            delete publication.search;
            // Add the knowledge path
            publication.knowledge_path = "";
            await this.firestoreSrv.createUpdate(MODEL_NAME_PARENT_CLONE, publication);
          } else {
            Object.assign(publication, { ...this.collection });
            delete publication.owners;
            delete publication.search;
          }

          // 3. Define the urlpath for the published buquet file
          publication.knowledge_path = getBucketPath(
            "alterego/${user.uid}/${random}.bin",
            publication.knowledge_path ? publication.knowledge_path : "",
            {
              user: AuthService.userStatic,
            },
            true,
          );

          // 5. Take all the knowledge and convert it into binary
          const binary = encode({
            tools: this.tools,
          });

          // 6. Upload the knowledge to the bucket
          const options: BucketOptionsType = {
            //makePublic: true,//not needed, it is already public
          };
          const blob = new Blob([binary], { type: 'application/octet-stream' });
          await this.fileSrv.upload(publication.knowledge_path.replace(/\?.*$/, ""), blob, "bucket", options);

          // 7. Update the cloned collection
          await this.firestoreSrv.createUpdate(MODEL_NAME_PARENT_CLONE, publication);
        } catch (err: any) {
          this.uiNotificationSrv.show(err.message);
        } finally {
          indicator.done();
        }
      }
    });
  }

  async openDialog(payload: any, type: string) {
    let model: any = null;
    if (payload) {
      model = payload.model;
    }

    let fields: AllFieldsDataType[] = [];
    if (type == "general") {
      fields = [
        { label: "Title", type: "text", key: "title", required: true },
        {
          label: "Language", type: "select", key: "language", required: true,
          select: {
            options: [
              { txt: "English", val: "en" },
              { txt: "Español", val: "es" },
              { txt: "Agnostic", val: "multi" },
            ]
          }
        },
        {
          label: "Imagen", type: "image", key: "image", image: {
            thumbnailMaxSizePixels: 200,
            squareMaxSizePixels: 800,//For social
            template: "knowledge_database/${user.uid}/${date.year}-${date.month}-${date.day}/${random}.jpg",
          }
        },
        {
          label: "Description", type: "contenteditable", key: "description",
          md: { minHeight: "10em", maxHeight: "20em" }
        },
      ];
    } else if (type == "maths") {
      fields = [
        { label: "Max. matches", type: "number", key: "top", required: true },
        { label: "Min. % similarity", type: "number", key: "distance", required: true },
      ];
    } else if (type == "links") {
      fields = [
        { label: "Instagram", type: "text", key: "instagram", required: false },
        { label: "Facebook", type: "text", key: "facebook", required: false },
        { label: "Youtube", type: "text", key: "youtube", required: false },
        { label: "Tik Tok", type: "text", key: "tiktok", required: false },
        { label: "LinkedIn", type: "text", key: "linkedin", required: false },
      ];
    } else if (type == "whatsapp") {
      fields = [
        { label: "Phone", type: "phone", key: "whatsapp", required: false },
        { label: "Message", type: "text", key: "whatsapp_msg", required: false },
      ];
    } else if (type == "chat") {
      fields = [
        {
          label: "Role description", type: "md", key: "instruct",
          contenteditable: { minHeight: "10em", maxHeight: "20em" },
        },
        { label: "Max. tokens", type: "number", key: "maxOutputTokens", required: true },
        { label: "Temperature", type: "number", key: "temperature", required: true },
      ];
    }

    const formConfig: FormDataType = {
      title: model ? "Update" : "Create",
      autoAuthor: true,
      modelName: MODEL_NAME_PARENT,
      searchFields: ["title", "description"],
      fields: fields,
      model: DEF_ASSISTANT_MODEL,
    };
    if (model) {
      formConfig.model = Object.assign({}, DEF_ASSISTANT_MODEL, model);
    }
    const dialogRef = this.dialog.open(DialogFormComponent, {
      width: '800px',
      panelClass: 'custom-emoji-picker',
      autoFocus: !this.isMobile(),
      data: formConfig,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        Object.assign(this.collection as any, result);
        this.updateProperties();
      }
    });
  }

  updateProperties() {
    const withDefaults = Object.assign({}, DEF_ASSISTANT_MODEL, this.collection);
    this.top = withDefaults.top;
    this.distance = withDefaults.distance;
    this.language = withDefaults.language;
    this.chatConfig.systemInstruction = withDefaults.instruct;
    this.chatConfig.maxOutputTokens = withDefaults.maxOutputTokens;
    this.chatConfig.temperature = withDefaults.temperature;
  }

  async updateSearch() {
    if (this.searchedResult == null) {
      this.selectItem(0);
    } else {
      if (this.searchedResult.length > 0) {
        const first = this.searchedResult[0];
        const founds = this.knowledge.filter((o) => o.id == first.metadata.id);
        const index = this.knowledge.indexOf(founds[0]);
        this.selectItem(index);
      } else {
        // Nothing found
        this.selectItem(-1);
      }
    }
    this.cdr.detectChanges();
  }

  async updateToolsSearch() {
    if (this.searchedToolsResult.length == 0) {
      this.selectToolItem(0);
    } else {
      if (this.searchedToolsResult.length > 0) {
        const first = this.searchedToolsResult[0];
        const index = this.tools.indexOf(first);
        this.selectToolItem(index);
      } else {
        // Nothing found
        this.selectToolItem(-1);
      }
    }
    this.cdr.detectChanges();
  }

  async updateArticlesSearch() {
    if (this.searchedArticleResult.length == 0) {
      this.selectArticleItem(0);
    } else {
      if (this.searchedArticleResult.length > 0) {
        const first = this.searchedArticleResult[0];
        const founds = this.articles.filter((o) => o.id == first.id);
        const index = this.articles.indexOf(founds[0]);
        this.selectArticleItem(index);
      } else {
        // Nothing found
        this.selectArticleItem(-1);
      }
    }
    this.cdr.detectChanges();
  }

  clearFilter() {
    this.deleteTransientToolData();
    this.searchedResult = [];
    this.searchedToolsResult = [];
    this.searchedArticleResult = [];
    this.updateSearch();
    this.updateToolsSearch();
    this.updateArticlesSearch();
  }

  receiveStartSearching() {
    this.deleteTransientToolData();
  }

  receiveSearch(search: FoundKnowledge[]) {
    this.searchedResult = search;
    this.updateSearch();
  }

  receiveToolSearch(search: ToolDataType[]) {
    // First clear old values...
    this.searchedToolsResult = search;
    this.updateToolsSearch();
  }

  receiveArticleSearch(search: ArticleDataType[]) {
    this.searchedArticleResult = search;
    this.updateArticlesSearch();
  }

  async localShare() {
    if (!this.collection) {
      return;
    }
    const { id, title, description, updated } = this.collection;
    this.shareSrv.share({
      collection: MODEL_NAME_PARENT_CLONE,
      path: "/alterego/use",
      id,
      title,
      description,
      updated,
    }, "qr");
  }

  addArgument() {
    if (!this.currentToolSelected) {
      return;
    }
    this.currentToolSelected.args.push({
      type: Type.STRING,
      name: "",
      desc: "",
      required: true,
    });
    this.refreshArguments();
  }

  async removeArgument(arg: ArgumentDataType) {
    const confirm = await this.confirmSrv.confirm({
      title: "Sure?",
      message: "This action can't be undone",
    });
    if (!confirm) {
      return;
    }
    if (!this.currentToolSelected) {
      return;
    }
    const index = this.currentToolSelected.args.indexOf(arg);
    if (index >= 0) {
      this.currentToolSelected.args.splice(index, 1);
      this.refreshArguments();
      this.cdr.detectChanges();
    }
  }

  refreshArguments() {
    if (!this.currentToolSelected) {
      return;
    }
    if (this.toolsPendingToSave.indexOf(this.currentToolSelected) < 0) {
      this.toolsPendingToSave.push(this.currentToolSelected);
    }
  }

  async searchFact(txt: string) {
    if (txt.trim().length == 0) {
      this.clearFilter();
    } else {
      const parent = this.getParentId();
      const result = await this.alterEgo2Srv.search(txt, parent, this.top, this.distance, this.language, true);
      this.receiveSearch(result.data);
    }
  }

  async searchArticle(txt: string) {
    if (txt.trim().length == 0) {
      this.clearFilter();
    } else {
      const parent = this.getParentId();
      const result = await this.alterEgo2Srv.searchArticles(txt, parent);
      this.receiveArticleSearch(result);
    }
  }
}
