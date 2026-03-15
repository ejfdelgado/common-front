import { ChangeDetectorRef, Component, effect, OnDestroy } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthenticatedComponent } from '@components/authenticated.component';
import { MessageContentType, MessagePage } from '@components/message-page/message-page';
import { AuthService } from '@services/auth.service';
import { FileService } from '@services/file.srv';
import { FirestoreService } from '@services/firestore.service';
import { FullscreenService } from '@services/fullscreen.service';
import { Subscription } from 'rxjs';
import { getBucketPath, getJSONUrl } from '@tools/BucketPaths';

@Component({
  selector: 'app-tos',
  standalone: true,
  imports: [
    MessagePage
  ],
  templateUrl: './tos.html',
  styleUrl: './tos.scss',
})
export class Tos extends AuthenticatedComponent implements OnDestroy {
  content: MessageContentType = {
    title: "Términos y condiciones del Servicio",
    content: "",
    footer: "",
    actionUrl: "",
    urlImage: "https://storage.googleapis.com/pro-ejflab-assets/images/letter.jpg",
  };
  canEdit: boolean = true;
  authSubscription: Subscription | null = null;
  MODEL_COLLECTION: string = "publicpage";
  MODEL_ID: string = "superadmin_tos_json";
  BUCKET_PATH: string = "superadmin/tos.json";
  currentUrl: string = this.BUCKET_PATH;

  constructor(
    public override authSrv: AuthService,
    public override cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    private fileSrv: FileService,
    private firestoreSrv: FirestoreService,
  ) {
    super(sanitizer, fullScreenSrv, authSrv, cdr);
    document.title = "Términos y condiciones del Servicio";
    this.authSubscription = this.authSrv.authState$.subscribe(async (user) => {
      if (user) {
        this.canEdit = true;
      }
    });
    effect(() => {
      this.authSrv.roles();
      this.cdr.detectChanges();
    });
    // Read the json file
    this.readJSONFile();
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  async readJSONFile() {
    try {
      const collection = await this.firestoreSrv.readById(this.MODEL_COLLECTION, this.MODEL_ID);
      if (collection) {
        this.currentUrl = (collection as any).url;
        const temp = await this.fileSrv.getJSON(getJSONUrl(this.currentUrl));
        this.content = temp;
        this.cdr.detectChanges();
      }
    } catch (err) {
      console.log(err);
    }
  }

  async save(data: MessageContentType) {
    const model = {
      id: this.MODEL_ID,
      url: this.currentUrl,
    };
    // Generate next url
    this.currentUrl = getBucketPath(this.BUCKET_PATH, this.currentUrl, {}, true);
    await this.fileSrv.uploadJsonFile(this.currentUrl, this.content);
    model.url = this.currentUrl;
    await this.firestoreSrv.createUpdate(this.MODEL_COLLECTION, model);
  }
}
