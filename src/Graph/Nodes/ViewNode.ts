import { BuiltinType, Dependency, ProcessorNode, Type } from '../Prelude';

export default abstract class ViewNode extends ProcessorNode {
    public constructor(
        viewerDiv: Dependency,
        generator: (frame: number, args: any) => void,
        extraDependencies?: { [name: string]: [Dependency, Type] },
    ) {
        super(
            { viewerDiv: [viewerDiv, BuiltinType.HtmlDivElement], ...extraDependencies },
            new Map(Object.entries({
                view: BuiltinType.View,
                renderer: BuiltinType.Renderer,
                camera: BuiltinType.Camera,
            })),
            generator,
            true,
        );
    }
}
