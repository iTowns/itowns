import GraphNode from './GraphNode.ts';
import { Type, Dependency, DumpDotNodeStyle } from '../Common.ts';

/** Represents a mapping from a set of inputs to an output. */
export default class ProcessorNode extends GraphNode {
    public callback: (frame: number, args: any) => any;

    public constructor(
        inputs: { [name: string]: Dependency },
        outputType: Type,
        callback: (frame: number, args: any) => any,
    ) {
        super(new Map(Object.entries(inputs)), outputType);
        this.callback = callback;
    }

    protected _apply(frame: number): any {
        const inputs = Array.from(this.inputs);
        const args: [string, any][] = inputs.map(([name, dependency]) => [
            name,
            dependency?.getOutput(frame) ?? null,
        ]);
        const argObj = Object.fromEntries(args);

        return this.callback(frame, argObj);
    }

    protected get _node_type(): string {
        return 'Processor';
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}`,
            attrs: {
                shape: 'box',
                color: 'lightskyblue',
            },
        };
    }
}
