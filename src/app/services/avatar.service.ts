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
                    defaultMode: "mode01",
                    modes: {
                        "mode01": {
                            defaultPosition: {
                                positionX: 0,
                                positionY: 0,
                                positionZ: 0,
                                rotationY: 0,
                            },
                            defaultCameraState: {
                                near: 0.1,
                                far: 1000,
                                fov: 25,
                                lookAt: { x: 0, y: 0, z: 0 },
                                position: { x: 10, y: 5, z: 10 },
                            },
                            defaultSenario: "scenario01",
                            scenarios: {
                                "scenario01": {
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
                                {
                                    id: GameControllerEnum.ComparableController,
                                    params: {}
                                }
                            ]
                        }
                    }
                };
                resolve(model);
            }, 500);
        });
    }
}