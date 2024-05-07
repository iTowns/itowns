import GraphNode from './Nodes/GraphNode.ts';
import { DumpDotGlobalStyle, Type } from './Common.ts';

console.log("coucou");

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
    public set(name: string, node: GraphNode): boolean {
        if (this.nodes.size > 0 && node.inputs.size === 0) {
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
    public set_grouped(nodes: {
        [name: string]: GraphNode;
    }): Map<string, boolean> {
        const results = new Map();
        for (const [name, node] of Object.entries(nodes)) {
            results.set(name, this.set(name, node));
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

            this._validation_dfs(node, new Set(), visited);
        }

        this._valid = true;
    }

    /**
     * Depth-first search for cycles and dangling dependencies.
     * @throws If a cycle is detected or a dangling dependency is found.
     */
    private _validation_dfs(
        node: GraphNode,
        path: Set<string>,
        visited: Set<string>,
    ) {
        // Cycle detection
        for (const [name, _dep] of node.inputs ?? []) {
            if (path.has(name)) {
                throw new Error(
                    `Cycle detected: ${Array.from(path).join(' -> ')} -> ${name}`,
                );
            }
        }

        // DFS
        for (const [name, dep] of node.inputs ?? []) {
            // Dangling dependency check
            if (dep == undefined) {
                throw new Error(`Dangling dependency: ${name}`);
            }

            if (visited.has(name)) {
                continue;
            }

            path.add(name);
            this._validation_dfs(dep, path, visited);
            path.delete(name);
        }
    }

    /** Depth-first traversal of the graph. */
    public dfs(
        node: GraphNode,
        { prefix, infix, postfix, undef }: DfsCallbacks,
    ) {
        prefix?.(node);

        const inputs = node.inputs;

        let index = 0;
        for (const [name, input] of inputs.entries()) {
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
            node: {
                fontname: 'Arial',
            },
            edge: {
                fontname: 'Arial',
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
            Object.entries(this.dumpDotStyle).forEach(([type, attrs]) => {
                const formattedAttrs = Object.entries(attrs)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(' ');
                dump.push(`\t${type} [${formattedAttrs}]`);
            });

            // Declare nodes
            dump.push('\t{');
            for (const [name, node] of this.nodes) {
                dump.push(`\t\t'${name}' ${node.dumpDotAttr(name)};`);
            }
            dump.push('\t}');

            // Declare edges
            const entries = Array.from(this.nodes.entries());
            for (const [name, node] of this.nodes) {
                for (const [_, dep] of node.inputs) {
                    if (dep == null) continue;

                    // PERF: Inefficient but the alternative is duplicating the names
                    // inside the nodes and that makes the API much heavier so we'll
                    // live with it, this will likely never be an issue.
                    const inputName = entries.find(
                        ([_, oNode]) => oNode == dep,
                    )?.[0];
                    if (inputName == undefined) {
                        throw new Error(
                            `An input of node ${name} is not part of the graph`,
                        );
                    }
                    const attrs = node.dumpDotEdgeAttr();

                    dump.push(`\t'${inputName}' -> '${name}' ${attrs};`);
                }
            }
        }

        dump.push('}');

        return dump.join('\n');
    }
}

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
