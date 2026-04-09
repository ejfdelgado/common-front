import * as THREE from 'three';

const CameraByPassShader = (
    camera: THREE.PerspectiveCamera,
) => {
    return (
        shader: THREE.WebGLProgramParametersWithUniforms,
    ) => {
        shader.uniforms['cameraPos'] = { value: camera.position };
        shader.uniforms['nearFade'] = { value: 0 };
        shader.uniforms['farFade'] = { value: 20 };
        shader.uniforms['near2'] = { value: 30 };
        shader.uniforms['far2'] = { value: 45 };

        shader.vertexShader = shader.vertexShader
            .replace(
                '#include <common>',
                `#include <common>
             varying vec3 vWorldPosition;`
            )
            .replace(
                '#include <worldpos_vertex>',
                `#include <worldpos_vertex>
             vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`
            );

        shader.fragmentShader = shader.fragmentShader
            .replace(
                '#include <common>',
                `#include <common>
             uniform vec3 cameraPos;
             uniform float nearFade;
             uniform float farFade;
             uniform float near2;
             uniform float far2;
             varying vec3 vWorldPosition;`
            )
            .replace(
                '#include <dithering_fragment>',
                `#include <dithering_fragment>
            float d = distance(cameraPos, vWorldPosition);

            float fadeNear = smoothstep(nearFade, farFade, d);
            float fadeFar  = 1.0 - smoothstep(near2, far2, d);
            float alphaFactor = fadeNear * fadeFar;
            gl_FragColor = vec4(gl_FragColor.rgb, gl_FragColor.a * alphaFactor);
            `
            );
    };
};


export {
    CameraByPassShader,
};