/**
 * Generated On: 2015-10-5
 * Class: GeoCoordinate
 * Description: Coordonnées cartographiques
 */

import mE from 'Core/Math/MathExtended';

export const COORD = {
    LONG: 0,
    X: 0,
    LAT: 1,
    Y: 1,
    ALT: 2,
    Z: 2,
};

export const UNIT = {
    RADIAN: 0,
    DEGREE: 1,
    METER: 2,
};

// Only support explicit conversions
function convert(inUnit, outUnit, value) {
    if (inUnit == outUnit || outUnit === undefined) {
        return value;
    } else {
        switch (inUnit) {
            case UNIT.RADIAN: {
                if (outUnit === UNIT.DEGREE) {
                    return mE.radToDeg(value);
                } else {
                    // from meter require CRS and projection etc
                    throw new Error('Cannot convert from Meters to Radians');
                }
            }
            case UNIT.DEGREE: {
                if (outUnit === UNIT.RADIAN) {
                    return mE.degToRad(value);
                } else {
                    // from meter require CRS and projection etc
                    throw new Error('Cannot convert from Meters to Degree');
                }
            }
            default:
                throw new Error(`Cannot convert from unit ${inUnit} to unit ${outUnit}`);
        }
    }
}

var setCoordinate = function setCoordinate(coordinate, longitude, latitude, altitude, inUnit, toUnit) {
    coordinate[COORD.LONG] = convert(inUnit, toUnit, longitude);
    coordinate[COORD.LAT] = convert(inUnit, toUnit, latitude);
    coordinate[COORD.ALT] = altitude;
};

function GeoCoordinate(longitude, latitude, altitude, unit) {
    if (longitude && unit === undefined) {
        throw new Error('Cannot build a GeoCoordinate without a unit');
    }

    this.unit = unit;
    this.coordinate = new Float64Array(3);

    setCoordinate(this.coordinate, longitude, latitude, altitude, unit, unit);
}

GeoCoordinate.prototype.constructor = GeoCoordinate;

GeoCoordinate.prototype.longitude = function longitude(unit) {
    return convert(this.unit, unit, this.coordinate[COORD.LONG]);
};

GeoCoordinate.prototype.x = GeoCoordinate.prototype.longitude;

GeoCoordinate.prototype.setLongitude = function setLongitude(longitude, unit) {
    this.coordinate[COORD.LONG] = convert(unit, this.unit, longitude);
    return this;
};

GeoCoordinate.prototype.latitude = function latitude(unit) {
    return convert(this.unit, unit, this.coordinate[COORD.LAT]);
};

GeoCoordinate.prototype.y = GeoCoordinate.prototype.latitude;

GeoCoordinate.prototype.setLatitude = function setLatitude(latitude, unit) {
    this.coordinate[COORD.LAT] = convert(unit, this.unit, latitude);
    return this;
};

GeoCoordinate.prototype.altitude = function altitude() {
    return this.coordinate[COORD.ALT];
};

GeoCoordinate.prototype.setAltitude = function setAltitude(altitude) {
    this.coordinate[COORD.ALT] = altitude;
    return this;
};


GeoCoordinate.prototype.set = function set(longitude, latitude, altitude, unit) {
    setCoordinate(this.coordinate, longitude, latitude, altitude, unit, this.unit);

    return this;
};

GeoCoordinate.prototype.copy = function copyCoordinate(coordinate, unit) {
    this.unit = unit;
    if (coordinate instanceof GeoCoordinate) {
        return this.set(coordinate.longitude(), coordinate.latitude(), coordinate.altitude(), unit);
    } else {
        return this.set(coordinate.longitude, coordinate.latitude, coordinate.altitude, unit);
    }
};

GeoCoordinate.prototype.clone = function cloneCoordinate() {
    return new GeoCoordinate().copy(this);
};

export default GeoCoordinate;
