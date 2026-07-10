import { FeatureObjectAssetSet } from "./WorldAvatar";

const BUCKET_ROOT = "https://storage.googleapis.com/pro-ejflab-assets/avatar_assets/";

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
        }
    ]
}