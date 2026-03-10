/**
 * Required to use the same depth buffer for multiple passes
 * in pmndrs/postprocessing v6
 * Issue : https://github.com/pmndrs/postprocessing/discussions/564
 * Source : https://codesandbox.io/p/devbox/preserve-depth-forked-738cmp?file=%2Fsrc%2Fpasses%2FSwapPass.ts%3A11%2C1
 */

import { CopyMaterial, Pass } from 'postprocessing';
import type { WebGLRenderer, WebGLRenderTarget } from 'three';
import { UnsignedByteType } from 'three';

/**
 * A pass that swaps the input and output buffers.
 */
export class SwapPass extends Pass {
    public constructor() {
        super('SwapPass');

        this.fullscreenMaterial = new CopyMaterial();
        this.needsSwap = true;
    }

    public render(
        renderer: WebGLRenderer,
        inputBuffer: WebGLRenderTarget,
        outputBuffer: WebGLRenderTarget,
    ): void {
        (this.fullscreenMaterial as CopyMaterial).inputBuffer = inputBuffer.texture;
        renderer.setRenderTarget(outputBuffer);
        renderer.render(this.scene, this.camera);
    }

    public initialize(
        renderer: WebGLRenderer,
        alpha: boolean,
        frameBufferType: number,
    ): void {
        if (frameBufferType !== UnsignedByteType) {
            (
        this.fullscreenMaterial as CopyMaterial
            ).defines.FRAMEBUFFER_PRECISION_HIGH = '1';
        }
    }
}
