import GraphNode from './GraphNode';
import { Type, DumpDotNodeStyle, Mappings, Graph } from '../Prelude';

/** Represents a node that outputs a constant value. */
export default class InputNode extends GraphNode {
    private _type: Type;

    public constructor(public value: any, type?: Type) {
        const ty = type ?? Mappings.typeOf(value);
        if (ty == undefined) {
            throw new Error('Input node type could not be inferred');
        }

        super(new Map(), ty);
        this._type = ty;
    }

    public get outputType(): Type {
        return this._type;
    }

    protected override _apply(_graph?: Graph, _frame?: number): void {
        this.outputs.set(GraphNode.defaultIoName, [this.value, this._type]);
    }

    public override get nodeType(): string {
        return InputNode.name;
    }

    public override get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}: ${Mappings.stringify(this.value)}`,
            attrs: {
                color: 'goldenrod',
            },
        };
    }
}
