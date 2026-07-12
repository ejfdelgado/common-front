import { SelectOptionString } from "./fieldsTypes";
import { FeatureObjectAssetSet } from "./WorldAvatar";

const BUCKET_ROOT = "https://storage.googleapis.com/pro-ejflab-assets/avatar_assets/";

// https://storage.googleapis.com/pro-ejflab-assets/avatar_assets/avatar_meshes/
export const MESH_OPTIONS: SelectOptionString[] = [
    { label: 'Tigresa', value: "tigresa009_1_web.glb" },
    { label: 'Coco', value: "cocodrilo009_1_web.glb" },
    { label: 'Huesos', value: "esqueleto009_1_web.glb" },
    { label: 'Bender', value: "bender_decimate2_web.glb" },
    { label: 'Steve', value: "steve_raw_web.glb" },
    { label: 'Star Wars', value: "starwars_decimate_web.glb" },
];

export type ABCDType = "cube" | "futbol" | "fruits";

export const ABCDSet: FeatureObjectAssetSet = {
    name: "abcd",
    set: [
        {
            name: "cube",
            objects: [
                {
                    name: "cube_a",
                    meshUrl: BUCKET_ROOT + "accessories/cube001.glb",
                    diffuseUrl: BUCKET_ROOT + "accessories/textures/a_cube.jpg"
                },
                {
                    name: "cube_b",
                    meshUrl: BUCKET_ROOT + "accessories/cube001.glb",
                    diffuseUrl: BUCKET_ROOT + "accessories/textures/b_cube3.jpg"
                },
                {
                    name: "cube_c",
                    meshUrl: BUCKET_ROOT + "accessories/cube001.glb",
                    diffuseUrl: BUCKET_ROOT + "accessories/textures/c_cube.jpg"
                },
                {
                    name: "cube_d",
                    meshUrl: BUCKET_ROOT + "accessories/cube001.glb",
                    diffuseUrl: BUCKET_ROOT + "accessories/textures/d_cube.jpg"
                }
            ],
        },
        {
            name: "futbol",
            objects: [
                {
                    name: "cube_a",
                    meshUrl: BUCKET_ROOT + "accessories/ball_web.glb",
                    diffuseUrl: BUCKET_ROOT + "accessories/textures/a_ball.jpg"
                },
                {
                    name: "cube_b",
                    meshUrl: BUCKET_ROOT + "accessories/ball_web.glb",
                    diffuseUrl: BUCKET_ROOT + "accessories/textures/b_ball.jpg"
                },
                {
                    name: "cube_c",
                    meshUrl: BUCKET_ROOT + "accessories/ball_web.glb",
                    diffuseUrl: BUCKET_ROOT + "accessories/textures/c_ball.jpg"
                },
                {
                    name: "cube_d",
                    meshUrl: BUCKET_ROOT + "accessories/ball_web.glb",
                    diffuseUrl: BUCKET_ROOT + "accessories/textures/d_ball.jpg"
                }
            ],
        },
        {
            name: "fruits",
            objects: [
                {
                    name: "cube_a",
                    meshUrl: BUCKET_ROOT + "accessories/apple_web.glb"
                },
                {
                    name: "cube_b",
                    meshUrl: BUCKET_ROOT + "accessories/banana_web2.glb"
                },
                {
                    name: "cube_c",
                    meshUrl: BUCKET_ROOT + "accessories/mora_web.glb"
                },
                {
                    name: "cube_d",
                    meshUrl: BUCKET_ROOT + "accessories/pinia_web.glb"
                }
            ],
        },
        {
            name: "minecraft",
            objects: [
                {
                    name: "cube_a",
                    meshUrl: BUCKET_ROOT + "accessories/mine01.glb"
                },
                {
                    name: "cube_b",
                    meshUrl: BUCKET_ROOT + "accessories/mine02.glb"
                },
                {
                    name: "cube_c",
                    meshUrl: BUCKET_ROOT + "accessories/mine03.glb"
                },
                {
                    name: "cube_d",
                    meshUrl: BUCKET_ROOT + "accessories/mine04.glb"
                }
            ],
        }
    ]
}