import { Component, EventEmitter, Input, Output } from '@angular/core';
import { epochTo } from '@tools/DateUtils';
import { CalendarEventType } from 'types/ragTypes';

@Component({
  selector: 'app-calendar-event',
  imports: [],
  templateUrl: './calendar-event.html',
  styleUrl: './calendar-event.scss',
})
export class CalendarEvent {

  @Input() event!: CalendarEventType;

  @Output() selectThis: EventEmitter<CalendarEventType> = new EventEmitter();

  formatDate(text: string) {
    const millis = new Date(text).getTime();
    return epochTo(millis, "v5");
  }
}
