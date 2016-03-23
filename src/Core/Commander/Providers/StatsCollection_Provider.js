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

    
    StatsCollection_Provider.prototype.getData = function(prop){


        var deferred = when.defer();
        this.ioDriver_JSON.read(prop.url).then(function(results){
            
          //  console.log(results);
            this.generateBins(results, prop);
            deferred.resolve(this.meshBins);
            
        }.bind(this));
        
        return deferred.promise;
    };    
    
    
    StatsCollection_Provider.prototype.generateBins = function(data, prop){
         
            this.geometryBins = new THREE.Geometry();
            var axis = new THREE.Vector3(0, 0, 1);
            //Math.random() * 0xffffff
            
            if(prop.nbAttributes <= 4){
                for(var i = 0; i < data.length; i+= prop.nbAttributes){
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
                        cube.geometry.faces[j].color.setHSL(0.5+value/2, 0.6+value/2, 0.4);//setHex(new THREE.Color().setHSL(value, value, 0.5).getHex());

                    cube.position.copy(posPanoCartesian);
                    cube.quaternion.setFromUnitVectors(axis, posPanoCartesian.normalize());
                    cube.updateMatrix(); 

                    this.geometryBins.merge(cube.geometry, cube.matrix);
                }
            }else{  // Dirty temp
                
                var districts = data.districts;
                var arrayProperties = [];
             //   console.log(districts[1].name);
                var that = this;
                Object.getOwnPropertyNames(districts).forEach(function(val) {
                    
               //     console.log(val + ' -> ' + districts[val]);
                    arrayProperties[val] = districts[val];
                    if(districts[val].coords !== undefined){
                        var coordArray = districts[val].coords.split(","); 
                        var lon   = Number(coordArray[1]);
                        var lat   = Number(coordArray[0]);
                        var valueR = districts[val].politics.right;//districts[val].singles / 100000;
                        var valueL = districts[val].politics.left;
                        var tax = districts[val].tax;
                      //    console.log(lon,lat,valueR, valueL);
                        var posPanoWGS84 = new CoordCarto().setFromDegreeGeo(lat, lon, 50);
                        var posPanoCartesian = that.ellipsoid.cartographicToCartesian(posPanoWGS84);

                        var sizeR = 500;
                        var sizeL = 500; //valueR > valueL ? 450 : 550;
                        var ecart = 0;
                        var valToRepresent = valueL;
                        var color =  0xff4d4d;
                        
                        if(valueR> valueL){
                            sizeL = 450;
                            valToRepresent = valueR;
                            color = 0x3385ff;
                            ecart = valueR / valueL;
                        }else
                            ecart = valueL / valueR;
                        
                        
                        var geometry = new THREE.SphereGeometry( ecart *100, 18, 18 );
                        var material = new THREE.MeshBasicMaterial( {color: color} );

                        var cube = new THREE.Mesh( geometry, material );
                        for(var j = 0; j< cube.geometry.faces.length; ++j)
                            cube.geometry.faces[j].color.setHex(color);

                        cube.position.copy(posPanoCartesian);
                        cube.quaternion.setFromUnitVectors(axis, posPanoCartesian.clone().normalize());
                        cube.updateMatrix(); 

                        that.geometryBins.merge(cube.geometry, cube.matrix);
                        
                        
                        var posPanoWGS84 = new CoordCarto().setFromDegreeGeo(lat, lon + ecart / 500 /*0.002*/, 50);
                        var posPanoCartesian = that.ellipsoid.cartographicToCartesian(posPanoWGS84);
                            
                        
                     //   var geometry2 = new THREE.SphereGeometry( valueL / 100, 10, 10 );
            
                        var geometry2 = new THREE.BoxGeometry( 100, 100, tax  / 10);
                        var material2 = new THREE.MeshBasicMaterial( {color: 0x66ff99} );

                        var cube2 = new THREE.Mesh( geometry2, material2 );
                        for(var j = 0; j< cube2.geometry.faces.length; ++j)
                            cube2.geometry.faces[j].color.setHex(0x66ff99);

                        cube2.position.copy(posPanoCartesian);
                        cube2.quaternion.setFromUnitVectors(axis, posPanoCartesian.clone().normalize());
                        cube2.updateMatrix(); 

                        that.geometryBins.merge(cube2.geometry, cube2.matrix);
                        
                    }
                });
                
            }
            
            var material = new THREE.MeshBasicMaterial({/*color: 0xFF0000,transparent:true, opacity:0.8,*/ vertexColors: THREE.VertexColors});
            var mesh = new THREE.Mesh(this.geometryBins, material);
            
            this.meshBins   = mesh;
            this.meshBins.name = "statisticsMesh";

    };
    
    
  

    return StatsCollection_Provider;
    
});