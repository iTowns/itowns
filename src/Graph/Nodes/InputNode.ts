import GraphNode from './GraphNode.ts';
import { Type, DumpDotNodeStyle, getBuiltinType, stringify, Graph } from '../Common.ts';

/** Represents a node that outputs a constant value. */
export default class InputNode extends GraphNode {
    public constructor(public value: any, type?: Type) {
        const ty = type ?? getBuiltinType(value);
        if (ty == undefined) {
            throw new Error('Input node type could not be inferred');
        }

        super(new Map(), ty);
    }

    protected _apply(_graph?: Graph, _frame?: number): any {
        return this.value;
    }

    public get nodeType(): string {
        return InputNode.name.replace('Node', '');
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}: ${stringify(this.value)}`,
            attrs: {
                color: 'goldenrod',
            },
        };
    }
}
