import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@pipes/translate.pipe';
import { SideMenuService } from '@services/side-menu.service';
import { Subscription } from 'rxjs';
import { ConfigService } from 'src/app/services/config.service';
import { MenuConfigType, MenuOptionType } from 'types/StatusBar';

@Component({
  selector: 'app-side-menu',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslatePipe],
  templateUrl: './side-menu.html',
  styleUrl: './side-menu.scss',
})
export class SideMenu implements OnDestroy, AfterViewInit {
  @Input() logoImage: string = './assets/img/logo.png';
  @Input() options: MenuOptionType[] = [];
  @Input() config: MenuConfigType = {};
  @Input() fontSize: string = 'small';

  opened: boolean = true;
  subscription!: Subscription;
  configSubs!: Subscription;

  constructor(
    public sideMenuSrv: SideMenuService,
    public cdr: ChangeDetectorRef,
    public configSrv: ConfigService,
  ) {
    this.opened = sideMenuSrv.isOpened();
    this.configSubs = configSrv.events.subscribe(() => {
      const temp = this.options;
      this.options = [];
      this.cdr.detectChanges();
      requestAnimationFrame(() => {
        this.options = temp;
        this.cdr.detectChanges();
      });
    });
    this.subscription = sideMenuSrv.getState().subscribe((val) => {
      this.opened = val;
      cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void {
    this.sideMenuSrv.fireState();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.configSubs.unsubscribe();
  }

  close() {
    this.sideMenuSrv.close();
  }

  callItem(item: MenuOptionType) {
    if (item.callback) {
      item.callback();
    }
    // Close if small window
    if (window.innerWidth < 800) {
      this.sideMenuSrv.close();
    }
  }

  toggleChildren(item: MenuOptionType, event: any) {
    event.preventDefault();
    item.opened = !item.opened;
    this.callItem(item);
  }
}
