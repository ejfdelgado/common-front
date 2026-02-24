import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { AlterEgoService } from '@services/alterego.service';
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
import { BasicDataType, FirestoreService, PageDataType, SimpleDataType } from '@services/firestore.service';
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
  ItemToSearchType, SearchAnswerDataType, SearchLangsType,
  ToolDataType,
  ArgumentDataType,
  DropDownOptionDataType
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

const MODEL_NAME = "fact";
const MODEL_TOOL_NAME = "tool";
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

  menuOptions: MenuOptionType[] = [];
  authSubscription: Subscription | null = null;
  language: SearchLangsType = "en";
  top: number = 3;
  distance: number = 10;
  knowledge: KnowledgeDataType[] = [];
  tools: ToolDataType[] = [];
  currentSelected: KnowledgeDataType | null = null;
  currentToolSelected: ToolDataType | null = null;
  collection: AssistantDataType | null = null;
  pendingToSave: KnowledgeDataType[] = [];
  toolsPendingToSave: ToolDataType[] = [];
  searchedResult: SearchAnswerDataType | null = null;
  searchedToolsResult: ToolDataType[] = [];
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
  model: FlatJsonDataType = {

  };
  toolModel: FlatJsonDataType = {

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
    public alterEgoSrv: AlterEgoService,
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
      await Promise.all(promises);
      this.selectItem(0);
      this.selectToolItem(0);
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
              { txt: "Content", val: "content" },
            ]
          }
        },
        { label: "Name", type: "text", key: "name", required: true, },
        { label: "Description", type: "md", key: "desc", md: { maxHeight: "200px", minHeight: "200px" } },
      ];
      if (this.currentToolSelected.type == 'mail') {
        this.toolFields.push({ label: "To", type: "text", key: "to", required: true, },);
      }
      this.toolModel['type'] = this.currentToolSelected.type;
      this.toolModel["desc"] = this.currentToolSelected.desc;
      this.toolModel["to"] = this.currentToolSelected.to;
      this.toolModel["name"] = this.currentToolSelected.name;

      this.cdr.detectChanges();
    });
  }

  toggle() {
    this.sidenav.toggle();
    this.sidenavTools.toggle();
  }

  get knowledgeFiltered(): KnowledgeDataType[] {
    if (!this.searchedResult) {
      return this.knowledge;
    } else {
      const temp = this.searchedResult.payload.map((el: ItemToSearchType) => {
        const found = this.knowledge.filter((o) => o.id == el.id);
        return found[0];
      });
      return temp;
    }
  }

  get toolsFiltered(): ToolDataType[] {
    if (this.searchedToolsResult.length == 0) {
      return this.tools;
    } else {
      return this.searchedToolsResult;
    }
  }

  getDistanceFromIndex(index: number): number {
    if (!this.searchedResult) {
      return 0;
    }
    if (this.searchedResult.payload[index].distance) {
      return this.searchedResult.payload[index].distance;
    }
    return 0;
  }

  async echo() {
    const response = await this.alterEgoSrv.echo();
    console.log(JSON.stringify(response));
  }

  selectThisKnowledge(item: KnowledgeDataType) {
    const index = this.knowledge.indexOf(item);
    this.selectItem(index);
  }

  selectThisTool(item: ToolDataType) {
    const index = this.tools.indexOf(item);
    this.selectToolItem(index);
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

  async addKnowledge() {
    const created: KnowledgeDataType = {
      created: 0,
      updated: 0,
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

  async savePending() {
    await Promise.all([
      this.saveKnowledgePending(),
      this.saveToolsPending(),
    ]);
  }

  async saveKnowledgePending() {
    try {
      if (this.pendingToSave.length == 0) {
        return;
      }
      do {
        const first = this.pendingToSave[0];
        await this.firestoreSrv.createUpdate(this.getCollectionName(), first);
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
          knowledge: this.knowledge,
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
      if (this.searchedResult.success && this.searchedResult.payload.length > 0) {
        const first = this.searchedResult.payload[0];
        const founds = this.knowledge.filter((o) => o.id == first.id);
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

  clearFilter() {
    this.deleteTransientToolData();
    this.searchedResult = null;
    this.searchedToolsResult = [];
    this.updateSearch();
    this.updateToolsSearch();
  }

  receiveStartSearching() {
    this.deleteTransientToolData();
  }

  receiveSearch(search: SearchAnswerDataType | null) {
    this.searchedResult = search;
    this.updateSearch();
  }

  receiveToolSearch(search: ToolDataType[]) {
    // First clear old values...
    this.searchedToolsResult = search;
    this.updateToolsSearch();
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
}
