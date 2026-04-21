import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { CommonComponent } from '@components/common.component';

@Component({
  selector: 'app-camera-picker',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './camera-picker.html',
  styleUrl: './camera-picker.scss',
})
export class CameraPicker extends CommonComponent implements ControlValueAccessor {

  writeValue(obj: any): void {
    throw new Error('Method not implemented.');
  }
  setDisabledState?(isDisabled: boolean): void {
    throw new Error('Method not implemented.');
  }

}
