import { BuiltinType, Dependency, DumpDotNodeStyle } from "../Common.ts";
import ProcessorNode from "./ProcessorNode.ts";

import View from "../../Core/View.js";
import MainLoop from "../../Core/MainLoop.js";
import c3DEngine from "../../Renderer/c3DEngine.js";

import * as THREE from "three";

export default class RenderViewNode extends ProcessorNode {
    private _target: THREE.WebGLRenderTarget | null = null;

    public constructor(view: Dependency, toScreen: boolean = false) {
        super({ view }, BuiltinType.RenderTarget, (_frame, args) => {
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

            console.log(`Rendering view`);

            renderer.setRenderTarget(this._target);
            renderer.clear();
            renderer.render(view.scene, view.camera3D);

            return this._target;
        });
    }

    protected get _node_type(): string {
        return 'RenderView';
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        const { label: _, attrs } = super.dumpDotStyle;
        return {
            label: (_name: string) => '',
            attrs: {
                ...attrs,
                shape: 'Mcircle',
            },
        };
    }
}
