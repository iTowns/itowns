import GraphNode from './Nodes/GraphNode.ts';
import { DumpDotGlobalStyle, Type, getColor } from './Common.ts';

type NodeCallback = (node: GraphNode) => void;
type StringCallback = (string: string) => void;
interface DfsCallbacks {
    /** Run before the dependencies. */
    prefix?: NodeCallback;
    /** Run between every dependency or once if less than 2 dependencies. */
    infix?: NodeCallback;
    /** Run after the dependencies. */
    postfix?: NodeCallback;
    /** Run when an undefined dependency is found. */
    undef?: StringCallback;
}

/** Represents a directed graph that guarantees the absence of cycles on use. */
export default class Graph {
    public nodes: Map<string, GraphNode>;
    public types: Set<Type>;
    private _valid: boolean;

    public constructor() {
        this.nodes = new Map();
        this.types = new Set();
        this._valid = false;
    }

    public get valid(): boolean {
        return this._valid;
    }

    /**
     * Get the output of a node at a given frame.
     * @throws If the graph is invalid.
     * @throws If the node does not exist.
     * @returns The output of the node at the given frame.
     */
    public getOutput(frame: number, node: string | GraphNode): any {
        this.validate();

        const out = typeof node === 'string' ? this.nodes.get(node) : node;

        if (out == undefined) {
            throw new Error(`Node ${node} does not exist`);
        }

        return out.getOutput(frame);
    }

    /**
     * Get a node by name.
     * @returns The node with the given name.
     */
    public get(name: string): GraphNode | undefined {
        return this.nodes.get(name);
    }

    /**
     * Add or update a node. If the node already exists, it will be updated.
     * @throws If the node is orphaned and the graph has at least one node already.
     * @returns True if the node was added or updated, false otherwise.
     */
    public set(name: string, node: GraphNode, isInput: boolean = false): boolean {
        if (!isInput && this.nodes.size > 0 && node.inputs.size === 0) {
            throw new Error('Orphaned node');
        }

        this._valid = false;

        this.nodes.set(name, node);
        this.types.add(node.outputType);

        return true;
    }

    /**
     * Add or update multiple nodes at once. Check the documentation of {@link set}
     * for more details.
     * Using numerical object keys is not recommended, as they will be automatically sorted,
     * possibly leading to unexpected behavior.
     * @throws If any of the nodes are orphaned and the graph has at least one node already.
     * @returns A map of the results of the set operation.
     */
    public setGrouped(
        nodes: { [name: string]: GraphNode; },
        isInput: boolean = false,
    ): Map<string, boolean> {
        const results = new Map();
        for (const [name, node] of Object.entries(nodes)) {
            results.set(name, this.set(name, node, isInput));
        }
        return results;
    }

    /**
     * Determine if the graph is valid. A graph is considered valid if it does
     * not contain cycles nor dangling dependencies.
     * @throws If the graph is invalid.
     */
    public validate() {
        if (this._valid) {
            return;
        }

        const visited = new Set<string>();
        for (const [name, node] of this.nodes) {
            if (visited.has(name)) {
                continue;
            }

            this._validationDfs(node, new Set(), visited);
        }

        this._valid = true;
    }

    /**
     * Depth-first search for cycles and dangling dependencies.
     * Node argument is assumed to exist within the graph.
     * @throws If a cycle is detected or a dangling dependency is found.
     */
    private _validationDfs(
        node: GraphNode,
        path: Set<string>,
        visited: Set<string>,
    ) {
        const nodeName = this.findNodeEntry(node)!.name;

        if (visited.has(nodeName)) {
            return;
        }

        // Cycle detection
        if (path.has(nodeName)) {
            throw new Error(
                `Cycle detected: ${Array.from(path).join(' -> ')} -> ${nodeName}`,
            );
        }

        // Type checking
        for (const [name, [input, type]] of node.inputs ?? []) {
            if (input != undefined && input.outputType != type) {
                throw new Error(`Invalid type for dependency ${nodeName}.${name}`
                    + `, got '${input.outputType}' expected '${type}'`);
            }
        }

        // DFS
        path.add(nodeName);
        for (const [_name, [dep, _type]] of node.inputs ?? []) {
            if (dep != undefined) {
                this._validationDfs(dep, path, visited);
            }
        }
        path.delete(nodeName);
    }

    /**
     * Find a node's entry in the graph. O(n) time complexity.
     * Returns the whole entry to be easier to expand later on if needed.
     */
    public findNodeEntry(node: GraphNode): { name: string, node: GraphNode } | null {
        for (const [name, oNode] of this.nodes.entries()) {
            if (node == oNode) {
                return { name, node: oNode };
            }
        }
        return null;
    }

    /** Depth-first traversal of the graph. */
    public dfs(
        node: GraphNode,
        { prefix, infix, postfix, undef }: DfsCallbacks,
    ) {
        prefix?.(node);

        const inputs = node.inputs;

        let index = 0;
        for (const [name, [input, _]] of inputs.entries()) {
            if (input != undefined) {
                this.dfs(input, { prefix, infix, postfix, undef });
            } else {
                undef?.(name);
                index++;
                continue;
            }

            // Run the infix between every dependency
            if (index < inputs.size - 1) {
                infix?.(node);
            }

            index++;
        }

        // Run the infix at least once per node even without dependencies
        if (inputs.size <= 1) {
            infix?.(node);
        }

        postfix?.(node);
    }

    public get dumpDotStyle(): DumpDotGlobalStyle {
        return {
            rankdir: 'LR',
            node: {
                fontname: 'Arial',
                style: 'filled',
                fillcolor: 'whitesmoke',
            },
            edge: {
                fontname: 'Arial',
                arrowhead: 'dot',
            },
        };
    }

    /**
     * Dump the graph in the DOT format.
     * @throws If a node input is not part of the graph.
     * @returns The graph in the DOT format.
     */
    public dumpDot(): string {
        const dump: string[] = ['digraph G {'];

        if (this.nodes.size > 0) {
            // Global style defaults
            Object.entries(this.dumpDotStyle).forEach(([attr, value]) => {
                if (typeof value == 'object') {
                    const formattedAttrs = Object.entries(value)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(' ');
                    dump.push(`\t${attr} [${formattedAttrs}]`);
                } else {
                    dump.push(`\t${attr} = ${value}`);
                }
            });

            // Declare nodes
            dump.push('\t{');
            for (const [name, node] of this.nodes) {
                dump.push(`\t\t"${name}" ${node.dumpDotAttr(name)};`);
            }
            dump.push('\t}');

            // Declare edges
            for (const [name, node] of this.nodes) {
                for (const [depName, [dep, _ty]] of node.inputs) {
                    if (dep == null) { continue; }

                    // PERF: Inefficient but the alternative is duplicating the names
                    // inside the nodes and that makes the API much heavier so we'll
                    // have to live with it as it will likely never be an issue.
                    const nodeEntry = this.findNodeEntry(dep);
                    if (nodeEntry == undefined) {
                        throw new Error(
                            `An input of node ${name} is not part of the graph`,
                        );
                    }

                    const attrs = nodeEntry.node.dumpDotEdgeAttr({ ...getColor(null, dep.outputType) });

                    dump.push(`\t"${nodeEntry.name}" -> "${name}":${depName} ${attrs};`);
                }
            }
        }

        dump.push('}');

        return dump.join('\n');
    }
}
