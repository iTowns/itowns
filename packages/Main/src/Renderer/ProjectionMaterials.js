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

        varying vec2 vUv;

        uniform sampler2D map;
        uniform vec2 extentCamera;
        uniform vec2 extentTexture;
        uniform mat3 mapTransform;
        uniform float opacity;

        const float CTOYL = 20037508.34 / 3.141592653589793 * 0.69314718;

        float toY(float lat) {
            float s = sin(lat);
            return 0.5 * log2((1.0 + s) / (1.0 - s)) * CTOYL;
        }

        void main() {
            vec2 vMapUv = vUv;

            // Tile is little
            if (extentCamera.y < 0.01) {
                vMapUv = ( mapTransform * vec3( vUv, 1 ) ).xy;
            } else {
                float y = toY(vUv.y * extentCamera.y + extentCamera.x);
                vMapUv.y = (y - extentTexture.x) * extentTexture.y;
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
        extentTexture: { value: new THREE.Vector2() },
        extentCamera: { value: new THREE.Vector2() },
        mapTransform: { value: new THREE.Matrix3() },
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
    const { map, extentCamera, opacity, extentTexture, mapTransform } = materialMercatorToWGS84.uniforms;

    map.value = texture;
    opacity.value = rasterTile.opacity;

    extentCamera.value.set(tileExtent.south, Math.abs(tileExtent.north - tileExtent.south));
    extentCamera.value.multiplyScalar(THREE.MathUtils.DEG2RAD);

    texture.extent.toExtent(texture.extent.crs, txExtent);
    tileExtent.transformToParent(txExtent.as(tileExtent.crs, ex), mapTransform.value);

    extentTexture.value.set(txExtent.south, 1 / Math.abs(txExtent.north - txExtent.south));
};

materialUnit.setUniforms = (texture, tileExtent, rasterTile) => {
    materialUnit.uniforms.map.value = texture;
    materialUnit.uniforms.opacity.value = rasterTile.opacity;
};
