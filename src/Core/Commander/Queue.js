/**
 * Generated On: 2015-10-5
 * Class: Queue
 * Description: Cette classe est une file d'attente.
 */


function Queue(criteria, heapType) {
    this.criteria = criteria;
    this.length = 0;
    this.queue = [];

    this.isMax = !!heapType;
    if (heapType !== 0 && heapType !== 1) {
        console.log(heapType + " not supported.");
    }
    /*
    console.log(this.isMax );
        
    var isMax = false;

    //Constructor
    if (heapType===0) {
        isMax = true;
    } else if (heapType===1) {
        isMax = false;
    } else {
        throw heapType + " not supported.";
    }
        
    console.log(isMax );*/
}

Queue.prototype.insert = function(value) {


    if (!value.hasOwnProperty(this.criteria)) {
        console.log(value);
        console.log("Cannot insert " + value + " because it does not have a property by the name of " + this.criteria + ".");
    }
    this.queue.push(value);
    this.length++;
    this.bubbleUp(this.length - 1);
};

Queue.prototype.getHighestPriorityElement = function() {
    return this.queue[0];
};
Queue.prototype.shiftHighestPriorityElement = function() {
    if (length < 0) {
        console.log("There are no more elements in your priority queue");
    }
    var oldRoot = this.queue[0];
    var newRoot = this.queue.pop();
    this.length--;
    this.queue[0] = newRoot;
    this.swapUntilQueueIsCorrect(0);
    return oldRoot;
};
Queue.prototype.bubbleUp = function(index) {
    if (index === 0) {
        return;
    }
    var parent = this.getParentOf(index);

    if (parent === -1) {
        parent = 0;
        console.log(this.queue);
        console.log("-----");
    }

    if (this.evaluate(index, parent)) {
        this.swap(index, parent);
        this.bubbleUp(parent);
    } else {
        return;
    }
};
Queue.prototype.swapUntilQueueIsCorrect = function(value) {
    var left = this.getLeftOf(value),
        right = this.getRightOf(value);

    if (this.evaluate(left, value)) {
        this.swap(value, left);
        this.swapUntilQueueIsCorrect(left);
    } else if (this.evaluate(right, value)) {
        this.swap(value, right);
        this.swapUntilQueueIsCorrect(right);
    } else if (value === 0) {
        return;
    } else {
        this.swapUntilQueueIsCorrect(0);
    }
};
Queue.prototype.swap = function(self, target) {
    var placeHolder = this.queue[self];
    this.queue[self] = this.queue[target];
    this.queue[target] = placeHolder;
};
Queue.prototype.evaluate = function(self, target) {

    if (this.queue[target] === undefined || this.queue[self] === undefined) {
        return false;
    }
    if (this.isMax) {
        return (this.queue[self][this.criteria] > this.queue[target][this.criteria]);
    } else {
        return (this.queue[self][this.criteria] < this.queue[target][this.criteria]);
    }
};
Queue.prototype.getParentOf = function(index) {
    return Math.floor(index / 2) - 1;
};
Queue.prototype.getLeftOf = function(index) {
    return index * 2 + 1;
};
Queue.prototype.getRightOf = function(index) {
    return index * 2 + 2;
};
Queue.MAX_HEAP = 0;
Queue.MIN_HEAP = 1;

export default Queue;
