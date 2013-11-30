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

//strategy.js contains helper functions for the AI, however the functions here
//are objective and contain no intelligence. For example a function to list all
//possible actions for a player, to get the objective cost in VP's of an action
//or resources, etc...

//returns reachable land tiles that aren't occupied by any player
//reachable for that player with adjecency, shipping, bridges.
//costly determines whether to also include tunneling and carpet destinatins (they cost extra resources)
function getReachableFreeTiles(player, costly) {
  var result = [];
  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    var tile = getWorld(x, y);
    if(tile == I || tile == N) continue;
    if(!isOccupied(x, y) && inReach(player, x, y, costly)) {
      result.push([x,y]);
    }
  }
  return result;
}

//for mermaids water town
function getTouchedWaterTiles(player) {
  var result = [];
  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    var tile = getWorld(x, y);
    if(tile != I) continue;
    if(hasOwnNeighborNoBridge(x, y, player.color)) {
      result.push([x,y]);
    }
  }
  return result;
}

//this is for witches' ride
function getFreeTilesOfSameColor(color) {
  var result = [];
  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    if(getWorld(x, y) == color && !isOccupied(x, y)) result.push([x,y]);
  }
  return result;
}

//returns tiles occupied by this player as array [[x,y],[x,y],...]
function getOccupiedTiles(player) {
  var result = [];
  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    var building = buildings[arCo(x, y)];
    if(building[0] != B_NONE && building[1] == player.color) result.push([x,y]);
  }
  return result;
}

//returns whether player can get N workers. If actions are needed for that (only non-turn taking actions), they're appended to actions
//non turn taking actions involved in this can be: convert p->w, 3pw->w, burn
//if preferp is true, prefers p->w. Otherwise, prefers 3pw->w. Will not burn more than maxburn.
function canGetNWorkers(player, n, preferp, maxburn, actions) {
  n -= player.w;
  if(n <= 0) return true;

  var by_p = player.p;

  var by_pw = Math.floor(player.pw2 / 3);

  var pw_left = player.pw2 - by_pw * 3;
  var by_burn =  Math.floor((Math.floor(Math.min(maxburns, player.pw1 / 2)) + pw_left) / 3);
  var burns = by_burn * 3 - pw_left;

  if(by_p + by_pw + by_burn < n) return false;

  for(var i = 0; i < 2; i++) {
    if((i == 0) == (preferp)) {
      var nump = Math.min(by_p, n);
      for(var j = 0; j < nump; j++) {
        n--;
        actions.push(new Action(A_CONVERT_1P_1W));
      }
    } else {
      var numpw = Math.min(by_pw, n);
      for(var j = 0; j < numpw; j++) {
        n--;
        actions.push(new Action(A_CONVERT_3PW_1W));
      }
    }
  }

  //all that's left now is burning
  while(n > 0) {
    while(pw_left < 3) {
      actions.push(new Action(A_BURN));
      pw_left++;
    }
    actions.push(new Action(A_CONVERT_3PW_1W));
    n--;
    pw_left -= 3;
  }

  return true;
}

//Integer division because JS does floating point division by default
function idiv(a, b) {
  return Math.floor(a / b);
}

//av and pr are described inside canGetResources. Other parameters match canGetResources parameters.
//returns cost
function useCheapestResourceForWorker(av, pr, actions) {
  var bestcost = 99999999;
  var best = -1;
  var p_possible = av[1][0] > 0;
  var p_cost = av[1][1];
  var pw_possible = av[2][0] + av[3][0] >= 3;
  var pure_power = Math.min(3, av[2][0]);
  var pw_cost = pure_power * av[2][1] + (3 - pure_power) * av[3][1];
  if(!p_possible && !pw_possible) throw "none possible";
  pr.w++;
  if(!pw_possible || (p_possible && p_cost < pw_cost)) {
    pr.p--;
    av[1][0]--;
    actions.push(new Action(A_CONVERT_1P_1W));
    return p_cost;
  } else {
    for(var i = 0; i < 3 - pure_power; i++) {
      actions.push(new Action(A_BURN));
      pr.pw1 -= 2;
      pr.pw2++;
      av[3][0]--;
      av[2][0]++;
    }
    pr.pw2 -= 3;
    av[2][0] -= 3;
    actions.push(new Action(A_CONVERT_3PW_1W));
    return pw_cost;
  }
}

//av and pr are described inside canGetResources. Other parameters match canGetResources parameters.
//returns cost
function useCheapestResourceForCoin(av, pr, actions) {
  var bestcost = 99999999;
  var best = -1;
  for(var j = 0; j < 5; j++) {
    if(av[j][0] <= 0) continue;
    if(av[j][1] < bestcost) {
      bestcost = av[j][1];
      best = j;
    }
  }
  if(best < 0) throw "invalid best";
  
  av[best][0]--;
  pr.c++;
  if(best == 0) {
    actions.push(new Action(A_CONVERT_1W_1C));
    pr.w--;
  }
  else if(best == 1) {
    actions.push(new Action(A_CONVERT_1P_1W));
    actions.push(new Action(A_CONVERT_1W_1C));
    pr.p--;
  }
  else if(best == 2) {
    actions.push(new Action(A_CONVERT_1PW_1C));
    pr.pw2--;
  }
  else if(best == 3) {
    actions.push(new Action(A_BURN));
    actions.push(new Action(A_CONVERT_1PW_1C));
    pr.pw1 -= 2;
  }
  else if(best == 4) {
    pr.vp--;
    actions.push(new Action(A_CONVERT_1VP_1C));
  }
  else throw "invalid resource";
  return bestcost;
}

//returns whether player can get the given resources (income array [c,w,p,pw,vp], but vp is ignored, is never output, only used as input for alchemists from player.vp).
// If actions are needed for that (only non-turn taking actions), they're appended to actions array. Non turn taking actions involved in this can be: convert p->w, 3pw->w, burn
//restrictions has form {w_cost, p_cost, pw_cost, burn_cost, max_burn} --> implicitely, VP cost is 1 and C cost is 0.33.
//Will not burn if only max_burn pw left in players bowls.
//It may already fill in temporary things in the actions output array even if it returns false, these should never be used if it returns false.
/*
To test this function in Chrome console:

function testRes(resources) {
  var restrictions = {w_cost: 0.33, p_cost: 1, pw_cost: 0.16, burn_cost: 1, max_burn: 6 };
  var actions = [];
  var can = canGetResources(player, resources, restrictions, actions);
  console.log(can);
  for(var i = 0; i < actions.length; i++) console.log(actionToString(actions[i]));
}

testRes([15, 4, 0, 0, 0]);
testRes([15, 5, 0, 0, 0]);
*/
function canGetResources(player, resources, restrictions, actions) {
  if(player.c >= resources[0] && player.w >= resources[1] && player.p >= resources[2] && player.pw2 >= resources[3]) {
    return true; //has all resources, no actions needed
  }

  /*
  The algorithm works like follows:
  Everything is virtually executed along the way.
  First, it is checked whether all required pw can be gotten. If not, fail early.
  Then, it is checked whether all required p can be gotten. If not, fail early.
  Then, the combination of c and w is done. This is because, unlike producing pw and p, producing c and w can require conflicting resources so all comibinations must be checked.
  The method with the least cost that results in creating the required resources, is chosen (e.g. if both 3pw or p can produce a w, but 3pw is cheaper, the 3pw is chosen).
  For doing the w and c part, two strategies are tried: greedy with coins, or greedy with workers. I think this will give almost always the correct result, except maybe in an odd case with alchemists and their vp->c conversion.
  */

  var pr = {}; //virtual player resources
  pr.c = player.c;
  pr.w = player.w;
  pr.p = player.p;
  pr.pw1 = player.pw1;
  var max_burn_now = (player.pw0+player.pw1+player.pw2) - restrictions.max_burn;
  if(pr.pw1 > max_burn_now * 2) pr.pw1 = max_burn_now * 2; //hide the rest so it cannot be burned
  pr.pw2 = player.pw2;
  pr.vp = player.faction == F_ALCHEMISTS ? player.vp : 0;

  //1. PW
  if(pr.pw2 < resources[3]) {
    var burn = idiv(pr.pw1, 2);
    if(pr.pw2 + burn < resources[3]) return false;

    while(pr.pw2 < resources[3]) {
      actions.push(new Action(A_BURN));
      pr.pw1 -= 2;
      pr.pw2++;
    }
  }

  //2. P
  if(pr.p < resources[2]) {
    var burn = idiv(pr.pw1, 2);
    var free_pw = pr.pw2 - resources[3];
    var maxp = idiv(free_pw + burn, 5);
    if(pr.p + maxp < resources[2]) return false;
    var pw_needed = (resources[2] - pr.p) * 5;
    var burn_needed = pw_needed - free_pw;

    for(var i = 0; i < burn_needed; i++) {
      actions.push(new Action(A_BURN));
      pr.pw1 -= 2;
      pr.pw2++;
    }

    while(pr.p < resources[2]) {
      actions.push(new Action(A_CONVERT_5PW_1P));
      pr.pw2 -= 5;
      pr.p++;
    }
  }

  // Prepare for C and W
  if(pr.c >= resources[0] && pr.w >= resources[1]) return true;
  
  //the 5 available resources [w, p, pw, burn, vp], each with [amount, cost]
  var av = [];
  av[0] = [pr.w - resources[1], restrictions.w_cost];
  if(av[0][0] < 0) av[0][0] = 0;
  av[1] = [pr.p - resources[2], restrictions.p_cost];
  av[2] = [pr.pw2 - resources[3], restrictions.pw_cost];
  av[3] = [idiv(pr.pw1, 2), restrictions.burn_cost + restrictions.pw_cost];
  av[4] = [pr.vp, 1];

  //3. Only C, no W
  if(pr.c < resources[0] && pr.w >= resources[1]) {
    var c_needed = resources[0] - pr.c;
    if(av[0][0] + av[1][0] + av[2][0] + av[3][0] + av[4][0] < c_needed) return false;

    //start with the cheapest and go to the more expensive ones from there
    for(var i = 0; i < c_needed; i++) {
      useCheapestResourceForCoin(av, pr, actions);
    }
  }

  //4. Only W, no C
  if(pr.w < resources[1] && pr.c >= resources[0]) {
    var w_needed = resources[1] - pr.w;
    if(av[1][0] + idiv(av[2][0] + av[3][0], 3) < w_needed) return false;

    //start with the cheapest and go to the more expensive ones from there
    for(var i = 0; i < w_needed; i++) {
      useCheapestResourceForWorker(av, pr, actions);
    }
  }

  //5. Both C and W needed. Try two methods: greedy for C, greedy for W. Then take the cheapest one. This is not perfect and may miss some cases.
  var avc = clone(av);
  var prc = clone(pr);
  var actionsc = [];
  var costc = 0;
  var canc = true;
  while(true) {
    if(resources[0] > prc.c) {
      if(avc[0][0] + avc[1][0] + avc[2][0] + avc[3][0] + avc[4][0] <= 0) { canc = false; break; }
      costc += useCheapestResourceForCoin(avc, prc, actionsc);
    } else if(resources[1] > prc.w) {
      if(avc[1][0] + idiv(avc[2][0] + avc[3][0], 3) <= 0) { canc = false; break; }
      costc += useCheapestResourceForWorker(avc, prc, actionsc);
    } else {
      break; //done successfully
    }
  }

  var avw = clone(av);
  var prw = clone(pr);
  var actionsw = [];
  var costw = 0;
  var canw = true;
  while(true) {
    if(resources[1] > prw.w) {
      if(avw[1][0] + idiv(avw[2][0] + avw[3][0], 3) <= 0) { canw = false; break; }
      costw += useCheapestResourceForWorker(avw, prw, actionsw);
    } else if(resources[0] > prw.c) {
      if(avw[0][0] + avw[1][0] + avw[2][0] + avw[3][0] + avw[4][0] <= 0) { canw = false; break; }
      costw += useCheapestResourceForCoin(avw, prw, actionsw);
    } else {
      break; //done successfully
    }
  }

  if(!canc && !canw) return false;

  if(!canw || (canc && costc < costw)) {
    for(var i = 0; i < actionsc.length; i++) actions.push(actionsc[i]);
  } else {
    for(var i = 0; i < actionsw.length; i++) actions.push(actionsw[i]);
  }

  return true;
}

//co is a single coordinate, this function does not support digs over multiple tiles
//resources MUST include costly cost
function addPossibleDigBuildAction(resources, player, restrictions, co, dist, dwelling, type, costly, result) {
  var actions = [];
  if(canGetResources(player, resources, restrictions, actions)) {
    if(costly) {
      var a = new Action(player.faction == F_DWARVES ? A_TUNNEL : A_CARPET);
      a.co = co;
      actions.push(a);
    }
    if(dist > 0) {
      if(type == A_SANDSTORM) {
        // No spades needed for sandstorm
        var action2 = new Action(type);
        action2.co = co;
        actions.push(action2);
      } else {
        //Spades
        actions.push(new Action(type));

        var extra = dist;
        if(type == A_SPADE || type == A_POWER_SPADE || type == A_BONUS_SPADE) extra -= 1;
        else if(type == A_POWER_2SPADE) extra -= 2;
        else extra = 0; //e.g. giants
        for(var i = 0; i < extra; i++) actions.push(new Action(A_SPADE));

        //Transforms
        var numtransforms = player.faction == F_GIANTS && dist > 0 ? 1 : dist;
        for(var i = 0; i < numtransforms; i++) {
          var action2 = new Action(transformDirAction(player, getWorld(co[0], co[1]), player.color));
          action2.co = co;
          actions.push(action2);
        }
      }
    }
    //Build
    if(dwelling) {
      var action2 = new Action(A_BUILD);
      action2.co = co;
      actions.push(action2);
    }
    result.push(actions);
  }
}

//destructively alters cost (adds the dwelling cost)
//resources MAY NOT include costly cost
function addPossibleDigBuildActions(cost, player, restrictions, co, dist, type, costly, result) {
  if(costly) sumIncome(cost, getTunnelCarpetCost(player));
  if(dist > 0) addPossibleDigBuildAction(cost, player, restrictions, co, dist, false, type, costly, result);
  if(player.b_d > 0) {
    sumIncome(cost, getBuildingCost(player.faction, B_D, false));
    addPossibleDigBuildAction(cost, player, restrictions, co, dist, true, type, costly, result);
  }
}

//the 3 extra digs and maybe dwelling for halflings stronghold. player.faction must be halflings.
function shUpgradeWithHalflings(player, restrictions, co, dwelling, result) {
  if(dwelling && player.b_d == 0) return;

  var resources = getBuildingCost(player.faction, B_SH, false);
  if(dwelling) sumIncome(resources, getBuildingCost(player.faction, B_D, false));
  
  var actions = [];
  if(canGetResources(player, resources, restrictions, actions)) {
    var action = new Action(A_UPGRADE_SH);
    action.co = co;
    actions.push(action);

    var digco = [];
    var buildco = [];
    restrictions.digFun(player, 3, dwelling ? 1 : 0, getBuildingCost(player.faction, B_D, false), digco, buildco);
    for(var i = 0; i < digco.length; i++) {
      var a = new Action(transformDirAction(player, getWorld(digco[i][0], digco[i][1]), player.color));
      a.co = digco[i];
      actions.push(a);
    }

    if(dwelling && buildco.length == 0) return; //because no dwelling present

    if(buildco.length > 0) {
      var a = new Action(A_BUILD);
      a.co = buildco[0];
      actions.push(a);
    }

    result.push(actions);
  }
}

//tests convert action sequence with resources stored in player. Returns result as resource array. Only handles convert actions, no others. Intention: determining how many workers can be turned into priests after darklings build SH.
function testConvertSequence(player, actions) {
  var testres = { c: player.c, w: player.w, p: player.p, pw: [player.pw1, player.pw2], vp: player.vp };
  for(var i = 0; i < actions.length; i++) {
    if(actions[i].type == A_CONVERT_1PW_1C) { testres.pw[1]--; testres.c++; }
    else if(actions[i].type == A_CONVERT_3PW_1W) { testres.pw[1]-=3; testres.w++; }
    else if(actions[i].type == A_CONVERT_5PW_1P) { testres.pw[1]-=5; testres.p++; }
    else if(actions[i].type == A_CONVERT_1P_1W) { testres.p--; testres.w++; }
    else if(actions[i].type == A_CONVERT_1W_1C) { testres.w--; testres.c++; }
    else if(actions[i].type == A_CONVERT_1VP_1C) { testres.vp--; testres.c++; }
    else if(actions[i].type == A_CONVERT_2C_1VP) { testres.c-=2; testres.vp++; }
    else if(actions[i].type == A_CONVERT_1W_1P) { testres.w--; testres.p++; }
  }
  return [testres.c, testres.w, testres.p, testres.pw, testres.vp];
}

function addPossibleUpgradeAction(resources, player, restrictions, co, type, result) {
  if(type == A_UPGRADE_SH && player.faction == F_HALFLINGS) {
    shUpgradeWithHalflings(player, restrictions, co, false, result);
    shUpgradeWithHalflings(player, restrictions, co, true, result);
  } else {
    var actions = [];
    if(canGetResources(player, resources, restrictions, actions)) {
      var action = new Action(type);
      action.co = co;
      actions.push(action);
      if(type == A_UPGRADE_SH && player.faction == F_DARKLINGS) {
        //take the conversions into account
        var testres = testConvertSequence(player, actions);
        //don't include converting 3pw into workers as well: the AI can extend this action sequence afterwards if it wants to do that.
        var num = Math.min(3, testres[1] - 4);
        num = Math.min(num, player.pp - testres[2]);
        for(var i = 0; i < num; i++) actions.push(new Action(A_CONVERT_1W_1P));
      }
      result.push(actions);
    }
  }
}

//simple action = only consumes resources and doesn't involve coordinates (power action resources, advance shipping/digging)
//returns the one action object that has the given type, or empty object if none
function addPossibleSimpleAction(resources, player, restrictions, type, result) {
  var actions = [];
  var a = {};
  if(canGetResources(player, resources, restrictions, actions)) {
    a = new Action(type);
    actions.push(a);
    result.push(actions);
  }
  return a;
}

//function called when an extra dig is needed, e.g. when building halflings stronghold. The output must be pushed to digco and buildco.
//this default implementation is terribly bad, just digs in the first tile encountered
//numbuild must be 0 or 1 and <= numdig
//is allowed to return less coordinates than num says (e.g. if no dig spots available, or no resources for building)
function digLocationChoiceSimple(player, numdig, numbuild, buildcost, digco, buildco) {
  var tiles = getReachableFreeTiles(player, false /*this is for extra digs, so no tunneling and carpets*/);
  for(var i = 0; i < tiles.length; i++) {
    if(player.faction == F_GIANTS && numdig == 1) break; //nothing can be done with one dig for giants.
    var color = getWorld(tiles[i][0], tiles[i][1]);
    var dist = digDist(player, color);
    while(dist > 0 && digco.length < numdig) {
      digco.push(tiles[i]);
      dist--;
    }
    if(digco.length >= numdig) break;
  }
  if(numbuild && digco.length > 0) buildco.push(digco[0]);
}

//for the restrictions parameter of getPossibleActions
var defaultRestrictions = {
  w_cost: 0.33,
  p_cost: 1,
  pw_cost: 0.16,
  burn_cost: 0.33,
  max_burn: 4,
  //function called when an extra dig is needed, e.g. when building halflings stronghold. Signature must match that of digLocationChoiceSimple
  digFun: digLocationChoiceSimple
};

// returns array of possible action sequences this player can now take, except pass actions
// so it's an array of arrays of actions
//restrictions is described at defaultRestrictions. It's values of resources, max power burn, extra consequence functions, etc...
//This will return most possible action sequences, except combinatory explosions:
// -in case of getting a favor, bonus or town tile, it is filled in with "T_DUMMY", and still needs to be filled in with a valid value by the user.
// -in case of a multiple dig action spread over multiple tiles, NOT all combinations of tiles are returned
/*
To test this function in Chrome console:

function testAct(player) {
  var actions = getPossibleActions(player, defaultRestrictions);
  for(var i = 0; i < actions.length; i++) {
    console.log(actionsToString(actions[i]));
  }
}

testAct(player);
*/
function getPossibleActions(player, restrictions) {
  var result = [];
  var tiles;

  //dig&build
  tiles = getReachableFreeTiles(player, true /*costly: also support the tunneling and carpets*/);
  for(var t = 0; t < tiles.length; t++) {
    var tile = getWorld(tiles[t][0], tiles[t][1]);
    var dist = digDist(player, tile);
    var costly = onlyReachableThroughFactionSpecial(player, tiles[t][0], tiles[t][1]);

    //Try digging in different ways
    var resources; //todo: support darklings priests, house of different price
    //TODO: check if power action is not already taken
    if(!octogons[A_POWER_2SPADE] && dist > 1) {
      var cost = getDigCost(player, Math.max(0, dist - 2));
      sumIncome(cost, [0,0,0,6,0]);
      addPossibleDigBuildActions(cost, player, restrictions, tiles[t], dist, A_POWER_2SPADE, costly, result);
    }

    if(player.faction == F_GIANTS && player.b_sh == 0 && !player.octogons[A_GIANTS_2SPADE] && dist == 2) {
      var cost = [0,0,0,0,0];
      addPossibleDigBuildActions(cost, player, restrictions, tiles[t], dist, A_GIANTS_2SPADE, costly, result);
    }

    if(player.faction == F_NOMADS && player.b_sh == 0 && !player.octogons[A_SANDSTORM] && hasOwnNeighborNoBridge(tiles[t][0], tiles[t][1], player.color)) {
      var cost = [0,0,0,0,0];
      addPossibleDigBuildActions(cost, player, restrictions, tiles[t], dist, A_SANDSTORM, costly, result);
    }

    if(!octogons[A_POWER_SPADE] && dist > 0) {
      var cost = getDigCost(player, Math.max(0, dist - 1));
      sumIncome(cost, [0,0,0,4,0]);
      addPossibleDigBuildActions(cost, player, restrictions, tiles[t], dist, A_POWER_SPADE, costly, result);
    }

    if(!player.octogons[A_BONUS_SPADE] && player.bonustile == T_BON_SPADE_2C && dist > 0) {
      var cost = getDigCost(player, Math.max(0, dist - 1));
      addPossibleDigBuildActions(cost, player, restrictions, tiles[t], dist, A_BONUS_SPADE, costly, result);
    }

    if(dist > 0) {
      var cost = getDigCost(player, dist);
      if(costly) sumIncome(cost, getTunnelCarpetCost(player));
      addPossibleDigBuildAction(cost, player, restrictions, tiles[t], dist, false, A_SPADE, costly, result);
    }
    if(player.b_d > 0) {
      var cost = getDigCost(player, dist);
      sumIncome(cost, getBuildingCost(player.faction, B_D, false));
      if(costly) sumIncome(cost, getTunnelCarpetCost(player));
      addPossibleDigBuildAction(cost, player, restrictions, tiles[t], dist, true, A_SPADE, costly, result);
    }
    //The ones without dwelling are dangerous unless the tile is out of reach of other players. But that is up to the AI to figure out.
  }

  //upgrades
  tiles = getOccupiedTiles(player);
  for(var t = 0; t < tiles.length; t++) {
    var b = getBuilding(tiles[t][0], tiles[t][1])[0];
    if(b == B_D && player.b_tp > 0) {
      var neighbor = hasNeighbor(tiles[t][0], tiles[t][1], player.color);
      addPossibleUpgradeAction(getBuildingCost(player.faction, B_TP, neighbor), player, restrictions, tiles[t], A_UPGRADE_TP, result);
      if(player.faction == F_SWARMLINGS && player.b_sh < 1 && !player.octogons[A_SWARMLINGS_TP]) addPossibleUpgradeAction([0,0,0,0,0], player, restrictions, tiles[t], A_SWARMLINGS_TP, result);
    } else if(b == B_TP) {
      if(player.b_te > 0) addPossibleUpgradeAction(getBuildingCost(player.faction, B_TE, false), player, restrictions, tiles[t], A_UPGRADE_TE, result);
      if(player.b_sh > 0) addPossibleUpgradeAction(getBuildingCost(player.faction, B_SH, false), player, restrictions, tiles[t], A_UPGRADE_SH, result);
    } else if(b == B_TE) {
      if(player.b_sa > 0) addPossibleUpgradeAction(getBuildingCost(player.faction, B_SA, false), player, restrictions, tiles[t], A_UPGRADE_SA, result);
    }
  }

  //bridge
  //TODO: the engineers version
  var bactions = [];
  if(!octogons[A_POWER_BRIDGE] && player.bridges > 0 && canGetResources(player, [0,0,0,3,0], restrictions, bactions)) {
    tiles = getOccupiedTiles(player);
    var dirs = [D_N, D_NE, D_SE, D_S, D_SW, D_NW];
    for(var t = 0; t < tiles.length; t++) {
      for (var d = 0; d < dirs.length; d++) {
        var co2 = bridgeCo(tiles[t][0], tiles[t][1], dirs[d]);
        if(outOfBounds(co2[0], co2[1])) continue;
        if(getBuilding(co2[0], co2[1])[1] == player.color && co2[1] > tiles[t][1]) continue; //avoid adding twice the same action with just swapped tiles
        if (canHaveBridge(tiles[t][0], tiles[t][1], co2[0], co2[1], player.color)) {
          var action = new Action();
          action.type = A_POWER_BRIDGE;
          action.cos.push(tiles[t]);
          action.cos.push(co2);
          var actions = clone(bactions);
          actions.push(action);
          result.push(actions);
        }
      }
    }
  }

  //resource power actions
  if(!octogons[A_POWER_1P]) addPossibleSimpleAction([0,0,0,3,0], player, restrictions, A_POWER_1P, result);
  if(!octogons[A_POWER_2W]) addPossibleSimpleAction([0,0,0,4,0], player, restrictions, A_POWER_2W, result);
  if(!octogons[A_POWER_7C]) addPossibleSimpleAction([0,0,0,4,0], player, restrictions, A_POWER_7C, result);

  //advance actions
  if(canAdvanceShip(player)) addPossibleSimpleAction(getAdvanceShipCost(player.faction), player, restrictions, A_ADV_SHIP, result);
  if(canAdvanceDig(player)) addPossibleSimpleAction(getAdvanceDigCost(player.faction), player, restrictions, A_ADV_DIG, result);

  //priests to cults
  for(var c = C_F; c <= C_A; c++) {
    if(cultp[c][0] == N) addPossibleSimpleAction([0,0,1,0,0], player, restrictions, A_CULT_PRIEST3, result).cult = c;
    if(cultp[c][3] == N) addPossibleSimpleAction([0,0,1,0,0], player, restrictions, A_CULT_PRIEST2, result).cult = c;
    addPossibleSimpleAction([0,0,1,0,0], player, restrictions, A_CULT_PRIEST1, result).cult = c;
  }

  //other cult actions
  if(player.bonustile == T_BON_CULT_4C && !player.octogons[A_BONUS_CULT]) {
    for(var c = C_F; c <= C_A; c++) addPossibleSimpleAction([0,0,0,0,0], player, restrictions, A_BONUS_CULT, result).cult = c;
  }
  if(player.favortiles[T_FAV_2W_CULT] && !player.octogons[A_FAVOR_CULT]) {
    for(var c = C_F; c <= C_A; c++) addPossibleSimpleAction([0,0,0,0,0], player, restrictions, A_FAVOR_CULT, result).cult = c;
  }
  if(player.faction == F_AUREN && player.b_sh == 0 && !player.octogons[A_AUREN_CULT]) {
    var cost = [0,0,0,0,0];
    for(var c = C_F; c <= C_A; c++) addPossibleSimpleAction([0,0,0,0,0], player, restrictions, A_AUREN_CULT, result).cult = c;
  }

  //witches
  if(player.faction == F_WITCHES && player.b_sh == 0 && player.b_d > 0 && !player.octogons[A_WITCHES_D]) {
    var tiles = getFreeTilesOfSameColor(player.color);
    for(var i = 0; i < tiles.length; i++) {
      var a = new Action(A_WITCHES_D);
      a.co = tiles[i];
      result.push([a]);
    }
  }

  // Check for favor and town tiles
  for(var i = 0; i < result.length; i++) {
    for(var j = 0; j < result[i].length; j++) {
      var num;
      num = actionGivesFavorTile(player, result[i][j]);
      for(var k = 0; k < num; k++) result[i][j].favtiles.push(T_DUMMY);
      num = actionCreatesTown(player, result[i][j], result[i]);
      for(var k = 0; k < num; k++) result[i][j].twtiles.push(T_DUMMY);
    }
  }

  //mermaids: check if a water tile might form a town
  if(player.faction == F_MERMAIDS && townTilesAvailable(1) > 0) {
    var tiles = null;
    var reqpower = getTownReqPower(player);
    for(var i = 0; i < result.length; i++) {
      if(!actionsRequireTownClusterRecalc(result[i])) continue;
      var alreadyMakesTown = false; //if true, the action already creates a town without mermaids tile, adding one now would break the rules.
      for(var j = 0; j < result[i].length; j++) alreadyMakesTown |= result[i][j].twtiles.length > 0;
      if(alreadyMakesTown) continue;
      if(!tiles) tiles = getTouchedWaterTiles(player);
      for(var j = 0; j < tiles.length; j++) {
        var tw = makesNewTownByBuilding(tiles[j][0], tiles[j][1], B_MERMAIDS, reqpower, player.color);
        if(tw.length > 0) {
          var a = new Action(A_CONNECT_WATER_TOWN);
          a.co = tiles[j];
          a.twtiles.push(T_DUMMY);
          result[i].push(a);
          break;
        }
      }
    }
  }

  return result;
}

// Returns array of favor tiles that are available in the world, not already owned by the player, and not in "alsoExclude".
function getPossibleFavorTiles(player, alsoExclude) {
  var result = [];
  for(var i = T_FAV_BEGIN + 1; i < T_FAV_END; i++) {
    if(favortiles[i] <= 0) continue;
    var has = false;
    if(player.favortiles[i]) has = true;
    for(var j = 0; j < alsoExclude.length; j++) {
      if(alsoExclude[j] == i) {
        has = true;
        break;
      }
    }
    if(has) continue;
    result.push(i);
  }
  return result;
}

// Returns array of town tiles that are available in the world, and not in "alsoExclude".
function getPossibleTownTiles(player, alsoExclude) {
  var result = [];
  for(var i = T_TW_BEGIN + 1; i < T_TW_END; i++) {
    var num = towntiles[i];
    for(var j = 0; j < alsoExclude.length; j++) {
      if(alsoExclude[j] == i) {
        num--;
      }
    }
    if(num > 0) result.push(i);
  }
  return result;
}


//returns whether the bridge is between two buildings of the same color
function isBridgeSelfConnected(x0, y0, x1, y1) {
  return getBuilding(x0, y0)[1] == getBuilding(x1, y1)[1];
}

//gives all extra coming cult round bonuses when having "to" instead of "from" cult.
//from and to are array of the values on each cult
//returned as an array [[c, w, p, pw, vp], spades]
function getAllComingCultRoundBonuses(from, to) {
  var res = [0,0,0,0,0];
  var spades = 0;
  for(var i = state.round; i < 6; i++) {
    spades += (getRoundBonusDigsForCults(to, i) - getRoundBonusDigsForCults(from, i));
    sumIncome(res, getRoundBonusResourcesForCults(to, i));
    subtractIncome(res, getRoundBonusResourcesForCults(from, i));
  }
  return [res, spades];
}

function goesTowardsNewTown(x, y, player) {
  var cluster = mostPowerfulTouchedCluster(x, y, player.color);
  if(!cluster) return false;
  if(cluster.power < 3) return false;
  if(cluster.power + 1 >= getTownReqPower(player)) return false; //also return false if it actually does form a town, because other type of scoring is used for that
  return true;
}


//Scores a series of actions (but with exactly one turn action, the others are optional and can be things like converting power to coins)
//TODO: split up in action effect/cost score, and, threatened by other player score
//returns the action score in VP's, in an objective way. During the last round this can be quite accurate, during earlier rounds the AI needs to provide some own parameters and logic.
/*
values has the following type:
{
  vp: what pure vp's are worth to you during this round
  c: coin VP value (typically: 0.33 in round 1, 0.33 in round 6)
  w: worker VP value (typically: 1 in round 1, 0.33 in round 6)
  p: priest VP value (typically: 1.66 in round 1, 0.33 in round 6)
  pw: power use VP value (income is this / 2) (typically: 0.5 or so in round 1, 0.33 in round 6) --> power income value is half that due to the bowl system
  shipping: value of having next shipping level in VP
  digging: value of having next digging level in VP
  b_d: dwelling (and owning new piece of land) VP value
  b_tp: trading post upgrade VP value
  b_te: temple upgrade VP value
  b_sh: stronghold upgrade VP value
  b_sa: santuary upgrade VP value
  t_fav: favor tile
  t_tw: town tile (and forming town). NOTE: scoreAction does NOT add the VP's or resources on the town tile itself to that (because it doesn't know which tile the AI will pick).
  burn: burn VP value (typically 0 or negative)
  bridge: bridge VP value (assuming good placement, which is the AI's responsability)
  conbridge: bridge VP value for bridge connecting two buildings of the players color (for engineers)
  forbridge: VP value for creating a potential bridge spot (that is, placing a building correctly over water) (for engineers)
  dig: dig VP value (assuming dig in good location, which is the AI's responsability)  TODO: rename this spade
  cultspade: value of future cult bonus dig
  cult[[4][4][4]]: value of fire,water,earth,air cult tracks for the AI. This function takes power gain and cult round bonuses into account, but NOT cult track VPs. That is what the AIs should fill in here.
  p_gone: cost of priest permanently gone to cult track (in negative VP)
  existingtown: when doing anything that incrases an existing town's size (which is not useful, so make this number negative)
  towardstown: making an existing cluster (that has at least 3 power) bigger to be closer to a town (TODO: never do this in a too small cluster that is locked in)
  interacts: it's a new dwelling that interacts with another player, that is good because it is a good TP upgrade target, plus may steal a good spot from them
  specific: object containing extra score for specific actions (by type), e.g. {A_BURN, A_POWER_7C}

  TODO: score for:
  -get closer to forming town:
  --making cluster of amount 2, 3, 4
  --making cluster of power 4, 5, 6
  --making an existing town bigger (can have negative value to discourage such useless move)
  --making a new cluster (a new dwelling in a remote location)
  
}
To avoid an escalation of value magnitudes, always try to use "VP" as unit for each value. How much VP do you think that action during that round will cause at the end of the game?
The AI should set these based on the round. E.g. in round 6, a coin is worth pretty much 0.33 VP due to
the end game conversion, while in round 1 a coin is worth more because it can still be potentially used
for so much. Shipping VP worth can, for example, be calculated from how many easy to dig tiles are at
that location, and so on.
Values should also include round and faction VP bonuses, so the AI can choose how valuable it finds those (e.g. in a round where TP gives 3VP, add 3 to b_tp in values). TODO: don't require this, auto add round and faction bonuses etc... and allow specifying their worth
*/
function scoreAction(player, actions, values, roundnum) {
  //TODO: keep round and bonus tile scoring into account. They count as VP.

  var res = [0,0,0,0,0];
  var shipping = 0;
  var digging = 0; //advance dig
  var b_d = 0;
  var b_tp = 0;
  var b_te = 0;
  var b_sh = 0;
  var b_sa = 0;
  var t_fav = 0;
  var t_tw = 0;
  var burn = 0;
  var bridge = 0;
  var conbridge = 0;
  var forbridge = 0;
  var cult = [0,0,0,0];
  var p_gone = 0;
  var dig = 0; //any dig
  var spades = 0; //digs that count for dig round bonus VP
  var workerdig = 0; //digs that cost resources (count as darklings VP)
  var cultspades = 0; //future cult round bonus digs
  var spec = 0;
  var existingtown = 0;
  var towardstown = 0;
  var interacts = 0;
  //TODO: bonus/favor/town tiles bonus
  for(var i = 0; i < actions.length; i++) {
    var action = actions[i];
    var type = action.type;
    if(type == A_BURN) {
      burn++;
    } else if(type == A_CONVERT_1PW_1C) {
      res[3]--;
      res[0]++;
    } else if(type == A_CONVERT_3PW_1W) {
      res[3] -= 3;
      res[1]++;
    } else if(type == A_CONVERT_5PW_1P) {
      res[3] -= 5;
      res[2]++;
    } else if(type == A_CONVERT_1P_1W) {
      res[2]--;
      res[1]++;
    } else if(type == A_CONVERT_1W_1C) {
      res[1]--;
      res[0]++;
    } else if(type == A_CONVERT_1VP_1C) {
      res[4]--;
      res[0]++;
    } else if(type == A_CONVERT_2C_1VP) {
      res[0] -= 2;
      res[4]++;
    } else if(type == A_POWER_1P) {
      res[3] -= 3;
      res[2]++;
    } else if(type == A_POWER_2W) {
      res[3] -= 4;
      res[1] += 2;
    } else if(type == A_POWER_7C) {
      res[3] -= 4;
      res[0] += 7;
    } else if(type == A_SPADE) {
      subtractIncome(res, getDigCost(player, 1));
      spades++;
      workerdig++;
    } else if(type == A_BONUS_SPADE) {
      spades++;
    } else if(type == A_POWER_SPADE) {
      res[3] -= 4;
      spades++;
    } else if(type == A_POWER_2SPADE) {
      res[3] -= 6;
      spades += 2;
    } else if(type == A_TRANSFORM_CW || type == A_TRANSFORM_CCW) {
      dig++;
    } else if(type == A_GIANTS_TRANSFORM) {
      dig += 2; //TODO: use color distance
    } else if(type == A_SANDSTORM) {
      dig++; //TODO: use color distance
      if(touchesExistingTown(action.co[0], action.co[1], player.color)) existingtown++;
      if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
    } else if(type == A_BUILD || type == A_WITCHES_D) {
      if(type == A_BUILD) subtractIncome(res, getBuildingCost(player.faction, B_D, false));
      b_d++;
      if(touchesExistingTown(action.co[0], action.co[1], player.color)) existingtown++;
      if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
      if(hasNeighbor(action.co[0], action.co[1], player.color)) interacts++;
      if(values.forbridge != 0) {
        var x = action.co[0];
        var y = action.co[1];
        var dirs = [D_N, D_NE, D_SE, D_S, D_SW, D_NW];
        for(var j = 0; j < dirs.length; j++) {
          var co = bridgeCo(x, y, dirs[j]);
          if(outOfBounds(co[0], co[1])) continue;
          if(canHaveBridge(x, y, co[0], co[1], player.color) && isOccupiedBy(co[0], co[1], player.color)) forbridge++;
        }
      }
    } else if(type == A_UPGRADE_TP) {
      subtractIncome(res, getBuildingCost(player.faction, B_TP, hasNeighbor(action.co[0], action.co[1], player.color)));
      b_tp++;
      if(touchesExistingTown(action.co[0], action.co[1], player.color)) existingtown++;
      if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
    } else if(type == A_SWARMLINGS_TP) {
      b_tp++;
      if(touchesExistingTown(action.co[0], action.co[1], player.color)) existingtown++;
      if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
    } else if(type == A_UPGRADE_TE) {
      subtractIncome(res, getBuildingCost(player.faction, B_TE, false));
      b_te++;
      //no size increase so no "touchesExistingTown" test here
    } else if(type == A_UPGRADE_SH) {
      subtractIncome(res, getBuildingCost(player.faction, B_SH, false));
      b_sh++;
      if(touchesExistingTown(action.co[0], action.co[1], player.color)) existingtown++;
      //if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
    } else if(type == A_UPGRADE_SA) {
      subtractIncome(res, getBuildingCost(player.faction, B_SA, false));
      b_sa++;
      if(touchesExistingTown(action.co[0], action.co[1], player.color)) existingtown++;
      //if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
    } else if(type == A_CULT_PRIEST3) {
      // TODO: power income of those (note that it's half the pw value)
      res[2]--;
      p_gone++;
      cult[action.cult] += 3;
    } else if(type == A_CULT_PRIEST2) {
      res[2]--;
      p_gone++;
      cult[action.cult] += 2;
    } else if(type == A_CULT_PRIEST1) {
      res[2]--;
      cult[action.cult] += 1;
    } else if(type == A_BONUS_CULT) {
      cult[action.cult] += 1;
    } else if(type == A_FAVOR_CULT) {
      cult[action.cult] += 1;
    } else if(type == A_AUREN_CULT) {
      cult[action.cult] += 2;
    } else if(type == A_ADV_SHIP) {
      subtractIncome(res, getAdvanceShipCost(player.faction));
      res[4] += getAdvanceShipVP(player);
      shipping++;
    } else if(type == A_ADV_DIG) {
      subtractIncome(res, getAdvanceDigCost(player.faction));
      res[4] += getAdvanceDigVP(player);
      digging++;
    } else if(type == A_POWER_BRIDGE || type == A_ENGINEERS_BRIDGE) {
      if(type == A_POWER_BRIDGE) res[3] -= 3;
      else res[1] -= 2;
      bridge++;
      //connected?
      if(isBridgeSelfConnected(action.cos[0][0], action.cos[0][1], action.cos[1][0], action.cos[1][1])) conbridge++;
    } else if(type == A_TUNNEL) {
      res[4] += 4;
    } else if(type == A_CARPET) {
      res[4] += 4;
    }

    t_fav += action.favtiles.length;
    t_tw += action.twtiles.length;

    if(values.specific[action.type]) spec += values.specific[action.type];
  }

  if(cult[0] || cult[1] || cult[2] || cult[3]) {
    //cap the cults to max of cult track
    for(var i = C_F; i <= C_A; i++) {
      var total = cult[i];
      var actual = willGiveCult(player, i, total);
      if(t_tw && player.cult[i] + actual == 9 && total > actual) actual++; //new town key not known by willGiveCult
      cult[i] = actual;

      res[3] += cultPower(player.cult[i], player.cult[i] + actual);
    }

    var oldcult = player.cult;
    var newcult = [player.cult[0] + cult[0], player.cult[1] + cult[1], player.cult[2] + cult[2], player.cult[3] + cult[3]];
    var cultincome = getAllComingCultRoundBonuses(oldcult, newcult);
    sumIncome(res, cultincome[0]);
    cultspades += cultincome[1];
  }

  // TODO: I don't think all bonuses are in here yet
  var roundtile = roundtiles[roundnum];
  if(roundtile == T_ROUND_TP3VP_4W1DIG || roundtile == T_ROUND_TP3VP_4A1DIG) {
    res[4] += b_tp * 3;
  }
  if(player.favortiles[T_FAV_1W_TPVP]) {
    res[4] += b_tp * 3;
  }
  if(roundtile == T_ROUND_D2VP_4W1P || roundtile == T_ROUND_D2VP_4F4PW) {
    res[4] += b_d * 2;
  }
  if(player.favortiles[T_FAV_1E_DVP]) {
    res[4] += b_d * 2;
  }
  if(roundtile == T_ROUND_DIG2VP_1E1C) {
    res[4] += spades * 2;
  }
  if(player.faction == F_HALFLINGS) {
    res[4] += spades;
  }
  if(player.faction == F_DARKLINGS) {
    res[4] += workerdig * 2;
  }
  if(roundtile == T_ROUND_SHSA5VP_2F1W || roundtile == T_ROUND_SHSA5VP_2A1W) {
    res[4] += (b_sh + b_sa) * 4;
  }

  var result = 0;
  result += res[0] * values.c;
  result += res[1] * values.w;
  result += res[2] * values.p;
  result += res[3] * values.pw;
  result += res[4] * values.vp;
  result += shipping * values.shipping;
  result += digging * values.digging;
  result += b_d * values.b_d;
  result += b_tp * values.b_tp;
  result += b_te * values.b_te;
  result += b_sh * values.b_sh;
  result += b_sa * values.b_sa;
  result += t_fav * values.t_fav;
  result += t_tw * values.t_tw;
  result += burn * values.burn;
  result += bridge * values.bridge;
  result += conbridge * values.conbridge;
  result += forbridge * values.forbridge;
  result += dig * values.dig;
  result += cultspades * values.cultspade;
  for(var i = C_F; i < C_A; i++) {
    var num = cult[i];
    if(num == 1) result += values.cult[0][i];
    else if(num == 2) result += values.cult[1][i];
    else if(num == 3) result += values.cult[2][i];
    else if(num > 3) result += values.cult[2][i] + (num - 3) * values.cult[0][i];
  }
  result += p_gone * values.p_gone;
  result += spec;
  result = Math.max(Math.min(1, result), result + existingtown * values.existingtown); //don't overpenalize this one
  result += towardstown * values.towardstown;
  result += interacts * values.interacts;
  return result;
}

//how close are neighbor tiles to the given color, up to distance 3.
//occupied tiles don't count
//center tile counts if center is true
//equal ==> +3. 1 dig ==> +2. distance > 1 ==> -(distance - 1)
//TODO: take giants and nomads into account here, for them these distances don't (always) matter
function scoreTileDigEnvironment(tx, ty, color, center) {
  var score = 0;
  for(var y = ty - 3; y <= ty + 3; y++)
  for(var x = tx - 3; x <= tx + 3; x++)
  {
    if(!center && x == tx && y == ty) continue;
    if(outOfBounds(x, y)) continue;
    var dist = hexDist(x, y, tx, ty);
    if(dist > 3) continue;
    var color2 = getWorld(x, y);
    if(color2 != I) {
      var colordist = colorDist(color, color2);
      var colorscore = dist == 0 ? 4 : 3 - colordist;
      if(colordist <= 1) score += Math.max(0, colorscore - dist + 1);
    }
  }
  return score;
}

//TODO: here, too, giant and nomad enemy
function scoreTileEnemyEnvironment(tx, ty, color, center) {
  var score = 0;
  for(var y = ty - 3; y <= ty + 3; y++)
  for(var x = tx - 3; x <= tx + 3; x++)
  {
    if(!center && x == tx && y == ty) continue;
    if(outOfBounds(x, y)) continue;
    var dist = hexDist(x, y, tx, ty);
    if(dist > 3) continue;
    if(getBuilding(x, y)[0] != B_NONE) {
      var color2 = getBuilding(x, y)[1];
      var colordist = colorDist(color, color2);
      if(colordist == 1) score -= Math.max(0, 3 - dist + 1);
      else if(colordist == 2) score -= Math.max(0, 1 - dist + 1);
      else if(colordist == 3) score += Math.max(0, 1 - dist + 1); //these are actually nice to have as neighbors
    }
  }
  return score;
}


function getHighestOtherPlayerValueOnCult(player, cult) {
  var highestvalue = -1;
  for(var i = 0; i < players.length; i++) {
    if(players[i] == player) continue;

    if(players[i].cult[cult] > highestvalue) {
      highestvalue = players[i].cult[cult];
    }
  }
  return highestvalue;
}

//returns C_NONE if all are already at the top
function getMostThreatenedWinningCultTrack(player) {
  var highestscore = -1; //threat score
  var track = C_NONE;
  for(var i = C_F; i <= C_A; i++) {
    highestvalue = getHighestOtherPlayerValueOnCult(player, i);
    if(player.cult[i] <= highestvalue) continue; //not a winning cult track
    var score = highestvalue < 10 ? highestvalue : 0;
    if(score > highestscore) {
      highestscore = score;
      track = i;
    }
  }
  return track;
}

//given the player and a shipping level of 'shipping' instead, returns the tiles reachable only exactly through at least that shipping level
//give 0 shipping to only count tiles that are connected by land
function getFreeTilesReachableByShipping(player, shipping) {
  var tiles = getOccupiedTiles(player);
  var result = [];
  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    if(isOccupied(x, y)) continue;
    var shortest = 999; //-1 = is already occupied tile, 0 = land connected, 1 = water distance 1, etc...
    for(var i = 0; i < tiles.length; i++) {
      var x1 = tiles[i][0];
      var y1 = tiles[i][1];
      if(x == x1 && y == y1) shortest = -1;
      else if(landConnected(x, y, x1, y1)) {
        shortest = Math.min(shortest, 0);
      }
      else shortest = Math.min(shortest, waterDistance(x, y, x1, y1));

      if(shortest < shipping) break; //this tile too nearby
    }

    if(shortest == shipping) {
      result.push([x, y]);
    }
  }
  return result;
}


//given the player and a shipping level of 'shipping' instead, returns the amount of tiles 0, 1, 2 and 3 digs away.
//give 0 shipping to only count tiles that are connected by land
//returned as array [0,1,2,3]
function getNumFreeTilesReachableByShipping(player, shipping) {
  var tiles = getFreeTilesReachableByShipping(player, shipping);
  var result = [0,0,0,0];

  for(var i = 0; i < tiles.length; i++) {
    var tilecolor = getWorld(tiles[i][0], tiles[i][1]);
    if(tilecolor != I) result[colorDist(tilecolor, player.color)]++;
  }

  return result;
}


//returns the amount of tiles that are 0, 1, 2 and 3 digs away.
//costly means the usual (carpets and tunnels)
//returned as array [0,1,2,3]
function getNumTilesReachable(player, costly) {
  var tiles = getReachableFreeTiles(player, false);
  var result = [0,0,0,0];

  for(var i = 0; i < tiles.length; i++) {
    var tilecolor = getWorld(tiles[i][0], tiles[i][1]);
    if(tilecolor != I) result[colorDist(tilecolor, player.color)]++;
  }

  return result;
}


//gets number of non-occupied tiles immediately around the given tile with dig distance [0,1,2,3]
function getNumTilesAround(player, x, y) {
  var tiles = getNeighborTiles(x, y);
  var result = [0,0,0,0];

  for(var i = 0; i < tiles.length; i++) {
    if(isOccupied(tiles[i][0], tiles[i][1])) continue;
    var tilecolor = getWorld(tiles[i][0], tiles[i][1]);
    if(tilecolor != I) result[colorDist(tilecolor, player.color)]++;
  }

  return result;
}

// For both human UI and for the AI, when darklings upgrade to SH, it automatically
// adds as much W->P actions as possible given the amount of workers. However, that
// does not take into account taking a town tile that gives +2W, if the SH forms a
// town. Usually the moment in the code where that town tile gets chosen, is after
// the W->P conversions were already done. So call this function after choosing a
// town tile to fix that. Also fixes the situation when taking the +P town tile and
// priest pool is too small.
function updateWToPConversionAfterDarklingsSHTownTile(player, actions) {
  if (player.faction != F_DARKLINGS) return;
  for(var i = 0; i < actions.length; i++) {
    if(actions[i].type == A_UPGRADE_SH && actions[i].twtiles.length == 1) {
      var already = 0;
      for(var j = 0; j < actions.length; j++) {
        if(actions[j].type == A_CONVERT_1W_1P) already++;
      }

      // Darklings SH and 2W town tile
      if(actions[i].twtiles[0] == T_TW_7VP_2W) {
        var total = Math.min(3, already + 2);
        var num = total - already;

        for(var i = 0; i < num; i++) actions.push(new Action(A_CONVERT_1W_1P));
      }

      // Darklings SH and 1P town tile
      if(actions[i].twtiles[0] == T_TW_9VP_P) {
        if(already > 0 && already + 1 - player.p > player.pp) {
          // Remove one of the A_CONVERT_1W_1P actions
          for(var i = 0; i < actions.length; i++) {
            if(actions[i].type == A_CONVERT_1W_1P) {
              actions.splice(i, 1);
              return;
            }
          }
        }
      }

      return;
    }
  }
}
