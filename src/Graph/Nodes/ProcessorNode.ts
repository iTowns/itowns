import GraphNode from './GraphNode.ts';
import { Type, Dependency, DumpDotNodeStyle, Graph } from '../Prelude.ts';

/** Represents a mapping from a set of inputs to an output. */
export default class ProcessorNode extends GraphNode {
    public constructor(
        inputs: { [name: string]: [Dependency, Type] },
        outputs: Map<string, Type> | Type,
        public callback: (frame: number, args: any) => void,
    ) {
        super(new Map(Object.entries(inputs)), outputs);
    }

    protected _apply(graph?: Graph, frame: number = 0): void {
        const inputs = Array.from(this.inputs);
        const args: [string, any][] = inputs.map(([name, [dep, _ty]]) => [
            name,
            dep?.node.getOutput(dep.output, graph, frame) ?? null,
        ]);
        const argObj = Object.fromEntries(args);

        this._out.frame = frame;

        this.callback(frame, argObj);
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
