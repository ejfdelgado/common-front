import { Component, EventEmitter, Output, HostListener } from '@angular/core';

interface Emoji {
    symbol: string;
    name: string;
}

@Component({
    selector: 'app-emoji-picker',
    templateUrl: './emoji-picker.component.html',
    styleUrls: ['./emoji-picker.component.css']
})
export class EmojiPickerComponent {
    @Output() selectEmoji = new EventEmitter<string>();
    @Output() close = new EventEmitter<void>();

    searchText: string = '';

    // Example subset of emojis
    emojis: Emoji[] = [
        { symbol: '😀', name: 'happy smile' },
        { symbol: '😂', name: 'laughing' },
        { symbol: '❤️', name: 'heart' },
        { symbol: '🔥', name: 'fire' },
        { symbol: '👍', name: 'thumbs up' },
        { symbol: '🎉', name: 'party' },
        { symbol: '🤔', name: 'thinking' },
        { symbol: '🚀', name: 'rocket' },
        // Add more as needed...
    ];

    get filteredEmojis() {
        return this.emojis.filter(e =>
            e.name.toLowerCase().includes(this.searchText.toLowerCase())
        );
    }

    @HostListener('document:keydown.escape', ['$event'])
    onEscapeHandler(event: KeyboardEvent) {
        this.close.emit();
    }

    pickEmoji(symbol: string) {
        this.selectEmoji.emit(symbol);
        this.close.emit();
    }
}