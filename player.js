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

//Players and the parameters of their factions.

//returns the landscape color of the given faction
function factionColor(faction) {
  if(faction == F_NONE) return I;
  if(faction == F_CHAOS || faction == F_GIANTS) return R;
  if(faction == F_FAKIRS || faction == F_NOMADS) return Y;
  if(faction == F_HALFLINGS || faction == F_CULTISTS) return U;
  if(faction == F_ALCHEMISTS || faction == F_DARKLINGS) return K;
  if(faction == F_MERMAIDS || faction == F_SWARMLINGS) return B;
  if(faction == F_AUREN || faction == F_WITCHES) return G;
  if(faction == F_ENGINEERS || faction == F_DWARVES) return S;
  return R; //generic debug faction. Gfactionfully return some value.
}

//returns the two factions for the given landscape color
function colorFactions(color) {
  if(color == R) return [F_CHAOS, F_GIANTS];
  if(color == Y) return [F_FAKIRS, F_NOMADS];
  if(color == U) return [F_HALFLINGS, F_CULTISTS];
  if(color == K) return [F_ALCHEMISTS, F_DARKLINGS];
  if(color == B) return [F_MERMAIDS, F_SWARMLINGS];
  if(color == G) return [F_AUREN, F_WITCHES];
  if(color == S) return [F_ENGINEERS, F_DWARVES];
  throw new Error('invalid faction color');
}

//Constructor for Player
var Player = function() {
  this.index = -1;
  this.name = 'unnamed'; //display name
  this.actor = undefined; //type: Actor
  this.human = true;

  this.faction = F_NONE;
  this.color = N;

  this.passed = false;

  this.c = 15; //coins
  this.w = 3; //workers
  this.p = 0; //priests
  this.pp = 7; //priest pool
  this.pw0 = 5; //power lowest bowl
  this.pw1 = 7; //power middle bowl
  this.pw2 = 0; //power usable bowl
  this.vp = 20; //victory points

  //amount of buildings NOT placed on the map
  this.b_d = 8;
  this.b_tp = 4;
  this.b_te = 3;
  this.b_sh = 1;
  this.b_sa = 1;
  //bridges NOT placed on the map
  this.bridges = 3;

  this.bonustile = T_NONE; //pass tile
  this.towntiles = {}; //not an array but a map
  this.favortiles = {}; //not an array but a map

  this.cult = [0,0,0,0]; //the array index matches the C_CULT enum
  this.keys = 0; //incremented when forming town, decremented when entering cult 10
  this.octogons = {}; //gets action octogons filled in when personal octogons are used. Gets cleared at start of new round.

  this.shipping = 0; //increased when paying the cost
  this.maxshipping = 3; //5 for mermaids
  this.bonusshipping = 0; //temporarily while having the shipping bonus tile
  this.digging = 0;
  this.maxdigging = 2;
  this.tunnelcarpetdistance = 0; // 1 for dwarves, 1-4 for fakirs
  this.maxtunnelcarpetdistance = 0;

  //for more detailed VP statistics (these are shown on mouseover over VP in player panel, and some in the end game stats)
  this.vp_reason = {start:20}; //map of named vp reasons to number. This is a rough reason, e.g. any passing bonus tile has reason 'bonus'
  this.vp_detail = {start:20}; //map of named vp detailed reasons to number. This is a detailed reason, e.g. for a passing bonus tile it's the tile codename

  // Temporary resources and state only valid during an action sequence. These are cleared after the action sequence is done.
  this.numactions = 1; //how much actions you can do this turn. 1 at start of your turn. 0 as soon as a turn action is taken. Set to 2 if chaos magicians double action is used. Note that convert actions (and some others) do not count towards this.
  this.spades = 0; //received from spade action (convert workers to spade), pow2spade, halfling SH, ... Consumed by transform actions.
  this.overflowspades = false; //set to true if A_POW_2SPADE, or halflings A_UPGRADE_SH is used. Set to false as soon as A_SPADE is used. Whether overflowing spades is allowed.
  this.mayaddmorespades = false; //set to true as soon as any spade giving action is taken. That means it's allowed to add additional A_SPADE actions (despite the fact that numactions will be 0).
  this.transformed = false; //set to true as soon as you do any transform action (that means it's allowed to do a A_BUILD after this even if numactions is 0)
  this.transformdir = A_NONE; //A_TRANSFORM_CW or A_TRANSFORM_CCW. This is kept track of because you may not change direction on a tile.
  this.transformco = null; //coordinates of last transform, used to keep track of where overflow spades go. e.g. [0,0]
  this.transformcoset = {}; //coordinates of all transforms (as arCo), to determine places where allowed to build after digging
  this.built = false; //set to true as soon as you do A_BUILD. After this you cannot build anymore, and not transform anymore either.
  this.darklingconverts = 0; //set to 3 after building darklings SH, allowing 3 w->p actions
  this.tunnelcarpet = null; //coordinate value to which tunneling/carpetting is done this turn
};

function initPlayerTemporaryTurnState(player) {
  player.numactions = 1;
  player.spades = 0;
  player.mayaddmorespades = false;
  player.gotspades = false;
  player.transformed = false;
  player.transformdir = A_NONE;
  player.transformco = null;
  player.transformcoset = {};
  player.built = false;
  player.darklingconverts = 0;
  player.tunnelcarpet = null;
}

//reason is a rough reason, e.g. 'bonus' for any pass bonus tile, 'cult' for any cult track, ...
//details is the exact reason, e.g. the name of the cult track or bonus tile, ...
Player.prototype.addVP = function(vp, reason, detail) {
  if(vp != 0) this.vp_reason[reason] = incrUndef(this.vp_reason[reason], vp);
  if(vp != 0) this.vp_detail[detail] = incrUndef(this.vp_detail[detail], vp);
  this.vp += vp;
};

//Get the VP for the given reason
Player.prototype.getVPFor = function(reason) {
  return undef0(this.vp_reason[reason]);
};

Player.prototype.getVPForDetail = function(detail) {
  return undef0(this.vp_detail[detail]);
};

function getShipping(player) {
  var result = player.shipping
  if(state.type != S_ROUND_END_DIG) result += player.bonusshipping; //shipping bonus tile does not work during round bonus digging
  return result;
}

function built_d(player) {
  return 8 - player.b_d;
}

function built_tp(player) {
  return 4 - player.b_tp;
}

function built_te(player) {
  return 3 - player.b_te;
}

function built_sh(player) {
  return 1 - player.b_sh;
}

function built_sa(player) {
  return 1 - player.b_sa;
}

function built_bridges(player) {
  return 3 - player.bridges;
}

//sets the initial cult values based on the player faction
function initCult(player) {
  if(player.faction == F_CHAOS) player.cult =           [2,0,0,0];
  else if(player.faction == F_GIANTS) player.cult =     [1,0,0,1];
  else if(player.faction == F_FAKIRS) player.cult =     [1,0,0,1];
  else if(player.faction == F_NOMADS) player.cult =     [1,0,1,0];
  else if(player.faction == F_HALFLINGS) player.cult =  [0,0,1,1];
  else if(player.faction == F_CULTISTS) player.cult =   [1,0,1,0];
  else if(player.faction == F_ALCHEMISTS) player.cult = [1,1,0,0];
  else if(player.faction == F_DARKLINGS) player.cult =  [0,1,1,0];
  else if(player.faction == F_MERMAIDS) player.cult =   [0,2,0,0];
  else if(player.faction == F_SWARMLINGS) player.cult = [1,1,1,1];
  else if(player.faction == F_AUREN) player.cult =      [0,1,0,1];
  else if(player.faction == F_WITCHES) player.cult =    [0,0,0,2];
  else if(player.faction == F_ENGINEERS) player.cult =  [0,0,0,0];
  else if(player.faction == F_DWARVES) player.cult =    [0,0,2,0];
  else if(player.faction == F_GENERIC) player.cult =    [0,0,0,0];
  else throw new Error('unknown faction');
}

//includes starting VP, and mermaids shipping
function giveStartingResources(player) {
  player.vp = 20;
  player.pp = 7;
  player.p = 0;

  if(player.faction == F_CHAOS) {
    player.c = 15;
    player.w = 4;
  }
  else if(player.faction == F_NOMADS) {
    player.c = 15;
    player.w = 2;
  }
  else if(player.faction == F_DARKLINGS) {
    player.c = 15;
    player.w = 1;
    player.p = 1;
  }
  else if(player.faction == F_SWARMLINGS) {
    player.c = 20;
    player.w = 8;
  }
  else if(player.faction == F_ENGINEERS) {
    player.c = 10;
    player.w = 2;
  }
  else {
    player.c = 15;
    player.w = 3;
  }

  player.pw2 = 0;
  if(player.faction == F_FAKIRS) {
    player.pw0 = 7;
    player.pw1 = 5;
  }
  else if(player.faction == F_HALFLINGS || player.faction == F_MERMAIDS
      || player.faction == F_SWARMLINGS || player.faction == F_ENGINEERS) {
    player.pw0 = 3;
    player.pw1 = 9;
  }
  else {
    player.pw0 = 5;
    player.pw1 = 7;
  }
}

//initialize player stats based on faction: shipping and digging
function initPlayerFactionStats(player) {
  player.maxshipping = 3;
  player.maxdigging = 2;
  if(player.faction == F_FAKIRS) player.maxdigging = 1;
  else if(player.faction == F_DARKLINGS) player.maxdigging = 0;
  
  if(player.faction == F_FAKIRS || player.faction == F_DWARVES) {
    player.maxshipping = 0;
    player.tunnelcarpetdistance = 1;
    player.maxtunnelcarpetdistance = player.faction == F_FAKIRS ? 4 : 1;
  }
  else if(player.faction == F_MERMAIDS) {
    player.maxshipping = 5;
    player.shipping = 1;
  }
}

//initialize player parameters based on faction: shipping and digging, cults, staring resources
function initPlayerFaction(player) {
  initCult(player);
  giveStartingResources(player);
  initPlayerFactionStats(player);
}

function shippingBonusTileWorks(player) {
  return player.faction != F_FAKIRS && player.faction != F_DWARVES;
}

function getNumInitialDwellings(player) {
  if(player.faction == F_CHAOS) return 1;
  else if(player.faction == F_NOMADS) return 3;
  else return 2;
}

function getAdvanceShipCost(faction) {
  return [4,0,1,0,0];
}

//the cost of advancing shipping, given you're still at the previous level
function getAdvanceShipVP(player) {
  return player.faction == F_MERMAIDS ? player.shipping + 1 : player.shipping + 2;
}

function canAdvanceShip(player) {
  return player.shipping < player.maxshipping;
}

function getAdvanceDigCost(faction) {
  return faction == F_HALFLINGS ? [1,2,1,0,0] : [5,2,1,0,0];
}

//the cost of advancing digging, given you're still at the previous level (doesn't actually matter, it's a constant)
function getAdvanceDigVP(player) {
  return 6;
}

function canAdvanceDig(player) {
  return player.digging < player.maxdigging;
}

//cost for num spades with workers (priest for darklings)
function getDigCost(player, num) {
  if(player.faction == F_DARKLINGS) return [0,0,num,0,0];
  else return [0,num*(3-player.digging),0,0,0];
}

function getBuildingCost(faction, building, neighbor /*for TP*/) {
  if(building == B_D) {
    if(faction == F_ENGINEERS) return [1,1,0,0,0];
    else if(faction == F_SWARMLINGS) return [3,2,0,0,0];
    else return [2,1,0,0,0];
  }
  else if(building == B_TP) {
    if(faction == F_ENGINEERS) return [neighbor ? 2 : 4, 1,0,0,0];
    else if(faction == F_SWARMLINGS) return [neighbor ? 4 : 8,3,0,0,0];
    else return [neighbor ? 3 : 6,2 ,0,0,0];
  }
  else if(building == B_TE) {
    if(faction == F_ENGINEERS) return [4,1,0,0,0];
    else if(faction == F_SWARMLINGS) return [6,3,0,0,0];
    else return [5,2,0,0,0];
  }
  else if(building == B_SH) {
    if(faction == F_CHAOS) return [4,4,0,0,0];
    else if(faction == F_FAKIRS) return [10,4,0,0,0];
    else if(faction == F_NOMADS || faction == F_HALFLINGS || faction == F_CULTISTS) return [8,4,0,0,0];
    else if(faction == F_ENGINEERS) return [6,3,0,0,0];
    else if(faction == F_SWARMLINGS) return [8,5,0,0,0];
    else return [6,4,0,0,0];
  }
  else if(building == B_SA) {
    if(faction == F_CHAOS || faction == F_CULTISTS || faction == F_MERMAIDS || faction == F_AUREN) return [8,4,0,0,0];
    else if(faction == F_DARKLINGS) return [10,4,0,0,0];
    else if(faction == F_SWARMLINGS) return [8,5,0,0,0];
    else if(faction == F_ENGINEERS) return [6,3,0,0,0];
    else return [6,4,0,0,0];
  }
  else throw new Error('unknown building');
}


// The given building amounts are those still on the player's own board, not those on the map.
function getBuildingIncomeWith(faction, b_d, b_tp, b_te, b_sh, b_sa) {
  var income = [0,0,0,0,0];

  // dwellings
  var d = 8 - b_d;
  if(faction == F_SWARMLINGS) {
    sumIncome(income, [0,2 + Math.min(d,7),0,0,0]);
  }
  else if(faction == F_ENGINEERS) {
    var w = d;
    if(w > 5) w--;
    if(w > 2) w--;
    sumIncome(income, [0,w,0,0,0]);
  }
  else {
    sumIncome(income, [0,1 + Math.min(d,7),0,0,0]);
  }

  // trading posts
  var tp = 4 - b_tp;
  if(faction == F_NOMADS || faction == F_ALCHEMISTS) {
    var c = tp * 2;
    if(tp >= 3) c += 1;
    if(tp >= 4) c += 2;
    var pw = tp;
    sumIncome(income, [c,0,0,pw,0]);
  }
  else if(faction == F_SWARMLINGS) {
    var c = tp * 2;
    if(tp >= 4) c += 1;
    var pw = tp * 2;
    sumIncome(income, [c,0,0,pw,0]);
  }
  else if(faction == F_DWARVES) {
    var c = tp * 2;
    if(tp >= 1) c += 1;
    if(tp >= 4) c += 1;
    var pw = tp;
    if(tp > 2) pw += (tp - 2);
    sumIncome(income, [c,0,0,pw,0]);
  }
  else {
    var c = tp * 2;
    var pw = tp;
    if(tp > 2) pw += (tp - 2);
    sumIncome(income, [c,0,0,pw,0]);
  }

  // temples
  var te = 3 - b_te;
  if(faction == F_ENGINEERS) {
    var p = te;
    var pw = 0;
    if(te >= 2) {
      p--;
      pw += 5;
    }
    sumIncome(income, [0,0,p,pw,0]);
  }
  else {
    sumIncome(income, [0,0,te,0,0]);
  }

  // stronghold
  var sh = 1 - b_sh;
  if(faction == F_CHAOS) {
    sumIncome(income, [0,sh*2,0,0,0]);
  }
  else if(faction == F_GIANTS || faction == F_MERMAIDS || faction == F_SWARMLINGS) {
    sumIncome(income, [0,0,0,sh*4,0]);
  }
  else if(faction == F_FAKIRS) {
    sumIncome(income, [0,0,sh,0,0]);
  }
  else if(faction == F_ALCHEMISTS) {
    sumIncome(income, [sh*6,0,0,0,0]);
  }
  else {
    sumIncome(income, [0,0,0,sh*2,0]);
  }

  // sanctuary
  var sa = 1 - b_sa;
  if(faction == F_DARKLINGS || faction == F_SWARMLINGS) {
    sumIncome(income, [0,0,sa*2,0,0]);
  }
  else {
    sumIncome(income, [0,0,sa,0,0]);
  }

  return income;
}

function getBuildingIncome(player) {
  return getBuildingIncomeWith(player.faction, player.b_d, player.b_tp, player.b_te, player.b_sh, player.b_sa);
}

function getIncomeForNextBuilding(player, building) {
  var b0 = [player.b_d, player.b_tp, player.b_te, player.b_sh, player.b_sa];
  var b1 = [player.b_d, player.b_tp, player.b_te, player.b_sh, player.b_sa];
  if(building == B_D) b1[0]--;
  else if(building == B_TP) b1[1]--;
  else if(building == B_TE) b1[2]--;
  else if(building == B_SH) b1[3]--;
  else if(building == B_SA) b1[4]--;

  var result = getBuildingIncomeWith(player.faction, b1[0], b1[1], b1[2], b1[3], b1[4]);
  var old = getBuildingIncomeWith(player.faction, b0[0], b0[1], b0[2], b0[3], b0[4]);
  subtractIncome(result, old);
  return result;
}
