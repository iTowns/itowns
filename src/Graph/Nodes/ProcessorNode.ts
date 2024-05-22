import GraphNode from './GraphNode.ts';
import { Type, Dependency, DumpDotNodeStyle, Graph } from '../Common.ts';

/** Represents a mapping from a set of inputs to an output. */
export default class ProcessorNode extends GraphNode {
    public constructor(
        inputs: { [name: string]: [Dependency, Type] },
        outputType: Type,
        public callback: (frame: number, args: any) => any,
    ) {
        super(new Map(Object.entries(inputs)), outputType);
    }

    protected _apply(graph?: Graph, frame: number = 0): any {
        const inputs = Array.from(this.inputs);
        const args: [string, any][] = inputs.map(([name, dependency]) => [
            name,
            dependency[0]?.getOutput(graph, frame) ?? null,
        ]);
        const argObj = Object.fromEntries(args);

        return this.callback(frame, argObj);
    }

    public get nodeType(): string {
        return ProcessorNode.name.replace('Node', '');
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}`,
            attrs: {
                color: 'lightskyblue',
            },
        };
    }
}
