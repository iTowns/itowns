import SunLightLayer from 'Layer/SunLightLayer';
import RealisticSky, {RealisticSkyParameters} from 'Core/Prefab/Globe/RealisticSky';
import SimpleSky, { SimpleSkyParameters } from 'Core/Prefab/Globe/SimpleSky';
import ISkyStrategy from 'Core/Prefab/Globe/ISkyStrategy';
import GlobeView from 'Core/Prefab/GlobeView';
import { AtmosphereParameters } from '@takram/three-atmosphere';

class SkyController {
    private readonly _view: GlobeView;
    private _activeSky: ISkyStrategy | undefined;
    private _realisticSky: RealisticSky | undefined;
    private _simpleSky: SimpleSky | undefined;
    private _sunLightLayer: SunLightLayer | undefined;
    private _realisticLighting = false;
    private _realisticParams?: RealisticSkyParameters | undefined;
    private _simpleParams?: SimpleSkyParameters | undefined;

    constructor(view: GlobeView,
        options: {
            realisticLighting?: boolean;
            realisticSky?: AtmosphereParameters;
            simpleSky?: SimpleSkyParameters;
        } = {}) {
        this._view = view;
        this._realisticParams = options.realisticSky;
        this._simpleParams = options.simpleSky;
        this.realisticLighting = options.realisticLighting ?? false;
    }

    get realisticLighting() { return this._realisticLighting; }

    set realisticLighting(value: boolean) {
        if (this._activeSky && this._realisticLighting === value) { return; }
        this._realisticLighting = value;

        // Disable the previous strategy
        if (this._activeSky) {
            this._activeSky.enabled = false;
        }

        if (value) {
            this.sunLightLayer.visible = true;
            this._view.notifyChange(this._view.camera3D);
        } else if (this._sunLightLayer) {
            this._sunLightLayer.visible = false;
        }

        // Activate the new strategy
        this._activeSky = value ? this.realisticSky : this.simpleSky;
        this._activeSky.enabled = true;

        this._view.updateAltitudeAndClipping();
        this._view.notifyChange(this._view.camera3D);
    }

    get castShadow() { return this._sunLightLayer ? this._sunLightLayer.castShadow : false; }
    set castShadow(value: boolean) {
        if (!this._sunLightLayer || this._sunLightLayer.castShadow === value) { return; }
        this._sunLightLayer.castShadow = value;
        this._view.notifyChange(this._view.camera3D);
    }

    get forceDaytime() {
        return this._sunLightLayer?.forceDaytime ?? false;
    }

    set forceDaytime(value: boolean) {
        const layer = this.sunLightLayer;
        if (layer.forceDaytime === value) return;
        layer.forceDaytime = value;
        this._view.notifyChange(this._view.camera3D);
    }

    update() {
        this._activeSky?.update();
    }

    set enabled(value: boolean) {
        if (this._activeSky) {
            this._activeSky.enabled = value;
        }
        if (this._realisticLighting && this._sunLightLayer) {
            this._sunLightLayer.visible = value;
        }
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
        if (!this._sunLightLayer) {
            const sunLightLayer = new SunLightLayer();
            this._sunLightLayer = sunLightLayer;
            this._view.addLayer(sunLightLayer).then(() => {
                this._view.notifyChange(this._view.camera3D);
            }).catch((error: unknown) => {
                console.error('Failed to add SunLightLayer:', error);
            });
        }
        return this._sunLightLayer;
    }
}

export default SkyController;
