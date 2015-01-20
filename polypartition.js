define(function() {
  // Adapted/copied from https://code.google.com/p/polypartition/
  var exports = {};
  /*
   * A point represents a vertex in a 2d environment.
   */
  Point = function(x, y) {
    this.x = x;
    this.y = y;
  }
  exports.Point = Point;

  /**
   * Takes a point or scalar and adds slotwise in the case of another
   * point, or to each parameter in the case of a scalar.
   * @param {(Point|number)} - The Point, or scalar, to add to this
   *   point.
   */
  Point.prototype.add = function(p) {
    if (typeof p == "number")
      return new Point(this.x + p, this.y + p);
    return new Point(this.x + p.x, this.y + p.y);
  }

  /**
   * Takes a point or scalar and subtracts slotwise in the case of
   * another point or from each parameter in the case of a scalar.
   * @param {(Point|number)} - The Point, or scalar, to subtract from
   *   this point.
   */
  Point.prototype.sub = function(p) {
    if (typeof p == "number")
      return new Point(this.x - p, this.y - p);
    return new Point(this.x - p.x, this.y - p.y);
  }

  Point.prototype.mul = function(f) {
    return new Point(this.x * f, this.y * f);
  }

  Point.prototype.div = function(f) {
    return new Point(this.x / f, this.y / f);
  }

  Point.prototype.eq = function(p) {
    return (this.x == p.x && this.y == p.y);
  }

  Point.prototype.neq = function(p) {
    return (this.x != p.x || this.y != p.y);
  }

  // Given another point, returns the dot product.
  Point.prototype.dot = function(p) {
    return (this.x * p.x + this.y * p.y);
  }

  // Given another point, returns the 'cross product', or at least the 2d
  // equivalent.
  Point.prototype.cross = function(p) {
    return (this.x * p.y - this.y * p.x);
  }

  // Given another point, returns the distance to that point.
  Point.prototype.dist = function(p) {
    var diff = this.sub(p);
    return Math.sqrt(diff.dot(diff));
  }

  Point.prototype.len = function() {
    return this.dist(new Point(0, 0));
  }

  Point.prototype.normalize = function() {
    var n = this.dist(new Point(0, 0));
    if (n > 0) return this.div(n);
    return new Point(0, 0);
  }

  /**
   * May take an arbitrary number of points as arguments.
   */
  Poly = function(points) {
    if (points) {
      this.points = points.slice();
      this.numpoints = this.points.length;
    } else {
      this.points = null;
      this.numpoints = 0;
    }
  }
  exports.Poly = Poly;

  Poly.prototype.init = function(n) {
    this.points = new Array(n);
    this.numpoints = n;
  }

  Poly.prototype.update = function() {
    this.numpoints = this.points.length;
  }

  Poly.prototype.triangle = function(p1, p2, p3) {
    this.init(3);
    this.points[0] = p1;
    this.points[1] = p2;
    this.points[2] = p3;
  }

  // Takes an index and returns the point at that index, or null.
  Poly.prototype.getPoint = function(n) {
    if (this.points && this.numpoints > n)
      return this.points[n];
    return null;
  }

  // Set a point, fails silently otherwise. TODO: replace with bracket notation.
  Poly.prototype.setPoint = function(i, p) {
    if (this.points && this.points.length > i) {
      this.points[i] = p;
    }
  }

  // Given an index i, return the index of the next point.
  Poly.prototype.getNextI = function(i) {
    return (i + 1) % this.numpoints;
  }

  Poly.prototype.getPrevI = function(i) {
    if (i == 0)
      return (this.numpoints - 1);
    return i - 1;
  }

  // Returns the signed area of a polygon, if the vertices are given in
  // CCW order then the area will be > 0, < 0 otherwise.
  Poly.prototype.getArea = function() {
    var area = 0;
    for (var i = 0; i < this.numpoints; i++) {
      var i2 = this.getNextI(i);
      area += this.points[i].x * this.points[i2].y - this.points[i].y * this.points[i2].x;
    }
    return area;
  }

  Poly.prototype.getOrientation = function() {
    var area = this.getArea();
    if (area > 0) return "CCW";
    if (area < 0) return "CW";
    return 0;
  }

  Poly.prototype.setOrientation = function(orientation) {
    var current_orientation = this.getOrientation();
    if (current_orientation && (current_orientation !== orientation)) {
      this.invert();
    }
  }

  Poly.prototype.invert = function() {
    var newpoints = new Array(this.numpoints);
    for (var i = 0; i < this.numpoints; i++) {
      newpoints[i] = this.points[this.numpoints - i - 1];
    }
    this.points = newpoints;
  }

  Partition = {};
  exports.Partition = Partition;

  Partition.isConvex = function(p1, p2, p3) {
    var tmp = (p3.y - p1.y) * (p2.x - p1.x) - (p3.x - p1.x) * (p2.y - p1.y);
    return (tmp >= 0);
  }

  // Using Hertel-Mehlhorn
  // Takes a polygon outline and an array of polygons defining holes.
  // Poly vertices must be in CW order, holes in CCW order. This can be
  // done using setOrientation.
  Partition.convexPartition = function(triangles) {
    // Copy triangles to preserve the originals.
    triangles = triangles.map(function(triangle) {
      return new Poly(triangle.points);
    });
    
    var i11, i12, i13, i21, i22, i23;
    var parts = new Array();

    for (var s1 = 0; s1 < triangles.length; s1++) {
      var poly1 = triangles[s1];
      var s2_index = null;
      for (i11 = 0; i11 < poly1.numpoints; i11++) {
        var d1 = poly1.getPoint(i11);
        i12 = poly1.getNextI(i11);
        var d2 = poly1.getPoint(i12);

        var isdiagonal = false;
        for (var s2 = s1; s2 < triangles.length; s2++) {
          if (s1 == s2) continue;
          var poly2 = triangles[s2];
          for (i21 = 0; i21 < poly2.numpoints; i21++) {
            if (d2.neq(poly2.getPoint(i21))) continue;
            i22 = poly2.getNextI(i21);
            if (d1.neq(poly2.getPoint(i22))) continue;
            isdiagonal = true;
            object_2_index = s2;
            break;
          }
          if (isdiagonal) break;
        }

        if (!isdiagonal) continue;
        var p1, p2, p3;
        p2 = poly1.getPoint(i11);
        i13 = poly1.getPrevI(i11);
        p1 = poly1.getPoint(i13);
        i23 = poly2.getNextI(i22);
        p3 = poly2.getPoint(i23);

        if (!this.isConvex(p1, p2, p3)) continue;

        p2 = poly1.getPoint(i12);
        i13 = poly1.getNextI(i12);
        p3 = poly1.getPoint(i13);
        i23 = poly2.getPrevI(i21);
        p1 = poly2.getPoint(i23);

        if (!this.isConvex(p1, p2, p3)) continue;

        var newpoly = new Poly();
        newpoly.init(poly1.numpoints + poly2.numpoints - 2);
        var k = 0;
        for (var j = i12; j != i11; j = poly1.getNextI(j)) {
          newpoly.setPoint(k, poly1.getPoint(j));
          k++;
        }
        for (var j = i22; j != i21; j = poly2.getNextI(j)) {
          newpoly.setPoint(k, poly2.getPoint(j));
          k++;
        }

        if (s1 > object_2_index) {
          triangles[s1] = newpoly;
          poly1 = triangles[s1];
          triangles.splice(object_2_index, 1);
        } else {
          triangles.splice(object_2_index, 1);
          triangles[s1] = newpoly;
          poly1 = triangles[s1];
        }
        i11 = -1;
      }
    }
    return triangles;
  }

  return exports;
});
