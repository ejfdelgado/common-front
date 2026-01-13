import { Component, EventEmitter, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './search-input.html',
  styleUrl: './search-input.scss',
})
export class SearchInputComponent {

  @Output() search = new EventEmitter<string>();
  searchCtrl = new FormControl('');

  onSearch(): void {
    const value = this.searchCtrl.value?.trim();
    if (!value) return;

    if (value) this.search.emit(value);
  }

  clear(): void {
    this.searchCtrl.setValue('');
  }
}
