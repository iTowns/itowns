import * as THREE from 'three';
import { RasterTile } from './RasterTile';

// shader for copying a 2D texture to a framebuffer
const copyTextureShader = {
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        precision highp float;
        uniform sampler2D sourceTexture;
        varying vec2 vUv;
        void main() {
            gl_FragColor = texture2D(sourceTexture, vUv);
        }
    `,
};

let material: THREE.ShaderMaterial | null = null;
let quad: THREE.Mesh | null = null;
const quadCam: THREE.OrthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

/**
 * Initializes a THREE.DataArrayTexture with immutable storage and populates
 * its layers by rendering individual 2D textures onto them using the GPU.
 *
 * @param uTextures - The uniform object containing the
 * THREE.DataArrayTexture to be initialized and populated.
 * @param width - The width of each layer in the DataArrayTexture.
 * @param height - The height of each layer in the DataArrayTexture.
 * @param count - The total number of layers the DataArrayTexture should have.
 * @param tiles - An array of RasterTile objects, each containing textures.
 * @param max - The maximum allowed number of layers for the DataArrayTexture.
 * @param renderer - The renderer used to render the texture.
 * @returns True if the function succeeded
 */
export function makeDataArrayTexture(
    uTextures: THREE.IUniform, width: number, height: number, count: number, tiles: RasterTile[],
    max: number, renderer: THREE.WebGLRenderer): boolean {
    if (count === 0) { return false; }

    // Create a temporary THREE.WebGLArrayRenderTarget.
    // This render target's internal framebuffer
    // will be used to attach layers.
    const renderTarget = new THREE.WebGLArrayRenderTarget(width, height, count, {
        depthBuffer: false, // No depth buffer needed for simple 2D texture copy
    });

    const arrayTexture = renderTarget.texture;
    uTextures.value = arrayTexture;

    // Set up the quad for rendering
    if (!quad) {
        const geometry = new THREE.PlaneGeometry(2, 2);
        material = new THREE.ShaderMaterial({
            uniforms: {
                // This uniform will be updated with each source 2D texture
                sourceTexture: { value: null },
            },
            vertexShader: copyTextureShader.vertexShader,
            fragmentShader: copyTextureShader.fragmentShader,
        });
        quad = new THREE.Mesh(geometry, material);
    }

    // loop through each tile and its textures
    // to render them into DataArrayTexture layers
    let currentLayerIndex = 0;
    for (const tile of tiles) {
        for (
            let i = 0;
            i < tile.textures.length && currentLayerIndex < max;
            ++i, ++currentLayerIndex
        ) {
            const texture = tile.textures[i];
            if (!texture) { continue; }

            // Set the current source 2D texture on the quad's material
            material!.uniforms.sourceTexture.value = texture;

            if (!currentLayerIndex) {
                // Set parameters from the first found texture
                arrayTexture.magFilter = texture.magFilter;
                arrayTexture.minFilter = texture.minFilter;
                arrayTexture.wrapS = texture.wrapS;
                arrayTexture.wrapT = texture.wrapT;
                arrayTexture.format = texture.format;
                arrayTexture.type = texture.type;
                arrayTexture.internalFormat = texture.internalFormat;
            }

            // render this source texture into the current layer
            const previousRenderTarget = renderer.getRenderTarget();
            renderer.setRenderTarget(renderTarget, currentLayerIndex);
            renderer.render(quad, quadCam);
            renderer.setRenderTarget(previousRenderTarget);
        }
    }

    return true;
}
