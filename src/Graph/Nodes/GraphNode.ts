import { Type, Dependency, Dependant, DumpDotNodeStyle, Graph, LazyStaticNode } from '../Prelude';
import LinearSet from '../LinearSet';

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

export class Output {
    public value: unknown;
    public type: Type;
    public dependants: LinearSet<Dependant>;

    constructor(value: unknown, type: Type) {
        this.value = value;
        this.type = type;
        this.dependants = new LinearSet<Dependant>([], (a, b) => a.node == b.node && a.input == b.input);
    }
}

/**
 * Represents a node in a directed graph.
 * Base class for all other types of nodes.
 */
export default abstract class GraphNode {
    public static defaultIoName = 'value';
    // protected _out: [number, any | undefined];
    protected _out: {
        frame: number,
        outputs: Map<string, Output>,
        /** Stored in ms. */
        timeTaken?: number,
    };

    private static idCounter = 0;
    private _id: number;

    public inputs: Map<string, [Dependency | null, Type]>;

    public constructor(
        inputs: Map<string, [Dependency | GraphNode | null, Type]>,
        // Optional to allow for clean side-effect-only nodes
        outputs?: Map<string, Type> | Type,
    ) {
        this._id = GraphNode.idCounter++;

        this.inputs = new Map();
        const inputDependencies = Object.fromEntries(Array.from(inputs.entries())
            .filter(([_name, [dep, _ty]]) => dep != null)
            .map(([name, [dep, ty]]): [string, Dependency | Type] => [
                name,
                dep instanceof GraphNode
                    ? { node: dep, output: GraphNode.defaultIoName }
                    : dep ?? ty,
            ]));
        this.updateInputs(inputDependencies, true);

        for (const input of this.inputs) {
            const [name, [dep, ty]] = input;
            if (dep != null && dep instanceof GraphNode) {
                const has = dep.outputs.get(GraphNode.defaultIoName)!.dependants.has({ node: this, input: name });
                if (!has) {
                    throw new Error(`Dependency ${dep.nodeType} (id: ${dep.id}) does not have GraphNode (id: ${this.id}) as a dependant`);
                }
            }
        }

        const normalizedOutputs: Map<string, Output> = new Map((() => {
            if (outputs == undefined) {
                return [];
            } else if (outputs instanceof Map) {
                return Array.from(outputs.entries())
                    .map(([name, ty]) => [name, new Output(undefined, ty)]);
            } else if (typeof outputs == 'string') {
                return [[GraphNode.defaultIoName, new Output(undefined, outputs)]];
            } else {
                throw new Error('Unrecognized type when constructing node outputs');
            }
        })());

        this._out = { frame: -1, outputs: normalizedOutputs };
    }

    protected abstract _apply(graph?: Graph, frame?: number): void;

    public abstract get nodeType(): string;
    public get id(): number {
        return this._id;
    }
    public static get totalNodesCreated(): number {
        return GraphNode.idCounter;
    }

    private addAsDependantTo(target: Dependency, input: string): void {
        const { node, output: outputName } = target;
        const output = node.outputs.get(outputName);
        if (output == undefined) {
            throw new Error(`Provided dependency does not exist: ${node.nodeType} (id: ${node.id}) node does not have an output named '${outputName}'`);
        }
        console.log(`${node.nodeType}(${node.id}):${outputName} -> ${this.nodeType}(${this.id}):${input}`);
        output.dependants.add({ node: this, input });
    }

    public deleteInput(name: string): void {
        const input = this.inputs.get(name);
        if (input == undefined) {
            throw new Error(`Provided ${this.nodeType} (id: ${this.id}) node does not have an input named '${name}' to delete`);
        }

        const dep = input[0];
        if (dep != null) {
            dep.node.outputs.get(dep.output)!.dependants.delete({ node: this, input: name });
        }

        this.inputs.delete(name);
    }

    private updateInput(name: string, dep: Dependency | Type): void {
        const input = this.inputs.get(name);
        if (input == undefined) {
            throw new Error(`Provided ${this.nodeType} (id: ${this.id}) node does not have an input named '${name}' to update`);
        }

        if (typeof dep != 'string') {
            // Removing a link
            if (input[0] != null) {
                const oDep = input[0];
                oDep.node.outputs.get(oDep.output)!.dependants.delete({ node: this, input: name });
            } else { // Adding a link
                this.addAsDependantTo(dep, name);
            }
            input[0] = dep;
        } else {
            input[0] = null;
            input[1] = dep;
        }
    }

    private addInput(name: string, dep: Dependency | Type): void {
        if (this.inputs.has(name)) {
            throw new Error(`Provided ${this.nodeType} node already has an input named '${name}'`);
        }

        if (typeof dep != 'string') {
            this.addAsDependantTo(dep!, name);
            this.inputs.set(name, [dep, dep.node.outputs.get(dep.output)!.type]);
        } else {
            this.inputs.set(name, [null, dep]);
        }
    }

    public updateInputs(updates: { [name: string]: Dependency | Type }, adding: boolean = false): void {
        for (const [name, dep] of Object.entries(updates)) {
            if (adding) {
                this.addInput(name, dep);
            } else {
                this.updateInput(name, dep);
            }
        }
    }

    public get outputs(): Map<string, Output> {
        return this._out.outputs;
    }

    public toDep(output?: string): Dependency {
        return { node: this, output: output ?? GraphNode.defaultIoName };
    }

    public updateOutputs(updates: { [name: string]: unknown }): void {
        const errors = [];

        for (const [name, value] of Object.entries(updates)) {
            const output = this._out.outputs.get(name);
            if (output == undefined) {
                errors.push(`Provided ${this.nodeType} node does not have an output named '${name}' to update`);
                continue;
            }
            output.value = value;
        }

        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
    }

    /**
     * Get the output of the node at a given frame.
     * @param name The name of the output to get.
     * @param graph The graph the node is a part of.
     * @param frame The frame to get the output for.
     * @returns The output of the node at the given frame.
     */
    public getOutput(name: string = GraphNode.defaultIoName, graph?: Graph, frame: number = 0): unknown {
        const { frame: oFrane, outputs } = this._out;

        const getOutput = outputs.get(name);
        if (getOutput == undefined) {
            throw new Error(`Provided ${this.nodeType} node does not have an output named '${name}'`);
        }
        const oValue = getOutput.value;

        if (oValue == undefined || oFrane !== frame) {
            // console.log(`${tab}[${debugName}] calling _apply`);
            this._apply(graph, frame);
            this._out.frame = frame;
        }

        return getOutput.value;
    }

    /**
     * Get the style for the node when dumping to DOT format.
     */
    public abstract get dumpDotStyle(): DumpDotNodeStyle;

    /**
     * Get the DOT attribute string for the node.
     * @param name The name of the node.
     */
    // TODO: refactor this into a sort of component pattern
    // use library: https://github.com/prantlf/graphviz-builder (also removes the need for dreampuf's viewer)
    public dumpDot(name: string): string {
        const { label, attrs } = this.dumpDotStyle;
        const formattedAttrs = Object.entries(attrs)
            .map(([k, v]) => `${k} = ${v}`)
            .join(' ');

        const colspan = Math.max(1, (this.inputs.size > 0 ? 1 : 0) + (this.outputs.size > 0 ? 1 : 0));

        const hasTiming = this._out.timeTaken != undefined;
        const generateTiming = (): string => {
            const lerpChannel = (): number => Math.floor(lerp(0, 255, Math.min(1, this._out.timeTaken! / 20)));
            const mapChannel = (op: (x: number) => number): string => op(lerpChannel()).toString(16).padStart(2, '0');
            const timingColor = this instanceof LazyStaticNode
                ? '#000000'
                : `#${mapChannel(x => x)}${mapChannel(x => 255 - x)}00`;

            return `<td><font color="${timingColor}">${this._out.timeTaken!}ms</font></td>`;
        };

        const header = [
            '<tr>',
            `\t<td align="text" cellpadding="${hasTiming ? 4 : 2}" colspan="${colspan - (hasTiming ? 1 : 0)}"><b>${this.nodeType}</b></td>`,
            ...(hasTiming ? [`\t${generateTiming()}`] : []),
            '</tr>',
        ];

        const labelName = label(name).trim();
        const formattedName = labelName.length == 0
            ? []
            : [
                '<hr/><tr>',
                `\t<td colspan="${colspan}"><i>${labelName}</i></td>`,
                '</tr>',
            ];

        const zip = (a: any[], b: any[]): any[] => Array.from(Array(Math.max(b.length, a.length)), (_, i) => [a[i], b[i]]);
        const iPort = (name: string, dep?: GraphNode): string =>
            `<td align="left" port="${name}" ${dep == undefined ? 'color:"red"' : ''}>${name}</td>`;
        const oPort = (name: string): string => `<td align="right" port="${name}">${name}</td>`;

        const ports = zip(Array.from(this.inputs), Array.from(this.outputs))
            .map(([i, o]) => {
                const input = (() => {
                    if (i == undefined) {
                        if (this.inputs.size > 0) {
                            return '<td></td>';
                        } return '';
                    } return iPort(i[0], i[1][0]);
                })();

                const output = (() => {
                    if (o == undefined) {
                        if (this.outputs.size > 0) {
                            return '<td></td>';
                        } return '';
                    } return oPort(o[0]);
                })();

                return ['<tr>', input, output, '</tr>'].join('');
            });

        const lHtml = ['<<table border="0">', ...header, ...formattedName, ...ports, '</table>>'].join('\n');

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
