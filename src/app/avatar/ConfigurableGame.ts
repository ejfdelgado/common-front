import { DomSanitizer } from "@angular/platform-browser";
import { AuthenticatedComponent } from "../components/authenticated.component";
import { FullscreenService } from "../services/fullscreen.service";
import { AuthService } from "../services/auth.service";
import { ChangeDetectorRef } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { CameraPickerDialogComponent } from "../components/fields/camera-picker/camera-picker-dialog";
import { ConfigService } from "../services/config.service";
import { CameraDataType } from "src/types/CameraTypes";
import { ModuloSonido } from "../services/sonido.service";
import { ComponentP2P } from "./ComponentP2P";
import { MenuOptionType } from "src/types/StatusBar";
import { AvatarModel, GameMode, GameScenario } from "src/types/WorldAvatar";



export abstract class ConfigurableGame extends AuthenticatedComponent {

    menuOptions: MenuOptionType[] = [];
    
    constructor(
        public override sanitizer: DomSanitizer,
        public override fullScreenSrv: FullscreenService,
        public override authSrv: AuthService,
        public override cdr: ChangeDetectorRef,
        // Local imports
        public dialog: MatDialog,
        public configSrv: ConfigService,
    ) {
        super(sanitizer, fullScreenSrv, authSrv, cdr);

    }

    abstract getTrackerComponent(): ComponentP2P;

    openCameraPicker() {
        const ref = this.dialog.open(CameraPickerDialogComponent, {
            data: {
                currentCamera: this.configSrv.getCamera(),
            },
            disableClose: true,
            width: '480px',
        });

        ref.afterClosed().subscribe((result: CameraDataType | null) => {
            if (result) {
                this.configSrv.setCamera(result);
            }
        });
    }

    emitToc() {
        ModuloSonido.play("/assets/sounds/message.mp3");
    }

    updateCurrentLang() {
        const lang = this.getTrackerComponent().currentLang;
        const children = this.menuOptions
            .find(a => a.name == "langs")?.children;
        if (!children) {
            return;
        }
        children.filter(a => a.name && ["es-ES", "en-US", "fr-FR"].indexOf(a.name) >= 0)
            .forEach((a) => {
                a.inUse = a.name == lang;
            });
    }

    useLanguage(name: string) {
        const lang = this.getTrackerComponent().getLang(name);
        if (lang) {
            this.getTrackerComponent().defineLanguage(lang);
            this.emitToc();
            this.updateCurrentLang();
        }
    }

    async saveAndApplyScenario(data: GameScenario) {
        
    }

    async saveAndApplyMode(data: GameMode) {
        
    }

    async saveAndApplyAvatar(data: AvatarModel) {
        
    }
}