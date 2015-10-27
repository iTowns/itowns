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
     * @param {type} row
     * @param {type} col
     * @returns {CoordWMTS_L12.CoordWMTS}
     */
    function CoordWMTS(zoom,row,col)
    {
        this.zoom   = defaultValue(zoom,0);
        this.row    = defaultValue(row,0);
        this.col    = defaultValue(col,0);
    }
    
    return CoordWMTS;
});