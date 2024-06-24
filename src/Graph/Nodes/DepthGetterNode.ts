import { WebGLRenderTarget } from 'three';
import { BuiltinType, Dependency, ProcessorNode } from '../Prelude';

export default class DepthGetterNode extends ProcessorNode {
    constructor(target: Dependency) {
        super(
            { target: [target, BuiltinType.RenderTarget] },
            BuiltinType.Texture,
            (_frame, args) =>
                this.updateOutputs({ [DepthGetterNode.defaultIoName]: (args.target as WebGLRenderTarget).depthTexture }),
        );
    }
}
