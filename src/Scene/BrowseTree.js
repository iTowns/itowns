/**
* Generated On: 2015-10-5
* Class: BrowseTree
* Description: BrowseTree parcourt un arbre de Node. Lors du parcours un ou plusieur NodeProcess peut etre appliqué sur certains Node.
*/

define('Scene/BrowseTree',['THREE','Globe/EllipsoidTileMesh','Scene/NodeProcess','OBBHelper'], function(THREE,EllipsoidTileMesh,NodeProcess,OBBHelper){

    function BrowseTree(scene){
        //Constructor
  
        this.oneNode    = 0;
        this.scene      = scene;       
        this.nodeProcess= new NodeProcess(this.scene.currentCamera().camera3D);
        this.tree       = undefined;
    }
    
    /**
     * 
     * @param {type} node
     * @returns {undefined}
     */
    BrowseTree.prototype.invisible= function(node)
    {        
        node.visible = false;
    };
    
    /**
     * @documentation: Process to apply to each node
     * @param {type} node   : node current to apply process
     * @param {type} camera : current camera needed to process
     * @param {type} optional  : optional process
     * @returns {Boolean}
     */
    BrowseTree.prototype.processNode = function(node,camera,optional)
    {        
        if(node instanceof EllipsoidTileMesh)
        {            
            node.visible = false;
            
            if(node.loaded)
            {
                this.nodeProcess.frustumCullingOBB(node,camera);

                if(node.visible )
                {
                    this.nodeProcess.horizonCulling(node,camera);

                    if(node.visible )
                    {

                        if(node.parent.material !== undefined && node.parent.material.visible === true)
                        {
                            node.visible = false;
                            return false;
                        }

                        var sse = this.nodeProcess.SSE(node,camera);

                        if(optional && sse && node.material.visible === true)
                        {   
                            //console.log(node.sse);
                            this.tree.subdivide(node);
                        }                            
                        else if(!sse && node.level >= 2 && node.material.visible === false)
                        {

                            node.material.visible = true;

                            if(node.childrenCount() !== 0)
                                for(var i = 0;i<node.children.length;i++)
                                {                                                       
                                    node.children[i].visible = false;                                        
                                }

                            return false;                            
                        }                                
                    }
                }
            }
                        
            return node.visible;
        }        
        
        return true;
    };

    /**
     * @documentation: Initiate traverse tree 
     * @param {type} tree       : tree 
     * @param {type} camera     : current camera
     * @param {type} optional   : optional process
     * @returns {undefined}
     */
    BrowseTree.prototype.browse = function(tree, camera,optional){
 
        this.tree = tree;
        this.nodeProcess.preHorizonCulling(camera);
        for(var i = 0;i<tree.children.length;i++)
            this._browse(tree.children[i],camera,optional);

        //if(optional)
        {
            this.tree.interCommand.managerCommands.runAllCommands();
        }
    };
    
    /**
     * @documentation: Recursive traverse tree
     * @param {type} node       : current node     
     * @param {type} camera     : current camera
     * @param {type} optional   : optional process
     * @returns {undefined}
     */
    BrowseTree.prototype._browse = function(node, camera,optional){
             
        if(this.processNode(node,camera,optional))       
            for(var i = 0;i<node.children.length;i++)
                this._browse(node.children[i],camera,optional);

    };
    
    /**
     * TODO : to delete
     * @documentation:add oriented bouding box of node in scene
     * @param {type} node
     * @returns {undefined}
     */
    BrowseTree.prototype.bBoxHelper = function(node)
    {          
        if(node instanceof EllipsoidTileMesh && node.level > 1  )
        {                
            
            //console.log(node);
            if(this.oneNode === 10 )
            {                    
                this.scene.scene3D().add(new THREE.OBBHelper(node.geometry.OBB));                                
            }
            this.oneNode++;
        }
    };
    
    /**
     * TODO : to delete 
     * @param {type} node
     * @returns {BrowseTree_L7.BrowseTree.prototype.addOBBoxHelper.bboxH}
     */
    BrowseTree.prototype.addOBBoxHelper = function(node){
             
        var bboxH = this.bBoxHelper(node);
            
        for(var i = 0;i<node.children.length;i++)
                this.addOBBoxHelper(node.children[i]);
            
        return bboxH;

    };
    
    return BrowseTree;
});