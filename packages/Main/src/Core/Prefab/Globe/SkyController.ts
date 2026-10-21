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
    private _realisticLighting = false;
    private _realisticParams?: RealisticSkyParameters | undefined;
    private _simpleParams?: SimpleSkyParameters | undefined;
    private _ambientLight: THREE.AmbientLight;

    constructor(view: GlobeView,
        sunLightLayer: SunLightLayer,
        options: {
            realisticLighting?: boolean;
            realisticSky?: AtmosphereParameters;
            simpleSky?: SimpleSkyParameters;
        } = {}) {
        this._view = view;
        this._realisticParams = options.realisticSky;
        this._simpleParams = options.simpleSky;
        this._ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this._view.scene.add(this._ambientLight);
        this._sunLightLayer = sunLightLayer;
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
        this.updateAmbientLight();

        this._view.notifyChange(this._view.camera3D);
    }

    update() {
        this._activeSky?.update();
    }

    set enabled(value: boolean) {
        if (this._activeSky) {
            this._activeSky.enabled = value;
        }
        this.updateAmbientLight();
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
            this._sunLightLayer,
            this._realisticParams);
        return this._realisticSky;
    }

    get simpleSky() {
        this._simpleSky ??= new SimpleSky(this._view, this._simpleParams ?? { skyAltitude: 200000 });
        return this._simpleSky;
    }

    // The ambient light compensates for the absence of sky light and is only needed
    // when realistic lighting is off.
    private updateAmbientLight() {
        this._ambientLight.visible = !this._realisticLighting;
    }
}

export default SkyController;
