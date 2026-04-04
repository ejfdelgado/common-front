import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { BasicScene } from './BasicScene';
import { BodyData, BodyState } from './types';

@Component({
  selector: 'app-threejs-body',
  templateUrl: './threejs-body.component.html',
  styleUrls: ['./threejs-body.component.css'],
})
export class ThreejsBodyComponent implements OnInit, AfterViewInit {
  @ViewChild('mycanvas') canvasRef!: ElementRef;
  @ViewChild('myparent') prentRef!: ElementRef;
  scene: BasicScene | null = null;
  bounds: DOMRect | null = null;
  @Input() poses: BodyData[] = [];
  @Input() states: BodyState[] = [];
  @Output() changedEvent: EventEmitter<any> = new EventEmitter();

  constructor() { }

  @HostListener('window:resize', ['$event'])
  public onResize(event: any) {
    this.computeDimensions();
    if (this.scene != null && this.bounds != null) {
      this.scene.setBounds(this.bounds);
    }
  }

  ngAfterViewInit(): void {
    this.computeDimensions();
    if (this.bounds == null) {
      return;
    }
    const theCanvas = this.canvasRef.nativeElement;
    this.scene = new BasicScene(theCanvas, this.bounds);
    this.scene.initialize();
    this.loop();
  }

  loop() {
    if (this.scene != null && this.scene.camera) {
      this.scene.camera?.updateProjectionMatrix();
      this.scene.updatePoses(this.poses, this.states);
      this.scene.renderer?.render(this.scene, this.scene.camera);
      this.scene.orbitals?.update();
      if (this.poses.length > 0) {
        this.changedEvent.emit();
      }
      requestAnimationFrame(() => {
        this.loop();
      });
    }
  }

  public computeDimensions() {
    const scrollEl = this.prentRef.nativeElement;
    this.bounds = scrollEl.getBoundingClientRect();
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.onResize({});
    }, 0);
  }
}
