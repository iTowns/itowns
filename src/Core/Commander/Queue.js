/**
* Generated On: 2015-10-5
* Class: Queue
* Description: Cette classe est une file d'attente.
*/


define('Core/Commander/Queue',
        [ ], 
        function(){

    function Queue(criteria, heapType) {
        
        this.criteria   = criteria;                
        this.length     = 0;
        this.queue      = [];       
        this.isMax      = !!heapType;
        
        if ( heapType !== 0 && heapType !== 1 ){
            console.log( heapType + " not supported.");
        }        
    }
    
    Queue.prototype.insert = function (value) {
        
        
        if (!value.hasOwnProperty(this.criteria)) {
            console.log(value);
            console.log("Cannot insert " + value + " because it does not have a property by the name of " + this.criteria + ".");
        }
        this.queue.push(value);
        this.length++;
 
    };
 
    Queue.prototype.evaluate = function (self, target) {
                 
        if (this.isMax) {
            return (this.queue[self][this.criteria] > this.queue[target][this.criteria]);
        } else {
            return (this.queue[self][this.criteria] < this.queue[target][this.criteria]);
        }
    };
    
    Queue.prototype.sort = function()
    {
        this.queue = this.queue.sort(function (a, b)
        {
            
            if (a[this.criteria] > b[this.criteria]) {
              return 1;
            }
            if (a[this.criteria] < b[this.criteria]) {
              return -1;
            }
            // a must be equal to b
            return 0;
        }.bind(this));
        
        return this.queue;
                
    };
 
    return Queue;

});



