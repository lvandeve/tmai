/* world6.js
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


//when forming a town, you need 4 buildings in the cluster. However, the mermaids skipped river tile does not count, and the sanctuary counts for 2. This function encapsulates that knowledge.
//given building may not be B_NONE or undefined.
function getBuildingTownSize(building) {
  if(building == B_MERMAIDS) return 0;
  if(building == B_SA) return 2;
  return 1;
}

//Grid coordinates to array coordinates
function arCo(x, y) {
  return y * game.bw + x;
}

function arCo2(x, y, bw) {
  return y * bw + x;
}

//returns coordinates of neighbor tile in given direction
function dirCo(x, y, dir, btoggle) {
  var togglemod = (btoggle ? 0 : 1);
  if(dir == D_NE) result = [(y % 2 == togglemod) ? x + 1 : x, y - 1];
  else if(dir == D_E) result = [x + 1, y];
  else if(dir == D_SE) result = [(y % 2 == togglemod) ? x + 1 : x, y + 1];
  else if(dir == D_SW) result = [(y % 2 == togglemod) ? x : x - 1, y + 1];
  else if(dir == D_W) result = [x - 1, y];
  else if(dir == D_NW) result = [(y % 2 == togglemod) ? x : x - 1, y - 1];
  else return null; //ERROR
  if(outOfBounds(result[0], result[1])) return null; //out of bounds
  return result;
}

//returns coordinates of other side of bridge pointing in that direction
function bridgeCo(x, y, dir, btoggle) {
  var togglemod = (btoggle ? 0 : 1);
  if(dir == D_N) return [x, y - 2];
  if(dir == D_NE) return [(y % 2 == togglemod) ? x + 2 : x + 1, y - 1];
  if(dir == D_SE) return [(y % 2 == togglemod) ? x + 2 : x + 1, y + 1];
  if(dir == D_S) return [x, y + 2];
  if(dir == D_SW) return [(y % 2 == togglemod) ? x - 1 : x - 2, y + 1];
  if(dir == D_NW) return [(y % 2 == togglemod) ? x - 1 : x - 2, y - 1];
  return [x, y]; //ERROR
}

var worldNames = []; // names for the dropdown
var worldGenerators = []; // array of functions that generate a world: takes parameter "game", sets game.bw, game.bh, game.btoggle and game.world array.
var worldCodeNames = [];
var codeNameToWorld = {}; //name to index

function registerWorld(name, codename, fun) {
  worldNames.push(name);
  worldCodeNames.push(codename);
  worldGenerators.push(fun);
  codeNameToWorld[codename] = worldNames.length - 1;
}


registerWorld('Standard', 'standard', initStandardWorld);
registerWorld('Randomized*', 'randomized', bind(randomizeWorld, false));
registerWorld('Randomized Small*', 'randomized_small', bind(randomizeWorld, true));

var standardWorld = [U,S,G,B,Y,R,U,K,R,G,B,R,K,
                      Y,I,I,U,K,I,I,Y,K,I,I,Y,N,
                     I,I,K,I,S,I,G,I,G,I,S,I,I,
                      G,B,Y,I,I,R,B,I,R,I,R,U,N,
                     K,U,R,B,K,U,S,Y,I,I,G,K,B,
                      S,G,I,I,Y,G,I,I,I,U,S,U,N,
                     I,I,I,S,I,R,I,G,I,Y,K,B,Y,
                      Y,B,U,I,I,I,B,K,I,S,U,S,N,
                     R,K,S,B,R,G,Y,U,S,I,B,G,R];


//The world array has the color of each hex. It is inited with the standard world map.
function initStandardWorld(game) {
  game.bw = 13;
  game.bh = 9;
  game.btoggle = false;
  game.world = clone(standardWorld);
}

function randomizeWorld(small) {
  var world = game.world;
  game.btoggle = false;

  var NUMISLANDS = 5;
  var NUMPERCOLOR = 11;
  if(small) {
    game.bh = 7;
    game.bw = 11;
    NUMISLANDS = 4;
    NUMPERCOLOR = 7;
  } else {
    game.bw = 13;
    game.bh = 9;
  }

  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
  {
    world[y * game.bw + x] = outOfBounds(x, y) ? N : I;
  }

  var done = 0;
  while(done < NUMISLANDS) {
    var r = done == 0 ? 0 : done == 1 ?
        (game.bw - 1) : done == 2 ?
        (game.bw * game.bh - 1) : done == 3 ?
        (game.bw * game.bh - game.bw) : Math.floor((game.bw * game.bh / 2));
    if(world[r] != I) continue;
    world[r] = R + done;
    done++;
  }

  done = 0;
  var attempt = 0;
  while(done < NUMPERCOLOR * 7 - NUMISLANDS) {
    attempt++;
    var r = randomInt(game.bw * game.bh);
    if(world[r] != I) continue;
    var x = r % game.bw;
    var y = Math.floor(r / game.bw);
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
  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
  {
    var i = y * game.bw + x;
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
  var colors = [Y, B, U, K, G, S, R];
  for(var c = 0; c < colors.length; c++) {
    done = 0;
    attempt = 0;
    while(done < NUMPERCOLOR) {
      var i = randomIndex(landtiles);
      var r = landtiles[i];
      var x = r % game.bw;
      var y = Math.floor(r / game.bw);
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
  };
  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
  {
    if(isPond(x, y)) bad.push(arCo(x, y));
  }

  //fix up bad ones, e.g. for the last color it did it's likely there are bad positions
  for(var i = 0; i < bad.length; i++) {
    for(var i2 = 0; i2 < game.bw * game.bh; i2++) {
      var i1 = bad[i];
      if(i1 == i2) continue;
      var color1 = world[i1];
      var x1 = i1 % game.bw;
      var y1 = Math.floor(i1 / game.bw);
      var color2 = world[i2];
      var x2 = i2 % game.bw;
      var y2 = Math.floor(i2 / game.bw);
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

//slightly different format than in the savegame: semicolons denote the width
function serializeWorld() {
  var togglemod = (game.btoggle ? 0 : 1);
  var result = '';
  for(var y = 0; y < game.bh; y++) {
    var w = game.bw;
    if(y % 2 == togglemod) {
      result += ' ';
      w--;
    }
    for(var x = 0; x < w; x++) {
      result += colorCodeName[getWorld(x, y)];
      result += ((x + 1 < w) ? ',' : ';');
    }
    if(y + 1 != game.bh) result += '\n';
  }
  return result;
}

//slightly different format than in the savegame: semicolons denote the width
//TODO: let newlines denote the width
//TODO: don't save in global game object but in a given one
function parseWorld(text) {
  var lines = text.split(';');
  game.btoggle = false;
  if(lines.length >= 2 && lines[0][0] == ' ' && lines[1][0] != ' ') game.btoggle = true; //TODO: maybe instead check line 1 has less of any whitespace than line 2...

  var togglemod = (game.btoggle ? 0 : 1);

  game.bh = lines.length - 1;
  game.bw = 0;
  var l = lines[0];
  for(var j = 0; j < l.length; j++) {
    var c = l.charAt(j);
    if(codeNameToColor[c] != undefined) game.bw++;
  }

  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
  {
    setWorld(x, y, (y % 2 == togglemod && x + 1 >= game.bw) ? N : I);
  }

  var x = 0;
  var y = 0;
  for(var i = 0; i < lines.length; i++) {
    var l = lines[i];
    for(var j = 0; j < l.length; j++) {
      var c = l.charAt(j);
      if(codeNameToColor[c] != undefined) {
        setWorld(x, y, codeNameToColor[c]);
        x++;
        if(x >= game.bw || (y % 2 == togglemod && x + 1 >= game.bw)) break;
      }
    }
    x = 0;
    y++;
    if(y >= game.bh) break;
  }
}

function setWorld(x, y, color) {
  game.world[arCo(x, y)] = color;
}

function getWorld(x, y) {
  return game.world[arCo(x, y)];
}

function initBridges(bridges, bw, bh) {
  bridges.length = 0;
  for(var y = 0; y < bh; y++)
  for(var x = 0; x < bw; x++)
  {
    bridges[arCo2(x, y, bw)] = [ N, N, N ];
  }
}

function initBuildings(buildings, bw, bh) {
  buildings.length = 0;
  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
  {
    buildings[arCo2(x, y, bw)] = [ B_NONE, N ];
  }
}

function setBuilding(x, y, building, color) {
  game.buildings[arCo(x, y)] = [building, color];
}

// returns array of [building enum, woodcolor]
function getBuilding(x, y) {
  return game.buildings[arCo(x, y)];
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
    var t = dirCo(x, y, dirs[i], game.btoggle);
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
  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
  {
    clustermap[arCo(x, y)] = 0;
  }
  clusters.length = 0; //clear an array while keeping the references to it
  // TODO: why is this dummy cluster there? Maybe to indicate which tiles belong to no cluster? If so, document that.
  clusters[0] = {};
  clusters[0].color = N; //Not any player
  clusters[0].tiles = [];
  clusters[0].power = 0;
  clusters[0].townamount = 0;
  clusters[0].networkamount = 0;

  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
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
    var player = game.players[woodColorToPlayerMap[cluster.color]];
    if(!player) throw new Error('no player for building color');
    while(stack.length > 0) {
      var t = stack.pop();
      if(clustermap[arCo(t[0], t[1])] != 0) continue; //already handled
      var b2 = getBuilding(t[0], t[1]);
      if(!isBuildingFun(b2[0]) || b2[1] != b[1]) continue;
      clustermap[arCo(t[0], t[1])] = newclusterindex;
      cluster.tiles.push(t);
      // The values for forming a town, when power is >= 7 (or >= 6 for some players), and amount >= 4, it's a town (Sanctuary has getBuildingTownSize=2 to represent its ability to form a town with 3 buildings, so 4 always works)
      // NOTE: for the end game network scoring, use "tiles.length" instead (and call this with the reachable rather than connected tiles function)
      cluster.power += player.getFaction().getBuildingPower(b2[0]);
      cluster.townamount += getBuildingTownSize(b2[0]);
      cluster.networkamount += (b2[0] == B_MERMAIDS ? 0 : 1);
      stack = stack.concat(getConnectedTilesFun(player, t[0], t[1]));
    }
  }
}

//for biggest network end game scoring.
//similar to townclusters and townmap, but for connected networks that span over rivers, dwarve/fakir tunneling, ...
var networkclusters = [];
var networkmap = [];

function calculateNetworkClusters() {
  calculateClustersGeneric(networkclusters, networkmap, function(b) { return b!= B_NONE && b != B_MERMAIDS }, function(player, x, y) {
    return getNetworkConnectedTiles(player, x, y, true, true);
  });
}

//get biggest network of this player. Precondition: calculateNetworkClusters() must have been called
function getBiggestNetwork(player) {
  var result = 0;
  for(var i = 0; i < networkclusters.length; i++) {
    if(networkclusters[i].color == player.woodcolor) result = Math.max(result, networkclusters[i].networkamount);
  }
  return result;
}


//clusters and the townmap, for clusters of buildings (potentially forming a town). All buildings touching or connected by bridge form a cluster.
//The townmap value is an index in the clusters array.
//townclusters is an array with cluster index as index, object with color,tiles(array of[x,y]),power,townamount,netamount as value
//The townmap is an array with world 1D arco coordinate as index, and cluster index as value
var townclusters = [];
var townmap = [];

function calculateTownClusters() {
  calculateClustersGeneric(townclusters, townmap, function(b) { return b!= B_NONE }, function(player, x, y) {
    //player parameter ignored
    return getConnectedTiles(x, y);
  });
}

//index must be > 0. It is an index in the clusters array.
function getTownClusterColor(index) {
  return townclusters[index].color;
}

//returns whether new town is formed after an upgrade of an existing building. reqpower = 6 or 7
//returns empty array if no town is formed, array with the cluster index of which this building was part otherwise (for consistency with the next functions)
function makesNewTownByUpgrade(player, x, y, frombuilding, tobuilding, reqpower) {
  var frompower = player.getFaction().getBuildingPower(frombuilding);
  var topower = player.getFaction().getBuildingPower(tobuilding);
  var diff = topower - frompower;
  if(diff <= 0) return false; //TP->TE keeps same power, no new town can be formed this way
  var index = townmap[arCo(x, y)];
  var cluster = townclusters[index];
  var power = cluster.power + diff; //all upgrades increase power by one, except to TE which is already canceled out above.
  var amount = cluster.townamount + (tobuilding == B_SA ? 1 : 0); //sanctuary counts for amount 2
  if(amount >= TOWNWAMOUNT && power >= reqpower) {
    //only if it makes new town, not if it already existed before as town.
    //so either if the power reached exactly the required power, or, in case of SA upgrade, the amount reached the exact required amount
    if((power >= reqpower && (power - diff < reqpower)) || (amount == TOWNWAMOUNT && amount != cluster.townamount)) return [index]
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
  var player = game.players[woodColorToPlayerMap[color]];
  if(!player) throw new Error('no player for building color');
  return makesNewTownByConnectingTiles(tiles, player.getFaction().getBuildingPower(building), getBuildingTownSize(building), reqpower,  color);
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

function touchesExistingTownWood(x, y, woodcolor) {
  var tiles = getConnectedTiles(x, y);
  tiles.push([x, y]);
  for(var i = 0; i < tiles.length; i++) {
    var build1 = getBuilding(tiles[i][0], tiles[i][1]);     
    if(build1[1] == woodcolor && isInTown(tiles[i][0], tiles[i][1])) return true;
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

    addToTestConnections(testconnections, action.cos[0], action.cos[1]);
    addToTestConnections(testconnections, action.cos[1], action.cos[0]);

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
    var extrapower = 1;
    var extramount = (getUpgradeActionOutputBuilding(action) == B_SA) ? 1 : 0;
    cluster.power += extrapower;
    cluster.townamount += extramount;
    return [c, [], extrapower, extramount];
  }

  return [0, [], 0, 0];
}

//if multiple actions in the same sequence together form a town, actionCreatesTown misses it. This is a heavy duty one for those cases.
//For example for:
//-placing mermaids tile after upgrading or building something.
//-chaos magicians double action
//-halflings upgrade to SH, then dig and build dwelling next to it
//It returns the amount of towns formed by the given action.
//It only returns towns formed by action. It takes previous actions from the actions array into account (e.g. building size increases they make),
//but will not return towns already completely formed by those earlier actions.
function actionsCreateTown(player, actions, action) {
  // TODO! make a copy of all the cluster information and virtually work on them
  //TODO: I think this function does not work correct if in this action sequence, a previous action also creates a town, and townTilesAvailable is 1.
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
      if(a.favtiles[j] == T_FAV_2F_6TW) {
        reqpower = 6; //from now on for next actions this reqpower is used
        if(iscurrent) {
          var tw = getPlayerTownsOfSize6(player.woodcolor, testclusters);
          for(var k = 0; k < tw.length; k++) involved[tw[k]] = 1;
        }
      }
    }

    var result = updateTestClusters(a, testclusters, testmap, testconnections, player.woodcolor);
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

//numactions = where to stop testing (set to actions.length to do all)
//TODO: after extensive testing (scenarios with A_DOUBLE, mermaid town, bridges, fav6, ...), use this function in actionsCreateTown to remove code duplication
function actionsCreateTowns(player, actions, numactions) {
  var result = [];
  for(var i = 0; i < numactions; i++) result[i] = 0;

  var testclusters = clone(townclusters);
  var testmap = clone(townmap);
  var testconnections = {};

  var reqpower = getTownReqPower(player);
  var involved = {}; //the indices of the clusters involved in the towns (to avoid duplicates, e.g when both upgrading to SA and taking 6 town size tile)

  //if there are no more town tiles left, it does not count, not even for extra VP bonus, swarmlings 2 workers, etc...
  var tilesleft = townTilesAvailable(999);

  for(var i = 0; i < numactions; i++) {
    var a = actions[i];

    //favtiles must be checked first, for when you pick fav tile for town size 6 and at the same time upgrade to SA making some town size 6.
    for(var j = 0; j < a.favtiles.length; j++) {
      if(a.favtiles[j] == T_FAV_2F_6TW) {
        reqpower = 6; //from now on for next actions this reqpower is used
        var tw = getPlayerTownsOfSize6(player.woodcolor, testclusters);
        for(var k = 0; k < tw.length; k++) {
          involved[tw[k]] = 1;
          result[i]++;
          tilesleft--;
          if(tilesleft <= 0) return result;
        }
      }
    }

    var updated = updateTestClusters(a, testclusters, testmap, testconnections, player.woodcolor);
    var c = updated[0];

    if(c != 0 && testclusters[c].power >= reqpower && testclusters[c].townamount >= 4) {
      var oldc = updated[1]; //removed clusters (if any)
      var extrapower = updated[2];
      var extraamount = updated[3];

      if(oldc.length == 0) {
        var oldpower = testclusters[c].power - extrapower;
        var oldamount = testclusters[c].townamount - extraamount;
        if(oldpower < reqpower || oldamount < 4) {
          if(!involved[c]) {
            involved[c] = 1;
            result[i]++;
            tilesleft--;
            if(tilesleft <= 0) return result;
          }
        }
      } else {
        var already = false; //was one of the old clusters already a town?
        for(var j = 0; j < oldc.length; j++) {
          if(testclusters[oldc[j]].power >= reqpower && testclusters[oldc[j]].townamount >= 4) {
            already = true;
          }
        }
        if(!already&& !involved[c]) {
          involved[c] = 1;
          result[i]++;
          tilesleft--;
          if(tilesleft <= 0) return result;
        }
      }
    }
  }

  return result;
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
  var player = game.players[woodColorToPlayerMap[color]];
  return cluster && cluster.power >= getTownReqPower(player) && cluster.townamount >= 4;
}


//out of range of the hex board
function outOfBounds(x, y) {
  if(x < 0 || y < 0 || x >= game.bw || y >= game.bh) return true;
  var togglemod = (game.btoggle ? 0 : 1);

  // TODO: is this check actually needed? Those tiles are already of type "N".
  if(y % 2 == togglemod && x == game.bw - 1) return true;

  return false;
}

//Checks if two tiles are connected by the player's land or shipping ability, but does NOT take intermediate jumps using
//other buildings of the player into account, so does not determine if two far apart buildings are connected to each other through the whole players network.
//tunnelcarpet: whether to include connections with extra cost: dwarves tunneling and fakirs carpets
//endscoring: if true:
//-riverwalkers get a virtual land-distance of 1, so some tiles that are normally not reachable for them are: for final scoring their touching buildings are connected.
//-bonus tile shipping is not taken into account
function networkConnected(player, x0, y0, x1, y1, tunnelcarpet, endscoring) {
  if((endscoring || player.landdist == 1) && landConnected(x0, y0, x1, y1)) {
    return true;
  }
  if(waterDistance(x0, y0, x1, y1) <= getShipping(player, endscoring) /*this should be always 0 for dwarves and fakirs, hence correctly supporting their non-shipping*/) {
    return true;
  }
  if(tunnelcarpet && factionConnected(player, x0, y0, x1, y1)) {
    return true;
  }
  return false;
}

//is this tile in reach by one of the buildings of this color?
//tunnelcarpet: whether to include connections with extra cost: dwarves tunneling and fakirs carpets
function inReach(player, x, y, tunnelcarpet) {
  return inReachButDontCountCo(player, x, y, tunnelcarpet, null);
}

//dongcountco: coordinates to exclude for reachability, e.g. because player just built dwelling there. May be null/undefined to allow all coords
function inReachButDontCountCo(player, x, y, tunnelcarpet, dontcountco) {
  var color = player.woodcolor;
  var extra = getShipping(player, false);
  if(player.faction == F_DWARVES || player.faction == F_FAKIRS) extra = player.tunnelcarpetdistance + 1;
  if(extra < 1) extra = 1; //for bridges
  for(var tx = x - extra - 1; tx <= x + extra + 1; tx++)
  for(var ty = y - extra - 1; ty <= y + extra + 1; ty++) {
    if(outOfBounds(tx, ty)) continue;
    if(dontcountco && tx == dontcountco[0] && ty == dontcountco[1]) continue;
    var building = getBuilding(tx, ty);
    if(building[0] == B_NONE || building[0] == B_MERMAIDS || building[1] != color) continue;
    if(networkConnected(player, x, y, tx, ty, tunnelcarpet, false)) {
      return true;
    }
  }
  return false;
}

//get all tiles reachable from x,y for the given player (this assumes the player has a building on x,y), reachable through shipping etc... too.
//tunnelcarpet: whether to include connections with extra cost: dwarves tunneling and fakirs carpets
//endscoring: if true:
//-riverwalkers get a virtual land-distance of 1, so some tiles that are normally not reachable for them are: for final scoring their touching buildings are connected.
//-bonus tile shipping is not taken into account
function getNetworkConnectedTiles(player, x, y, tunnelcarpet, endscoring) {
  var result = [];
  var color = player.woodcolor;
  var extra = getShipping(player, endscoring);
  if(player.faction == F_DWARVES || player.faction == F_FAKIRS) extra = player.tunnelcarpetdistance + 1;
  if(extra < 1) extra = 1; //for bridges
  for(tx = x - extra - 1; tx <= x + extra + 1; tx++)
  for(ty = y - extra - 1; ty <= y + extra + 1; ty++) {
    if(outOfBounds(tx, ty)) continue;
    if(networkConnected(player, x, y, tx, ty, tunnelcarpet, endscoring)) {
      result.push([tx,ty]);
    }
  }
  return result;
}

//this is for fakirs carpets and dwarves tunneling. Only returns true if it is the exact required distance.
//does not check for whether it's land and stuff.
function factionConnected(player, x0, y0, x1, y1) {
  if(player.faction == F_DWARVES || player.faction == F_FAKIRS) {
    var d = hexDist(x0, y0, x1, y1);
    return d >= 2 && d <= player.tunnelcarpetdistance + 1;
  }
  return false;
}

function onlyReachableThroughFactionSpecial(player, x, y) {
  if(player.faction != F_FAKIRS && player.faction != F_DWARVES) return false;
  return !hasOwnNeighbor(x, y, player.woodcolor) && inReach(player, x, y, true);
}

function onlyReachableThroughFactionSpecialWithBackupWorldBuildings(player, x, y, backupbuildings) {
  if(player.faction != F_FAKIRS && player.faction != F_DWARVES) return false;
  var backup2 = game.buildings;
  game.buildings = backupbuildings;
  var result = onlyReachableThroughFactionSpecial(player, x, y);
  game.buildings = backup2;
  return result;
}

function hexDist(x0, y0, x1, y1) {
  var sign = function(x) { return x ? x < 0 ? -1 : 1 : 0; }
  var dx;
  if(game.btoggle) dx = (x1 - Math.floor((y1 + 1) / 2)) - (x0 - Math.floor((y0 + 1) / 2));
  else dx = (x1 - Math.floor(y1/2)) - (x0 - Math.floor(y0/2));
  var dy = y1 - y0;

  if(sign(dx) == sign(dy))
    return Math.abs(dx + dy);
  else
    return Math.max(Math.abs(dx), Math.abs(dy));
}

//get dir from 0 to 1
function getBridgeDir(x0, y0, x1, y1, btoggle) {
  var togglemod = (btoggle ? 0 : 1);
  if(x0 == x1 && y0 == y1 + 2) return D_N;
  if(x0 == ((y0 % 2 == togglemod) ? x1 - 2 : x1 - 1) && y0 == y1 + 1) return D_NE;
  if(x0 == ((y0 % 2 == togglemod) ? x1 - 2 : x1 - 1) && y0 == y1 - 1) return D_SE;
  if(x0 == x1 && y0 == y1 - 2) return D_S;
  if(x0 == ((y0 % 2 == togglemod) ? x1 + 1 : x1 + 2) && y0 == y1 - 1) return D_SW;
  if(x0 == ((y0 % 2 == togglemod) ? x1 + 1 : x1 + 2) && y0 == y1 + 1) return D_NW;
  return D_INVALID;
}

function addBridgeTo(x0, y0, x1, y1, bw, btoggle, color, bridges) {
  if(y0 < y1) {
    var temp;
    temp = x0; x0 = x1; x1 = temp;
    temp = y0; y0 = y1; y1 = temp;
  }
  var dir = getBridgeDir(x0, y0, x1, y1, btoggle);

  if(dir == D_NE) {
    bridges[arCo2(x0, y0, bw)][1] = color;
  }
  else if(dir == D_NW) {
    var co = dirCo(x0 - 1, y0, D_NW, btoggle);
    bridges[arCo2(co[0], co[1], bw)][2] = color;
  }
  else if(dir == D_N) {
    bridges[arCo2(x0, y0, bw)][0] = color;
  }
}

function addBridge(x0, y0, x1, y1, color) {
  addBridgeTo(x0, y0, x1, y1, game.bw, game.btoggle, color, game.bridges);
}

//returns the bridge color at that area, or N if no bridge
function getBridge(x0, y0, x1, y1, color) {
  if(y0 < y1) {
    var temp;
    temp = x0; x0 = x1; x1 = temp;
    temp = y0; y0 = y1; y1 = temp;
  }
  var dir = getBridgeDir(x0, y0, x1, y1, game.btoggle);

  if(dir == D_NE) {
    return game.bridges[arCo(x0, y0)][1];
  }
  else if(dir == D_NW) {
    var co = dirCo(x0 - 1, y0, D_NW, game.btoggle);
    if(!co) return N; //out of bounds
    return game.bridges[arCo(co[0], co[1])][2];
  }
  else if(dir == D_N) {
    return game.bridges[arCo(x0, y0)][0];
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

// function testBridge(a, b) { var ac = parsePrintCo(a); var bc = parsePrintCo(b); return worldCanHaveBridge(ac[0], ac[1], bc[0], bc[1]); }
function worldCanHaveBridge(x0, y0, x1, y1) {
  if(y0 < y1) {
    var temp;
    temp = x0; x0 = x1; x1 = temp;
    temp = y0; y0 = y1; y1 = temp;
  }
  if(outOfBounds(x0, y0) || outOfBounds(x1, y1)) return false;
  if(getWorld(x0, y0) == N || getWorld(x1, y1) == N) return false;
  var co1;
  var co2;

  var dir = getBridgeDir(x0, y0, x1, y1, game.btoggle);

  if(dir == D_NE) {
    co1 = dirCo(x0, y0, D_NE, game.btoggle);
    co2 = dirCo(x0, y0, D_E, game.btoggle);
  }
  else if(dir == D_NW) {
    co1 = dirCo(x0, y0, D_NW, game.btoggle);
    co2 = dirCo(x0, y0, D_W, game.btoggle);
  }
  else if(dir == D_N) {
    co1 = dirCo(x0, y0, D_NE, game.btoggle);
    co2 = dirCo(x0, y0, D_NW, game.btoggle);
  }
  else return false;

  // N if N in the data or if beyond edge of map
  var w1 = (co1 ? getWorld(co1[0], co1[1]) : N);
  var w2 = (co2 ? getWorld(co2[0], co2[1]) : N);

  // Both sides must be water, but ONE of them may also be N
  if(w1 != I && w2 != I) return false;
  if(!(w1 == I || w1 == N) || !(w2 == I || w2 == N)) return false;

  // Start and end point must NOT be water
  if(getWorld(x0, y0) == I || getWorld(x1, y1) == I) return false;

  return true;
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
  if(!worldCanHaveBridge(x0, y0, x1, y1)) return false;

  if(!isOccupiedBy(x0, y0, color) && !isOccupiedBy(x1, y1, color)) return false;
  if(getBridge(x0, y0, x1, y1) != N) return false; //already bridge there

  return true;
}

//init an array to become an array of size game.bh*game.bw with the given value in each element
function initWorldArray(array, value) {
  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
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
        if(getWorld(nx, ny) == I || getWorld(x, y) == I)
        {
          visited[arCo(nx, ny)] = true;

          if(getWorld(nx, ny) == I) {
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

//do NOT use this for giants, use "digDist" for player-dependent dig distance
//only supports the 7 circle colors
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
  co = dirCo(x, y, D_NE, game.btoggle);
  if(co != null && isOccupiedBy(co[0], co[1], color)) return true;
  co = dirCo(x, y, D_E, game.btoggle);
  if(co != null && isOccupiedBy(co[0], co[1], color)) return true;
  co = dirCo(x, y, D_SE, game.btoggle);
  if(co != null && isOccupiedBy(co[0], co[1], color)) return true;
  co = dirCo(x, y, D_SW, game.btoggle);
  if(co != null && isOccupiedBy(co[0], co[1], color)) return true;
  co = dirCo(x, y, D_W, game.btoggle);
  if(co != null && isOccupiedBy(co[0], co[1], color)) return true;
  co = dirCo(x, y, D_NW, game.btoggle);
  if(co != null && isOccupiedBy(co[0], co[1], color)) return true;
}

//Returns coordinates [x,y] of tile between the two given coordinates
//The given coordinates are supposed to have distance 2 (so there is 1 tile between them).
//Sometimes there is a single good answer. E.g. between G8 and I9.
//It can also happen that there are two equally valid tiles between them (e.g. betwen G6 and I6 or H10 and G12)
//For that reason, the returned result is an array of possible locations. It can have size 1 or 2.
//If distance is not 2, it returns empty array.
function getTileBetween(x0, y0, x1, y1) {
  var result = [];
  var neighbors = getNeighborTiles(x0, y0);
  for(var i = 0; i < neighbors.length; i++) {
    if(hexDist(x1, y1, neighbors[i][0], neighbors[i][1]) == 1) result.push(neighbors[i]);
    if(result.length >= 2) break; //can never become larger
  }
  return result;
}

//Like getTileBetween, but returns only a single value (or null if invalid), which is,
//a tile from the result of getTileBetween that is a water tile
function getWaterTileBetween(x0, y0, x1, y1) {
  var cos = getTileBetween(x0, y0, x1, y1);
  for(var i = 0; i < cos.length; i++) {
    if(getWorld(cos[i][0], cos[i][1]) == I) return cos[i];
  }
  return null;
}

//Similar to getTileBetween but for between 3 tiles, each distance 2 apart.
//Here is only one possible good answer, so returns single coordinate
//Returns null if the tiles don't have the exact required configuration
function getTileBetween3(x0, y0, x1, y1, x2, y2) {
  var neighbors = getNeighborTiles(x0, y0);
  for(var i = 0; i < neighbors.length; i++) {
    if(hexDist(x1, y1, neighbors[i][0], neighbors[i][1]) == 1 && hexDist(x2, y2, neighbors[i][0], neighbors[i][1]) == 1) {
      return neighbors[i];
    }
  }
  return null;
}
