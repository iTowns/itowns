/**
 * Generated On: 2015-10-5
 * Class: CoordCarto
 * Description: Coordonées cartographiques
 */
/**
 *
 * @param {type} defaultValue
 * @returns {CoordCarto_L9.CoordCarto}
 */
import defaultValue from 'Core/defaultValue';


function CoordCarto(longitude, latitude, altitude, datum) {
    this.longitude = defaultValue(longitude, 0);
    this.latitude = defaultValue(latitude, 0);
    this.altitude = defaultValue(altitude, 0);
    this.datum    = datum;
}

CoordCarto.prototype.constructor = CoordCarto;

CoordCarto.prototype.setFromDegreeGeo = function(longitude, latitude, altitude) {
    this.longitude = defaultValue(longitude * Math.PI / 180 + Math.PI, 0);
    this.latitude = defaultValue(latitude * Math.PI / 180, 0);
    this.altitude = defaultValue(altitude, 0);

    return this;
};

CoordCarto.prototype.toRadians = function() { 
    this.longitude *= Math.PI / 180;
    this.latitude *= Math.PI / 180;
    return this;
};

CoordCarto.prototype.toDegrees = function() { 
    this.longitude *= 180 / Math.PI;
    this.latitude *= 180 / Math.PI;
    return this; 
};

CoordCarto.prototype.clone = function() { 
    return new CoordCarto(this.longitude, this.latitude, this.altitude); 
};

CoordCarto.prototype.getLon = function() {
    return this.longitude;
};

CoordCarto.prototype.getLat = function() {
    return this.latitude;
};

CoordCarto.prototype.getAltitude = function() {
    return this.altitude;
};

export default CoordCarto;
