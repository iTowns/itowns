/*
 * Computer vision and marchine learning tools
 * Quoc-Dinh dot Nguyen at IGN dot com
 */

var CVML = CVML || {
    REVISION: '1.0.0'
};

CVML.epsilon = 2.220446049250313e-16;
//Point

CVML.Point2D = function(x, y) {
    this.x = x;
    this.y = y;
};


var PointError = function(message, points) {
    this.name = "PointError";
    this.points = points = points || [];
    this.message = message || "Invalid Points!";
    for (var i = 0; i < points.length; i++) {
        this.message += " " + Point.toString(points[i]);
    }
};
PointError.prototype = new Error();
PointError.prototype.constructor = PointError;

//-----Point
/**
 * Construct a point
 * @param {Number} x    coordinate (0 if undefined)
 * @param {Number} y    coordinate (0 if undefined)
 */
var Point = function(x, y) {
    this.x = +x || 0;
    this.y = +y || 0;

    // All extra fields added to Point are prefixed with _p2t_
    // to avoid collisions if custom Point class is used.

    // The edges this point constitutes an upper ending point
    this._p2t_edge_list = null;
};

/**
 * For pretty printing ex. "(5;42)"
 */
Point.prototype.toString = function() {
    return ("(" + this.x + ";" + this.y + ")");
};

/**
 * Creates a copy of this Point object.
 * @returns Point
 */
Point.prototype.clone = function() {
    return new Point(this.x, this.y);
};

/**
 * Set this Point instance to the origo. (0; 0)
 */
Point.prototype.set_zero = function() {
    this.x = 0.0;
    this.y = 0.0;
    return this; // for chaining
};

/**
 * Set the coordinates of this instance.
 * @param   x   number.
 * @param   y   number;
 */
Point.prototype.set = function(x, y) {
    this.x = +x || 0;
    this.y = +y || 0;
    return this; // for chaining
};

/**
 * Negate this Point instance. (component-wise)
 */
Point.prototype.negate = function() {
    this.x = -this.x;
    this.y = -this.y;
    return this; // for chaining
};

/**
 * Add another Point object to this instance. (component-wise)
 * @param   n   Point object.
 */
Point.prototype.add = function(n) {
    this.x += n.x;
    this.y += n.y;
    return this; // for chaining
};

/**
 * Subtract this Point instance with another point given. (component-wise)
 * @param   n   Point object.
 */
Point.prototype.sub = function(n) {
    this.x -= n.x;
    this.y -= n.y;
    return this; // for chaining
};

/**
 * Multiply this Point instance by a scalar. (component-wise)
 * @param   s   scalar.
 */
Point.prototype.mul = function(s) {
    this.x *= s;
    this.y *= s;
    return this; // for chaining
};

/**
 * Return the distance of this Point instance from the origo.
 */
Point.prototype.length = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

/**
 * Normalize this Point instance (as a vector).
 * @return The original distance of this instance from the origo.
 */
Point.prototype.normalize = function() {
    var len = this.length();
    this.x /= len;
    this.y /= len;
    return len;
};

/**
 * Test this Point object with another for equality.
 * @param   p   any "Point like" object with {x,y} (duck typing)
 * @return True if this == p, false otherwise.
 */
Point.prototype.equals = function(p) {
    return this.x === p.x && this.y === p.y;
};


/**
 * Negate a point component-wise and return the result as a new Point object.
 * @param   p   Point object.
 * @return the resulting Point object.
 */
Point.negate = function(p) {
    return new Point(-p.x, -p.y);
};

/**
 * Add two points component-wise and return the result as a new Point object.
 * @param   a   Point object.
 * @param   b   Point object.
 * @return the resulting Point object.
 */
Point.add = function(a, b) {
    return new Point(a.x + b.x, a.y + b.y);
};

/**
 * Subtract two points component-wise and return the result as a new Point object.
 * @param   a   Point object.
 * @param   b   Point object.
 * @return the resulting Point object.
 */
Point.sub = function(a, b) {
    return new Point(a.x - b.x, a.y - b.y);
};

/**
 * Multiply a point by a scalar and return the result as a new Point object.
 * @param   s   the scalar (a number).
 * @param   p   Point object.
 * @return the resulting Point object.
 */
Point.mul = function(s, p) {
    return new Point(s * p.x, s * p.y);
};

/**
 * Perform the cross product on either two points (this produces a scalar)
 * or a point and a scalar (this produces a point).
 * This function requires two parameters, either may be a Point object or a
 * number.
 * @param   a   Point object or scalar.
 * @param   b   Point object or scalar.
 * @return  a   Point object or a number, depending on the parameters.
 */
Point.cross = function(a, b) {
    if (typeof(a) === 'number') {
        if (typeof(b) === 'number') {
            return a * b;
        } else {
            return new Point(-a * b.y, a * b.x);
        }
    } else {
        if (typeof(b) === 'number') {
            return new Point(b * a.y, -b * a.x);
        } else {
            return a.x * b.y - a.y * b.x;
        }
    }
};

/**
 * Point pretty printing ex."(5;42)")
 * @param   p   any "Point like" object with {x,y}
 * @returns {String}
 */
Point.toString = function(p) {
    // Try a custom toString first, and fallback to Point.prototype.toString if none
    var s = p.toString();
    return (s === '[object Object]' ? Point.prototype.toString.call(p) : s);
};


Point.compare = function(a, b) {
    if (a.y === b.y) {
        return a.x - b.x;
    } else {
        return a.y - b.y;
    }
};
Point.cmp = Point.compare; // backward compatibility

Point.equals = function(a, b) {
    return a.x === b.x && a.y === b.y;
};

/**
 * Peform the dot product on two vectors.
 * @param   a,b   any "Point like" objects with {x,y}
 * @return The dot product (as a number).
 */
Point.dot = function(a, b) {
    return a.x * b.x + a.y * b.y;
};

Point.prototype.distanceTo = function(v) {
    var dx = this.x - v.x;
    var dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
};

//---------Edge
/**
 * Represents a simple polygon's edge
 * @param {Point} p1
 * @param {Point} p2
 */
var Edge = function(p1, p2) {
    this.p = p1;
    this.q = p2;

    if (p1.y > p2.y) {
        this.q = p1;
        this.p = p2;
    } else if (p1.y === p2.y) {
        if (p1.x > p2.x) {
            this.q = p1;
            this.p = p2;
        } else if (p1.x === p2.x) {
            throw new PointError('Invalid Edge constructor: repeated points!', [p1]);
        }
    }

    if (!this.q._p2t_edge_list) {
        this.q._p2t_edge_list = [];
    }
    this.q._p2t_edge_list.push(this);
};

// -----Triangle
/**
 * Triangle class.
 * Triangle-based data structures are known to have better performance than
 * quad-edge structures.
 * See: J. Shewchuk, "Triangle: Engineering a 2D Quality Mesh Generator and
 * Delaunay Triangulator", "Triangulations in CGAL"
 *
 * @param   a,b,c   any "Point like" objects with {x,y} (duck typing)
 */
var Triangle = function(a, b, c) {
    // Triangle points
    this.points_ = [a, b, c];
    // Neighbor list
    this.neighbors_ = [null, null, null];
    // Has this triangle been marked as an interior triangle?
    this.interior_ = false;
    // Flags to determine if an edge is a Constrained edge
    this.constrained_edge = [false, false, false];
    // Flags to determine if an edge is a Delauney edge
    this.delaunay_edge = [false, false, false];
};


Triangle.prototype.toString = function() {
    var p2s = Point.toString;
    return ("[" + p2s(this.points_[0]) + p2s(this.points_[1]) + p2s(this.points_[2]) + "]");
};

Triangle.prototype.getPoint = function(index) {
    return this.points_[index];
};
// for backward compatibility
Triangle.prototype.GetPoint = Triangle.prototype.getPoint;

Triangle.prototype.getNeighbor = function(index) {
    return this.neighbors_[index];
};


Triangle.prototype.containsPoint = function(point) {
    var points = this.points_;
    // Here we are comparing point references, not values
    return (point === points[0] || point === points[1] || point === points[2]);
};

/**
 * Test if this Triangle contains the Edge object given as parameter as its
 * bounding edges. Only point references are compared, not values.
 * @return True if the Edge object is of the Triangle's bounding
 *         edges, false otherwise.
 */
Triangle.prototype.containsEdge = function(edge) {
    return this.containsPoint(edge.p) && this.containsPoint(edge.q);
};
Triangle.prototype.containsPoints = function(p1, p2) {
    return this.containsPoint(p1) && this.containsPoint(p2);
};


Triangle.prototype.isInterior = function() {
    return this.interior_;
};
Triangle.prototype.setInterior = function(interior) {
    this.interior_ = interior;
    return this;
};

/**
 * Update neighbor pointers.
 * @param {Point} p1 Point object.
 * @param {Point} p2 Point object.
 * @param {Triangle} t Triangle object.
 */
Triangle.prototype.markNeighborPointers = function(p1, p2, t) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if ((p1 === points[2] && p2 === points[1]) || (p1 === points[1] && p2 === points[2])) {
        this.neighbors_[0] = t;
    } else if ((p1 === points[0] && p2 === points[2]) || (p1 === points[2] && p2 === points[0])) {
        this.neighbors_[1] = t;
    } else if ((p1 === points[0] && p2 === points[1]) || (p1 === points[1] && p2 === points[0])) {
        this.neighbors_[2] = t;
    } else {
        throw new Error('Invalid Triangle.markNeighborPointers() call');
    }
};

/**
 * Exhaustive search to update neighbor pointers
 * @param {Triangle} t
 */
Triangle.prototype.markNeighbor = function(t) {
    var points = this.points_;
    if (t.containsPoints(points[1], points[2])) {
        this.neighbors_[0] = t;
        t.markNeighborPointers(points[1], points[2], this);
    } else if (t.containsPoints(points[0], points[2])) {
        this.neighbors_[1] = t;
        t.markNeighborPointers(points[0], points[2], this);
    } else if (t.containsPoints(points[0], points[1])) {
        this.neighbors_[2] = t;
        t.markNeighborPointers(points[0], points[1], this);
    }
};


Triangle.prototype.clearNeigbors = function() {
    this.neighbors_[0] = null;
    this.neighbors_[1] = null;
    this.neighbors_[2] = null;
};

Triangle.prototype.clearDelunayEdges = function() {
    this.delaunay_edge[0] = false;
    this.delaunay_edge[1] = false;
    this.delaunay_edge[2] = false;
};

/**
 * Returns the point clockwise to the given point.
 */
Triangle.prototype.pointCW = function(p) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if (p === points[0]) {
        return points[2];
    } else if (p === points[1]) {
        return points[0];
    } else if (p === points[2]) {
        return points[1];
    } else {
        return null;
    }
};

/**
 * Returns the point counter-clockwise to the given point.
 */
Triangle.prototype.pointCCW = function(p) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if (p === points[0]) {
        return points[1];
    } else if (p === points[1]) {
        return points[2];
    } else if (p === points[2]) {
        return points[0];
    } else {
        return null;
    }
};

/**
 * Returns the neighbor clockwise to given point.
 */
Triangle.prototype.neighborCW = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.neighbors_[1];
    } else if (p === this.points_[1]) {
        return this.neighbors_[2];
    } else {
        return this.neighbors_[0];
    }
};

/**
 * Returns the neighbor counter-clockwise to given point.
 */
Triangle.prototype.neighborCCW = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.neighbors_[2];
    } else if (p === this.points_[1]) {
        return this.neighbors_[0];
    } else {
        return this.neighbors_[1];
    }
};

Triangle.prototype.getConstrainedEdgeCW = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.constrained_edge[1];
    } else if (p === this.points_[1]) {
        return this.constrained_edge[2];
    } else {
        return this.constrained_edge[0];
    }
};

Triangle.prototype.getConstrainedEdgeCCW = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.constrained_edge[2];
    } else if (p === this.points_[1]) {
        return this.constrained_edge[0];
    } else {
        return this.constrained_edge[1];
    }
};

Triangle.prototype.setConstrainedEdgeCW = function(p, ce) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        this.constrained_edge[1] = ce;
    } else if (p === this.points_[1]) {
        this.constrained_edge[2] = ce;
    } else {
        this.constrained_edge[0] = ce;
    }
};

Triangle.prototype.setConstrainedEdgeCCW = function(p, ce) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        this.constrained_edge[2] = ce;
    } else if (p === this.points_[1]) {
        this.constrained_edge[0] = ce;
    } else {
        this.constrained_edge[1] = ce;
    }
};

Triangle.prototype.getDelaunayEdgeCW = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.delaunay_edge[1];
    } else if (p === this.points_[1]) {
        return this.delaunay_edge[2];
    } else {
        return this.delaunay_edge[0];
    }
};

Triangle.prototype.getDelaunayEdgeCCW = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.delaunay_edge[2];
    } else if (p === this.points_[1]) {
        return this.delaunay_edge[0];
    } else {
        return this.delaunay_edge[1];
    }
};

Triangle.prototype.setDelaunayEdgeCW = function(p, e) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        this.delaunay_edge[1] = e;
    } else if (p === this.points_[1]) {
        this.delaunay_edge[2] = e;
    } else {
        this.delaunay_edge[0] = e;
    }
};

Triangle.prototype.setDelaunayEdgeCCW = function(p, e) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        this.delaunay_edge[2] = e;
    } else if (p === this.points_[1]) {
        this.delaunay_edge[0] = e;
    } else {
        this.delaunay_edge[1] = e;
    }
};

/**
 * The neighbor across to given point.
 */
Triangle.prototype.neighborAcross = function(p) {
    // Here we are comparing point references, not values
    if (p === this.points_[0]) {
        return this.neighbors_[0];
    } else if (p === this.points_[1]) {
        return this.neighbors_[1];
    } else {
        return this.neighbors_[2];
    }
};

Triangle.prototype.oppositePoint = function(t, p) {
    var cw = t.pointCW(p);
    return this.pointCW(cw);
};

/**
 * Legalize triangle by rotating clockwise around oPoint
 * @param {Point} opoint
 * @param {Point} npoint
 */
Triangle.prototype.legalize = function(opoint, npoint) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if (opoint === points[0]) {
        points[1] = points[0];
        points[0] = points[2];
        points[2] = npoint;
    } else if (opoint === points[1]) {
        points[2] = points[1];
        points[1] = points[0];
        points[0] = npoint;
    } else if (opoint === points[2]) {
        points[0] = points[2];
        points[2] = points[1];
        points[1] = npoint;
    } else {
        throw new Error('Invalid Triangle.legalize() call');
    }
};

/**
 * Returns the index of a point in the triangle.
 * The point *must* be a reference to one of the triangle's vertices.
 * @param {Point} p Point object
 * @returns {Number} index 0, 1 or 2
 */
Triangle.prototype.index = function(p) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if (p === points[0]) {
        return 0;
    } else if (p === points[1]) {
        return 1;
    } else if (p === points[2]) {
        return 2;
    } else {
        throw new Error('Invalid Triangle.index() call');
    }
};

Triangle.prototype.edgeIndex = function(p1, p2) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if (p1 === points[0]) {
        if (p2 === points[1]) {
            return 2;
        } else if (p2 === points[2]) {
            return 1;
        }
    } else if (p1 === points[1]) {
        if (p2 === points[2]) {
            return 0;
        } else if (p2 === points[0]) {
            return 2;
        }
    } else if (p1 === points[2]) {
        if (p2 === points[0]) {
            return 1;
        } else if (p2 === points[1]) {
            return 0;
        }
    }
    return -1;
};

/**
 * Mark an edge of this triangle as constrained
 * This method takes either 1 parameter (an edge index or an Edge instance) or
 * 2 parameters (two Point instances defining the edge of the triangle).
 */
Triangle.prototype.markConstrainedEdgeByIndex = function(index) {
    this.constrained_edge[index] = true;
};
Triangle.prototype.markConstrainedEdgeByEdge = function(edge) {
    this.markConstrainedEdgeByPoints(edge.p, edge.q);
};
Triangle.prototype.markConstrainedEdgeByPoints = function(p, q) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if ((q === points[0] && p === points[1]) || (q === points[1] && p === points[0])) {
        this.constrained_edge[2] = true;
    } else if ((q === points[0] && p === points[2]) || (q === points[2] && p === points[0])) {
        this.constrained_edge[1] = true;
    } else if ((q === points[1] && p === points[2]) || (q === points[2] && p === points[1])) {
        this.constrained_edge[0] = true;
    }
};

// ------utils
var PI_3div4 = 3 * Math.PI / 4;
var PI_2 = Math.PI / 2;
var EPSILON = 1e-15;

/*
 * Inital triangle factor, seed triangle will extend 30% of
 * PointSet width to both left and right.
 */
var kAlpha = 0.3;

var Orientation = {
    "CW": 1,
    "CCW": -1,
    "COLLINEAR": 0
};

function orient2d(pa, pb, pc) {
    var detleft = (pa.x - pc.x) * (pb.y - pc.y);
    var detright = (pa.y - pc.y) * (pb.x - pc.x);
    var val = detleft - detright;
    if (val > -(EPSILON) && val < (EPSILON)) {
        return Orientation.COLLINEAR;
    } else if (val > 0) {
        return Orientation.CCW;
    } else {
        return Orientation.CW;
    }
}

function inScanArea(pa, pb, pc, pd) {
    var pdx = pd.x;
    var pdy = pd.y;
    var adx = pa.x - pdx;
    var ady = pa.y - pdy;
    var bdx = pb.x - pdx;
    var bdy = pb.y - pdy;

    var adxbdy = adx * bdy;
    var bdxady = bdx * ady;
    var oabd = adxbdy - bdxady;

    if (oabd <= (EPSILON)) {
        return false;
    }

    var cdx = pc.x - pdx;
    var cdy = pc.y - pdy;

    var cdxady = cdx * ady;
    var adxcdy = adx * cdy;
    var ocad = cdxady - adxcdy;

    if (ocad <= (EPSILON)) {
        return false;
    }

    return true;
}

var Node = function(p, t) {
    this.point = p;
    this.triangle = t || null;

    this.next = null; // Node
    this.prev = null; // Node

    this.value = p.x;
};

var AdvancingFront = function(head, tail) {
    this.head_ = head; // Node
    this.tail_ = tail; // Node
    this.search_node_ = head; // Node
};

AdvancingFront.prototype.head = function() {
    return this.head_;
};

AdvancingFront.prototype.setHead = function(node) {
    this.head_ = node;
};

AdvancingFront.prototype.tail = function() {
    return this.tail_;
};

AdvancingFront.prototype.setTail = function(node) {
    this.tail_ = node;
};

AdvancingFront.prototype.search = function() {
    return this.search_node_;
};

AdvancingFront.prototype.setSearch = function(node) {
    this.search_node_ = node;
};

AdvancingFront.prototype.findSearchNode = function( /*x*/ ) {
    // TODO: implement BST index
    return this.search_node_;
};

AdvancingFront.prototype.locateNode = function(x) {
    var node = this.search_node_;

    /* jshint boss:true */
    if (x < node.value) {
        while ((node = node.prev) !== null) {
            if (x >= node.value) {
                this.search_node_ = node;
                return node;
            }
        }
    } else {
        while ((node = node.next) != null) {
            if (x < node.value) {
                this.search_node_ = node.prev;
                return node.prev;
            }
        }
    }
    return null;
};

AdvancingFront.prototype.locatePoint = function(point) {
    var px = point.x;
    var node = this.findSearchNode(px);
    var nx = node.point.x;

    if (px === nx) {
        // Here we are comparing point references, not values
        if (point !== node.point) {
            // We might have two nodes with same x value for a short time
            if (point === node.prev.point) {
                node = node.prev;
            } else if (point === node.next.point) {
                node = node.next;
            } else {
                throw new Error('Invalid AdvancingFront.locatePoint() call');
            }
        }
    } else if (px < nx) {
        /* jshint boss:true */
        while ((node = node.prev) !== null) {
            if (point === node.point) {
                break;
            }
        }
    } else {
        while ((node = node.next) !== null) {
            if (point === node.point) {
                break;
            }
        }
    }

    if (node) {
        this.search_node_ = node;
    }
    return node;
};

//----------Basin
var Basin = function() {
    this.left_node = null; // Node
    this.bottom_node = null; // Node
    this.right_node = null; // Node
    this.width = 0.0; // number
    this.left_highest = false;
};

Basin.prototype.clear = function() {
    this.left_node = null;
    this.bottom_node = null;
    this.right_node = null;
    this.width = 0.0;
    this.left_highest = false;
};

//----------EdgeEvent
var EdgeEvent = function() {
    this.constrained_edge = null; // Edge
    this.right = false;
};


/**
 * Constructor for the triangulation context.
 * It accepts a simple polyline, which defines the constrained edges.
 * Possible options are:
 *    cloneArrays:  if true, do a shallow copy of the Array parameters
 *                  (contour, holes). Points inside arrays are never copied.
 *                  Default is false : keep a reference to the array arguments,
 *                  who will be modified in place.
 * @param {Array} contour  array of "Point like" objects with {x,y} (duck typing)
 * @param {Object} options  constructor options
 */
var SweepContext = function(contour, options) {
    options = options || {};
    this.triangles_ = [];
    this.map_ = [];
    this.points_ = (options.cloneArrays ? contour.slice(0) : contour);
    this.edge_list = [];

    // Bounding box of all points. Computed at the start of the triangulation,
    // it is stored in case it is needed by the caller.
    this.pmin_ = this.pmax_ = null;

    // Advancing front
    this.front_ = null; // AdvancingFront
    // head point used with advancing front
    this.head_ = null; // Point
    // tail point used with advancing front
    this.tail_ = null; // Point

    this.af_head_ = null; // Node
    this.af_middle_ = null; // Node
    this.af_tail_ = null; // Node

    this.basin = new Basin();
    this.edge_event = new EdgeEvent();

    this.initEdges(this.points_);


};


/**
 * Add a hole to the constraints
 * @param {Array} polyline  array of "Point like" objects with {x,y} (duck typing)
 */
SweepContext.prototype.addHole = function(polyline) {
    this.initEdges(polyline);
    var i, len = polyline.length;
    for (i = 0; i < len; i++) {
        this.points_.push(polyline[i]);
    }
    return this; // for chaining
};
// Backward compatibility
SweepContext.prototype.AddHole = SweepContext.prototype.addHole;


/**
 * Add a Steiner point to the constraints
 * @param {Point} point     any "Point like" object with {x,y} (duck typing)
 */
SweepContext.prototype.addPoint = function(point) {
    this.points_.push(point);
    return this; // for chaining
};
// Backward compatibility
SweepContext.prototype.AddPoint = SweepContext.prototype.addPoint;


SweepContext.prototype.addPoints = function(points) {
    this.points_ = this.points_.concat(points);
    return this; // for chaining
};

SweepContext.prototype.triangulate = function() {
    Sweep.triangulate(this);
    return this; // for chaining
};

SweepContext.prototype.getBoundingBox = function() {
    return {
        min: this.pmin_,
        max: this.pmax_
    };
};

SweepContext.prototype.getTriangles = function() {
    return this.triangles_;
};
// Backward compatibility
SweepContext.prototype.GetTriangles = SweepContext.prototype.getTriangles;


SweepContext.prototype.front = function() {
    return this.front_;
};

SweepContext.prototype.pointCount = function() {
    return this.points_.length;
};

SweepContext.prototype.head = function() {
    return this.head_;
};

SweepContext.prototype.setHead = function(p1) {
    this.head_ = p1;
};

SweepContext.prototype.tail = function() {
    return this.tail_;
};

SweepContext.prototype.setTail = function(p1) {
    this.tail_ = p1;
};

SweepContext.prototype.getMap = function() {
    return this.map_;
};

SweepContext.prototype.initTriangulation = function() {
    var xmax = this.points_[0].x;
    var xmin = this.points_[0].x;
    var ymax = this.points_[0].y;
    var ymin = this.points_[0].y;

    // Calculate bounds
    var i, len = this.points_.length;
    for (i = 1; i < len; i++) {
        var p = this.points_[i];
        /* jshint expr:true */
        (p.x > xmax) && (xmax = p.x);
        (p.x < xmin) && (xmin = p.x);
        (p.y > ymax) && (ymax = p.y);
        (p.y < ymin) && (ymin = p.y);
    }
    this.pmin_ = new Point(xmin, ymin);
    this.pmax_ = new Point(xmax, ymax);

    var dx = kAlpha * (xmax - xmin);
    var dy = kAlpha * (ymax - ymin);
    this.head_ = new Point(xmax + dx, ymin - dy);
    this.tail_ = new Point(xmin - dx, ymin - dy);

    // Sort points along y-axis
    this.points_.sort(Point.compare);
};

SweepContext.prototype.initEdges = function(polyline) {
    var i, len = polyline.length;
    for (i = 0; i < len; ++i) {
        this.edge_list.push(new Edge(polyline[i], polyline[(i + 1) % len]));
    }
};

SweepContext.prototype.getPoint = function(index) {
    return this.points_[index];
};

SweepContext.prototype.addToMap = function(triangle) {
    this.map_.push(triangle);
};

SweepContext.prototype.locateNode = function(point) {
    return this.front_.locateNode(point.x);
};

SweepContext.prototype.createAdvancingFront = function() {
    var head;
    var middle;
    var tail;
    // Initial triangle
    var triangle = new Triangle(this.points_[0], this.tail_, this.head_);

    this.map_.push(triangle);

    head = new Node(triangle.getPoint(1), triangle);
    middle = new Node(triangle.getPoint(0), triangle);
    tail = new Node(triangle.getPoint(2));

    this.front_ = new AdvancingFront(head, tail);

    head.next = middle;
    middle.next = tail;
    middle.prev = head;
    tail.prev = middle;
};

SweepContext.prototype.removeNode = function( /*node*/ ) {
    // do nothing
    /* jshint unused:false */
};

SweepContext.prototype.mapTriangleToNodes = function(t) {
    for (var i = 0; i < 3; ++i) {
        if (!t.getNeighbor(i)) {
            var n = this.front_.locatePoint(t.pointCW(t.getPoint(i)));
            if (n) {
                n.triangle = t;
            }
        }
    }
};

SweepContext.prototype.removeFromMap = function(triangle) {
    var i, map = this.map_,
        len = map.length;
    for (i = 0; i < len; i++) {
        if (map[i] === triangle) {
            map.splice(i, 1);
            break;
        }
    }
};

SweepContext.prototype.meshClean = function(triangle) {
    // New implementation avoids recursive calls and use a loop instead.
    // Cf. issues # 57, 65 and 69.
    var triangles = [triangle],
        t, i;
    /* jshint boss:true */

    t = triangles.pop()
    while (t) {
        if (!t.isInterior()) {
            t.setInterior(true);
            this.triangles_.push(t);
            for (i = 0; i < 3; i++) {
                if (!t.constrained_edge[i]) {
                    triangles.push(t.getNeighbor(i));
                }
            }
        }
        t = triangles.pop();
    }
};

var Sweep = {};

Sweep.triangulate = function(tcx) {
    tcx.initTriangulation();
    tcx.createAdvancingFront();
    // Sweep points; build mesh
    Sweep.sweepPoints(tcx);
    // Clean up
    Sweep.finalizationPolygon(tcx);
};

Sweep.sweepPoints = function(tcx) {
    var i, len = tcx.pointCount();
    for (i = 1; i < len; ++i) {
        var point = tcx.getPoint(i);
        var node = Sweep.pointEvent(tcx, point);
        var edges = point._p2t_edge_list;
        for (var j = 0; edges && j < edges.length; ++j) {
            Sweep.edgeEventByEdge(tcx, edges[j], node);
        }
    }
};

Sweep.finalizationPolygon = function(tcx) {
    // Get an Internal triangle to start with
    var t = tcx.front().head().next.triangle;
    var p = tcx.front().head().next.point;
    while (!t.getConstrainedEdgeCW(p)) {
        t = t.neighborCCW(p);
    }

    // Collect interior triangles constrained by edges
    tcx.meshClean(t);
};

Sweep.pointEvent = function(tcx, point) {
    var node = tcx.locateNode(point);
    var new_node = Sweep.newFrontTriangle(tcx, point, node);

    // Only need to check +epsilon since point never have smaller
    // x value than node due to how we fetch nodes from the front
    if (point.x <= node.point.x + (EPSILON)) {
        Sweep.fill(tcx, node);
    }

    //tcx.AddNode(new_node);

    Sweep.fillAdvancingFront(tcx, new_node);
    return new_node;
};

Sweep.edgeEventByEdge = function(tcx, edge, node) {
    tcx.edge_event.constrained_edge = edge;
    tcx.edge_event.right = (edge.p.x > edge.q.x);

    if (Sweep.isEdgeSideOfTriangle(node.triangle, edge.p, edge.q)) {
        return;
    }

    // For now we will do all needed filling
    // TODO: integrate with flip process might give some better performance
    //       but for now this avoid the issue with cases that needs both flips and fills
    Sweep.fillEdgeEvent(tcx, edge, node);
    Sweep.edgeEventByPoints(tcx, edge.p, edge.q, node.triangle, edge.q);
};

Sweep.edgeEventByPoints = function(tcx, ep, eq, triangle, point) {
    if (Sweep.isEdgeSideOfTriangle(triangle, ep, eq)) {
        return;
    }

    var p1 = triangle.pointCCW(point);
    var o1 = orient2d(eq, p1, ep);
    if (o1 === Orientation.COLLINEAR) {
        // TODO integrate here changes from C++ version
        throw new PointError('EdgeEvent: Collinear not supported!', [eq, p1, ep]);
    }

    var p2 = triangle.pointCW(point);
    var o2 = orient2d(eq, p2, ep);
    if (o2 === Orientation.COLLINEAR) {
        // TODO integrate here changes from C++ version
        throw new PointError('EdgeEvent: Collinear not supported!', [eq, p2, ep]);
    }

    if (o1 === o2) {
        // Need to decide if we are rotating CW or CCW to get to a triangle
        // that will cross edge
        if (o1 === Orientation.CW) {
            triangle = triangle.neighborCCW(point);
        } else {
            triangle = triangle.neighborCW(point);
        }
        Sweep.edgeEventByPoints(tcx, ep, eq, triangle, point);
    } else {
        // This triangle crosses constraint so lets flippin start!
        Sweep.flipEdgeEvent(tcx, ep, eq, triangle, point);
    }
};

Sweep.isEdgeSideOfTriangle = function(triangle, ep, eq) {
    var index = triangle.edgeIndex(ep, eq);
    if (index !== -1) {
        triangle.markConstrainedEdgeByIndex(index);
        var t = triangle.getNeighbor(index);
        if (t) {
            t.markConstrainedEdgeByPoints(ep, eq);
        }
        return true;
    }
    return false;
};

Sweep.newFrontTriangle = function(tcx, point, node) {
    var triangle = new Triangle(point, node.point, node.next.point);

    triangle.markNeighbor(node.triangle);
    tcx.addToMap(triangle);

    var new_node = new Node(point);
    new_node.next = node.next;
    new_node.prev = node;
    node.next.prev = new_node;
    node.next = new_node;

    if (!Sweep.legalize(tcx, triangle)) {
        tcx.mapTriangleToNodes(triangle);
    }

    return new_node;
};

Sweep.fill = function(tcx, node) {
    var triangle = new Triangle(node.prev.point, node.point, node.next.point);

    // TODO: should copy the constrained_edge value from neighbor triangles
    //       for now constrained_edge values are copied during the legalize
    triangle.markNeighbor(node.prev.triangle);
    triangle.markNeighbor(node.triangle);

    tcx.addToMap(triangle);

    // Update the advancing front
    node.prev.next = node.next;
    node.next.prev = node.prev;


    // If it was legalized the triangle has already been mapped
    if (!Sweep.legalize(tcx, triangle)) {
        tcx.mapTriangleToNodes(triangle);
    }

    //tcx.removeNode(node);
};


Sweep.fillAdvancingFront = function(tcx, n) {
    // Fill right holes
    var node = n.next;
    var angle;
    while (node.next) {
        angle = Sweep.holeAngle(node);
        if (angle > PI_2 || angle < -(PI_2)) {
            break;
        }
        Sweep.fill(tcx, node);
        node = node.next;
    }

    // Fill left holes
    node = n.prev;
    while (node.prev) {
        angle = Sweep.holeAngle(node);
        if (angle > PI_2 || angle < -(PI_2)) {
            break;
        }
        Sweep.fill(tcx, node);
        node = node.prev;
    }

    // Fill right basins
    if (n.next && n.next.next) {
        angle = Sweep.basinAngle(n);
        if (angle < PI_3div4) {
            Sweep.fillBasin(tcx, n);
        }
    }
};

Sweep.basinAngle = function(node) {
    var ax = node.point.x - node.next.next.point.x;
    var ay = node.point.y - node.next.next.point.y;
    return Math.atan2(ay, ax);
};

/**
 *
 * @param node - middle node
 * @return the angle between 3 front nodes
 */
Sweep.holeAngle = function(node) {
    /* Complex plane
     * ab = cosA +i*sinA
     * ab = (ax + ay*i)(bx + by*i) = (ax*bx + ay*by) + i(ax*by-ay*bx)
     * atan2(y,x) computes the principal value of the argument function
     * applied to the complex number x+iy
     * Where x = ax*bx + ay*by
     *       y = ax*by - ay*bx
     */
    var ax = node.next.point.x - node.point.x;
    var ay = node.next.point.y - node.point.y;
    var bx = node.prev.point.x - node.point.x;
    var by = node.prev.point.y - node.point.y;
    return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
};

/**
 * Returns true if triangle was legalized
 */
Sweep.legalize = function(tcx, t) {
    // To legalize a triangle we start by finding if any of the three edges
    // violate the Delaunay condition
    for (var i = 0; i < 3; ++i) {
        if (t.delaunay_edge[i]) {
            continue;
        }
        var ot = t.getNeighbor(i);
        if (ot) {
            var p = t.getPoint(i);
            var op = ot.oppositePoint(t, p);
            var oi = ot.index(op);

            // If this is a Constrained Edge or a Delaunay Edge(only during recursive legalization)
            // then we should not try to legalize
            if (ot.constrained_edge[oi] || ot.delaunay_edge[oi]) {
                t.constrained_edge[i] = ot.constrained_edge[oi];
                continue;
            }

            var inside = Sweep.inCircle(p, t.pointCCW(p), t.pointCW(p), op);
            if (inside) {
                // Lets mark this shared edge as Delaunay
                t.delaunay_edge[i] = true;
                ot.delaunay_edge[oi] = true;

                // Lets rotate shared edge one vertex CW to legalize it
                Sweep.rotateTrianglePair(t, p, ot, op);

                // We now got one valid Delaunay Edge shared by two triangles
                // This gives us 4 new edges to check for Delaunay

                // Make sure that triangle to node mapping is done only one time for a specific triangle
                var not_legalized = !Sweep.legalize(tcx, t);
                if (not_legalized) {
                    tcx.mapTriangleToNodes(t);
                }

                not_legalized = !Sweep.legalize(tcx, ot);
                if (not_legalized) {
                    tcx.mapTriangleToNodes(ot);
                }
                // Reset the Delaunay edges, since they only are valid Delaunay edges
                // until we add a new triangle or point.
                // XXX: need to think about this. Can these edges be tried after we
                //      return to previous recursive level?
                t.delaunay_edge[i] = false;
                ot.delaunay_edge[oi] = false;

                // If triangle have been legalized no need to check the other edges since
                // the recursive legalization will handles those so we can end here.
                return true;
            }
        }
    }
    return false;
};

Sweep.inCircle = function(pa, pb, pc, pd) {
    var adx = pa.x - pd.x;
    var ady = pa.y - pd.y;
    var bdx = pb.x - pd.x;
    var bdy = pb.y - pd.y;

    var adxbdy = adx * bdy;
    var bdxady = bdx * ady;
    var oabd = adxbdy - bdxady;
    if (oabd <= 0) {
        return false;
    }

    var cdx = pc.x - pd.x;
    var cdy = pc.y - pd.y;

    var cdxady = cdx * ady;
    var adxcdy = adx * cdy;
    var ocad = cdxady - adxcdy;
    if (ocad <= 0) {
        return false;
    }

    var bdxcdy = bdx * cdy;
    var cdxbdy = cdx * bdy;

    var alift = adx * adx + ady * ady;
    var blift = bdx * bdx + bdy * bdy;
    var clift = cdx * cdx + cdy * cdy;

    var det = alift * (bdxcdy - cdxbdy) + blift * ocad + clift * oabd;
    return det > 0;
};

Sweep.rotateTrianglePair = function(t, p, ot, op) {
    var n1, n2, n3, n4;
    n1 = t.neighborCCW(p);
    n2 = t.neighborCW(p);
    n3 = ot.neighborCCW(op);
    n4 = ot.neighborCW(op);

    var ce1, ce2, ce3, ce4;
    ce1 = t.getConstrainedEdgeCCW(p);
    ce2 = t.getConstrainedEdgeCW(p);
    ce3 = ot.getConstrainedEdgeCCW(op);
    ce4 = ot.getConstrainedEdgeCW(op);

    var de1, de2, de3, de4;
    de1 = t.getDelaunayEdgeCCW(p);
    de2 = t.getDelaunayEdgeCW(p);
    de3 = ot.getDelaunayEdgeCCW(op);
    de4 = ot.getDelaunayEdgeCW(op);

    t.legalize(p, op);
    ot.legalize(op, p);

    // Remap delaunay_edge
    ot.setDelaunayEdgeCCW(p, de1);
    t.setDelaunayEdgeCW(p, de2);
    t.setDelaunayEdgeCCW(op, de3);
    ot.setDelaunayEdgeCW(op, de4);

    // Remap constrained_edge
    ot.setConstrainedEdgeCCW(p, ce1);
    t.setConstrainedEdgeCW(p, ce2);
    t.setConstrainedEdgeCCW(op, ce3);
    ot.setConstrainedEdgeCW(op, ce4);

    // Remap neighbors
    // XXX: might optimize the markNeighbor by keeping track of
    //      what side should be assigned to what neighbor after the
    //      rotation. Now mark neighbor does lots of testing to find
    //      the right side.
    t.clearNeigbors();
    ot.clearNeigbors();
    if (n1) {
        ot.markNeighbor(n1);
    }
    if (n2) {
        t.markNeighbor(n2);
    }
    if (n3) {
        t.markNeighbor(n3);
    }
    if (n4) {
        ot.markNeighbor(n4);
    }
    t.markNeighbor(ot);
};

Sweep.fillBasin = function(tcx, node) {
    if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
        tcx.basin.left_node = node.next.next;
    } else {
        tcx.basin.left_node = node.next;
    }

    // Find the bottom and right node
    tcx.basin.bottom_node = tcx.basin.left_node;
    while (tcx.basin.bottom_node.next && tcx.basin.bottom_node.point.y >= tcx.basin.bottom_node.next.point.y) {
        tcx.basin.bottom_node = tcx.basin.bottom_node.next;
    }
    if (tcx.basin.bottom_node === tcx.basin.left_node) {
        // No valid basin
        return;
    }

    tcx.basin.right_node = tcx.basin.bottom_node;
    while (tcx.basin.right_node.next && tcx.basin.right_node.point.y < tcx.basin.right_node.next.point.y) {
        tcx.basin.right_node = tcx.basin.right_node.next;
    }
    if (tcx.basin.right_node === tcx.basin.bottom_node) {
        // No valid basins
        return;
    }

    tcx.basin.width = tcx.basin.right_node.point.x - tcx.basin.left_node.point.x;
    tcx.basin.left_highest = tcx.basin.left_node.point.y > tcx.basin.right_node.point.y;

    Sweep.fillBasinReq(tcx, tcx.basin.bottom_node);
};

/**
 * Recursive algorithm to fill a Basin with triangles
 *
 * @param tcx
 * @param node - bottom_node
 */
Sweep.fillBasinReq = function(tcx, node) {
    // if shallow stop filling
    if (Sweep.isShallow(tcx, node)) {
        return;
    }

    Sweep.fill(tcx, node);

    var o;
    if (node.prev === tcx.basin.left_node && node.next === tcx.basin.right_node) {
        return;
    } else if (node.prev === tcx.basin.left_node) {
        o = orient2d(node.point, node.next.point, node.next.next.point);
        if (o === Orientation.CW) {
            return;
        }
        node = node.next;
    } else if (node.next === tcx.basin.right_node) {
        o = orient2d(node.point, node.prev.point, node.prev.prev.point);
        if (o === Orientation.CCW) {
            return;
        }
        node = node.prev;
    } else {
        // Continue with the neighbor node with lowest Y value
        if (node.prev.point.y < node.next.point.y) {
            node = node.prev;
        } else {
            node = node.next;
        }
    }

    Sweep.fillBasinReq(tcx, node);
};

Sweep.isShallow = function(tcx, node) {
    var height;
    if (tcx.basin.left_highest) {
        height = tcx.basin.left_node.point.y - node.point.y;
    } else {
        height = tcx.basin.right_node.point.y - node.point.y;
    }

    // if shallow stop filling
    if (tcx.basin.width > height) {
        return true;
    }
    return false;
};

Sweep.fillEdgeEvent = function(tcx, edge, node) {
    if (tcx.edge_event.right) {
        Sweep.fillRightAboveEdgeEvent(tcx, edge, node);
    } else {
        Sweep.fillLeftAboveEdgeEvent(tcx, edge, node);
    }
};

Sweep.fillRightAboveEdgeEvent = function(tcx, edge, node) {
    while (node.next.point.x < edge.p.x) {
        // Check if next node is below the edge
        if (orient2d(edge.q, node.next.point, edge.p) === Orientation.CCW) {
            Sweep.fillRightBelowEdgeEvent(tcx, edge, node);
        } else {
            node = node.next;
        }
    }
};

Sweep.fillRightBelowEdgeEvent = function(tcx, edge, node) {
    if (node.point.x < edge.p.x) {
        if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
            // Concave
            Sweep.fillRightConcaveEdgeEvent(tcx, edge, node);
        } else {
            // Convex
            Sweep.fillRightConvexEdgeEvent(tcx, edge, node);
            // Retry this one
            Sweep.fillRightBelowEdgeEvent(tcx, edge, node);
        }
    }
};

Sweep.fillRightConcaveEdgeEvent = function(tcx, edge, node) {
    Sweep.fill(tcx, node.next);
    if (node.next.point !== edge.p) {
        // Next above or below edge?
        if (orient2d(edge.q, node.next.point, edge.p) === Orientation.CCW) {
            // Below
            if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
                // Next is concave
                Sweep.fillRightConcaveEdgeEvent(tcx, edge, node);
            } else {
                // Next is convex
                /* jshint noempty:false */
            }
        }
    }
};

Sweep.fillRightConvexEdgeEvent = function(tcx, edge, node) {
    // Next concave or convex?
    if (orient2d(node.next.point, node.next.next.point, node.next.next.next.point) === Orientation.CCW) {
        // Concave
        Sweep.fillRightConcaveEdgeEvent(tcx, edge, node.next);
    } else {
        // Convex
        // Next above or below edge?
        if (orient2d(edge.q, node.next.next.point, edge.p) === Orientation.CCW) {
            // Below
            Sweep.fillRightConvexEdgeEvent(tcx, edge, node.next);
        } else {
            // Above
            /* jshint noempty:false */
        }
    }
};

Sweep.fillLeftAboveEdgeEvent = function(tcx, edge, node) {
    while (node.prev.point.x > edge.p.x) {
        // Check if next node is below the edge
        if (orient2d(edge.q, node.prev.point, edge.p) === Orientation.CW) {
            Sweep.fillLeftBelowEdgeEvent(tcx, edge, node);
        } else {
            node = node.prev;
        }
    }
};

Sweep.fillLeftBelowEdgeEvent = function(tcx, edge, node) {
    if (node.point.x > edge.p.x) {
        if (orient2d(node.point, node.prev.point, node.prev.prev.point) === Orientation.CW) {
            // Concave
            Sweep.fillLeftConcaveEdgeEvent(tcx, edge, node);
        } else {
            // Convex
            Sweep.fillLeftConvexEdgeEvent(tcx, edge, node);
            // Retry this one
            Sweep.fillLeftBelowEdgeEvent(tcx, edge, node);
        }
    }
};

Sweep.fillLeftConvexEdgeEvent = function(tcx, edge, node) {
    // Next concave or convex?
    if (orient2d(node.prev.point, node.prev.prev.point, node.prev.prev.prev.point) === Orientation.CW) {
        // Concave
        Sweep.fillLeftConcaveEdgeEvent(tcx, edge, node.prev);
    } else {
        // Convex
        // Next above or below edge?
        if (orient2d(edge.q, node.prev.prev.point, edge.p) === Orientation.CW) {
            // Below
            Sweep.fillLeftConvexEdgeEvent(tcx, edge, node.prev);
        } else {
            // Above
            /* jshint noempty:false */
        }
    }
};

Sweep.fillLeftConcaveEdgeEvent = function(tcx, edge, node) {
    Sweep.fill(tcx, node.prev);
    if (node.prev.point !== edge.p) {
        // Next above or below edge?
        if (orient2d(edge.q, node.prev.point, edge.p) === Orientation.CW) {
            // Below
            if (orient2d(node.point, node.prev.point, node.prev.prev.point) === Orientation.CW) {
                // Next is concave
                Sweep.fillLeftConcaveEdgeEvent(tcx, edge, node);
            } else {
                // Next is convex
                /* jshint noempty:false */
            }
        }
    }
};

Sweep.flipEdgeEvent = function(tcx, ep, eq, t, p) {
    var ot = t.neighborAcross(p);
    if (!ot) {
        // If we want to integrate the fillEdgeEvent do it here
        // With current implementation we should never get here
        throw new Error('[BUG:FIXME] FLIP failed due to missing triangle!');
    }
    var op = ot.oppositePoint(t, p);

    if (inScanArea(p, t.pointCCW(p), t.pointCW(p), op)) {
        // Lets rotate shared edge one vertex CW
        Sweep.rotateTrianglePair(t, p, ot, op);
        tcx.mapTriangleToNodes(t);
        tcx.mapTriangleToNodes(ot);

        // XXX: in the original C++ code for the next 2 lines, we are
        // comparing point values (and not pointers). In this JavaScript
        // code, we are comparing point references (pointers). This works
        // because we can't have 2 different points with the same values.
        // But to be really equivalent, we should use "Point.equals" here.
        if (p === eq && op === ep) {
            if (eq === tcx.edge_event.constrained_edge.q && ep === tcx.edge_event.constrained_edge.p) {
                t.markConstrainedEdgeByPoints(ep, eq);
                ot.markConstrainedEdgeByPoints(ep, eq);
                Sweep.legalize(tcx, t);
                Sweep.legalize(tcx, ot);
            } else {
                // XXX: I think one of the triangles should be legalized here?
                /* jshint noempty:false */
            }
        } else {
            var o = orient2d(eq, op, ep);
            t = Sweep.nextFlipTriangle(tcx, o, t, ot, p, op);
            Sweep.flipEdgeEvent(tcx, ep, eq, t, p);
        }
    } else {
        var newP = Sweep.nextFlipPoint(ep, eq, ot, op);
        Sweep.flipScanEdgeEvent(tcx, ep, eq, t, ot, newP);
        Sweep.edgeEventByPoints(tcx, ep, eq, t, p);
    }
};

Sweep.nextFlipTriangle = function(tcx, o, t, ot, p, op) {
    var edge_index;
    if (o === Orientation.CCW) {
        // ot is not crossing edge after flip
        edge_index = ot.edgeIndex(p, op);
        ot.delaunay_edge[edge_index] = true;
        Sweep.legalize(tcx, ot);
        ot.clearDelunayEdges();
        return t;
    }

    // t is not crossing edge after flip
    edge_index = t.edgeIndex(p, op);

    t.delaunay_edge[edge_index] = true;
    Sweep.legalize(tcx, t);
    t.clearDelunayEdges();
    return ot;
};

Sweep.nextFlipPoint = function(ep, eq, ot, op) {
    var o2d = orient2d(eq, op, ep);
    if (o2d === Orientation.CW) {
        // Right
        return ot.pointCCW(op);
    } else if (o2d === Orientation.CCW) {
        // Left
        return ot.pointCW(op);
    } else {
        throw new PointError("[Unsupported] nextFlipPoint: opposing point on constrained edge!", [eq, op, ep]);
    }
};

Sweep.flipScanEdgeEvent = function(tcx, ep, eq, flip_triangle, t, p) {
    var ot = t.neighborAcross(p);
    if (!ot) {
        // If we want to integrate the fillEdgeEvent do it here
        // With current implementation we should never get here
        throw new Error('[BUG:FIXME] FLIP failed due to missing triangle');
    }
    var op = ot.oppositePoint(t, p);

    if (inScanArea(eq, flip_triangle.pointCCW(eq), flip_triangle.pointCW(eq), op)) {
        // flip with new edge op.eq
        Sweep.flipEdgeEvent(tcx, eq, op, ot, op);
        // TODO: Actually I just figured out that it should be possible to
        //       improve this by getting the next ot and op before the the above
        //       flip and continue the flipScanEdgeEvent here
        // set new ot and op here and loop back to inScanArea test
        // also need to set a new flip_triangle first
        // Turns out at first glance that this is somewhat complicated
        // so it will have to wait.
    } else {
        var newP = Sweep.nextFlipPoint(ep, eq, ot, op);
        Sweep.flipScanEdgeEvent(tcx, ep, eq, flip_triangle, ot, newP);
    }
};

var Delaunay = {

    _PointError: PointError,
    _Point: Point,
    _Triangle: Triangle,
    _SweepContext: SweepContext,

    // Backward compatibility
    _triangulate: Sweep.triangulate,
    _sweep: {
        Triangulate: Sweep.triangulate
    }

};

CVML.newPoint = function(x, y) {
    return new Delaunay._Point(x, y);
};

CVML.TriangulatePoly = function(arr) {
    var swctx = new Delaunay._SweepContext(arr);
    swctx.triangulate();
    return swctx.getTriangles();
};

CVML.initSweepContext = function(arr) {
    return new Delaunay._SweepContext(arr);
};

//Line
CVML.Line = function(a, b) { //y = ax + b
    this.a = a;
    this.b = b;
};

CVML.Line.prototype.copy = function(line) {
    this.a = line.a;
    this.b = line.b;
};


CVML.RobustLineFitting = function(points, threshold) {
    return new CVML.Ransac(new CVML.LineFitting(), points, threshold);
};

CVML.LineFitting = function() {

    this.nbSampleNeeded = 2;

    this.estimateModel = function(points, sample, model) {
        var counter = 0;
        for (var i in sample) {
            _samplePoints[counter] = points[i];
            counter++;
        }

        var p1 = _samplePoints[0];
        var p2 = _samplePoints[1];

        model.a = (p2.y - p1.y) / (p2.x - p1.x);
        model.b = p1.y - model.a * p1.x;
    };

    this.estimateError = function(points, index, model) {
        return Math.abs(points[index].y - model.a * points[index].x - model.b) / Math.sqrt(1 + model.a * model.a);
    };

    var _samplePoints = new Array(this.nbSampleNeeded);
};

CVML.Ransac = function(fittingProblem, points, threshold) {

    var _points = points;
    var _threshold = threshold;
    var _problem = fittingProblem;
    var _bestModel = new CVML.Line(0, 0);
    var _bestInliers = {};
    var _bestScore = 4294967295;


    var _currentModel = new CVML.Line(1, 0);
    var _nbIters = nbIterations(0.99, 0.5, fittingProblem.nbSampleNeeded);


    function nbIterations(ransacProba, outlierRatio, sampleSize) {
        return Math.ceil(Math.log(1 - ransacProba) / Math.log(1 - Math.pow(1 - outlierRatio, sampleSize)));
    }

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
        //return Math.floor(_random.uniform(min, max + 1));
    }

    function randomSample(k, n, sample) {
        var nbInserted = 0;
        while (nbInserted < k) {
            var t = randomInt(0, n - 1);
            if (sample[t] === undefined) {
                sample[t] = true;
                nbInserted++;
            }
        }
    }


    // this.next = function() {
    for (var _iterationCounter = 0; _iterationCounter < _nbIters; _iterationCounter++) {

        var _currentInliers = [];

        var score = 0;
        var sample = {};
        randomSample(_problem.nbSampleNeeded, _points.length, sample);
        _problem.estimateModel(_points, sample, _currentModel);

        for (var j = 0; j < _points.length; ++j) {
            var err = _problem.estimateError(_points, j, _currentModel);
            if (err > _threshold) {
                score += _threshold;
            } else {
                score += err;
                _currentInliers.push(j);
            }
        }
        if (score < _bestScore) {
            _bestModel.copy(_currentModel);
            _bestInliers = _currentInliers;
            _bestScore = score;

        }


    }
    return {
        model: _bestModel,
        inliers: _bestInliers,
        score: _bestScore
    };

};

//This part use data structure of Matlab

CVML._dim = function _dim(x) {
    var ret = [];
    while (typeof x === "object") {
        ret.push(x.length);
        x = x[0];
    }
    return ret;
};

CVML.dim = function dim(x) {
    var y, z;
    if (typeof x === "object") {
        y = x[0];
        if (typeof y === "object") {
            z = y[0];
            if (typeof z === "object") {
                return CVML._dim(x);
            }
            return [x.length, y.length];
        }
        return [x.length];
    }
    return [];
};

CVML.sdim = function(A, ret, k) {
    if (typeof ret === "undefined") {
        ret = [];
    }
    if (typeof A !== "object") return ret;
    if (typeof k === "undefined") {
        k = 0;
    }
    if (!(k in ret)) {
        ret[k] = 0;
    }
    if (A.length > ret[k]) ret[k] = A.length;
    var i;
    for (i in A) {
        if (A.hasOwnProperty(i)) CVML.sdim(A[i], ret, k + 1);
    }
    return ret;
};

CVML.clone = function(A, k, n) {
    if (typeof k === "undefined") {
        k = 0;
    }
    if (typeof n === "undefined") {
        n = CVML.sdim(A).length;
    }
    var i, ret = Array(A.length);
    if (k === n - 1) {
        for (i in A) {
            if (A.hasOwnProperty(i)) ret[i] = A[i];
        }
        return ret;
    }
    for (i in A) {
        if (A.hasOwnProperty(i)) ret[i] = CVML.clone(A[i], k + 1, n);
    }
    return ret;
};

CVML.rep = function rep(s, v, k) {
    if (typeof k === "undefined") {
        k = 0;
    }
    var n = s[k],
        ret = Array(n),
        i;
    if (k === s.length - 1) {
        for (i = n - 2; i >= 0; i -= 2) {
            ret[i + 1] = v;
            ret[i] = v;
        }
        if (i === -1) {
            ret[0] = v;
        }
        return ret;
    }
    for (i = n - 1; i >= 0; i--) {
        ret[i] = CVML.rep(s, v, k + 1);
    }
    return ret;
};

CVML.transpose = function(A) {
    var ret = [],
        /*n = A.length,*/
        i, j, Ai;
    for (i in A) {
        if (!(A.hasOwnProperty(i))) continue;
        Ai = A[i];
        for (j in Ai) {
            if (!(Ai.hasOwnProperty(j))) continue;
            if (typeof ret[j] !== "object") {
                ret[j] = [];
            }
            ret[j][i] = Ai[j];
        }
    }
    return ret;
};

CVML.minVP = function(svd) {
    var ind = 0;
    for (var i = 0; i < svd.S.length - 1; i++) {
        if (svd.S[i + 1] < svd.S[i]) ind = i + 1;
    }
    return svd.U[ind];
};

CVML.maxVP = function(svd) {
    var ind = 0;
    for (var i = 0; i < svd.S.length - 1; i++) {
        if (svd.S[i + 1] > svd.S[i]) ind = i + 1;
    }
    return svd.U[ind];
};

CVML.subVec = function(vec, vec1) {
    var ret = new Array(vec.length);
    if (vec.length === vec1.length) {
        for (var i = 0; i < vec.length; i++)
            ret[i] = vec[i] - vec1[i];
    } else return -1;
    return ret;
};

CVML.addVec = function(vec, vec1) {
    var ret = new Array(vec.length);
    if (vec.length === vec1.length) {
        for (var i = 0; i < vec.length; i++)
            ret[i] = vec[i] + vec1[i];
    } else return -1;
    return ret;
};


CVML.dotMV = function(A, x) {
    var p = A.length,
        Ai, i, j;
    var ret = Array(p),
        accum;
    for (i = p - 1; i >= 0; i--) {
        Ai = A[i];
        accum = 0;
        for (j in Ai) {
            if (!(Ai.hasOwnProperty(j))) continue;
            if (x[j]) accum += Ai[j] * x[j];
        }
        if (accum) ret[i] = accum;
    }
    return ret;
};


CVML.svd = function svd(A) {
    var temp;
    //Compute the thin SVD from G. H. Golub and C. Reinsch, Numer. Math. 14, 403-420 (1970)
    var prec = CVML.epsilon; //Math.pow(2,-52) // assumes double prec
    var tolerance = 1.e-64 / prec;
    var itmax = 50;
    var c = 0;
    var i = 0;
    var j = 0;
    var k = 0;
    var l = 0;

    var u = CVML.clone(A);
    var m = u.length;

    var n = u[0].length;

    if (m < n) throw "Need more rows than columns"

    var e = new Array(n);
    var q = new Array(n);
    for (i = 0; i < n; i++) e[i] = q[i] = 0.0;
    var v = CVML.rep([n, n], 0);
    //	v.zero();

    function pythag(a, b) {
        a = Math.abs(a)
        b = Math.abs(b)
        if (a > b)
            return a * Math.sqrt(1.0 + (b * b / a / a))
        else if (b == 0.0)
            return a
        return b * Math.sqrt(1.0 + (a * a / b / b))
    }

    //Householder's reduction to bidiagonal form

    var f = 0.0;
    var g = 0.0;
    var h = 0.0;
    var x = 0.0;
    var y = 0.0;
    var z = 0.0;
    var s = 0.0;

    for (i = 0; i < n; i++) {
        e[i] = g;
        s = 0.0;
        l = i + 1;
        for (j = i; j < m; j++)
            s += (u[j][i] * u[j][i]);
        if (s <= tolerance)
            g = 0.0;
        else {
            f = u[i][i];
            g = Math.sqrt(s);
            if (f >= 0.0) g = -g;
            h = f * g - s
            u[i][i] = f - g;
            for (j = l; j < n; j++) {
                s = 0.0;
                for (k = i; k < m; k++)
                    s += u[k][i] * u[k][j];
                f = s / h;
                for (k = i; k < m; k++)
                    u[k][j] += f * u[k][i];
            }
        }
        q[i] = g;
        s = 0.0;
        for (j = l; j < n; j++)
            s = s + u[i][j] * u[i][j];
        if (s <= tolerance)
            g = 0.0;
        else {
            f = u[i][i + 1];
            g = Math.sqrt(s);
            if (f >= 0.0) g = -g;
            h = f * g - s;
            u[i][i + 1] = f - g;
            for (j = l; j < n; j++) e[j] = u[i][j] / h;
            for (j = l; j < m; j++) {
                s = 0.0;
                for (k = l; k < n; k++)
                    s += (u[j][k] * u[i][k]);
                for (k = l; k < n; k++)
                    u[j][k] += s * e[k];
            }
        }
        y = Math.abs(q[i]) + Math.abs(e[i]);
        if (y > x)
            x = y;
    }

    // accumulation of right hand gtransformations
    for (i = n - 1; i != -1; i += -1) {
        if (g != 0.0) {
            h = g * u[i][i + 1];
            for (j = l; j < n; j++)
                v[j][i] = u[i][j] / h;
            for (j = l; j < n; j++) {
                s = 0.0;
                for (k = l; k < n; k++)
                    s += u[i][k] * v[k][j];
                for (k = l; k < n; k++)
                    v[k][j] += (s * v[k][i]);
            }
        }
        for (j = l; j < n; j++) {
            v[i][j] = 0;
            v[j][i] = 0;
        }
        v[i][i] = 1;
        g = e[i];
        l = i;
    }

    // accumulation of left hand transformations
    for (i = n - 1; i != -1; i += -1) {
        l = i + 1;
        g = q[i];
        for (j = l; j < n; j++)
            u[i][j] = 0;
        if (g != 0.0) {
            h = u[i][i] * g;
            for (j = l; j < n; j++) {
                s = 0.0;
                for (k = l; k < m; k++) s += u[k][i] * u[k][j];
                f = s / h;
                for (k = i; k < m; k++) u[k][j] += f * u[k][i];
            }
            for (j = i; j < m; j++) u[j][i] = u[j][i] / g;
        } else
            for (j = i; j < m; j++) u[j][i] = 0;
        u[i][i] += 1;
    }

    // diagonalization of the bidiagonal form
    prec = prec * x;
    for (k = n - 1; k != -1; k += -1) {
        for (var iteration = 0; iteration < itmax; iteration++) { // test f splitting
            var test_convergence = false
            for (l = k; l != -1; l += -1) {
                if (Math.abs(e[l]) <= prec) {
                    test_convergence = true
                    break
                }
                if (Math.abs(q[l - 1]) <= prec)
                    break
            }
            if (!test_convergence) { // cancellation of e[l] if l>0
                c = 0.0;
                s = 1.0;
                var l1 = l - 1;
                for (i = l; i < k + 1; i++) {
                    f = s * e[i];
                    e[i] = c * e[i];
                    if (Math.abs(f) <= prec)
                        break
                    g = q[i];
                    h = pythag(f, g);
                    q[i] = h;
                    c = g / h;
                    s = -f / h;
                    for (j = 0; j < m; j++) {
                        y = u[j][l1];
                        z = u[j][i];
                        u[j][l1] = y * c + (z * s);
                        u[j][i] = -y * s + (z * c);
                    }
                }
            }
            // test f convergence
            z = q[k];
            if (l == k) { //convergence
                if (z < 0.0) { //q[k] is made non-negative
                    q[k] = -z;
                    for (j = 0; j < n; j++)
                        v[j][k] = -v[j][k];
                }
                break //break out of iteration loop and move on to next k value
            }
            if (iteration >= itmax - 1)
                throw 'Error: no convergence.'
                    // shift from bottom 2x2 minor
            x = q[l];
            y = q[k - 1];
            g = e[k - 1];
            h = e[k];
            f = ((y - z) * (y + z) + (g - h) * (g + h)) / (2.0 * h * y);
            g = pythag(f, 1.0);
            if (f < 0.0)
                f = ((x - z) * (x + z) + h * (y / (f - g) - h)) / x;
            else
                f = ((x - z) * (x + z) + h * (y / (f + g) - h)) / x;
            // next QR transformation
            c = 1.0;
            s = 1.0;
            for (i = l + 1; i < k + 1; i++) {
                g = e[i];
                y = q[i];
                h = s * g;
                g = c * g;
                z = pythag(f, h);
                e[i - 1] = z;
                c = f / z;
                s = h / z;
                f = x * c + g * s;
                g = -x * s + g * c;
                h = y * s;
                y = y * c;
                for (j = 0; j < n; j++) {
                    x = v[j][i - 1];
                    z = v[j][i];
                    v[j][i - 1] = x * c + z * s;
                    v[j][i] = -x * s + z * c;
                }
                z = pythag(f, h);
                q[i - 1] = z;
                c = f / z;
                s = h / z;
                f = c * g + s * y;
                x = -s * g + c * y;
                for (j = 0; j < m; j++) {
                    y = u[j][i - 1];
                    z = u[j][i];
                    u[j][i - 1] = y * c + z * s;
                    u[j][i] = -y * s + z * c;
                }
            }
            e[l] = 0.0;
            e[k] = f;
            q[k] = x;
        }
    }

    //vt= transpose(v)
    //return (u,q,vt)
    for (i = 0; i < q.length; i++)
        if (q[i] < prec) q[i] = 0;

        //sort eigenvalues
    for (i = 0; i < n; i++) {
        //writeln(q)
        for (j = i - 1; j >= 0; j--) {
            if (q[j] < q[i]) {
                //  writeln(i,'-',j)
                c = q[j];
                q[j] = q[i];
                q[i] = c;
                for (k = 0; k < u.length; k++) {
                    temp = u[k][i];
                    u[k][i] = u[k][j];
                    u[k][j] = temp;
                }
                for (k = 0; k < v.length; k++) {
                    temp = v[k][i];
                    v[k][i] = v[k][j];
                    v[k][j] = temp;
                }

                i = j;
            }
        }
    }

    return {
        U: u,
        S: q,
        V: v
    };
};
CVML.dotMMsmall = function(x, y) {
    var i, j, k, p, q, r, ret, foo, bar, woo, i0; //,k0,p0,r0;
    p = x.length;
    q = y.length;
    r = y[0].length;
    ret = Array(p);
    for (i = p - 1; i >= 0; i--) {
        foo = Array(r);
        bar = x[i];
        for (k = r - 1; k >= 0; k--) {
            woo = bar[q - 1] * y[q - 1][k];
            for (j = q - 2; j >= 1; j -= 2) {
                i0 = j - 1;
                woo += bar[j] * y[j][k] + bar[i0] * y[i0][k];
            }
            if (j === 0) {
                woo += bar[0] * y[0][k];
            }
            foo[k] = woo;
        }
        ret[i] = foo;
    }
    return ret;
};
CVML._getCol = function(A, j, x) {
    var n = A.length,
        i;
    for (i = n - 1; i > 0; --i) {
        x[i] = A[i][j];
        --i;
        x[i] = A[i][j];
    }
    if (i === 0) x[0] = A[0][j];
};
CVML.dotMMbig = function(x, y) {
    var gc = CVML._getCol,
        p = y.length,
        v = Array(p);
    var m = x.length,
        n = y[0].length,
        A = new Array(m),
        xj;
    var VV = CVML.dotVV;
    var i, j; //k,z;
    --p;
    --m;
    for (i = m; i !== -1; --i) A[i] = Array(n);
    --n;
    for (i = n; i !== -1; --i) {
        gc(y, i, v);
        for (j = m; j !== -1; --j) {
            //z=0;
            xj = x[j];
            A[j][i] = VV(xj, v);
        }
    }
    return A;
};

CVML.dotMV = function(x, y) {
    var p = x.length; //, q = y.length,i;
    var ret = Array(p),
        dotVV = CVML.dotVV;
    for (var i = p - 1; i >= 0; i--) {
        ret[i] = dotVV(x[i], y);
    }
    return ret;
};

CVML.dotVM = function(x, y) {
    var /*i,*/ j, k, p, q, /*r,*/ ret, /*foo,bar,*/ woo, i0 /*,k0,p0,r0,s1,s2,s3,baz,accum*/ ;
    p = x.length;
    q = y[0].length;
    ret = Array(q);
    for (k = q - 1; k >= 0; k--) {
        woo = x[p - 1] * y[p - 1][k];
        for (j = p - 2; j >= 1; j -= 2) {
            i0 = j - 1;
            woo += x[j] * y[j][k] + x[i0] * y[i0][k];
        }
        if (j === 0) {
            woo += x[0] * y[0][k];
        }
        ret[k] = woo;
    }
    return ret;
};

CVML.dotVV = function(x, y) {
    var i, n = x.length,
        i1, ret = x[n - 1] * y[n - 1];
    for (i = n - 2; i >= 1; i -= 2) {
        i1 = i - 1;
        ret += x[i] * y[i] + x[i1] * y[i1];
    }
    if (i === 0) {
        ret += x[0] * y[0];
    }
    return ret;
};

CVML.dot = function dot(x, y) {
    var d = CVML.dim;
    switch (d(x).length * 1000 + d(y).length) {
        case 2002:
            if (y.length < 10) return CVML.dotMMsmall(x, y);
            else return CVML.dotMMbig(x, y);
        case 2001:
            return CVML.dotMV(x, y);
        case 1002:
            return CVML.dotVM(x, y);
        case 1001:
            return CVML.dotVV(x, y);
        case 1000:
            return CVML.mulVS(x, y);
        case 1:
            return CVML.mulSV(x, y);
        case 0:
            return x * y;
        default:
            throw new Error('dot only works on vectors and matrices');
    }
};

CVML.div = function(A, m) {
    var ret = new Array(A.length);
    for (var i = 0; i < A.length; i++) {
        var Ai = A[i];
        for (var j = 0; j < Ai.length; j++)
            Ai[j] = Ai[j] / m;
        ret[i] = Ai;
    }
    return ret;
};

//prends une matrice Nx3 and subtract to vector 3x1
CVML.subMV = function(A, v) {
    if (A[0].length !== v.length)
        throw new Error('vector and matrice elements must have same length');
    var ret = new Array(A.length);
    for (var i = 0; i < A.length; i++) {
        var Ai = A[i]; //[x,y,z]
        var elem = new Array(v.length);
        for (var j = 0; j < Ai.length; j++)
            elem[j] = Ai[j] - v[j];
        ret[i] = elem;
    }
    return ret;
};

CVML.pca = function(A, mV) {
    var m = A.length;
    var A_norm = CVML.subMV(A, mV);
    var sigma = CVML.div(CVML.dot(CVML.transpose(A_norm), A_norm), m);
    return CVML.svd(sigma); //.U;
};

export default CVML;
