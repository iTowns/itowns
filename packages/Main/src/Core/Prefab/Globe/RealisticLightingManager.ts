import GlobeView from 'Core/Prefab/GlobeView';
import SkyManager from 'Core/Prefab/Globe/SkyManager';
import AtmosphereManager from 'Core/Prefab/Globe/AtmosphereManager';
import {
    getSunDirectionECEF,
} from '@takram/three-atmosphere';
import SunLightLayer from 'Layer/SunLightLayer';

import {
    EffectPass,
    RenderPass,
    FXAAEffect,
} from 'postprocessing';
import { MAIN_LOOP_EVENTS } from 'Core/MainLoop';
import * as THREE from 'three';
import View from 'Core/View';

export type RealisticLightingOptions = {
    /** Enable realistic lighting.
     * If true, it can later be switched by setting this.skyManager.enabled
     * to true/false.
     * If false, it will be impossible to enable it later on. */
    enable: boolean,
    sunLightIntensity: number,
};

export default class RealisticLightingManager {
    /** Handles realistic background sky */
    skyManager?: SkyManager;
    sunDirection: THREE.Vector3;
    /** Handles light and shadows */
    sunLightLayer: SunLightLayer;
    /** Handles the aerial atmosphere effect */
    atmosphereManager?: AtmosphereManager;
    /** The view this is bound to */
    private _view: GlobeView;

    fog: THREE.Fog | null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(view: GlobeView, options?: Partial<RealisticLightingOptions>) {
        this.sunDirection = new THREE.Vector3();
        this.sunLightLayer = new SunLightLayer(view);
        this.sunLightLayer.sunLight.intensity = options?.sunLightIntensity ?? 2;
        View.prototype.addLayer.call(view, this.sunLightLayer);
        this.fog = view.scene.fog;
        this._view = view;

        if (options?.enable) {
            this.enable();
        }
    }

    enable() {
        if (!this.skyManager || !this.atmosphereManager) {
            this.skyManager = new SkyManager(this._view);

            const composer = this._view.mainLoop.gfxEngine.composer;
            composer.addPass(new RenderPass(this._view.scene, this._view.camera3D));

            this.atmosphereManager = new AtmosphereManager(
                this._view.camera3D, composer, this.skyManager.generator.textures,
            );

            composer.addPass(new EffectPass(
                this._view.camera3D, new FXAAEffect(),
            )); // anti-aliasing

            this._view.addFrameRequester(
                MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE,
                () => {
                    getSunDirectionECEF(this._view.date, this.sunDirection);
                    // this creates a white disk at the Sun's position
                    this.sunDirection.multiplyScalar(1.00002);

                    if (!this.enabled) { return; }

                    this.atmosphereManager!.update(this._view.camera3D, this.sunDirection);

                    // actually only useful if Sun or Moon direction has changed
                    if (this.skyManager) {
                        this.skyManager.update(this._view.date, this.sunDirection);
                    }
                },
            );
        } else {
            this.sunLightLayer.sunLight.intensity *= 0.1;
            this._view.scene.add(this.skyManager.sky, this.skyManager.skyLight);
            this.atmosphereManager.effectPass.enabled = true;

            // disable fog only during render
            // to let its parameters be modified elsewhere
            if (this.enabled) {
                this.fog = this._view.scene.fog;
                this._view.scene.fog = null;
            }
        }
    }

    disable() {
        if (!this.skyManager || !this.atmosphereManager) { return; }
        this.sunLightLayer.sunLight.intensity *= 10;
        if (this.enabled) { this._view.scene.fog = this.fog; }
        this._view.scene.remove(this.skyManager.sky, this.skyManager.skyLight);
        this.atmosphereManager.effectPass.enabled = false;
    }

    get enabled() {
        return !!this.skyManager?.sky.parent; // sky has a parent (the scene)
    }

    set enabled(on: boolean) {
        if (this.enabled == on) { return; }
        if (on) { this.enable(); } else { this.disable(); }

        // force internally calling state.buffers.color.setClear
        // to get a correct background color
        this._view.renderer.setClearAlpha(this._view.renderer.getClearAlpha());

        this._view.mainLoop.gfxEngine.composer.render();
    }
}
