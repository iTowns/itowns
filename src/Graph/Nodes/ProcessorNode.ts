import GraphNode from './GraphNode';
import { Type, Dependency, DumpDotNodeStyle, Graph } from '../Prelude';

/** Represents a mapping from a set of inputs to an output. */
export default class ProcessorNode extends GraphNode {
    public constructor(
        inputs: { [name: string]: [Dependency, Type] },
        outputs: Map<string, Type> | Type,
        public callback: (frame: number, args: { [arg: string]: unknown }) => void,
        isStatic: boolean = false,
    ) {
        super(new Map(Object.entries(inputs)), outputs, isStatic);
    }

    protected override _apply(graph?: Graph, frame: number = 0): void {
        const inputs = Array.from(this.inputs);
        const args = inputs.map(([name, [dep, _ty]]): [string, unknown] => [
            name,
            dep?.node.getOutput(dep.output, graph, frame) ?? null,
        ]);
        const argObj = Object.fromEntries(args);

        this._out.frame = frame;

        const start = Date.now();
        this.callback(frame, argObj);
        this._out.timeTaken = Date.now() - start;
    }

    public override get nodeType(): string {
        return ProcessorNode.name;
    }

    public override get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}`,
            attrs: {
                color: 'lightskyblue',
            },
        };
    }
}
