import GraphNode from './GraphNode';
import { Type, DumpDotNodeStyle, Mappings, Graph } from '../Prelude';

/** Represents a node that outputs a constant value. */
export default class InputNode extends GraphNode {
    private _type: Type;
    private _value: unknown;

    public constructor(value: unknown, type?: Type) {
        const ty = type ?? Mappings.typeOf(value);
        if (ty == undefined) {
            throw new Error('Input node type could not be inferred');
        }

        super(new Map(), ty, true);
        this._value = value;
        this._type = ty;
    }

    public get outputType(): Type {
        return this._type;
    }

    protected override _apply(_graph?: Graph, frame: number = 0): void {
        this.updateOutputs({ [GraphNode.defaultIoName]: this._value }, frame);
    }

    public override get nodeType(): string {
        return InputNode.name;
    }

    public set value(value: unknown) {
        this._value = value;
        this.needsUpdate();
    }

    public override get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}: ${Mappings.stringify(this._value)}`,
            attrs: {
                color: 'goldenrod',
            },
        };
    }
}
