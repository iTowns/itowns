import { DumpDotNodeStyle, Graph, ProcessorNode } from '../Prelude.ts';

/**
 * A lazy static node only gets re-evaluated when the frame is less than the frame it was first evaluated at.
 */
export default class LazyStaticNode extends ProcessorNode {
    protected _apply(graph?: Graph, frame: number = 0): void {
        if (this._out.frame == -1 || frame < this._out.frame) {
            // console.log(`[${this.nodeType}][LazyStatic] _applying`);
            // this._out.outputs.set(GraphNode.defaultIoName, [super._apply(graph, frame), oType]);
            super._apply(graph, frame);
        }
    }

    public get nodeType(): string {
        return LazyStaticNode.name;
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
