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

let renderTarget: THREE.WebGLRenderTarget | null = null;
let material: THREE.ShaderMaterial | null = null;
let quadScene: THREE.Scene | null = null;
let quadCam: THREE.OrthographicCamera | null = null;

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

    // save the previous render target and temporarily set the new one
    const previousRenderTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(renderTarget);

    // get the raw WebGLTexture object for the DataArrayTexture
    const props = renderer.properties.get(dataArrayTextureToPopulate) as
        { __webglTexture: WebGLTexture };
    const dataArrayTextureWebGL = props.__webglTexture;

    // attach the specific layer of the DataArrayTexture to the framebuffer's
    // COLOR_ATTACHMENT0
    if ('framebufferTextureLayer' in gl) {
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
            dataArrayTextureWebGL, 0, layerIndex);
    } else {
        console.error('framebufferTextureLayer function not supported');
        return;
    }

    renderer.render(quadScene, quadCam);

    // reset render target to the old one
    renderer.setRenderTarget(previousRenderTarget);
}

function getInternalFormat(
    gl: WebGL2RenderingContext,
    format: THREE.PixelFormat,
    type: THREE.TextureDataType): number {
    if (type === THREE.UnsignedByteType) {
        switch (format) {
            case THREE.RGBAFormat:
                return gl.RGBA8;
            case THREE.RedFormat:
                return gl.R8;
            case THREE.RGBFormat:
                return gl.RGB8;
            default:
                console.error(`Unsupported format/type combo: format=${format}, type=UnsignedByte`);
                return -1;
        }
    }

    if (type === THREE.FloatType) {
        switch (format) {
            case THREE.RGBAFormat:
                return gl.RGBA32F;
            case THREE.RedFormat:
                return gl.R32F;
            case THREE.RGBFormat:
                return gl.RGB32F;
            default:
                console.error(`Unsupported format/type combo: format=${format}, type=Float`);
                return -1;
        }
    }

    if (type === THREE.HalfFloatType) {
        switch (format) {
            case THREE.RGBAFormat:
                return gl.RGBA16F;
            case THREE.RedFormat:
                return gl.R16F;
            case THREE.RGBFormat:
                return gl.RGB16F;
            default:
                console.error(`Unsupported format/type combo: format=${format}, type=HalfFloat`);
                return -1;
        }
    }

    console.error(`Unsupported type: ${type}`);
    return -1;
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

    // Avoid visible seams
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Create a temporary THREE.WebGLRenderTarget.
    // This render target's internal framebuffer
    // will be used to attach layers.
    if (!renderTarget) {
        renderTarget = new THREE.WebGLRenderTarget(width, height, {
            depthBuffer: false, // No depth buffer needed for simple 2D texture copy
        });
    }

    // Set up the quad for rendering
    if (!quadScene) {
        quadScene = new THREE.Scene();
        quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const geometry = new THREE.PlaneGeometry(2, 2);
        material = new THREE.ShaderMaterial({
            uniforms: {
                // This uniform will be updated with each source 2D texture
                sourceTexture: { value: null },
            },
            vertexShader: copyTextureShader.vertexShader,
            fragmentShader: copyTextureShader.fragmentShader,
        });
        const quad = new THREE.Mesh(geometry, material);
        quadScene.add(quad);
    }

    const firstTexture = tiles[0].textures[0]; // exists because count > 0

    // Allocate immutable storage
    const glFormat = getInternalFormat(gl, firstTexture.format, firstTexture.type);
    if (glFormat < 0) {
        uTextures.value.dispose();
        return false;
    }
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, glFormat, width, height, count);

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
            material!.uniforms.sourceTexture.value = tile.textures[i];

            // render this source texture into the current layer
            drawTextureLayer(renderer, renderTarget, uTextures.value,
                count, quadScene!, quadCam!);
        }
    }

    return true;
}
