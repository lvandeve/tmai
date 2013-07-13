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


//Actions. The cost and result are not included, must be known given the A_ value, faction and player stats.
var A_index = 0;
var A_NONE = A_index++;
//Burn & convert power (non-turn actions)
var A_BURN = A_index++; //burn power
var A_CONVERT_ACTIONS_BEGIN = A_index++; //not an actual action, used for comparisons
var A_CONVERT_1PW_1C = A_index++;
var A_CONVERT_3PW_1W = A_index++;
var A_CONVERT_5PW_1P = A_index++;
var A_CONVERT_1P_1W = A_index++;
var A_CONVERT_1W_1C = A_index++;
var A_CONVERT_1VP_1C = A_index++; //alchemists only
var A_CONVERT_2C_1VP = A_index++; //alchemists only (TODO: remove this as action? It is only for endgame scoring)
var A_CONVERT_1W_1P = A_index++; //darklings only, after building their SH, max 3 times (the SH upgrade action must precede)
var A_CONVERT_ACTIONS_END = A_index++; //not an actual action, used for comparisons
var A_CONNECT_WATER_TOWN = A_index++; //mermaids
//Faction specific non-turn actions
var A_DOUBLE = A_index++; //chaos magicians double action
var A_TUNNEL = A_index++; //dwarves special ability.
var A_CARPET = A_index++; //fakirs special ability.
//Pass
var A_PASS = A_index++;
//Power resources
var A_POWER_1P = A_index++;
var A_POWER_2W = A_index++;
var A_POWER_7C = A_index++;
//Spade giving actions
var A_SPADE = A_index++; //Convert workers into spade (or priest if alchemists)
var A_BONUS_SPADE = A_index++; //From the pass bonus tile.
var A_POWER_SPADE = A_index++;
var A_POWER_2SPADE = A_index++;
var A_GIANTS_2SPADE = A_index++;
//Transforming actions
var A_TRANSFORM_CW = A_index++; //transform terrain clockwise 1 step
var A_TRANSFORM_CCW = A_index++; //transform terrain counterclockwise 1 step
var A_GIANTS_TRANSFORM = A_index++; //transform terrain to giants home color. Consumes two spades.
var A_SANDSTORM = A_index++; //nomads sandstorm. No spades needed for this action.
//The build dwelling actions
var A_BUILD = A_index++; //build a dwelling. This action can either be on its own, or after any of the DIG actions
var A_WITCHES_D = A_index++; //free dwelling anywhere on the green color
//The upgrade actions need the coordinates of the location of the building to upgrade, plus potentially more for the SH effect, potential town tile, ...
var A_UPGRADE_TP = A_index++;
var A_UPGRADE_TE = A_index++; //includes taking favor tile(s)
var A_UPGRADE_SH = A_index++; //includes any of the actions of the faction, including up to 3 dig coordinates + house coordinate for halflings
var A_UPGRADE_SA = A_index++; //includes taking favor tile(s)
var A_SWARMLINGS_TP = A_index++; //free TP upgrade
//Cult
var A_CULT_PRIEST3 = A_index++; //priest to first spot on cult track, move 3 up
var A_CULT_PRIEST2 = A_index++; //priest to remaining spot on cult track, move 2 up
var A_CULT_PRIEST1 = A_index++; //priest comes back to pool, move 1 up
var A_BONUS_CULT = A_index++;
var A_FAVOR_CULT = A_index++;
var A_AUREN_CULT = A_index++; //2 cult advances
//Advance
var A_ADV_SHIP = A_index++;
var A_ADV_DIG = A_index++;
//Bridge
var A_POWER_BRIDGE = A_index++; //from the power action
var A_ENGINEERS_BRIDGE = A_index++;
//Debug
var A_DEBUG_SKIP = A_index++; //skip a whole round for debug purposes (such as watching AI's)
var A_DEBUG_STEP = A_index++; //skip an action for debug purposes (such as watching AI's)

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
  return action.type == A_BUILD || action.type == A_WITCHES_D || action.type == A_CONNECT_WATER_TOWN;
}

function isBuildDwellingAction(action) {
  return action.type == A_BUILD || action.type == A_WITCHES_D;
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
    if(action.favtiles[i] == T_FAV_2R_6TW) return true;
  }
  return false;
}

function actionsRequireTownClusterRecalc(actions) {
  for(var i = 0; i < actions.length; i++) if(actionRequiresTownClusterRecalc(actions[i])) return true;
  return false;
}

//Bonus, favor, town and round scoring tiles
var T_index = 0;
var T_NONE = T_index++;
var T_DUD = T_index++; //not a real tile, but filled in by action generation functions, to be replaced with proper tiles later
var T_BON_BEGIN = T_index++;
var T_BON_SPADE_2C = T_index++;
var T_BON_CULT_4C = T_index++;
var T_BON_6C = T_index++;
var T_BON_3PW_SHIP = T_index++;
var T_BON_3PW_1W = T_index++;
var T_BON_PASSDVP_2C = T_index++;
var T_BON_PASSTPVP_1W = T_index++;
var T_BON_PASSSHSAVP_2W = T_index++;
var T_BON_1P = T_index++;
var T_BON_END = T_index++;
var T_FAV_BEGIN = T_index++;
var T_FAV_3R = T_index++;
var T_FAV_3B = T_index++;
var T_FAV_3O = T_index++;
var T_FAV_3W = T_index++;
var T_FAV_2R_6TW = T_index++;
var T_FAV_2B_CULT = T_index++;
var T_FAV_2O_1PW1W = T_index++;
var T_FAV_2W_4PW = T_index++;
var T_FAV_1R_3C = T_index++;
var T_FAV_1B_TPVP = T_index++;
var T_FAV_1O_DVP = T_index++; //place dwelling VP
var T_FAV_1W_PASSTPVP = T_index++;
var T_FAV_END = T_index++;
var T_TW_BEGIN = T_index++;
var T_TW_5VP_6C = T_index++;
var T_TW_6VP_8PW = T_index++;
var T_TW_7VP_2W = T_index++;
var T_TW_8VP_CULT = T_index++;
var T_TW_9VP_P = T_index++;
var T_TW_END = T_index++;
var T_ROUND_BEGIN = T_index++;
var T_ROUND_DIG2VP_1O1C = T_index++;
var T_ROUND_TW5VP_4O1DIG = T_index++;
var T_ROUND_D2VP_4B1P = T_index++;
var T_ROUND_SHSA5VP_2R1W = T_index++;
var T_ROUND_D2VP_4R4PW = T_index++;
var T_ROUND_TP3VP_4B1DIG = T_index++;
var T_ROUND_SHSA5VP_2W1W = T_index++;
var T_ROUND_TP3VP_4W1DIG = T_index++;
var T_ROUND_END = T_index++;
var T_TILE_ENUM_END = T_index++;

function isBonusTile(tile) {
  return tile > T_BON_BEGIN && tile < T_BON_END;
}
function isFavorTile(tile) {
  return tile > T_FAV_BEGIN && tile < T_FAV_END;
}
function isTownTile(tile) {
  return tile > T_TW_BEGIN && tile < T_TW_END;
}

//not yet taken tiles
var favortiles = {};
for(var i = T_FAV_BEGIN + 1; i < T_FAV_END; i++) favortiles[i] = i <= T_FAV_3W ? 1 : 3;
var towntiles = {};
for(var i = T_TW_BEGIN + 1; i < T_TW_END; i++) towntiles[i] = 2;
var bonustiles = {};
for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) bonustiles[i] = 1;

//the extra coins that appear on non-taken tiles
var bonustilecoins = [];
function addBonusTileCoins() {
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) if(bonustiles[i]) bonustilecoins[i] = incrUndef(bonustilecoins[i], 1);
}

//remove some, depending on amount of players
//this function is not used anymore because of the preset bonus tile options
function randomizeBonusTiles() {
  bonustilecoins = [];
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) bonustiles[i] = 1;
  var keep = players.length + 3;
  var remove = T_BON_END - T_BON_BEGIN - 1 - keep;
  for(var i = 0; i < remove; i++) {
    while(true) {
      var index = T_BON_BEGIN + 1 + randomInt(T_BON_END - T_BON_BEGIN - 1);
      if(!bonustiles[index]) continue; //already gone;
      bonustiles[index] = 0;
      addLog('eliminated bonus tile ' + tileToString(index));
      break;
    }
  }
}

//for rounds 1-6
//this function is not used anymore because of the preset round tile options
var roundtiles = [];
function randomizeRoundTiles() {
  var taken = {};
  for(var i = 6; i > 0; i--) {
    while(true) {
      var index = T_ROUND_BEGIN + 1 + randomInt(T_ROUND_END - T_ROUND_BEGIN - 1);
      if(i >= 5 && index == T_ROUND_DIG2VP_1O1C) continue; //no digging VP's in the last two rounds due to halflings abuse
      if(taken[index]) continue; //no duplicate round tiles
      taken[index] = true;
      roundtiles[i] = index;
      break;
    }
  }
}



//All action octogons
var O_index = 0;
var O_NONE = O_index++;
var O_START = O_index++;
var O_POW_BRIDGE = O_index++;
var O_POW_1P = O_index++;
var O_POW_2W = O_index++;
var O_POW_7C = O_index++;
var O_POW_SPADE = O_index++;
var O_POW_2SPADE = O_index++;
var O_BON_SPADE_2C = O_index++;
var O_BON_CULT_4C = O_index++;
var O_FAV_2B_CULT = O_index++;
var O_FACTION_BEGIN = O_index++; //not a real octogon
var O_FACTION_CHAOS = O_index++;
var O_FACTION_GIANTS = O_index++;
var O_FACTION_NOMADS = O_index++;
var O_FACTION_SWARMLINGS = O_index++;
var O_FACTION_AUREN = O_index++;
var O_FACTION_WITCHES = O_index++;
var O_FACTION_END = O_index++; //not a real octogon
var O_END = O_index++;

//todo: merge this with action names everywhere to have consistent names
function getOctogonName(octogon) {
  if(octogon == O_POW_BRIDGE) return 'bridge';
  if(octogon == O_POW_1P) return '1p';
  if(octogon == O_POW_2W) return '2w';
  if(octogon == O_POW_7C) return '7c';
  if(octogon == O_POW_SPADE) return 'powspade';
  if(octogon == O_POW_2SPADE) return 'pow2spade';
  if(octogon == O_BON_SPADE_2C) return 'bonspade';
  if(octogon == O_BON_CULT_4C) return 'boncult';
  if(octogon == O_FAV_2B_CULT) return 'favcult';
  if(octogon == O_FACTION_CHAOS) return 'chaos';
  if(octogon == O_FACTION_GIANTS) return 'giants';
  if(octogon == O_FACTION_NOMADS) return 'nomads';
  if(octogon == O_FACTION_SWARMLINGS) return 'swarmlings';
  if(octogon == O_FACTION_WITCHES) return 'witches';
}

//global octogons. Octogons is a map, where undefined means the action is free, 1 means the action is taken. There are global octogons and per-player octogons.
var octogons = {};
function initOctogons() {
  octogons = {};
  for(var j = 0; j < players.length; j++) {
    players[j].octogons = {};
  }
}

//cults
var C_NONE = -1;
var C_R = 0; //red
var C_B = 1; //blue
var C_O = 2; //brown
var C_W = 3; //white
//TODO: Name these according to the element instead of color: C_F, C_W, C_E and C_A

function getCultName(cult) {
  if(cult == C_R) return 'fire';
  if(cult == C_B) return 'water';
  if(cult == C_O) return 'earth';
  if(cult == C_W) return 'air';
  return 'unknown';
}

//The players
var players = [];

var colorToPlayerMap = {}; //map to the index of the player (cannot point to the player objects themselves due to their backup cloning that changes their addresses)

function createColorToPlayerMap() {
  for(var i = 0; i < players.length; i++) {
    colorToPlayerMap[players[i].color] = i;
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

//priests sent to each cult track. The main array is for each track.
//The sub array is the 4 priest places, the first being the value 3 one, the others the value 2 ones.
//value N means no player is there, otherwise it's the player color
//the '2' spots are filled in from left to right, so checking if cultp[C_R][3] == 'N' is enough to see that there's a free '2' spot left there.
var cultp = [[N,N,N,N],[N,N,N,N],[N,N,N,N],[N,N,N,N]];

function getTownReqPower(player) {
  return player.favortiles[T_FAV_2R_6TW] > 0 ? 6 : 7;
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
  else if(tile == T_FAV_2O_1PW1W) return [0,1,0,1,0];
  else if(tile == T_FAV_2W_4PW) return [0,0,0,4,0];
  else if(tile == T_FAV_1R_3C) return [3,0,0,0,0];
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

//This can also add VP, but you must add this to the specific player VP breakdown type yourself
function addIncome(player, income) {
  player.c += income[0];
  player.w += income[1];
  addPriests(player, income[2]);
  addPower(player, income[3]);

  //this probably never happens, VP is not part of income
  player.vp += income[4];
}

//consumed is a 5 element income array
//precondition: player has enough resources
function consume(player, consumed) {
  player.c -= consumed[0];
  player.w -= consumed[1];
  player.p -= consumed[2];
  usePower(player, consumed[3]);

  //this can happen for alchemists
  player.vp -= consumed[4];
  if(player.faction == F_ALCHEMISTS) player.vp_faction -= consumed[4];
  else player.vp_other -= consumed[4];
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
  var dist = digDist(player, tile);
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

//non destructive if it fails. Returns error string.
//type is e.g. A_TRANSFORM_CCW, ...
function tryRoundBonusDig(player, type, x, y) {
  var error = canDoRoundBonusDig(player, type, x, y);
  if(error != '') return error;
  var tile = getWorld(x, y);

  if(type == A_GIANTS_TRANSFORM) setWorld(x, y, player.color);
  else if(type == A_TRANSFORM_CW) {
      color = tile + 1;
      if(color == E + 1) color = R;
      setWorld(x, y, color);
  }
  else if(type == A_TRANSFORM_CCW) {
      color = tile - 1;
      if(color == R - 1) color = E;
      setWorld(x, y, color);
  }

  if(player.faction == F_HALFLINGS) { player.vp++; player.vp_faction++; }
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
  return roundtiles[state.round];
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
  var cp = cultp[action.cult];
  if(action.cult < 0 || action.cult > 3) return 'invalid cult';
  if(action.type == A_CULT_PRIEST3 && cp[0] != N) return 'the 3 is full';
  if(action.type == A_CULT_PRIEST2 && cp[1] != N && cp[2] != N && cp[3] != N) return 'the 2s are full';
  var num = action.type == A_CULT_PRIEST3 ? 3 : action.type == A_CULT_PRIEST2 ? 2 : 1;

  giveCult(player, action.cult, num);
  player.p--;

  if(action.type != A_CULT_PRIEST1) {
    if(player.pp <= 0) throw 'priest pool went wrong';
    player.pp--;
  }

  if(action.type == A_CULT_PRIEST3) cp[0] = player.color;
  if(action.type == A_CULT_PRIEST2) {
    if(cp[1] == N) cp[1] = player.color;
    else if(cp[2] == N) cp[2] = player.color;
    else if(cp[3] == N) cp[3] = player.color;
    else throw 'already full';
  }

  return '';
}

function tryCultAction(player, action) {

  var cp = cultp[action.cult];
  if(action.cult < 0 || action.cult > 3) return 'invalid cult';
  var num = action.type == A_AUREN_CULT ? 2 : 1;

  if(action.type == A_BONUS_CULT) {
    if(player.bonustile != T_BON_CULT_4C) return 'player does not have bonus cult tile';
    if(player.octogons[O_BON_CULT_4C]) return 'bonus cult already used';
    player.octogons[O_BON_CULT_4C] = 1;
  }

  if(action.type == A_FAVOR_CULT) {
    if(!player.favortiles[T_FAV_2B_CULT]) return 'player does not have favor cult tile';
    if(player.octogons[O_FAV_2B_CULT]) return 'favor cult already used';
    player.octogons[O_FAV_2B_CULT] = 1;
  }

  if(action.type == A_AUREN_CULT) {
    if(!built_sh(player)) return 'auren cult action requires stronghold';
    if(player.octogons[O_FACTION_AUREN]) return 'auren cult already used';
    player.octogons[O_FACTION_AUREN] = 1;
  }

  giveCult(player, action.cult, num);

  return '';
}

//add extra VP (and a few other resources) from the action: everything related to faction powers and favor, bonus and round tiles giving some extra immediate VP or other resource.
//includes alchemists SH power
function addExtrasForAction(player, action) {
  if(action.type == A_UPGRADE_TP || action.type == A_SWARMLINGS_TP) {
    if(player.favortiles[T_FAV_1B_TPVP]) {
      player.vp += 3;
      player.vp_favor += 3;
    }
    if(getRoundTile() == T_ROUND_TP3VP_4B1DIG || getRoundTile() == T_ROUND_TP3VP_4W1DIG) {
      player.vp += 3;
      player.vp_round += 3;
    }
  }
  
  if(action.type == A_BUILD || action.type == A_WITCHES_D) {
    if(player.favortiles[T_FAV_1O_DVP]) {
      player.vp += 2;
      player.vp_favor += 2;
    }
    if(getRoundTile() == T_ROUND_D2VP_4B1P || getRoundTile() == T_ROUND_D2VP_4R4PW) {
      player.vp += 2;
      player.vp_round += 2;
    }
  }

  if(isSpadeConsumingAction(action)) {
    var num = action.type == A_GIANTS_TRANSFORM ? 2 : 1;
    if(getRoundTile() == T_ROUND_DIG2VP_1O1C) {
      player.vp += num * 2;
      player.vp_round += num * 2;
    }
    if(player.faction == F_HALFLINGS) {
      player.vp += num;
      player.vp_faction += num;
    }
    if(player.faction == F_ALCHEMISTS && built_sh(player)) addPower(player, num * 2);
  }

  if(player.faction == F_DARKLINGS && action.type == A_SPADE) {
    //2VP for digging with priest
    player.vp += 2;
    player.vp_faction += 2;
  }

  if(action.type == A_UPGRADE_SH || action.type == A_UPGRADE_SA) {
    if(getRoundTile() == T_ROUND_SHSA5VP_2R1W || getRoundTile() == T_ROUND_SHSA5VP_2W1W) {
      player.vp += 5;
      player.vp_round += 5;
    }
    if(action.type == A_UPGRADE_SH) {
      if(player.faction == F_ALCHEMISTS) addPower(player, 12);
      if(player.faction == F_MERMAIDS) advanceShipping(player);
    }
  }

  if(action.type == A_UPGRADE_SH) {
    if(player.faction == F_CULTISTS) {
      player.vp += 7;
      player.vp_faction += 7;
    }
  }

  for(var i = 0; i < action.twtiles.length; i++) {
    if(getRoundTile() == T_ROUND_TW5VP_4O1DIG) {
      player.vp += 5;
      player.vp_round += 5;
    }
    if(player.faction == F_WITCHES) {
      player.vp += 5;
      player.vp_faction += 5;
    }
    if(player.faction == F_SWARMLINGS) player.w += 3;
  }
}

//amount of digs from the round end based on cult track
function getRoundBonusDigsForCults(cult, round) {
  if(round == 0) return 0;
  var t = roundtiles[round];
  if(!t) return 0;
  if(t == T_ROUND_TP3VP_4B1DIG) {
    return Math.floor(cult[C_B] / 4);
  }
  else if(t == T_ROUND_TP3VP_4W1DIG) {
    return Math.floor(cult[C_W] / 4);
  }
  else if(t == T_ROUND_TW5VP_4O1DIG) {
    return Math.floor(cult[C_O] / 4);
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
  var t = roundtiles[round];
  if(!t) return [0,0,0,0,0];
  if(t == T_ROUND_D2VP_4B1P) {
    return [0,0,Math.floor(cult[C_B] / 4),0,0];
  }
  else if(t == T_ROUND_D2VP_4R4PW) {
    return [0,0,0,4*Math.floor(cult[C_R] / 4),0];
  }
  else if(t == T_ROUND_DIG2VP_1O1C) {
    return [cult[C_O],0,0,0,0];
  }
  else if(t == T_ROUND_SHSA5VP_2R1W) {
    return [0,Math.floor(cult[C_R] / 2),0,0,0];
  }
  else if(t == T_ROUND_SHSA5VP_2W1W) {
    return [0,Math.floor(cult[C_W] / 2),0,0,0];
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
  player.vp += getAdvanceShipVP(player);
  player.vp_advance += getAdvanceShipVP(player);
  player.shipping++;
}

function getEngineersPassScore(player) {
  if(player.faction != F_ENGINEERS) return 0;
  if(player.b_sh != 0) return 0;

  var result = 0;

  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    var bridge = bridges[arCo(x, y)];

    if(bridge[0] == player.color) {
      var co = bridgeCo(x, y, D_N);
      if(outOfBounds(co[0], co[1])) continue;
      if(isOccupiedBy(x, y, player.color) && isOccupiedBy(co[0], co[1], player.color)) result += 3;
    }
    if(bridge[1] == player.color) {
      var co = bridgeCo(x, y, D_NE);
      if(outOfBounds(co[0], co[1])) continue;
      if(isOccupiedBy(x, y, player.color) && isOccupiedBy(co[0], co[1], player.color)) result += 3;
    }
    if(bridge[2] == player.color) {
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
    }
  }

  // Check town tiles. Also takes care of the T_FAV_2R_6TW tile.
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
    if(!canAdvanceShip(player)) return 'already max digging';
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
    player.vp += 6;
    player.vp_advance += 6;
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
      if(player.octogons[O_BON_SPADE_2C]) return 'action already taken';
      player.octogons[O_BON_SPADE_2C] = 1;
      player.spades++;
    }
    else if(action.type == A_POWER_SPADE) {
      if(octogons[O_POW_SPADE]) return 'action already taken';
      octogons[O_POW_SPADE] = 1;
      if(player.pw2 < 4) return 'not enough resources for ' + getActionName(action.type);
      usePower(player, 4);
      player.spades++;
    }
    else if(action.type == A_POWER_2SPADE) {
      if(octogons[O_POW_2SPADE]) return 'action already taken';
      octogons[O_POW_2SPADE] = 1;
      if(player.pw2 < 6) return 'not enough resources for ' + getActionName(action.type);
      usePower(player, 6);
      player.spades += 2;
      if(player.spades == 2) player.overflowspades = true;
    }
    else if(action.type == A_GIANTS_2SPADE) {
      if(player.faction != F_GIANTS) return 'must be giants for this action';
      if(!built_sh(player)) return 'this action requires SH';
      if(player.octogons[O_FACTION_GIANTS]) return 'action already taken';
      player.octogons[O_FACTION_GIANTS] = 1;
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
      if(player.octogons[O_FACTION_NOMADS]) return 'action already taken';
      player.octogons[O_FACTION_NOMADS] = 1;
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
    if(action.type == A_GIANTS_TRANSFORM || action.type == A_SANDSTORM) setWorld(x, y, player.color);
    else if(action.type == A_TRANSFORM_CW) {
      color = tile + 1;
      if(color == E + 1) color = R;
      setWorld(x, y, color);
    }
    else if(action.type == A_TRANSFORM_CCW) {
      color = tile - 1;
      if(color == R - 1) color = E;
      setWorld(x, y, color);
    }
    else return 'unknown transform action';
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
      if(octogons[O_POW_BRIDGE]) return 'action already taken';
      octogons[O_POW_BRIDGE] = 1;
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
    if(octogons[O_POW_1P]) return 'action already taken';
    octogons[O_POW_1P] = 1;
    if(usePower(player, 3)) {
      addIncome(player, [0,0,1,0,0]);
    } else {
      return 'not enough resources for ' + getActionName(action.type);
    }
  }
  else if(action.type == A_POWER_2W) {
    if(octogons[O_POW_2W]) return 'action already taken';
    octogons[O_POW_2W] = 1;
    if(usePower(player, 4)) {
      addIncome(player, [0,2,0,0,0]);
    } else {
      return 'not enough resources for ' + getActionName(action.type);
    }
  }
  else if(action.type == A_POWER_7C) {
    if(octogons[O_POW_7C]) return 'action already taken';
    octogons[O_POW_7C] = 1;
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
    if(player.bonustile == T_BON_PASSDVP_2C) {
      player.vp += built_d(player) * 1;
      player.vp_bonus += built_d(player) * 1;
    }
    if(player.bonustile == T_BON_PASSTPVP_1W) {
      player.vp += built_tp(player) * 2;
      player.vp_bonus += built_tp(player) * 2;
    }
    if(player.bonustile == T_BON_PASSSHSAVP_2W) {
      player.vp += (built_sh(player) + built_sa(player)) * 4;
      player.vp_bonus += (built_sh(player) + built_sa(player)) * 4;
    }
    if(player.favortiles[T_FAV_1W_PASSTPVP]) {
      var vp = [0,2,3,3,4][built_tp(player)];
      player.vp += vp;
      player.vp_favor += vp;
    }
    
    if(!finalround) error = giveBonusTile(player, action.bontile);
    else error = giveBonusTile(player, T_NONE);
    if(error) return error;

    if(player.faction == F_ENGINEERS) {
      player.vp += getEngineersPassScore(player);
      player.vp_faction += getEngineersPassScore(player);
    }
  }
  else if(action.type == A_DOUBLE) {
    if(player.faction != F_CHAOS) return 'wrong faction for this action';
    if(player.b_sh != 0) return 'this action requires SH built';
    if(player.octogons[O_FACTION_CHAOS]) return 'action already taken';
    player.octogons[O_FACTION_CHAOS] = 1;
    player.numactions = 2;
  }
  else if(action.type == A_TUNNEL || action.type == A_CARPET) {
    if(player.faction != F_FAKIRS && player.faction != F_DWARVES) return 'wrong faction for this action';
    if(player.tunnelcarpet) return 'max 1 tunnel/carpet action per turn';
    if(!action.co) return 'must have one coordinate';
    if(!canConsume(player, getCostlyCost(player))) return 'not enough resources for ' + getActionName(action.type);
    if(!onlyReachableThroughFactionSpecialWithBackupWorldBuildings(
        player, action.co[0], action.co[1], backupGameState.buildings)) return 'must be reachable only through tunnel/carpet power';

    consume(player, getCostlyCost(player));
    player.tunnelcarpet = action.co; //from now on, next dig and build actions may consider this tile reachable until the whole action sequence is done
    player.vp += 4; //this is 4 both for fakirs and dwarves
    player.vp_faction += 4; //this is 4 both for fakirs and dwarves
  }
  else if(action.type == A_DEBUG_SKIP) {
    //pass for debug reasons
    player.passed = true;
  }
  else if(action.type == A_DEBUG_STEP) {
    //nothing
  }
  else if(action.type == A_CULT_PRIEST1) error = tryCultPriestAction(player, action);
  else if(action.type == A_CULT_PRIEST2) error = tryCultPriestAction(player, action);
  else if(action.type == A_CULT_PRIEST3) error = tryCultPriestAction(player, action);
  else if(action.type == A_BONUS_CULT || action.type == A_FAVOR_CULT || action.type == A_AUREN_CULT) error = tryCultAction(player, action);
  else if(action.type == A_SWARMLINGS_TP) {
    if(player.faction != F_SWARMLINGS) return 'need to be swarmlings';
    if(player.b_sh != 0) return 'free TP requires SH';
    if(player.octogons[O_FACTION_SWARMLINGS]) return 'action already used';
    player.octogons[O_FACTION_SWARMLINGS] = 1;
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
    if(player.octogons[O_FACTION_WITCHES]) return 'witches ride already used';
    player.octogons[O_FACTION_WITCHES] = 1;
    if(!action.co) return 'build action must have coordinate';
    if(player.b_d == 0) return 'no dwellings left';
    var x = action.co[0];
    var y = action.co[1];
    if(getWorld(x, y) != player.color) return 'can only fly to forest';
    if(isOccupied(x, y)) return 'already occupied';
    player.b_d--;
    setBuilding(x, y, B_D, player.color);
  }
  else return 'unknown action';

  if(error != '') return error;

  //give town and favor tiles (only after the actual action happened, otherwise you can use resources you don't yet have)
  //first give the town keys, then the tiles (for correct handling of the +cult town tile)
  for(var i = 0; i < action.twtiles.length; i++) {
    player.keys++;
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

//Used both to automatically undo invalid actions, and to allow the player to use the Undo button.
var backupGameState = null;

function tryActions(player, actions /*array of Action objects*/) {
  var error = '';

  backupGameState = saveGameState(false);

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
  return ['A','B','C','D','E','F','G','H','I'][y] + (1 + x);
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
    result += '+' + tileToString(tiles[i]);
  }
  return result;
}

function getActionName(type) {
  switch(type) {
    case A_NONE: return 'none';
    case A_BURN: return 'burn';
    case A_CONVERT_1PW_1C: return '1pw->1c';
    case A_CONVERT_3PW_1W: return '3pw->1w';
    case A_CONVERT_5PW_1P: return '5pw->1p';
    case A_CONVERT_1P_1W: return '1p->1w';
    case A_CONVERT_1W_1C: return '1w->1c';
    case A_CONVERT_1VP_1C: return '1vp->1c';
    case A_CONVERT_2C_1VP: return '2c->1vp';
    case A_CONVERT_1W_1P: return '1w->1p';
    case A_CONNECT_WATER_TOWN: return 'watertown';
    case A_DOUBLE: return 'chaosdouble';
    case A_PASS: return 'pass';
    case A_POWER_1P: return 'pow1p';
    case A_POWER_2W: return 'pow2w';
    case A_POWER_7C: return 'pow7c';
    case A_BUILD: return 'build';
    case A_WITCHES_D: return 'witchesride';
    case A_SPADE: return 'spade';
    case A_BONUS_SPADE: return 'bonspade';
    case A_POWER_SPADE: return 'powspade';
    case A_POWER_2SPADE: return 'pow2spade';
    case A_GIANTS_2SPADE: return 'giants2spade';
    case A_TRANSFORM_CW: return 'transformcw';
    case A_TRANSFORM_CCW: return 'transformccw';
    case A_GIANTS_TRANSFORM: return 'giantstransform';
    case A_SANDSTORM: return 'sandstorm';
    case A_UPGRADE_TP: return 'upgradeTP';
    case A_SWARMLINGS_TP: return 'swarmlingsTP';
    case A_UPGRADE_TE: return 'upgradeTE';
    case A_UPGRADE_SH: return 'upgradeSH';
    case A_UPGRADE_SA: return 'upgradeSA';
    case A_CULT_PRIEST3: return 'cult3';
    case A_CULT_PRIEST2: return 'cult2';
    case A_CULT_PRIEST1: return 'cult1';
    case A_BONUS_CULT: return 'boncult';
    case A_FAVOR_CULT: return 'favcult';
    case A_AUREN_CULT: return 'aurencult2';
    case A_ADV_SHIP: return 'advshipping';
    case A_ADV_DIG: return 'advdigging';
    case A_POWER_BRIDGE: return 'powbridge';
    case A_ENGINEERS_BRIDGE: return 'engbridge';
    case A_TUNNEL: return 'tunnel';
    case A_CARPET: return 'carpet';
    case A_DEBUG_SKIP: return 'debugskip';
    case A_DEBUG_STEP: return 'debugstep';
    default: return 'unknown';
  }
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
  if(tile == T_FAV_3R) giveCult(player, C_R, 3);
  else if(tile == T_FAV_3B) giveCult(player, C_B, 3);
  else if(tile == T_FAV_3O) giveCult(player, C_O, 3);
  else if(tile == T_FAV_3W) giveCult(player, C_W, 3);
  else if(tile == T_FAV_2R_6TW) giveCult(player, C_R, 2);
  else if(tile == T_FAV_2B_CULT) giveCult(player, C_B, 2);
  else if(tile == T_FAV_2O_1PW1W) giveCult(player, C_O, 2);
  else if(tile == T_FAV_2W_4PW) giveCult(player, C_W, 2);
  else if(tile == T_FAV_1R_3C) giveCult(player, C_R, 1);
  else if(tile == T_FAV_1B_TPVP) giveCult(player, C_B, 1);
  else if(tile == T_FAV_1O_DVP) giveCult(player, C_O, 1);
  else if(tile == T_FAV_1W_PASSTPVP) giveCult(player, C_W, 1);
}

//Does NOT handle the T_FAV_2R_6TW town formation, actionCreatesTown does that.
function giveFavorTile(player, tile) {
  if(tile > T_FAV_BEGIN && tile < T_FAV_END) {
    if(favortiles[tile] <= 0) {
      return 'this favor tile is no longer available';
    }
    if(player.favortiles[tile]) {
      return 'already has this favor tile';
    }
    player.favortiles[tile] = 1;
    favortiles[tile]--;
    giveCultForTakingFavorTile(player, tile);
    return '';
  } else {
    return 'invalid favor tile';
  }
}

//For the cult tile, only returns the VP's. TODO: support the cults (not here but in giveTownTile)
function getTownTileResources(tile) {
  if(tile == T_TW_5VP_6C) return [6,0,0,0,5];
  if(tile == T_TW_6VP_8PW) return [0,0,0,8,6];
  if(tile == T_TW_7VP_2W) return [0,2,0,0,7];
  if(tile == T_TW_8VP_CULT) return [0,0,0,0,8];
  if(tile == T_TW_9VP_P) return [0,0,1,0,9];
  throw 'invalid town tile';
}

//also adds the necessary resources and VPs
function giveTownTile(player, tile) {
  if(tile > T_TW_BEGIN && tile < T_TW_END) {
    if(towntiles[tile] <= 0) {
      return 'this town tile is no longer available';
    }
    player.towntiles[tile] = incrUndef(player.towntiles[tile], 1);
    var res = getTownTileResources(tile);
    addIncome(player, res);
    player.vp_town += res[4];

    if(tile == T_TW_8VP_CULT) {
      //If there are multiple nines and not enough keys to go up all of them, in theory the player should have the choice. That code is not implemented yet, instead automatically choose the most threatened ones.
      //to quickly debug this, type in console: players[1].cult[2] = 5; players[0].cult[0] = 9; players[0].cult[1] = 9; players[0].cult[2] = 9; players[0].cult[3] = 9; 
      var nines = 0;
      for(var i = C_R; i <= C_W; i++) {
        if(player.cult[i] == 9) nines++;
      }
      while(nines > player.keys && player.keys > 0) {
        var threatened = getMostThreatenedWinningCultTrack(player);
        if(threatened == C_NONE) return ''; //happens when all cults are already at the top
        giveCult(player, threatened, 1);
        nines--;
      }
      //End of "most threatened cult track" hack.
      
      for(var i = C_R; i <= C_W; i++) {
        giveCult(player, i, 1);
      }
    }
    
    towntiles[tile]--;
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
    
    if(player.bonustile > T_BON_BEGIN) bonustiles[player.bonustile]++;

    if(tile == T_NONE) {
      // this is during the last round
      player.bonustile = T_NONE;
    } else {
      if(bonustiles[tile] <= 0) return 'this bonus tile is no longer available';
      bonustiles[tile]--;
      player.bonustile = tile;
      if(bonustilecoins[tile]) player.c += bonustilecoins[tile];
      bonustilecoins[tile] = 0;
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
    if(!player.favortiles[tile] && favortiles[tile] > 0) result++;
    if(result >= num) return result;
  }
  return result;
}

//similar as favorTilesAvailable, but for town tiles
function townTilesAvailable(num) {
  var result = 0;
  for(var tile =  T_TW_BEGIN + 1; tile < T_TW_END; tile++) {
    if(towntiles[tile] > 0) result++;
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
      return actionsMakeTown(player, previousActions, action);
    }
  }


  var reqpower = getTownReqPower(player);
  var involved = []; //the indices of the clusters involved in the towns (to avoid duplicates, e.g when both upgrading to SA and taking 6 town size tile)

  //favtiles must be checked first, for when you pick fav tile for town size 6 and at the same time upgrade to SA making some town size 6.
  for(var i = 0; i < action.favtiles.length; i++) {
    if(action.favtiles[i] == T_FAV_2R_6TW) {
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
      if(involved[i].length == 0) throw 'wrong length during town calculation';
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
  for(var i = 0; i < players.length; i++) {
    if(players[i].faction != F_NONE /*if already has chosen*/) {
      already[factionColor(players[i].faction)] = true;
    }
  }
  return already;
}

//During faction choice. Returns '' if ok, error string if not.
function trySetFaction(player, faction) {
  if((faction <= F_START || faction >= F_END) && faction != F_GENERIC) return 'invalid faction';

  var already = getAlreadyChosenColors();

  if(already[factionColor(faction)]) return 'color already chosen';

  player.faction = faction;
  player.color = factionColor(faction);
  return '';
}

//returns the leech effects caused by the actions.
//sometimes, multiple series of leeches can habben in one series of actions, e.g. halflings stronghold and then building dwelling, or chaos magicians double action.
//it returns an array of leech series, where each leech series is an array of [playerIndex, amount, x, y]. So it's a 3D array.
//the order of players is already sorted correctly, beginning with the first one after the player who did the action and so on
//The amount is the amount given the buildings. This must later be adjusted for the player's actual current power and VP (can be less or even 0 at that point)
function getLeechEffect(playerIndex, actions) {
  var result = [];
  for(var i = 0; i < actions.length; i++) {
    if(isUpgradeAction(actions[i]) || isBuildDwellingAction(actions[i])) {
      var current = []; //the result for this sub-action
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
        for(var j = 0; j < players.length; j++) {
          var k = wrap(playerIndex + j + 1, 0, players.length); //start with next player
          var power = leechers[k];
          if(power) {
            var amount = leechers[k];
            current.push([k, amount, pos[0], pos[1]]);
          }
        }
      }
      if(current.length > 0) result.push(current);
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
function leechPower(player, amount) {
  if(amount <= 0) throw 'invalid leech amount';
  if(player.vp - amount + 1 < 0) return 'not enough vp';
  player.vp -= (amount - 1);
  player.vp_leech -= (amount - 1);
  addPower(player, amount);
  return '';
}

function digDist(player, tileColor) {
  if(tileColor == player.color) return 0;
  if(player.faction == F_GIANTS) return 2;
  else return colorDist(tileColor, player.color);
}

//the cost for tunneling or carpets
function getCostlyCost(player) {
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
  return player.name + ' (' + factionNames[player.faction] + ')';
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

