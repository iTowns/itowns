import * as THREE from 'three';
import { Extent } from '@itowns/geographic';

// shader for copying a 2D texture to a framebuffer
const copyTextureShader = {
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShaderMercator: `
        precision highp float;
        #include <itowns/pitUV>

        varying vec2 vUv;

        uniform sampler2D map;
        uniform vec2 camera_footprint;
        uniform vec2 texture_footprint;
        uniform vec4 offsetScale;
        uniform float opacity;

        const float CTOYL = 20037508.34 / 3.141592653589793 * 0.69314718;

        float toY(float lat) {
            float s = sin(lat);
            return 0.5 * log2((1.0 + s) / (1.0 - s)) * CTOYL;
        }


        void main() {
            vec2 vMapUv = vUv;

            if (camera_footprint.y < 0.01) {
                vMapUv = pitUV(vUv, offsetScale);
            } else {
                float y = toY(vUv.y * camera_footprint.y + camera_footprint.x);
                vMapUv.y = (y - texture_footprint.x) * texture_footprint.y;
            }

            if (vMapUv.y < 0.0 || vMapUv.y > 1.0) {
                discard;
            } else {
                gl_FragColor = texture2D(map, vMapUv);
                gl_FragColor.a *= opacity;
            }
        }
    `,
    fragmentShaderUnit: `
        precision highp float;
        varying vec2 vUv;

        uniform float opacity;
        uniform sampler2D map;

        void main() {
            gl_FragColor = texture2D(map, vUv);
            gl_FragColor.a *= opacity;
        }
    `,
};

export const materialMercatorToWGS84 = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
        // This uniform will be updated with each source 2D texture
        map: { value: null },
        texture_footprint: { value: new THREE.Vector2() },
        camera_footprint: { value: new THREE.Vector2() },
        offsetScale: { value: new THREE.Vector4() },
        opacity: { value: 1.0 },
    },
    vertexShader: copyTextureShader.vertexShader,
    fragmentShader: copyTextureShader.fragmentShaderMercator,
});

export const materialUnit =  new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
        map: { value: null },
        opacity: { value: 1.0 },
    },
    vertexShader: copyTextureShader.vertexShader,
    fragmentShader: copyTextureShader.fragmentShaderUnit,
});

const txExtent = new Extent('EPSG:4326');
const ex = new Extent('EPSG:4326');

materialMercatorToWGS84.setUniforms = (texture, tileExtent, rasterTile) => {
    const { map, camera_footprint, opacity, texture_footprint, offsetScale } = materialMercatorToWGS84.uniforms;

    map.value = texture;
    opacity.value = rasterTile.opacity;

    camera_footprint.value.set(tileExtent.south, Math.abs(tileExtent.north - tileExtent.south));
    camera_footprint.value.multiplyScalar(THREE.MathUtils.DEG2RAD);

    texture.extent.toExtent(texture.extent.crs, txExtent);
    tileExtent.offsetToParent(txExtent.as(tileExtent.crs, ex), offsetScale.value);

    texture_footprint.value.set(txExtent.south, 1 / Math.abs(txExtent.north - txExtent.south));
};

materialUnit.setUniforms = (texture, tileExtent, rasterTile) => {
    materialUnit.uniforms.map.value = texture;
    materialUnit.uniforms.opacity.value = rasterTile.opacity;
};
