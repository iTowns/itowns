import * as THREE from 'three';

import { BuiltinType, Dependency, DumpDotNodeStyle } from '../Prelude';
import ProcessorNode from './ProcessorNode';

import View from '../../Core/View';
import MainLoop from '../../Core/MainLoop';
import c3DEngine from '../../Renderer/c3DEngine';

export default class RenderViewNode extends ProcessorNode {
    private _target: THREE.WebGLRenderTarget | null = null;

    public constructor(view: Dependency, toScreen: boolean = false) {
        super({ view: [view, BuiltinType.View] }, BuiltinType.RenderTarget, (_frame, args) => {
            const view = args.view as View;
            const engine = (view.mainLoop as MainLoop).gfxEngine as c3DEngine;
            const renderer = engine.renderer as THREE.WebGLRenderer;

            if (!this._target) {
                if (toScreen) {
                    this._target = null;
                } else {
                    const fsrt = engine.fullSizeRenderTarget;

                    this._target = new THREE.WebGLRenderTarget(fsrt.width, fsrt.height, {
                        minFilter: THREE.LinearFilter,
                        magFilter: THREE.NearestFilter,
                        format: THREE.RGBAFormat,
                        type: THREE.FloatType,
                    });
                    this._target.depthBuffer = true;
                    this._target.depthTexture = new THREE.DepthTexture(fsrt.width, fsrt.height);
                    this._target.depthTexture.type = THREE.UnsignedShortType;
                }
            }

            renderer.setRenderTarget(this._target);
            renderer.clear();
            renderer.render(view.scene, view.camera3D);

            this._out.outputs.set(RenderViewNode.defaultIoName, [this._target, BuiltinType.RenderTarget]);
        });
    }

    public override get nodeType(): string {
        return RenderViewNode.name;
    }

    public override get dumpDotStyle(): DumpDotNodeStyle {
        const { label: _, attrs } = super.dumpDotStyle;
        return {
            label: (name: string) => name,
            attrs,
        };
    }
}
