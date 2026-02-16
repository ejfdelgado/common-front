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
import { ChangeFieldType, FlatJsonDataType } from '@components/form-simple/form-simple';
import { marked } from 'marked';
import { html2text } from '@tools/HtmlUtil';
import { Router } from '@angular/router';

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
    private router: Router,
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
      type: 'question',
      txt: 'que sabemos de la historia?',
      txtFormat: 'que sabemos de la historia?',
      answer: 'En la historia de Roma el personaje Constantino es relevante',
      answerFormat: 'En la historia de Roma el personaje Constantino es relevante',
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
      const isQuestion = this.currentSelected.type == 'question';
      this.fields = [
        { label: "Is question?", type: "toggle", key: "type" },
        { label: "Knowledge", type: "md", key: "txt", md: { maxHeight: "200px", minHeight: "200px" } },
      ];
      if (isQuestion) {
        this.fields.push({ label: "Answer", type: "md", key: "answer", md: { maxHeight: "200px", minHeight: "200px" } },)
      }
      this.model["txt"] = this.currentSelected.txtFormat;
      this.model['type'] = isQuestion;
      this.model["answer"] = this.currentSelected.answer;
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

    if (event.name == "txt") {
      const txt = event.val;
      const htmlText = await marked.parse(txt);
      if (this.currentSelected) {
        this.currentSelected.txt = html2text(htmlText);
        this.currentSelected.txtFormat = txt;
      }
    } else if (event.name == "answer") {
      const answer = event.val;
      const htmlAnswer = await marked.parse(answer);
      if (this.currentSelected) {
        this.currentSelected.answer = html2text(htmlAnswer);
        this.currentSelected.answerFormat = answer;
      }
    } else if (event.name == 'type') {
      if (this.currentSelected) {
        if (event.val) {
          this.currentSelected.type = "question";
          const index = this.indexOfNamedFieldAnswer("answer");
          if (index < 0) {
            hasChanged = true;
          }
        } else {
          this.currentSelected.type = "fact";
          const index = this.indexOfNamedFieldAnswer("answer");
          if (index >= 0) {
            hasChanged = true;
          }
        }
      }
    }

    if (hasChanged) {
      if (this.currentSelected) {
        this.selectItem(this.knowledge.indexOf(this.currentSelected));
      }
    }
  }
}
