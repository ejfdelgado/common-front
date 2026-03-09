import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '@angular/fire/auth';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [
    MatIconModule,
  ],
  templateUrl: './user-card.html',
  styleUrl: './user-card.scss',
})
export class UserCard {
  @Input() user!: User;
  @Input() icon?: string;

  @Output() action: EventEmitter<User> = new EventEmitter();
}
