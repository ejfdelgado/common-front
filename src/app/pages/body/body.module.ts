import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BodyRoutingModule } from './body-routing.module';
import { BodyComponent } from './body.component';
import { MatIconModule } from '@angular/material/icon';
import { ThreejsBodyComponent } from './threejs-body/threejs-body.component';


@NgModule({
  declarations: [

  ],
  imports: [
    CommonModule,
    BodyRoutingModule,
    ThreejsBodyComponent,
    MatIconModule,
    BodyComponent,
  ]
})
export class BodyModule { }
