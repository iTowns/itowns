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
define('Core/Commander/Providers/BuildingBox_Provider',[
            'Core/Commander/Providers/Provider',
            'Core/Commander/Providers/WFS_Provider',
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
                when,
                THREE,                
                CacheRessource,
                gfxEngine,
                Ellipsoid,
                CoordCarto,
                CVML){


    function BuildingBox_Provider(options)
    {
        //Constructor
 
       // Provider.call( this,new IoDriver_XBIL());
       // this.cache         = CacheRessource();        
       this.WFS_Provider  = new WFS_Provider(options);
       this.geometry = null;
       this.roadOn = true;
       this.rtcOn = true;

    }

    BuildingBox_Provider.prototype = Object.create( Provider.prototype );
    BuildingBox_Provider.prototype.constructor = BuildingBox_Provider;
    
    
    /**
     * Return url wmts MNT
     * @param {type} coWMTS : coord WMTS
     * @returns {Object@call;create.url.url|String}
     */
    BuildingBox_Provider.prototype.url = function(longitude,latitude,radius)
    {
        
        //var key    = "wmybzw30d6zg563hjlq8eeqb";
        //var key    = coWMTS.zoom > 11 ? "va5orxd0pgzvq3jxutqfuy0b" : "wmybzw30d6zg563hjlq8eeqb"; // clef pro va5orxd0pgzvq3jxutqfuy0b
        
        var key    = "72hpsel8j8nhb5qgdh07gcyp";
     
        var layer  = "BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie"
        var serviceVersionRequestLayer = "service=WFS&version=2.0.0&REQUEST=GetFeature&typeName=BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie"
                        
        var bottomLeft = new THREE.Vector2(longitude - radius, latitude - radius);
        var topRight   = new THREE.Vector2(longitude + radius, latitude + radius);
                   
   
        var url = "http://wxs.ign.fr/"+key+"/geoportail/wfs?"+serviceVersionRequestLayer+
                  "&bbox="+bottomLeft.x+","+bottomLeft.y+","+topRight.x+
                  ","+topRight.y+",epsg:4326&outputFormat=json";
          
        
        return url;
    };
  

    /*
                return this.providerKML.loadKMZ(longitude, latitude).then(function (collada){

                    if(collada && tile.link.children.indexOf(collada) === -1)
                        {                                 
                            tile.link.add(collada);
                            tile.content = collada;
            */
                  
            
    BuildingBox_Provider.prototype.getData = function(bbox){
        
       var deferred = when.defer(); 
       deferred = this.WFS_Provider.getData(bbox).then(function(data){this.generateMesh(data,bbox);}.bind(this));
       return deferred;
    };        
            
    BuildingBox_Provider.prototype.generateMesh = function(elements, bbox){
               
        //console.log(elements);
        
        var _geometry = new THREE.Geometry(); // for the walls
        var geometry = new THREE.Geometry();  // for the roof
        var suppHeight = 10;   // So we don't cut the roof
        var ellipsoid  = new Ellipsoid(new THREE.Vector3(6378137, 6356752.3142451793, 6378137)); 
        var features = elements.features;
        var altitude_ground  = 35;
        
        for( var r = 0 ; r <features.length ; r++){

            var hauteur       = (features[r].properties.hauteur + suppHeight) || 0;
            var polygon       = features[r].geometry.coordinates[0][0];

            if(polygon.length > 2){

                var arrPoint2D = [];
                // VERTICES
                for(var j=0; j< polygon.length -1; ++j){

                   var pt2DTab   = polygon[j];   //.split(' ');
                   var p1  = new THREE.Vector3(parseFloat(pt2DTab[0]) , 0, parseFloat(pt2DTab[1]));

                   var coordCarto1 = new CoordCarto().setFromDegreeGeo(p1.x  ,p1.z, altitude_ground );
                   var coordCarto2 = new CoordCarto().setFromDegreeGeo(p1.x  ,p1.z, altitude_ground  + hauteur);// + Math.random(1000) );
                   var pgeo1 = ellipsoid.cartographicToCartesian(coordCarto1); //{longitude:p1.z, latitude:p1.x, altitude: 0});
                   var pgeo2 = ellipsoid.cartographicToCartesian(coordCarto2);

                   var vector3_1 = new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z);  // - x temporary, bug
                   var vector3_2 = new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z);

                   arrPoint2D.push(CVML.newPoint(p1.z, p1.x));//-pgeo1.x, pgeo1.z)); //for roof
                   _geometry.vertices.push(vector3_1,vector3_2);

                }

                // FACES
                // indice of the first point of the polygon 3D
                for(var k = _geometry.vertices.length - ((polygon.length -1)* 2); k< _geometry.vertices.length ; k=k+2){

                     var l = k;   // % (pts2DTab.length);
                     if(l>_geometry.vertices.length-4){
                         l = _geometry.vertices.length - ((polygon.length -1) * 2);
                     }
                     _geometry.faces.push(new THREE.Face3(l, l + 1, l + 3));
                     _geometry.faces.push(new THREE.Face3(l, l + 3, l + 2));
                 }

                 var ll = _geometry.vertices.length - ((polygon.length -1)* 2);
                 _geometry.faces.push(new THREE.Face3(ll, ll +1, _geometry.vertices.length-1));
                 _geometry.faces.push(new THREE.Face3(ll, _geometry.vertices.length-1, _geometry.vertices.length-2));

            }

 //**************** ROOF ****************************

           var triangles = CVML.TriangulatePoly(arrPoint2D);
           //var geometry = new THREE.Geometry();  // for the roof
           triangles.forEach(function(t) {

               var pt1  = t.getPoint(0),  
                   pt2  = t.getPoint(1),
                   pt3  = t.getPoint(2);

               var coordCarto1 = new CoordCarto().setFromDegreeGeo(pt1.y ,pt1.x, altitude_ground  + hauteur);
               var coordCarto2 = new CoordCarto().setFromDegreeGeo(pt2.y ,pt2.x, altitude_ground  + hauteur);// + Math.random(1000) );
               var coordCarto3 = new CoordCarto().setFromDegreeGeo(pt3.y ,pt3.x, altitude_ground  + hauteur);

               var pgeo1 = ellipsoid.cartographicToCartesian(coordCarto1);//{longitude:p1.z, latitude:p1.x, altitude: 0});
               var pgeo2 = ellipsoid.cartographicToCartesian(coordCarto2);   
               var pgeo3 = ellipsoid.cartographicToCartesian(coordCarto3); 

               //var geometry = new THREE.Geometry();
               geometry.vertices.push(new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z));
               geometry.vertices.push(new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z));
               geometry.vertices.push(new THREE.Vector3(pgeo3.x, pgeo3.y, pgeo3.z));

               var face = new THREE.Face3(            
                                         geometry.vertices.length -3,
                                         geometry.vertices.length -2,
                                         geometry.vertices.length -1
               );
               geometry.faces.push(face);

            });
                
        }
           
        if(this.roadOn)
            this.addRoad(_geometry, bbox, altitude_ground, ellipsoid);
        
        
        _geometry.computeFaceNormals();  // WARNING : VERY IMPORTANT WHILE WORKING WITH RAY CASTING ON CUSTOM MESH
        geometry.computeFaceNormals();
        /*
            var matLambert = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.8});
            var _currentMeshForRoof  = new THREE.Mesh(_geometry, matLambert);// //geometryClickToGo,mat);
            gfxEngine().add3DScene(_currentMeshForRoof);
        */
        
        // Test if we return brute geometry or if we use local pivot (for RTC)
        var firstPos = new THREE.Vector3();
        if(this.rtcOn){
            firstPos = _geometry.vertices[0].clone();
            // create pivot from 1st pos vertex
            for(var i = 0; i< _geometry.vertices.length ; ++i){
                    _geometry.vertices[i].sub(firstPos);
            }
        }
           //deferred.resolve({geometry:_geometry, pivot: firstPos});
           
        return {geometry:_geometry, pivot: firstPos};
        
    };
    
    
    BuildingBox_Provider.prototype.addRoad = function(geometry, bbox, altitude_road, ellipsoid){
             
         // Version using SIMPLE PLANE ROAD for Click and Go
         var roadWidth  = bbox.minCarto.longitude + bbox.maxCarto.longitude;
         var roadHeight = bbox.minCarto.latitude + bbox.maxCarto.latitude;
         var pos = new THREE.Vector3((bbox.minCarto.latitude + bbox.maxCarto.latitude)/2,
                                      altitude_road,
                                     (bbox.minCarto.longitude + bbox.maxCarto.longitude)/2 );//48.8505774,  altitude_sol, 2.3348124);

         var coordCarto1 = new CoordCarto().setFromDegreeGeo(pos.x -roadWidth ,pos.z -roadHeight, altitude_road);
         var coordCarto2 = new CoordCarto().setFromDegreeGeo(pos.x -roadWidth ,pos.z +roadHeight, altitude_road);
         var coordCarto3 = new CoordCarto().setFromDegreeGeo(pos.x +roadWidth, pos.z +roadHeight, altitude_road);
         var coordCarto4 = new CoordCarto().setFromDegreeGeo(pos.x +roadWidth, pos.z -roadHeight, altitude_road);

         var pgeo1 = ellipsoid.cartographicToCartesian(coordCarto1);
         var pgeo2 = ellipsoid.cartographicToCartesian(coordCarto2);
         var pgeo3 = ellipsoid.cartographicToCartesian(coordCarto3);
         var pgeo4 = ellipsoid.cartographicToCartesian(coordCarto4);

         geometry.vertices.push(new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z));
         geometry.vertices.push(new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z));
         geometry.vertices.push(new THREE.Vector3(pgeo3.x, pgeo3.y, pgeo3.z));
         geometry.vertices.push(new THREE.Vector3(pgeo4.x, pgeo4.y, pgeo4.z));

         var len = geometry.vertices.length;
         geometry.faces.push( new THREE.Face3( len-4,len-3,len-2));
         geometry.faces.push( new THREE.Face3( len-4,len-2,len-1));
    };
    
     
    // 2.33 48.86
    // return {geometry:_geometry, pivot: undefined}
    BuildingBox_Provider.prototype.generateMesh2 = function(longitude,latitude,radius, pivotOn)
    {
        
       console.log("GERENTE MESH");
       var url = this.url(longitude,latitude,radius);                    
       var roadOn = true;
       
       var deferred = when.defer();  
       
       
       function createElements(elements) {
           
            
            
            console.log("create elem",elements);
            // Assuming you get an array of objects.
            elements = JSON.parse(elements.currentTarget.response);
   
              var _geometry = new THREE.Geometry();
              var geometry = new THREE.Geometry();  // for the roof
              var geometryClickToGo = new THREE.Geometry();  // facades with Simple road  (no dtm)
              var heightApplanixOnTruck = 2;
              //var zero = gfxEngine.getZeroAsVec3D();
              //   var altiSolTruck = this.panoInfo.altitude - zero.y - heightApplanixOnTruck;
              var suppHauteur = 10;   // So we don't cut the roof
              
              var ellipsoid  = new Ellipsoid(new THREE.Vector3(6378137, 6356752.3142451793, 6378137));
              
              var features = elements.features;
              var material = new THREE.LineBasicMaterial({
                    color: 0xffffff,
                    linewidth: 3
               });
              var geometryLine = new THREE.Geometry();

              for( var r = 0 ; r <features.length ; r++){
                 
                    var hauteur       = (features[r].properties.hauteur + suppHauteur) || 0;
                    var altitude_sol  = 35;
                    var polygon       = features[r].geometry.coordinates[0][0];
              
                     if(polygon.length > 2){

                          
                                var arrPoint2D = [];
                                var geometryLinePerBuilding = new THREE.Geometry();
                               
                                // VERTICES
                                for(var j=0; j< polygon.length -1; ++j){
                                   
                                   var pt2DTab   = polygon[j];   //.split(' ');
                                   var p1  = new THREE.Vector3(parseFloat(pt2DTab[0]) , 0, parseFloat(pt2DTab[1]));
                                  
                                   var coordCarto1 = new CoordCarto().setFromDegreeGeo(p1.x  ,p1.z, altitude_sol);
                                   var coordCarto2 = new CoordCarto().setFromDegreeGeo(p1.x  ,p1.z, altitude_sol + hauteur);// + Math.random(1000) );
                                   var pgeo1 = ellipsoid.cartographicToCartesian(coordCarto1);//{longitude:p1.z, latitude:p1.x, altitude: 0});
                                   var pgeo2 = ellipsoid.cartographicToCartesian(coordCarto2);
                                   
                                   var vector3_1 = new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z);  // - x temporary, bug
                                   var vector3_2 = new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z);
                                 
                                   arrPoint2D.push(CVML.newPoint(p1.z, p1.x));//-pgeo1.x, pgeo1.z)); //for roof
                                   _geometry.vertices.push(vector3_1,vector3_2);
                                   // debug line
                               //    geometryLine.vertices.push(vector3_1);//,vector3_2);
                                   geometryLinePerBuilding.vertices.push(vector3_1);
                                }
                                geometryLinePerBuilding.vertices.push( geometryLinePerBuilding.vertices[0]);
                                
                               var lineperBuilding = new THREE.Line(geometryLinePerBuilding, material);
                          //     gfxEngine().add3DScene(lineperBuilding);
                               
                               
                                // FACES
                                // indice of the first point of the polygon 3D
                                for(var k = _geometry.vertices.length - ((polygon.length -1)* 2); k< _geometry.vertices.length ; k=k+2){

                                     var l = k;   // % (pts2DTab.length);
                                     if(l>_geometry.vertices.length-4){
                                         l = _geometry.vertices.length - ((polygon.length -1) * 2);
                                     }
                                     _geometry.faces.push(new THREE.Face3(l, l + 1, l + 3));
                                     _geometry.faces.push(new THREE.Face3(l, l + 3, l + 2));
                                 }
                                 
                                 var ll = _geometry.vertices.length - ((polygon.length -1)* 2);
                                 _geometry.faces.push(new THREE.Face3(ll, ll +1, _geometry.vertices.length-1));
                                 _geometry.faces.push(new THREE.Face3(ll, _geometry.vertices.length-1, _geometry.vertices.length-2));
                                   
                  }
                      
                 //**************** ROOF ****************************
                                
                               var triangles = CVML.TriangulatePoly(arrPoint2D);
                               //var geometry = new THREE.Geometry();  // for the roof
                               triangles.forEach(function(t) {
                                   
                                   var pt1  = t.getPoint(0),  
                                       pt2  = t.getPoint(1),
                                       pt3  = t.getPoint(2);
                                       
                                   var coordCarto1 = new CoordCarto().setFromDegreeGeo(pt1.y ,pt1.x, altitude_sol + hauteur);
                                   var coordCarto2 = new CoordCarto().setFromDegreeGeo(pt2.y ,pt2.x, altitude_sol + hauteur);// + Math.random(1000) );
                                   var coordCarto3 = new CoordCarto().setFromDegreeGeo(pt3.y ,pt3.x, altitude_sol + hauteur);
                                    
                                   var pgeo1 = ellipsoid.cartographicToCartesian(coordCarto1);//{longitude:p1.z, latitude:p1.x, altitude: 0});
                                   var pgeo2 = ellipsoid.cartographicToCartesian(coordCarto2);   
                                   var pgeo3 = ellipsoid.cartographicToCartesian(coordCarto3); 

                                   //var geometry = new THREE.Geometry();
                                   geometry.vertices.push(new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z));
                                   geometry.vertices.push(new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z));
                                   geometry.vertices.push(new THREE.Vector3(pgeo3.x, pgeo3.y, pgeo3.z));

                                   var face = new THREE.Face3(            
                                                             geometry.vertices.length -3,
                                                             geometry.vertices.length -2,
                                                             geometry.vertices.length -1
                                   );
                                   geometry.faces.push(face);
     
                                });
                  
           
                           
           
           }
           
            if(roadOn){ 
                   
                // Version using SIMPLE PLANE ROAD for Click and Go
                     var roadLength = 0.0003;// = 500;
                     var v1 = _geometry.vertices[0];
                     var altitude_sol = 47.39;//49.39;48.8505774, 2.3348124, 49.43
                     var pos = new THREE.Vector3(48.8505774,  altitude_sol, 2.3348124);
                     
                     // get first vertices pos
              //       var pos = ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(48.85,2.334, altitude_sol));
                     
                     var coordCarto1 = new CoordCarto().setFromDegreeGeo(pos.x -roadLength ,pos.z -roadLength, altitude_sol);
                     var coordCarto2 = new CoordCarto().setFromDegreeGeo(pos.x -roadLength ,pos.z +roadLength, altitude_sol);
                     var coordCarto3 = new CoordCarto().setFromDegreeGeo(pos.x +roadLength, pos.z +roadLength, altitude_sol);
                     var coordCarto4 = new CoordCarto().setFromDegreeGeo(pos.x +roadLength, pos.z -roadLength, altitude_sol);
                    
                     var pgeo1 = ellipsoid.cartographicToCartesian(coordCarto1);
                     var pgeo2 = ellipsoid.cartographicToCartesian(coordCarto2);
                     var pgeo3 = ellipsoid.cartographicToCartesian(coordCarto3);
                     var pgeo4 = ellipsoid.cartographicToCartesian(coordCarto4);
                     
                     _geometry.vertices.push(new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z));
                     _geometry.vertices.push(new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z));
                     _geometry.vertices.push(new THREE.Vector3(pgeo3.x, pgeo3.y, pgeo3.z));
                     _geometry.vertices.push(new THREE.Vector3(pgeo4.x, pgeo4.y, pgeo4.z));


                     var len = _geometry.vertices.length;
                     _geometry.faces.push( new THREE.Face3( len-4,len-3,len-2));
                     _geometry.faces.push( new THREE.Face3( len-4,len-2,len-1));
            }
           
            _geometry.computeFaceNormals();  // WARNING : VERY IMPORTANT WHILE WORKING WITH RAY CASTING ON CUSTOM MESH
            geometry.computeFaceNormals();
    /*
            var line = new THREE.Line(geometryLine, material);
          //  gfxEngine().add3DScene(line);
            var mat = new THREE.MeshBasicMaterial({color:0xff00ff, side: THREE.DoubleSide, wireframe: true, transparent: false});
            var matBasic= new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.DoubleSide});
           
    */    
            var matLambert = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.8});
            var matWireFrame = new THREE.MeshBasicMaterial({color:0x00ff00, side: THREE.DoubleSide, wireframe: true, transparent: false});
          //  var _currentMeshForClickAndGo  = new THREE.Mesh(_geometry,matLambert);//geometryClickToGo,mat);
            
            var _currentMeshForRoof  = new THREE.Mesh(geometry,matLambert);// //geometryClickToGo,mat);
            gfxEngine().add3DScene(_currentMeshForRoof);
            
            this.geometry = _geometry;
       /*     
            // Light TEST
            var pointLight = new THREE.PointLight( 0xFFFFFF, 1, 1000000000);
            var pos = _geometry.vertices[0];
            pointLight.position.set(pos.x,  pos.y+1000, pos.z);
            gfxEngine().add3DScene( pointLight);
            
            var spotLight = new THREE.SpotLight( 0xffffff );
                spotLight.position.set( pos.x,  pos.y+1000, pos.z );
                spotLight.castShadow = true;
                spotLight.shadowMapWidth = 1024;
                spotLight.shadowMapHeight = 1024;
                spotLight.shadowCameraNear = 500;
                spotLight.shadowCameraFar = 4000;
                spotLight.shadowCameraFov = 30;

               gfxEngine().add3DScene(spotLight );

            var _currentMeshForRoof  = new THREE.Mesh(geometry,matLambert);// //geometryClickToGo,mat);
            gfxEngine().add3DScene(_currentMeshForRoof);
        */   
       //     gfxEngine().add3DScene(_currentMeshForClickAndGo);




           // Test if we return brute geometry or if we use local pivot (for RTC)
           if(pivotOn){
               
                 var firstPos = _geometry.vertices[0].clone();  // create pivot from 1st pos vertex
                 for(var i = 0; i< _geometry.vertices.length ; ++i){
                        _geometry.vertices[i].sub(firstPos);
                 }
                deferred.resolve({geometry:_geometry, pivot: firstPos});
           }
           
            var firstPos = new THREE.Vector3();
            deferred.resolve({geometry:_geometry, pivot: firstPos});
        }

        var request = new XMLHttpRequest();

        request.onload = createElements;
        request.open("get", url, true);
        request.send();
        
        return deferred;

     };

 

    return BuildingBox_Provider;
    
});