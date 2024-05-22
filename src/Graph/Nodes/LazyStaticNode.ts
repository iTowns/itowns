import { DumpDotNodeStyle, Graph, ProcessorNode } from '../Common.ts';

/**
 * A lazy static node only gets re-evaluated when the frame is less than the frame it was first evaluated at.
 */
export default class LazyStaticNode extends ProcessorNode {
    protected _apply(graph?: Graph, frame: number = 0): any {
        if (this._out[1] == undefined || frame < this._out[0]) {
            this._out = [frame, super._apply(graph, frame)];
        }

        return this._out[1];
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
