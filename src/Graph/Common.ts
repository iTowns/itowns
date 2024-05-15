import * as THREE from 'three';
import View from 'Core/View.js';
import Graph from './Graph.ts';
import GraphNode from './Nodes/GraphNode.ts';
import InputNode from './Nodes/InputNode.ts';
import ProcessorNode from './Nodes/ProcessorNode.ts';
import ScreenShaderNode from './Nodes/ScreenShaderNode.ts';
import RenderViewNode from './Nodes/RenderViewNode.ts';
import JunctionNode from './Nodes/JunctionNode.ts';

export type Type = string;
export type Dependency = GraphNode | undefined | null;

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

// HACK: all of these mappings and functions should go into a style state object.
const typeMapping: [(v: any) => boolean, BuiltinType][] = [
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

function getBuiltinType(value: any): BuiltinType | undefined {
    for (const [check, ty] of typeMapping) {
        if (check(value)) {
            return ty;
        }
    }
    return undefined;
}

// eslint-disable-next-line
const stringMapping = new Map<Type, (v: any) => string>([
    [BuiltinType.Vector2, v => `(${v.x}, ${v.y})`],
]);

function stringify(value: any, type?: Type): string {
    const auto = value.toString();
    if (auto !== '[object Object]') {
        return auto;
    }

    const ty = type ?? getBuiltinType(value);
    if (ty != undefined) {
        return stringMapping.get(ty)?.(value) ?? `[${ty}]`;
    }

    return '...';
}

type ColorStyle = {
    color?: string,
    fillcolor?: string,
};

const typeColor = new Map<Type, ColorStyle>([
    [BuiltinType.Number, { color: 'chocolate', fillcolor: 'orange' }],
    [BuiltinType.View, { color: 'cornflowerblue', fillcolor: 'deepskyblue' }],
    [BuiltinType.Vector2, { color: 'indigo', fillcolor: 'violet' }],
    [BuiltinType.Vector3, { color: 'indigo', fillcolor: 'violet' }],
    [BuiltinType.Vector4, { color: 'indigo', fillcolor: 'violet' }],
    [BuiltinType.RenderTarget, { color: 'darkolivegreen', fillcolor: 'limegreen' }],
    [BuiltinType.Renderer, { color: 'darkolivegreen', fillcolor: 'limegreen' }],
]);

function getColor(value: any, type?: Type): ColorStyle {
    const ty = type ?? getBuiltinType(value);
    if (ty != undefined) {
        return typeColor.get(ty) ?? {};
    }
    return {};
}

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
    JunctionNode,

    // Utils
    BuiltinType,
    getBuiltinType,
    stringify,
    getColor,
};
