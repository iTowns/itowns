import SunLightLayer from 'Layer/SunLightLayer';
import RealisticSky, { RealisticSkyParameters } from 'Core/Prefab/Globe/RealisticSky';
import SimpleSky, { SimpleSkyParameters } from 'Core/Prefab/Globe/SimpleSky';
import ISkyStrategy from 'Core/Prefab/Globe/ISkyStrategy';
import GlobeView from 'Core/Prefab/GlobeView';
import { AtmosphereParameters } from '@takram/three-atmosphere';
import * as THREE from 'three';

class SkyController {
    private readonly _view: GlobeView;
    private _activeSky: ISkyStrategy | undefined;
    private _realisticSky: RealisticSky | undefined;
    private _simpleSky: SimpleSky | undefined;
    private readonly _sunLightLayer: SunLightLayer;
    private _sunlight: boolean;
    private _realisticLighting = false;
    private _realisticParams?: RealisticSkyParameters | undefined;
    private _simpleParams?: SimpleSkyParameters | undefined;
    private _ambientLight: THREE.AmbientLight;

    constructor(view: GlobeView,
        options: {
            realisticLighting?: boolean;
            sunlight?: boolean;
            forceDaytime?: boolean;
            realisticSky?: AtmosphereParameters;
            simpleSky?: SimpleSkyParameters;
        } = {}) {
        this._view = view;
        this._realisticParams = options.realisticSky;
        this._simpleParams = options.simpleSky;
        this._ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this._view.scene.add(this._ambientLight);
        this._sunlight = options.sunlight ?? true;
        this._sunLightLayer = new SunLightLayer(options.forceDaytime ?? true);
        this._view.addLayer(this._sunLightLayer).then(() => {
            this._view.notifyChange(this._view.camera3D);
        }).catch((error: unknown) => {
            console.error('Failed to add SunLightLayer:', error);
        });
        this.realisticLighting = options.realisticLighting ?? false;
    }

    get realisticLighting() { return this._realisticLighting; }

    set realisticLighting(value: boolean) {
        if (this._activeSky && this._realisticLighting === value) { return; }
        this._realisticLighting = value;

        const previousSkyEnabled = (this._activeSky === undefined || this._activeSky.enabled);

        // Disable the previous strategy
        if (this._activeSky !== undefined) {
            this._activeSky.enabled = false;
        }

        // Activate the new strategy
        this._activeSky = value ? this.realisticSky : this.simpleSky;
        this._activeSky.enabled = previousSkyEnabled;
        this.updateSunlightVisibility();

        this._view.notifyChange(this._view.camera3D);
    }

    get sunlight() { return this._sunlight; }
    set sunlight(value: boolean) {
        if (this._sunlight === value) { return; }
        this._sunlight = value;
        this.updateSunlightVisibility();
        this._view.notifyChange(this._view.camera3D);
    }

    get castShadow() { return this._sunLightLayer.castShadow; }
    set castShadow(value: boolean) {
        if (this.castShadow === value) { return; }
        this.sunLightLayer.castShadow = value;
        this.updateSunlightVisibility();
        this._view.notifyChange(this._view.camera3D);
    }

    get forceDaytime() {
        return this._sunLightLayer.forceDaytime;
    }

    set forceDaytime(value: boolean) {
        if (this._sunLightLayer.forceDaytime === value) { return; }
        this._sunLightLayer.forceDaytime = value;
        this._view.notifyChange(this._view.camera3D);
    }

    update() {
        this._activeSky?.update();
    }

    set enabled(value: boolean) {
        if (this._activeSky) {
            this._activeSky.enabled = value;
        }
        this.updateSunlightVisibility();
    }

    get enabled() {
        return this._activeSky !== undefined && this._activeSky.enabled;
    }

    dispose() {
        this._realisticSky?.dispose();
        this._simpleSky?.dispose();
    }

    get realisticSky() {
        this._realisticSky ??= new RealisticSky(
            this._view,
            this.sunLightLayer,
            this._realisticParams);
        return this._realisticSky;
    }

    get simpleSky() {
        this._simpleSky ??= new SimpleSky(this._view, this._simpleParams ?? { skyAltitude: 200000 });
        return this._simpleSky;
    }

    get sunLightLayer() {
        return this._sunLightLayer;
    }

    // The sun light is shown when the sky is enabled and sunlight, realistic lighting
    // or cast-shadows is requested. The ambient light is only hidden with realistic lighting.
    private updateSunlightVisibility() {
        const skyEnabled = this._activeSky?.enabled;
        const sunlightNeeded = skyEnabled && (this._sunlight || this._realisticLighting || this.castShadow);
        this._ambientLight.visible = !this._realisticLighting;
        this._sunLightLayer.visible = !!sunlightNeeded;
    }
}

export default SkyController;
