import * as THREE from 'three';

import View from 'Core/View.js';

import Graph from './Graph.ts';
import GraphNode from './Nodes/GraphNode.ts';
import InputNode from './Nodes/InputNode.ts';
import ProcessorNode from './Nodes/ProcessorNode.ts';
import ScreenShaderNode from './Nodes/ScreenShaderNode.ts';
import RenderViewNode from './Nodes/RenderViewNode.ts';
import SubGraphNode from './Nodes/SubGraphNode.ts';
import JunctionNode from './Nodes/JunctionNode.ts';
import ViewNode from './Nodes/ViewNode.ts';
import GraphInputNode from './Nodes/GraphInputNode.ts';
import GlobeViewNode from './Nodes/GlobeViewNode.ts';
import FieldGetterNode from './Nodes/FieldGetterNode.ts';
// import PlanarViewNode from './Nodes/PlanarViewNode.ts';

export type Type = string;
export type Dependency = GraphNode | undefined | null;

enum BuiltinType {
    Any = 'Any',

    // Primitives
    Number = 'Number',

    // iTowns types
    View = 'View',
    Placement = 'Placement',

    // Three.js
    /// Types
    Renderer = 'Renderer',
    RenderTarget = 'RenderTarget',
    /// Primitives
    Vector2 = 'Vector2',
    Vector3 = 'Vector3',
    Vector4 = 'Vector4',

    // DOM
    HtmlDivElement = 'HtmlDivElement',
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
    // DOM
    [v => v instanceof HTMLDivElement, BuiltinType.HtmlDivElement],
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
    const auto: string = value.toString();
    if (!auto.startsWith('[object ')) {
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
    [BuiltinType.Placement, { color: 'cornflowerblue', fillcolor: 'deepskyblue' }],
    [BuiltinType.Vector2, { color: 'indigo', fillcolor: 'violet' }],
    [BuiltinType.Vector3, { color: 'indigo', fillcolor: 'violet' }],
    [BuiltinType.Vector4, { color: 'indigo', fillcolor: 'violet' }],
    [BuiltinType.RenderTarget, { color: 'darkolivegreen', fillcolor: 'limegreen' }],
    [BuiltinType.Renderer, { color: 'darkolivegreen', fillcolor: 'limegreen' }],
    [BuiltinType.HtmlDivElement, { color: 'indianred', fillcolor: 'lightcoral' }],
]);

function getColor(value: any, type?: Type): ColorStyle {
    const ty = type ?? getBuiltinType(value);
    if (ty != undefined) {
        return typeColor.get(ty) ?? {};
    }
    return {};
}

const typeToOpenGL = new Map<Type, string>([
    [BuiltinType.Number, 'float'],
    [BuiltinType.Vector2, 'vec2'],
    [BuiltinType.Vector3, 'vec3'],
    [BuiltinType.Vector4, 'vec4'],
    [BuiltinType.RenderTarget, 'sampler2D'],
]);

function toOpenGL(type: Type): string {
    const glTy = typeToOpenGL.get(type);
    if (glTy == undefined) {
        throw new Error(`Type ${type} does not have a known OpenGL equivalent`);
    }
    return glTy;
}

export interface DumpDotNodeStyle {
    label: (name: string) => string;
    attrs: { [key: string]: string | { [key: string]: string } };
}

export interface DumpDotGlobalStyle {
    rankdir: string;
    node: { [key: string]: string };
    edge: { [key: string]: string };
}

export {
    Graph,

    // Graph
    GraphNode,
    InputNode,
    SubGraphNode,
    JunctionNode,
    GraphInputNode,
    FieldGetterNode,

    // View
    ViewNode,
    GlobeViewNode,
    // PlanarViewNode,

    // Processors
    ProcessorNode,
    ScreenShaderNode,
    RenderViewNode,

    // Utils
    BuiltinType,
    getBuiltinType,
    stringify,
    getColor,
    toOpenGL,
};
