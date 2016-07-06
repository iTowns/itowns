/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import defaultValue from 'Core/defaultValue';

function Point2D(x, y) {
    //Constructor

    this.x = defaultValue(x, 0);
    this.y = defaultValue(y, 0);

}

export default Point2D;
