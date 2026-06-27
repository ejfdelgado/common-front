import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { IndicatorService } from "./indicator.service";
import { GameControllerEnum, WorldAvatar } from "@mytypes/WorldAvatar";
import { firstValueFrom } from "rxjs";
import { sleep } from "../tools/rxjsUtils";

@Injectable({
    providedIn: 'root',
})
export class AvatarService {
    constructor(
        private http: HttpClient,
        private indicatorSrv: IndicatorService,
    ) { }

    async loadWorld(url: string): Promise<WorldAvatar> {
        const read = await firstValueFrom(this.http.get("/assets/scenarios/test.json", {
            responseType: "json",
        }));
        return read as any;
    }

    async loadWorldOld(url: string): Promise<WorldAvatar> {
        return new Promise((resolve) => {
            setTimeout(() => {
                const model: WorldAvatar = {
                    defaultMode: "mode03",
                    config: {
                        useLivePeer: true,
                        useVoice: false,// Speech to text
                    },
                    modes: {
                        "mode00": {
                            useHands: true,
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
                                { id: GameControllerEnum.ArmsPointerController, params: {} },
                                { id: GameControllerEnum.HandPointerController, params: {} },
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
                        },
                        "mode03": {
                            menu: {
                                name: "Hands",
                                icon: "🙉",
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
                                    meshes: [],
                                    steps: [
                                        {
                                            label: "¿Cuántos corazones tiene un pulpo?",
                                            options: [
                                                {
                                                    points: 0, label: "Un corazón",
                                                    answer: "La próxima vez seguro lo recordarás mejor. Los humanos tenemos un solo corazón, pero los pulpos tienen 3. Dos bombean sangre a las branquias y uno a todo el cuerpo."
                                                },
                                                { points: 1, label: "Tres corazónes", answer: "¡Sí, tres! Dos bombean sangre a las branquias y uno a todo el cuerpo." },
                                            ]
                                        },
                                        {
                                            label: "¿De qué color es la lengua de una jirafa?",
                                            options: [
                                                { points: 0, label: "Rosada", answer: "Casi aciertas. Es morada para protegerse del sol mientras come hojas todo el día." },
                                                { points: 1, label: "Morada/azul", answer: "Excelente, Es morada para protegerse del sol mientras come hojas todo el día." },
                                            ]
                                        },
                                        {
                                            label: "¿Qué animal nunca duerme acostado y puede dormir de pie?",
                                            options: [
                                                { points: 1, label: "El caballo", answer: "Muy bien, Los caballos pueden dormir parados para escapar rápido del peligro." },
                                                { points: 0, label: "El conejo", answer: "Estabas cerca, Los caballos pueden dormir parados para escapar rápido del peligro." },
                                            ]
                                        },
                                        {
                                            label: "¿Cuál de estos animales puede cambiar de color?",
                                            options: [
                                                { points: 1, label: "El camaleón", answer: "Acertaste! El camaleón cambia de color para esconderse y también según cómo se siente." },
                                                { points: 0, label: "El elefante", answer: "Puedes volver a intentarlo más tarde. El camaleón cambia de color para esconderse y también según cómo se siente." },
                                            ]
                                        },
                                        {
                                            label: "¿Qué animal es tan fuerte que puede cargar cosas mucho más pesadas que su propio cuerpo?",
                                            options: [
                                                { points: 0, label: "La tortuga", answer: "Luego tendrás otra oportunidad, ¡Una hormiga puede levantar hasta 50 veces su peso! Sería como si tú cargaras un carro." },
                                                { points: 1, label: "La hormiga", answer: "Genial! ¡Una hormiga puede levantar hasta 50 veces su peso! Sería como si tú cargaras un carro." },
                                            ]
                                        },
                                        /*
                                        {
                                            label: "",
                                            options: [
                                                { points: 0, label: "", answer: "" },
                                                { points: 1, label: "", answer: "" },
                                            ]
                                        },
                                        */
                                    ],
                                }
                            },
                            controllers: [
                                { id: GameControllerEnum.ComparableController, params: {} },
                                { id: GameControllerEnum.Stand2dController, params: {} },
                                { id: GameControllerEnum.CubeController, params: { enabled: false } },
                                { id: GameControllerEnum.SoundFeedbackController, params: {} },
                                { id: GameControllerEnum.QuestionaireController, params: {} },
                            ]
                        },
                    }
                };

                resolve(model);
            }, 500);
        });
    }
}