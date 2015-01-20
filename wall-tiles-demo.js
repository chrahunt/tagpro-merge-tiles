require(['polypartition', 'tile-grids', 'jquery'],
function( pp,              tile_grids,   $) {
  Point = pp.Point;
  Poly = pp.Poly;
  Partition = pp.Partition;

  var TILE_WIDTH = 40;

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
    c2.clearRect(0, 0, c.width, c.height);
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

    /**
     * Create a square, given a point.
     * @return {Poly} - The square.
     */
    function getSquare(p) {
      var poly = new Poly();
      var ur = p.add(new Point(TILE_WIDTH, 0));
      var lr = p.add(new Point(TILE_WIDTH, TILE_WIDTH));
      var ll = p.add(new Point(0, TILE_WIDTH));
      poly.init(4);
      poly.points = [p, ur, lr, ll];
      return poly;
    }
    
    var polys = {};
    polys.tile = null;
    polys.polys = [];
    // Top-left of tile.
    var p = (new Point(xi, yi)).mul(TILE_WIDTH);
    if (tile == 1) {
      // Square needs 2 polys.
      polys.tile = getSquare(p);
      polys.polys.push(getTriangle(p, 1));
      polys.polys.push(getTriangle(p, 3));
    } else {
      // Get tile type.
      var type = +(tile + "").split("\.")[1];
      polys.tile = getTriangle(p, type);
      polys.polys.push(polys.tile);
    }
    return polys;
  }

  /**
   * @param {string} mapName - The identifier for the map.
   * @param {MapData} map - The data for the map.
   * @param {string} type - The type desired for the map.
   */
  function getMapPolys(mapName, map, type) {
    var tiles = tile_grids[mapName];
    if (!map.hasOwnProperty("tiles")) {
      map.tiles = [];
      map.triangles = [];
      // Get individual wall polygons.
      tiles.forEach(function(row, xi) {
        row.forEach(function(tile, yi) {
          if (Math.floor(tile) == 1) {
            var poly = getWallPoly(tile, xi, yi);
            map.tiles.push(poly.tile);
            map.triangles = map.triangles.concat(poly.polys);
          }
        });
      });
    }
    if (!map.hasOwnProperty(type)) {
      map.merged = Partition.convexPartition(map.triangles);
    }
  }

  
  

  // Add maps to select.
  var maps = Object.keys(tile_grids);
  var mapSelect = $('#maps');
  $.each(maps, function(index, map) {
    mapSelect.append(
      $('<option></option>')
        .attr("value", map)
        .text(map)
    );
  });

  var currentMap = mapSelect[0].value;

  // Add change listener for select.
  mapSelect.change(function(e) {
    var selected = e.target.value;
    if (selected) {
      currentMap = selected;
    }
    if (currentMap && currentType) {
      drawMapType(currentMap, currentType);
    }
  });

  /**
   * Holds the calculated polygons representing the wall tiles.
   * @typedef MapData
   * @property {Array.<Poly>} tiles - The polygons corresponding to the
   *   plain tiles of the map.
   * @property {Array.<Poly>} triangles - The polygons corresponding to
   *   all of the tiles converted to triangles.
   * @property {Array.<Poly>} merged - The polygons representing the
   *   merged triangles of the tiles.
   */
  /**
   * Holds the map data for each of the maps we have tile data for.
   * @type {object.<string, MapData>}
   */
  var mapData = {};
  
  /**
   * Takes in a map identifier and a type of map to draw, and draws it.
   * @param {string} map - An identifier for the map to draw.
   * @param {string} type - A valid map type, one of "tiles",
   *   "triangles", or "merged".
   */
  function drawMapType(map, type) {
    if (!mapData.hasOwnProperty(map)) {
      mapData[map] = {};
    }
    var mapByType = mapData[map];
    if (!mapByType.hasOwnProperty(type)) {
      // Get tiles for this map and type
      getMapPolys(map, mapByType, type);
    }
    // Initialize canvas.
    var canvas = initCanvasForTiles(tile_grids[map]);
    drawPolys(mapByType[type], canvas);
  }

  var mapTypes = $('input[name=grid]');

  // Get selected map display type.
  var currentType;
  var checkedType = mapTypes.filter(':checked');
  if (checkedType.length == 1) {
    currentType = checkedType[0].value;
  }

  // Change handler for map display type.
  mapTypes.change(function(e) {
    currentType = e.target.value;
    drawMapType(currentMap, currentType);
  });

  // Start it up if everything selected.
  if (currentMap && currentType) {
    drawMapType(currentMap, currentType);
  }
});
