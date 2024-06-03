import { BuiltinType, Dependency, Type } from '../Prelude.ts';
import LazyStaticNode from './LazyStaticNode.ts';

export default abstract class ViewNode extends LazyStaticNode {
    public constructor(
        viewerDiv: Dependency,
        generator: (frame: number, args: any) => void,
        extraDependencies?: { [name: string]: [Dependency, Type] },
    ) {
        super(
            { viewerDiv: [viewerDiv, BuiltinType.HtmlDivElement], ...extraDependencies },
            new Map([['view', BuiltinType.View], ['renderer', BuiltinType.Renderer]]),
            generator,
        );
    }
}
