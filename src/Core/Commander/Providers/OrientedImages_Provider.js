/**
* Generated On: 2016-02-3
* Class: OrientedImages_Provider
* Description: Serve Oriented Images
*/


define('Core/Commander/Providers/OrientedImages_Provider',[
            'Core/Commander/Providers/Provider',
            'Core/Commander/Providers/IoDriver_Image',
            'Core/Commander/Providers/IoDriverXML',
            'when',
            'Core/Math/Ellipsoid',
            'Core/Geographic/CoordCarto',
            'Renderer/c3DEngine',
            'THREE',
            'Renderer/Ori',
            'Core/Commander/Providers/CacheRessource',
            'Renderer/ProjectiveTexturing2'], 
        function(
                Provider,
                IoDriver_Image,
                IoDriverXML,
                when,
                Ellipsoid,
                CoordCarto,
                gfxEngine,
                THREE,      
                Ori,
                CacheRessource,
                ProjectiveTexturing2){


    function OrientedImages_Provider()
    {
        //Constructor
 
        Provider.call(this, new IoDriver_Image()); // Should be JSON
     //   this.cache         = CacheRessource();        
        this.ioDriverImage = new IoDriver_Image();
        this.ioDriverXML = new IoDriverXML();
       
    }

    OrientedImages_Provider.prototype = Object.create( Provider.prototype );
    OrientedImages_Provider.prototype.constructor = OrientedImages_Provider;
    
  
    /**
     * Return url Oriented Images Services
     * @param {type} coWMTS : coord WMTS
     * @returns {Object@call;create.url.url|String}
     */
    OrientedImages_Provider.prototype.url = function(URLServiceOrientedImages, position)
    {
       
        var url = "adresseALaMappillary at position";  
        return url;
    };
            
            
    /**
     * Return url Images
     * @param {type} coWMTS
     * @returns {Object@call;create.urlOrtho.url|String}
     */
    OrientedImages_Provider.prototype.urlImages = function()
    {            
        var url = "../itowns-sample-data/images/140616/Paris-140616_0740-301-00001_0000494.jpg";
        return url;
    };
        
        
    /**
     * return texture of the oriented image
     * @param {type} coWMTS : coord WMTS
     * @returns {WMTS_Provider_L15.WMTS_Provider.prototype@pro;_IoDriver@call;read@call;then}
     */
    OrientedImages_Provider.prototype.getOrientedImageMetaData = function(URLServiceOrientedImages, position)
    {
        
        if(URLServiceOrientedImages === undefined)
            return when(-2);
       
        var url = "../itowns-sample-data/image200.json";//this.url(URLServiceOrientedImages,position);     
     
     
      //  var texture = this.getTexture(0).then(){};  // URL is urlImages (hardcoded for now)
        var texture = THREE.ImageUtils.loadTexture( this.urlImages());
        
        console.log(texture);
        var geometry = new THREE.SphereGeometry( 1000000, 16, 16 );
        var material = new THREE.MeshBasicMaterial( {side: THREE.DoubleSide, map: texture} ); 
        var plane = new THREE.Mesh( geometry, material ); 
        
        // POS
        var ellipsoid  = new Ellipsoid(new THREE.Vector3(6378137, 6356752.3142451793, 6378137));
        var pos = ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(48.7,2.33, 10000));

        plane.position.set(pos.x, pos.y, pos.z);
      //  gfxEngine().add3DScene(plane);
        
        // Test projective texturing    paris 6: 2.334 48.85
        var matRotation = new THREE.Matrix4();
         
        Ori.init();
        
        ProjectiveTexturing2.init(matRotation);
        var projectiveMaterial = ProjectiveTexturing2.createShaderForImage("Paris-140616_0740-00-00001_0000496"/*this.panoInfo.filename*/,50);
        var mat = new THREE.MeshBasicMaterial({color:0xff00ff});
        var mesh  = new THREE.Mesh(geometry,mat);
   //     mat.side = THREE.DoubleSide;
        mesh.name = "RGE";
        mesh.material = projectiveMaterial;
        mesh.material.side = THREE.DoubleSide;  
    /*    mesh.material.transparent = true;
        mesh.material.dephTest = false;
    */    
        mesh.position.set(pos.x, pos.y, pos.z);
   //     gfxEngine().add3DScene(mesh);

        
        // Suppose we got the metadata and image
     
     /*
        return new Promise(function(resolve, reject) {


           // TODO: USE READ OF IODRIVER JSON (TODO: CREATE IT)
                  var req = new XMLHttpRequest();
                  req.open('GET', url);

                  req.onload = function() {

                        if (req.status === 200) {
                          resolve(JSON.parse(req.response));//req.response);
                        }
                        else {
                          reject(Error(req.statusText));
                        }
                  };

                  req.onerror = function() {
                        reject(Error("Network Error"));
                  };

                  req.send();
                });
        */
        
       // Will be done when ImageOriented service will be ok
        /*
        return this._IoDriver.read(url).then(function(result)
            {                                                        
                if(result !== undefined)
                {                    
                    result.texture = new THREE.DataTexture(result.floatArray,256,256,THREE.AlphaFormat,THREE.FloatType);   
                    result.texture.generateMipmaps  = false;
                    result.texture.magFilter        = THREE.LinearFilter;
                    result.texture.minFilter        = THREE.LinearFilter;                                    
                    this.cache.addRessource(url,result);
                    return result;
                }
                else
                {
                    var texture = -1;
                    this.cache.addRessource(url,texture);
                    return texture;
                }
            }.bind(this)
        );
        */
       
       // We suppose that we have the metadata
       
       
    };

    /**
     * Return texture RGBA THREE.js of orthophoto
     * TODO : RGBA --> RGB remove alpha canal
     * @param {type} coWMTS
     * @param {type} id
     * @returns {WMTS_Provider_L15.WMTS_Provider.prototype@pro;ioDriverImage@call;read@call;then}
     */
    OrientedImages_Provider.prototype.getTexture = function(id)
    {
         
        var pack = function(i)
        {
            this.texture;
            this.id      = i;
        };
        
        var result = new pack(id);
        
        var url = this.urlImages();      
    /*    result.texture  = this.cache.getRessource(url);
        
        if(result.texture !== undefined)
        {                        
            return when(result);
        }   
     */ 
        return this.ioDriverImage.read(url).then(function(image)
        {
            
            result.texture = new THREE.Texture(image);          
            result.texture.generateMipmaps  = false;
            result.texture.magFilter        = THREE.LinearFilter;
            result.texture.minFilter        = THREE.LinearFilter;
            result.texture.anisotropy       = 16;
                        
            this.cache.addRessource(url,result.texture);
            return result;
            
        }.bind(this));
        
    };
    
    return OrientedImages_Provider;
    
});
