import { MyHelper } from "./MyHelper";
import * as THREE from 'three';

export interface MyAssetInData {
    url: string;
    height: number;
}

export class MyAsset {
    data: MyAssetInData;
    object!: THREE.Object3D;
    matrix!: THREE.Matrix4;
    scale!: number;
    box!: THREE.Box3;
    owner: string | null = null;
    constructor(data: MyAssetInData) {
        this.data = data;
    }

    async initialize() {
        this.object = await MyHelper.loadGLTFModel(this.data.url);
        this.object.matrixAutoUpdate = false;
        const temp = MyHelper.scaleMeshToHeight(this.object, this.data.height);
        if (temp) {
            this.box = temp.box;
            this.scale = temp.scale;
        }
        MyHelper.makeMaterialsEmissive(this.object);
    }

    recomputeBox() {
        const INCREASE = 1;
        this.box = new THREE.Box3().setFromObject(this.object);
        this.box.max.setX(this.box.max.x + INCREASE);
        this.box.max.setY(10);// Make it height to avoid get down
        this.box.max.setZ(this.box.max.z + INCREASE);

        this.box.min.setX(this.box.min.x - INCREASE);
        this.box.min.setY(0);// It has to be fixed when terrain with different height
        this.box.min.setZ(this.box.min.z - INCREASE);

        //console.log(`BBox ${this.printVector3(this.box.min)} ${this.printVector3(this.box.max)}}`);
    }

    printVector3(test: THREE.Vector3) {
        return `(${test.x}, ${test.y}, ${test.z})`;
    }

    hasCollisionWith(test: THREE.Vector3) {
        const has = this.box.containsPoint(test);
        //console.log(`${has} collison with ${this.printVector3(this.box.min)} ${this.printVector3(this.box.max)} with ${this.printVector3(test)}`);
        return has;
    }

    getMesh(): THREE.Object3D {
        return this.object;
    }

    setPosition(x: number, z: number, recomputeBBox: boolean = false) {
        const translation = new THREE.Matrix4().makeTranslation(x, 0, z);
        const scale = new THREE.Matrix4().makeScale(this.scale, this.scale, this.scale);
        this.matrix = new THREE.Matrix4().multiplyMatrices(translation, scale);
        this.object.applyMatrix4(this.matrix);
        if (recomputeBBox) {
            this.recomputeBox();
        }
    }

    makeRandomPosition(min: THREE.Vector2, max: THREE.Vector2) {
        const x = min.x + Math.random() * (max.x - min.x);
        const z = min.y + Math.random() * (max.y - min.y);
        this.setPosition(x, z, true);
    }
}