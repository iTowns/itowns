import * as THREE from 'three';
import { RasterTile } from './RasterTile';

// Define the shader for copying a 2D texture to a framebuffer
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

let renderTarget: THREE.WebGLRenderTarget | null = null;
let material: THREE.ShaderMaterial | null = null;
let geometry: THREE.PlaneGeometry | null = null;

/**
 * Renders a single 2D texture layer into the DataArrayTexture on the GPU.
 * This function is called for each layer.
 *
 * @param renderer - The Three.js WebGLRenderer instance.
 * @param renderTarget - A temporary WebGLRenderTarget
 * used to bind the framebuffer.
 * @param dataArrayTextureToPopulate - The DataArrayTexture
 * that layers are being written into.
 * @param layerIndex - The index of the layer
 * in the DataArrayTexture to write to.
 * @param quadScene - The scene containing the quad used for rendering.
 * @param quadCam - The camera for the quad scene.
 */
function drawTextureLayer(
    renderer: THREE.WebGLRenderer,
    renderTarget: THREE.WebGLRenderTarget,
    dataArrayTextureToPopulate: THREE.DataArrayTexture,
    layerIndex: number,
    quadScene: THREE.Scene,
    quadCam: THREE.OrthographicCamera,
) {
    const gl = renderer.getContext();

    // 1. Set the render target.
    const current = renderer.getRenderTarget();
    renderer.setRenderTarget(renderTarget);

    // 2. Get the raw WebGLTexture object for the DataArrayTexture.
    const props = renderer.properties.get(dataArrayTextureToPopulate) as
        { __webglTexture: WebGLTexture };
    const dataArrayTextureWebGL = props.__webglTexture;

    // 3. Attach the specific layer of the DataArrayTexture to the framebuffer's
    // COLOR_ATTACHMENT0. The framebuffer is already bound by
    // `renderer.setRenderTarget(renderTarget)`.
    if ('framebufferTextureLayer' in gl) {
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
            dataArrayTextureWebGL, 0, layerIndex);
    } else {
        console.error('framebufferTextureLayer function not supported');
        return;
    }

    // 4. Check framebuffer status after attaching the layer.
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.error('Framebuffer not complete after attaching layer:', status);
        return;
    }

    // 5. Render the quad scene.
    renderer.render(quadScene, quadCam);

    // 6. Reset render target to null. This unbinds the custom framebuffer
    // and restores the default framebuffer (usually the screen).
    renderer.setRenderTarget(current);
}

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
 * @returns True if the function succeeded
 */
export function makeDataArrayTexture(
    uTextures: THREE.IUniform, width: number, height: number, count: number, tiles: RasterTile[],
    max: number,
): boolean {
    // If no textures found, dispose previous DataArrayTexture and reset
    if (count === 0) {
        if (uTextures.value instanceof THREE.DataArrayTexture) { uTextures.value.dispose(); }
        uTextures.value = new THREE.DataArrayTexture();
        return false;
    }

    const renderer: THREE.WebGLRenderer = view.renderer;
    const gl = renderer.getContext();
    if (!('TEXTURE_2D_ARRAY' in gl && 'texStorage3D' in gl)) {
        console.error('Some WebGL features are missing');
        return false;
    }

    // Dispose previous DataArrayTexture to prevent memory leaks if re-creating
    if (uTextures.value instanceof THREE.DataArrayTexture) { uTextures.value.dispose(); }

    // Create a new THREE.DataArrayTexture.
    uTextures.value = new THREE.DataArrayTexture(null, width, height, count);

    // Manually initialize the WebGL
    // texture with immutable storage (gl.texStorage3D)
    // This is a requirement for attaching layers to a framebuffer.
    const textureProps = renderer.properties.get(uTextures.value) as
        { __webglTexture: WebGLTexture };
    textureProps.__webglTexture = gl.createTexture(); // Create a raw WebGL texture
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureProps.__webglTexture);
    // Allocate immutable storage
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, width, height, count);

    // Create a temporary THREE.WebGLRenderTarget.
    // This render target's internal framebuffer
    // will be used to attach layers.
    if (!renderTarget) {
        renderTarget = new THREE.WebGLRenderTarget(width, height, {
            depthBuffer: false, // No depth buffer needed for simple 2D texture copy
        });
    }

    // Set up the quad for rendering
    const quadScene = new THREE.Scene();
    const quadCam = new THREE.OrthographicCamera(
        -1, 1, 1, -1, 0, 1);
    if (!geometry) {
        geometry = new THREE.PlaneGeometry(2, 2);
    }
    if (!material) {
        material = new THREE.ShaderMaterial({
            uniforms: {
                // This uniform will be updated with each source 2D texture
                sourceTexture: { value: null },
            },
            vertexShader: copyTextureShader.vertexShader,
            fragmentShader: copyTextureShader.fragmentShader,
        });
    }
    const quad = new THREE.Mesh(geometry, material);
    quadScene.add(quad);

    // loop through each tile and its textures
    // to render them into DataArrayTexture layers
    count = 0;
    for (const tile of tiles) {
        for (
            let i = 0;
            i < tile.textures.length && count < max;
            ++i, ++count
        ) {
            // Set the current source 2D texture on the quad's material
            material.uniforms.sourceTexture.value = tile.textures[i];

            // render this source texture into the current layer
            drawTextureLayer(renderer, renderTarget, uTextures.value,
                count, quadScene, quadCam);
        }
    }

    return true;
}
