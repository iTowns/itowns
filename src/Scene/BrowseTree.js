/**
* Generated On: 2015-10-5
* Class: BrowseTree
* Description: BrowseTree parcourt un arbre de Node. Lors du parcours un ou plusieur NodeProcess peut etre appliqué sur certains Node.
*/

define('Scene/BrowseTree',['Globe/EllipsoidTileMesh','THREE','OBBHelper','Scene/NodeProcess','Renderer/Camera'], function(EllipsoidTileMesh,THREE,OBBHelper,NodeProcess,camera){

    function BrowseTree(scene){
        //Constructor
  
        this.oneNode    = 0;
        this.scene      = scene;       
        this.nodeProcess= new NodeProcess(this.scene.currentCamera.camera3D);
        
    }
    
    BrowseTree.prototype.processNode = function(node,camera)
    {        
        if(node instanceof EllipsoidTileMesh)
        {            
            node.visible = false;
            
            this.nodeProcess.backFaceCulling(node,camera);
            
            if(node.visible)
                this.nodeProcess.frustumCullingOBB(node,camera);          
                                                
            return node.visible;
        }        
        
        return true;
    };

    /**
     * 
     * @param {type} tree
     * @param {type} camera
     * @returns {undefined}
     */
    BrowseTree.prototype.browse = function(tree, camera){
 
        for(var i = 0;i<tree.children.length;i++)
            this._browse(tree.children[i],camera);

    };
    
    BrowseTree.prototype._browse = function(node, camera){
             
        if(this.processNode(node,camera))       
            for(var i = 0;i<node.children.length;i++)
                this._browse(node.children[i],camera);

    };
    
    BrowseTree.prototype.bBoxHelper = function(node)
    {          
        if(node instanceof EllipsoidTileMesh && node.level < 4  && node.noChild())
        {                
            if(this.oneNode === 7)
            {                    
                this.scene.scene3D().add(new THREE.OBBHelper(node.geometry.OBB));                                
            }
            this.oneNode++;
        }
    };
    
    BrowseTree.prototype.addOBBoxHelper = function(node){
             
        var bboxH = this.bBoxHelper(node);
            
        for(var i = 0;i<node.children.length;i++)
                this.addOBBoxHelper(node.children[i]);
            
        return bboxH;

    };
    
    return BrowseTree;
});