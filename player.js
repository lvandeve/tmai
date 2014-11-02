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

//Players and their game rule parameters.

//Constructor for Player
var Player = function() {
  this.index = -1;
  this.name = 'unnamed'; //display name
  this.actor = undefined; //type: Actor
  this.human = true;

  this.faction = F_NONE; //this is an integer index, so that the deep copying of player object would not copy the factions. Use the getFaction() function to get the faction object.
  this.color = N; // the faction color
  this.auxcolor = N;
  this.woodcolor = N; // the color of the player's game pieces

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
  this.freecult = 0; //this is cult that can be chosen on MULTIPLE cult tracks if desired, e.g. if this is two, it's possible to split it in 1 fire and 1 water.
  this.fixedcult = 0; //cult that requires same cult track. E.g. used as payment for acolytes digging
  this.spadevp = 0; //*potential* spade-action VPs for if the round bonus point tile is there even though no digging was involved (for lava factions)

  this.shipping = 0; //increased when paying the cost
  this.maxshipping = 3; //5 for mermaids
  this.bonusshipping = 0; //temporarily while having the shipping bonus tile
  this.digging = 0;
  this.maxdigging = 2;
  this.tunnelcarpetdistance = 0; // 1 for dwarves, 1-4 for fakirs
  this.maxtunnelcarpetdistance = 0;

  //for more detailed VP statistics (these are shown on mouseover over VP in player panel, and some in the end game stats)
  this.vp_reason = {start:20}; //map of named vp reasons to number. This is a rough reason, e.g. any passing bonus tile has reason 'bonus'
  this.vp_detail = {start:20}; //map of named vp detailed reasons to number. This is a detailed reason, e.g. for round or bonus tiles it specifies for what the vp were ("round pass tp", ...)

  // Temporary resources and state only valid during an action sequence. These are cleared after the action sequence is done.
  this.numactions = 1; //how much actions you can do this turn. 1 at start of your turn. 0 as soon as a turn action is taken. Set to 2 if chaos magicians double action is used. Note that convert actions (and some others) do not count towards this.
  this.spades = 0; //received from spade action (convert workers to spade), pow2spade, halfling SH, ... Consumed by transform actions.
  this.overflowspades = false; //set to true if A_POW_2SPADE, or halflings A_UPGRADE_SH is used. Set to false as soon as A_SPADE is used. Whether overflowing spades is allowed.
  this.mayaddmorespades = false; //set to true as soon as any spade giving action is taken. That means it's allowed to add additional A_SPADE actions (despite the fact that numactions will be 0).
  this.transformed = false; //set to true as soon as you do any transform action (that means it's allowed to do a A_BUILD after this even if numactions is 0)
  this.transformdir = A_NONE; //A_TRANSFORM_CW or A_TRANSFORM_CCW. This is kept track of because you may not change direction on a tile.
  //coordinates of last transform, used to keep track of where overflow spades go. e.g. [0,0]
  //set back to null when starting new spade giving action, because chaos magicians double action may cause new series where it's allowed
  this.transformco = null;
  this.transformcoset = {}; //coordinates of all transforms (as arCo), to determine places where allowed to build after digging
  this.built = false; //set to true as soon as you do A_BUILD. After this you cannot build anymore, and not transform anymore either.
  this.darklingconverts = 0; //set to 3 after building darklings SH, allowing 3 w->p actions
  this.tunnelcarpet = null; //coordinate value to which tunneling/carpetting is done this turn
  //nodigreachco: coordinates of dwelling built that does NOT count for reachability of spades.
  //this to make sure if you do the 2-spade power action, build a dwelling after the first spade, that you cannot reach one tile further with the second spade (the new dwelling doesn't count for reachability yet)
  //set to null when starting new spade action (could be chaos magicians doing 2 actions in a row, then it DOES count for reachability, hence the resetting)
  this.nodigreachco = null;

  this.getMainDigColor = function() { return (this.color == X || this.color == Z) ? this.auxcolor : this.color; }
  this.getFaction = function() { return factions[this.faction] ? factions[this.faction] : dummyfaction; };
  this.setFaction = function(faction) { this.faction = faction ? ensureFactionIndex(faction) : -1; };
  this.getActionCost = function(actiontype) { return this.getFaction().getActionCost(this, actiontype); };
  this.getActionIncome = function(actiontype) { return this.getFaction().getActionIncome(this, actiontype); };
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
  player.nodigreachco = null;
  player.fixedcult = 0;
  player.freecult = 0;
}

//reason is a rough reason, e.g. 'bonus' for any pass bonus tile, 'cult' for any cult track, ...
//details is the exact reason, e.g. the name of the cult track or bonus tile, ...
Player.prototype.addVP = function(vp, reason, detail) {
  if(vp == 0) return;
  this.vp_reason[reason] = incrUndef(this.vp_reason[reason], vp);
  this.vp_detail[detail] = incrUndef(this.vp_detail[detail], vp);
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

//initialize player parameters based on faction: shipping and digging, cults, staring resources
function initPlayerFaction(player) {
  player.getFaction().setStartSituation(player);
}

function shippingBonusTileWorks(player) {
  return player.faction != F_FAKIRS && player.faction != F_DWARVES;
}

function getNumInitialDwellings(player) {
  if(player.faction == F_CHAOS) return 1;
  else if(player.faction == F_NOMADS) return 3;
  else return 2;
}

//the cost of advancing shipping, given you're still at the previous level
function getAdvanceShipVP(player) {
  return player.faction == F_MERMAIDS ? player.shipping + 1 : player.shipping + 2;
}

function canAdvanceShip(player) {
  return player.shipping < player.maxshipping;
}

//the cost of advancing digging, given you're still at the previous level (doesn't actually matter, it's a constant)
function getAdvanceDigVP(player) {
  return 6;
}

function canAdvanceDig(player) {
  return player.digging < player.maxdigging;
}

function getBuildingIncome(player) {
  return player.getFaction().getBuildingIncome(built_d(player), built_tp(player), built_te(player), built_sh(player), built_sa(player));
}

function getIncomeForNextBuilding(player, building) {
  var b0 = [built_d(player), built_tp(player), built_te(player), built_sh(player), built_sa(player)];
  var b1 = [built_d(player), built_tp(player), built_te(player), built_sh(player), built_sa(player)];
  if(building == B_D) b1[0]--;
  else if(building == B_TP) b1[1]--;
  else if(building == B_TE) b1[2]--;
  else if(building == B_SH) b1[3]--;
  else if(building == B_SA) b1[4]--;

  var result = player.getFaction().getBuildingIncome(b1[0], b1[1], b1[2], b1[3], b1[4]);
  var old = player.getFaction().getBuildingIncome(b0[0], b0[1], b0[2], b0[3], b0[4]);
  subtractIncome(result, old);
  return result;
}
