import { Type, Dependency, DumpDotNodeStyle, Graph } from '../Prelude';

/**
 * Represents a node in a directed graph.
 * Base class for all other types of nodes.
 */
export default abstract class GraphNode {
    public static defaultIoName = 'value';
    // protected _out: [number, any | undefined];
    protected _out: {
        frame: number,
        outputs: Map<string, [any, Type]>,
    };

    private static idCounter = 0;
    private _id: number;

    public inputs: Map<string, [Dependency | null, Type]>;

    public constructor(
        inputs: Map<string, [Dependency | GraphNode | null, Type]>,
        // Optional to allow for clean side-effect-only nodes
        outputs?: Map<string, Type> | Type,
    ) {
        this.inputs = new Map(Array.from(inputs.entries())
            .map(([name, [dep, ty]]) => [
                name,
                [
                    dep instanceof GraphNode
                        ? { node: dep, output: GraphNode.defaultIoName }
                        : dep,
                    ty,
                ],
            ]));

        let normalizedOutputs: Map<string, [any, Type]>;

        if (outputs == undefined) {
            normalizedOutputs = new Map();
        } else if (outputs instanceof Map) {
            normalizedOutputs = new Map(Array.from(outputs.entries()).map(([name, ty]) => [name, [undefined, ty]]));
        } else if (typeof outputs == 'string') {
            normalizedOutputs = new Map([[GraphNode.defaultIoName, [undefined, outputs]]]);
        } else {
            throw new Error('Unrecognized type when constructing node outputs');
        }

        this._out = { frame: -1, outputs: normalizedOutputs };
        this._id = GraphNode.idCounter++;
    }

    protected abstract _apply(graph?: Graph, frame?: number): void;

    public abstract get nodeType(): string;
    public get id(): number {
        return this._id;
    }

    public get outputs(): Map<string, [any, Type]> {
        return this._out.outputs;
    }

    /**
     * Get the output of the node at a given frame.
     * @param name The name of the output to get.
     * @param graph The graph the node is a part of.
     * @param frame The frame to get the output for.
     * @returns The output of the node at the given frame.
     */
    public getOutput(name: string = GraphNode.defaultIoName, graph?: Graph, frame: number = 0): [any, Type] {
        const { frame: oFrane, outputs } = this._out;

        if (!outputs.has(name)) {
            throw new Error(`Provided ${this.nodeType} node does not have an output named '${name}'`);
        }

        const getOutput = outputs.get(name);
        if (getOutput == undefined) {
            throw new Error(`Provided ${this.nodeType} node does not have an output named '${name}'`);
        }
        const [oValue, _oType] = getOutput;

        // const thisName = graph?.findNode(this)?.name;
        // const debugName = `${thisName == undefined ? '' : `${thisName}: `}${this.nodeType}`;

        // GraphNode.depth++;
        // const tab = '| '.repeat(GraphNode.depth - 1);

        if (oValue == undefined || oFrane !== frame) {
            // console.log(`${tab}[${debugName}] calling _apply`);
            this._apply(graph, frame);
            this._out.frame = frame;
        }

        const output = this._out.outputs.get(name);
        // console.log(`${tab}[${debugName}] getOutput(${name}): `, output);
        // GraphNode.depth--;

        return output![0];
    }

    /**
     * Get the style for the node when dumping to DOT format.
     */
    public abstract get dumpDotStyle(): DumpDotNodeStyle;

    /**
     * Get the DOT attribute string for the node.
     * @param name The name of the node.
     */
    public dumpDot(name: string): string {
        const { label, attrs } = this.dumpDotStyle;
        const formattedAttrs = Object.entries(attrs)
            .map(([k, v]) => `${k} = ${v}`)
            .join(' ');

        const colspan = Math.max(1, (this.inputs.size > 0 ? 1 : 0) + (this.outputs.size > 0 ? 1 : 0));
        const lType = `<tr><td align="text" colspan="${colspan}"><b>${this.nodeType}</b></td></tr>`;

        const lName = label(name).trim();
        const lNameFormatted = lName.length == 0 ? [] : [`<hr/><tr><td colspan="${colspan}"><i>${lName}</i></td></tr>`];

        const zip = (a: any[], b: any[]): any[] => Array.from(Array(Math.max(b.length, a.length)), (_, i) => [a[i], b[i]]);
        const iPort = (name: string, dep?: GraphNode): string =>
            `<td align="left" port="${name}" ${dep == undefined ? 'color:"red"' : ''}>${name}</td>`;
        const oPort = (name: string): string => `<td align="right" port="${name}">${name}</td>`;

        const ports = zip(Array.from(this.inputs), Array.from(this.outputs))
            .map(([i, o]) => {
                const input = i == undefined ? '' : iPort(i[0], i[1][0]);
                const output = o == undefined ? '' : oPort(o[0]);
                return ['<tr>', input, output, '</tr>'].join('');
            });

        const lHtml = ['<<table border="0">', lType, ...lNameFormatted, ...ports, '</table>>'].join('\n');

        return `"${name}" [label=${lHtml} ${formattedAttrs} margin=.05]`;
    }

    /**
     * Get the DOT attribute string for the outgoing edges.
     *
     * Example expected output: [label=" Renderer"]
     */
    public dumpDotEdgeAttr(ty: Type, extra?: { [attr: string]: string }): string {
        const attrs = Object.entries(extra ?? {})
            .map(([name, value]) => `${name}="${value}"`)
            .join(' ');

        return `[label=" ${ty}" ${attrs}]`;
    }
}
