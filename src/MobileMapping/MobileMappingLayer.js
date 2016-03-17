/**
 * Generated On: 2016-10-5
 * Class: MobileMappingLayer
 * Description: Layer for mobileMappingData
 */

define('MobileMapping/MobileMappingLayer', [
    'Scene/Layer',
    'THREE',
    'Renderer/PanoramicMesh'
    
], function(Layer, THREE, PanoramicMesh) {

    function MobileMappingLayer(panoramicMesh) {
        //Constructor

        Layer.call(this);
        
        this.panoramicMesh = panoramicMesh;
        this.name = "MobileMappingLayer";
        
        this.add(this.panoramicMesh);
    
    }

    MobileMappingLayer.prototype = Object.create(Layer.prototype);
    MobileMappingLayer.prototype.constructor = MobileMappingLayer;



    return MobileMappingLayer;

});
