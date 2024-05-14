import * as THREE from 'three';

import { BuiltinType, Dependency, DumpDotNodeStyle } from '../Common.ts';
import ProcessorNode from './ProcessorNode.ts';

import View from '../../Core/View.js';
import MainLoop from '../../Core/MainLoop.js';
import c3DEngine from '../../Renderer/c3DEngine.js';

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
                        magFilter: THREE.LinearFilter,
                        format: THREE.RGBAFormat,
                        type: THREE.FloatType,
                    });
                }
            }

            renderer.setRenderTarget(this._target);
            renderer.clear();
            renderer.render(view.scene, view.camera3D);

            return this._target;
        });
    }

    protected get _nodeType(): string {
        return RenderViewNode.name.replace('Node', '');
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        const { label: _, attrs } = super.dumpDotStyle;
        return {
            label: (name: string) => name,
            attrs,
        };
    }
}
