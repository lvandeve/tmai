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

//Everything related to game and action rules, cults and income. But not the world and player faction related rules.



//Whether it's an action that you can do once per turn. If false, it's an auxiliary action such as burn/convert.
//Even though they can be combined, every spade, transform and build action is also a turn action. Further code is needed to enforce their rules during a turn.
function isTurnAction(action) {
  return action.type >= A_PASS;
}

//Does NOT include halflings SH upgrade.
function isSpadeGivingAction(action) {
  return action.type >= A_SPADE && action.type <= A_GIANTS_2SPADE;
}

//A transform action is any action that transforms terrain and allows also doing A_BUILD afterwards.
function isTransformAction(action) {
  return action.type >= A_TRANSFORM_CW && action.type <= A_SANDSTORM;
}

//This excludes the sandstorm. This are actions that consume spades, so are ok in the same turn after using a power or bonus action that gives spades.
function isSpadeConsumingAction(action) {
  return action.type >= A_TRANSFORM_CW && action.type < A_SANDSTORM;
}

//returns how many spades the action produces (positive) or consumes (negative). Includes halflings SH etc...
function spadesDifference(player, action) {
  if(action.type == A_SPADE) return 1;
  if(action.type == A_BONUS_SPADE) return 1;
  if(action.type == A_POWER_SPADE) return 1;
  if(action.type == A_POWER_2SPADE) return 2;
  if(action.type == A_GIANTS_2SPADE) return 2;
  if(action.type == A_UPGRADE_SH && player.faction == F_HALFLINGS) return 3;
  if(action.type == A_TRANSFORM_CW) return -1;
  if(action.type == A_TRANSFORM_CCW) return -1;
  if(action.type == A_GIANTS_TRANSFORM) return -2;
  return 0;
}

function actionsSpadesDifference(player, actions) {
  var result = 0;
  for(var i = 0; i < actions.length; i++) result += spadesDifference(player, actions[i]);
  return result;
}

//returns the amount of transforms needed from one color to another with shortest distance dist, given action A_TRANSFORM_CW, A_TRANSFORM_CCW or A_GIANTS_TRANSFORM
function transformsReq(dist, type) {
  if(dist == 0) return 0;
  if(type == A_GIANTS_TRANSFORM) return 1;
  return dist;
}

function isCultAction(action) {
  return action.type >= A_CULT_PRIEST3 && action.type <= A_AUREN_CULT;
}

function isUpgradeAction(action) {
  return action.type >= A_UPGRADE_TP && action.type <= A_SWARMLINGS_TP;
}

//any build action that can be involved in founding a town, includes dwelling and mermaids watertown tile
function isTownyBuildAction(action) {
  return action.type == A_BUILD || (action.type == A_WITCHES_D && action.co != null) || action.type == A_CONNECT_WATER_TOWN;
}

function isBuildDwellingAction(action) {
  return action.type == A_BUILD || (action.type == A_WITCHES_D && action.co != null);
}

//any build action that can be involved in founding a town, includes dwelling and mermaids watertown tile
function isBridgeAction(action) {
  return action.type == A_POWER_BRIDGE || action.type == A_ENGINEERS_BRIDGE;
}

function actionRequiresTownClusterRecalc(action) {
  return (isUpgradeAction(action) && action.type != A_UPGRADE_TE) || isTownyBuildAction(action) || isBridgeAction(action);
}

function actionMightFormTown(action) {
  if(actionRequiresTownClusterRecalc(action)) return true;
  for(var i = 0; i < action.favtiles.length; i++) {
    if(action.favtiles[i] == T_FAV_2F_6TW) return true;
  }
  return false;
}

function actionsRequireTownClusterRecalc(actions) {
  for(var i = 0; i < actions.length; i++) if(actionRequiresTownClusterRecalc(actions[i])) return true;
  return false;
}

function isBonusTile(tile) {
  return tile > T_BON_BEGIN && tile < T_BON_END;
}
function isFavorTile(tile) {
  return tile > T_FAV_BEGIN && tile < T_FAV_END;
}
function isTownTile(tile) {
  return tile > T_TW_BEGIN && tile < T_TW_END;
}

function isTownTilePromo2013Tile(tile) {
  return tile == T_TW_2VP_2CULT || tile == T_TW_4VP_SHIP || tile == T_TW_11VP;
}

function isBonusTilePromo2013Tile(tile) {
  return tile == T_BON_PASSSHIPVP_3PW;
}

// how much of that tile are placed at game setup
function getTileInitialCount(tile) {
  if(isFavorTile(tile)) return tile <= T_FAV_3A ? 1 : 3;
  if(isTownTile(tile)) return (tile == T_TW_2VP_2CULT || tile == T_TW_11VP) ? 1 : 2;
  return 0; //function not relevant for others.
}

function addBonusTileCoins() {
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) if(game.bonustiles[i]) game.bonustilecoins[i] = incrUndef(game.bonustilecoins[i], 1);
}

function isFactionOctogonAction(type) {
  return type == A_DOUBLE || type == A_GIANTS_2SPADE || type == A_SANDSTORM
      || type == A_WITCHES_D || type == A_SWARMLINGS_TP || type == A_AUREN_CULT;
}

function isPowerOctogonAction(type) {
  return type == A_POWER_BRIDGE || type == A_POWER_1P || type == A_POWER_2W || type == A_POWER_7C || type == A_POWER_SPADE || type == A_POWER_2SPADE;
}

function isTileOctogonAction(type) {
  return type == A_BONUS_SPADE || type == A_BONUS_CULT || type == A_FAVOR_CULT;
}

function isOctogonAction(type) {
  return isFactionOctogonAction(type) || isPowerOctogonAction(type) || isTileOctogonAction(type);
}

//init both game and player octogons
function initOctogons() {
  game.octogons = {};
  for(var j = 0; j < game.players.length; j++) {
    game.players[j].octogons = {};
  }
}

var colorToPlayerMap = {}; //map to the index of the player (cannot point to the player objects themselves due to their backup cloning that changes their addresses)

function createColorToPlayerMap() {
  colorToPlayerMap = {};
  for(var i = 0; i < game.players.length; i++) {
    colorToPlayerMap[game.players[i].color] = i;
  }
}

//A single action performed during a player's turn
//However, this is passed as an array of actions: some parts, such as converting resources, do not count as
//a full player's turn. Also, the chaos magicions can have 2 more actions if there is their double action action.
var Action = function(type) {
  this.type = type;
  // Coordinate for dig, build, ... e.g. [0,0]
  this.co = null;
  this.cos = []; //array of coordinates for multi-coordinate actions such as bridge

  this.bontile = T_NONE; //passing tile
  this.favtiles = []; //favor tiles taken. Can be multiple (for chaos magicians)
  this.twtiles = []; //town tiles. Can be multiple (e.g. when taking 6 town size tile)
  this.cult = C_NONE; //for cult track actions
};

function getTownReqPower(player) {
  return player.favortiles[T_FAV_2F_6TW] > 0 ? 6 : 7;
}

function getTileIncome(tile) {
  if(tile == T_BON_SPADE_2C) return [2,0,0,0,0];
  else if(tile == T_BON_CULT_4C) return [4,0,0,0,0];
  else if(tile == T_BON_6C) return [6,0,0,0,0];
  else if(tile == T_BON_3PW_SHIP) return [0,0,0,3,0];
  else if(tile == T_BON_3PW_1W) return [0,1,0,3,0];
  else if(tile == T_BON_PASSDVP_2C) return [2,0,0,0,0];
  else if(tile == T_BON_PASSTPVP_1W) return [0,1,0,0,0];
  else if(tile == T_BON_PASSSHSAVP_2W) return [0,2,0,0,0];
  else if(tile == T_BON_1P) return [0,0,1,0,0];
  else if(tile == T_BON_PASSSHIPVP_3PW) return [0,0,0,3,0];
  else if(tile == T_FAV_2E_1PW1W) return [0,1,0,1,0];
  else if(tile == T_FAV_2A_4PW) return [0,0,0,4,0];
  else if(tile == T_FAV_1F_3C) return [3,0,0,0,0];
  else return null;
}

function sumIncome(income, added) {
  for(var i = 0; i < 5; i++) income[i] += added[i];
}

function subtractIncome(income, removed) {
  for(var i = 0; i < 5; i++) income[i] -= removed[i];
}

//returns [coins, workers, priests, power, vp]
function getIncome(player, includeBonusTile, round) {
  var result = getBuildingIncome(player);
  for (var tile in player.favortiles) {
    if (player.favortiles.hasOwnProperty(tile) && player.favortiles[tile] > 0) {
      var tileincome = getTileIncome(tile);
      if(tileincome) sumIncome(result, tileincome);
    }
  }
  if(player.bonustile && includeBonusTile) {
    var tileincome = getTileIncome(player.bonustile);
    if(tileincome) sumIncome(result, tileincome);
  }
  if(round > 0 && round != 6) sumIncome(result, getRoundBonusResources(player, round));
  return result;
}

function addPower(player, pw) {
  if(player.pw0 >= pw) {
    player.pw0 -= pw;
    player.pw1 += pw;
    pw = 0;
  } else {
    pw -= player.pw0;
    player.pw1 += player.pw0;
    player.pw0 = 0;
  }

  if(player.pw1 >= pw) {
    player.pw1 -= pw;
    player.pw2 += pw;
  } else {
    player.pw2 += player.pw1;
    player.pw1 = 0;
  }
}

function usePower(player, pw) {
  if(player.pw2 < pw) return false;
  player.pw2 -= pw;
  player.pw0 += pw;
  return true;
}

function burnPower(player, pw) {
  if(player.pw1 < 2 * pw) return false;
  player.pw1 -= 2 * pw;
  player.pw2 += pw;
  return true;
}

function addPriests(player, p) {
  player.p += p;
  if(player.p > player.pp) player.p = player.pp;
}

//This can also add VP, if that case give reason
function addIncome(player, income, opt_reason, opt_detail) {
  player.c += income[0];
  player.w += income[1];
  addPriests(player, income[2]);
  addPower(player, income[3]);
  player.addVP(income[4], opt_reason, opt_detail);
}

//consumed is a 5 element income array
//precondition: player has enough resources
function consume(player, consumed) {
  player.c -= consumed[0];
  player.w -= consumed[1];
  player.p -= consumed[2];
  usePower(player, consumed[3]);

  //this can happen for alchemists
  if(player.faction == F_ALCHEMISTS) player.addVP(-consumed[4], 'faction', 'faction');
  else player.addVP(consumed[4], 'other', 'other');
}

//only for cheat/debug buttons
function consumeOverload(player, consumed) {
  player.c -= consumed[0];
  if(player.c < 0) player.c = 0;
  player.w -= consumed[1];
  if(player.w < 0) player.w = 0;
  player.p -= consumed[2];
  if(player.p < 0) player.p = 0;
  if(!usePower(player, consumed[3])) {
    var pw_left = consumed[3] - player.pw2;
    usePower(player, player.pw2);
    // For debugging, also use it up from pw1.
    var pw = Math.min(player.pw1, pw_left);
    player.pw1 -= pw;
    player.pw0 += pw;
  }
  player.vp -= consumed[4];
  if(player.vp < 0) player.vp = 0;
}

function canConsume(player, consumed) {
  return player.c >= consumed[0] && player.w >= consumed[1] && player.p >= consumed[2]
      && player.pw2 >= consumed[3] && player.vp >= consumed[4];
}

//returns true if the player had enough resources for the conversion
function tryConversion(player, action /*type*/) {
  var consumed = null;
  var produced = null;
  if(action == A_CONVERT_1PW_1C) { consumed = [0,0,0,1,0]; produced = [1,0,0,0,0]; }
  else if(action == A_CONVERT_3PW_1W) { consumed = [0,0,0,3,0]; produced = [0,1,0,0,0]; }
  else if(action == A_CONVERT_5PW_1P) { consumed = [0,0,0,5,0]; produced = [0,0,1,0,0]; }
  else if(action == A_CONVERT_1P_1W) { consumed = [0,0,1,0,0]; produced = [0,1,0,0,0]; }
  else if(action == A_CONVERT_1W_1C) { consumed = [0,1,0,0,0]; produced = [1,0,0,0,0]; }
  else if(action == A_CONVERT_1VP_1C) {
    if(player.faction != F_ALCHEMISTS) return 'only alchemists can do this';
    consumed = [0,0,0,0,1];
    produced = [1,0,0,0,0];
  }
  else if(action == A_CONVERT_2C_1VP) {
    if(player.faction != F_ALCHEMISTS) return 'only alchemists can do this';
    consumed = [2,0,0,0,0];
    produced = [0,0,0,0,1];
  }
  else if(action == A_CONVERT_1W_1P) {
    if(player.faction != F_DARKLINGS) return 'only darklings can do this';
    if(player.darklingconverts <= 0) return 'can only convert up to 3W to 3P during darklings SH upgrade';
    player.darklingconverts--;
    consumed = [0,1,0,0,0];
    produced = [0,0,1,0,0];
  }
  else return 'invalid faction or convert action';
  if(consumed != null && canConsume(player, consumed)) {
    consume(player, consumed);
    if(player.pp - player.p < produced[2]) return 'not enough priests in pool to get priest from this conversion';
    addIncome(player, produced);
    return '';
  }
  return 'could not convert';
}

function tryBuild(player, action) {
  if(!action.co) return 'must have build coordinates';
  if(player.b_d <= 0) return 'no dwellings left';
  var x = action.co[0];
  var y = action.co[1];

  if(player.transformed && !player.transformcoset[arCo(x, y)]) return 'after transforming, may build only on transformed tile';
  if(!inReach(player, x, y, false) && !temporaryTunnelCarpetOk(player, x, y)) {
    return 'tile not reachable';
  }
  if(isOccupied(x, y)) return 'tile occupied';

  var cost = getBuildingCost(player.faction, B_D, false);
  if(!canConsume(player, cost)) return 'not enough resources for ' + getActionName(action.type);

  var tile = getWorld(x, y);
  if(tile == I || tile == N) return 'invalid tile type';
  if(tile != player.color) return 'tile must have your color to build';

  consume(player, cost);

  player.b_d--;
  setBuilding(x, y, B_D, player.color);
  player.built = true;

  return '';
}

function canDoRoundBonusDig(player, type, x, y) {
  if(player.faction == F_GIANTS && type != A_GIANTS_TRANSFORM) return 'giants can only do giants transform';
  if(player.faction != F_GIANTS && type == A_GIANTS_TRANSFORM) return 'non-giants cannot do giants transform';
  if(!inReach(player, x, y, false)) return 'tile not reachable'; //no fakirs or dwarves tunneling
  if(isOccupied(x, y)) return 'tile occupied';
  var tile = getWorld(x, y);
  if(tile == I || tile == N) return 'invalid tile type';
  var dist = digDist(player, tile, player.color);
  if(dist == 0 && type == A_GIANTS_TRANSFORM) return 'tile already your color';
  return '';
}

//digs = array where each element is an array [actiontype, x, y], and actiontype is  e.g. A_TRANSFORM_CW, ...
function canDoRoundBonusDigs(player, digs) {
  var maxnum = getRoundBonusDigs(player, state.round);
  if(digs.length > maxnum) return 'too many bonus digs, have max ' + maxnum;
  if(player.faction == F_GIANTS && digs.length > 1) return 'giants cannot have more than one round bonus digs';
  for(var i = 0; i < digs.length; i++) {
    var error = canDoRoundBonusDig(player, digs[i][0], digs[i][1], digs[i][2]);
    if(error != '') return error;
  }
  return '';
}

function getColorAfterTransformAction(incolor, playercolor, type) {
  if(type == A_GIANTS_TRANSFORM || type == A_SANDSTORM) {
    //could as well say of course that giants transform is red, sandstorm is yellow. But let's be generic with player colors.
    return playercolor;
  }
  else if(type == A_TRANSFORM_CW) {
    var color = incolor + 1;
    if(color == S + 1) color = R;
    return color;
  }
  else if(type == A_TRANSFORM_CCW) {
    var color = incolor - 1;
    if(color == R - 1) color = S;
    return color;
  }
  return incolor;
}

//non destructive if it fails. Returns error string.
//type is e.g. A_TRANSFORM_CCW, ...
function tryRoundBonusDig(player, type, x, y) {
  var error = canDoRoundBonusDig(player, type, x, y);
  if(error != '') return error;
  var tile = getWorld(x, y);
  setWorld(x, y, getColorAfterTransformAction(tile, player.color, type));

  if(player.faction == F_HALFLINGS) { player.addVP(1, 'faction', 'faction') }
  if(player.faction == F_ALCHEMISTS && built_sh(player)) addPower(player, 2);
  return '';
}

function getUpgradeActionInputBuilding(action) {
  if(action.type == A_UPGRADE_TP || action.type == A_SWARMLINGS_TP) return B_D;
  else if(action.type == A_UPGRADE_TE) return B_TP;
  else if(action.type == A_UPGRADE_SH) return B_TP;
  else if(action.type == A_UPGRADE_SA) return B_TE;
}

function getUpgradeActionOutputBuilding(action) {
  if(action.type == A_UPGRADE_TP || action.type == A_SWARMLINGS_TP) return B_TP;
  else if(action.type == A_UPGRADE_TE) return B_TE;
  else if(action.type == A_UPGRADE_SH) return B_SH;
  else if(action.type == A_UPGRADE_SA) return B_SA;
}

function getRoundTile() {
  return game.roundtiles[state.round];
}

function tryUpgradeAction(player, action) {
  if(!action.co) return 'upgrade action must have coordinate';

  var x = action.co[0];
  var y = action.co[1];
  var tile = getWorld(x, y);
  var building = getBuilding(x, y);
  if(tile != player.color || building[1] != player.color) return 'wrong tile color';

  var b_in = getUpgradeActionInputBuilding(action);
  var b_out = getUpgradeActionOutputBuilding(action);
  if(action.type == A_UPGRADE_TP || action.type == A_SWARMLINGS_TP) {
    if(player.b_tp <= 0) return 'not enough TP left';
  }
  else if(action.type == A_UPGRADE_TE) {
    if(player.b_te <= 0) return 'not enough TE left';
  }
  else if(action.type == A_UPGRADE_SH) {
    if(player.b_sh <= 0) return 'not enough SH left';
  }
  else if(action.type == A_UPGRADE_SA) {
    if(player.b_sa <= 0) return 'not enough SA left';
  }
  var resources;
  if(action.type == A_SWARMLINGS_TP) resources = [0,0,0,0,0]
  else resources = getBuildingCost(player.faction, b_out, action.type == A_UPGRADE_TP ? hasNeighbor(x, y, player.color) : false);

  if(building[0] != b_in) return 'wrong input building type';
  if(!canConsume(player, resources)) return 'not enough resources for ' + getActionName(action.type);

  consume(player, resources);

  if(b_out == B_TP) {
    player.b_d++;
    player.b_tp--;
  }
  else if(b_out == B_TE) {
    player.b_tp++;
    player.b_te--;
  }
  else if(b_out == B_SH) {
    player.b_tp++;
    player.b_sh--;

    if(player.faction == F_HALFLINGS) {
      player.spades = 3;
      if(player.spades == 3) player.overflowspades = true;
      player.mayaddmorespades = false;
    }

    if(player.faction == F_DARKLINGS) {
      player.darklingconverts = 3;
    }

  }
  else if(b_out == B_SA) {
    player.b_te++;
    player.b_sa--;
  }

  setBuilding(x, y, b_out, player.color);

  return '';
}

//returns amount of power received on cult track when going from 'from' to 'to'
function cultPower(from, to) {
  var result = 0;
  if(from < 3 && to >= 3) result++;
  if(from < 5 && to >= 5) result += 2;
  if(from < 7 && to >= 7) result += 2;
  if(from < 10 && to >= 10) result += 3;
  return result;
}

//if you go num steps in the cult track, returns how much steps you really go up (can be less if at the top of the track)
function willGiveCult(player, cult, num) {
  var oldcult = player.cult[cult];
  var maxcult = (player.keys > 0 && getHighestOtherPlayerValueOnCult(player, cult) < 10) ? 10 : 9;
  var newcult = Math.min(maxcult, oldcult + num);
  return newcult - oldcult;
}

//gives cult, if too much, ignores it (it is no error)
function giveCult(player, cult, num) {
  if(player.cult[cult] == 10) return; //the code below would bring it back to 9 due to key limit and Math.min

  var oldcult = player.cult[cult];
  var maxcult = (player.keys > 0 && getHighestOtherPlayerValueOnCult(player, cult) < 10) ? 10 : 9;
  var newcult = Math.min(maxcult, oldcult + num);
  if(newcult == 10 && oldcult < 10) player.keys--;

  player.cult[cult] = newcult;
  addPower(player, cultPower(oldcult, newcult));
}

function tryCultPriestAction(player, action) {
  if(player.p < 1) return 'not enough priests';
  var cp = game.cultp[action.cult];
  if(action.cult < 0 || action.cult > 3) return 'invalid cult';
  if(action.type == A_CULT_PRIEST3 && cp[0] != N) return 'the 3 is full';
  if(action.type == A_CULT_PRIEST2 && cp[1] != N && cp[2] != N && cp[3] != N) return 'the 2s are full';
  var num = action.type == A_CULT_PRIEST3 ? 3 : action.type == A_CULT_PRIEST2 ? 2 : 1;

  giveCult(player, action.cult, num);
  player.p--;

  if(action.type != A_CULT_PRIEST1) {
    if(player.pp <= 0) throw new Error('priest pool went wrong');
    player.pp--;
  }

  if(action.type == A_CULT_PRIEST3) cp[0] = player.color;
  if(action.type == A_CULT_PRIEST2) {
    if(cp[1] == N) cp[1] = player.color;
    else if(cp[2] == N) cp[2] = player.color;
    else if(cp[3] == N) cp[3] = player.color;
    else throw new Error('already full');
  }

  return '';
}

function tryCultAction(player, action) {

  var cp = game.cultp[action.cult];
  if(action.cult < 0 || action.cult > 3) return 'invalid cult';
  var num = action.type == A_AUREN_CULT ? 2 : 1;

  if(action.type == A_BONUS_CULT) {
    if(player.bonustile != T_BON_CULT_4C) return 'player does not have bonus cult tile';
    if(player.octogons[A_BONUS_CULT]) return 'bonus cult already used';
    player.octogons[A_BONUS_CULT] = 1;
  }

  if(action.type == A_FAVOR_CULT) {
    if(!player.favortiles[T_FAV_2W_CULT]) return 'player does not have favor cult tile';
    if(player.octogons[A_FAVOR_CULT]) return 'favor cult already used';
    player.octogons[A_FAVOR_CULT] = 1;
  }

  if(action.type == A_AUREN_CULT) {
    if(!built_sh(player)) return 'auren cult action requires stronghold';
    if(player.octogons[A_AUREN_CULT]) return 'auren cult already used';
    player.octogons[A_AUREN_CULT] = 1;
  }

  giveCult(player, action.cult, num);

  return '';
}

//add extra VP (and a few other resources) from the action: everything related to faction powers and favor, bonus and round tiles giving some extra immediate VP or other resource.
//includes alchemists SH power
function addExtrasForAction(player, action) {
  if(action.type == A_UPGRADE_TP || action.type == A_SWARMLINGS_TP) {
    if(player.favortiles[T_FAV_1W_TPVP]) {
      player.addVP(3, 'favor', getTileCodeName(T_FAV_1W_TPVP));
    }
    if(getRoundTile() == T_ROUND_TP3VP_4W1DIG || getRoundTile() == T_ROUND_TP3VP_4A1DIG) {
      player.addVP(3, 'round', getTileCodeName(getRoundTile()));
    }
  }

  if(action.type == A_BUILD || action.type == A_WITCHES_D) {
    if(player.favortiles[T_FAV_1E_DVP]) {
      player.addVP(2, 'favor', getTileCodeName(T_FAV_1E_DVP));
    }
    if(getRoundTile() == T_ROUND_D2VP_4W1P || getRoundTile() == T_ROUND_D2VP_4F4PW) {
      player.addVP(2, 'round', getTileCodeName(getRoundTile()));
    }
  }

  if(isSpadeConsumingAction(action)) {
    var num = action.type == A_GIANTS_TRANSFORM ? 2 : 1;
    if(getRoundTile() == T_ROUND_DIG2VP_1E1C) {
      player.addVP(num * 2, 'round', getTileCodeName(getRoundTile()));
    }
    if(player.faction == F_HALFLINGS) {
      player.addVP(num, 'faction', 'faction');
    }
    if(player.faction == F_ALCHEMISTS && built_sh(player)) addPower(player, num * 2);
  }

  if(player.faction == F_DARKLINGS && action.type == A_SPADE) {
    //2VP for digging with priest
    player.addVP(2, 'faction', 'faction');
  }

  if(action.type == A_UPGRADE_SH || action.type == A_UPGRADE_SA) {
    if(getRoundTile() == T_ROUND_SHSA5VP_2F1W || getRoundTile() == T_ROUND_SHSA5VP_2A1W) {
      player.addVP(5, 'round', getTileCodeName(getRoundTile()));
    }
    if(action.type == A_UPGRADE_SH) {
      if(player.faction == F_ALCHEMISTS) addPower(player, 12);
      if(player.faction == F_MERMAIDS) advanceShipping(player);
      if(player.faction == F_FAKIRS) player.tunnelcarpetdistance++;
    }
  }

  if(action.type == A_UPGRADE_SH) {
    if(player.faction == F_CULTISTS) {
      player.addVP(7, 'faction', 'faction');
    }
  }

  for(var i = 0; i < action.twtiles.length; i++) {
    if(getRoundTile() == T_ROUND_TW5VP_4E1DIG) {
      player.addVP(5, 'round', getTileCodeName(getRoundTile()));
    }
    if(player.faction == F_WITCHES) {
      player.addVP(5, 'faction', 'faction');
    }
    if(player.faction == F_SWARMLINGS) player.w += 3;

    if(action.twtiles[i] == T_TW_4VP_SHIP) {
      if(player.faction == F_DWARVES) {
        // nothing
      }
      else if(player.faction == F_FAKIRS) {
        player.tunnelcarpetdistance++;
      }
      else {
        advanceShipping(player);
      }
    }
  }
}

//amount of digs from the round end based on cult track
function getRoundBonusDigsForCults(cult, round) {
  if(round == 0) return 0;
  var t = game.roundtiles[round];
  if(!t) return 0;
  if(t == T_ROUND_TP3VP_4W1DIG) {
    return Math.floor(cult[C_W] / 4);
  }
  else if(t == T_ROUND_TP3VP_4A1DIG) {
    return Math.floor(cult[C_A] / 4);
  }
  else if(t == T_ROUND_TW5VP_4E1DIG) {
    return Math.floor(cult[C_E] / 4);
  }
  return 0;
}

//amount of digs from the round end based on cult track
function getRoundBonusDigs(player, round) {
  return getRoundBonusDigsForCults(player.cult, round);
}

//amount of resources from the round end based on cult track
function getRoundBonusResourcesForCults(cult, round) {
  if(round == 0) return [0,0,0,0,0];
  var t = game.roundtiles[round];
  if(!t) return [0,0,0,0,0];
  if(t == T_ROUND_D2VP_4W1P) {
    return [0,0,Math.floor(cult[C_W] / 4),0,0];
  }
  else if(t == T_ROUND_D2VP_4F4PW) {
    return [0,0,0,4*Math.floor(cult[C_F] / 4),0];
  }
  else if(t == T_ROUND_DIG2VP_1E1C) {
    return [cult[C_E],0,0,0,0];
  }
  else if(t == T_ROUND_SHSA5VP_2F1W) {
    return [0,Math.floor(cult[C_F] / 2),0,0,0];
  }
  else if(t == T_ROUND_SHSA5VP_2A1W) {
    return [0,Math.floor(cult[C_A] / 2),0,0,0];
  }
  return [0,0,0,0,0];
}

//amount of resources from the round end based on cult track
function getRoundBonusResources(player, round) {
  return getRoundBonusResourcesForCults(player.cult, round);
}

//this one does NOT fail and does not consume income. If you already have max shipping, it does nothing.
function advanceShipping(player) {
  if(!canAdvanceShip(player)) return;
  player.addVP(getAdvanceShipVP(player), 'advance', 'advship');
  player.shipping++;
}

function getEngineersPassScore(player) {
  if(player.faction != F_ENGINEERS) return 0;
  if(player.b_sh != 0) return 0;

  var result = 0;

  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
  {
    var bridges = game.bridges[arCo(x, y)];

    if(bridges[0] == player.color) {
      var co = bridgeCo(x, y, D_N);
      if(outOfBounds(co[0], co[1])) continue;
      if(isOccupiedBy(x, y, player.color) && isOccupiedBy(co[0], co[1], player.color)) result += 3;
    }
    if(bridges[1] == player.color) {
      var co = bridgeCo(x, y, D_NE);
      if(outOfBounds(co[0], co[1])) continue;
      if(isOccupiedBy(x, y, player.color) && isOccupiedBy(co[0], co[1], player.color)) result += 3;
    }
    if(bridges[2] == player.color) {
      var co = bridgeCo(x, y, D_SE);
      if(outOfBounds(co[0], co[1])) continue;
      if(isOccupiedBy(x, y, player.color) && isOccupiedBy(co[0], co[1], player.color)) result += 3;
    }
  }

  return result;
}

//tries to perform the action, returns false if failure (no resources, invalid location, ...),
//applies the changes and returns empty string on success, error string on fail
//returns '' on success, else error
function tryAction(player, action /*Action object*/) {
  var error = '';

  // Check turn action amount
  if (isTurnAction(action)) {
    var turn = true;
    if(action.type == A_SPADE && player.mayaddmorespades && !player.built) turn = false;
    if(isSpadeConsumingAction(action) && player.spades) turn = false;
    if(action.type == A_BUILD && player.transformed && !player.built) turn = false;
    if(turn) {
      if(player.numactions == 0) return player.faction == F_CHAOS && built_sh(player) ?
          'can only take 1 turn action (or 2 after chaosmag double action)' :
          'can only take 1 turn action';
      player.numactions--;
      player.built = false; //reset for chaos magicians, otherwise the following action order breaks: chaosdouble. build. dig. transform. build.
    }
  }

  // Check town tiles. Also takes care of the T_FAV_2F_6TW tile.
  var numtw = actionCreatesTown(player, action, null);
  if(action.twtiles.length < numtw) return action.favtiles.length == 0 ? 'no town tile chosen' : 'too few town tiles chosen';
  if(action.twtiles.length > numtw) return numtw == 0 ? 'town tile chosen injustly' : 'too many town tiles chosen';

  // Check favor tiles
  if(action.favtiles.length < actionGivesFavorTile(player, action)) return action.favtiles.length == 0 ? 'no favor tile chosen' : 'too few favor tiles chosen';
  if(action.favtiles.length > actionGivesFavorTile(player, action)) return 'too many favor tiles chosen';


  if(action.type == A_BURN) {
    if(player.pw1 < 2) return 'not enough power to burn';
    burnPower(player, 1);
  }
  else if(action.type > A_CONVERT_ACTIONS_BEGIN && action.type < A_CONVERT_ACTIONS_END) {
    error = tryConversion(player, action.type);
  }
  else if(action.type == A_ADV_SHIP) {
    if(!canAdvanceShip(player)) return 'already max shipping';
    var cost = getAdvanceShipCost(player.faction);
    if(!canConsume(player, cost)) return 'not enough resources for ' + getActionName(action.type);
    consume(player, cost);
    advanceShipping(player);
  }
  else if(action.type == A_ADV_DIG) {
    if(!canAdvanceDig(player)) return 'already max digging';
    //TODO: some factions have different cost here
    var cost = getAdvanceDigCost(player.faction);
    if(!canConsume(player, cost)) return 'not enough resources for ' + getActionName(action.type);
    consume(player, cost);
    player.addVP(6, 'advance', 'advdig');
    player.digging++;
  }
  else if(isSpadeGivingAction(action)) {
    /*
    The following rules for spades are not directly in the rulebook, but posted by a designer on the bgg forum:

    Official rules:
    Scoring tile "VP's for digging" not in round 5 or 6.
    Maximum digging up to six steps in one action (Giants always exactly 2 shovels), which means you can't terraform further than your hometerrain in one action.
    You can dig in either direction, even your hometerrain (when it is the starting terrain) can be transformed into another landscape.
    I shall put it this way:
    You can dig in any direction, but you have to stop at your home terrain (after all the primary goal of terraforming is to reach your hometerrain), so in one action the maximum could be six steps.
    You may change your hometerrain, but only, if the landscape is your hometerrain at the beginning of your turn. In this case again six steps is the maximum per action.
    I know Frank suggested something different a while ago Possible imbalance, but now the only limitation is, you have to stop at your hometerrain or you have to start at your hometerrain and the maximum is 6 steps of terraforming per action.
    */
    if(player.spades >= 6) return 'max 6 spades per turn';
    player.mayaddmorespades = true;

    if(action.type == A_SPADE) {
      var cost = getDigCost(player, 1);
      if(!canConsume(player, cost)) return 'not enough resources for ' + getActionName(action.type);
      consume(player, cost);
      player.spades++;
      player.overflowspades = false; //overflowing of spades can only when taking 2 spade power action or halflings SH, but the overflow is no longer valid if you pay for extra spades (because you may only pay for extra spades to keep digging the same terrain tile).
    }
    else if(action.type == A_BONUS_SPADE) {
      if(player.octogons[A_BONUS_SPADE]) return 'action already taken';
      player.octogons[A_BONUS_SPADE] = 1;
      player.spades++;
    }
    else if(action.type == A_POWER_SPADE) {
      if(game.octogons[A_POWER_SPADE]) return 'action already taken';
      game.octogons[A_POWER_SPADE] = 1;
      if(player.pw2 < 4) return 'not enough resources for ' + getActionName(action.type);
      usePower(player, 4);
      player.spades++;
    }
    else if(action.type == A_POWER_2SPADE) {
      if(game.octogons[A_POWER_2SPADE]) return 'action already taken';
      game.octogons[A_POWER_2SPADE] = 1;
      if(player.pw2 < 6) return 'not enough resources for ' + getActionName(action.type);
      usePower(player, 6);
      player.spades += 2;
      if(player.spades == 2) player.overflowspades = true;
    }
    else if(action.type == A_GIANTS_2SPADE) {
      if(player.faction != F_GIANTS) return 'must be giants for this action';
      if(!built_sh(player)) return 'this action requires SH';
      if(player.octogons[A_GIANTS_2SPADE]) return 'action already taken';
      player.octogons[A_GIANTS_2SPADE] = 1;
      player.spades += 2;
    }
    else return 'unknown spade action';
  }
  else if(isTransformAction(action)) {
    var spades = 1;
    if(action.type == A_GIANTS_TRANSFORM) spades = 2;
    if(action.type == A_SANDSTORM) spades = 0;
    player.spades -= spades;
    if(player.spades < 0) return 'not enough spades to transform';

    var x = action.co[0];
    var y = action.co[1];

    if(!inReach(player, x, y, false) && !temporaryTunnelCarpetOk(player, x, y)) return 'tile not reachable';
    if(isOccupied(x, y)) return 'tile occupied';
    var tile = getWorld(x, y);
    if(tile == I || tile == N) return 'invalid tile type';

    if(player.transformco) {
      var equal = (x == player.transformco[0] && y == player.transformco[1]);
      var oldTile = getWorld(player.transformco[0], player.transformco[1]);
      var previousreachedend = oldTile == player.color;
      if(!equal) {
        if(!player.overflowspades) return 'cannot dig in multiple locations if you have no overflow spades';
        if(!previousreachedend) return 'cannot overflow spades to another tile unless you reached your own color on the previous tile';
      }
      if(equal && previousreachedend) return 'tile already reached your color. You cannot go past your color in a single turn';
      if(equal && player.transformdir != A_NONE && player.transformdir != action.type) return 'may not change transform direction on a tile in one turn';
    }
    player.transformdir = action.type;

    if(action.type == A_SANDSTORM) {
      if(player.faction != F_NOMADS) return 'sandstorm requires nomads';
      if(!built_sh(player)) return 'sandstorm requires SH';
      if(player.octogons[A_SANDSTORM]) return 'action already taken';
      player.octogons[A_SANDSTORM] = 1;
      if(!hasOwnNeighborNoBridge(x, y, player.color)) return 'sandstorm must be directly adjecant, and does not work over bridges';
      if(tile == player.color) return 'sandstorm can only transform another color to player color';
    }

    if(action.type == A_GIANTS_TRANSFORM) {
      if(player.faction != F_GIANTS) return 'giants transform requires giants';
      if(tile == player.color) return 'giants can only transform another color to their color';
    }

    // Now execute it
    player.transformed = true;
    player.transformco = [x, y];
    player.transformcoset[arCo(x, y)] = true;
    var newcolor = getColorAfterTransformAction(tile, player.color, action.type);
    if(newcolor == tile) return 'unknown transform action';
    setWorld(x, y, newcolor);
  }
  else if(action.type == A_BUILD) {
    error = tryBuild(player, action);
  }
  else if(action.type == A_CONNECT_WATER_TOWN) {
    if(!action.co) return 'most have coordinates for water town';
    var x = action.co[0];
    var y = action.co[1];
    /*
    twtiles is already checked above, so its length is exactly the amount of towns formed. A mermaids
    water tile must cause exactly one town when placed.
    The rule for the mermaids is, that they may skip one water tile when forming a town. Simply checking
    that placing the tile causes you to have 1 more town takes everything into account: no abuse with placing
    multiple of them in a row, ...
    */
    if(action.twtiles.length != 1) return 'mermaids water town action should form exactly one new town';

    var tile = getWorld(x, y);
    if(tile != I) return 'must be on river';

    setBuilding(x, y, B_MERMAIDS, player.color);
  }
  else if(action.type == A_POWER_BRIDGE || action.type == A_ENGINEERS_BRIDGE) {
    if(action.type == A_POWER_BRIDGE) {
      if(game.octogons[A_POWER_BRIDGE]) return 'action already taken';
      game.octogons[A_POWER_BRIDGE] = 1;
      if(player.pw2 < 3) return 'not enough resources for ' + getActionName(action.type);
      usePower(player, 3);
    }
    if(action.type == A_ENGINEERS_BRIDGE) {
      if(player.faction != F_ENGINEERS) return 'you are not an engineer';
      if(player.w < 2) return 'not enough resources for ' + getActionName(action.type);
      player.w -= 2;
    }

    if(player.bridges <= 0) return 'not enough bridges';
    var x0 = action.cos[0][0];
    var y0 = action.cos[0][1];
    var x1 = action.cos[1][0];
    var y1 = action.cos[1][1];
    if(!canHaveBridge(x0, y0, x1, y1, player.color)) return 'invalid bridge location';

    addBridge(x0, y0, x1, y1, player.color);
    player.bridges--;
  }
  else if(action.type == A_UPGRADE_TP) error = tryUpgradeAction(player, action);
  else if(action.type == A_UPGRADE_TE) error = tryUpgradeAction(player, action);
  else if(action.type == A_UPGRADE_SH) error = tryUpgradeAction(player, action);
  else if(action.type == A_UPGRADE_SA) error = tryUpgradeAction(player, action);
  else if(action.type == A_POWER_1P) {
    if(game.octogons[A_POWER_1P]) return 'action already taken';
    game.octogons[A_POWER_1P] = 1;
    if(usePower(player, 3)) {
      addIncome(player, [0,0,1,0,0]);
    } else {
      return 'not enough resources for ' + getActionName(action.type);
    }
  }
  else if(action.type == A_POWER_2W) {
    if(game.octogons[A_POWER_2W]) return 'action already taken';
    game.octogons[A_POWER_2W] = 1;
    if(usePower(player, 4)) {
      addIncome(player, [0,2,0,0,0]);
    } else {
      return 'not enough resources for ' + getActionName(action.type);
    }
  }
  else if(action.type == A_POWER_7C) {
    if(game.octogons[A_POWER_7C]) return 'action already taken';
    game.octogons[A_POWER_7C] = 1;
    if(usePower(player, 4)) {
      addIncome(player, [7,0,0,0,0]);
    } else {
      return 'not enough resources for ' + getActionName(action.type);
    }
  }
  else if(action.type == A_PASS) {
    var finalround = state.round == 6;
    if(action.bontile == T_NONE && !finalround) return 'must choose 1 bonus tile';
    if(action.bontile != T_NONE && finalround) return 'tried to pass with bonus tile in last round';
    var passcount = 0;
    player.passed = true;

    //pass bonuses
    applyPassBonus(player, player);

    if(!finalround) error = giveBonusTile(player, action.bontile);
    else error = giveBonusTile(player, T_NONE);
    if(error) return error;

    if(player.faction == F_ENGINEERS) {
      player.addVP(getEngineersPassScore(player), 'faction', 'faction');
    }
  }
  else if(action.type == A_DOUBLE) {
    if(player.faction != F_CHAOS) return 'wrong faction for this action';
    if(player.b_sh != 0) return 'this action requires SH built';
    if(player.octogons[A_DOUBLE]) return 'action already taken';
    player.octogons[A_DOUBLE] = 1;
    player.numactions = 2;
  }
  else if(action.type == A_TUNNEL || action.type == A_CARPET) {
    if(player.faction != F_FAKIRS && player.faction != F_DWARVES) return 'wrong faction for this action';
    if(player.tunnelcarpet) return 'max 1 tunnel/carpet action per turn';
    if(!action.co) return 'must have one coordinate';
    if(!canConsume(player, getTunnelCarpetCost(player))) return 'not enough resources for ' + getActionName(action.type);
    if(!onlyReachableThroughFactionSpecialWithBackupWorldBuildings(
        player, action.co[0], action.co[1], backupGameState.buildings)) return 'must be reachable only through tunnel/carpet power';

    consume(player, getTunnelCarpetCost(player));
    player.tunnelcarpet = action.co; //from now on, next dig and build actions may consider this tile reachable until the whole action sequence is done
    player.addVP(4, 'faction', 'faction'); //this is 4 both for fakirs and dwarves
  }
  else if(action.type == A_DEBUG_SKIP) {
    //pass for debug reasons
    player.passed = true;
  }
  else if(action.type == A_DEBUG_STEP) {
    //nothing
  }
  else if(action.type == A_CHEAT_PW) {
    addPower(player, 1);
  }
  else if(action.type == A_CULT_PRIEST1) error = tryCultPriestAction(player, action);
  else if(action.type == A_CULT_PRIEST2) error = tryCultPriestAction(player, action);
  else if(action.type == A_CULT_PRIEST3) error = tryCultPriestAction(player, action);
  else if(action.type == A_BONUS_CULT || action.type == A_FAVOR_CULT || action.type == A_AUREN_CULT) error = tryCultAction(player, action);
  else if(action.type == A_SWARMLINGS_TP) {
    if(player.faction != F_SWARMLINGS) return 'need to be swarmlings';
    if(player.b_sh != 0) return 'free TP requires SH';
    if(player.octogons[A_SWARMLINGS_TP]) return 'action already used';
    player.octogons[A_SWARMLINGS_TP] = 1;
    if(!action.co) return 'upgrade action must have coordinate';
    if(player.b_tp == 0) return 'no trading posts left';
    var x = action.co[0];
    var y = action.co[1];
    var b = getBuilding(x, y);
    if(b[0] != B_D) return 'must upgrade dwelling';
    if(b[1] != player.color) return 'must upgrade dwelling of your color';
    player.b_d++;
    player.b_tp--;
    setBuilding(x, y, B_TP, player.color);
  }
  else if(action.type == A_WITCHES_D) {
    if(player.faction != F_WITCHES) return 'flying the broom requires witches';
    if(player.b_sh != 0) return 'flying the broom requires SH';
    if(player.octogons[A_WITCHES_D]) return 'witches ride already used';
    player.octogons[A_WITCHES_D] = 1;
    // empty coordinates allowed, when using the SH actions, the witches MAY, not must, build a dwelling
    //TODO: also allow these empty coordinates for some other actions, e.g. swarmlings TP, but don't forget to test it out as functions like actionRequiresTownClusterRecalc need to be adapted as well
    if(action.co) {
      if(player.b_d == 0) return 'no dwellings left';
      var x = action.co[0];
      var y = action.co[1];
      if(getWorld(x, y) != player.color) return 'can only fly to forest';
      if(isOccupied(x, y)) return 'already occupied';
      player.b_d--;
      setBuilding(x, y, B_D, player.color);
    }
  }
  else return 'unknown action';

  if(error != '') return error;

  //give town and favor tiles (only after the actual action happened, otherwise you can use resources you don't yet have)
  //first give the town keys, then the tiles (for correct handling of the +cult town tile)
  for(var i = 0; i < action.twtiles.length; i++) {
    player.keys += action.twtiles[i] == T_TW_2VP_2CULT ? 2 : 1;
  }
  for(var i = 0; i < action.twtiles.length; i++) {
    var error = giveTownTile(player, action.twtiles[i]);
    if(error != '') return error;
  }
  for(var i = 0; i < action.favtiles.length; i++) {
    var error = giveFavorTile(player, action.favtiles[i]);
    if(error != '') return error;
  }

  //VP and resource bonuses only after the action, so you cannot use these resources for doing the action
  addExtrasForAction(player, action);

  if(actionRequiresTownClusterRecalc(action)) {
    calculateTownClusters();
  }

  return error;
}

//Used to automatically undo invalid actions.
var backupGameState = null;

function tryActions(player, actions /*array of Action objects*/) {
  var error = '';

  backupGameState = saveGameState(game, state, undefined);

  //Prepare temporary turn state
  initPlayerTemporaryTurnState(player);

  for (var i = 0; i < actions.length; i++) {
    error = tryAction(player, actions[i])
    if(error != '') break;
  }

  if(error == '' && player.numactions > 0) error = 'you must take an actual turn action during your turn (or two after chaosmag double action), or pass. Burning power or converting is not enough to count as a full action.';
  if(error == '' && !player.overflowspades && player.spades > 0) error = 'you must use up all your spades, do as many terrain transformations and received spades. Only if you have overflow spades, not using some is allowed.';

  if(error != '') loadGameState(backupGameState);

  return error;
}

function printCo(x, y) {
  //return ['A','B','C','D','E','F','G','H','I'][y] + (1 + x);
  return String.fromCharCode(65 + y) + (1 + x);
}

function parsePrintCo(text) {
  var y = text.charCodeAt(0) - 65 /*'A'*/;
  var x = parseInt(text.substr(1)) - 1;
  return [x, y];
}

function printCos(cos) {
  var result = '';
  for(var i = 0; i < cos.length; i++) {
    result += printCo(cos[i][0], cos[i][1]);
    if(i + 1 < cos.length) result += ',';
  }
  return result;
}

function printActionTiles(action) {
  var result = '';
  var tiles = [];
  if(action.bontile != T_NONE) tiles = tiles.concat(action.bontile);
  tiles = tiles.concat(action.favtiles);
  tiles = tiles.concat(action.twtiles);
  for(var i = 0; i < tiles.length; i++) {
    if(i > 0) result += ' ';
    result += '+' + getTileCodeName(tiles[i]);
  }
  return result;
}

//returns A_TRANSFORM_CW or A_TRANSFORM_CCW depending on which is the closest direction from world color to player color (A_NONE if colors are equal, A_GIANTS_TRANSFORM if player is giants)
//clockwise = red->yellow->brown->black->...
//ccw = red->grey->green->blue->...
function transformDirAction(player, fromcolor, tocolor) {
  var diff = tocolor - fromcolor;
  if(diff < 0) diff += 7;
  if(diff == 0) return A_NONE;
  else if(player.faction == F_GIANTS) return A_GIANTS_TRANSFORM;
  else if(diff < 4) return A_TRANSFORM_CW;
  else return A_TRANSFORM_CCW;
}

function actionToString(action) {
  var result = getActionName(action.type);
  if(action.co) result += ' ' + printCo(action.co[0], action.co[1]);
  if(action.cos.length > 0) result += ' ' + printCos(action.cos);
  if(action.favtiles.length > 0 || action.twtiles.length > 0 || action.bontile != T_NONE) {
    result += ' ' + printActionTiles(action);
  }
  if(isCultAction(action)) {
    result += ' +' + getCultName(action.cult);
  }
  return result;
}

function actionsToString(actions) {
  var result = '';
  var last = '';
  var same = 0;
  var different = true;
  for(var j = 0; j < actions.length; j++) {
    var text = actionToString(actions[j]);
    if(last == '') {
      different = false;
      same = 1;
      last = text;
    } else if(text == last) {
      same++;
      different = false;
    } else {
      different = true;
    }
    if(different || j == actions.length - 1) {
      result += last + (same > 1 ? (' x' + same) : '') + '. ';
      if(different && j == actions.length - 1) result += text + '. ';
      last = text;
      same = 1;
    }
  }
  return result;
}

function giveCultForTakingFavorTile(player, tile) {
  if(tile == T_FAV_3F) giveCult(player, C_F, 3);
  else if(tile == T_FAV_3W) giveCult(player, C_W, 3);
  else if(tile == T_FAV_3E) giveCult(player, C_E, 3);
  else if(tile == T_FAV_3A) giveCult(player, C_A, 3);
  else if(tile == T_FAV_2F_6TW) giveCult(player, C_F, 2);
  else if(tile == T_FAV_2W_CULT) giveCult(player, C_W, 2);
  else if(tile == T_FAV_2E_1PW1W) giveCult(player, C_E, 2);
  else if(tile == T_FAV_2A_4PW) giveCult(player, C_A, 2);
  else if(tile == T_FAV_1F_3C) giveCult(player, C_F, 1);
  else if(tile == T_FAV_1W_TPVP) giveCult(player, C_W, 1);
  else if(tile == T_FAV_1E_DVP) giveCult(player, C_E, 1);
  else if(tile == T_FAV_1A_PASSTPVP) giveCult(player, C_A, 1);
}

//Does NOT handle the T_FAV_2F_6TW town formation, actionCreatesTown does that.
function giveFavorTile(player, tile) {
  if(tile > T_FAV_BEGIN && tile < T_FAV_END) {
    if(game.favortiles[tile] <= 0) {
      return 'this favor tile is no longer available';
    }
    if(player.favortiles[tile]) {
      return 'already has this favor tile';
    }
    player.favortiles[tile] = 1;
    game.favortiles[tile]--;
    giveCultForTakingFavorTile(player, tile);
    return '';
  } else {
    return 'invalid favor tile';
  }
}

//For the cult or ship tiles, only returns the VP's.
function getTownTileResources(tile) {
  if(tile == T_TW_2VP_2CULT) return [0,0,0,0,2];
  if(tile == T_TW_4VP_SHIP) return [0,0,0,0,4];
  if(tile == T_TW_5VP_6C) return [6,0,0,0,5];
  if(tile == T_TW_6VP_8PW) return [0,0,0,8,6];
  if(tile == T_TW_7VP_2W) return [0,2,0,0,7];
  if(tile == T_TW_8VP_CULT) return [0,0,0,0,8];
  if(tile == T_TW_9VP_P) return [0,0,1,0,9];
  if(tile == T_TW_11VP) return [0,0,0,0,11];
  throw new Error('invalid town tile');
}

//also adds the necessary resources and VPs
function giveTownTile(player, tile) {
  if(tile > T_TW_BEGIN && tile < T_TW_END) {
    if(game.towntiles[tile] <= 0) {
      return 'this town tile is no longer available';
    }
    player.towntiles[tile] = incrUndef(player.towntiles[tile], 1);
    var res = getTownTileResources(tile);
    addIncome(player, res, 'town', getTileCodeName(tile));

    if(tile == T_TW_8VP_CULT || tile == T_TW_2VP_2CULT) {
      var num = tile == T_TW_2VP_2CULT ? 2 : 1;
      var nine = 10 - num; //nine refers to the value which would bring it to ten. Usually 9, but for the T_TW_2VP_2CULT tile that happens at 8.

      //TODO: make this hack smarter for T_TW_2VP_2CULT
      //If there are multiple nines and not enough keys to go up all of them, in theory the player should have the choice. That code is not implemented yet, instead automatically choose the most threatened ones.
      //to quickly debug this, type in console: players[1].cult[2] = 5; players[0].cult[0] = 9; players[0].cult[1] = 9; players[0].cult[2] = 9; players[0].cult[3] = 9;
      var nines = 0;
      for(var i = C_F; i <= C_A; i++) {
        if(player.cult[i] < 10 && player.cult[i] >= nine) nines++;
      }
      while(nines > player.keys && player.keys > 0) {
        var threatened = getMostThreatenedWinningCultTrack(player);
        if(threatened == C_NONE) return ''; //happens when all cults are already at the top
        giveCult(player, threatened, num);
        nines--;
      }
      //End of "most threatened cult track" hack.

      for(var i = C_F; i <= C_A; i++) {
        giveCult(player, i, num);
      }
    }

    game.towntiles[tile]--;
    return '';
  } else {
    return 'invalid town tile';
  }
}

//when passing (or at game start)
function giveBonusTile(player, tile) {
  if((tile > T_BON_BEGIN && tile < T_BON_END) || tile == T_NONE) {
    var oldtile = player.bonustile;
    if(shippingBonusTileWorks(player)) {
      if(oldtile == T_BON_3PW_SHIP) {
        player.bonusshipping--;
      }
      if(tile == T_BON_3PW_SHIP) {
        player.bonusshipping++;
      }
    }

    if(player.bonustile > T_BON_BEGIN) game.bonustiles[player.bonustile]++;

    if(tile == T_NONE) {
      // this is during the last round
      player.bonustile = T_NONE;
    } else {
      if(game.bonustiles[tile] <= 0) return 'this bonus tile is no longer available';
      game.bonustiles[tile]--;
      player.bonustile = tile;
      if(game.bonustilecoins[tile]) player.c += game.bonustilecoins[tile];
      game.bonustilecoins[tile] = 0;
    }
    return '';
  } else {
    return 'invalid bonus tile';
  }
}

//returns true if successful, false if house could not be placed there
function placeInitialDwelling(player, x, y) {
  if(getWorld(x, y) != player.color) return 'wrong tile color';
  if(getBuilding(x, y)[0] != B_NONE) return 'already has building';
  if(player.b_d <= 0) return 'no dwellings left. This error should never happen.';
  player.b_d--;
  setBuilding(x, y, B_D, player.color);
  return '';
}

function isActionArray(action) {
  return action.length != 0 && action.type == undefined;
}



//returns amount of different favor tiles still available to the player, capped to num for efficiency
//this is for checking the extremely rare case where a player has tons of favor tiles and there
//is no more favor tile the player doesn't already have available.
function favorTilesAvailable(player, num) {
  var result = 0;
  for(var tile =  T_FAV_BEGIN + 1; tile < T_FAV_END; tile++) {
    if(!player.favortiles[tile] && game.favortiles[tile] > 0) result++;
    if(result >= num) return result;
  }
  return result;
}

//similar as favorTilesAvailable, but for town tiles
function townTilesAvailable(num) {
  var result = 0;
  for(var tile =  T_TW_BEGIN + 1; tile < T_TW_END; tile++) {
    if(game.towntiles[tile] > 0) result++;
    if(result >= num) return result;
  }
  return result;
}

//returns amount of favor tiles this action gives (typically 0 or 1, or 2 for chaosmagicians, or even 4 for them if they use double action)
//supports both action and array of actions
function actionGivesFavorTile(player, action) {
  if(!isActionArray(action)) action = [action];
  var result = 0;
  for(var i = 0; i < action.length; i++) {
    if(action[i].type == A_UPGRADE_TE || action[i].type == A_UPGRADE_SA) result += player.faction == F_CHAOS ? 2 : 1;
    if(action[i].type == A_UPGRADE_SH) result += player.faction == F_AUREN ? 1 : 0;
  }
  return Math.min(result, favorTilesAvailable(player, result));
}

//returns amount of towns created by this action (can be multiple when taking the 6 town size favor tile for example)
//can be multiple actions in a row, and if so, ensures it's not about the same town
//if it's for a A_CONNECT_WATER_TOWN action, you SHOULD give the whole actions array, not just that one mermaids action, otherwise it will not take just built buildings into account
//previousActions is only used if it's the mermaids A_CONNECT_WATER_TOWN action, and may be the whole array (the previous part, that is, everything before the mermaids action, is used)
function actionCreatesTown(player, action, previousActions) {
  if(previousActions) {
    var numHeavy = 0;
    for(var i = 0; i < previousActions.length; i++) {
      if(actionMightFormTown(previousActions[i])) numHeavy++;
    }
    if(numHeavy > 1) {
      return actionsCreateTown(player, previousActions, action);
    }
  }

  var reqpower = getTownReqPower(player);
  var involved = []; //the indices of the clusters involved in the towns (to avoid duplicates, e.g when both upgrading to SA and taking 6 town size tile)

  //favtiles must be checked first, for when you pick fav tile for town size 6 and at the same time upgrade to SA making some town size 6.
  for(var i = 0; i < action.favtiles.length; i++) {
    if(action.favtiles[i] == T_FAV_2F_6TW) {
      reqpower = 6; //from now on for next actions this reqpower is used
      var tw = getPlayerTownsOfSize6(player.color, townclusters);
      //this are all individual clusters, so add them one by one as a single length array each
      for(var j = 0; j < tw.length; j++) involved.push([tw[j]]);
    }
  }

  if(isUpgradeAction(action)) {
    var tw = makesNewTownByUpgrade(action.co[0], action.co[1], getUpgradeActionOutputBuilding(action), reqpower);
    if(tw.length > 0) involved.push(tw);
  }
  else if(isTownyBuildAction(action)) {
    var building = action.type == A_CONNECT_WATER_TOWN ? B_MERMAIDS : B_D;
    var tw = makesNewTownByBuilding(action.co[0], action.co[1], building, reqpower, player.color);
    if(tw.length > 0) involved.push(tw);
  }
  else if(isBridgeAction(action)) {
    var tw = makesNewTownByBridge(action.cos[0][0], action.cos[0][1], action.cos[1][0], action.cos[1][1], reqpower, player.color);
    if(tw.length > 0) involved.push(tw);
  }

  var result = 0;

  if(involved.length == 0) {
    return 0;
  }
  else if(involved.length == 1) {
    result = 1;
  }
  else {
    //possibly multiple towns formed. Need to resolve "involved".
    //the number of towns is not just the number of unique cluster indices in involved, because if multiple joined clusters together form a town, multiple cluster indices are part of the same one
    //NOTE: this is actually more complicated than needed, this implementation would work if multiple turn actions succeed each other, but that functionality was removed
    var used = {};
    var result = 0;
    for(var i = 0; i < involved.length; i++) {
      if(involved[i].length == 0) throw new Error('wrong length during town calculation');
      var ok = true;
      for(var j = 0; j < involved[i].length; j++) {
        var index = involved[i][j];
        if(used[index]) ok = false;
        else used[index] = true;
      }
      if(ok) result++;
    }
  }

  //if there are no more town tiles left, it does not count, not even for extra VP bonus, swarmlings 2 workers, etc...
  return Math.min(result, townTilesAvailable(result));
}

function getAlreadyChosenColors() {
  var already = [false /*N*/, false,false,false,false,false,false,false]; //already chosen colors
  for(var i = 0; i < game.players.length; i++) {
    if(game.players[i].faction != F_NONE /*if already has chosen*/) {
      already[factionColor(game.players[i].faction)] = true;
    }
  }
  return already;
}

//During faction choice. Returns '' if ok, error string if not.
function trySetFaction(player, faction) {
  if(faction < F_ALL_BEGIN || faction > F_ALL_END) return 'invalid faction';

  var already = getAlreadyChosenColors();

  if(already[factionColor(faction)]) return 'color already chosen';

  player.faction = faction;
  player.color = factionColor(faction);
  return '';
}

//returns the leech effects caused by the actions by the player.
//it returns an array of leech actions, where each leech action is of the form [playerIndex, amount]. So it's a 2D array.
//the order of players is already sorted correctly, beginning with the first one after the player who did the action and so on
//The amount is the amount given the buildings. This must later be adjusted for the player's actual current power and VP (can be less or even 0 at that point)
//sometimes, multiple series of leeches can happen in one series of actions, e.g. halflings stronghold and then building dwelling, or chaos magicians double action. So the same player may appear multiple times in the list.
function getLeechEffect(playerIndex, actions) {
  var result = [];
  for(var i = 0; i < actions.length; i++) {
    if(isUpgradeAction(actions[i]) || isBuildDwellingAction(actions[i])) {
      var pos = actions[i].co;
      var tiles = getConnectedTiles(pos[0], pos[1]);
      var leechers = [];
      for(var j = 0; j < tiles.length; j++) {
        var b = getBuilding(tiles[j][0], tiles[j][1]);
        if(b[0] == B_NONE || b[0] == B_MERMAIDS) continue;
        var index = colorToPlayerMap[b[1]];
        if(index == playerIndex) continue; //don't leech from self
        var power = getBuildingPower(b[0]);
        leechers[index] = incrUndef(leechers[index], power);
      }
      if(leechers.length > 0) {
        for(var j = 0; j < game.players.length; j++) {
          var k = wrap(playerIndex + j + 1, 0, game.players.length); //start with next player
          var power = leechers[k];
          if(power) {
            var amount = leechers[k];
            result.push([k, amount/*, pos[0], pos[1]*/]);
          }
        }
      }
    }
  }
  return result;
}


//Given a leech amount, returns actual amount the leecher can leech (which can be less due to less power in bowls I and II, or due to having very low VP)
function actualLeechAmount(player, amount) {
  amount = Math.min(amount, player.pw0 * 2 + player.pw1);
  amount = Math.min(amount, player.vp + 1);
  return amount;
}

//it is actually gamestate.js that checks validity of whether the player can leech any power
//if amount is greater than the player can accept, it will simply accept the max
function leechPower(player, amount) {
  amount = actualLeechAmount(player, amount);
  if(amount <= 0) throw new Error('invalid leech amount');
  if(player.vp - amount + 1 < 0) return 'not enough vp';
  player.addVP(-(amount - 1), 'leech', 'leech');
  addPower(player, amount);
  return '';
}

//For giants, toColor should be player.color. Giants cannot dig to any other color than that.
function digDist(player, tileColor, toColor) {
  if(tileColor == toColor) return 0;
  if(player.faction == F_GIANTS) return 2; //Giants can dig from any other color to their home color with 2 spades, nothing else.
  else return colorDist(tileColor, toColor);
}

//the cost for tunneling or carpets
function getTunnelCarpetCost(player) {
  if(player.faction == F_FAKIRS) return [0,0,1,0,0];
  else if(player.faction == F_DWARVES) return [0,built_sh(player) ? 1 : 2,0,0,0];
  else return [0,0,0,0,0];
}

function temporaryTunnelCarpetOk(player, x, y) {
  return player.tunnelcarpet && player.tunnelcarpet[0] == x && player.tunnelcarpet[1] == y;
}

//for end game resource scoring. Returns endgame score
//function convertEverythingToCoinsAndReturnScore(player) {
  //while(player.pw1 >= 2) {
    //burnPower(player, 1);
  //}
  //player.c += player.pw2;
  //usePower(player, player.pw2);
  //player.c += player.w;
  //player.w = 0;
  //player.c += player.p;
  //player.p = 0;
  //if(player.faction == F_ALCHEMISTS) return Math.floor(player.c / 2);
  //else return Math.floor(player.c / 3);
//}


function getResourceEndGameScoring(player) {
  var num = player.c + player.w + player.p + player.pw2 + Math.floor(player.pw1 / 2);
  if(player.faction == F_ALCHEMISTS) return Math.floor(num / 2);
  else return Math.floor(num / 3);
}

//name and faction
function getFullName(player) {
  if(!player.faction) return player.name;
  return player.name + ' (' + getFactionCodeName(player.faction) + ')';
}

function getFullNameColored(player) {
  var name = getFullName(player);
  var imColor = getImageColor(player.color);
  var bgcolor = imColor;
  var fgcolor = getHighContrastColor(imColor);
  return '<span style="color:' + fgcolor + '; background-color:' + bgcolor + '">' + name + '</span>';
}


// divide points over players with the tie breaker rule, and given the 3 used point values (for cult tracks or for network scoring)
// input:
// -array of player values (higher = better, equal = tie)
// -the 3 scores [best, second best, third best]
// -minValue: minimum value to be eligable for points (e.g. on cult track you cannot gain points on 0)
// output:
// -array of [player index, value, score] to give to each player, sorted from highest to lowest score
function distributePoints(values, scores, minValue) {
  var rem = 3; //points to distribute that are remaining

  var sorted = [];
  for(var i = 0; i < values.length; i++) sorted[i] = [i, values[i], 0];
  sorted.sort(function(a, b) {
    return b[1] - a[1];
  });

  for(var i = 0; i < sorted.length; i++) {
    if(sorted[i][1] < minValue) break; //not eligable for points anymore
    var j = i + 1;
    while(j < sorted.length && sorted[j][1] == sorted[i][1]) j++;
    var num = j - i; //number of players sharing this bucket
    var score = 0;
    for(var k = 0; k < num; k++) {
      score += scores[3 - rem];
      rem--;
      if(rem <= 0) break;
    }
    score = Math.floor(score / num);
    for(var k = i; k < j; k++) sorted[k][2] = score;
    if(rem <= 0) break;
    i = j - 1;
  }

  sorted.sort(function(a, b) {
    return b[2] - a[2];
  });
  return sorted;
}

//similar to distributePoints, but only returns a single number: what the given player gets
function getDistributedPoints(playerIndex, values, scores, minValue) {
  if(values[playerIndex] < minValue) return 0;

  var numHigher = 0;
  var numEqual = 0;
  for(var i = 0; i < values.length; i++) {
    if(i == playerIndex) continue;
    if(values[i] > values[playerIndex]) numHigher++;
    if(values[i] == values[playerIndex]) numEqual++;
  }

  if(numHigher >= scores.length) return 0;

  var score = scores[numHigher];

  if(numEqual > 0) {
    for(var i = 0; i < numEqual && numHigher + 1 + i < scores.length; i++) {
      score += scores[numHigher + 1 + i];
    }
    return Math.floor(score / (1 + numEqual));
  }

  return score;
}

//returns array of a cult track end score per player
function getCultEndScores(track) {
  var result = [];
  for(var i = 0; i < game.players.length; i++) result[i] = 0;

  var values = [];
  for(var j = 0; j < game.players.length; j++) {
    values[j] = game.players[j].cult[track];
  }
  var scores = distributePoints(values, [8, 4, 2], 1);
  for(var j = 0; j < scores.length; j++) {
    if(scores[j][2] != 0) {
      result[scores[j][0]] += scores[j][2];
    }
  }

  return result;
}

//returns array of [network end score][network size] per player
function getNetworkEndScores() {
  var result = [];
  for(var i = 0; i < game.players.length; i++) result[i] = [0, 0];

  calculateNetworkClusters();
  var values = [];
  for(var j = 0; j < game.players.length; j++) {
    values[j] = getBiggestNetwork(game.players[j]);
  }
  var scores = distributePoints(values, [18, 12, 6], 0);
  for(var j = 0; j < scores.length; j++) {
    if(scores[j][2] != 0) {
      result[scores[j][0]][0] += scores[j][2];
      result[scores[j][0]][1] += scores[j][1];
    }
  }

  return result;
}

//returns resource score per player
function getResourceEndScores() {
  var result = [];
  for(var i = 0; i < game.players.length; i++) result[i] = 0;

  for(var i = 0; i < game.players.length; i++) {
    result[i] += getResourceEndGameScoring(game.players[i]);
  }

  return result;
}

function applyPassBonus(playerin, playerout) {
  if(playerin.bonustile == T_BON_PASSDVP_2C) {
    playerout.addVP(built_d(playerin) * 1, 'bonus', getTileCodeName(T_BON_PASSDVP_2C));
  }
  if(playerin.bonustile == T_BON_PASSTPVP_1W) {
    playerout.addVP(built_tp(playerin) * 2, 'bonus', getTileCodeName(T_BON_PASSTPVP_1W));
  }
  if(playerin.bonustile == T_BON_PASSSHSAVP_2W) {
    playerout.addVP(built_sh(playerin) * 4 + built_sa(playerin) * 4, 'bonus', getTileCodeName(T_BON_PASSSHSAVP_2W));
  }
  if(playerin.bonustile == T_BON_PASSSHIPVP_3PW) {
    playerout.addVP(playerin.shipping * 3, 'bonus', getTileCodeName(T_BON_PASSSHIPVP_3PW));
  }
  if(playerin.favortiles[T_FAV_1A_PASSTPVP]) {
    var vp = [0,2,3,3,4][built_tp(playerin)];
    playerout.addVP(vp, 'favor', getTileCodeName(T_FAV_1A_PASSTPVP));
  }
}

function getPassBonusEndScores() {
  var result = [];
  for(var i = 0; i < game.players.length; i++) result[i] = 0;

  for(var i = 0; i < game.players.length; i++) {
    var dummy = new Player();
    dummy.vp = 0;
    applyPassBonus(game.players[i], dummy);
    result[i] += dummy.vp;
  }

  return result;
}


//returns array of projected end game scores per player. Per player it's an array
//of: total, cult, network, resource, passing
function projectEndGameScores() {
  var cultscores = [];
  cultscores[0] = getCultEndScores(C_F);
  cultscores[1] = getCultEndScores(C_W);
  cultscores[2] = getCultEndScores(C_E);
  cultscores[3] = getCultEndScores(C_A);
  var networkscores = getNetworkEndScores();
  var resourcescores = getResourceEndScores();
  var passscores = getPassBonusEndScores();

  var result = [];
  for(var i = 0; i < game.players.length; i++) result[i] = [game.players[i].vp, 0, 0, 0, 0];

  for(var i = 0; i < game.players.length; i++) {
    for(var j = C_F; j <= C_A; j++) {
      result[i][1] += cultscores[j - C_F][i];
    }
    result[i][2] = networkscores[i][0];
    result[i][3] = resourcescores[i];
    if(!game.players[i].passed) result[i][4] = passscores[i];
    for(var j = 1; j < result[i].length; j++) result[i][0] += result[i][j];
  }

  return result;
}

function initBoard() {
  waterDistanceCalculated = [];
  state.round = 0;

  initBuildings(game.buildings, game.bw, game.bh);
  initBridges(game.bridges, game.bw, game.bh);

  game.favortiles = {};
  for(var i = T_FAV_BEGIN + 1; i < T_FAV_END; i++) game.favortiles[i] = getTileInitialCount(i);
  game.towntiles = {};
  for(var i = T_TW_BEGIN + 1; i < T_TW_END; i++) {
    if (state.towntilepromo2013 || !isTownTilePromo2013Tile(i)) {
      game.towntiles[i] = getTileInitialCount(i);
    }
  }
  //This fills in all bonus tiles. Some will be removed later. E.g. the snellman log loader depends on this.
  game.bonustiles = {};
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) {
    if (state.bonustilepromo2013 || !isBonusTilePromo2013Tile(i)) {
      game.bonustiles[i] = 1;
    }
  }
  game.bonustilecoins = [];

  game.cultp = [[N,N,N,N],[N,N,N,N],[N,N,N,N],[N,N,N,N]];
  game.octogons = {};

  calculateTownClusters();
}
