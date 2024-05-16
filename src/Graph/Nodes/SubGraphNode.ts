import { BuiltinType, DumpDotNodeStyle, Graph, GraphInputNode } from '../Common.ts';
import GraphNode from './GraphNode.ts';

export default class SubGraphNode extends GraphNode {
    public graph: Graph;
    private _outNode: GraphNode;
    private _label?: string;

    public constructor(outerGraph: Graph, graph: Graph, out: GraphNode | string, label?: string) {
        super(new Map(), BuiltinType.Number);

        this.graph = graph;
        this._label = label;

        if (out instanceof GraphNode) {
            this._outNode = out;
        } else {
            const node = graph.get(out);
            if (node == undefined) {
                throw new Error(`Node "${out}" selected as output does not exist within the subgraph`);
            }

            this._outNode = node;
        }

        // Replace dependencies outside the graph with graph inputs
        for (const [_nodeName, node] of this.graph.nodes) {
            for (const [depName, [dep, depType]] of node.inputs) {
                if (dep != undefined && Array.from(this.graph.nodes.values()).find(oNode => oNode == dep) == undefined) {
                    // Try to find an already created graph input for this dependency
                    const findInput = Array.from(this.graph.inputs).find(([name, _input]) => name == depName);
                    if (findInput != undefined) {
                        const [_name, input] = findInput;
                        node.inputs.set(depName, [input, depType]);
                        continue;
                    }

                    // TODO: only works for one level of nesting, we might need a resolve function but
                    // I'm not sure the case where it'd be needed will ever occur.
                    const newInput = new GraphInputNode(Object.fromEntries([[outerGraph.findNodeEntry(dep)!.name, dep]]));
                    const addedInput = this.graph.inputs.set(depName, newInput).get(depName)!;
                    node.inputs.set(depName, [addedInput, depType]);
                }
            }
        }
    }

    protected _apply(graph: Graph, frame: number) {
        return this._outNode.getOutput(graph, frame);
    }

    public get label(): string | undefined {
        return this._label;
    }

    public get nodeType(): string {
        return SubGraphNode.name.replace('Node', '');
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}`,
            attrs: {
                style: 'filled',
                fillcolor: 'whitesmoke',
                color: 'lightgrey',
            },
        };
    }

    public dumpDot(name: string): string {
        const { label, attrs } = this.dumpDotStyle;
        const formattedAttrs = Object.entries(attrs).map(([name, value]: [string, string | object]) => {
            if (typeof value == 'string') {
                return `${name}=${value}`;
            } else {
                return `${name} [${Object.entries(value).map(([name, value]) => `${name}=${value}`).join(' ')}]`;
            }
        });
        const graphLabel = this._label != undefined ? [`\t\tlabel="${label(this._label)}"`] : [];
        return [
            `subgraph "cluster_${label(name)}" {`,
            ...graphLabel,
            ...formattedAttrs,
            this.graph.dumpDot([true, name]),
            '}',
        ].join('\n');
    }
}
