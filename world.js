/*
TM AI

Copyright (C) 2013 by Lode Vandevenne

This software is provided 'as-is', without any express or implied
warranty. In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

    1. The origin of this software must not be misrepresented; you must not
    claim that you wrote the original software. If you use this software
    in a product, an acknowledgment in the product documentation would be
    appreciated but is not required.

    2. Altered source versions must be plainly marked as such, and must not be
    misrepresented as being the original software.

    3. This notice may not be removed or altered from any source
    distribution.
*/

//hex math and world map, and some rules related to buildings and towns

var BW = 13; //board width
var BH = 9; //board height

//Tile color enum
var N = 0; /*Null (edge of hexmap)*/
var R = 1; /*Red*/
var Y = 2; /*Yellow*/
var O = 3; /*brOwn*/
var K = 4; /*blacK*/
var B = 5; /*Blue*/
var G = 6; /*Green*/
var E = 7; /*grEy*/
var I = 8; /*rIver*/

//Buildings
var B_NONE = 0;
var B_D = 1;
var B_TP = 2;
var B_TE = 3;
var B_SH = 4;
var B_SA = 5;
//mermaids town over water connection tile.
//This is implemented as a building, because the clustering calculation works like that, and it can connect up to 3 parts together.
//it's only allowed to build this if it results in forming a new town (that ensures the rule "may skip only ONE river tile", and prevents placing tons in a row to cross large river distances)
var B_MERMAIDS = 6;

//returns the power value of a building
//given building may not be B_NONE or undefined.
function getBuildingPower(building) {
  if(building == B_MERMAIDS) return 0;
  if(building == B_D) return 1;
  if(building == B_TP || building == B_TE) return 2;
  return 3;
}

//when forming a town, you need 4 buildings in the cluster. However, the mermaids skipped river tile does not count, and the sanctuary counts for 2. This function encapsulates that knowledge.
//given building may not be B_NONE or undefined.
function getBuildingTownSize(building) {
  if(building == B_MERMAIDS) return 0;
  if(building == B_SA) return 2;
  return 1;
}

//Directions
//For bridges: N, NE, SE, S, SW, NW
//For touching tiles: NE, E, SE, SW, W, NW
var D_INVALID = 0; //for tiles not in correct relative location
var D_N = 1;
var D_NE = 2;
var D_E = 3;
var D_SE = 4;
var D_S = 5;
var D_SW = 6;
var D_W = 7;
var D_NW = 8;

//Grid coordinates to array coordinates
function arCo(x, y) {
  return y * BW + x;
}

//returns coordinates of neighbor tile in given direction
function dirCo(x, y, dir) {
  if(dir == D_NE) result = [y % 2 ? x + 1 : x, y - 1];
  else if(dir == D_E) result = [x + 1, y];
  else if(dir == D_SE) result = [y % 2 ? x + 1 : x, y + 1];
  else if(dir == D_SW) result = [y % 2 ? x : x - 1, y + 1];
  else if(dir == D_W) result = [x - 1, y];
  else if(dir == D_NW) result = [y % 2 ? x : x - 1, y - 1];
  else return null; //ERROR
  if(outOfBounds(result[0], result[1])) return null; //out of bounds
  return result;
}

//returns coordinates of other side of bridge pointing in that direction
function bridgeCo(x, y, dir) {
  if(dir == D_N) return [x, y - 2];
  if(dir == D_NE) return [y % 2 ? x + 2 : x + 1, y - 1];
  if(dir == D_SE) return [y % 2 ? x + 2 : x + 1, y + 1];
  if(dir == D_S) return [x, y + 2];
  if(dir == D_SW) return [y % 2 ? x - 1 : x - 2, y + 1];
  if(dir == D_NW) return [y % 2 ? x - 1 : x - 2, y - 1];
  return [x, y]; //ERROR
}

//The world array has the color of each hex. It is inited with the standard world map.
var world = [];

function initStandardWorld() {
  BW = 13;
  BH = 9;
  world = [O,E,G,B,Y,R,O,K,R,G,B,R,K,
            Y,I,I,O,K,I,I,Y,K,I,I,Y,N,
           I,I,K,I,E,I,G,I,G,I,E,I,I,
            G,B,Y,I,I,R,B,I,R,I,R,O,N,
           K,O,R,B,K,O,E,Y,I,I,G,K,B,
            E,G,I,I,Y,G,I,I,I,O,E,O,N,
           I,I,I,E,I,R,I,G,I,Y,K,B,Y,
            Y,B,O,I,I,I,B,K,I,E,O,E,N,
           R,K,E,B,R,G,Y,O,E,I,B,G,R];
}

function randomizeWorld(small) {
  var NUMISLANDS = 5;
  var NUMPERCOLOR = 11;
  if(small) {
    BH = 7;
    BW = 11;
    NUMISLANDS = 4;
    NUMPERCOLOR = 7;
  } else {
    BW = 13;
    BH = 9;
  }

  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    world[y * BW + x] = outOfBounds(x, y) ? N : I;
  }

  var done = 0;
  while(done < NUMISLANDS) {
    var r = done == 0 ? 0 : done == 1 ? (BW - 1) : done == 2 ? (BW * BH - 1) : done == 3 ? (BW * BH - BW) : Math.floor((BW * BH / 2));
    if(world[r] != I) continue;
    world[r] = R + done;
    done++;
  }

  done = 0;
  var attempt = 0;
  while(done < NUMPERCOLOR * 7 - NUMISLANDS) {
    attempt++;
    var r = randomInt(BW * BH);
    if(world[r] != I) continue;
    var x = r % BW;
    var y = Math.floor(r / BW);
    var neighbors = getNeighborTiles(x, y);
    var c = I;
    var ok = true;
    for(var i = 0; i < neighbors.length; i++) {
      var nc = getWorld(neighbors[i][0], neighbors[i][1]);
      if(nc != I) {
        if(c == I) {
          c = nc;
        } else {
          if(c != nc) {
            ok = false;
            break;
          }
        }
      }
    }
    if(c == I) ok = false;
    if(attempt > 500) ok = true;
    if(ok) {
      attempt = 0;
      world[r] = c;
      done++;
    }
  }

  //give all land tiles a temporary unexisting color
  var landtiles = [];
  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    var i = y * BW + x;
    if(world[i] != I && world[i] != N) {
      world[i] = 999;
      landtiles.push(i);
    }
  }

  //position ok for this color? That is, no same colored neighbors, no 2-dist for yellow.
  var posok = function(x, y, color, impatient) {
    if(color == Y && !impatient) {
      var neighbors = getTilesWithinRadius(x, y, 2);
      for(var i = 0; i < neighbors.length; i++) if(getWorld(neighbors[i][0], neighbors[i][1]) == color) return false;
      return true;
    } else if(color == B && !impatient) {
      // should be next to river, but not in too large splotches
      var neighbors = getNeighborTiles(x, y);
      var count = 0;
      for(var i = 0; i < neighbors.length; i++) {
        if(getWorld(neighbors[i][0], neighbors[i][1]) == color) return false;
        if(getWorld(neighbors[i][0], neighbors[i][1]) == I) count++;
      }
      return count > 0 && count < 3;
    } else if(color == I) {
      // try to extend existing waters
      var neighbors = getNeighborTiles(x, y);
      var count = 0;
      for(var i = 0; i < neighbors.length; i++) {
        if(getWorld(neighbors[i][0], neighbors[i][1]) == I) count++;
      }
      return count > 0;
    } else {
      var neighbors = getNeighborTiles(x, y);
      for(var i = 0; i < neighbors.length; i++) if(getWorld(neighbors[i][0], neighbors[i][1]) == color) return false;
      return true;
    }
  };

  //yellow and blue first because they have more rectrictions
  var bad = [];
  var colors = [Y, B, O, K, G, E, R];
  for(var c = 0; c < colors.length; c++) {
    done = 0;
    attempt = 0;
    while(done < NUMPERCOLOR) {
      var i = randomIndex(landtiles);
      var r = landtiles[i];
      var x = r % BW;
      var y = Math.floor(r / BW);
      if(world[r] == I || world[r] == N) continue;
      attempt++;
      var color = colors[c];
      var impatient = attempt > 50 || (color == B && done > (NUMPERCOLOR * 2 / 3));
      var giveup = attempt > 200;
      if(giveup || posok(x, y, color, impatient)) {
        world[r] = color;
        landtiles.splice(i, 1);
        done++;
        if(giveup) bad.push(r);
      }
    }
  }

  //add ponds to the bad tiles
  var isPond = function(x, y) {
    if(getWorld(x, y) != I) return false;
    var neighbors = getNeighborTiles(x, y);
    var count = 0;
    for(var i = 0; i < neighbors.length; i++) {
      if(getWorld(neighbors[i][0], neighbors[i][1]) == I) return false;
    }
    return true;
  }
  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    if(isPond(x, y)) bad.push(arCo(x, y));
  }

  
  //fix up bad ones, e.g. for the last color it did it's likely there are bad positions
  for(var i = 0; i < bad.length; i++) {
    for(var i2 = 0; i2 < BW * BH; i2++) {
      var i1 = bad[i];
      if(i1 == i2) continue;
      var color1 = world[i1];
      var x1 = i1 % BW;
      var y1 = Math.floor(i1 / BW);
      var color2 = world[i2];
      var x2 = i2 % BW;
      var y2 = Math.floor(i2 / BW);
      if(color1 == N || color2 == N || color2 == I) continue;
      if(hexDist(x1, y1, x2, y2) < 3) continue; //posok function needs to know exact neighborhood closer than this, cannot use it when swapping nearby tiles
      if(posok(x1, y1, color2, false) && posok(x2, y2, color1, false)) {
        world[i1] = color2;
        world[i2] = color1;
        break;
      }
    }
  }
}

function setWorld(x, y, color) {
  world[arCo(x, y)] = color;
}

function getWorld(x, y) {
  return world[arCo(x, y)];
}

//the 3 values are: N bridge, NE bridge, SE bridge
//the value interpretation is bridge color, or N for none
var bridges = [];
for(var y = 0; y < BH; y++)
for(var x = 0; x < BW; x++)
{
  bridges[arCo(x, y)] = [ N, N, N ];
}

//the 2 values are: building type, color
var buildings = [];
for(var y = 0; y < BH; y++)
for(var x = 0; x < BW; x++)
{
  buildings[arCo(x, y)] = [ B_NONE, N ];
}

function setBuilding(x, y, building, color) {
  buildings[arCo(x, y)] = [building, color];
}

function getBuilding(x, y) {
  return buildings[arCo(x, y)];
}

//returns tiles connected to the given tile by bridge or direct adjacency (that is, everything that connects towns or allows power leeching), as array of [x,y] coordinates
function getConnectedTiles(tx, ty) {
  var result = [];
  for(var y = ty - 2; y <= ty + 2; y++)
  for(var x = tx - 2; x <= tx + 2; x++)
  {
    if(outOfBounds(x, y)) continue;
    if(x == tx && y == ty) continue;
    var tile = getWorld(x, y);
    if(tile == I) {
      if(getBuilding(x, y)[0] == B_MERMAIDS && hexDist(x, y, tx, ty) == 1) result.push([x, y]);
      else continue;
    }
    if(tile == N) continue;
    if(landConnected(x, y, tx, ty)) {
      result.push([x, y]);
    }
  }
  return result;
}

//returns the 6 neighbors (or less if at the sides)
function getNeighborTiles(x, y) {
  var result = [];
  var dirs = [D_NE, D_E, D_SE, D_SW, D_W, D_NW];
  for(var i = 0; i < dirs.length; i++) {
    var t = dirCo(x, y, dirs[i]);
    if(t) result.push(t);
  }
  return result;
}

//returns all tiles up to (and including) that radius, except the center tile itself. E.g. for radius 1, it has a similar result (except ordering) as getNeighborTiles.
function getTilesWithinRadius(x, y, radius) {
  var result = [];
  for(var y2 = y - radius; y2 <= y + radius; y2++)
  for(var x2 = x - radius; x2 <= x + radius; x2++)
  {
    var dist = hexDist(x, y, x2, y2);
    if(dist <= radius && dist > 0) result.push([x2, y2]);
  }
  return result;
}

var TOWNWAMOUNT = 4; //number of buildings required to form a town (an SA counts for two)

function calculateClustersGeneric(clusters, clustermap, isBuildingFun, getConnectedTilesFun) {
  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    clustermap[arCo(x, y)] = 0;
  }
  clusters.length = 0; //clear an array while keeping the references to it
  clusters[0] = {};
  clusters[0].tiles = [];
  clusters[0].power = 0;
  clusters[0].townamount = 0;
  clusters[0].networkamount = 0;

  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    if(clustermap[arCo(x, y)] != 0) continue;
    var b = getBuilding(x, y);
    if(!isBuildingFun(b[0])) continue;
    var stack = [[x, y]];
    var newclusterindex = clusters.length;
    clusters[newclusterindex] = {};
    var cluster = clusters[newclusterindex];
    cluster.tiles = [];
    cluster.power = 0;
    cluster.townamount = 0;
    cluster.networkamount = 0;
    cluster.color = b[1];
    var player = players[colorToPlayerMap[cluster.color]];
    while(stack.length > 0) {
      var t = stack.pop();
      if(clustermap[arCo(t[0], t[1])] != 0) continue; //already handled
      var b2 = getBuilding(t[0], t[1]);
      if(!isBuildingFun(b2[0]) || b2[1] != b[1]) continue;
      clustermap[arCo(t[0], t[1])] = newclusterindex;
      cluster.tiles.push(t);
      // The values for forming a town, when power is >= 7 (or >= 6 for some players), and amount >= 4, it's a town (Sanctuary has getBuildingTownSize=2 to represent its ability to form a town with 3 buildings, so 4 always works)
      // NOTE: for the end game network scoring, use "tiles.length" instead (and call this with the reachable rather than connected tiles function)
      cluster.power += getBuildingPower(b2[0]);
      cluster.townamount += getBuildingTownSize(b2[0]);
      cluster.networkamount += (b2[0] == B_MERMAIDS ? 0 : 1);
      stack = stack.concat(getConnectedTilesFun(player, t[0], t[1]));
    }
  }
}

//for biggest network end game scoring.
var networkclusters = [];
var networkmap = [];

function calculateNetworkClusters() {
  calculateClustersGeneric(networkclusters, networkmap, function(b) { return b!= B_NONE && b != B_MERMAIDS }, function(player, x, y) {
    return getReachableTiles(player, x, y, true);
  });
}

//get biggest network of this player. Precondition: calculateNetworkClusters() must have been called
function getBiggestNetwork(player) {
  var result = 0;
  for(var i = 0; i < networkclusters.length; i++) {
    if(networkclusters[i].color == player.color) result = Math.max(result, networkclusters[i].networkamount);
  }
  return result;
}


//clusters and the townmap, for clusters of buildings (potentially forming a town). All buildings touching or connected by bridge form a cluster.
//The townmap value is an index in the clusters array.
//An element of the clusters array, is an array of coordinates forming that cluster. Each coordinate itself is of the form [x,y]
var townclusters = [];
var townmap = [];

function calculateTownClusters() {
  calculateClustersGeneric(townclusters, townmap, function(b) { return b!= B_NONE }, function(player, x, y) {
    //player parameter ignored
    return getConnectedTiles(x, y);
  });
}

//index must be > 0
function getTownClusterColor(index) {
  return townclusters[index].color;
}

//returns whether new town is formed after an upgrade of an existing building. reqpower = 6 or 7
//returns empty array if no town is formed, array with the cluster index of which this building was part otherwise (for consistency with the next functions)
function makesNewTownByUpgrade(x, y, building, reqpower) {
  if(building == B_TE) return false; //TP->TE keeps same power, no new town can be formed this way
  var index = townmap[arCo(x, y)];
  var cluster = townclusters[index];
  var power = cluster.power + 1; //all upgrades increase power by one, except to TE which is already canceled out above.
  var amount = cluster.townamount + (building == B_SA ? 1 : 0); //sanctuary counts for amount 2
  if(amount >= TOWNWAMOUNT && power >= reqpower) {
    //only if it makes new town, not if it already existed before as town.
    //so either if the power reached exactly the required power, or, in case of SA upgrade, the amount reached the exact required amount
    if(power == reqpower || (amount == TOWNWAMOUNT && amount != cluster.townamount)) return [index]
    return [];
  }
  return [];
}

//returns if connecting these tiles (by bridge or new building) forms a new town
//tiles = array of tile coordinates involved in the connecting
//currentpower/currentamount: power and amount already involved before the connection (= the new building that connects them)
//returns empty array if no town is formed, array of all the connected clusters otherwise (can be more than 1 if multiple clusters got joined together: they don't get a new single index at this point)
function makesNewTownByConnectingTiles(tiles, currentpower, currentamount, reqpower, color) {
  var clusters = {}; //amount of clusters touched by this tile
  for(var i = 0; i < tiles.length; i++) {
    var t = tiles[i];
    var c = townmap[arCo(t[0], t[1])];
    if(c == 0) continue;
    clusters[c] = 1;
  }
  var power = currentpower;
  var amount = currentamount;
  var result = [];
  for(var c in clusters) {
    if(!clusters.hasOwnProperty(c)) continue;
    if(getTownClusterColor(c) != color) continue;
    var cluster = townclusters[c];
    var subpower = cluster.power
    var subamount = cluster.townamount;
    if(subpower >= reqpower && subamount >= TOWNWAMOUNT) return false; //already touches an existing town, no new town formed
    power += subpower;
    amount += subamount;
    result.push(c);
  }
  if(power >= reqpower && amount >= TOWNWAMOUNT) {
    return result;
  } else {
    return [];
  }
}

//returns whether new town is formed building a new dwelling or mermaids town connection tile. reqpower = 6 or 7
//returns empty array if no town is formed, array of all the connected clusters otherwise (can be more than 1 if multiple clusters got joined together, they don't get a new single index at this point however)
function makesNewTownByBuilding(x, y, building, reqpower, color) {
  var tiles = getConnectedTiles(x, y);
  return makesNewTownByConnectingTiles(tiles, getBuildingPower(building), getBuildingTownSize(building), reqpower,  color);
}

//returns whether new town is formed when placing a bridge there. reqpower = 6 or 7
//precondition: must be a legal new bridge
//returns empty array if no town is formed, array of all the connected clusters otherwise (can be more than 1 if multiple clusters got joined together, they don't get a new single index at this point however)
function makesNewTownByBridge(x0, y0, x1, y1, reqpower, color) {
  return makesNewTownByConnectingTiles([[x0, y0], [x1, y1]], 0, 0, reqpower,  color);
}

//whether this tile is part of, or touches, an existing town
function touchesExistingTown(x, y, color) {
  var tiles = getConnectedTiles(x, y);
  tiles.push([x, y]);

  for(var i = 0; i < tiles.length; i++) {
    if(getWorld(tiles[i][0], tiles[i][1]) == color && isInTown(tiles[i][0], tiles[i][1])) return true;
  }

  return false;
}

//returns the largest town cluster (by power) of that color that this touches (including itself), or null if none
function mostPowerfulTouchedCluster(x, y, color) {
  var tiles = getConnectedTiles(x, y);
  tiles.push([x, y]);
  var power = 0;
  var result = null;

  for(var i = 0; i < tiles.length; i++) {
    var x = tiles[i][0];
    var y = tiles[i][1];
    var index = townmap[arCo(x, y)];
    if(!index) continue;
    var cluster = townclusters[index];
    if(cluster && getTownClusterColor(index) == color && cluster.power > power) {
      power = cluster.power;
      result = cluster;
    }
  }

  return result;
}

function addToTestConnections(testconnections, co0, co1) {
  var i0 = arCo(co0[0], co0[1]);
  if(!testconnections[i0]) testconnections[i0] = [];
  var o = testconnections[i0];
  o.push([co1[0], co1[1]]);
}

function getConnectedTilesWithTestConnections(x, y, testconnections) {
  var tiles = getConnectedTiles(x, y);

  var o = testconnections[arCo(x, y)];
  if(o) {
    for(var i = 0; i < o.length; i++) tiles.push(o[i]);
  }

  return tiles;
}

//for checking whether an action forms a town
//updates the given town clusters based on the given action, merging or increasing them as needed
//returns an array as follows: [changed cluster, [removed clusters], extrapower, extraamount], where all clusters are indicated by their index in the new cluster map
//removed clusters still have an index in testclusters, but no tile in testmap refers to them anymore:
//they are obsolete (and all part of the changed cluster), but are kept to check what their old sizes were.
//the removed clusters will also get a new member "obsolete" containing the index of the new cluster they point to
//extrapower and extraamount is what the action itself adds (e.g. a house adds 1 power and amount, while a bridge adds nothing)
//testconnections is a map of tiles to an array of tile coordinates they connect to, to keep track of additional bridges added that are not yet known by the getConnectedTiles function.
function updateTestClusters(action, testclusters, testmap, testconnections, color) {
  if(isBridgeAction(action)) {
    var i0 = testmap[arCo(action.cos[0][0], action.cos[0][1])];
    var i1 = testmap[arCo(action.cos[1][0], action.cos[1][1])];
    if(i0 == i1 || i0 == 0 || i1 == 0) return [0, [], 0, 0]; //bridge connecting its own or an empty cluster does nothing

    var oldc0 = testclusters[i0];
    var oldc1 = testclusters[i1];
    if(oldc0.color != color || oldc1.color != color) return [0, [], 0, 0];

    //merge the two clusters into a new one
    var newi = testclusters.length; //index of new cluster
    testclusters[newi] = {};
    var newc = testclusters[newi];
    newc.tiles = [];
    newc.power = oldc0.power + oldc1.power;
    newc.townamount = oldc0.townamount + oldc1.townamount;
    newc.networkamount = oldc0.networkamount + oldc1.networkamount;
    newc.color = color;
    for(var i = 0; i < oldc0.tiles.length; i++) newc.tiles.push(oldc0.tiles[i]);
    for(var i = 0; i < oldc1.tiles.length; i++) newc.tiles.push(oldc1.tiles[i]);
    for(var i = 0; i < newc.tiles.length; i++) testmap[arCo(newc.tiles[i][0], newc.tiles[i][1])] = newi;

    addToTestConnections(testconnections, action.co[0], action.co[1]);
    addToTestConnections(testconnections, action.co[1], action.co[0]);
    
    oldc0.obsolete = newi;
    oldc1.obsolete = newi;

    return [newi, [i0, i1], 0, 0];
  }
  if(isTownyBuildAction(action)) {
    var x = action.co[0];
    var y = action.co[1];
    var tiles = getConnectedTilesWithTestConnections(x, y, testconnections);
    var clusters = {}; //amount of clusters touched by this tile
    for(var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      var c = testmap[arCo(t[0], t[1])];
      if(c == 0) continue;
      clusters[c] = 1;
    }

    var clusterarray = []; //array of cluster indices of relevant clusters
    for(var c in clusters) {
      if(!clusters.hasOwnProperty(c)) continue;
      if(testclusters[c].color != color) continue;
      clusterarray.push(c);
    }

    if(clusterarray.length == 0) {
      var newc = {};
      var newi = testclusters.length;
      testclusters.push(newc);
      newc.tiles = [[x,y]];
      newc.power = 0;
      newc.townamount = 0;
      newc.networkamount = 0;
      newc.color = color;
      testmap[arCo(x, y)] = newi;

      if(action.type != A_CONNECT_WATER_TOWN) {
        newc.power++;
        newc.townamount++;
        newc.networkamount++;
        return [newi, [], 1, 1];
      }
      else return [newi, [], 0, 0];
    }
    else if(clusterarray.length == 1) {
      var c = clusterarray[0]; //affected cluster index
      var cluster = testclusters[c];
      cluster.tiles.push([x, y]);
      testmap[arCo(x, y)] = c;
      if(action.type != A_CONNECT_WATER_TOWN) {
        cluster.power++;
        cluster.townamount++;
        cluster.networkamount++;
        return [c, [], 1, 1];
      }
      else return [c, [], 0, 0];
    } else {
      var newc = {};
      var newi = testclusters.length;
      testclusters.push(newc);
      newc.tiles = [[x,y]];
      newc.power = 0;
      newc.townamount = 0;
      newc.networkamount = 0;
      newc.color = color;
      for(var j = 0; j < clusterarray.length; j++) {
        var oldc = testclusters[clusterarray[j]];
        for(var i = 0; i < oldc.tiles.length; i++) newc.tiles.push(oldc.tiles[i]);
        newc.power += oldc.power;
        newc.townamount += oldc.townamount;
        newc.networkamount += oldc.networkamount;
        oldc.obsolete = testclusters.length - 1;
      }
      for(var i = 0; i < newc.tiles.length; i++) testmap[arCo(newc.tiles[i][0], newc.tiles[i][1])] = newi;

      if(action.type != A_CONNECT_WATER_TOWN) {
        newc.power++;
        newc.townamount++;
        newc.networkamount++;
        return [newi, clusterarray, 1, 1];
      }
      else return [newi, clusterarray, 0, 0];
    }
  }
  else if (isUpgradeAction(action) && getUpgradeActionOutputBuilding(action) != B_TE) {
    var c = testmap[arCo(action.co[0], action.co[1])];
    var cluster = testclusters[c];
    cluster.power++;
    if(getUpgradeActionOutputBuilding(action) == B_SA) cluster.townamount++;
    return [c, [], 1, 0];
  }

  return [0, [], 0, 0];
}

//if multiple actions in the same sequence together form a town, the above functions miss it. This is a heavy duty one for those cases.
//For example for:
//-placing mermaids tile after upgrading or building something.
//-chaos magicians double action
//-halflings upgrade to SH, then dig and build dwelling next to it
//It returns the cluster indices of towns formed by the given action.
//It only returns towns formed by action. It takes previous actions from the actions array into account (e.g. building size increases they make),
//but will not return towns already completely formed by those earlier actions.
function actionsMakeTown(player, actions, action) {
  // TODO! make a copy of all the cluster information and virtually work on them
  var testclusters = clone(townclusters);
  var testmap = clone(townmap);
  var testconnections = {};

  var reqpower = getTownReqPower(player);
  var involved = {}; //the indices of the clusters involved in the towns (to avoid duplicates, e.g when both upgrading to SA and taking 6 town size tile)

  for(var i = 0; i < actions.length; i++) {
    var a = actions[i];
    var iscurrent = a == action;

    //favtiles must be checked first, for when you pick fav tile for town size 6 and at the same time upgrade to SA making some town size 6.
    for(var j = 0; j < a.favtiles.length; j++) {
      if(a.favtiles[j] == T_FAV_2R_6TW) {
        reqpower = 6; //from now on for next actions this reqpower is used
        if(iscurrent) {
          var tw = getPlayerTownsOfSize6(player.color, testclusters);
          for(var k = 0; k < tw.length; k++) involved[tw[k]] = 1;
        }
      }
    }

    var result = updateTestClusters(a, testclusters, testmap, testconnections, player.color);
    var c = result[0];
    
    if(c != 0 && iscurrent && testclusters[c].power >= reqpower && testclusters[c].townamount >= 4) {
      var oldc = result[1];
      var extrapower = result[2];
      var extraamount = result[3];

      if(oldc.length == 0) {
        var oldpower = testclusters[c].power - extrapower;
        var oldamount = testclusters[c].townamount - extraamount;
        if(oldpower < reqpower || oldamount < 4) {
          involved[c] = 1;
        }
      } else {
        var already = false; //was one of the old clusters already a town?
        for(var j = 0; j < oldc.length; j++) {
          if(testclusters[oldc[j]].power >= reqpower && testclusters[oldc[j]].townamount >= 4) {
            already = true;
            break;
          }
        }
        if(!already) {
          involved[c] = 1;
        }
      }
    }

    if(iscurrent) break; //the next actions don't matter anymore for this check
  }

  var num = 0;
  for(i in involved) {
    if(!involved.hasOwnProperty(i)) continue;
    num++;
  }

  //if there are no more town tiles left, it does not count, not even for extra VP bonus, swarmlings 2 workers, etc...
  return Math.min(num, townTilesAvailable(num));
}


//This is for identifying new towns of power 6 after getting that favor tile
//returns array of cluster indices
function getPlayerTownsOfSize6(color, clusters) {
  var result = [];
  for(var i = 1; i < clusters.length; i++) {
    if(getTownClusterColor(i) == color && clusters[i].power == 6 && clusters[i].townamount >= TOWNWAMOUNT && !clusters[i].obsolete) result.push(i);
  }
  return result;
}

function townClusterContains(index, x, y) {
  return townmap[arCo(x, y)] == index;
}

function isInTown(x, y) {
  var index = townmap[arCo(x, y)];
  if(!index) return false;
  var cluster = townclusters[index];
  var color = getTownClusterColor(index);
  var player = players[colorToPlayerMap[color]];
  return cluster && cluster.power >= getTownReqPower(player) && cluster.townamount >= 4;
}


//out of range of the hex board
function outOfBounds(x, y) {
  return x < 0 || y < 0 || x >= BW || y >= BH || (y % 2 == 1 && x == BW - 1);
}

//costly: whether to include connections with extra cost: dwarves tunneling and fakirs carpets
function networkConnected(player, x0, y0, x1, y1, costly) {
  if(landConnected(x0, y0, x1, y1)) {
    return true;
  }
  if(waterDistance(x0, y0, x1, y1) <= getShipping(player) /*this should be always 0 for dwarves and fakirs, hence correctly supporting their non-shipping*/) {
    return true;
  }
  if(costly && factionConnected(player, x0, y0, x1, y1)) {
    return true;
  }
  return false;
}

//is this tile in reach by one of the buildings of this color?
//costly: whether to include connections with extra cost: dwarves tunneling and fakirs carpets
function inReach(player, x, y, costly) {
  var color = player.color;
  var extra = getShipping(player);
  if(player.faction == F_DWARVES) extra = 2;
  if(player.faction == F_FAKIRS) extra = 3;
  if(extra < 1) extra = 1; //for bridges
  for(tx = x - extra - 1; tx <= x + extra + 1; tx++)
  for(ty = y - extra - 1; ty <= y + extra + 1; ty++) {
    if(outOfBounds(tx, ty)) continue;
    var building = buildings[arCo(tx, ty)];
    if(building[0] == B_NONE || building[0] == B_MERMAIDS || building[1] != color) continue;
    if(networkConnected(player, x, y, tx, ty, costly)) {
      return true;
    }
  }
  return false;
}

//get all tiles reachable from x,y for the given player (this assumes the player has a building on x,y), reachable through shipping etc... too.
//costly: whether to include connections with extra cost: dwarves tunneling and fakirs carpets
function getReachableTiles(player, x, y, costly) {
  var result = [];
  var color = player.color;
  var extra = getShipping(player);
  if(player.faction == F_DWARVES) extra = 2;
  if(player.faction == F_FAKIRS) extra = 3;
  if(extra < 1) extra = 1; //for bridges
  for(tx = x - extra - 1; tx <= x + extra + 1; tx++)
  for(ty = y - extra - 1; ty <= y + extra + 1; ty++) {
    if(outOfBounds(tx, ty)) continue;
    if(networkConnected(player, x, y, tx, ty, costly)) {
      result.push([tx,ty]);
    }
  }
  return result;
}

//this is for fakirs carpets and dwarves tunneling. Only returns true if it is the exact required distance.
//does not check for whether it's land and stuff.
function factionConnected(player, x0, y0, x1, y1) {
  if(player.faction == F_FAKIRS) {
    if(built_sh(player) && hexDist(x0, y0, x1, y1) == 3) return true;
    if(hexDist(x0, y0, x1, y1) == 2) return true;
  }
  else if(player.faction == F_DWARVES) {
    if(hexDist(x0, y0, x1, y1) == 2) return true;
  }
  return false;
}

function onlyReachableThroughFactionSpecial(player, x, y) {
  if(player.faction != F_FAKIRS && player.faction != F_DWARVES) return false;
  return !hasOwnNeighbor(x, y, player.color) && inReach(player, x, y, true);
}

function onlyReachableThroughFactionSpecialWithBackupWorldBuildings(player, x, y, backupbuildings) {
  if(player.faction != F_FAKIRS && player.faction != F_DWARVES) return false;
  var backup2 = buildings;
  buildings = backupbuildings;
  var result = onlyReachableThroughFactionSpecial(player, x, y);
  buildings = backup2;
  return result;
}

//is a building of anything but your color in reach? requires a shipping array with the color as index
//function inReachByOpponent(x, y, color, shiparray) {
  //var shipping = 0;
  //for(var i = 0; i < shiparray.length; i++) shipping = Math.max(shipping, shiparray[i]);
  //var extra = shipping;
  //if(extra < 1) extra = 1; //for bridges
  //for(tx = x - extra - 1; tx <= x + extra + 1; tx++)
  //for(ty = y - extra - 1; ty <= y + extra + 1; ty++) {
    //if(outOfBounds(tx, ty)) continue;
    //var rcolor = buildings[arCo(tx, ty)][1];
    //if(rcolor == color) continue; //own buildings don't count
    //if(landConnected(x, y, tx, ty)) {
      //return true;
    //}
    //if(waterDistance(x, y, tx, ty) <= shiparray[rcolor]) {
      //return true;
    //}
  //}
  //return false;
//}

function hexDist(x0, y0, x1, y1) {
  function sign(x) { return x ? x < 0 ? -1 : 1 : 0; }
  var dx = (x1 - Math.floor(y1/2)) - (x0 - Math.floor(y0/2));
  var dy = y1 - y0;

  if(sign(dx) == sign(dy))
    return Math.abs(dx + dy);
  else
    return Math.max(Math.abs(dx), Math.abs(dy));
}

//get dir from 0 to 1
function getBridgeDir(x0, y0, x1, y1) {
  if(x0 == x1 && y0 == y1 + 2) return D_N;
  if(x0 == (y0 % 2 ? x1 - 2 : x1 - 1) && y0 == y1 + 1) return D_NE;
  if(x0 == (y0 % 2 ? x1 - 2 : x1 - 1) && y0 == y1 - 1) return D_SE;
  if(x0 == x1 && y0 == y1 - 2) return D_S;
  if(x0 == (y0 % 2 ? x1 + 1 : x1 + 2) && y0 == y1 - 1) return D_SW;
  if(x0 == (y0 % 2 ? x1 + 1 : x1 + 2) && y0 == y1 + 1) return D_NW;
  return D_INVALID;
}

function addBridge(x0, y0, x1, y1, color) {
  if(y0 < y1) {
    var temp;
    temp = x0; x0 = x1; x1 = temp;
    temp = y0; y0 = y1; y1 = temp;
  }
  var dir = getBridgeDir(x0, y0, x1, y1);

  if(dir == D_NE) {
    bridges[arCo(x0, y0)][1] = color;
  }
  else if(dir == D_NW) {
    var co = dirCo(x0 - 1, y0, D_NW);
    bridges[arCo(co[0], co[1])][2] = color;
  }
  else if(dir == D_N) {
    bridges[arCo(x0, y0)][0] = color;
  }
}

//returns the bridge color at that area, or N if no bridge
function getBridge(x0, y0, x1, y1, color) {
  if(y0 < y1) {
    var temp;
    temp = x0; x0 = x1; x1 = temp;
    temp = y0; y0 = y1; y1 = temp;
  }
  var dir = getBridgeDir(x0, y0, x1, y1);

  if(dir == D_NE) {
    return bridges[arCo(x0, y0)][1];
  }
  else if(dir == D_NW) {
    var co = dirCo(x0 - 1, y0, D_NW);
    return bridges[arCo(co[0], co[1])][2];
  }
  else if(dir == D_N) {
    return bridges[arCo(x0, y0)][0];
  }
  return N;
}

//is tile occupied by color?
function isOccupiedBy(x, y, color) {
  return getBuilding(x, y)[0] != B_NONE && getBuilding(x, y)[1] == color;
}

//is tile occupied by anyone?
function isOccupied(x, y) {
  return getBuilding(x, y)[0] != B_NONE;
}

//is tile occupied by anything but that color?
function isOccupiedByOther(x, y, color) {
  return getBuilding(x, y)[0] != B_NONE && getBuilding(x, y)[1] != color;
}

/*
conditions for bridge:
2 tiles distance two with corners towards each other
water on both bridge sides
land on both bridge ends
no other bridge there yet already
player building of their color on at least one side
*/
function canHaveBridge(x0, y0, x1, y1, color) {
  if(y0 < y1) {
    var temp;
    temp = x0; x0 = x1; x1 = temp;
    temp = y0; y0 = y1; y1 = temp;
  }
  if(outOfBounds(x0, y0) || outOfBounds(x1, y1)) return false;
  if(!isOccupiedBy(x0, y0, color) && !isOccupiedBy(x1, y1, color)) return false;
  if(getWorld(x0, y0) == N || getWorld(x1, y1) == N) return false;
  if(getBridge(x0, y0, x1, y1) != N) return false; //already bridge there
  var co1;
  var co2;

  var dir = getBridgeDir(x0, y0, x1, y1);

  if(dir == D_NE) {
    co1 = dirCo(x0, y0, D_NE);
    co2 = dirCo(x0, y0, D_E);
  }
  else if(dir == D_NW) {
    co1 = dirCo(x0, y0, D_NW);
    co2 = dirCo(x0, y0, D_W);
  }
  else if(dir == D_N) {
    co1 = dirCo(x0, y0, D_NE);
    co2 = dirCo(x0, y0, D_NW);
  }
  else return false;

  if(!co1 || !co2) return false; //vertical at edge of map
  
  return world[arCo(co1[0], co1[1])] == I && world[arCo(co2[0], co2[1])] == I
   && world[arCo(x0, y0)] != I && world[arCo(x1, y1)] != I;
}

//init an array to become an array of size BH*BW with the given value in each element
function initWorldArray(array, value) {
  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    array[arCo(x, y)] = value;
  }
}

var waterDistanceCalculated = [];
initWorldArray(waterDistanceCalculated, false);

//TODO: now it returns 999 for two neighboring land tiles (not touching water). Make it return 0 for that?
function waterDistance(x0, y0, x1, y1) {
  if(!waterDistanceCalculated[arCo(x0, y0)]) {
    //Dijkstra
    var dist = []; //node values array
    initWorldArray(dist, 999); //999 represents infinity since it's bigger than the board
    dist[arCo(x0, y0)] = 0;
    var visited = []; //node visited array
    initWorldArray(visited, false);
    visited[arCo(x0, y0)] = true;
    var queue = [[x0, y0]];
    
    while(queue.length > 0)
    {
      var co = queue.shift();
      var x = co[0];
      var y = co[1];
      var d = dist[arCo(x, y)];
      var neighbors = getNeighborTiles(x, y);
      for(var i = 0; i < neighbors.length; i++)
      {
        var nx = neighbors[i][0];
        var ny = neighbors[i][1];
        if(visited[arCo(nx, ny)]) continue;
        if(world[arCo(nx, ny)] == I || world[arCo(x, y)] == I)
        {
          visited[arCo(nx, ny)] = true;

          if(world[arCo(nx, ny)] == I) {
            dist[arCo(nx, ny)] = d + 1;
            queue.push([nx, ny]);
          } else {
            //not +1 because water distance counts only water tiles,
            // not the final land tile
            dist[arCo(nx, ny)] = d;
          }
        }
      }
    }
    waterDistanceCalculated[arCo(x0, y0)] = dist;
  }

  return waterDistanceCalculated[arCo(x0, y0)][arCo(x1, y1)];
}

//returns if two land tiles are connected, either due to touching, or due to bridge between them
function landConnected(x0, y0, x1, y1) {
  return hexDist(x0, y0, x1, y1) == 1 || getBridge(x0, y0, x1, y1) != N;
}

//do NOT use this for giants, use digDist in rules.js for player-dependent dig distance
function colorDist(color1, color2) {
  var result = Math.abs(color2 - color1);
  if(result > 3) result = 7 - result;
  return result;
}

//get the color 1 closer from color1 to color2
//it must be two different colors
function digColor(color1, color2) {
  var diff = color2 - color1;
  var result;
  if(Math.abs(diff) <= 3) result = color1 + (diff > 0 ? 1 : -1);
  else result = color1 + (diff > 0 ? -1 : 1);
  if(result == 8) result = 1;
  if(result == 0) result = 7;
  return result;
}

//has tile a building from a neighbor of another color? includes bridges
function hasNeighbor(x, y, color) {
  var tiles = getConnectedTiles(x, y);
  for(var i = 0; i < tiles.length; i++) {
    if(isOccupiedByOther(tiles[i][0], tiles[i][1], color)) return true;
  }
  return false;
}

//returns whether this tile has a neighboring color from yourself (including over bridges)
function hasOwnNeighbor(x, y, color) {
  var tiles = getConnectedTiles(x, y);
  for(var i = 0; i < tiles.length; i++) {
    if(isOccupiedBy(tiles[i][0], tiles[i][1], color)) return true;
  }
  return false;
}

//returns whether this tile has a neighboring color from yourself (only touching on land, no bridges, hex dist 1 only) --> for sandstorm
function hasOwnNeighborNoBridge(x, y, color) {
  var co;
  co = dirCo(x, y, D_NE);
  if(co != null && isOccupiedBy(co[0], co[1], color)) return true;
  co = dirCo(x, y, D_E);
  if(co != null && isOccupiedBy(co[0], co[1], color)) return true;
  co = dirCo(x, y, D_SE);
  if(co != null && isOccupiedBy(co[0], co[1], color)) return true;
  co = dirCo(x, y, D_SW);
  if(co != null && isOccupiedBy(co[0], co[1], color)) return true;
  co = dirCo(x, y, D_W);
  if(co != null && isOccupiedBy(co[0], co[1], color)) return true;
  co = dirCo(x, y, D_NW);
  if(co != null && isOccupiedBy(co[0], co[1], color)) return true;
}
