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
define('Core/Geographic/CoordCarto',['Core/defaultValue'], function(defaultValue){


    function CoordCarto(longitude,latitude,altitude)
    {
        this.longitude  = defaultValue(longitude,0);
        this.latitude   = defaultValue(latitude,0);
        this.altitude   = defaultValue(altitude,0);
    }
    
    return CoordCarto;
});