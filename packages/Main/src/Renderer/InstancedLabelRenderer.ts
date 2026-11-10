import * as THREE from 'three';
import { InstancedLabelManager } from '@itowns/labels';

// Labels ignore `scene.fog`: under a perspective camera they are dropped at
// this fraction of the fog band. `labelFar` is a distance from the eye, which
// matches fog depth only in perspective.
const FOG_LABEL_CUTOFF = 0.3;

/** The view, as the renderer reads it. */
interface LabelView {
    camera3D: THREE.Camera;
    scene: THREE.Scene;
    _camXR?: THREE.Camera;
    notifyChange(changeSource?: unknown, needsRedraw?: boolean): void;
}

/**
 * Draws the labels of the instanced label layers after the view's render and
 * its post-processing, with one `InstancedLabelManager` created on first use.
 */
class InstancedLabelRenderer {
    readonly #renderer: THREE.WebGLRenderer;
    // The label shader writes clip-space depth, which cannot be compared with
    // the logarithmic depth buffer: labels are drawn in a scene of their own,
    // over everything.
    readonly #scene = new THREE.Scene();
    #manager: InstancedLabelManager | null = null;

    constructor(renderer: THREE.WebGLRenderer) {
        this.#renderer = renderer;
    }

    /** @returns The label manager, created on first access. */
    get manager(): InstancedLabelManager {
        if (!this.#manager) {
            this.#manager = new InstancedLabelManager(this.#renderer, {
                autoUpdate: false,
                atlasFontSize: 32,
                downscale: 32,
                placementIntervalMs: 100,
                placementBudgetMs: 8,
                fadeDurationMs: 650,
                fadeGamma: 3,
                moveThresholdPx: 1,
                ndcCullMargin: 0.2,
                labelNear: 0,
                labelFar: Infinity,
                renderPenaltyMultiplier: 2,
                depthTest: false,
            });
            this.#scene.add(this.#manager.mesh);
        }
        return this.#manager;
    }

    /**
     * Places, fades and draws the labels, and requests another frame while
     * placement or fades are running. Does nothing before the manager exists.
     *
     * @param view - The view being rendered.
     */
    render(view: LabelView) {
        const manager = this.#manager;
        if (!manager) { return; }

        const camera = view.camera3D;
        const fog = view.scene.fog;
        manager.config.labelFar = fog && 'isFog' in fog && 'isPerspectiveCamera' in camera
            ? fog.near + (fog.far - fog.near) * FOG_LABEL_CUTOFF
            : Infinity;

        manager.update();
        manager.cull(camera);
        this.#renderer.render(this.#scene, view._camXR || camera);

        if (!manager.isSettled) {
            view.notifyChange(undefined, true);
        }
    }

    /** Releases the manager and its labels. */
    dispose() {
        if (!this.#manager) { return; }
        this.#manager.mesh.removeFromParent();
        this.#manager.dispose();
        this.#manager = null;
    }
}

export default InstancedLabelRenderer;
