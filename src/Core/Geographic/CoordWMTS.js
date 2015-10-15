/**
* Generated On: 2015-10-5
* Class: CoordCarto
* Description: Coordonées cartographiques
*/

/**
 * 
 * @param {type} defaultValue
 * @returns {CoordWMTS_L10.CoordWMTS}
 */
define('Core/Geographic/CoordWMTS',['Core/defaultValue'], function(defaultValue){

    /**
     * 
     * @param {type} zoom
     * @param {type} x
     * @param {type} y
     * @returns {CoordWMTS_L12.CoordWMTS}
     */
    function CoordWMTS(zoom,x,y)
    {
        this.zoom   = defaultValue(zoom,0);
        this.row    = defaultValue(x,0);
        this.col    = defaultValue(y,0);
    }
    
    return CoordWMTS;
});