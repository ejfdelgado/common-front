import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pano } from './pano';

describe('Pano', () => {
  let component: Pano;
  let fixture: ComponentFixture<Pano>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pano]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pano);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
