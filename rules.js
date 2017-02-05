/* rules11.js
TM AI

Copyright (C) 2013-2016 by Lode Vandevenne

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

//Everything related to game and executing actions. But not the world and player faction related rules, and not the action class.


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

function isRoundTilePromo2015Tile(tile) {
  return tile == T_ROUND_TE4VP_P2C;
}

function isFireIceFaction(faction) {
  return faction.color == O || faction.color == W || faction.color == X || faction.color == Z;
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

// "isPowerAction"
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

var colorToPlayerMap = {}; //map to the index of the player (cannot point to the player objects themselves due to their backup cloning that changes their addresses) - undefined means the color is not chosen by any player (but 0 is index 0)

function createColorToPlayerMap() {
  colorToPlayerMap = {};
  for(var i = 0; i < game.players.length; i++) {
    colorToPlayerMap[game.players[i].color] = i;
  }
}

var woodColorToPlayerMap = {}; //map to the index of the player (cannot point to the player objects themselves due to their backup cloning that changes their addresses) - undefined means the color is not chosen by any player (but 0 is index 0)

function createWoodColorToPlayerMap() {
  woodColorToPlayerMap = {};
  for(var i = 0; i < game.players.length; i++) {
    woodColorToPlayerMap[game.players[i].woodcolor] = i;
  }
}


var auxColorToPlayerMap = {}; //map to the index of the player (cannot point to the player objects themselves due to their backup cloning that changes their addresses) - undefined means the color is not chosen by any player (but 0 is index 0)

function createAuxColorToPlayerMap() {
  auxColorToPlayerMap = {};
  for(var i = 0; i < game.players.length; i++) {
    auxColorToPlayerMap[game.players[i].auxcolor] = i;
  }
}

function recalculateColorMaps() {
  createColorToPlayerMap();
  createAuxColorToPlayerMap();
  createWoodColorToPlayerMap();
}

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

//TODO: rename these functions sumRes, subRes and mulRes (resources instead of income, since they can also be cost)

// modifies input variable AND returns it. TODO: only return
function sumIncome(income, added) {
  for(var i = 0; i < added.length; i++) income[i] = undef0(income[i]) + undef0(added[i]);
  return income;
}

// modifies input variable AND returns it. TODO: only return
function subtractIncome(income, removed) {
  for(var i = 0; i < removed.length; i++) income[i] = undef0(income[i]) - undef0(removed[i]);
  return income;
}

// modifies input variable AND returns it. TODO: only return
function mulIncome(income, times) {
  for(var i = 0; i < income.length; i++) income[i] *= times;
  return income;
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

// returns 0 if no, the amount of locked colors if riverwalkers with 1 to 7 locked colors
function mayGetPriestAsColor(player) {
  if(player.color != Z) return 0;

  var result = 7;
  for(var i = CIRCLE_BEGIN; i <= CIRCLE_END; i++) {
    if(player.colors[i - R]) result--;
  }
  return result;
};

function addPriests(player, p) {
  if(p <= 0) return;

  if(player.color == Z) {
    var numunlocked = 7 - mayGetPriestAsColor(player);
    while(p > 0 && numunlocked < 7) { // normally p is 1 so while loop is no prob
      player.priestorcolor++;
      p--;
      numunlocked++;
    }
  }

  player.p += p;
  if(player.p > player.pp) player.p = player.pp;
}

// Color Z means to unlock it as regular priest
// Returns error string if error, empty string if ok
function unlockColorPriest(player, color) {
  var error = '';
  if(!(color >= CIRCLE_BEGIN && color <= CIRCLE_END) && color != Z) {
    //LOU PROBLEM with POW1P for Riverwalkers since color is not Z
    //error = 'invalid unlock color';
    addLog ( 'invalid unlock color override, add priest ');
    if(player.p < player.pp) player.p++;
    player.priestorcolor--;
  } else if(player.colors[color - R]) {
    error = 'already have this color';
  } else {
    if(color == Z) {
      if(player.p < player.pp) player.p++;
    } else {
      if(state.fireiceerrata) {
        var cheap = colorIsCheapForLava(color);
        var error = tryConsume(player, [cheap ? 1 : 2,0,0,0,0]);
        if(error) return 'cannot afford the gold for color unlock';
      }
      player.colors[color - R] = true;
      player.pp++; //priest goes to priest pool
    }
    player.priestorcolor--;
  }
  return error;
}

//aka "giveResources"
//not to be confused with "sumIncome"
//This can also add VP, if that case give reason
function addIncome(player, income, opt_reason, opt_detail) {
  if(income.length < 5) throw 'resource array size must be at least 5';
  player.c += income[R_C];
  player.w += income[R_W];
  addPriests(player, income[R_P]);
  addPower(player, income[R_PW]);
  player.addVP(income[R_VP], opt_reason, opt_detail);

  if(income.length > R_VP + 1) {
    if(income[R_PP]) player.pp += income[R_PP];
    if(income[R_KEY]) player.keys += income[R_KEY];
    if(income[R_SPADE]) player.spades += income[R_SPADE];
    if(income[R_PT]) player.pw2 += income[R_PT];
    if(income[R_FREECULT]) player.freecult += income[R_FREECULT];
    if(income[R_CULT]) player.fixedcult += income[R_CULT];
    if(income[R_PT0]) player.pw0 += income[R_PT0];
    if(income[R_PT1]) player.pw1 += income[R_PT1];
    if(income[R_PT2]) player.pw2 += income[R_PT2];
    if(income[R_FIRE]) giveCult(player, C_F, income[R_FIRE]);
    if(income[R_WATER]) giveCult(player, C_W, income[R_WATER]);
    if(income[R_EARTH]) giveCult(player, C_E, income[R_EARTH]);
    if(income[R_AIR]) giveCult(player, C_A, income[R_AIR]);
    if(income[R_SPADEVP]) player.spadevp += income[R_SPADEVP];
    if(income[R_BRIDGE]) {
      var num = Math.min(income[R_BRIDGE], player.bridgepool);
      player.bridgepool -= num;
      player.bridges += num;
    }
  }
}

//consumed is an income array
//precondition: player has enough resources
//TODO: give custom VP reason for consumed resources
function consume(player, consumed) {
  if(consumed.length < 5) throw 'resource array size must be at least 5';
  player.c -= consumed[R_C];
  player.w -= consumed[R_W];
  player.p -= consumed[R_P];
  usePower(player, consumed[R_PW]);

  //this can happen for alchemists
  if(player.faction == F_ALCHEMISTS) player.addVP(-consumed[R_VP], 'faction', 'faction');
  else player.addVP(-consumed[R_VP], 'other', 'other');

  if(consumed.length > R_VP + 1) {
    if(consumed[R_PP]) player.pp -= consumed[R_PP];
    if(consumed[R_KEY]) player.keys -= consumed[R_KEY];
    if(consumed[R_SPADE]) player.spades -= consumed[R_SPADE];
    var pt = undef0(consumed[R_PT]);
    while(pt > 0) {
      if(player.pw0) player.pw0--;
      else if(player.pw1) player.pw1--;
      else if(player.pw2) {
        player.pw2--;
        player.c++; //convert it automatically because why not. TODO: Don't do this. Do this in Human UI instead. Don't let these actions do this, or it would not correctly handle e.g. snellman games.
      }
      pt--;
    }
    if(consumed[R_FREECULT]) player.freecult -= consumed[R_FREECULT]; //an external mechanism must remove it from the right cult track and check the validity
    if(consumed[R_CULT]) player.fixedcult -= consumed[R_CULT]; //an external mechanism must remove it from the right cult track and check the validity
    if(consumed[R_PT0]) player.pw0 -= consumed[R_PT0];
    if(consumed[R_PT1]) player.pw1 -= consumed[R_PT1];
    if(consumed[R_PT2]) player.pw2 -= consumed[R_PT2];
    if(consumed[R_FIRE]) giveCult(player, C_F, -consumed[R_FIRE]);
    if(consumed[R_WATER]) giveCult(player, C_W, -consumed[R_WATER]);
    if(consumed[R_EARTH]) giveCult(player, C_E, -consumed[R_EARTH]);
    if(consumed[R_AIR]) giveCult(player, C_A, -consumed[R_AIR]);
    if(consumed[R_SPADEVP]) player.spadevp -= consumed[R_SPADEVP];
    if(consumed[R_BRIDGE]) player.bridges -= consumed[R_BRIDGE];
  }
}

function canConsume(player, consumed) {
  if(consumed.length < 5) throw 'resource array size must be at least 5';
  var result = player.c >= consumed[R_C] && player.w >= consumed[R_W] && player.p >= consumed[R_P]
      && player.pw2 >= consumed[R_PW] && player.vp >= consumed[R_VP];

  if(result && consumed.length > R_VP + 1) {
    if(consumed[R_PP] && player.pp < consumed[R_PP]) return false;
    if(consumed[R_KEY] && player.keys < consumed[R_KEY]) return false;
    if(consumed[R_SPADE] && player.spades < consumed[R_SPADE]) return false;
    if(consumed[R_PT] && player.pw0 + player.pw1 + player.pw2 < consumed[R_PT]) return false;
    /*if(consumed[R_CULT] && (opt_cult == undefined || opt_cult == C_NONE)) return false; //cannot know which cult track is meant, must be specified
    if(consumed[R_CULT] && player.cult[opt_cult] < consumed[R_CULT]) return false;*/
    if(consumed[R_CULT] && player.cult[C_F] < consumed[R_CULT] && player.cult[C_W] < consumed[R_CULT] &&
       player.cult[C_E] < consumed[R_CULT] && player.cult[C_A] < consumed[R_CULT]) return false;
    if(consumed[R_PT0] && player.pw0 < consumed[R_PT0]) return false;
    if(consumed[R_PT1] && player.pw1 < consumed[R_PT1]) return false;
    if(consumed[R_PT2] && player.pw2 < consumed[R_PT2]) return false;
    if(consumed[R_FIRE] && player.cult[C_F] < consumed[R_FIRE]) return false;
    if(consumed[R_WATER] && player.cult[C_W] < consumed[R_WATER]) return false;
    if(consumed[R_EARTH] && player.cult[C_E] < consumed[R_EARTH]) return false;
    if(consumed[R_AIR] && player.cult[C_A] < consumed[R_AIR]) return false;
    if(consumed[R_SPADEVP] && player.spadevp < consumed[R_SPADEVP]) return false;
    if(consumed[R_BRIDGE] && player.bridges < consumed[R_BRIDGE]) return false;
  }

  return result;
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

//returns error or ''
//opt_actiontype is only for error strings
function tryConsume(player, cost, opt_actiontype) {
  if(!canConsume(player, cost)) {
    if(opt_actiontype) return 'not enough resources for ' + getActionName(opt_actiontype);
    else return 'not enough resources';
  }
  consume(player, cost);
  return '';
}

//returns error or ''
function tryConsumeForAction(player, actiontype) {
  var cost = player.getActionCost(actiontype);
  return tryConsume(player, cost, actiontype);
}

//returns true if the player had enough resources for the conversion
function tryConversion(player, action) {
  var actiontype = action.type;
  var consumed = null;
  var produced = null;
  if(actiontype == A_CONVERT_1PW_1C) { consumed = [0,0,0,1,0]; produced = [1,0,0,0,0]; }
  else if(actiontype == A_CONVERT_3PW_1W) { consumed = [0,0,0,3,0]; produced = [0,1,0,0,0]; }
  else if(actiontype == A_CONVERT_5PW_1P) { consumed = [0,0,0,5,0]; produced = [0,0,1,0,0]; }
  else if(actiontype == A_CONVERT_1P_1W) { consumed = [0,0,1,0,0]; produced = [0,1,0,0,0]; }
  else if(actiontype == A_CONVERT_1W_1C) { consumed = [0,1,0,0,0]; produced = [1,0,0,0,0]; }
  else if(actiontype == A_CONVERT_1VP_1C) {
    if(player.faction != F_ALCHEMISTS) return 'only alchemists can do this';
    consumed = [0,0,0,0,1];
    produced = [1,0,0,0,0];
  }
  else if(actiontype == A_CONVERT_2C_1VP) {
    if(player.faction != F_ALCHEMISTS) return 'only alchemists can do this';
    consumed = [2,0,0,0,0];
    produced = [0,0,0,0,1];
  }
  else if(actiontype == A_CONVERT_1W_1P) {
    player.darklingconverts--;
    consumed = [0,1,0,0,0];
    produced = [0,0,1,0,0];
  }
  else return 'invalid faction or convert action';
  if(consumed != null && canConsume(player, consumed)) {
    consume(player, consumed);
    addIncome(player, produced);

    if(player.priestorcolor) {
      var error = unlockColorPriest(player, action.color);
      if(error != '') return error;
    }

    if(player.p > player.pp) return 'not enough priests in pool to get priest from this conversion';

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

  var cost = player.getFaction().getBuildingCost(B_D, false);
  var error = tryConsume(player, cost, action.type);
  if(error != '') return error;

  var tile = getWorld(x, y);
  if(tile == I || tile == N) return 'invalid tile type';
  if(tile != (player.color == X ? player.auxcolor : player.color) && !player.colors[tile - R]) return 'tile must have your color to build';

  player.b_d--;
  setBuilding(x, y, B_D, player.woodcolor);
  player.built = true;

  player.nodigreachco = [x, y];

  return '';
}

function canDoRoundBonusDig(player, type, x, y) {
  var reason = [];
  if(!player.getFaction().canTakeFactionAction(player, type, reason)) return reason[0] || error;
  if(!inReach(player, x, y, false)) return 'tile not reachable'; //no fakirs or dwarves tunneling
  if(isOccupied(x, y)) return 'tile occupied';
  var tile = getWorld(x, y);
  if(tile == I || tile == N) return 'invalid tile type';
  return '';
}

// This one takes PREVIOUS round bonus digs into account. "canDoRoundBonusDigs" does not support this. This one must instead be called after executing each previous round dig.
function canDoRoundBonusDig2(player, type, x, y) {
  var error = canDoRoundBonusDig(player, type, x, y);
  if(error != '') return error;
  var tile = getWorld(x, y);
  if(tile == player.color && (type == A_GIANTS_TRANSFORM || type == A_TRANSFORM_SPECIAL)) return 'tile already your color';
  if(tile == O || tile == W) return 'cannot transform ice or fire';
  var dist = digDist(player, tile, player.color);
  if(type == A_TRANSFORM_SPECIAL && dist != 1) return 'cannot ice-transform if color too many digs away';
  return '';
}

//digs = array where each element is an array [actiontype, x, y], and actiontype is  e.g. A_TRANSFORM_CW, ...
function canDoRoundBonusDigs(player, digs) {
  var maxnum = getRoundBonusDigs(player, state.round);
  if(digs.length > maxnum) return 'too many bonus digs, have max ' + maxnum;
  //LOU The Giants can not use one bonus dig, but two digs are good on any one hex 
  //This is called from state.js, before the Giants check for a single dig(two single digs excluded elsewhere)
  //if(player.faction == F_GIANTS && digs.length > 1) return 'giants cannot have more than one round bonus digs';
  for(var i = 0; i < digs.length; i++) {
    var error = canDoRoundBonusDig(player, digs[i][0], digs[i][1], digs[i][2]);
    if(error != '') return error;
  }
  return '';
}

// Does not take into account the legality of the transform
function getColorAfterTransformAction(incolor, player, type) {
  if(type == A_GIANTS_TRANSFORM || type == A_SANDSTORM || type == A_TRANSFORM_SPECIAL || type == A_TRANSFORM_SPECIAL2) {
    //if(incolor == W && type == A_TRANSFORM_SPECIAL) return player.auxcolor;
    //could as well say of course that giants transform is red, sandstorm is yellow. But let's be generic with player colors.
    return player.getMainDigColor();
  }
  else if(type == A_TRANSFORM_CW) {
    var color = incolor + 1;
    //if(incolor == W) color = player.auxcolor + 1;
    if(color == S + 1) color = R;
    return color;
  }
  else if(type == A_TRANSFORM_CCW) {
    var color = incolor - 1;
    //if(incolor == W) color = player.auxcolor - 1;
    if(color == R - 1) color = S;
    return color;
  }
  return incolor;
}

//non destructive if it fails. Returns error string.
//type is e.g. A_TRANSFORM_CCW, ...
function tryRoundBonusDig(player, type, x, y) {
  var error = canDoRoundBonusDig2(player, type, x, y);
  if(error != '') return error;
  var tile = getWorld(x, y);
  setWorld(x, y, getColorAfterTransformAction(tile, player, type));

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
  if(building[1] != player.woodcolor) return 'wrong tile color';

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
  else resources = player.getFaction().getBuildingCost(b_out, action.type == A_UPGRADE_TP ? hasNeighbor(x, y, player.woodcolor) : false);

  if(building[0] != b_in) return 'wrong input building type';
  var error = tryConsume(player, resources, action.type);
  if(error != '') return error;

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
  }
  else if(b_out == B_SA) {
    player.b_te++;
    player.b_sa--;
  }

  setBuilding(x, y, b_out, player.woodcolor);

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

//aka "addCult"
//gives cult, if too much, ignores it (it is no error)
//also supports negative values, and will give town keys back if necessary
function giveCult(player, cult, num) {
  if(num == 0) return;

  if(num > 0) {
    if(player.cult[cult] == 10) return; //the code below would bring it back to 9 due to key limit and Math.min

    var oldcult = player.cult[cult];
    var maxcult = (player.keys > 0 && getHighestOtherPlayerValueOnCult(player, cult) < 10) ? 10 : 9;
    var newcult = Math.min(maxcult, oldcult + num);
    if(newcult == 10 && oldcult < 10) player.keys--;

    player.cult[cult] = newcult;
    addPower(player, cultPower(oldcult, newcult));
  }
  else if(num < 0) {
    if(player.cult[cult] == 10) player.keys++; //get the town key back
    if(player.cult[cult] < num) player.cult[cult] = 0;
    else player.cult[cult] += num; //negative so subtracted
  }
}

function tryCultPriestAction(player, action) {
  if(player.p < 1) return 'not enough priests';
  var cp = game.cultp[action.cult];
  if(action.cult < 0 || action.cult > 3) return 'invalid cult';
  if(action.type == A_CULT_PRIEST3 && cp[0] != N) return 'the 3 is full';
  if(action.type == A_CULT_PRIEST2 && cp[1] != N && cp[2] != N && cp[3] != N) return 'the 2s are full';

  addIncome(player, player.getActionIncome(action.type));
  player.p--;

  if(action.type != A_CULT_PRIEST1) {
    if(player.pp <= 0) throw new Error('priest pool went wrong');
    player.pp--;
  }

  // put the priests on the tracks
  if(action.type == A_CULT_PRIEST3) cp[0] = player.woodcolor;
  if(action.type == A_CULT_PRIEST2) {
    if(cp[1] == N) cp[1] = player.woodcolor;
    else if(cp[2] == N) cp[2] = player.woodcolor;
    else if(cp[3] == N) cp[3] = player.woodcolor;
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

  addIncome(player, player.getActionIncome(action.type));

  return '';
}

//add extra VP (and a few other resources) from the action: everything related to faction powers and favor, bonus and round tiles giving some extra immediate VP or other resource.
//includes alchemists SH power
function addExtrasForAction(player, action) {
  if(action.type == A_UPGRADE_TP || action.type == A_SWARMLINGS_TP) {
    if(player.favortiles[T_FAV_1W_TPVP]) {
      player.addVP(3, 'favor', getTileVPDetail(T_FAV_1W_TPVP));
    }
    if(getRoundTile() == T_ROUND_TP3VP_4W1DIG || getRoundTile() == T_ROUND_TP3VP_4A1DIG) {
      player.addVP(3, 'round', getTileVPDetail(getRoundTile()));
    }
  }

  if(action.type == A_UPGRADE_TE) {
    if(getRoundTile() == T_ROUND_TE4VP_P2C) {
      player.addVP(4, 'round', getTileVPDetail(getRoundTile()));
    }
  }

  if(action.type == A_BUILD || action.type == A_WITCHES_D) {
    if(player.favortiles[T_FAV_1E_DVP]) {
      player.addVP(2, 'favor', getTileVPDetail(T_FAV_1E_DVP));
    }
    if(getRoundTile() == T_ROUND_D2VP_4W1P || getRoundTile() == T_ROUND_D2VP_4F4PW) {
      player.addVP(2, 'round', getTileVPDetail(getRoundTile()));
    }
  }

  if(isSpadeConsumingAction(action.type)) {
    var num = action.type == A_GIANTS_TRANSFORM ? 2 : 1;
    if(getRoundTile() == T_ROUND_DIG2VP_1E1C) {
      player.addVP(num * 2, 'round', getTileVPDetail(getRoundTile()));
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
      player.addVP(5, 'round', getTileVPDetail(getRoundTile()));
    }
    if(action.type == A_UPGRADE_SH) {
      player.getFaction().getOneTimeStrongholdIncome(player);
      addIncome(player, player.getFaction().getActionIncome(player, action.type)); 
//TODO: ensure this is not done more globally elsewhere already. This is currently only used by riverwalkers SH for the two bridges.
    }
  }

  for(var i = 0; i < action.twtiles.length; i++) {
    if(getRoundTile() == T_ROUND_TW5VP_4E1DIG) {
      player.addVP(5, 'round', getTileVPDetail(getRoundTile()));
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

//amount of spades from the round end based on cult track
function getRoundBonusDigs(player, round) {
  if(player.color == Z) return 0; // riverwalkers cannot use these digs
  return getRoundBonusDigsForCults(player.cult, round);
}

//amount of resources from the round end based on cult track
//priests is amount of priests the player has in total on all cult tracks
function getRoundBonusResourcesForCults(cult, priests, round) {
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
  else if(t == T_ROUND_TE4VP_P2C) {
    return [priests*2,0,0,0,0];
  }
  return [0,0,0,0,0];
}

//amount of resources from the round end based on cult track
function getRoundBonusResources(player, round) {
  return getRoundBonusResourcesForCults(player.cult, getCultPriests(player), round);
}

function getCultPriests(player) {
  // a simpler way would normally be "7 - player.pp", but that would not be correct for riverwalkers, where pp is initially 1 instead of 7

  var result = 0;
  for(var i = C_F; i <= C_A; i++) {
    for(var j = 0; j < 4; j++) {
      if(game.cultp[i][j] == player.woodcolor) result++;
    }
  }
  return result;
}

//this one does NOT fail and does not consume income. If you already have max shipping, it does nothing.
function advanceShipping(player) {
  if(!canAdvanceShip(player)) return;
  player.addVP(getAdvanceShipVP(player), 'advance', 'advship');
  player.shipping++;
}

//it it a color that can be trasformed at all?
function canTransform(player, x, y) {
  var color = getWorld(x, y);
  if(color == W || color == O) return false;
  return true;
}

//can the player build on this without any transformation?
function canBuildOn(player, x, y) {
  var color = getWorld(x, y);
  if(color == player.color) return true;
  if(player.color == X && color == player.auxcolor) return true; // shapeshifters
  if(player.colors[color - R]) return true; // riverwalkers
  return false;
}

//execute passing for the player
function passPlayer(player) {
  player.passed = true;
  // Variable turnorder by Lou
  if(state.round != 6  && state.turnorder) {
    state.turnMatrix[1][state.passOrder] = player.index;
    state.passOrder++;
  }
}

//The inner if-else part of tryAction
function tryActionCore_(player, action /*Action object*/) {
  var error = '';

  if(action.type == A_BURN) {
    if(player.pw1 < 2) {
      return 'not enough power to burn';
    }
    burnPower(player, 1);
  }
  else if(isConvertAction(action)) {
    error = tryConversion(player, action);
  }
  else if(action.type == A_ADV_SHIP) {
    if(!canAdvanceShip(player)) return 'already max shipping';
    error = tryConsumeForAction(player, action.type);
    if(error != '') return error;
    advanceShipping(player);
  }
  else if(action.type == A_ADV_DIG) {
    if(!canAdvanceDig(player)) return 'already max digging';
    error = tryConsumeForAction(player, action.type);
    if(error != '') return error;
    player.addVP(6, 'advance', 'advdig');
    player.digging++;
  }
  else if(isSpadeGivingAction(action.type)) {
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
    player.nodigreachco = null;
    player.transformco = null;

    if(action.type == A_SPADE) {
      var cost = player.getActionCost(action.type);
      error = tryConsume(player, cost, action.type);
      if(error != '') return error;

      addIncome(player, player.getActionIncome(action.type)); //adds the spades
      player.overflowspades = false; //overflowing of spades can only when taking 2 spade power action or halflings SH, but the overflow is no longer valid if you pay for extra spades (because you may only pay for extra spades to keep digging the same terrain tile).
    }
    else if(action.type == A_BONUS_SPADE) {
      if(player.octogons[A_BONUS_SPADE]) return 'action already taken';
      player.octogons[A_BONUS_SPADE] = 1;
      addIncome(player, player.getActionIncome(action.type)); //adds the spades
    }
    else if(action.type == A_POWER_SPADE) {
      game.octogons[action.type] = 1;
      error = tryConsumeForAction(player, action.type);
      if(error != '') return error;
      addIncome(player, player.getActionIncome(action.type)); //adds the spades
    }
    else if(action.type == A_POWER_2SPADE) {
      game.octogons[action.type] = 1;
      error = tryConsumeForAction(player, action.type);
      if(error != '') return error;
      addIncome(player, player.getActionIncome(action.type)); //adds the spades
      if(player.spades == 2) player.overflowspades = true;
    }
    else if(action.type == A_GIANTS_2SPADE) {
      if(player.faction != F_GIANTS) return 'must be giants for this action';
      if(!built_sh(player)) return 'this action requires SH';
      if(player.octogons[A_GIANTS_2SPADE]) return 'action already taken';
      player.octogons[A_GIANTS_2SPADE] = 1;
      addIncome(player, player.getActionIncome(action.type)); //adds the spades
    }
    else return 'unknown spade action';
  }
  else if(isTransformAction(action.type)) {
    if(action.type == A_SANDSTORM) player.nodigreachco = null;

    var x = action.co[0];
    var y = action.co[1];

    if(!inReachButDontCountCo(player, x, y, false, player.nodigreachco) &&
        !temporaryTunnelCarpetOk(player, x, y)) return 'tile not reachable';
    if(isOccupied(x, y)) return 'tile occupied';
    if(!canTransform(player, x, y)) return 'cannot transform this tile';
    var tile = getWorld(x, y);
    if(tile == I || tile == N) return 'invalid tile type';

    var cost = player.getFaction().getTransformActionCost(player, action.type, tile);

    if(!canConsume(player, cost)) {
      if(cost[R_SPADE]) return 'not enough spades to transform';
      if(cost[R_PT]) return 'not enough tokens to transform';
      if(cost[R_CULT]) return 'not enough cult to transform';
      return 'not enough resources to transform';
    }
    consume(player, cost);

    if(player.transformco) {
      var equal = (x == player.transformco[0] && y == player.transformco[1]);
      var oldTile = getWorld(player.transformco[0], player.transformco[1]);
      var previousreachedend = oldTile == (player.getMainDigColor());
      if(!equal) {
        if(!player.overflowspades) return 'cannot dig in multiple locations if you have no overflow spades';
        if(!previousreachedend) return 'cannot overflow spades to another tile unless you reached your own color on the previous tile';
      }
      if(equal && previousreachedend) return 'tile already reached your color. You cannot go past your color in a single turn';
      if(equal && player.transformdir != A_NONE && player.transformdir != action.type && (action.type == A_TRANSFORM_CW || action.type == A_TRANSFORM_CCW)) {
        return 'may not change transform direction on a tile in one turn';
      }
    }
    if(action.type == A_TRANSFORM_CW || action.type == A_TRANSFORM_CCW) player.transformdir = action.type;

    if(action.type == A_SANDSTORM) {
      if(player.faction != F_NOMADS) return 'sandstorm requires nomads';
      if(!built_sh(player)) return 'sandstorm requires SH';
      if(player.octogons[A_SANDSTORM]) return 'action already taken';
      player.octogons[A_SANDSTORM] = 1;
      if(!hasOwnNeighborNoBridge(x, y, player.woodcolor)) return 'sandstorm must be directly adjecant, and does not work over bridges';
      if(tile == player.color) return 'sandstorm can only transform another color to player color';
    }

    if(action.type == A_TRANSFORM_SPECIAL2) {
      if(tile == player.color) return 'tile already that color';
    }

    if(action.type == A_GIANTS_TRANSFORM) {
      if(player.faction != F_GIANTS) return 'giants transform requires giants';
      if(tile == player.color) return 'giants can only transform another color to their color';
    }

    // Now execute it
    player.transformed = true;
    player.transformco = [x, y];
    player.transformcoset[arCo(x, y)] = true;
    var newcolor = getColorAfterTransformAction(tile, player, action.type);
    if(newcolor == player.getMainDigColor()) player.mayaddmorespades = false; // if you reached the destination color, then you may not add more spade actions, only overflow
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

    setBuilding(x, y, B_MERMAIDS, player.woodcolor);
  }
  else if(action.type == A_POWER_BRIDGE || action.type == A_ENGINEERS_BRIDGE) {
    if(action.type == A_POWER_BRIDGE) {
      game.octogons[action.type] = 1;
      error = tryConsumeForAction(player, action.type);
      if(error != '') return error;
    }
    if(action.type == A_ENGINEERS_BRIDGE) {
      if(player.faction != F_ENGINEERS) return 'you are not an engineer';
      if(player.w < 2) return 'not enough resources for ' + getActionName(action.type);
      player.w -= 2;
    }

    if(player.bridgepool <= 0) return 'not enough bridges in pool';
    player.bridgepool--;
    player.bridges++;
  }
  else if(action.type == A_PLACE_BRIDGE) {
    //LOU if get here when no bridge from POW_BRIDGE or ENG_BRIDGE, must be RIVERWALKERS SH   
    if (player.bridges <= 0) {
      if(player.bridgepool <= 0) return 'not enough bridges in pool';
      player.bridgepool--;
      player.bridges++;
      player.numactions = 0;
    }    
    var x0 = action.cos[0][0];
    var y0 = action.cos[0][1];
    var x1 = action.cos[1][0];
    var y1 = action.cos[1][1];
    //LOU only need one side with building to have a bridge
    if(!canHaveBridge(x0, y0, x1, y1, player.woodcolor)) return 'invalid bridge location';

    addBridge(x0, y0, x1, y1, player.woodcolor);
    player.bridges--;
  }
  else if(action.type == A_UPGRADE_TP) error = tryUpgradeAction(player, action);
  else if(action.type == A_UPGRADE_TE) error = tryUpgradeAction(player, action);
  else if(action.type == A_UPGRADE_SH) error = tryUpgradeAction(player, action);
  else if(action.type == A_UPGRADE_SA) error = tryUpgradeAction(player, action);
  else if(action.type == A_POWER_1P) {
    game.octogons[action.type] = 1;
    error = tryConsumeForAction(player, action.type);
    if(error != '') return error;
    addIncome(player, [0,0,1,0,0]);
    if(player.priestorcolor) {
      error = unlockColorPriest(player, action.color);
      if(error != '') return error;
    }
  }
  else if(action.type == A_POWER_2W) {
    game.octogons[action.type] = 1;
    error = tryConsumeForAction(player, action.type);
    if(error != '') return error;
    addIncome(player, [0,2,0,0,0]);
  }
  else if(action.type == A_POWER_7C) {
    game.octogons[action.type] = 1;
    error = tryConsumeForAction(player, action.type);
    if(error != '') return error;
    addIncome(player, [7,0,0,0,0]);
  }
  else if(action.type == A_PASS) {
    var finalround = state.round == 6;
    if(action.bontile == T_NONE && !finalround) return 'must choose 1 bonus tile';
    if(action.bontile != T_NONE && finalround) return 'tried to pass with bonus tile in last round';
    var passcount = 0;
    passPlayer(player);

    //pass bonuses
    applyPassBonus(player, player);
    player.addVP(player.getFaction().getPassVP(player), 'faction', 'faction');

    if(!finalround) error = giveBonusTile(player, action.bontile);
    else error = giveBonusTile(player, T_NONE);
    if(error) return error;
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
    var cost = getTunnelCarpetCost(player);
    error = tryConsume(player, cost, action.type);
    if(error != '') return error;
    if(!onlyReachableThroughFactionSpecialWithBackupWorldBuildings(
        player, action.co[0], action.co[1], backupGameState.buildings)) return 'must be reachable only through tunnel/carpet power';

    player.tunnelcarpet = action.co; //from now on, next dig and build actions may consider this tile reachable until the whole action sequence is done
    player.addVP(4, 'faction', 'faction'); //this is 4 both for fakirs and dwarves
  }
  else if(action.type == A_DEBUG_SKIP) {
    //pass for debug reasons
    passPlayer(player);
  }
  else if(action.type == A_DEBUG_STEP) {
    //nothing
  }
  else if(action.type == A_CHEAT_C) player.c++;
  else if(action.type == A_CHEAT_W) player.w++;
  else if(action.type == A_CHEAT_P) addPriests(player, 1);
  else if(action.type == A_CHEAT_PW) addPower(player, 1);
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
    if(b[1] != player.woodcolor) return 'must upgrade dwelling of your color';
    player.b_d++;
    player.b_tp--;
    setBuilding(x, y, B_TP, player.woodcolor);
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
      if(getWorld(x, y) != player.color) return 'can only fly to forest'; // TODO: only to be very pedantic: check for BUILDABLE WITHOUT DIGGING color instead
      if(isOccupied(x, y)) return 'already occupied';
      player.b_d--;
      setBuilding(x, y, B_D, player.woodcolor);
    }
  }
  else if(action.type == A_SHIFT || action.type == A_SHIFT2) {
    var shiftcost = state.fireiceerrata ? 5 : 3;
    if(action.type == A_SHIFT) {
      error = tryConsume(player, [0,0,0,shiftcost,0], action.type);
    } else {
      error = tryConsume(player, [0,0,0,0,0, 0,0,0,shiftcost], action.type);
    }
    if(error != '') return error;
    if(getNoShiftColors(player)[action.color]) return 'color already present';
    player.auxcolor = action.color;
    createAuxColorToPlayerMap();
    addIncome(player, player.getActionIncome(action.type), 'faction', 'faction');
  }
  else if(action.type == A_ACOLYTES_CULT) {
    if(action.cult == C_NONE) return 'must specify cult track';
    giveCult(player, action.cult, 1);
    player.freecult = 0;
  }
  else return 'unknown action';

  return error; //ok if error is ''
}

//tries to perform the action, returns false if failure (no resources, invalid location, ...),
//applies the changes and returns empty string on success, error string on fail
//returns '' on success, else error
//this is only for a single action of an action sequence. A player can do a full action sequence in one turn.
//see tryActions for the whole turn
function tryAction(player, action /*Action object*/) {
  var error = '';

  if(player.passed) return 'cannot take action if passed'; //avoid passing twice with chaos magicions double action

  var factionreason = [];

  //tests for: valid for faction, has sh if needed, octogon action not already taken
  if(!player.getFaction().canTakeAction(player, action.type, game, factionreason)) return factionreason[0] || 'error unknown because canTakeAction forgot to put it in opt_reason';

  // Check turn action amount
  if (isTurnAction(action)) {
    var turn = true;
    if(action.type == A_SPADE && player.mayaddmorespades && !player.built) turn = false;
    if(isSpadeConsumingAction(action.type) && player.spades) turn = false;
    if(action.type == A_BUILD && player.transformed && !player.built) turn = false;
    if(turn) {
      if(player.numactions == 0) {
        return player.faction == F_CHAOS && built_sh(player) ?
            'can only take 1 turn action (or 2 after chaosmag double action)' :
            'can only take 1 turn action';
      }
      player.numactions--;
      player.built = false; //reset for chaos magicians, otherwise the following action order breaks: chaosdouble. build. dig. transform. build.
      player.transformed = false; //reset for chaos magicians, otherwise the following action order breaks: chaosdouble. dig. transform. build. build.
    }
  }

  // Check town tiles. Also takes care of the T_FAV_2F_6TW tile.
  var numtw = actionCreatesTown(player, action, null);
  //LOU11 every time "no town tile chosen' or 'town tile chosen injustly', rules is incorrect (change needed somewhere)
  if(action.twtiles.length < numtw && action.twtiles.length != 0)  return 'too few town tiles chosen';
  if(action.twtiles.length > numtw && numtw != 0 ) return 'too many town tiles chosen';

  // Check favor tiles
  if(action.favtiles.length < actionGivesFavorTile(player, action)) return action.favtiles.length == 0 ? 'no favor tile chosen' : 'too few favor tiles chosen';
  if(action.favtiles.length > actionGivesFavorTile(player, action)) return 'too many favor tiles chosen';

  var error = tryActionCore_(player, action);

  if(error) return error;

  // Happens after sending priest to cult track, for payment of acolytes digging, ....
  if(player.fixedcult != 0) {
    if(action.cult == C_NONE) return 'must specify cult track';
    if(player.fixedcult < 0 && player.cult[action.cult] < -player.fixedcult) return 'not enough cult';
    giveCult(player, action.cult, player.fixedcult); //sign determines if it's payment or receiving of cult
    player.fixedcult = 0;
  }

  if(player.spadevp > 0) {
    if(getRoundTile() == T_ROUND_DIG2VP_1E1C) {
      player.addVP(player.spadevp * 2, 'round', getTileVPDetail(getRoundTile()));
    }
    player.spadevp = 0;
  }

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

  if(error == '' && player.numactions > 0) {
    error = 'you must take an actual turn action during your turn (or two after chaosmag double action), or pass. Burning power or converting is not enough to count as a full action.';
  }
  if(error == '' && !player.overflowspades && player.spades > 0) {
    error = 'you must use up all your spades, do as many terrain transformations and received spades. Only if you have overflow spades, not using some is allowed.';
  }

  if(error != '') loadGameState(backupGameState);

  return error;
}

//aka coordinatesToString
function printCo(x, y) {
  //return ['A','B','C','D','E','F','G','H','I'][y] + (1 + x);
  return String.fromCharCode(65 + y) + (1 + x);
}

//aka parseCo, ...
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

//returns array of actions needed to go from fromcolor to tocolor depending on which is the closest direction from world color to player color
//empty array if equal, single A_GIANT_TRANFORM if giants, several CCW or CW if needed, etc... (will never return sandstorm since that consumes a special action)
//follows shortest distance
//clockwise = red->yellow->brown->black->...
//ccw = red->grey->green->blue->...
function transformDirAction(player, fromcolor, tocolor) {
  if(fromcolor == tocolor) return [];
  if(player.faction == F_GIANTS) return [A_GIANTS_TRANSFORM];

  var diff = (tocolor == W ? player.auxcolor : tocolor) - (fromcolor == W ? player.auxcolor : fromcolor);
  if(diff < 0) diff += 7;

  var result = [];
  if(tocolor == W) {
    if(diff == 0) return [A_TRANSFORM_SPECIAL];
    if(diff == 1) return [A_TRANSFORM_SPECIAL];
    if(diff == 2) return [A_TRANSFORM_CW, A_TRANSFORM_SPECIAL];
    if(diff == 3) return [A_TRANSFORM_CW, A_TRANSFORM_CW, A_TRANSFORM_SPECIAL];
    if(diff == 4) return [A_TRANSFORM_CCW, A_TRANSFORM_CCW, A_TRANSFORM_SPECIAL];
    if(diff == 5) return [A_TRANSFORM_CCW, A_TRANSFORM_SPECIAL];
    return [A_TRANSFORM_SPECIAL];
  } else if(tocolor == O) {
    return [A_TRANSFORM_SPECIAL2];
  /*} else if(fromcolor == W) {
    // TODO: diff == 0 not supported yet (would require some kind of "anti special" direction
    if(diff == 1) return [A_TRANSFORM_CW];
    if(diff == 2) return [A_TRANSFORM_CW, A_TRANSFORM_CW];
    if(diff == 3) return [A_TRANSFORM_CW, A_TRANSFORM_CW, A_TRANSFORM_CW];
    if(diff == 4) return [A_TRANSFORM_CCW, A_TRANSFORM_CCW, A_TRANSFORM_CCW];
    if(diff == 5) return [A_TRANSFORM_CCW, A_TRANSFORM_CCW];
    return [A_TRANSFORM_CCW];*/
  } else {
    if(diff == 1) return [A_TRANSFORM_CW];
    if(diff == 2) return [A_TRANSFORM_CW, A_TRANSFORM_CW];
    if(diff == 3) return [A_TRANSFORM_CW, A_TRANSFORM_CW, A_TRANSFORM_CW];
    if(diff == 4) return [A_TRANSFORM_CCW, A_TRANSFORM_CCW, A_TRANSFORM_CCW];
    if(diff == 5) return [A_TRANSFORM_CCW, A_TRANSFORM_CCW];
    return [A_TRANSFORM_CCW];
  }
}

function actionToString(action) {
  var result = getActionName(action.type);
  if(action.co) result += ' ' + printCo(action.co[0], action.co[1]);
  if(action.cos.length > 0) result += ' ' + printCos(action.cos);
  if(action.favtiles.length > 0 || action.twtiles.length > 0 || action.bontile != T_NONE) {
    result += ' ' + printActionTiles(action);
  }
  if(action.cult != C_NONE) {
    result += ' @' + getCultName(action.cult);
  }
  if(action.color != N && action.color != Z) {
    result += ' ' + getColorName(action.color);
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

// Is the tile next to river?
var touchesWater = function(x, y) {
  var n = getNeighborTiles(x, y);
  for(var i = 0; i < n.length; i++) {
    if(getWorld(n[i][0], n[i][1]) == I) return true;
  }
  return false;
};

//returns true if successful, false if house could not be placed there
function placeInitialDwelling(player, x, y) {
  if(player.landdist == 0 && !touchesWater(x, y)) return 'not allowed to build there, must touch river';
  if(getWorld(x, y) != player.auxcolor) return 'wrong tile color';
  if(getBuilding(x, y)[0] != B_NONE) return 'already has building';
  if(player.b_d <= 0) return 'no dwellings left. This error should never happen.';
  player.b_d--;
  if(player.color == W || player.color == O) setWorld(x, y, player.color);
  setBuilding(x, y, B_D, player.woodcolor);
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
      var tw = getPlayerTownsOfSize6(player.woodcolor, townclusters);
      //this are all individual clusters, so add them one by one as a single length array each
      for(var j = 0; j < tw.length; j++) involved.push([tw[j]]);
    }
  }

  if(isUpgradeAction(action)) {
    var frombuilding = getUpgradeActionInputBuilding(action);
    var tobuilding = getUpgradeActionOutputBuilding(action);
    var tw = makesNewTownByUpgrade(player, action.co[0], action.co[1], frombuilding, tobuilding, reqpower);
    if(tw.length > 0) involved.push(tw);
  }
  else if(isTownyBuildAction(action)) {
    var building = action.type == A_CONNECT_WATER_TOWN ? B_MERMAIDS : B_D;
    var tw = makesNewTownByBuilding(action.co[0], action.co[1], building, reqpower, player.woodcolor);
    if(tw.length > 0) involved.push(tw);
  }
  else if(isBridgeAction(action)) {
    var tw = makesNewTownByBridge(action.cos[0][0], action.cos[0][1], action.cos[1][0], action.cos[1][1], reqpower, player.woodcolor);
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

// Get faction colors chosen so far.
// The player.color and player.auxcolor values must be up to date
function getAlreadyChosenColors() {
  var already = {}; //already chosen colors
  for(var i = 0; i < game.players.length; i++) {
    if(game.players[i].color != N /*if already has chosen*/) {
      already[game.players[i].color] = true;
    }
    if(game.players[i].auxcolor != N /*if already has chosen*/) {
      already[game.players[i].auxcolor] = true;
    }
  }
  // X and Z are mutually exclusive (they're on other side of faction board)
  if(already[X] || already[Z]) {
    already[X] = true;
    already[Z] = true;
  }
  return already;
}

//Get the possible factions the player can choose at the beginning of the game,
//excluding those with already chosen colors or not available by rules.
function getPossibleFactionChoices() {
  var already = getAlreadyChosenColors();
  var result = [];

  for(var i = 0; i <= factions.length; i++) {
    if(!factions[i]) continue;
    if(!state.fireice && isFireIceFaction(factions[i])) continue;
    if(already[factionColor(factions[i])]) continue;
    result.push(factions[i]);
  }

  return result;
}

// The player.color and player.auxcolor values must be up to date
function getNoShiftColors(player) {
  var already = {};
  for(var i = 0; i < game.players.length; i++) {
    if(i == player.index) already[game.players[i].auxcolor] = true;
    else already[game.players[i].color] = true;
  }
  return already;
}

//During faction choice. Returns '' if ok, error string if not.
function trySetFaction(player, faction) {
  if(!faction) return 'invalid faction';

  if(colorToPlayerMap[factionColor(faction)] != undefined) return 'color already chosen';
  if(auxColorToPlayerMap[factionColor(faction)] != undefined) return 'color already chosen';

  player.setFaction(faction);
  player.color = factionColor(faction);
  player.woodcolor = player.color;
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
        var index = woodColorToPlayerMap[b[1]];
        if(index == playerIndex) continue; //don't leech from self
        var power = game.players[index].getFaction().getBuildingPower(b[0]);
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

//Returns the shortest possible digging distance (more a strategy than a rule thing, because according to the rules you can also follow other paths)
//For giants, toColor should be player.color. Giants cannot dig to any other color than that.
//Does NOT take into account whether the player can actually dig from or to that color, that is, fromColor W or O are not supported unless player is W or O, in which case this returns 0
function digDist(player, fromColor, toColor) {
  if(fromColor == toColor) return 0;
  if(toColor == W) {
    if(fromColor == player.auxcolor) return 1;
    else return digDist(player, fromColor, player.auxcolor);
  }
  if(toColor == O) {
    // NOTE: this 1 transform is not a regular spade transform, but the firetransform that works like sandstorm. Other functions must take that into account.
    return 1; //It takes one transform for fire factions to transform to their color. For other factions, another function than this returns that they can't, so always returning 1 is ok.
  }
  if(player.faction == F_GIANTS) return 2; //Giants can dig from any other color to their home color with 2 spades, nothing else.
  else return colorDist(fromColor, toColor);
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

function getResourceEndGameScoring(player) {
  var num = player.c + player.w + player.p + player.pw2 + Math.floor(player.pw1 / 2);
  if(player.faction == F_ALCHEMISTS) return Math.floor(num / 2);
  else return Math.floor(num / 3);
}

//name and faction
function getFullName(player) {
  if(player.faction == undefined || player.faction == F_NONE) return player.name;
  return player.name + ' (' + getFactionCodeName(player.getFaction()) + ')';
}

function getFullNameColored(player) {
  var name = getFullName(player);
  var imColor = getImageColor(player.woodcolor);
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
// -array of [player index, value, score] to give to each player, sorted from highest to lowest score (value is also included for those with 0 score)
function distributePointsSorted(values, scores, minValue) {
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


// Similar to distributePointsSorted, but output is simpler:
// an array of scores to give to each player, index matches player index
function distributePoints(values, scores, minValue) {
  var scores = distributePointsSorted(values, scores, minValue);
  var result = [];
  for(var j = 0; j < scores.length; j++) {
    result[scores[j][0]] = scores[j][2];
  }
  return result;
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
  var values = [];
  for(var j = 0; j < game.players.length; j++) {
    values[j] = game.players[j].cult[track];
  }
  return distributePoints(values, [8, 4, 2], 1);
}

//final scoring, such as the network size score
//returns array of [final scoring score, stat size] per player (stat size also filled in if score is 0)
//e.g. for network score, it returns array of [network score, network size]
function getFinalScores() {
  return finalScoringFunctions[game.finalscoring]();
}

var finalScoringCodeNames = [];
var finalScoringDisplayNames = [];
var finalScoringFunctions = [];
var nameToFinalScoring = {}; //codename to index

//fun is according to the description of getFinalScores
function registerFinalScoring(codename, displayname, fun) {
  nameToFinalScoring[codename] = finalScoringCodeNames.length;
  finalScoringCodeNames.push(codename);
  finalScoringDisplayNames.push(displayname);
  finalScoringFunctions.push(fun);
}

//MUST be the first one registered: it has index 0 and is excluded for random based on that index
registerFinalScoring('none', 'None', function() {
  var result = [];
  for(var i = 0; i < game.players.length; i++) result[i] = [0, 0];
  return result;
});

//network score is NOT a final scoring but is in addition, so do NOT register like this:
//registerFinalScoring('network' ,'Largest Network', getNetworkEndScores);

//returns array of [network end score][network size] per player
function getNetworkEndScores() {
  calculateNetworkClusters();
  var values = [];
  for(var j = 0; j < game.players.length; j++) {
    values[j] = getBiggestNetwork(game.players[j]);
  }

  var scores = distributePoints(values, [18, 12, 6], 0);

  var result = [];
  for(var j = 0; j < scores.length; j++) {
    result[j] = [scores[j], values[j]];
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
    playerout.addVP(built_d(playerin) * 1, 'bonus', getTileVPDetail(T_BON_PASSDVP_2C));
  }
  if(playerin.bonustile == T_BON_PASSTPVP_1W) {
    playerout.addVP(built_tp(playerin) * 2, 'bonus', getTileVPDetail(T_BON_PASSTPVP_1W));
  }
  if(playerin.bonustile == T_BON_PASSSHSAVP_2W) {
    playerout.addVP(built_sh(playerin) * 4 + built_sa(playerin) * 4, 'bonus', getTileVPDetail(T_BON_PASSSHSAVP_2W));
  }
  if(playerin.bonustile == T_BON_PASSSHIPVP_3PW) {
    playerout.addVP(playerin.shipping * 3, 'bonus', getTileVPDetail(T_BON_PASSSHIPVP_3PW));
  }
  if(playerin.favortiles[T_FAV_1A_PASSTPVP]) {
    var vp = [0,2,3,3,4][built_tp(playerin)];
    playerout.addVP(vp, 'favor', getTileVPDetail(T_FAV_1A_PASSTPVP));
  }
}

function getPassBonusEndScores() {
  var result = [];
  for(var i = 0; i < game.players.length; i++) result[i] = 0;

  for(var i = 0; i < game.players.length; i++) {
    var player = game.players[i];
    var dummy = new Player();
    dummy.vp = 0;
    applyPassBonus(player, dummy);
    dummy.addVP(player.getFaction().getPassVP(player), 'faction', 'faction');
    result[i] += dummy.vp;
  }

  return result;
}


//returns array of projected end game scores per player. Per player it's an array
//of: total, cult, network, final, resource, passing
function projectEndGameScores() {
  var cultscores = [];
  cultscores[0] = getCultEndScores(C_F);
  cultscores[1] = getCultEndScores(C_W);
  cultscores[2] = getCultEndScores(C_E);
  cultscores[3] = getCultEndScores(C_A);
  var networkscores = getNetworkEndScores();
  var finalscores = getFinalScores();
  var resourcescores = getResourceEndScores();
  var passscores = getPassBonusEndScores();

  var result = [];
  for(var i = 0; i < game.players.length; i++) result[i] = [game.players[i].vp, 0, 0, 0, 0];

  for(var i = 0; i < game.players.length; i++) {
    for(var j = C_F; j <= C_A; j++) {
      result[i][1] += cultscores[j - C_F][i];
    }
    result[i][2] = networkscores[i][0];
    result[i][3] = finalscores[i][0];
    result[i][4] = resourcescores[i];
    if(!game.players[i].passed) result[i][5] = passscores[i];
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
