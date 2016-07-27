/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


function JavaTools() {
    //Constructor

}

JavaTools.prototype.constructor = JavaTools;

JavaTools.prototype.freeArray = function(sourceArray) {
    var arr = sourceArray.slice();

    while (arr.length > 0) {
        arr.pop();
    }
};

export default JavaTools;
