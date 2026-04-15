import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { IndicatorService } from '@services/indicator.service';
import { getUrlQueryParams } from '@tools/UrlUtil';
import {
  ROOT_PATH,
} from '@mytypes/BodyTypes';
import { HttpClient } from '@angular/common/http';
import { SceneWithComposer } from '@avatar/SceneWithComposer';

export class BasicScene extends SceneWithComposer {

  lights: Array<THREE.Light> = [];
  canvasRef: HTMLCanvasElement;

  constructor(
    canvasRef: any,
    bounds: DOMRect,
    private indicatorSrv: IndicatorService,
    override http: HttpClient,
  ) {
    super(bounds, http);
    this.canvasRef = canvasRef;
    const params = getUrlQueryParams();
  }

  override initialize(): void {
    this.camera = new THREE.PerspectiveCamera(
      25,
      this.bounds.width / this.bounds.height,
      0.1,
      1000
    );
    this.camera.position.x = 10;
    this.camera.position.y = 5;
    this.camera.position.z = 10;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef,
      alpha: true,
      antialias: true
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setSize(this.bounds.width, this.bounds.height);
    this.orbitals = new OrbitControls(this.camera, this.renderer.domElement);
    this.background = new THREE.Color(0xBBBBFF);

    this.setupEffects(window.innerWidth, window.innerHeight);
    this.initializeAvatar();
    this.initializeScenario();
    this.initializeControlls();

    const light = new THREE.AmbientLight(0xFFFFFF);
    this.add(light);
    const pointLight = new THREE.DirectionalLight(0xffffff, 1.5);
    pointLight.position.set(0, 5, 0);
    this.add(pointLight);

    //this.setHDRSky(ROOT_PATH + "wasteland_clouds_puresky_1k.hdr");

    //this.loadCharacters();
  }

  async initializeScenario() {
    const scenario = await this.addModel({ name: "scene", url: "/assets/models/scenario.glb" });
    if (this.camera) {
      this.makeObjectTransparentToCamera(scenario, this.camera, 0, 15, 30, 45);
      this.autoDetectTerrainMeshes(scenario);
    }
    //
  }

  async initializeAvatar() {
    const loading = this.indicatorSrv.start();
    try {
      if (!this.camera || !this.renderer || !this.orbitals) {
        return;
      }
      await this.addAvatar(
        ROOT_PATH + "avatar005.glb",
        this.camera, this.renderer, this.orbitals);
      this.replaceAvatarSkin(ROOT_PATH + "squeleton.jpg");
    } catch (err) {

    } finally {
      loading.done();
    }
  }
}
