/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/**
* Generated On: 2015-10-5
* Class: WMTS_Provider
* Description: Fournisseur de données à travers un flux WMTS
*/



// TODO , will use WFS_Provider
define('Core/Commander/Providers/StatsCollection_Provider',[
            'Core/Commander/Providers/Provider',
            'Core/Commander/Providers/WFS_Provider',
            'Core/Commander/Providers/IoDriver_JSON',
            'when',
            'THREE',
            'Core/Commander/Providers/CacheRessource',
            'Renderer/c3DEngine',
            'Core/Math/Ellipsoid',
            'Core/Geographic/CoordCarto',
            'Core/Math/CVML'], 
        function(
                Provider,
                WFS_Provider,
                IoDriver_JSON,
                when,
                THREE,                
                CacheRessource,
                gfxEngine,
                Ellipsoid,
                CoordCarto,
                CVML){


    function StatsCollection_Provider(options)
    {

        this.ioDriver_JSON = new IoDriver_JSON();
        this.geometryBins = null;
        this.meshBins = null;
        this.ellipsoid = new Ellipsoid(new THREE.Vector3(6378137, 6356752.3142451793, 6378137));
    }

    StatsCollection_Provider.prototype = Object.create( Provider.prototype );
    StatsCollection_Provider.prototype.constructor = StatsCollection_Provider;
    
    
  
    StatsCollection_Provider.prototype.url = function(longitude,latitude,radius)
    {
        var url = "";
        return url;
    };

    
    StatsCollection_Provider.prototype.getData = function(url){

        //var url = this.url(bbox);            
        //return this.ioDriver_JSON.read(url);
        var deferred = when.defer();
        this.ioDriver_JSON.read(url).then(function(results){
            //console.log(results);
            
            this.generateBins(results);
            
            deferred.resolve(this.meshBins);
        }.bind(this));
        
        return deferred.promise;
    };    
    
    
    StatsCollection_Provider.prototype.generateBins = function(data){
         
            this.geometryBins = new THREE.Geometry();
            var axis = new THREE.Vector3(0, 0, 1);
            //Math.random() * 0xffffff
            
            for(var i = 0; i < data.length; i+=3){
                // lon  lat value
               // console.log(data[i]);
                var lon   = data[i];
                var lat   = data[i + 1];
                var value = data[i + 2];
               // console.log(lon,lat,value);
                var posPanoWGS84 = new CoordCarto().setFromDegreeGeo(lon, lat, 0);
                var posPanoCartesian = this.ellipsoid.cartographicToCartesian(posPanoWGS84);
                
               // var geometry = new THREE.SphereGeometry( 100000, 10, 10 );
                var geometry = new THREE.BoxGeometry( 50000, 50000, 10000000 * value );
                var material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
                
                var cube = new THREE.Mesh( geometry, material );
                for(var j = 0; j< cube.geometry.faces.length; ++j)
                    cube.geometry.faces[j].color.setHSL(0.5+value/3, 0.6+value/3, 0.4);//setHex(new THREE.Color().setHSL(value, value, 0.5).getHex());
                
                cube.position.copy(posPanoCartesian);
                cube.quaternion.setFromUnitVectors(axis, posPanoCartesian.normalize());
                cube.updateMatrix(); 
                
                this.geometryBins.merge(cube.geometry, cube.matrix);
            }
            
            var material = new THREE.MeshBasicMaterial({/*color: 0xFF0000,transparent:true, opacity:0.8,*/ vertexColors: THREE.VertexColors});
            var mesh = new THREE.Mesh(this.geometryBins, material);
            
            this.meshBins   = mesh;
            this.meshBins.name = "statisticsMesh";

    };
    
    
  

    return StatsCollection_Provider;
    
});