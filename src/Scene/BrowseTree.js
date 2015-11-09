/**
* Generated On: 2015-10-5
* Class: BrowseTree
* Description: BrowseTree parcourt un arbre de Node. Lors du parcours un ou plusieur NodeProcess peut etre appliqué sur certains Node.
*/

define('Scene/BrowseTree',['THREE','Globe/EllipsoidTileMesh','Scene/NodeProcess'], function(THREE,EllipsoidTileMesh,NodeProcess){

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
        //console.log('ssss');
        node.visible = false;
    };
    
    BrowseTree.prototype.processNode = function(node,camera,other)
    {        
        if(node instanceof EllipsoidTileMesh)
        {            
            node.visible = false;
            
            
            //if(this.nodeProcess.frustumBB(node,camera))
            {
                //this.nodeProcess.backFaceCulling(node,camera);

                //if(node.visible)
                {
                    this.nodeProcess.frustumCullingOBB(node,camera);
                                        
                    if(node.visible )
                    {
                        this.nodeProcess.horizonCulling(node,camera);
                                                
                        if(node.visible )
                        {
                            var sse = this.nodeProcess.SSE(node,camera);

                            if(node.parent.material !== undefined && node.parent.material.visible === true)
                            {
                                node.visible = false;
                                return false;
                            }


                            if(other && sse && node.material.visible === true)
                            {   
                                this.tree.subdivide(node);
                            }
                            else if(!sse && node.level >= 2 && node.material.visible === false)
                            {

                                node.material.visible = true;

                                if(node.childrenCount() !== 0)
                                    for(var i = 0;i<node.children.length;i++)
                                    {               
                                        //console.log("invisible");
                                        node.children[i].visible = false;
                                           //node.children[i].traverse(this.invisible);
                                    }

                                return false;                            
                            }

                        }
                    }
                }
            }
            
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
    BrowseTree.prototype.browse = function(tree, camera,other){
 
        this.tree = tree;
        this.nodeProcess.preHorizonCulling(camera);
        for(var i = 0;i<tree.children.length;i++)
            this._browse(tree.children[i],camera,other);

        if(other)
        {
            //console.log(this.tree.interCommand.managerCommands.queueAsync.sort());
        }
    };
    
    BrowseTree.prototype._browse = function(node, camera,other){
             
        if(this.processNode(node,camera,other))       
            for(var i = 0;i<node.children.length;i++)
                this._browse(node.children[i],camera,other);

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