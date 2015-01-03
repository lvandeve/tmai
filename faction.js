/*
TM AI

Copyright (C) 2013-2014 by Lode Vandevenne

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


// Constructor
function Faction() {
  this.name = 'none';
  this.codename = 'none';
  this.color = I; // The board color of this faction

  this.index = -1; //index in the enum, auto-assigned by registerFaction
};

//gives starting resources, VP, cults, and max shipping/max digging
Faction.prototype.setStartSituation = function(player) {
  // This is implementation has the default shared by most factions. Override to make faction specific.
  player.c = 15;
  player.w = 3;
  player.p = 0;
  player.pp = 7;

  player.pw0 = 5;
  player.pw1 = 7;
  player.pw2 = 0;

  player.vp = 20;

  player.cult = [0,0,0,0];

  player.maxshipping = 3;
  player.maxdigging = 2;
};

Faction.getDefaultDwellingIncome_ = function(income, d) {
  sumIncome(income, [0, 1 + Math.min(d,7), 0, 0, 0]);
};

Faction.getTradingPostIncome_ = function(income, tp, coinarray, powerarray) {
  var c = 0;
  var pw = 0;
  for(var i = 0; i < tp; i++) {
    c += coinarray[i];
    pw += powerarray[i];
  }
  sumIncome(income, [c, 0, 0, pw, 0]);
};

// get building income given the amount of buildings built
Faction.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  // This is implementation has the default shared by most factions. Override to make faction specific.

  var income = [0,0,0,0,0];
  Faction.getDefaultDwellingIncome_(income, d);
  Faction.getTradingPostIncome_(income, tp, [2, 2, 2, 2], [1, 1, 2, 2]);
  sumIncome(income, [0, 0, te, 0, 0]);
  sumIncome(income, [0, 0, 0, sh * 2, 0]);
  sumIncome(income, [0, 0, sa, 0, 0]);
  return income;
};

Faction.prototype.getBuildingCost = function(building, neighbor /*for TP*/) {
  // This is implementation has the default shared by most factions. Override to make faction specific.
  if(building == B_D) return [2,1,0,0,0];
  if(building == B_TP) return [neighbor ? 3 : 6,2 ,0,0,0];
  if(building == B_TE) return [5,2,0,0,0];
  if(building == B_SH) return [6,4,0,0,0];
  if(building == B_SA) return [6,4,0,0,0];
  throw new Error('unknown building');
};

// only for regular transform actions of the faction, not one-time octogon actions like A_SANDSTORM
// does not take into account if the action is legal or not, and will return free cost for action types unknown to this faction
// resource order: c,w,p,pw,vp,pp, keys,spades,pt,ct
Faction.prototype.getTransformActionCost = function(player, actiontype, fromcolor) {
  if(actiontype == A_TRANSFORM_CCW || actiontype == A_TRANSFORM_CW || actiontype == A_TRANSFORM_SPECIAL) return [0,0,0,0,0,0, 0,1,0,0];
  if(actiontype == A_GIANTS_TRANSFORM) return [0,0,0,0,0,0, 0,2,0,0];
  return [0,0,0,0,0,0, 0,0,0,0];
};

// For several other actions (TODO: eventually get almost all actions here except those whose cost depends on something else than action type and player object)
Faction.prototype.getActionCost = function(player, actiontype) {
  if(actiontype == A_ADV_SHIP) return [4,0,1,0,0];
  if(actiontype == A_ADV_DIG) return [5,2,1,0,0];
  if(actiontype == A_POWER_BRIDGE) return [0,0,0,3,0];
  if(actiontype == A_POWER_1P) return [0,0,0,3,0];
  if(actiontype == A_POWER_2W) return [0,0,0,4,0];
  if(actiontype == A_POWER_7C) return [0,0,0,4,0];
  if(actiontype == A_POWER_SPADE) return [0,0,0,4,0];
  if(actiontype == A_POWER_2SPADE) return [0,0,0,6,0];
  if(actiontype == A_SPADE) return [0,3-player.digging,0,0,0];
  throw 'not implemented for this action'; //TODO
};

// resource order: c,w,p,pw,vp,pp, keys,spades,pt,cult,freecult, pt0,pt1,pt2, darklingconverts,spadevp, fire,water,earth,air
Faction.prototype.getActionIncome = function(player, actiontype) {
  if(actiontype == A_SPADE || actiontype == A_POWER_SPADE || actiontype == A_BONUS_SPADE) return [0,0,0,0,0,0, 0,1,0,0,0, 0,0,0];
  if(actiontype == A_POWER_2SPADE || actiontype == A_GIANTS_2SPADE) return [0,0,0,0,0,0, 0,2,0,0,0, 0,0,0];
  if(actiontype == A_CULT_PRIEST1) return [0,0,0,0,0,0, 0,0,0,1,0, 0,0,0];
  if(actiontype == A_CULT_PRIEST2) return [0,0,0,0,0,0, 0,0,0,2,0, 0,0,0];
  if(actiontype == A_CULT_PRIEST3) return [0,0,0,0,0,0, 0,0,0,3,0, 0,0,0];
  if(actiontype == A_BONUS_CULT) return [0,0,0,0,0,0, 0,0,0,1, 0,0,0];
  if(actiontype == A_FAVOR_CULT) return [0,0,0,0,0,0, 0,0,0,1, 0,0,0];
  if(actiontype == A_AUREN_CULT) return [0,0,0,0,0,0, 0,0,0,2, 0,0,0];
  return [0,0,0,0,0,0, 0,0,0,0,0, 0,0,0]; //not implemented, TODO
};

//returns the power value of a building
//given building may not be B_NONE or undefined.
Faction.prototype.getBuildingPower = function(building) {
  if(building == B_MERMAIDS) return 0;
  if(building == B_D) return 1;
  if(building == B_TP || building == B_TE) return 2;
  return 3;
};

Faction.prototype.hasInitialFavorTile = function() {
  return false;
};

// VP when passing gotten from faction abilities
Faction.prototype.getPassVP = function() {
  return 0;
};

// Returns whether the octogon is free for this faction (does not return any information about whether the action itself is valid, only about the octogon state).
//TODO: currently this doesn't distinguish between player or game octogons. Fix that!!
Faction.prototype.canTakeOctogonAction = function(player, action, octogons) {
  return !octogons[action];
};

//TODO: currently this doesn't distinguish between player or game octogons. Fix that!!
function canTakeOctogonAction(player, action) {
  return player.getFaction().canTakeOctogonAction(player, action, game.octogons);
}

// Returns whether the faction can take this action, and if it's SH dependent, checks for that too
// action is the action type enum value
Faction.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(isFactionAction(action)) {
    if(opt_reason) opt_reason.push('Player faction cannot take action ' + getActionCodeName(action));
    return false;
  }
  return true;
};

// Whether this faction can take this action. May depend on player state such as built SH etc...
// opt_reason is an array in which a string with the reason why can be pushed
// Currently checks for:
// -faction can take the action
// -sh built if required
// -octogon for action taken or not
// Currently does NOT check for anything else than that, so does NOT check for resources, reachability, ...
// Should NOT be overridden, override canTakeOctogonAction and canTakeFactionAction instead.
Faction.prototype.canTakeAction = function(player, action, game, opt_reason) {
  if(!this.canTakeFactionAction(player, action, opt_reason)) return false;

  var result = this.canTakeOctogonAction(player, action, game.octogons);
  if(!result && opt_reason) opt_reason.push('action already taken: ' + getActionCodeName(action));
  return result;
};

// Get one-time resources for building SH, if any (e.g. 12 power tokens for Alchemists, 1 shipping for mermaids,
// tunnelcarpetdistance for fakirs, darkling priest conversions, halflings spades, ...)
// Applies it to the player object.
// NOTE: Some other one time stronghold income may come from Faction.prototype.getActionIncome with A_UPGRADE_SH instead!!
//       However, this can have effects on the player object that simple resource income rules currently can't describe, e.g. named VPs, ...
// TODO: merge this fully with Faction.prototype.getActionIncome.
Faction.prototype.getOneTimeStrongholdIncome = function(player) {
  // By default it's nothing
};

// Gets the income you get when someone leeched or didn't leech from you.
// For the cultists, this is 1pw if nobody leeched. The special cult track income, however, should NOT be handled by this function, state.js does that (TODO: refactor that).
// Applies it to the player object.
Faction.prototype.getGaveLeechIncome = function(player, leeched) {
  // By default it's nothing
};

////////////////////////////////////////////////////////////////////////////////


var ChaosMagicians = function() {
  this.name = 'Chaos Magicians';
  this.codename = 'chaosmag';
  this.color = R;
};
inherit(ChaosMagicians, Faction);

ChaosMagicians.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.w = 4;
  player.cult = [2,0,0,0];
};

ChaosMagicians.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];
  Faction.getDefaultDwellingIncome_(income, d);
  Faction.getTradingPostIncome_(income, tp, [2, 2, 2, 2], [1, 1, 2, 2]);
  sumIncome(income, [0, 0, te, 0, 0]);
  sumIncome(income, [0, sh * 2, 0, 0, 0]);
  sumIncome(income, [0, 0, sa, 0, 0]);
  return income;
};

ChaosMagicians.prototype.getBuildingCost = function(building, neighbor) {
  if(building == B_SH) return [4,4,0,0,0];
  if(building == B_SA) return [8,4,0,0,0];
  return Faction.prototype.getBuildingCost(building, neighbor);
};

ChaosMagicians.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_DOUBLE) {
    if(built_sh(player)) return true;
    if(opt_reason) opt_reason.push('Must built stronghold for action ' + getActionCodeName(action));
    return false;
  }
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};

////////////////////////////////////////////////////////////////////////////////


var Giants = function() {
  this.name = 'Giants';
  this.codename = 'giants';
  this.color = R;
};
inherit(Giants, Faction);

Giants.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.cult = [1,0,0,1];
};

Giants.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];
  Faction.getDefaultDwellingIncome_(income, d);
  Faction.getTradingPostIncome_(income, tp, [2, 2, 2, 2], [1, 1, 2, 2]);
  sumIncome(income, [0, 0, te, 0, 0]);
  sumIncome(income, [0, 0, 0, sh * 4, 0]);
  sumIncome(income, [0, 0, sa, 0, 0]);
  return income;
};

Giants.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_GIANTS_2SPADE) {
    if(built_sh(player)) return true;
    if(opt_reason) opt_reason.push('Must build stronghold for action ' + getActionCodeName(action));
    return false;
  }
  if(action == A_GIANTS_TRANSFORM) return true;
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};

////////////////////////////////////////////////////////////////////////////////


var Fakirs = function() {
  this.name = 'Fakirs';
  this.codename = 'fakirs';
  this.color = Y;
};
inherit(Fakirs, Faction);

Fakirs.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.pw0 = 7;
  player.pw1 = 5;
  player.cult = [1,0,0,1];
  player.maxdigging = 1;
  player.maxshipping = 0;
  player.tunnelcarpetdistance = 1;
  player.maxtunnelcarpetdistance = 4;
};

Fakirs.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];
  Faction.getDefaultDwellingIncome_(income, d);
  Faction.getTradingPostIncome_(income, tp, [2, 2, 2, 2], [1, 1, 2, 2]);
  sumIncome(income, [0, 0, te, 0, 0]);
  sumIncome(income, [0, 0, sh, 0, 0]);
  sumIncome(income, [0, 0, sa, 0, 0]);
  return income;
};

Fakirs.prototype.getBuildingCost = function(building, neighbor) {
  if(building == B_SH) return [10,4,0,0,0];
  return Faction.prototype.getBuildingCost(building, neighbor);
};

Fakirs.prototype.getOneTimeStrongholdIncome = function(player) {
  player.tunnelcarpetdistance++;
};

Fakirs.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_CARPET) return true;
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};

////////////////////////////////////////////////////////////////////////////////


var Nomads = function() {
  this.name = 'Nomads';
  this.codename = 'nomads';
  this.color = Y;
};
inherit(Nomads, Faction);

Nomads.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.w = 2;
  player.cult = [1,0,1,0];
};

Nomads.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];
  Faction.getDefaultDwellingIncome_(income, d);
  Faction.getTradingPostIncome_(income, tp, [2, 2, 3, 4], [1, 1, 1, 1]);
  sumIncome(income, [0, 0, te, 0, 0]);
  sumIncome(income, [0, 0, 0, sh * 2, 0]);
  sumIncome(income, [0, 0, sa, 0, 0]);
  return income;
};

Nomads.prototype.getBuildingCost = function(building, neighbor) {
  if(building == B_SH) return [8,4,0,0,0];
  return Faction.prototype.getBuildingCost(building, neighbor);
};

Nomads.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_SANDSTORM) {
    if(built_sh(player)) return true;
    if(opt_reason) opt_reason.push('Must built stronghold for action ' + getActionCodeName(action));
    return false;
  }
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};

////////////////////////////////////////////////////////////////////////////////


var Halflings = function() {
  this.name = 'Halflings';
  this.codename = 'halflings';
  this.color = U;
};
inherit(Halflings, Faction);

Halflings.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.pw0 = 3;
  player.pw1 = 9;
  player.cult = [0,0,1,1];
};

Halflings.prototype.getBuildingCost = function(building, neighbor) {
  if(building == B_SH) return [8,4,0,0,0];
  return Faction.prototype.getBuildingCost(building, neighbor);
};

Halflings.prototype.getActionCost = function(player, action) {
  if(action == A_ADV_DIG) return [1,2,1,0,0];
  return Faction.prototype.getActionCost(player, action);
};

Halflings.prototype.getOneTimeStrongholdIncome = function(player) {
  player.spades = 3;
  player.overflowspades = true;
  player.mayaddmorespades = false;
  player.nodigreachco = null;
  player.transformco = null;
};


////////////////////////////////////////////////////////////////////////////////


var Cultists = function() {
  this.name = 'Cultists';
  this.codename = 'cultists';
  this.color = U;
};
inherit(Cultists, Faction);

Cultists.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.cult = [1,0,1,0];
};

Cultists.prototype.getBuildingCost = function(building, neighbor) {
  if(building == B_SH) return [8,4,0,0,0];
  if(building == B_SA) return [8,4,0,0,0];
  return Faction.prototype.getBuildingCost(building, neighbor);
};

Cultists.prototype.getOneTimeStrongholdIncome = function(player) {
  player.addVP(7, 'faction', 'faction');
};

Cultists.prototype.getGaveLeechIncome = function(player, leeched) {
  if(leeched) return; //state.js currently handles the cult track increase instead
  if(state.newcultistsrule) {
    addPower(player, 1);
  }
};

////////////////////////////////////////////////////////////////////////////////


var Alchemists = function() {
  this.name = 'Alchemists';
  this.codename = 'alchemists';
  this.color = K;
};
inherit(Alchemists, Faction);

Alchemists.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.cult = [1,1,0,0];
};

Alchemists.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];
  Faction.getDefaultDwellingIncome_(income, d);
  Faction.getTradingPostIncome_(income, tp, [2, 2, 3, 4], [1, 1, 1, 1]);
  sumIncome(income, [0, 0, te, 0, 0]);
  sumIncome(income, [sh * 6, 0, 0, 0, 0]);
  sumIncome(income, [0, 0, sa, 0, 0]);
  return income;
};

Alchemists.prototype.getOneTimeStrongholdIncome = function(player) {
  addPower(player, 12);
};

Alchemists.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_CONVERT_1VP_1C) return true;
  if(action == A_CONVERT_2C_1VP) return true;
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};

////////////////////////////////////////////////////////////////////////////////


var Darklings = function() {
  this.name = 'Darklings';
  this.codename = 'darklings';
  this.color = K;
};
inherit(Darklings, Faction);

Darklings.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.w = 1;
  player.p = 1;
  player.cult = [0,1,1,0];
  player.maxdigging = 0;
};

Darklings.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];
  Faction.getDefaultDwellingIncome_(income, d);
  Faction.getTradingPostIncome_(income, tp, [2, 2, 2, 2], [1, 1, 2, 2]);
  sumIncome(income, [0, 0, te, 0, 0]);
  sumIncome(income, [0, 0, 0, sh * 2, 0]);
  sumIncome(income, [0, 0, sa * 2, 0, 0]);
  return income;
};

Darklings.prototype.getBuildingCost = function(building, neighbor) {
  if(building == B_SA) return [10,4,0,0,0];
  return Faction.prototype.getBuildingCost(building, neighbor);
};

Darklings.prototype.getActionCost = function(player, action) {
  if(action == A_SPADE) return [0,0,1,0,0];
  return Faction.prototype.getActionCost(player, action);
};

Darklings.prototype.getOneTimeStrongholdIncome = function(player) {
  player.darklingconverts = 3;
};

Darklings.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_CONVERT_1W_1P) {
    if(player.darklingconverts > 0) return true; // TODO: this must eventually ge a resource requirement with getActionCost using R_DARKLINGCONVERTS
    if(opt_reason) opt_reason.push('can only convert up to 3W to 3P during darklings SH upgrade');
    return false;
  }
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};

////////////////////////////////////////////////////////////////////////////////


var Mermaids = function() {
  this.name = 'Mermaids';
  this.codename = 'mermaids';
  this.color = B;
};
inherit(Mermaids, Faction);

Mermaids.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.pw0 = 3;
  player.pw1 = 9;
  player.cult = [0,2,0,0];
  player.maxshipping = 5;
  player.shipping = 1;
};

Mermaids.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];
  Faction.getDefaultDwellingIncome_(income, d);
  Faction.getTradingPostIncome_(income, tp, [2, 2, 2, 2], [1, 1, 2, 2]);
  sumIncome(income, [0, 0, te, 0, 0]);
  sumIncome(income, [0, 0, 0, sh * 4, 0]);
  sumIncome(income, [0, 0, sa, 0, 0]);
  return income;
};

Mermaids.prototype.getBuildingCost = function(building, neighbor) {
  if(building == B_SA) return [8,4,0,0,0];
  return Faction.prototype.getBuildingCost(building, neighbor);
};

Mermaids.prototype.getOneTimeStrongholdIncome = function(player) {
  advanceShipping(player);
};

Mermaids.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_CONNECT_WATER_TOWN) return true;
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};

////////////////////////////////////////////////////////////////////////////////


var Swarmlings = function() {
  this.name = 'Swarmlings';
  this.codename = 'swarmlings';
  this.color = B;
};
inherit(Swarmlings, Faction);

Swarmlings.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.c = 20;
  player.w = 8;
  player.pw0 = 3;
  player.pw1 = 9;
  player.cult = [1,1,1,1];
};

Swarmlings.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];
  sumIncome(income, [0, 2 + Math.min(d, 7), 0, 0, 0]);
  Faction.getTradingPostIncome_(income, tp, [2, 2, 2, 3], [2, 2, 2, 2]);
  sumIncome(income, [0, 0, te, 0, 0]);
  sumIncome(income, [0, 0, 0, sh * 4, 0]);
  sumIncome(income, [0, 0, sa * 2, 0, 0]);
  return income;
};

Swarmlings.prototype.getBuildingCost = function(building, neighbor) {
  if(building == B_D) return [3,2,0,0,0];
  if(building == B_TP) return [neighbor ? 4 : 8,3,0,0,0];
  if(building == B_TE) return [6,3,0,0,0];
  if(building == B_SH) return [8,5,0,0,0];
  if(building == B_SA) return [8,5,0,0,0];
  return Faction.prototype.getBuildingCost(building, neighbor);
};

Swarmlings.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_SWARMLINGS_TP) {
    if(built_sh(player)) return true;
    if(opt_reason) opt_reason.push('Must built stronghold for action ' + getActionCodeName(action));
    return false;
  }
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};

////////////////////////////////////////////////////////////////////////////////


var Auren = function() {
  this.name = 'Auren';
  this.codename = 'auren';
  this.color = G;
};
inherit(Auren, Faction);

Auren.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.cult = [0,1,0,1];
};

Auren.prototype.getBuildingCost = function(building, neighbor) {
  if(building == B_SA) return [8,4,0,0,0];
  return Faction.prototype.getBuildingCost(building, neighbor);
};

Auren.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_AUREN_CULT) {
    if(built_sh(player)) return true;
    if(opt_reason) opt_reason.push('Must built stronghold for action ' + getActionCodeName(action));
    return false;
  }
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};

////////////////////////////////////////////////////////////////////////////////


var Witches = function() {
  this.name = 'Witches';
  this.codename = 'witches';
  this.color = G;
};
inherit(Witches, Faction);

Witches.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.cult = [0,0,0,2];
};

Witches.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_WITCHES_D) {
    if(built_sh(player)) return true;
    if(opt_reason) opt_reason.push('Must built stronghold for action ' + getActionCodeName(action));
    return false;
  }
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};

////////////////////////////////////////////////////////////////////////////////


var Engineers = function() {
  this.name = 'Engineers';
  this.codename = 'engineers';
  this.color = S;
};
inherit(Engineers, Faction);

Engineers.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.c = 10;
  player.w = 2;
  player.pw0 = 3;
  player.pw1 = 9;
  player.cult = [0,0,0,0];
};

Engineers.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];

  var w = d;
  if(w > 5) w--;
  if(w > 2) w--;
  sumIncome(income, [0, w, 0, 0, 0]);

  Faction.getTradingPostIncome_(income, tp, [2, 2, 2, 2], [1, 1, 2, 2]);

  var p = te;
  var pw = 0;
  if(te >= 2) {
    p--;
    pw += 5;
  }
  sumIncome(income, [0, 0, p, pw, 0]);

  sumIncome(income, [0, 0, 0, sh * 2, 0]);
  sumIncome(income, [0, 0, sa, 0, 0]);
  return income;
};

Engineers.prototype.getBuildingCost = function(building, neighbor) {
  if(building == B_D) return [1,1,0,0,0];
  if(building == B_TP) return [neighbor ? 2 : 4,1,0,0,0];
  if(building == B_TE) return [4,1,0,0,0];
  if(building == B_SH) return [6,3,0,0,0];
  if(building == B_SA) return [6,3,0,0,0];
  return Faction.prototype.getBuildingCost(building, neighbor);
};

Engineers.prototype.getPassVP = function(player) {
  if(player.b_sh != 0) return 0;

  var result = 0;

  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
  {
    var bridges = game.bridges[arCo(x, y)];

    if(bridges[0] == player.woodcolor) {
      var co = bridgeCo(x, y, D_N, game.btoggle);
      if(outOfBounds(co[0], co[1])) continue;
      if(isOccupiedBy(x, y, player.woodcolor) && isOccupiedBy(co[0], co[1], player.woodcolor)) result += 3;
    }
    if(bridges[1] == player.woodcolor) {
      var co = bridgeCo(x, y, D_NE, game.btoggle);
      if(outOfBounds(co[0], co[1])) continue;
      if(isOccupiedBy(x, y, player.woodcolor) && isOccupiedBy(co[0], co[1], player.woodcolor)) result += 3;
    }
    if(bridges[2] == player.woodcolor) {
      var co = bridgeCo(x, y, D_SE, game.btoggle);
      if(outOfBounds(co[0], co[1])) continue;
      if(isOccupiedBy(x, y, player.woodcolor) && isOccupiedBy(co[0], co[1], player.woodcolor)) result += 3;
    }
  }

  return result;
};

Engineers.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_ENGINEERS_BRIDGE) return true;
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};

////////////////////////////////////////////////////////////////////////////////


var Dwarves = function() {
  this.name = 'Dwarves';
  this.codename = 'dwarves';
  this.color = S;
};
inherit(Dwarves, Faction);

Dwarves.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.cult = [0,0,2,0];
  player.maxshipping = 0;
  player.tunnelcarpetdistance = 1;
  player.maxtunnelcarpetdistance = 1;
};

Dwarves.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];
  Faction.getDefaultDwellingIncome_(income, d);
  Faction.getTradingPostIncome_(income, tp, [3, 2, 2, 3], [1, 1, 2, 2]);
  sumIncome(income, [0, 0, te, 0, 0]);
  sumIncome(income, [0, 0, 0, sh * 2, 0]);
  sumIncome(income, [0, 0, sa, 0, 0]);
  return income;
};

Dwarves.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_TUNNEL) return true;
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};

////////////////////////////////////////////////////////////////////////////////


var codeNameToFaction_ = {};
var colorToFaction_ = {}; //maps color to array of all factions registered with that color
var factions = [];

function registerFaction(faction) {
  faction.index = factions.length;
  factions.push(faction);
  codeNameToFaction_[faction.codename] = faction;
  if(!colorToFaction_[faction.color]) colorToFaction_[faction.color] = [];
  colorToFaction_[faction.color].push(faction);
}

var dummyfaction = new Faction();

var F_NONE = -1;

var F_CHAOS = factions.length;
registerFaction(new ChaosMagicians());

var F_GIANTS = factions.length;
registerFaction(new Giants());

var F_FAKIRS = factions.length;
registerFaction(new Fakirs());

var F_NOMADS = factions.length;
registerFaction(new Nomads());

var F_HALFLINGS = factions.length;
registerFaction(new Halflings());

var F_CULTISTS = factions.length;
registerFaction(new Cultists());

var F_ALCHEMISTS = factions.length;
registerFaction(new Alchemists());

var F_DARKLINGS = factions.length;
registerFaction(new Darklings());

var F_MERMAIDS = factions.length;
registerFaction(new Mermaids());

var F_SWARMLINGS = factions.length;
registerFaction(new Swarmlings());

var F_AUREN = factions.length;
registerFaction(new Auren());

var F_WITCHES = factions.length;
registerFaction(new Witches());

var F_ENGINEERS = factions.length;
registerFaction(new Engineers());

var F_DWARVES = factions.length;
registerFaction(new Dwarves());


function getFactionCodeName(faction) {
  return faction ? faction.codename : null;
}

function codeNameToFaction(name) {
  return codeNameToFaction_[name];
}

function getFactionName(faction) {
  return faction ? faction.name : null;
}


//returns the landscape color of the given faction
function factionColor(faction) {
  return faction ? faction.color : I;
}

//returns the two factions for the given landscape color
function colorFactions(color) {
  if(!colorToFaction_[color]) return [];
  return colorToFaction_[color];
}

function ensureFactionClass(faction) {
  return faction.index == undefined ? factions[faction] : faction;
}

function ensureFactionIndex(faction) {
  return faction.index == undefined ? faction : faction.index;
}
