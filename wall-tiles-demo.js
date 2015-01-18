require(['polypartition', 'tile-grids'],
function( pp,              tile_grids) {
  Point = pp.Point;
  Poly = pp.Poly;
  Partition = pp.Partition;

  function drawPath(pathInfo, canvas) {
    var context = canvas.getContext('2d');
    context.beginPath();
    var start = pathInfo.shift();
    context.moveTo(start.x, start.y);
    for (var i = 0; i < pathInfo.length; i++) {
      context.lineTo(pathInfo[i].x, pathInfo[i].y);
    }
    //context.lineTo(start.x, start.y);
    context.lineWidth = 1;
    context.strokeStyle = 'blue';
    context.stroke();
    context.closePath();
    pathInfo.forEach(function(p) {
      drawPoint(p, canvas);
    });
  }

  // Takes in a polygon, canvas element, and [optional] color string.
  function drawPoly(poly, canvas, color) {
    if (typeof color == 'undefined') color = 'black';
    var context = canvas.getContext('2d');
    context.beginPath();
    var start = poly.getPoint(0);
    context.moveTo(start.x, start.y);
    for (var i = 1; i < poly.numpoints; i++) {
      context.lineTo(poly.getPoint(i).x, poly.getPoint(i).y);
    }
    context.lineTo(start.x, start.y);
    context.lineWidth = 1;
    context.strokeStyle = color;
    context.stroke();
    context.closePath();
  }

  function initCanvasForTiles(tiles) {
    var c = document.getElementById('c');
    c.width = tiles.length * 40;
    c.height = tiles[0].length * 40;
    var c2 = c.getContext('2d');
    c2.fillStyle = '#dd0';
    return c;
  }

  // Draw polys on canvas.
  function drawPolys(polys, canvas) {
    polys.forEach(function(poly) {
      drawPoly(poly, canvas, 'green');
    });
  }

  /**
   * Gets the polygon, or polygons, required to represent a wall tile
   * as a triangle, or triangles.
   * @param {number} tile - The wall tile id.
   * @param {integer} xi - The x index of the tile in `tagpro.map`.
   * @param {integer} yi - The y index of the tile in `tagpro.map`.
   * @return {(Poly|Array.<Poly>)} - The resulting polygon(s).
   */
  function getWallPoly(tile, xi, yi) {
    /**
     * Create a triangle given a point and type.
     * @param {Point} p - The point of the upper-left of the tile.
     * @param {number} type - The type of triangle. 1 for lower left,
     *   2 for upper left, 3 for upper right, 4 for lower right.
     * @return {Poly} - The triangle.
     */
    function getTriangle(p, type) {
      var poly = new Poly();
      var ur = p.add(new Point(TILE_WIDTH, 0));
      var lr = p.add(new Point(TILE_WIDTH, TILE_WIDTH));
      var ll = p.add(new Point(0, TILE_WIDTH));
      if (type == 1) {
        poly.triangle(p, lr, ll);
      } else if (type == 2) {
        poly.triangle(p, ur, ll);
      } else if (type == 3) {
        poly.triangle(p, ur, lr);
      } else if (type == 4) {
        poly.triangle(ur, lr, ll);
      }
      return poly;
    }
    
    // Top-left of tile.
    var p = (new Point(xi, yi)).mul(TILE_WIDTH);
    if (tile == 1) {
      // Square needs 2 polys.
      var polys = [];
      polys.push(getTriangle(p, 1));
      polys.push(getTriangle(p, 3));
      return polys;
    } else {
      // Get tile type.
      var type = +(tile + "").split("\.")[1];
      console.log(type);
      return getTriangle(p, type);
    }
  }
  var TILE_WIDTH = 40;
  var tiles = tile_grids["Volt"];
  var tilePolys = [];
  // Get individual wall polygons.
  tiles.forEach(function(row, xi) {
    row.forEach(function(tile, yi) {
      if (Math.floor(tile) == 1) {
        tilePolys = tilePolys.concat(getWallPoly(tile, xi, yi));
      }
    });
  });
  var partitioner = new Partition();
  var mergedPolys = partitioner.convexPartition(tilePolys);
  
  // Initialize canvas.
  var canvas = initCanvasForTiles(tiles);

  drawPolys(mergedPolys, canvas);
});
