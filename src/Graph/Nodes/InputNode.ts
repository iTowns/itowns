import GraphNode from './GraphNode.ts';
import { Type, DumpDotNodeStyle } from '../Common.ts';

/** Represents a node that outputs a constant value. */
export default class InputNode extends GraphNode {
    public value: any;

    public constructor(value: any, type: Type) {
        super(new Map(), type);
        this.value = value;
    }

    protected _apply(_frame: number): any {
        return this.value;
    }

    protected get _node_type(): string {
        return 'Input';
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: (name) => `${name}: ${this.value}`,
            attrs: {
                shape: 'invtrapezium',
                color: 'goldenrod',
            },
        };
    }
}
