/**
* Generated On: 2015-10-5
* Class: Quadtree
* Description: Structure de données spatiales possedant jusqu'à 4 Nodes
*/

/**
 * 
 * @param {type} Layer
 * @param {type} Quad
 * @returns {Quadtree_L13.Quadtree}
 */
define('Scene/Quadtree',[
        'Scene/Layer',                        
        'Core/Geographic/Quad'
        ], function(Layer,Quad){
    

    function Quadtree(type,schemeTile)
    {        
        Layer.call( this,type);
        
        this.schemeTile       = schemeTile;
        this.tileType         = type;

        for (var i = 0; i < this.schemeTile.rootCount(); i++)
        {        
            this.createTile(this.schemeTile.getRoot(i),this);            
        }                       
        
        this.interCommand.managerCommands.runAllCommands();
        
        for (var i = 0; i < this.schemeTile.rootCount(); i++)
        {
            this.subdivide(this.children[i]);
            
            this.interCommand.managerCommands.runAllCommands();
            
            this.subdivideChildren(this.children[i]);
        }
    }
    
    Quadtree.prototype = Object.create( Layer.prototype );

    Quadtree.prototype.constructor = Quadtree;
    
    Quadtree.prototype.getMesh = function(){
               
        return this.children;
    };
      
    Quadtree.prototype.northWest = function(node)
    {
        return node.children[0];
    };
    
    Quadtree.prototype.northEast = function(node)
    {
        return node.children[1];
    };
    
    Quadtree.prototype.southWest = function(node)
    {
        return node.children[2];
    };
    
    Quadtree.prototype.southEast = function(node)
    {
        return node.children[3];
    };    
    
    Quadtree.prototype.createTile = function(bbox,parent)
    {
              
        this.interCommand.getTile(bbox,parent);
        
    };    
        
   /**
    * return 4 equals subdivisions of the bouding box
    * @param {type} node
    * @returns {Array} four bounding box
    */
    Quadtree.prototype.subdivide = function(node)
    {
        
        if(!this.update(node))
            return;
        
        node.wait   = true;
        var quad    = new Quad(node.bbox);      
        this.createTile(quad.northWest,node);
        this.createTile(quad.northEast,node);
        this.createTile(quad.southWest,node);
        this.createTile(quad.southEast,node);
                  
    };
    
    
    Quadtree.prototype.update = function(node)
    {
        if(node.level >= 11  || node.wait === true )
            return false;        
        
                     
        if(node.childrenCount() !== 0 && node.wait === false)                
        {
                        
            for (var i = 0 ;i<node.childrenCount();i++)
            {
                
                node.children[i].visible = true;                
            }
            
            node.material.visible   = false;
            
            return false;
        }       
        
        return true;
    };
    
    
    Quadtree.prototype.subdivideChildren = function(node)
    {
        if(node.level === 3)
            return;
        for (var i = 0 ;i<node.children.length;i++)
        {
            this.subdivide(node.children[i]);            
           //this.subdivideChildren(node.children[i]);
        }
    };
    
    return Quadtree;

});