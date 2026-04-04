import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class MyHelper {
    static gltfLoader = new GLTFLoader();
    static async loadGLTFModel(urlPath: string): Promise<THREE.Object3D> {
        const url = `/${urlPath.replace(/^\//g, '')}`;
        return new Promise<THREE.Object3D>((resolve, reject) => {
            this.gltfLoader.load(
                url,
                async (response: any) => {
                    let object = null;
                    object = response.scene.children[0];
                    const temp: THREE.Object3D = object;
                    resolve(temp);
                },
                (xhr: any) => {
                    console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
                },
                (error: any) => {
                    reject(error);
                }
            );
        });
    }

    scaleMeshToHeightLocal() {

    }

    static scaleMeshToHeight(mesh: THREE.Object3D, targetHeight: number): { box: THREE.Box3, scale: number } | null {
        // Compute bounding box
        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        // Get current height
        const currentHeight = size.y;

        if (currentHeight === 0) {
            return null;
        }

        const scaleFactor = targetHeight / currentHeight;
        //mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
        return { box: new THREE.Box3().setFromObject(mesh), scale: scaleFactor };
    }

    static makeMaterialsEmissive(object: THREE.Object3D) {
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                let material = child.material;

                // Handle multi-material meshes
                if (Array.isArray(material)) {
                    child.material = material.map(mat => MyHelper.ensureEmissiveMaterial(mat));
                } else {
                    child.material = MyHelper.ensureEmissiveMaterial(material);
                }
            }
        });
    }

    static ensureEmissiveMaterial(material: THREE.Material) {

        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhongMaterial) {
            // Clone the material to avoid modifying shared materials
            const map = material.map;
            material.emissiveMap = map;
            material.emissive = new THREE.Color(0xFFFFFF);
            material.emissiveIntensity = 1.0;
        }

        return material;
    }
}