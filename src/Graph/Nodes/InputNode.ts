import GraphNode from './GraphNode.ts';
import { Type, DumpDotNodeStyle, getBuiltinType } from '../Common.ts';

/** Represents a node that outputs a constant value. */
export default class InputNode extends GraphNode {
    public value: any;

    public constructor(value: any, type?: Type) {
        super(new Map(), type ?? getBuiltinType(value));
        this.value = value;
    }

    protected _apply(_frame: number): any {
        return this.value;
    }

    protected get _nodeType(): string {
        return InputNode.name.replace('Node', '');
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}: ${this.value}`,
            attrs: {
                shape: 'rectangle',
                color: 'goldenrod',
            },
        };
    }
}
