/**
* Generated On: 2015-10-5
* Class: WMS_Provider
* Description: Fournisseur de données à travers un flux WMS
*/


define('Core/Commander/Providers/WMS_Provider',[
            'Core/Commander/Providers/Provider',
            'Core/Commander/Providers/IoDriver_XBIL',
            'Core/Commander/Providers/IoDriver_Image',
            'Core/Commander/Providers/IoDriverXML',
            'when',
            'THREE',
            'Core/Commander/Providers/CacheRessource'], 
        function(
                Provider,
                IoDriver_XBIL,
                IoDriver_Image,
                IoDriverXML,
                when,
                THREE,                
                CacheRessource){


    function WMS_Provider()
    {
        //Constructor
 
        Provider.call( this,new IoDriver_XBIL());
        this.cache         = CacheRessource();        
        this.ioDriverImage = new IoDriver_Image();
        this.ioDriverXML = new IoDriverXML();
       
  }

    WMS_Provider.prototype = Object.create( Provider.prototype );
    WMS_Provider.prototype.constructor = WMS_Provider;
    
  

               
    /**
     * Return url wms IR coverage
     * ex url: http://realearth.ssec.wisc.edu/api/image?products=globalir&bounds=-85,-178,85,178&width=1024&height=512
     * We can also specify time of coverage image like &time=2016-02-12+10:42
     * @param {type} coWMS
     * @returns {Object@call;create.urlOrtho.url|String}
     */
    WMS_Provider.prototype.urlOrtho = function(coWMS)
    {
        var latBound  = coWMS.latBound || new THREE.Vector2(-85,85);
        var longBound = coWMS.longBound || new THREE.Vector2(-178,178);
        
        var width  = coWMS.width || 1024;
        var height = coWMS.height || 512;
        
        var urlBaseService = "http://realearth.ssec.wisc.edu/api/image?products=globalir&bounds=";
  
        // URL for all globe  IR imagery   
        var url = urlBaseService + latBound.x+","+longBound.x+","+latBound.y+","+longBound.y+
                  "&width="+width +"&height="+height;
                
        //"http://realearth.ssec.wisc.edu/api/image?products=globalir_20160212_080000&"+
        //"x="+coWMS.col+"&y="+coWMS.row+"&z=" + coWMS.zoom;
        return url;
       

    };
    

  
    /**
     * Return texture RGBA THREE.js of orthophoto
     * TODO : RGBA --> RGB remove alpha canal
     * @param {type} coWMS
     * @param {type} id
     * @returns {WMS_Provider_L15.WMS_Provider.prototype@pro;ioDriverImage@call;read@call;then}
     */
    WMS_Provider.prototype.getTextureOrtho = function(coWMS,id)
    {
         
        var pack = function(i)
        {
            this.texture;
            this.id      = i;
        };
        
        var result = new pack(id);
        
        var url = this.urlOrtho(coWMS);        
        result.texture  = this.cache.getRessource(url);
        
        if(result.texture !== undefined)
        {                        
            return when(result);
        }        
        return this.ioDriverImage.read(url).then(function(image)
        {
            
            result.texture = new THREE.Texture(image);          
            result.texture.generateMipmaps  = false;
            result.texture.magFilter        = THREE.LinearFilter;
            result.texture.minFilter        = THREE.LinearFilter;
            result.texture.anisotropy       = 16;
            console.log("result.texture.anisotropy  ", result.texture, image);
            this.cache.addRessource(url,result.texture);
            return result;
            
        }.bind(this));
        
    };
    
    return WMS_Provider;
    
});
