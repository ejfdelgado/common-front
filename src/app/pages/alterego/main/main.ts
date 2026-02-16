import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { SideMenu } from '@components/side-menu/side-menu';
import { Statusbar } from '@components/statusbar/statusbar';
import { AlterEgoService, SearchLangsType } from '@services/alterego.service';
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
import { FlatJsonDataType } from '@components/form-simple/form-simple';
import { marked } from 'marked';
import { html2text } from '@tools/HtmlUtil';

export interface KnowledgeTagType {
  id: string;
  txt: string;
};

export interface KnowledgeDataType {
  type: "fact" | "question";
  txt: string;
  txtFormat: string;
  answer?: string;
  answerFormat?: string;
  created: number;
  tags: KnowledgeTagType[];
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
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.knowledge.push({
      type: 'fact',
      txt: "Como cocinar un rollo de canela",
      txtFormat: "Como cocinar un rollo de canela",
      created: Date.now(),
      tags: [],
    });
    this.knowledge.push({
      type: 'fact',
      txt: 'En la historia de Roma el personaje Constantino es relevante',
      txtFormat: 'En la historia de Roma el personaje Constantino es relevante',
      created: Date.now() + 1,
      tags: [],
    });

    this.selectItem(0);
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
      this.fields = [
        { label: "Knowledge", type: "md", key: "txt", md: { maxHeight: "200px", minHeight: "200px" } },
      ];
      this.model["txt"] = this.currentSelected.txtFormat;
      this.cdr.detectChanges();
    });
  }

  toggle() {
    this.sidenav.toggle();
  }

  async initialize() {
    const mockData = [
      { id: '1', title: 'Como cocinar un rollo de canela', url: "" },
      { id: '2', title: 'En la historia de Roma el personaje Constantino es relevante', url: "" },
      { id: '3', title: 'Python es un excelente lenguaje de programacion para IA', url: "" }
    ];
    const response = await this.alterEgoSrv.initialize(mockData, this.language);
    console.log(JSON.stringify(response, null, 4));
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
    const index = this.knowledge.indexOf(item);
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
  }

  addKnowledge() {
    this.knowledge.unshift({
      created: Date.now(),
      tags: [],
      txt: "This is a new knowledge",
      txtFormat: "This is a new knowledge",
      type: 'fact',
    });
    this.selectItem(0);
  }

  updateCurrentModel() {

  }

  async editionMade(event: any) {
    if ('txt' in event) {
      const actual = event['txt'];
      const htmlText = await marked.parse(actual);
      if (this.currentSelected) {
        this.currentSelected.txt = html2text(htmlText);
        this.currentSelected.txtFormat = actual;
      }
    }
  }
}
