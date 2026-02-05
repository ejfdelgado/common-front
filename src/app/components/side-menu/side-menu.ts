import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SideMenuService } from '@services/side-menu.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-side-menu',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
  ],
  templateUrl: './side-menu.html',
  styleUrl: './side-menu.scss',
})
export class SideMenu implements OnDestroy {

  @Input() logoImage: string = "./assets/img/logo.png"

  opened: boolean = false;
  subscription!: Subscription;

  constructor(
    public sideMenuSrv: SideMenuService,
    public cdr: ChangeDetectorRef,
  ) {
    this.subscription = sideMenuSrv.getState().subscribe((val) => {
      this.opened = val;
      cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  close() {
    this.sideMenuSrv.close();
  }
}
