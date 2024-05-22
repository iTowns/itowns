import View from '../../Core/View.js';
import { BuiltinType, Dependency, Type } from '../Common.ts';
import LazyStaticNode from './LazyStaticNode.ts';

export default abstract class ViewNode extends LazyStaticNode {
    public constructor(viewerDiv: Dependency, generator: (frame: number, args: any) => View, extraDependencies?: { [name: string]: [Dependency, Type] }) {
        super(
            { viewerDiv: [viewerDiv, BuiltinType.HtmlDivElement], ...extraDependencies },
            BuiltinType.View,
            generator,
        );
    }
}
