import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    FormsModule,
    MatIconModule,
    MatInputModule,
  ],
  selector: 'app-emoji-picker',
  templateUrl: './emoji-picker.component.html',
  styleUrls: ['./emoji-picker.component.css']
})
export class EmojiPickerComponent {
  searchText: string = '';
  emojis = [
    { symbol: '😀', name: 'happy' }, { symbol: '😂', name: 'laugh' },
    { symbol: '❤️', name: 'heart' }, { symbol: '🔥', name: 'fire' },
    { symbol: '👍', name: 'thumbs up' }, { symbol: '🚀', name: 'rocket' }
  ];

  constructor(private dialogRef: MatDialogRef<EmojiPickerComponent>) { }

  get filteredEmojis() {
    return this.emojis.filter(e =>
      e.name.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  // Close the dialog and pass the symbol back to the caller
  pickEmoji(symbol: string) {
    this.dialogRef.close(symbol);
  }

  close() {
    this.dialogRef.close();
  }
}