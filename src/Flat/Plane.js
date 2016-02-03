/**
* Generated On: 2015-10-5
* Class: Plane
* Description: Le globe est le noeud du globe (node) principale.
*/

define('Flat/Plane',[    
    'Core/defaultValue',
    'Scene/Layer',
    'Scene/Quadtree',
    'Scene/SchemeTile',
    'Core/Math/MathExtented',
    'Flat/FlatTileMesh',
    'Flat/Atmosphere',
    'Core/System/Capabilities',
    'Core/Geographic/CoordCarto',
    'Renderer/BasicMaterial',
    'THREE'], function(defaultValue,Layer,Quadtree,SchemeTile,MathExt,FlatTileMesh,Atmosphere,Capabilities,CoordCarto,BasicMaterial,THREE){

    /*
     * Ctor
     *
     * @param {string} srid the proj4 string (or alias e.g. "EPSG:2154")
     */
    function Plane(srid, extent){
        
        Layer.call( this, Plane, {srid:srid} );  //TODO Layer should take srid as input      
        
        this.terrain = new Quadtree(FlatTileMesh, this.SchemeTile(extent), {srid:srid}) ;        
        
        this.add(this.terrain);                
        this.add(this.batiments);
        
    }

    Plane.prototype = Object.create( Layer.prototype );

    Plane.prototype.constructor = Plane;

    /**
    * @documentation: Rafrachi les matériaux en fonction du quadTree ORTHO
    *
    */
    Plane.prototype.QuadTreeToMaterial = function(){
        //TODO: Implement Me 

    };
    
    Plane.prototype.SchemeTile = function(extent){
        var schemeT = new SchemeTile();
        schemeT.add(extent.xmin, extent.xmax, extent.ymin, extent.ymax);
        return schemeT;

    };
    
    Plane.prototype.ellipsoid = function()
    {
        return this.terrain.interCommand.managerCommands.providers[0].ellipsoid;
    };
    
    return Plane;
    
});


