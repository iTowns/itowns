import * as THREE from 'three';
import HorizonGradient from 'Core/Prefab/Globe/HorizonGradient';
import GlobeView from 'Core/Prefab/GlobeView';
import ISkyStrategy from './ISkyStrategy';

const computedSkyColor = new THREE.Color();

export interface SimpleSkyParameters {
    fogSpread?: number;
    skyAltitude?: number;
    enabled?: boolean;
    spaceColor?: THREE.ColorRepresentation;
    skyColor?: THREE.ColorRepresentation;
    fogColor?: THREE.ColorRepresentation;
}

const DEFAULT_OPTIONS = {
    fogSpread: 0.4,
    skyAltitude: 200000,
    enabled: true,
    spaceColor: 0x030508,
    skyColor: 0xa3ceff,
    fogColor: 0xe2edff,
};

/**
 * Renders a simple sky representation with fog effects, atmospheric gradient, and color blending based on altitude,
 * for a globe view.
 */
class SimpleSky implements ISkyStrategy {
    view: GlobeView;
    fogSpread: number;
    skyAltitude: number;
    spaceColor: THREE.Color;
    skyColor: THREE.Color;
    fogColor: THREE.Color;
    horizonGradient: HorizonGradient;
    readonly ready: boolean = true;
    private _enabled: boolean;

    constructor(view: GlobeView, options: SimpleSkyParameters) {
        const {
            fogSpread,
            skyAltitude,
            enabled,
            spaceColor,
            skyColor,
            fogColor,
        } = {
            ...DEFAULT_OPTIONS,
            ...options,
        };

        this.view = view;
        this.fogSpread = fogSpread;
        this.skyAltitude = skyAltitude;
        this._enabled = enabled;
        this.spaceColor = new THREE.Color(spaceColor);
        this.skyColor = new THREE.Color(skyColor);
        this.fogColor = new THREE.Color(fogColor);

        this.horizonGradient = new HorizonGradient(view.scene);

        if (this._enabled) {
            this.update();
        }
    }

    get enabled() {
        return this._enabled;
    }

    set enabled(on) {
        if (this._enabled === on) { return; }
        this._enabled = on;
        this.horizonGradient.mesh.visible = on;
        if (on) {
            this.update();
        } else {
            this.view.scene.fog = null;
            const renderer = this.view.mainLoop.gfxEngine.renderer;
            renderer.setClearColor(this.spaceColor, renderer.getClearAlpha());
        }
    }

    update() {
        if (!this._enabled) { return; }
        const altitude = this.view.altitude;
        if (altitude == null) { return; }
        this.updateFog(altitude);
        this.updateSkyColor(altitude);
        this.updateAtmosphericGradient(altitude);
    }

    updateFog(altitude: number) {
        if (!this.view.cameraNear) {
            return;
        }

        if (!this.view.scene.fog) {
            this.view.scene.fog = new THREE.Fog(this.fogColor, 1, 1000);
        }

        const fog = this.view.scene.fog;
        if (altitude >= this.skyAltitude) {
            this.view.scene.fog = null;
            return;
        }

        fog.far = this.view.horizonDistance;

        const fogSpreadValue = this.computeFogSpread(altitude);
        fog.near = fog.far - fogSpreadValue * (fog.far - this.view.cameraNear);
    }

    computeFogSpread(altitude: number) {
        if (altitude < 0) {
            return this.fogSpread;
        }

        // Normalize altitude, 0 at maxFarAltitude, 1 at sea level
        const t = (this.skyAltitude - altitude) / this.skyAltitude;
        // Linear interpolation between 0 and fogSpread
        return this.fogSpread * t;
    }

    updateSkyColor(altitude: number) {
        const renderer = this.view.mainLoop.gfxEngine.renderer;
        renderer.setClearColor(this.computeSkyColor(altitude), renderer.getClearAlpha());
    }

    computeSkyColor(altitude: number) {
        if (altitude < 0) {
            return this.skyColor;
        }

        if (altitude >= this.skyAltitude) {
            return this.spaceColor;
        }

        // Normalize altitude, 0 at skyAltitude, 1 at sea level
        const t = (this.skyAltitude - altitude) / this.skyAltitude;
        // Linear interpolation between spaceColor and skyColor
        computedSkyColor.copy(this.spaceColor).lerp(this.skyColor, t);
        return computedSkyColor;
    }

    updateAtmosphericGradient(altitude: number) {
        if (altitude >= this.skyAltitude) {
            this.horizonGradient.visible = false;
            return;
        }

        this.horizonGradient.visible = true;
        this.horizonGradient.update(
            this.view,
            this.computeFogSpread(altitude),
        );
    }

    dispose() {
        this.view.scene.fog = null;
        this.view.scene.remove(this.horizonGradient.mesh);
        this.horizonGradient.mesh.geometry.dispose();
        this.horizonGradient.mesh.material.dispose();
    }
}

export default SimpleSky;
