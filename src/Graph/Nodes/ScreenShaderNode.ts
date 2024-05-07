import * as THREE from 'three';
import { BuiltinType, Dependency, DumpDotNodeStyle } from '../Common.ts';
import ProcessorNode from './ProcessorNode.ts';

export default class ScreenShaderNode extends ProcessorNode {
    private static get vertexShader() {
        return `
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
        `
    };

    private static get defaultFragmentShader() {
        return `
        void main() {
            vec4 color = texture2D(uTexture, vUv);
            gl_FragColor = color;
        }
        `;
    };

    // WARN: This is a temporary hack. Essentially a scuffed singleton pack.
    // PERF: Evaluate the cost of having a scene per shader node instead.
    private static _scene: THREE.Scene;
    private static _quad: THREE.Mesh;
    private static _camera: THREE.Camera;

    // Kept for debug purposes
    private _fragmentShader: string;
    private _material: THREE.ShaderMaterial;

    private static _init() {
        if (ScreenShaderNode._scene == undefined) {
            ScreenShaderNode._scene = new THREE.Scene();

            // Setup the quad used to render the effects
            ScreenShaderNode._quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
            ScreenShaderNode._quad.frustumCulled = false;

            ScreenShaderNode._scene.add(ScreenShaderNode._quad);

            ScreenShaderNode._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        }
    }

    /**
     * Create a new screen shader node.
     * @param input The input {@link THREE.Texture}.
     * @param renderer The {@link THREE.WebGLRenderer} to render with.
     */
    public constructor(
        input: Dependency,
        renderer: Dependency,
        { uniforms, fragmentShader, toScreen = false }: {
            uniforms?: { [name: string]: Dependency },
            fragmentShader?: string,
            toScreen?: boolean
        }
    ) {
        ScreenShaderNode._init();

        // Unpacking the uniforms object first allows us to ignore potential "input" and "renderer" fields.
        super({ ...(uniforms ?? {}), input, renderer }, BuiltinType.RenderTarget, (_frame, args) => {
            const input = args.input as THREE.WebGLRenderTarget;
            const renderer = args.renderer as THREE.WebGLRenderer;

            const target: THREE.WebGLRenderTarget | null = toScreen
                ? null
                : (this._out[1] ?? new THREE.WebGLRenderTarget(
                    input.width,
                    input.height
                ));

            this._material.uniforms['uTexture'] = { value: input.texture };
            for (const [name, value] of Object.entries(args)) {
                if (name === "input" || name === "renderer") {
                    continue;
                }

                this._material.uniforms[name] = { value };
            }
            ScreenShaderNode._quad.material = this._material;

            renderer.setRenderTarget(target);
            renderer.clear();
            renderer.render(ScreenShaderNode._scene, ScreenShaderNode._camera);

            return target;
        });

        this._fragmentShader = `
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uTexture;

            ${fragmentShader ??
            `void main() {
                vec4 color = texture2D(uTexture, vUv);
                gl_FragColor = color;
            }`
            }`;

        this._material = new THREE.ShaderMaterial({
            fragmentShader: this._fragmentShader,
            vertexShader: ScreenShaderNode.vertexShader,
        });
    }

    protected get _node_type(): string {
        return 'ScreenShader';
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        const { label, attrs } = super.dumpDotStyle;
        return {
            label,
            attrs: {
                ...attrs,
                fillcolor: "lightcoral",
            }
        };
    }
}
