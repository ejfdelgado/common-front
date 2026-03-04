import { Component, EventEmitter, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AutofocusDirective } from '@directives/autofocus.directive';
import { CommonComponent } from '@components/common.component';
import { FullscreenService } from '@services/fullscreen.service';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    AutofocusDirective,
  ],
  templateUrl: './search-input.html',
  styleUrl: './search-input.scss',
})
export class SearchInputComponent extends CommonComponent {

  @Output() search = new EventEmitter<string>();
  searchCtrl = new FormControl('');

  constructor(
    public override fullScreenSrv: FullscreenService,
    public override sanitizer: DomSanitizer,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  onSearch(): void {
    const value = this.searchCtrl.value?.trim();
    if (!value) {
      this.search.emit('');
      return;
    };

    if (value) this.search.emit(value);
  }

  clear(): void {
    this.searchCtrl.setValue('');
    this.search.emit('');
  }
}
