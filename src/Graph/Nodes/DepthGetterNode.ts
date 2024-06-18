import { WebGLRenderTarget } from 'three';
import { BuiltinType, Dependency, ProcessorNode } from '../Prelude';

export default class DepthGetterNode extends ProcessorNode {
    constructor(target: Dependency) {
        super(
            { target: [target, BuiltinType.RenderTarget] },
            BuiltinType.Texture,
            (_frame, args) =>
                this._out.outputs.set(DepthGetterNode.defaultIoName, [
                    (args.target as WebGLRenderTarget).depthTexture,
                    BuiltinType.Texture,
                ]),
        );
    }
}
