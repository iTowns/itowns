import { DumpDotNodeStyle, Graph, GraphNode, ProcessorNode } from '../Common.ts';

/**
 * A lazy static node only gets re-evaluated when the frame is less than the frame it was first evaluated at.
 */
export default class LazyStaticNode extends ProcessorNode {
    protected _apply(graph?: Graph, frame: number = 0): any {
        const output = this._out.outputs.get(GraphNode.defaultIOName)!;
        const [oValue, oType] = output;

        if (oValue == undefined || frame < this._out.frame) {
            this._out.frame = frame;
            this._out.outputs.set(GraphNode.defaultIOName, [super._apply(graph, frame), oType]);
        }

        return this._out.outputs.get(GraphNode.defaultIOName)![0];
    }

    public get nodeType(): string {
        return LazyStaticNode.name.replace('Node', '');
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}`,
            attrs: {
                color: 'deepskyblue',
            },
        };
    }
}
