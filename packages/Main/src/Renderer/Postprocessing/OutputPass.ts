/**
 * Required to output the combinaison of the previous passes to the screen
 * in pmndrs/postprocessing v6
 * Issue : https://github.com/pmndrs/postprocessing/discussions/564
 * Source : https://codesandbox.io/p/devbox/preserve-depth-forked-738cmp?file=%2Fsrc%2Fpasses%2FOutputPass.ts
 */

import { CopyMaterial, Pass } from 'postprocessing';
import type { WebGLRenderTarget, WebGLRenderer } from 'three';
import { UnsignedByteType } from 'three';

/**
 * A pass that outputs the accumulated render target to the screen.
 */
export class OutputPass extends Pass {
    public constructor() {
        super('OutputPass');

        this.fullscreenMaterial = new CopyMaterial();
        this.needsSwap = false;
    }

    public render(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget): void {
        (this.fullscreenMaterial as CopyMaterial).inputBuffer = inputBuffer.texture;
        renderer.setRenderTarget(null);
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
