/* fireice9.js
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

// Fire & Ice Expansion

/*
The new actions:
A_TRANSFORM_SPECIAL: transform for ice factions
A_TRANSFORM_SPECIAL2: transform for fire factions
A_SHIFT: shapeshift with 3 or 5 pw cost
A_SHIFT2: shapeshift with burn 3 or 5 any tokens cost
*/


//Frostfeen
var IceMaidens = function() {
  this.name = 'Ice Maidens';
  this.codename = 'icemaidens';
  this.color = W;
};
inherit(IceMaidens, Faction);

IceMaidens.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.cult = [0,1,0,1];
  player.pw0 = 6;
  player.pw1 = 6;
  player.pw2 = 0;
};

IceMaidens.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];
  sumIncome(income, [0, 1 + d, 0, 0, 0]);
  Faction.getTradingPostIncome_(income, tp, [2, 2, 2, 2], [1, 1, 2, 2]);
  sumIncome(income, [0, 0, te, 0, 0]);
  sumIncome(income, [0, 0, 0, sh * 4, 0]);
  sumIncome(income, [0, 0, sa, 0, 0]);
  return income;
};

IceMaidens.prototype.getActionCost = function(player, action) {
  if(action == A_ADV_DIG) return [5,1,1,0,0];
  return Faction.prototype.getActionCost(player, action);
};

IceMaidens.prototype.hasInitialFavorTile = function() {
  return true;
};

IceMaidens.prototype.getPassVP = function(player) {
  if(player.b_sh != 0) return 0;
  return built_te(player) * 3;
};

IceMaidens.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_TRANSFORM_SPECIAL) return true;
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};
var F_ICEMAIDENS = factions.length;
registerFaction(new IceMaidens());

////////////////////////////////////////////////////////////////////////////////

var Yetis = function() {
  this.name = 'Yetis';
  this.codename = 'yetis';
  this.color = W;
};
inherit(Yetis, Faction);

Yetis.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.cult = [0,0,1,1];
  player.pw0 = 0;
  player.pw1 = 12;
  player.pw2 = 0;
};

Yetis.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];
  sumIncome(income, [0, 1 + d, 0, 0, 0]);
  Faction.getTradingPostIncome_(income, tp, [2, 2, 2, 2], [2, 2, 2, 2]);
  sumIncome(income, [0, 0, te, 0, 0]);
  sumIncome(income, [0, 0, 0, sh * 4, 0]);
  sumIncome(income, [0, 0, sa, 0, 0]);
  return income;
};

Yetis.prototype.getActionCost = function(player, action) {
  if(action == A_ADV_DIG) return [5,1,1,0,0];
  // power actions are 1 cheaper
  if(action == A_POWER_BRIDGE) return [0,0,0,2,0];
  if(action == A_POWER_1P) return [0,0,0,2,0];
  if(action == A_POWER_2W) return [0,0,0,3,0];
  if(action == A_POWER_7C) return [0,0,0,3,0];
  if(action == A_POWER_SPADE) return [0,0,0,3,0];
  if(action == A_POWER_2SPADE) return [0,0,0,5,0];
  return Faction.prototype.getActionCost(player, action);
};

//Yetis SH and SA is worth 4 power for clusters
Yetis.prototype.getBuildingPower = function(building) {
  if(building == B_SH || building == B_SA) return 4;
  return Faction.prototype.getBuildingPower(building);
};

Yetis.prototype.canTakeOctogonAction = function(player, action, octogons) {
  if(isPowerOctogonAction(action) && built_sh(player)) return true;
  return !octogons[action];
};

Yetis.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_TRANSFORM_SPECIAL) return true;
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};
var F_YETIS = factions.length;
registerFaction(new Yetis());

////////////////////////////////////////////////////////////////////////////////

// Returns whether no other player currently has that color. Not related to lava per se, but lava factions are the ones that need this, their actions are more expensive to other-player-color-terrain.
var colorIsCheapForLava = function(fromColor) {
  if(colorToPlayerMap[X] && colorToPlayerMap[X].auxcolor == fromColor) return false; //shapeshifters have that color currently
  return colorToPlayerMap[fromColor] == undefined; //false if any faction (except ice factions, or riverwalkers) has this color.
};

////////////////////////////////////////////////////////////////////////////////

// Geweihte
var Acolytes = function() {
  this.name = 'Acolytes';
  this.codename = 'acolytes';
  this.color = O;
};
inherit(Acolytes, Faction);

Acolytes.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.cult = [3,3,3,3];
  player.w = 3;
  player.pw0 = 6;
  player.pw1 = 6;
  player.pw2 = 0;
  player.maxdigging = -1;
};

Acolytes.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];

  //no worker for 0 dwellings, none for 4th dwelling, and none for 8th.
  var w = d ;
  if(w > 7) w--;
  if(w > 3) w--;
  sumIncome(income, [0, w, 0, 0, 0]);

  Faction.getTradingPostIncome_(income, tp, [2, 2, 2, 2], [1, 1, 2, 2]);
  sumIncome(income, [0, 0, te, 0, 0]);
  sumIncome(income, [0, 0, 0, sh * 2, 0]);
  sumIncome(income, [0, 0, sa, 0, 0]);
  return income;
};

Acolytes.prototype.getBuildingCost = function(building, neighbor) {
  if(building == B_D) return [2,1,0,0,0];
  if(building == B_TP) return [neighbor ? 3 : 6,2 ,0,0,0];
  if(building == B_TE) return [5,2,0,0,0];
  if(building == B_SH) return [8,4,0,0,0];
  if(building == B_SA) return [8,4,0,0,0];
  throw new Error('unknown building');
};

// sandstorm action is re-used for now to represent the lava transform
Acolytes.prototype.getTransformActionCost = function(player, actiontype, fromcolor) {
  if(actiontype == A_TRANSFORM_SPECIAL2) {
    var cheap = colorIsCheapForLava(fromcolor);
    return [0,0,0,0,0,0, 0,0,0,cheap?3:4];
  }
  return Faction.prototype.getTransformActionCost(player, actiontype, fromcolor);
};

// resource order: c,w,p,pw,vp,pp, keys,spades,pt,cult,freecult, pt0,pt1,pt2
Acolytes.prototype.getActionIncome = function(player, actiontype) {
  if(actiontype == A_SPADE || actiontype == A_POWER_SPADE || actiontype == A_BONUS_SPADE) return [0,0,0,0,0,0, 0,0,0,0,1, 0,0,0, 0,1];
  if(actiontype == A_POWER_2SPADE || actiontype == A_GIANTS_2SPADE) return [0,0,0,0,0,0, 0,0,0,0,2, 0,0,0, 0,2];
  if(actiontype == A_CULT_PRIEST1) return [0,0,0,0,0,0, 0,0,0,built_sh(player)?2:1, 0,0,0];
  if(actiontype == A_CULT_PRIEST2) return [0,0,0,0,0,0, 0,0,0,built_sh(player)?3:2, 0,0,0];
  if(actiontype == A_CULT_PRIEST3) return [0,0,0,0,0,0, 0,0,0,built_sh(player)?4:3, 0,0,0];
  return Faction.prototype.getActionIncome(player, actiontype);
};

Acolytes.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_TRANSFORM_SPECIAL2) return true;
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};
var F_ACOLYTES = factions.length;
registerFaction(new Acolytes());

////////////////////////////////////////////////////////////////////////////////

// Drachenmeisters
var Dragonlords = function() {
  this.name = 'Dragonlords';
  this.codename = 'dragonlords';
  this.color = O;
};
inherit(Dragonlords, Faction);

Dragonlords.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.cult = [2,0,0,0];
  player.w = 3;
  player.pw0 = 4;
  player.pw1 = 4;
  player.pw2 = 0;
  player.maxdigging = -1;
};

Dragonlords.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];

  //no worker for 0 dwellings, none for 4th dwelling, and none for 8th.
  var w = d ;
  if(w > 7) w--;
  if(w > 3) w--;
  sumIncome(income, [0, w, 0, 0, 0]);

  Faction.getTradingPostIncome_(income, tp, [2, 2, 2, 2], [1, 1, 2, 2]);
  sumIncome(income, [0, 0, te, 0, 0]);
  sumIncome(income, [0, 0, 0, sh * 2, 0]);
  sumIncome(income, [0, 0, sa, 0, 0]);
  return income;
};

Dragonlords.prototype.getBuildingCost = function(building, neighbor /*for TP*/) {
  if(building == B_D) return [2,1,0,0,0];
  if(building == B_TP) return [neighbor ? 3 : 6,2 ,0,0,0];
  if(building == B_TE) return [5,2,0,0,0];
  if(building == B_SH) return [8,4,0,0,0];
  if(building == B_SA) return [8,4,0,0,0];
  throw new Error('unknown building');
};

Dragonlords.prototype.getTransformActionCost = function(player, actiontype, fromcolor) {
  if(actiontype == A_TRANSFORM_SPECIAL2) {
    var cheap = colorIsCheapForLava(fromcolor);
    //c, w, p, pw, vp, spades, pt, ct
    return [0,0,0,0,0,0, 0,0,cheap?1:2, 0];
  }
  return Faction.prototype.getTransformActionCost(player, actiontype, fromcolor);
};

// resource order: c,w,p,pw,vp,pp, keys,spades,pt,cult,freecult, pt0,pt1,pt2
Dragonlords.prototype.getActionIncome = function(player, actiontype) {
  if(actiontype == A_SPADE || actiontype == A_POWER_SPADE || actiontype == A_BONUS_SPADE) return [0,0,0,0,0,0, 0,0,0,0,0, 1,0,0, 0,1];
  if(actiontype == A_POWER_2SPADE || actiontype == A_GIANTS_2SPADE) return [0,0,0,0,0,0, 0,0,0,0,0, 2,0,0, 0,2];
  return Faction.prototype.getActionIncome(player, actiontype);
};

Dragonlords.prototype.getOneTimeStrongholdIncome = function(player) {
  player.pw0 += game.players.length;
};

Dragonlords.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_TRANSFORM_SPECIAL2) return true;
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};
var F_DRAGONLORDS = factions.length;
registerFaction(new Dragonlords());

////////////////////////////////////////////////////////////////////////////////

var Shapeshifters = function() {
  this.name = 'Shapeshifters';
  this.codename = 'shapeshifters';
  this.color = X;
};
inherit(Shapeshifters, Faction);

Shapeshifters.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.pw0 = 4;
  player.pw1 = 4;
  player.cult = [1,1,0,0];
  player.maxdigging = 0; // no dig upgrades!
};

Shapeshifters.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = Faction.prototype.getBuildingIncome(d, tp, te, 0 /*sh done below*/, sa);
  sumIncome(income, [0, 0, 0, sh * 4, 0]);
  return income;
};

Shapeshifters.prototype.getBuildingCost = function(building, neighbor /*for TP*/) {
  if(building == B_D) return [2,1,0,0,0];
  if(building == B_TP) return [neighbor ? 3 : 6,2 ,0,0,0];
  if(building == B_TE) return [5,2,0,0,0];
  if(building == B_SH) return [6,3,0,0,0]; // only 3 workers for SH
  if(building == B_SA) return [6,4,0,0,0];
  throw new Error('unknown building');
};

//shift = for 3 normal power, shift2 = for 3 power TOKENS
Shapeshifters.prototype.canTakeFactionAction = function(player, action, opt_reason) {
  if(action == A_SHIFT || action == A_SHIFT2) {
    if(built_sh(player)) return true;
    if(opt_reason) opt_reason.push('Must built stronghold for action ' + getActionCodeName(action));
    return false;
  }
  return Faction.prototype.canTakeFactionAction(player, action, opt_reason);
};

// resource order: c,w,p,pw,vp,pp, keys,spades,pt,cult,freecult, pt0,pt1,pt2, darklingconverts,spadevp, fire,water,earth,air, d,tp,te,sh,sa, bridge
Shapeshifters.prototype.getActionIncome = function(player, actiontype) {
  if(!state.fireiceerrata) {
    if(actiontype == A_SHIFT || actiontype == A_SHIFT2) return [0,0,0,0,2,0, 0,0,0,0, 0,0,0]; //2VP for shifting
  }
  return Faction.prototype.getActionIncome(player, actiontype);
};

Shapeshifters.prototype.getGaveLeechIncome = function(player, leeched) {
  if(leeched) {
    player.pw2++; //a whole new token in pw2!
  } else {
    addPower(player, 1);
  }
};
var F_SHAPESHIFTERS = factions.length;
registerFaction(new Shapeshifters());

////////////////////////////////////////////////////////////////////////////////

// Riverwalkers
var Riverwalkers = function() {
  this.name = 'Riverwalkers';
  this.codename = 'riverwalkers';
  this.color = Z;
};
inherit(Riverwalkers, Faction);

Riverwalkers.prototype.setStartSituation = function(player) {
  Faction.prototype.setStartSituation(player);
  player.maxshipping = 1;
  player.shipping = 1;
  player.pw0 = 10;
  player.pw1 = 2;
  player.pw2 = 0;
  player.cult = [1,0,0,1];
  player.maxdigging = -1; // can never dig
  player.pp = 1; //the other priests are not in the pool but on the locked colors
  player.landdist = 0; //can only use shipping
};

// resource order: c,w,p,pw,vp,pp, keys,spades,pt,cult,freecult, pt0,pt1,pt2, darklingconverts,spadevp, fire,water,earth,air, d,tp,te,sh,sa, bridge
Riverwalkers.prototype.getActionIncome = function(player, actiontype) {
  if(actiontype == A_UPGRADE_SH) return [0,0,0,0,0,0, 0,0,0,0,0, 0,0,0, 0,0, 0,0,0,0, 0,0,0,0,0, Math.min(player.bridgepool, 2) ]; // 2 bridges for building SH
  return Faction.prototype.getActionIncome(player, actiontype);
};

Riverwalkers.prototype.canTakeAction = function(player, action, game, opt_reason) {
  if(isSpadeGivingAction(action) || isTransformAction(action)) {
    if(opt_reason) opt_reason[0] = 'Riverwalkers cannot transform nor get spades';
    return false;
  }

  return Faction.prototype.canTakeAction(player, action, game, opt_reason);
};

Riverwalkers.prototype.getBuildingIncome = function(d, tp, te, sh, sa) {
  var income = [0,0,0,0,0];

  var w = d + 1;
  if(w > 6) w--;
  if(w > 3) w--;
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
F_RIVERWALKERS = factions.length;
registerFaction(new Riverwalkers());

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

registerWorld('Fire & Ice', 'fire_ice', initFireIceWorld);

var fireIceWorld = [ U,I,U,K,Y,I,S,G,R,B,Y,B,N,
                    R,Y,I,B,S,R,I,I,I,Y,U,K,S,
                     G,K,I,I,I,U,G,Y,I,I,I,I,N,
                    Y,S,G,Y,K,I,B,R,U,I,G,B,G,
                     I,I,U,I,I,R,K,G,S,I,U,K,N,
                    G,R,I,I,G,I,I,I,U,B,I,S,R,
                     S,I,Y,S,B,R,G,I,R,S,I,K,N,
                    K,B,I,K,U,S,B,I,Y,K,I,R,B,
                     S,G,I,R,Y,K,Y,I,B,U,I,U,N];

//The world array has the color of each hex. It is inited with the standard world map.
function initFireIceWorld(game) {
  game.bw = 13;
  game.bh = 9;
  game.btoggle = true;
  game.world = clone(fireIceWorld);
}

var fireIceAltered = [U,S,G,B,U,R,U,K,R,B,G,R,K,
                       Y,I,I,Y,K,I,I,Y,G,I,I,Y,N,
                      I,I,K,I,S,I,G,I,K,I,R,I,I,
                       G,B,Y,I,I,R,B,I,R,I,S,U,N,
                      K,U,R,B,Y,U,G,Y,I,I,G,K,R,
                       S,G,I,I,K,S,I,I,I,U,S,Y,N,
                      I,I,I,S,I,R,I,G,I,Y,K,B,U,
                       Y,B,U,I,I,I,B,K,I,S,U,R,N,
                      B,K,S,B,R,G,Y,U,S,I,B,G,S,];

// This is the fire-ice-altered version of the original game board
registerWorld('Fire & Ice Alternate Standard', 'fire_ice_altered', function(game) {
  game.bw = 13;
  game.bh = 9;
  game.btoggle = false;
  game.world = clone(fireIceAltered);
});


/*
registerWorld('Fire & Ice World', 'fire_ice', function(game) {
  game.bw = 13;
  game.bh = 9;
  game.btoggle = true;
  game.world = clone(fireIceWorld);
};
*/

/////////// Loon Lakes //////////////////////////////////////////
// https://boardgamegeek.com/thread/1603489/loon-lakes

// Loon Lakes version 1.3
/*var loonLakeWorld = [ G,S,R,G,U,B,U,R,I,I,G,B,N,
                    Y,K,B,I,I,K,Y,I,G,S,I,K,U,
                     U,I,I,G,R,S,I,K,B,R,I,Y,N,
                    B,R,S,I,Y,U,G,I,I,Y,I,R,K,
                     G,Y,I,K,B,I,I,R,I,B,S,U,N,
                    S,I,U,S,I,Y,I,S,I,U,K,G,R,
                     R,I,I,I,R,B,G,K,Y,I,I,B,N,
                    Y,B,K,I,G,S,U,I,I,S,G,I,S,
                     K,U,I,B,I,I,I,Y,R,U,Y,K,N];*/

// Loon Lakes version 1.6
var loonLakeWorld = [ S,B,R,U,Y,B,Y,R,I,I,G,B,N,
                     Y,K,G,I,I,K,U,I,G,S,I,U,K,
                      U,I,I,G,R,S,I,K,B,R,I,Y,N,
                     B,R,S,I,Y,U,G,I,I,Y,I,K,R,
                      G,Y,I,K,B,I,I,R,I,S,G,U,N,
                     S,I,U,S,I,Y,I,S,I,U,K,B,R,
                      R,I,I,I,R,G,U,K,Y,I,I,S,N,
                     Y,B,K,I,B,S,B,I,I,S,G,I,B,
                      K,U,I,G,I,I,I,G,R,U,Y,K,N];


registerWorld('Loon Lakes', 'loon_lake', function(game) {
  game.bw = 13;
  game.bh = 9;
  game.btoggle = true;
  game.world = clone(loonLakeWorld);
});


/////////// Fjords //////////////////////////////////////////
// https://boardgamegeek.com/thread/1750509/fjords-live-snellman-playtesters-appreciated

var fjordsWorld = [ G,K,I,U,Y,S,K,S,Y,R,K,B,Y,
                     B,U,I,B,G,R,I,I,I,I,I,U,N,
                    S,G,R,I,I,U,I,K,S,U,Y,I,S,
                     I,I,I,S,I,I,G,R,B,G,R,I,N,
                    R,S,Y,I,B,R,I,U,Y,S,U,I,K,
                     K,U,I,G,Y,G,I,S,B,G,I,S,N,
                    Y,B,I,K,S,K,B,I,U,K,I,G,R,
                     G,I,U,R,U,Y,R,I,I,I,R,B,N,
                    K,I,I,G,B,S,B,I,G,Y,K,U,Y];


registerWorld('Fjords', 'fjords', function(game) {
  game.bw = 13;
  game.bh = 9;
  game.btoggle = false;
  game.world = clone(fjordsWorld);
});



/*var fjordsWorldbeta = [ G,K,I,U,Y,S,K,G,Y,R,B,R,Y,
                     B,U,I,B,G,R,I,I,I,I,I,U,N,
                    S,G,R,I,I,U,I,K,S,U,Y,I,S,
                     I,I,I,S,I,I,G,R,K,B,G,I,N,
                    R,S,Y,I,B,R,I,U,Y,S,U,I,K,
                     K,U,I,G,Y,G,I,S,B,G,I,R,N,
                    Y,B,I,K,S,K,B,I,U,K,I,G,S,
                     G,I,U,R,U,Y,R,I,I,I,R,B,N,
                    K,I,I,G,B,S,B,I,S,Y,U,K,Y];


registerWorld('Fjords (old beta)', 'fjords', function(game) {
  game.bw = 13;
  game.bh = 9;
  game.btoggle = false;
  game.world = clone(fjordsWorld);
});*/

////////////////////////////////////////////////////////////////////////////////

//Note: the outposts must be connected!
function getOutpostEndScores() {
  calculateNetworkClusters();

  var outpostclusters = []; //for each cluster, its number of outposts
  for(var i = 0; i < networkclusters.length; i++) outpostclusters[i] = 0;

  function doScore(x, y) {
    var building = getBuilding(x, y);
    if(building[0] == B_NONE || building[0] == B_MERMAIDS) return;
    var clusterIndex = networkmap[arCo(x, y)];
    outpostclusters[clusterIndex]++;
  }

  for(var y = 0; y < game.bh; y++) {
    if(y == 0 || y == game.bh - 1) {
      for(var x = 0; x < game.bw; x++) doScore(x, y);
    } else {
      var i = 0;
      while(getWorld(i, y) == N) i++;
      doScore(i, y);
      var j = game.bw - 1;
      while(getWorld(j, y) == N) j--;
      if(j > i) doScore(j, y);
    }
  }

  // Now convert clusters to players
  var values = [];
  for(var i = 0; i < game.players.length; i++) values[i] = 0;

  for(var i = 0; i < networkclusters.length; i++) {
    var clusterColor = networkclusters[i].color;
    var playerIndex = woodColorToPlayerMap[clusterColor];
    if(playerIndex == undefined) continue; //dummy cluster
    values[playerIndex] = Math.max(outpostclusters[i], values[playerIndex]);
  }

  var scores = distributePoints(values, [18, 12, 6], 0); //TODO: do you really indeed get points for 0 outposts? The manual doesn't say you don't so ...

  var result = [];
  for(var j = 0; j < scores.length; j++) {
    result[j] = [scores[j], values[j]];
  }

  return result;
}

registerFinalScoring('outposts' ,'Most Outposts', getOutpostEndScores);

function getSantuaryStrongholdEndScores() {
  var values = [];

  calculateNetworkClusters();

  for(var i = 0; i < game.players.length; i++) {
    var player = game.players[i];
    if(!built_sh(player) || !built_sa(player)) {
      values[i] = 0;
      continue;
    };

    var hx, hy, ax, ay; //stronghold and sanctuary coordinates
    var hindex, aindex; //stronghold and sanctuary cluster index
    for(var y = 0; y < game.bh; y++) {
      for(var x = 0; x < game.bw; x++) {
        var building = getBuilding(x, y);
        if(woodColorToPlayerMap[building[1]] == i) {
          if(building[0] == B_SH) {
            hx = x;
            hy = y;
            hindex = networkmap[arCo(hx, hy)];
          }
          if(building[0] == B_SA) {
            ax = x;
            ay = y;
            aindex = networkmap[arCo(ax, ay)];
          }
        }
      }
    }

    if(hindex != aindex) values[i] = 0; //has SH and SA, but not connected (not network reachable, different network cluster).
    else values[i] = hexDist(hx, hy, ax, ay);
  }

  var scores = distributePoints(values, [18, 12, 6], 1); //TODO: you get zero points if you didn't build both, but the manual doesn't say if you get some if you build both but they're not connected.

  var result = [];
  for(var j = 0; j < scores.length; j++) {
    result[j] = [scores[j], values[j]];
  }

  return result;
}

registerFinalScoring('sh_sa' ,'Sanctuary-Stronghold', getSantuaryStrongholdEndScores);

function getDistanceEndScores() {
  calculateNetworkClusters();

  var values = [];
  for(var i = 0; i < game.players.length; i++) values[i] = 0;

  // given the [[x0,y0],[x1,y1],...] array of the coordinates of a cluster, find the maximum hex distance between two tiles
  var calculateClusterDistance = function(coordinates) {
    var result = 0;
    for(var i = 0; i < coordinates.length; i++) {
      for(var j = 0; j < coordinates.length; j++) {
        if(i == j) continue;
        // One could say that if the building type is B_MERMAIDS, it should be skipped. However, since it's always between two non-touching buildings, it can't increase max distance.
        result = Math.max(result, hexDist(coordinates[i][0], coordinates[i][1], coordinates[j][0], coordinates[j][1]));
      }
    }
    return result;
  }

  for(var i = 0; i < networkclusters.length; i++) {
    var clusterColor = networkclusters[i].color;
    var playerIndex = woodColorToPlayerMap[clusterColor];
    if(playerIndex == undefined) continue; //dummy cluster
    var clusterDistance = calculateClusterDistance(networkclusters[i].tiles);
    values[playerIndex] = Math.max(clusterDistance, values[playerIndex]);
  }

  var scores = distributePoints(values, [18, 12, 6], 0); //TODO: do you really indeed get points for 0 outposts? The manual doesn't say you don't so ...

  var result = [];
  for(var j = 0; j < scores.length; j++) {
    result[j] = [scores[j], values[j]];
  }

  return result;
}

registerFinalScoring('distance' ,'Greatest Distance', getDistanceEndScores);

function getSettlementEndScores() {
  // The most CONNECTED settlements. Settlements are town cluster. To find them connected we need the network clusters. So both must be calculated.
  calculateNetworkClusters();
  calculateTownClusters();

  var values = [];
  for(var i = 0; i < game.players.length; i++) values[i] = 0;

  // For each network cluster, calculate the amount of town clusters in it
  for(var i = 0; i < networkclusters.length; i++) {
    var cluster = networkclusters[i];
    var playerIndex = woodColorToPlayerMap[cluster.color];
    if(playerIndex == undefined) continue; //dummy cluster
    var tiles = cluster.tiles;
    var set = []; //count unique
    for(var j = 0; j < tiles.length; j++) {
      var townindex = townmap[arCo(tiles[j][0], tiles[j][1])];//note: not necessarily a formed town
      set[townindex] = 1;
    }
    var count = 0;
    for(var j = 0; j < set.length; j++) {
      if(set[j] == 1) count++;
    }
    values[playerIndex] = Math.max(count, values[playerIndex]);
  }

  var scores = distributePoints(values, [18, 12, 6], 0); //TODO: do you really indeed get points for 0 outposts? The manual doesn't say you don't so ...

  var result = [];
  for(var j = 0; j < scores.length; j++) {
    result[j] = [scores[j], values[j]];
  }

  return result;
}

registerFinalScoring('settlements' ,'Most Settlements', getSettlementEndScores);
