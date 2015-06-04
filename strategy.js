/* strategy2
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
//are objective (based on game rules), and contain no scorings or intelligence.
//For example a function to list all possible actions for a player, find the
//correct order to dig a certain tile, etc...
//In addition, simple functions for automatic action creation are here, e.g. to
//automatically choose 1, 2 or 3 steps on cult track



//returns reachable land tiles that aren't occupied by any player
//reachable for that player with adjecency, shipping, bridges.
//either transformable by the player, or already their color
//alsobuildable: if false, only tiles that can be *transformed* (through spades, sandstorm, fire factions, ...). If true, also tiles of the players color on which they can *build*.
//costly determines whether to also include tunneling and carpet destinatins (they cost extra resources)
function getReachableTransformableTiles(player, costly, alsobuildable) {
  var result = [];
  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
  {
    var tile = getWorld(x, y);
    if(tile == I || tile == N) continue;
    if(!isOccupied(x, y) && inReach(player, x, y, costly) && (canTransform(player, x, y) || (alsobuildable && canBuildOn(player, x, y)))) {
      result.push([x,y]);
    }
  }
  return result;
}

//for mermaids water town
function getTouchedWaterTiles(player) {
  var result = [];
  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
  {
    var tile = getWorld(x, y);
    if(tile != I) continue;
    if(hasOwnNeighborNoBridge(x, y, player.woodcolor)) {
      result.push([x,y]);
    }
  }
  return result;
}

//this is for witches' ride
function getFreeTilesOfSameColor(color) {
  var result = [];
  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
  {
    if(getWorld(x, y) == color && !isOccupied(x, y)) result.push([x,y]);
  }
  return result;
}

//returns tiles occupied by this player as array [[x,y],[x,y],...]
function getOccupiedTiles(player) {
  var result = [];
  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
  {
    var building = getBuilding(x, y);
    if(building[0] != B_NONE && building[1] == player.woodcolor) result.push([x,y]);
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
  if(!p_possible && !pw_possible) throw new Error('none possible');
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
  if(best < 0) throw new Error('invalid best');

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
  else throw new Error('invalid resource');
  return bestcost;
}

//returns whether player can get the given resources (income array [c,w,p,pw,vp, .....], but vp is ignored, is never output, only used as input for alchemists from player.vp).
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
  if(resources.length < 6 /*classic array*/ && player.c >= resources[0] && player.w >= resources[1] && player.p >= resources[2] && player.pw2 >= resources[3]) {
    return true; //has all resources, no actions needed
  }

  // extra resources such as cult etc... present
  if(resources.length >= 6) {
    var cloned = resources.slice(0);
    for(var i = 0; i < 5; i++) cloned[i] = 0;
    if(!canConsume(player, cloned)) return false; //does not have cult or so
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

function insertCarpetTunnelActionIfNeeded(player, actions) {
  if(!(player.faction == F_FAKIRS || player.faction == F_DWARVES)) return;

  var hastunnel = false;
  for(var i = 0; i < actions.length; i++) {
    var action = actions[i];
    var hastunnel = false;
    if(action.type == A_TUNNEL || action.type == A_CARPET) {
      hastunnel = true;
    }
    if(isBuildDwellingAction(action) || isTransformAction(action.type)) {
      if(!hastunnel && onlyReachableThroughFactionSpecial(player, action.co[0], action.co[1])) {
        var a = new Action(player.faction == F_DWARVES ? A_TUNNEL : A_CARPET);
        a.co = action.co;
        actions.splice(i, 0, a);
        return;
      }
    }
  }
}

//co is a single coordinate, this function does not support digs over multiple tiles
//resources MUST include costly cost
//LOU THIS FUNCTION HAS CHANGED for AI4 dragonlords and riverwalkers
function addPossibleDigBuildAction(resources, player, restrictions, co, dist, dwelling, type, costly, result) {
  var actions = [];
  if(canGetResources(player, resources, restrictions, actions)) {
    if(costly) {
      var a;
      if(player.getFaction().canTakeFactionAction(player, A_TUNNEL)) a = new Action(A_TUNNEL);
      else if(player.getFaction().canTakeFactionAction(player, A_CARPET)) a = new Action(A_CARPET);
      else throw 'costly not possible';
      a.co = co;
      actions.push(a);
    }
    //eliminate choices where tile color or location not allowed
    //  1. check color against acceptable list
    //  2. check location againt river shipping of 1
    if (player.faction == F_RIVERWALKERS) {
      var colorTile = getWorld(co[0], co[1]);
      var colorGood = player.colors[colorTile - R];
      if (!colorGood) return;
      var reachGood = false;
      var tiles;
      tiles = getFreeTilesReachableByShipping(player, 0);
      for(var i = 0; i < tiles.length; i++) {
        if (tiles[i][0] == co[0] && tiles[i][1] == co[1]) reachGood = true;
      }
      tiles = getFreeTilesReachableByShipping(player, 1);
      for(var i = 0; i < tiles.length; i++) {
        if (tiles[i][0] == co[0] && tiles[i][1] == co[1]) reachGood = true;
      }
      if (!reachGood) return;
    }
    else if(dist > 0) {
      //LOU Separate the Nomads and Orange
      if(type == A_SANDSTORM) {
        // No spades needed for sandstorm
        var action2 = new Action(type);
        action2.co = co;
        actions.push(action2);
      }

      //LOU Spades and roundnum not available
      else if(type == A_TRANSFORM_SPECIAL2 ) {
        if ((player.pw0 + player.pw1 + player.pw2) <= 5 && state.round < 6 ) return;
        // if (!dwelling) return;
        // 1 or 2 Power needed for Transform
        var action2 = new Action(type);
        action2.co = co;
        //LOU used for Acolytes
        if(resources[R_CULT]) {
          //TODO: allow to choose cult track, or output all possibilities for cult tracks
          if(player.cult[C_F] >= resources[R_CULT]) action2.cult = C_F;
          else if(player.cult[C_W] >= resources[R_CULT]) action2.cult = C_W;
          else if(player.cult[C_E] >= resources[R_CULT]) action2.cult = C_E;
          else action2.cult = C_A;
        }
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
        var actiontypes = transformDirAction(player, getWorld(co[0], co[1]), player.getMainDigColor());
        for(var i = 0; i < actiontypes.length; i++) {
          var action2 = new Action(actiontypes[i]);
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

//potentially adds a possible dig action sequence, and potentially adds a (dig if needed) and build action sequence
//destructively alters cost (adds the dwelling cost)
//resources MAY NOT include costly cost
function addPossibleDigBuildActions(cost, player, restrictions, co, dist, type, costly, result) {
  if(costly) sumIncome(cost, getTunnelCarpetCost(player));
  if(dist > 0) addPossibleDigBuildAction(cost, player, restrictions, co, dist, false, type, costly, result);
  if(player.b_d > 0) {
    sumIncome(cost, player.getFaction().getBuildingCost(B_D, false));
    addPossibleDigBuildAction(cost, player, restrictions, co, dist, true, type, costly, result);
  }
}

//the 3 extra digs and maybe dwelling for halflings stronghold. player.faction must be halflings.
function shUpgradeWithHalflings(player, restrictions, co, dwelling, result) {
  if(dwelling && player.b_d == 0) return;

  var resources = player.getFaction().getBuildingCost(B_SH, false);
  if(dwelling) sumIncome(resources, player.getFaction().getBuildingCost(B_D, false));

  var actions = [];
  if(canGetResources(player, resources, restrictions, actions)) {
    var action = new Action(A_UPGRADE_SH);
    action.co = co;
    actions.push(action);

    var digco = [];
    var buildco = [];
    restrictions.digFun(player, 3, dwelling ? 1 : 0, player.getFaction().getBuildingCost(B_D, false), digco, buildco);
    for(var i = 0; i < digco.length; i++) {
      var types = transformDirAction(player, getWorld(digco[i][0], digco[i][1]), player.getMainDigColor());
      if(types.length > 0) {
        var a = new Action(types[0]);
        a.co = digco[i];
        actions.push(a);
      } else {
        throw 'expected some dig actions';
      }
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
  var tiles = getReachableTransformableTiles(player, false /*this is for extra digs, so no tunneling and carpets*/, false);
  for(var i = 0; i < tiles.length; i++) {
    if(player.faction == F_GIANTS && numdig == 1) break; //nothing can be done with one dig for giants.
    var color = getWorld(tiles[i][0], tiles[i][1]);
    var dist = digDist(player, color, player.getMainDigColor());
    while(dist > 0 && digco.length < numdig) {
      digco.push(tiles[i]);
      dist--;
    }
    if(digco.length >= numdig) break;
  }
  if(numbuild && digco.length > 0) buildco.push(digco[0]);
}

//freespades is the amount of spades (as the resource) the player already has due to previous actions. Set to something large like 999 to mean "infinite" or "enough"
//tocolor is the color to attempt to reach (set to player.color to make it transform to their home terrain)
//maxnum is max amount of transformations allowed to do (again set to 999 or so if infinite)
//returns array of actions
function getAutoTransformActions(player, x, y, tocolor, freespades, maxnum) {
  if(player.color == Z) return []; //cannot transform, and doesn't need to assumgint that the color is unlocked
  var fromcolor = getWorld(x, y);
  if(tocolor == O) {
    if(fromcolor == O) return [];
    else return [makeActionWithXY(A_TRANSFORM_SPECIAL2, x, y)];
  }
  var result = [];
  var dist = digDist(player, fromcolor, tocolor);
  if(dist > maxnum) dist = maxnum;
  if(dist > 0) {
    var spadesreq = (freespades > dist ? 0 : dist - freespades);
    for(var i = 0; i < spadesreq; i++) result.push(new Action(A_SPADE));
    var types = transformDirAction(player, fromcolor, tocolor);
    for(var i = 0; i < types.length; i++) {
      var action = new Action(types[i]);
      action.co = [x, y];
      result.push(action);
    }
  }
  return result;
}

//say you are a green player, taking the 2-spade power action. Tile D7 is red, tile F6 is grey. So you can dig&build on F6, and turn D7 to grey (one closer to you)
//in a Snellman game, sometimes the command then is: "action act6. transform d7 to grey. build f6"
//so it first turns d7 to grey, then turns f6 to grey.
//However, the implementation here is more strict than in snellman, here it is required that you can only overflow spades if you transform fully to your color
//on previous tiles (as the game rules also imply). So the same action is possible, it just requires a more strict ordering here.
//This function changes the order of the actions, as long as possible, to match the correct ordering here.
//E.g. for the above example, input would be: (with coordinates translated too):
//pow2spade. transformccw D11. transformccw F11. build F11
//the output (reordered actions object) will be:
//pow2spade. transformccw F11. build F11. transformccw D11.
//Only supports series of actions with up to 3 different coordinates, and the only operation it does is moving transform actions more towards the end if needed
function reorderDigBuildActionsToNotStartWithIncompleteTransforms(player, actions) {
  // TODO: take chaos magicians double action into account: then it should be independent for first and second part.
  var hastransform = false;
  for(var i = 0; i < actions.length; i++) {
    var action = actions[i];
    if(isTransformAction(action.type) && action.type != A_SANDSTORM) {
      hastransform = true;
    }
  }
  if(!hastransform) return;

  var transformactions = {}; //set of [[action, index]...] keyed by printCo (index = index in the original array)
  var virtualworld = {}; //key = printCo, value = color
  var count = 0;
  for(var i = 0; i < actions.length; i++) {
    var action = actions[i];
    if(isTransformAction(action.type) && action.type != A_SANDSTORM) {
      var co = printCo(action.co);
      if(!transformactions[co]) {
        transformactions[co] = [];
        virtualworld[co] = getWorld(action.co[0], action.co[1]);
        count++;
      }
      transformactions[co].push([action, i]);
      virtualworld[co] = getColorAfterTransformAction(virtualworld[co], player, action.type);
    }
  }

  if(count <= 1) return; //only relevant if multi-tile transform

  var hasincomplete = false;
  for(var co in virtualworld) {
    if(virtualworld[co] != player.getMainDigColor()) {
      hasincomplete = true;
      break;
    }
  }

  if(!hasincomplete) return;

  var lastcomplete = 0;
  for(var i = 0; i < actions.length; i++) {
    var action = actions[i];
    if(isTransformAction(action.type) && action.type != A_SANDSTORM) {
      var co = printCo(action.co);
      if(virtualworld[co] == player.getMainDigColor()) lastcomplete = i;
    }
  }

  var lastcorrect = lastcomplete; //moved transform actions after the last complete transform action

  for(var i = 0; i < lastcorrect; i++) {
    var action = actions[i];
    if(isTransformAction(action.type) && action.type != A_SANDSTORM) {
      var co = printCo(action.co);
      if(virtualworld[co] != player.getMainDigColor()) {
        actions.splice(i, 1);
        actions.splice(lastcorrect, 0, action);
      }
    }
  }
}

function getAutoSendPriestCultAction(player, cult) {
  if(player.cult[cult] >= 9) return A_CULT_PRIEST1; //if already at 9, don't permanently waste a priest
  else if(game.cultp[cult][0] == N) return A_CULT_PRIEST3;
  else if(game.cultp[cult][3] == N) return A_CULT_PRIEST2;
  else return A_CULT_PRIEST1;
}

function getCultActionForAmount(amount) {
  if(amount == 1) return A_CULT_PRIEST1;
  else if(amount == 2) return A_CULT_PRIEST2;
  else return A_CULT_PRIEST3;
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

  var orange = (player.getFaction().getActionIncome(player, A_POWER_SPADE)[R_SPADE] == 0); //orange factions (fire) don't get or use spades. Detect it in this more generic way rather than "player.woodcolor == O".

  //dig&build
  tiles = getReachableTransformableTiles(player, true /*costly: also support the tunneling and carpets*/, true);
  for(var t = 0; t < tiles.length; t++) {
    var tile = getWorld(tiles[t][0], tiles[t][1]); //this is the color
    var dist = digDist(player, tile, player.getMainDigColor());
    var costly = onlyReachableThroughFactionSpecial(player, tiles[t][0], tiles[t][1]);

    //Try digging in different ways
    var resources; //todo: support darklings priests, house of different price

    if(canTakeOctogonAction(player, A_POWER_2SPADE)) {
      if(orange) {
      } else if(dist > 1) {
        var cost = mulIncome(player.getActionCost(A_SPADE), Math.max(0, dist - 2));
        sumIncome(cost, player.getActionCost(A_POWER_2SPADE));
        addPossibleDigBuildActions(cost, player, restrictions, tiles[t], dist, A_POWER_2SPADE, costly, result);
      }
    }

    if(player.faction == F_GIANTS && player.b_sh == 0 && !player.octogons[A_GIANTS_2SPADE] && dist == 2) {
      var cost = [0,0,0,0,0];
      addPossibleDigBuildActions(cost, player, restrictions, tiles[t], dist, A_GIANTS_2SPADE, costly, result);
    }

    if(player.faction == F_NOMADS && player.b_sh == 0 && !player.octogons[A_SANDSTORM] && hasOwnNeighborNoBridge(tiles[t][0], tiles[t][1], player.woodcolor)) {
      var cost = [0,0,0,0,0];
      addPossibleDigBuildActions(cost, player, restrictions, tiles[t], dist, A_SANDSTORM, costly, result);
    }

    if(canTakeOctogonAction(player, A_POWER_SPADE)) {
      if(orange) {
      } else if(dist > 0) {
        var cost = mulIncome(player.getActionCost(A_SPADE), Math.max(0, dist - 1));
        sumIncome(cost, player.getActionCost(A_POWER_SPADE));
        addPossibleDigBuildActions(cost, player, restrictions, tiles[t], dist, A_POWER_SPADE, costly, result);
      }
    }

    if(!player.octogons[A_BONUS_SPADE] && player.bonustile == T_BON_SPADE_2C) {
      if(orange) {
      } else if(dist > 0) {
        var cost = mulIncome(player.getActionCost(A_SPADE), Math.max(0, dist - 1));
        addPossibleDigBuildActions(cost, player, restrictions, tiles[t], dist, A_BONUS_SPADE, costly, result);
      }
    }

    if(orange) {
      //var cost = [0,0,0,0,0];
      var cost = player.getFaction().getTransformActionCost(player, A_TRANSFORM_SPECIAL2, tile);
      addPossibleDigBuildActions(cost, player, restrictions, tiles[t], dist, A_TRANSFORM_SPECIAL2, costly, result);
    } else {
      var cost = mulIncome(player.getActionCost(A_SPADE), dist);
      addPossibleDigBuildActions(cost, player, restrictions, tiles[t], dist, A_SPADE, costly, result);
    }

    //The ones without dwelling are dangerous unless the tile is out of reach of other players. But that is up to the AI to figure out.
  }

  //upgrades
  tiles = getOccupiedTiles(player);
  for(var t = 0; t < tiles.length; t++) {
    var b = getBuilding(tiles[t][0], tiles[t][1])[0];
    if(b == B_D && player.b_tp > 0) {
      var neighbor = hasNeighbor(tiles[t][0], tiles[t][1], player.woodcolor);
      addPossibleUpgradeAction(player.getFaction().getBuildingCost(B_TP, neighbor), player, restrictions, tiles[t], A_UPGRADE_TP, result);
      if(player.faction == F_SWARMLINGS && player.b_sh < 1 && !player.octogons[A_SWARMLINGS_TP]) addPossibleUpgradeAction([0,0,0,0,0], player, restrictions, tiles[t], A_SWARMLINGS_TP, result);
    } else if(b == B_TP) {
      if(player.b_te > 0) addPossibleUpgradeAction(player.getFaction().getBuildingCost(B_TE, false), player, restrictions, tiles[t], A_UPGRADE_TE, result);
      if(player.b_sh > 0) addPossibleUpgradeAction(player.getFaction().getBuildingCost(B_SH, false), player, restrictions, tiles[t], A_UPGRADE_SH, result);
    } else if(b == B_TE) {
      if(player.b_sa > 0) addPossibleUpgradeAction(player.getFaction().getBuildingCost(B_SA, false), player, restrictions, tiles[t], A_UPGRADE_SA, result);
    }
  }

  //bridge
  //TODO: the engineers version A_ENGINEERS_BRIDGE
  var bactions = [];
  if(!game.octogons[A_POWER_BRIDGE] && player.bridgepool > 0 && canGetResources(player, player.getActionCost(A_POWER_BRIDGE), restrictions, bactions)) {
    tiles = getOccupiedTiles(player);
    var dirs = [D_N, D_NE, D_SE, D_S, D_SW, D_NW];
    for(var t = 0; t < tiles.length; t++) {
      for (var d = 0; d < dirs.length; d++) {
        var co2 = bridgeCo(tiles[t][0], tiles[t][1], dirs[d], game.btoggle);
        if(outOfBounds(co2[0], co2[1])) continue;
        if(getBuilding(co2[0], co2[1])[1] == player.woodcolor && co2[1] > tiles[t][1]) continue; //avoid adding twice the same action with just swapped tiles
        if (canHaveBridge(tiles[t][0], tiles[t][1], co2[0], co2[1], player.woodcolor)) {
          result.push(new Action(A_POWER_BRIDGE));
          var action2 = new Action();
          action2.type = A_PLACE_BRIDGE;
          action2.cos.push(tiles[t]);
          action2.cos.push(co2);
          var actions = clone(bactions);
          actions.push(action2);
          result.push(actions);
        }
      }
    }
  }

  //resource power actions
  if(!game.octogons[A_POWER_1P]) addPossibleSimpleAction(player.getActionCost(A_POWER_1P), player, restrictions, A_POWER_1P, result);
  if(!game.octogons[A_POWER_2W]) addPossibleSimpleAction(player.getActionCost(A_POWER_2W), player, restrictions, A_POWER_2W, result);
  if(!game.octogons[A_POWER_7C]) addPossibleSimpleAction(player.getActionCost(A_POWER_7C), player, restrictions, A_POWER_7C, result);

  /*
  //LOU add resource action for ShapeShifters to change shape for 3 PW or 3 token
  if(player.faction == F_SHAPESHIFTERS && player.b_sh == 0 && player.pw2 >= 3)
    addPossibleSimpleAction(player.getActionCost(A_SHIFT), player, restrictions, A_SHIFT, result);
  }
  if(player.faction == F_SHAPESHIFTERS && player.b_sh == 0 && player.pw0+player.pw1 >= 3))
    addPossibleSimpleAction(player.getActionCost(A_SHIFT2), player, restrictions, A_SHIFT2, result);
  }

  */

  //advance actions
  if(canAdvanceShip(player)) addPossibleSimpleAction(player.getActionCost(A_ADV_SHIP), player, restrictions, A_ADV_SHIP, result);
  if(canAdvanceDig(player)) addPossibleSimpleAction(player.getActionCost(A_ADV_DIG), player, restrictions, A_ADV_DIG, result);

  //priests to cults
  for(var c = C_F; c <= C_A; c++) {
    if(game.cultp[c][0] == N) addPossibleSimpleAction([0,0,1,0,0], player, restrictions, A_CULT_PRIEST3, result).cult = c;
    if(game.cultp[c][3] == N) addPossibleSimpleAction([0,0,1,0,0], player, restrictions, A_CULT_PRIEST2, result).cult = c;
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
    var tiles = getFreeTilesOfSameColor(player.getMainDigColor());
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
        var tw = makesNewTownByBuilding(tiles[j][0], tiles[j][1], B_MERMAIDS, reqpower, player.woodcolor);
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
    if(game.favortiles[i] <= 0) continue;
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
    var num = game.towntiles[i];
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
  var cluster = mostPowerfulTouchedCluster(x, y, player.woodcolor);
  if(!cluster) return false;
  if(cluster.power < 3) return false;
  if(cluster.power + 1 >= getTownReqPower(player)) return false; //also return false if it actually does form a town, because other type of scoring is used for that
  return true;
}


function getHighestOtherPlayerValueOnCult(player, cult) {
  var highestvalue = -1;
  for(var i = 0; i < game.players.length; i++) {
    if(game.players[i] == player) continue;

    if(game.players[i].cult[cult] > highestvalue) {
      highestvalue = game.players[i].cult[cult];
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
  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
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
    if(tilecolor != I) result[digDist(player, tilecolor, player.getMainDigColor())]++;
  }

  return result;
}


//returns the amount of tiles that are 0, 1, 2 and 3 digs away.
//costly means the usual (carpets and tunnels)
//returned as array [0,1,2,3]
function getNumTilesReachable(player, costly) {
  var tiles = getReachableTransformableTiles(player, false, true);
  var result = [0,0,0,0];

  for(var i = 0; i < tiles.length; i++) {
    var tilecolor = getWorld(tiles[i][0], tiles[i][1]);
    if(tilecolor != I) result[digDist(player, tilecolor, player.getMainDigColor())]++;
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
    if(tilecolor != I) result[digDist(player, tilecolor, player.getMainDigColor())]++;
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
