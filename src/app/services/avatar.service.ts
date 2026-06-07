import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { IndicatorService } from "./indicator.service";
import { GameControllerEnum, WorldAvatar } from "@mytypes/WorldAvatar";

@Injectable({
    providedIn: 'root',
})
export class AvatarService {
    constructor(
        private http: HttpClient,
        private indicatorSrv: IndicatorService,
    ) { }

    async loadWorld(url: string): Promise<WorldAvatar> {
        return new Promise((resolve) => {
            setTimeout(() => {
                const model: WorldAvatar = {
                    defaultMode: "mode00",
                    config: {
                        useLivePeer: true,
                        useVoice: true,
                    },
                    modes: {
                        "mode00": {
                            menu: {
                                name: "Wardrove",
                                icon: "👖",
                            },
                            mirror: true,
                            defaultPosition: {
                                positionX: 0,
                                positionY: 0,
                                positionZ: 0,
                                rotationY: 0,
                            },
                            defaultCameraState: {
                                near: 0.1,
                                far: 1000,
                                fov: 30,
                                lookAt: { x: 0, y: 1, z: 0 },
                                position: { x: 0, y: 1, z: 5 },
                            },
                            defaultSenario: "scenario01",
                            scenarios: {
                                "scenario01": {
                                    useComposer: true,
                                    background: { color: { r: 0.5, g: 1, b: 0.5 } },
                                    characters: [],
                                    meshes: []
                                }
                            },
                            controllers: [
                                { id: GameControllerEnum.ComparableController, params: {} },
                                { id: GameControllerEnum.Stand2dController, params: {} },
                                //{ id: GameControllerEnum.CubeController, params: { enabled: false } },
                                { id: GameControllerEnum.SoundFeedbackController, params: {} },
                                { id: GameControllerEnum.SharePoseController, params: {} },
                                //{ id: GameControllerEnum.FingerController, params: {} },
                                { id: GameControllerEnum.HandPointerController, params: {} },
                                { id: GameControllerEnum.ArmsPointerController, params: {} },
                            ]
                        },
                        "mode01": {
                            menu: {
                                name: "Park I",
                                icon: "🏞️",
                            },
                            mirror: false,
                            defaultPosition: {
                                positionX: 3,
                                positionY: 0,
                                positionZ: 3,
                                rotationY: Math.PI / 2,
                            },
                            defaultCameraState: {
                                near: 0.1,
                                far: 1000,
                                fov: 25,
                                lookAt: { x: 3, y: 0, z: 3 },
                                position: { x: -10, y: 5, z: 10 },
                            },
                            defaultSenario: "scenario01",
                            scenarios: {
                                "scenario01": {
                                    useComposer: true,
                                    background: { color: { r: 0.5, g: 0.5, b: 1 } },
                                    characters: [],
                                    meshes: [
                                        {
                                            name: "scenario_a",
                                            url: "/assets/models/scenario.glb",
                                        }
                                    ]
                                }
                            },
                            controllers: [
                                { id: GameControllerEnum.ComparableController, params: {} },
                                { id: GameControllerEnum.SimplePosesDetection, params: {} },
                                { id: GameControllerEnum.TerrainElevationController, params: {} },
                                { id: GameControllerEnum.WalkController, params: {} },
                                { id: GameControllerEnum.Stand2dController, params: {} },
                                { id: GameControllerEnum.SoundFeedbackController, params: {} },
                                { id: GameControllerEnum.SharePoseController, params: {} },
                            ],
                            characters: [
                                /*{
                                    name: "friend",
                                    defaultAnimation: "initial",
                                    animations: {
                                        "initial": {
                                            animationUrl: "animations/animation.bin",
                                            loop: true,
                                        }
                                    }
                                }*/
                            ],
                        },
                        "mode02": {
                            menu: {
                                name: "Park II",
                                icon: "🎄",
                            },
                            mirror: false,
                            defaultPosition: {
                                positionX: 3,
                                positionY: 0,
                                positionZ: 3,
                                rotationY: Math.PI / 2,
                            },
                            defaultCameraState: {
                                near: 0.1,
                                far: 1000,
                                fov: 25,
                                lookAt: { x: 3, y: 0, z: 3 },
                                position: { x: -10, y: 5, z: 10 },
                            },
                            defaultSenario: "scenario01",
                            scenarios: {
                                "scenario01": {
                                    useComposer: true,
                                    background: { color: { r: 0.5, g: 0.5, b: 1 } },
                                    characters: [],
                                    meshes: [
                                        {
                                            name: "scenario_a",
                                            url: "/assets/models/scenario.glb",
                                        }
                                    ]
                                }
                            },
                            controllers: [
                                { id: GameControllerEnum.ComparableController, params: {} },
                                { id: GameControllerEnum.SimplePosesDetection, params: {} },
                                { id: GameControllerEnum.HandsCloseController, params: {} },
                                { id: GameControllerEnum.TerrainElevationController, params: {} },
                                { id: GameControllerEnum.WalkController, params: {} },
                                { id: GameControllerEnum.Stand2dController, params: {} },
                                { id: GameControllerEnum.SoundFeedbackController, params: {} },
                                { id: GameControllerEnum.RecordPoseController, params: {} },
                                { id: GameControllerEnum.CubeController, params: { enabled: false } },
                            ],
                            characters: [
                                /*{
                                    name: "friend",
                                    defaultAnimation: "initial",
                                    animations: {
                                        "initial": {
                                            animationUrl: "animations/animation.bin",
                                            loop: true,
                                        }
                                    }
                                }*/
                            ],
                        }
                    }
                };
                resolve(model);
            }, 500);
        });
    }
}