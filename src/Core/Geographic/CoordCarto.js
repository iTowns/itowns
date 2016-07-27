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


function CoordCarto(longitude, latitude, altitude) {
    this.longitude = defaultValue(longitude, 0);
    this.latitude = defaultValue(latitude, 0);
    this.altitude = defaultValue(altitude, 0);
}

CoordCarto.prototype.constructor = CoordCarto;

CoordCarto.prototype.setFromDegreeGeo = function(longitude, latitude, altitude) {


    this.longitude = defaultValue(longitude * Math.PI / 180 + Math.PI, 0);
    this.latitude = defaultValue(latitude * Math.PI / 180, 0);
    this.altitude = defaultValue(altitude, 0);

    return this;
};

export default CoordCarto;
