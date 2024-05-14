import * as THREE from 'three';
import View from 'Core/View.js';
import Graph from './Graph.ts';
import GraphNode from './Nodes/GraphNode.ts';
import InputNode from './Nodes/InputNode.ts';
import ProcessorNode from './Nodes/ProcessorNode.ts';
import ScreenShaderNode from './Nodes/ScreenShaderNode.ts';
import RenderViewNode from './Nodes/RenderViewNode.ts';

enum BuiltinType {
    // Primitives
    Number = 'Number',

    // iTowns types
    View = 'View',

    // Three.js types
    Renderer = 'Renderer',
    RenderTarget = 'RenderTarget',
    Vector2 = 'Vector2',
    Vector3 = 'Vector3',
    Vector4 = 'Vector4',
}

const mapping: [(v: any) => boolean, BuiltinType][] = [
    // Primitives
    [v => typeof v === 'number', BuiltinType.Number],
    // iTowns types
    [v => v instanceof View, BuiltinType.View],
    // Three.js types
    [v => v instanceof THREE.WebGLRenderer, BuiltinType.Renderer],
    [v => v instanceof THREE.WebGLRenderTarget, BuiltinType.RenderTarget],
    [v => v instanceof THREE.Vector2, BuiltinType.Vector2],
    [v => v instanceof THREE.Vector3, BuiltinType.Vector3],
    [v => v instanceof THREE.Vector4, BuiltinType.Vector4],
];

function getBuiltinType(v: any): BuiltinType {
    for (const [check, ty] of mapping) {
        if (check(v)) {
            return ty;
        }
    }

    throw new Error('No builtin cast available for this type');
}

export type Type = string;
export type Dependency = GraphNode | undefined | null;

export interface DumpDotNodeStyle {
    label: (name: string) => string;
    attrs: { [key: string]: string };
}

export interface DumpDotGlobalStyle {
    rankdir: string;
    node: { [key: string]: string };
    edge: { [key: string]: string };
}

export {
    // Classes
    Graph,
    GraphNode,
    InputNode,
    ProcessorNode,
    ScreenShaderNode,
    RenderViewNode,

    // Utils
    BuiltinType,
    getBuiltinType,
};
