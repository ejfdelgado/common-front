import * as THREE from 'three';
import { BodyKeyPointData, BodyState } from '@mytypes/BodyTypes';
import { ModuloSonido } from '@services/sonido.service';
import { EventEmitter } from '@angular/core';

export class WalkBody {
    sideState: number = 0;
    maxValue: number = 0;
    MOVEMENT_THRESHOLD = 0.15;
    maxDifference: number = 0;
    lastStep: number = 0;
    MIN_SCORE: number = 80;
    STEP_AMOUNT: number = 6;
    timeStartFreeze: number = 0;
    now: number = 0;
    STEP_FREEZE_MILLIS: number = 2000;
    maxChallengeTime: number = 0;
    overpassLastMax: boolean = false;
    challengeLeftFoot: boolean = false;
    challengeRightFoot: boolean = false;
    ROTATION_AMOUNT: number = 0.25;
    FRONT_REFERENCE = new THREE.Vector3(-1, 0, 0);
    UP_REFERENCE = new THREE.Vector3(0, 1, 0);
    front = new THREE.Vector3(0, 0, 0);
    cameraSmoot = new THREE.Vector3(0, 0, 0);
    lastCameraSmoot: number = new Date().getTime();

    lookAtActual = new THREE.Vector3(0, 0, 0);
    lookAtDestination = new THREE.Vector3(0, 0, 0);
    lookAtLastT: number = new Date().getTime();

    translationX: number = 0;
    translationZ: number = 0;
    rotationY: number = 0;//radians
    handUpLeft: boolean = false;
    handUpRight: boolean = false;
    handsClose: boolean = false;

    // KPIs
    stepCount: number = 0;
    kilometers: number = 0;
    calories: number = 0;

    public transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();
    HANDS_CLOSE = 0.8;
    HANDS_NOT_CLOSE = 1.1;
    public makeClap: EventEmitter<WalkBody> = new EventEmitter();
    public clapLocation: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

    placeCamera(camera: THREE.PerspectiveCamera, state: BodyState) {
        // Compute the location behind the avatar
        // Compute the avatar height
        this.cameraSmoot.y = state.data['height'] * 2;
        const advanceFront = this.FRONT_REFERENCE.clone().applyAxisAngle(this.UP_REFERENCE, this.rotationY).normalize();
        this.cameraSmoot.x = this.translationX - advanceFront.x * 15;
        this.cameraSmoot.z = this.translationZ - advanceFront.z * 15;

        this.lastCameraSmoot = this.makeSmoot(camera.position, this.cameraSmoot, this.lastCameraSmoot);
        this.lookAtDestination.setX(this.translationX);
        this.lookAtDestination.setY(state.data['height']);
        this.lookAtDestination.setZ(this.translationZ);
        this.lookAtLastT = this.makeSmoot(this.lookAtActual, this.lookAtDestination, this.lookAtLastT);

        camera.lookAt(this.lookAtActual.x, this.lookAtActual.y, this.lookAtActual.z);

    }

    placeLight(light: THREE.PointLight, state: BodyState) {
        if (state.data['scoreTop'] < this.MIN_SCORE) {
            return;
        }
        light.position.x = this.translationX;
        light.position.y = state.data['height'] * 2;
        light.position.z = this.translationZ;
    }

    makeSmoot(actual: THREE.Vector3, destination: THREE.Vector3, lastTime: number) {
        const actualT = this.now;
        const diffTime = actualT - lastTime;

        const trayectoria = new THREE.Vector3(
            destination.x - actual.x,
            destination.y - actual.y,
            destination.z - actual.z,
        );
        const length = trayectoria.length();
        trayectoria.normalize();
        const thisStep = diffTime * 0.006;
        const currentStep = Math.min(thisStep, length);
        if (currentStep >= 0.0001) {
            trayectoria.multiplyScalar(currentStep);
            actual.x += trayectoria.x;
            actual.y += trayectoria.y;
            actual.z += trayectoria.z;
        } else {
            actual.x = destination.x;
            actual.y = destination.y;
            actual.z = destination.z;
        }
        return actualT;
    }

    computeLeftHand(points: THREE.Vector3[], bodyPointMapIndex: { [key: string]: number }, state: BodyState) {
        // left hand up
        const height = state.data['height'];
        const wristIx = bodyPointMapIndex['left_wrist'];
        const wristHeight = points[wristIx].y;
        const onThreshold = 1.1 * height;
        const offTHreshold = 0.9 * height;
        if (wristHeight > onThreshold) {
            if (this.handUpLeft == false) {
                ModuloSonido.play('/assets/sounds/on1.mp3', false);
                this.handUpLeft = true;
            }
        }
        if (wristHeight < offTHreshold) {
            if (this.handUpLeft == true) {
                //ModuloSonido.play('/assets/sounds/off.mp3', false);
                this.handUpLeft = false;
            }
        }
    }

    computeRightHand(points: THREE.Vector3[], bodyPointMapIndex: { [key: string]: number }, state: BodyState) {
        // left hand up
        const height = state.data['height'];
        const wristIx = bodyPointMapIndex['right_wrist'];
        const wristHeight = points[wristIx].y;
        const onThreshold = 1.1 * height;
        const offTHreshold = 0.9 * height;
        if (wristHeight > onThreshold) {
            if (this.handUpRight == false) {
                ModuloSonido.play('/assets/sounds/on2.mp3', false);
                this.handUpRight = true;
            }
        }
        if (wristHeight < offTHreshold) {
            if (this.handUpRight == true) {
                //ModuloSonido.play('/assets/sounds/off.mp3', false);
                this.handUpRight = false;
            }
        }
    }

    computeHandGet(points: THREE.Vector3[], bodyPointMapIndex: { [key: string]: number }, state: BodyState) {
        const wrist1Ix = bodyPointMapIndex['left_wrist'];
        const wrist2Ix = bodyPointMapIndex['right_wrist'];
        const wrist1 = points[wrist1Ix];
        const wrist2 = points[wrist2Ix];
        const distance = new THREE.Vector3(wrist1.x, wrist1.y, wrist1.z).distanceTo(new THREE.Vector3(wrist2.x, wrist2.y, wrist2.z));
        state.data['hands'] = distance;
        if (distance <= this.HANDS_CLOSE) {
            if (this.handsClose == false) {
                ModuloSonido.play('/assets/sounds/clap.mp3', false);
                this.clapLocation.set((wrist1.x + wrist2.x) / 2, (wrist1.y + wrist2.y) / 2, (wrist1.z + wrist2.z) / 2);
                this.makeClap.emit(this);
                this.handsClose = true;
            }
        } else if (distance > this.HANDS_NOT_CLOSE) {
            if (this.handsClose == true) {
                //ModuloSonido.play('/assets/sounds/off.mp3', false);
                this.handsClose = false;
            }
        }
    }

    computeScores(points: THREE.Vector3[], bodyPointMapIndex: { [key: string]: number }, state: BodyState, scores: number[]) {
        // Compute the average of top points and all points
        // Cabeza
        let topScore = 0;
        let bottomScore = 0;
        let allScore = 0;
        const noseIx = bodyPointMapIndex['nose'];
        allScore += scores[noseIx];
        topScore += scores[noseIx];
        // Manos
        const wrist1Ix = bodyPointMapIndex['left_wrist'];
        allScore += scores[wrist1Ix];
        topScore += scores[wrist1Ix];
        const wrist2Ix = bodyPointMapIndex['right_wrist'];
        allScore += scores[wrist2Ix];
        topScore += scores[wrist2Ix];
        // Tronco
        const left_shoulderIx = bodyPointMapIndex['left_shoulder'];
        allScore += scores[left_shoulderIx];
        topScore += scores[left_shoulderIx];
        bottomScore += scores[left_shoulderIx];
        const right_shoulderIx = bodyPointMapIndex['right_shoulder'];
        topScore += scores[right_shoulderIx];
        allScore += scores[right_shoulderIx];
        bottomScore += scores[right_shoulderIx];
        const left_hipIx = bodyPointMapIndex['left_hip'];
        allScore += scores[left_hipIx];
        bottomScore += scores[left_hipIx];
        const right_hipIx = bodyPointMapIndex['right_hip'];
        allScore += scores[right_hipIx];
        bottomScore += scores[right_hipIx];
        // Pies
        const leftHeelIx = bodyPointMapIndex['left_heel'];
        allScore += scores[leftHeelIx];
        bottomScore += scores[leftHeelIx];
        const rightHeelIx = bodyPointMapIndex['right_heel'];
        allScore += scores[rightHeelIx];
        bottomScore += scores[rightHeelIx];

        state.data['scoreTop'] = Math.round(100 * topScore / 5);
        state.data['scoreBottom'] = Math.round(100 * bottomScore / 6);
        state.data['scoreAll'] = Math.round(100 * allScore / 9);
    }

    capture(points: THREE.Vector3[], bodyPointMapIndex: { [key: string]: number }, state: BodyState, scores: number[]) {
        this.now = new Date().getTime();
        const noseIx = bodyPointMapIndex['nose'];
        const noseHeight = points[noseIx].y;
        state.data['height'] = noseHeight;

        this.computeScores(points, bodyPointMapIndex, state, scores);

        if (state.data['scoreTop'] >= this.MIN_SCORE) {
            // Hands interaction logic here
            this.computeLeftHand(points, bodyPointMapIndex, state);
            this.computeRightHand(points, bodyPointMapIndex, state);
            this.computeHandGet(points, bodyPointMapIndex, state);
        } else {
            // If top is not well detected, abort
            return;
        }
        let differenceAbs = 0;
        let challengeTime = 0;
        if (state.data['scoreBottom'] >= this.MIN_SCORE) {
            // Walk loginc here
            this.computeFront(points, bodyPointMapIndex, state);
            const leftHeelIx = bodyPointMapIndex['left_heel'];
            const rightHeelIx = bodyPointMapIndex['right_heel'];
            const leftHeight = points[leftHeelIx].y;
            const rightHeight = points[rightHeelIx].y;
            const difference = leftHeight - rightHeight;
            differenceAbs = Math.abs(difference);
            let makeStep = false;

            let stepTooLong = false;
            if (this.timeStartFreeze != 0) {
                const difference = this.now - this.timeStartFreeze;
                stepTooLong = difference > this.STEP_FREEZE_MILLIS;
                if (stepTooLong) {
                    challengeTime = difference;
                }
            }

            if (differenceAbs > this.MOVEMENT_THRESHOLD) {
                //console.log(`differenceAbs ${differenceAbs} > this.MOVEMENT_THRESHOLD ${this.MOVEMENT_THRESHOLD}`);
                // Somo foot is elevated more than the other
                if (difference > 0) {
                    // Caused by the left foot
                    if (this.sideState !== 1) {
                        // Foot switch
                        if (!stepTooLong) {
                            // Foot change, make the step of the previous amount
                            this.lastStep = this.maxDifference;
                            this.maxDifference = 0;
                            this.timeStartFreeze = this.now;
                            this.challengeLeftFoot = false;
                            this.challengeRightFoot = false;
                            makeStep = true;
                            this.sideState = 1;
                        }
                    }
                    if (!this.challengeLeftFoot && stepTooLong) {
                        // Start counting long period
                        ModuloSonido.play('/assets/sounds/challenge_start.mp3', false);
                        ModuloSonido.play('/assets/sounds/tictoc.mp3', true);
                        this.overpassLastMax = false;
                        this.challengeLeftFoot = true;
                    }
                } else {
                    // Caused by the right foot
                    if (this.sideState !== 2) {
                        if (!stepTooLong) {
                            this.lastStep = this.maxDifference;
                            this.maxDifference = 0;
                            this.timeStartFreeze = this.now;
                            this.challengeLeftFoot = false;
                            this.challengeRightFoot = false;
                            makeStep = true;
                            this.sideState = 2;
                        }
                    }
                    if (!this.challengeRightFoot && stepTooLong) {
                        // Start counting long period
                        ModuloSonido.play('/assets/sounds/challenge_start.mp3', false);
                        ModuloSonido.play('/assets/sounds/tictoc.mp3', true);
                        this.overpassLastMax = false;
                        this.challengeRightFoot = true;
                    }
                }
                this.maxDifference = Math.max(this.maxDifference, differenceAbs);
            } else {
                // Both foots on the floor
                if (this.challengeLeftFoot || this.challengeRightFoot) {
                    this.maxDifference = 0; // it makes don't make any step after challenge
                    ModuloSonido.stop('/assets/sounds/tictoc.mp3');
                    ModuloSonido.play('/assets/sounds/challenge_finish.mp3', false);
                    if (this.maxChallengeTime < challengeTime) {
                        this.maxChallengeTime = challengeTime;
                    }
                }
                this.sideState = 0;
                this.timeStartFreeze = 0;
                this.challengeLeftFoot = false;
                this.challengeRightFoot = false;
            }
            state.data.difference = difference * 10;
            state.data.sideState = this.sideState;
            state.data.lastStep = this.lastStep * 10;

            if (!this.overpassLastMax) {
                if (this.maxChallengeTime < challengeTime) {
                    this.overpassLastMax = true;
                    if (this.maxChallengeTime > 0) {
                        ModuloSonido.play('/assets/sounds/newscore.mp3', false);
                    }
                }
            }

            if (makeStep) {
                this.rotationY += state.data['angle'] * this.ROTATION_AMOUNT;
                const advanceFront = this.FRONT_REFERENCE.clone().applyAxisAngle(this.UP_REFERENCE, this.rotationY).normalize();
                let forward = 1;
                if (this.handsClose) {
                    forward = -1;
                }
                this.translationX += (advanceFront.x * this.lastStep * this.STEP_AMOUNT) * forward;
                this.translationZ += (advanceFront.z * this.lastStep * this.STEP_AMOUNT) * forward;
                const translationMatrix = new THREE.Matrix4().makeTranslation(this.translationX, 0, this.translationZ);
                const rotationMatrix = new THREE.Matrix4().makeRotationY(this.rotationY);
                this.transformationMatrix = new THREE.Matrix4().multiplyMatrices(translationMatrix, rotationMatrix);
                this.stepCount += 1;
                this.lastStep = 0;
            }
        }

        state.data['maxChallengeTime'] = (this.maxChallengeTime / 1000).toFixed(0);
        state.data['challengeTime'] = (challengeTime / 1000).toFixed(0);
        state.data['stepCount'] = this.stepCount;
        this.kilometers = this.computeKilometers(this.stepCount);
        state.data['kilometers'] = this.kilometers.toFixed(2);
        this.calories = this.computeCalories(this.stepCount);
        state.data['calories'] = this.calories.toFixed(1);
        state.data['trans'] = {
            'rotationY': this.rotationY * 180 / Math.PI,
            'translationX': this.translationX,
            'translationZ': this.translationZ,
        };
    }

    computeKilometers(steps: number) {
        const METERS_PER_STEP = 0.762;
        return steps * METERS_PER_STEP / 1000;
    }

    computeCalories(steps: number) {
        const CALORIES_PER_STEP = 0.04;
        return steps * CALORIES_PER_STEP;
    }

    getVector(point: BodyKeyPointData) {
        return new THREE.Vector3(point.x, point.y, point.z);
    }

    computeFront(points: THREE.Vector3[], bodyPointMapIndex: { [key: string]: number }, state: BodyState) {
        const left_shoulderIx = bodyPointMapIndex['left_shoulder'];
        const right_shoulderIx = bodyPointMapIndex['right_shoulder'];
        const left_hipIx = bodyPointMapIndex['left_hip'];
        const right_hipIx = bodyPointMapIndex['right_hip'];

        const left_shoulder = points[left_shoulderIx];
        const right_shoulder = points[right_shoulderIx];
        const left_hip = points[left_hipIx];
        const right_hip = points[right_hipIx];

        const v1 = new THREE.Vector3(left_hip.x - right_hip.x, left_hip.y - right_hip.y, left_hip.z - right_hip.z);
        const v2 = new THREE.Vector3(right_shoulder.x - right_hip.x, right_shoulder.y - right_hip.y, right_shoulder.z - right_hip.z);
        const front1 = new THREE.Vector3().crossVectors(v1, v2).normalize();

        const v1p = new THREE.Vector3(right_shoulder.x - left_shoulder.x, right_shoulder.y - left_shoulder.y, right_shoulder.z - left_shoulder.z);
        const v2p = new THREE.Vector3(left_hip.x - left_shoulder.x, left_hip.y - left_shoulder.y, left_hip.z - left_shoulder.z);
        const front2 = new THREE.Vector3().crossVectors(v1p, v2p).normalize();

        this.front.setX((front1.x + front2.x) / 2);
        this.front.setY(0);
        this.front.setZ((front1.z + front2.z) / 2);
        this.front.normalize();

        const angle = this.FRONT_REFERENCE.angleTo(this.front);
        state.data['front'] = {
            x: this.front.x,
            z: this.front.z,
        };
        state.data['angle'] = (this.front.z < 0 ? -1 : 1) * angle;
        state.data['angle_deg'] = state.data['angle'] * 180 / Math.PI;
    }
}