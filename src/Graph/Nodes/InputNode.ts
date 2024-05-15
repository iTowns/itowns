import GraphNode from './GraphNode.ts';
import { Type, DumpDotNodeStyle, getBuiltinType, stringify, Graph } from '../Common.ts';

/** Represents a node that outputs a constant value. */
export default class InputNode extends GraphNode {
    public value: any;

    public constructor(value: any, type?: Type) {
        const ty = type ?? getBuiltinType(value);
        if (ty == undefined) {
            throw new Error('Input node type could not be inferred');
        }

        super(new Map(), ty);
        this.value = value;
    }

    protected _apply(_graph: Graph, _frame: number): any {
        return this.value;
    }

    protected get _nodeType(): string {
        return InputNode.name.replace('Node', '');
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}: ${stringify(this.value)}`,
            attrs: {
                shape: 'rectangle',
                color: 'goldenrod',
            },
        };
    }
}
