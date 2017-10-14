/*  ailou15.js
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

//Lou's AI controller.


var AILou = function(level) {
  this.scoreActionValues = {};
  this.restrictions = clone(defaultRestrictions);
  AILou.ail = level; //processing level (TODO: danger: global variable instead of class field. making TMAI support players with different AIs would not be supported because of this! use this.ail here and make functions prototype to fix this)
};
inherit(AILou, Actor);


//LOU include specific advice on preferred bonus and favor tiles
AILou.xfaction = 0;
AILou.ybonus = 0;
AILou.yfavor = 0;
AILou.info = false;  //information please, print extra processing data in output file
var townSelected = []; //avoid previous action town tile
var upgradeSA = -1;    //avoid both FAV6tw and upgradeSA during same action
var letters = ['A','B','C','D','E','F','G','H','I'];
var numbers = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20'];

function getRoundTileP1() {
  if(state.round < 6) {
   var roundP1 = state.round + 1;
   return game.roundtiles[roundP1];
  }
  else return 0;
}

function getRoundTileP2() {
  if(state.round < 5) {
    var roundP2 = state.round + 2;
    return game.roundtiles[roundP2];
  }
  else return 0;
}

AILou.powerToCoin = function(actions,coin)  {
  var action1C = new Action(A_CONVERT_1PW_1C);
  for(var i = 0; i < coin; i++) {
    actions.push(action1C);
  }

};

//LOU function to convert power (usually to coins) to avoid power overflow
//LOU Check for power income and compare against bowls
AILou.convertPower = function(playerIndex, coin, actions, bonPower) {
  //var restrictions = clone(defaultRestrictions);
  //var restrictions = {w_cost: 0.33, p_cost: 1, pw_cost: 0.16, burn_cost: 1, max_burn: 6 };
  //var actions = getPossibleActions(player, restrictions);
  var player = game.players[playerIndex];
  var bowl2 = player.pw2;
  var powerUse = bowl2;
  var takePower = 0;

  // Check for no ability to get power
  if (player.pw0 + player.pw1 == 0)  {
    switch(bowl2) {
      case 0: break;
      case 1: AILou.powerToCoin(actions, powerUse);
              coin += powerUse;
              break;
      case 2: AILou.powerToCoin(actions, powerUse);
              coin += powerUse;
              break;
      case 3: if (player.getFaction().canTakeAction(player, A_POWER_1P, game)) {
              var action2 = new Action(A_POWER_1P);
              takePower++;
              actions.push(action2);
              break;
              } else {
              AILou.powerToCoin(actions, powerUse);
              coin += powerUse;
              break;
              }
      case 4: if (player.getFaction().canTakeAction(player, A_POWER_7C, game)) {
              var action2 = new Action(A_POWER_7C);
              takePower++;
              actions.push(action2);
              break;
              } else if (player.getFaction().canTakeAction(player, A_POWER_2W, game)) {
              var action2 = new Action(A_POWER_2W);
              takePower++;
              actions.push(action2);
              break;
              } else {
              AILou.powerToCoin(actions, powerUse);
              coin += powerUse;
              break;
              }
      case 5: AILou.powerToCoin(actions, 1);
              coin += 1;
              break;
      case 6: break;
      case 7:
      default: AILou.powerToCoin(actions, 1);
              coin += 1;
    }
  }

  //Check powerIncome greater than can be used
  //INCOME = { c: player.c, w: player.w, p: player.p, pw: [player.pw(0,1,2)], vp: player.vp
  //LOU use all power action up even if one left over
  if (state.round < 6)  {
    var income = getIncome(player, false, state.round);   //from rules.js, false = no bonus tile
    income[3] += bonPower;   //include power from new bonus tile
    var powerSurplus = income[3] - (coin*2 + player.pw0*2 + player.pw1);
    var powerLeft = bowl2 - coin;
    if (powerSurplus > 0 && powerLeft > 0) {
      var powerOver = Math.min(Math.ceil(powerSurplus/2), powerLeft);
      AILou.powerToCoin(actions, powerOver);
      coin += powerOver;
    }
    if(AILou.info) addLog('CONVERT: convertPower for EXECUTE/PASS action = '
      + income + ' power in bowl2 ' + powerLeft + ' extraPower ' + powerSurplus);
  }
  var result = [takePower, coin, actions];
  return result;
};


//given an array of items and an array of corresponding scores, returns the index of the item with best score.
//if the best score is shared between multiple items, a random one of those is chosen so that the AI is not predictable
//used for choosing actions, bonus tiles, favor tiles, town tiles, choosing extra dig locations, etc.....
//distributerandom:
//-if false, picks only the one with best score (randomizing if there are ties).
//-if true, every single item has a chance, the scores are the probability distribution function.
AILou.pickWithBestScore = function(items, scores, distributerandom) {
  if(distributerandom) {
    var sum = 0;
    for(var i = 0; i < scores.length; i++) sum += scores[i];
    // Make it work if all scores are 0
    if(sum <= 0) {
      sum = scores.length;
      if (sum <= 0) sum = 1;
      scores = [];
      for(var j = 0; j < sum; j++) scores[j] = 1;
    }
    var r = Math.random() * sum;
    var count = 0;
    for(var i = 0; i < scores.length; i++) {
      count += scores[i];
      if(r < count) return i;
    }
    return items.length - 1;
  } else {
    var besti = 0;
    var bestscore = -999999;
    for(var i = 0; i < items.length; i++) {
      if(scores[i] > bestscore) {
        bestscore = scores[i];
        besti = i;
      }
    }

    var same = [];
    for(var i = 0; i < items.length; i++) {
      if(scores[i] == bestscore) {
        same.push(i);
      }
    }
    var s = randomIndex(same);

    return same[s];
  }
};

/*
Debuggen AI scoring in de chrome console:
var actions = getPossibleActions(game.players[1], defaultRestrictions);
var scores = [];
for(var j = 0; j < actions.length; j++) {
  scores.push(game.players[1].actor.scoreActionAI_(game.players[1], actions[j], 0));
}
for(var i = 0; i < actions.length; i++) console.log(actionsToString(actions[i]) + ' ' + scores[i]);
*/
AILou.prototype.doAction = function(playerIndex, callback) {
  var player = game.players[playerIndex];

  this.updateScoreActionValues_(player, state.round);

  var actions = getPossibleActions(player, this.restrictions);

  //LOU change possible actions here to avoid changing scores in strategy.js

  //TODO: support chaos magicians double action
  var chosen = 0;

  var scores = [];
  for(var j = 0; j < actions.length; j++) {
    scores.push(this.scoreActionAI_(player, actions[j], 0));
  }

  //handy for chrome console debugging:
  //if(state.round < 3) {
  //  console.log(' round= ' + state.round + ': ' + (player.faction+1) + ': ' + actions.length);
  //  for(var i = 0; i < actions.length; i++) console.log(actionsToString(actions[i]) + ':' + scores[i]);
  //}

  var besti = AILou.pickWithBestScore(actions, scores, false);
  if(scores[besti] > 0) {
    chosen = actions[besti];
  }

  AILou.xfaction = player.faction + 1;
  var favtown6 = -1;
  townSelected = []
  upgradeSA = -1; // used to avoid selection of FAV6TW
  var cantPass = 0;
  if(!chosen) {
    //LOU this is where pass option selected, convert power before pass
    twoTown = 0;
    var actionPass = new Action(A_PASS);
    if(state.round != 6) actionPass.bontile = this.getPreferredBonusTile_(player);
    var actionCoin = [];
    var coin = 0;
    var bonPower = 0;
    if(actionPass.bontile == T_BON_3PW_SHIP ||
       actionPass.bontile == T_BON_3PW_1W  ||
       actionPass.bontile == T_BON_PASSSHIPVP_3PW) bonPower = 3;
    var result = AILou.convertPower(playerIndex, coin, actionCoin, bonPower);
    cantPass = result[0];
    coin = result[1];
    actionCoin = result[2];
    if (cantPass > 0) {
      chosen = actionCoin;
    }
    else if (coin == 0) {
      chosen = [actionPass];
    }
    else if (coin > 0) {
      actionCoin.push(actionPass);
      chosen = actionCoin;
    }
  }

  // some chosen action taken, find selected Favor or Town
  else {
   for(var i = 0; i < chosen.length; i++) {
    for(var j = 0; j < chosen[i].favtiles.length; j++) {
      if (chosen[i].twtiles.length > 0) upgradeSA = 1;
      var tiles = getPossibleFavorTiles(player, chosen[i].favtiles);
      chosen[i].favtiles[j] = this.getPreferredFavorTile_(player, tiles);
      if (chosen[i].favtiles[j] == T_FAV_2F_6TW) favtown6 = i;
    }

    //LOU10 when FAV6TW selected by TE, examine for possible towns, avoid selected by SA
    if (favtown6 >= 0) {
      //from rules.js --  var numtw = actionCreatesTown(player, chosen, null);
      //calculateTownClusters();
      var town6 = getPlayerTownSize(player.woodcolor, townclusters, 6);
      chosen[i].twtiles.length += town6.length;
    }

    for(var j = 0; j < chosen[i].twtiles.length; j++) {
      var tiles = getPossibleTownTiles(player, chosen[i].twtiles);
      chosen[i].twtiles[j] = this.getPreferredTownTile_(player, tiles);
      townSelected.push(chosen[i].twtiles[j]);
      updateWToPConversionAfterDarklingsSHTownTile(player, chosen);
    }
   }
  }

  //LOU this is where the chosen action 'place bridge' and 'get favor6tw' previously fails.
  //LOU this is where favor6tw fails when making a town. Error: too few town tiles chosen (fixed)
  //LOU10 Error: this town tile is no longer available (fixed, two same town tiles no longer chosen by action)
  //LOU10 Error: no town tile chosen , Error: town tile chosen injustly (these are not errors)
  var error = callback(playerIndex, chosen);
  if(error != '') {
    addLog('=============================================================');
    addLog('ERROR: AI tried invalid EXECUTE/PASS action. Error: ' + error);

    //instead, pass.
    var action = new Action(A_PASS);
    if(state.round != 6) action.bontile = this.getPreferredBonusTile_(player);
    callback(playerIndex, [action]);
  }
};

AILou.prototype.updateScoreActionValues_ = function(player, roundnum) {

  //TODO: different score for consume and produce resource? e.g. I want to make darklings priests worth a lot for getting, but not worth a lot for spending so that they'll actually use them
  this.scoreActionValues = {
    vp: 1,
    c: 0.33,
    w: 1,
    p: 1.5,
    pw: 0.166,
    shipping: 1.5,
    digging: 1,
    b_d: 6,
    b_tp: 5,
    b_te: 5.5,
    b_sh: 6,
    b_sa: 6,
    b_prefer: 0, //this is not used in ai
    t_fav: 1,
    t_tw: 10, //TODO: if bridge forms town, but both parts were already 6 power or so, give PENALTY for that, because that ruins two towns for just one!
    burn: -0.166,
    maxburn: 6,
    bridge: 0,
    conbridge: 0, //ENGINEER bridge
    forbridge: 0, //ENGINEER bridge
    dig: 0.1, //it must have a positive value but less than the resource cost, so that for e.g. sandstorm it appreciates further dig distances more
    cultspade: 1,
    cult: [[1,1,1,1],[2,2,2,2],[3,3,3,3]],
    p_gone: player.pp < 3 ? -5 : 0,
    existingtown: -2,
    towardstown: 5,
    interacts: 1,
    networkcon: state.fireice ? 4 : 2,  //network connectivity value in VP per build
    outpostcon: 2,
    shtosacon: 4,
    distancon: 3,
    settlecon: 4,

    shift: 0,    //SHAPESHIFTERS power3 or 5
    shift2: 0,   //SHAPESHIFTERS token3 or 5
    specific: {},
    };

  var s = this.scoreActionValues;

  //CULT track evaluation
  if (roundnum <= 4)  {
    for(var i = 1; i <= 3; i++) {
    for(var j = C_F; j <= C_A; j++) {
      s.cult[i - 1][j] = this.scoreCultTrackVP_(player, j, i, false) / (5 - i);
      //divided because overall a single cult track move is not worth the whole VP
    }
    }
  //entirely number of VP gain (ignores round 5 bonus)
  } else if (roundnum > 4)  {
    for(var numk = 1; numk <= 3; numk++) {
    for(var j = C_F; j <= C_A; j++) {
      var pcult = [];
      for(var i = 0; i < game.players.length; i++) pcult[i] = game.players[i].cult[j];
      var fromcultvp = getDistributedPoints(player.index, pcult, [8,4,2], 1);
      pcult[player.index] += numk;
      var tocultvp = getDistributedPoints(player.index, pcult, [8,4,2], 1);
      var vpgain = (tocultvp - fromcultvp);
      s.cult[numk - 1][j] = vpgain;
    }
    }
  }

  //make the AI's go for the power actions more aggressively
  s.specific[A_POWER_1P] = roundnum < 6 ? 2 : 3;
  s.specific[A_POWER_2W] = player.w < 4 ? 5 : 0;
  s.specific[A_POWER_7C] = roundnum > 1 ? 5 : 0;
  s.specific[A_POWER_SPADE] = 5;
  s.specific[A_POWER_2SPADE] = 6;

  s.t_fav = player.favortiles.length > 3 ? 0 : 1;

  //get TOWN count and favor6TW available
  var towncount = 0;
  var favor6TW = 0;
  for(var i = 0; i < 4; i++) if(player.towntiles[i] != undefined) towncount++;
  var tiles = getPossibleFavorTiles(player, {});
  for(var i = 0; i < tiles.length; i++) {
    if (tiles[i] == T_FAV_2F_6TW) favor6TW = 1;
  }

  // Round specific
  var FINALRESVAL = player.faction == F_ALCHEMISTS ? 0.5 : 0.33;
  if(roundnum < 3) {
    s.vp = 0.5;
    s.c = 0.5;
    s.w = 1;
    s.p = 1.5;
    s.pw = 0.5;
  } else if(roundnum != 6) {
    s.vp = 1;
    s.c = FINALRESVAL;
    s.w = 0.5;
    s.p = 1;
    s.pw = 0.5;
    s.b_d = 4;
    s.b_tp = 4;
    s.b_te = 4.5;
    s.b_sh = 4;
    s.b_sa = 4;
  } else /*final round*/{
    s.vp = 1;
    s.c = FINALRESVAL;
    s.w = FINALRESVAL;
    s.p = FINALRESVAL;
    s.pw = 0.166;
    s.b_d = 2;
    s.b_tp = 0;
    s.b_te = 0;
    s.b_sh = 0;
    s.b_sa = 0;
    s.shipping = 3;
  }

  //reduce coin value so not too many (avoid for NOMADS, DARK and BLUE)
  if(roundnum > 3 && player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2;
  if(roundnum > 2 && player.c > 12 && (player.c > (3 * player.w))) {
    s.c /= 4;
    s.specific[A_POWER_7C] = -5;
    s.specific[A_POWER_2W] += 2;
    s.specific[A_POWER_1P] += 1;
  }

  var sanctuarytwiddle = 2;
  //The AIs are not building sanctuaries.... let's add some score
  //LOU SA seem to be built prematurely, only add score in round 4 or greater.
  if(roundnum > 3) s.b_sa += sanctuarytwiddle;
  if(AILou.ail < 2 && game.finalscoring == 2 && roundnum < 5) s.b_sa = 0;
  if(AILou.ail >= 2 && game.finalscoring == 2 && roundnum < 6) s.b_sa = 0;
  //LOU for settlements, shipping is better for expansion
  if(game.finalscoring == 4) s.shipping += 1;

  // make SH essential, except for the given power actions
  var makeSHEssential = function(pow_7c, pow_2w, pow_dig1, pow_dig2) {
    if(built_sh(player) == 0) {
      if(built_tp(player) == 0) s.b_tp += 50;
      s.b_sh += 50;
      // But it should still do these first
      if(pow_7c > 0) s.specific[A_POWER_7C] = 20 + pow_7c;
      if(pow_2w > 0) s.specific[A_POWER_2W] = 20 + pow_2w;
      if(pow_dig1 > 0) s.specific[A_POWER_SPADE] = 20 + pow_dig1;
      if(pow_dig2 > 0) s.specific[A_POWER_2SPADE] = 20 + pow_dig2;
    }
  };

  // make the num_temple (can be 0,1,2,3), except for the given power actions
  var makeTemple = function(num_temple, pow_7c, pow_2w, pow_dig1, pow_dig2) {
    if(built_te(player) == num_temple-1) {
      if(built_tp(player) == 0) s.b_tp += 10;
      s.b_te += 10;
      // But it should still do these first
      if(pow_7c > 0) s.specific[A_POWER_7C] = player.c > 10 ? 4 : 12 + pow_7c;
      if(pow_2w > 0) s.specific[A_POWER_2W] = 10 + pow_2w;
      if(pow_dig1 > 0) s.specific[A_POWER_SPADE] = 10 + pow_dig1;
      if(pow_dig2 > 0) s.specific[A_POWER_2SPADE] = 10 + pow_dig2;
    }
  };

  // make the num_ship (can be 1,2,3), except for the given power actions
  var makeShipping = function(num_ship, pow_7c, pow_2w, pow_dig1, pow_dig2) {
    if(player.shipping == num_ship-1) {
      s.shipping += 10;
      // But it should still do these first
      if(pow_7c > 0) s.specific[A_POWER_7C] = player.c > 10 ? 4 : 12 + pow_7c;
      if(pow_2w > 0) s.specific[A_POWER_2W] = 12 + pow_2w;
      if(pow_dig1 > 0) s.specific[A_POWER_SPADE] = 14 + pow_dig1;
      if(pow_dig2 > 0) s.specific[A_POWER_2SPADE] = 14 + pow_dig2;
    }
  };

  //no resources given after this round
  if (roundnum == 6) {
    //modify favor selection so build temple for last round gets cult+3 favor
    //LOU12 sometimes no temple is built unless value is greater than residual of 2.33
    s.b_te += 4;
    if(built_tp(player) == 0) s.b_tp += 3;
    //add value for dwelling as an outpost
    if(game.finalscoring == 1) s.b_d += 2;
    //select SH and SA to give SH_SA distance bonus in selection
    if(game.finalscoring == 2 && built_sa(player) > 0) s.b_sh += 6;
    if(game.finalscoring == 2 && built_sh(player) > 0) s.b_sa += 5;
  }

  //Faction specific
  AILou.xfaction = player.faction + 1;

  if(player.faction == F_CHAOS) {
    s.b_tp += 4;
    s.b_sh -= 3;
    s.b_te += 2;
    makeTemple(1,0,0,0,0);
    if (roundnum <= 2) {
      s.b_tp += 50;
      s.specific[A_POWER_7C] = -50;
      s.specific[A_POWER_2W] = -50;
    }
    s.specific[A_POWER_1P] = 0;
    if(roundnum > 2) makeTemple(2,0,0,4,3);
    if(player.shipping == 0) s.shipping += 5;
  }

  if(player.faction == F_GIANTS) {
    makeSHEssential(5, 10, 0, player.w > 6 ? 15:0);
    if(roundnum > 3) makeTemple (1,10,5,0,5);
    if(roundnum > 4) makeShipping(1,0,0,0,0);
  }

  // build TE (70%)
  if(player.faction == F_FAKIRS) {
    // Get temple early for priest income
    makeTemple (1,10,10,15,20);
    if(built_sh(player)) s.digging = 0;  //they should go to non-dig places instead
    // There is nothing for stronghold here because quite frankly it is expensive and not that good
    s.b_sh = 0;
  }

  // either SH first (68%) or TE first
  if(player.faction == F_NOMADS) {
    if(player.bonustile == T_BON_PASSSHSAVP_2W || player.bonustile == T_BON_PASSDVP_2C
      || player.bonustile == T_BON_SPADE_2C || player.bonustile == T_BON_6C) {
      makeSHEssential(0,0,0,0);
      if(roundnum > 2) makeTemple(1,10,player.w > 6 ? 0:5,player.w > 6 ? 10:0, player.w > 6 ? 10:0);
    }
    else {
      makeTemple(1,10,player.w > 6 ? 0:5,player.w > 6 ? 5:0, player.w > 6 ? 5:0);
      if(roundnum > 2) makeSHEssential(10, player.w > 6 ? 0:5, player.w > 7 ? 5:0, player.w > 7 ? 5:0);
    }
    if(roundnum > 4) makeShipping(1,0,0,0,0)
    if(player.pw2 >= 4) s.specific[A_POWER_7C] = player.c < 9 ? 12 : 6;
    if(roundnum > 4 && (player.pw0 + player.pw1) <= 1) {
      s.specific[A_POWER_1P] = 8;
      if(player.c > 2*player.w) {
        s.specific[A_POWER_2W] = 10;
      } else {
        if (player.w < 7) s.specific[A_POWER_2W] = 10;
        s.specific[A_POWER_7C] = 14;
      }
    }
   }

  //look for spade>>2 in round 4
  if(player.faction == F_HALFLINGS) {
    s.digging = 20;
    s.b_sh = built_te(player) > 0 ? 6 : 0;
    if(roundnum < 6) s.b_d += 2;
    // Do get some dwellings first
    if(built_d(player) > 2) makeTemple (1,0,0,0,0);
    if(roundnum < 3 && player.p == 0) s.specific[A_POWER_1P] += 10;
    if(roundnum > 4) makeShipping(1,0,0,0,0);
  }

  //build TE (72%)
  if(player.faction == F_CULTISTS) {
    if(roundnum < 5) s.b_sh = 0; //don't waste resources on the SH
    else s.b_sh = 7;
    s.interacts += 2;
    if(roundnum > 1) makeTemple (1,0,0,0,0);
    if(roundnum > 4) makeShipping(1,0,0,0,0);
  }

  if(player.faction == F_ALCHEMISTS) {
    if(roundnum < 2) {
      makeSHEssential(0, 0, 0, 0);
      s.specific[A_POWER_SPADE] = 10;
      s.specific[A_POWER_2SPADE] = 20;
    }
    makeSHEssential(5, 10, 0, player.w > 4 ? 15 : 0);
    if(roundnum < 6) s.b_d += 2; //because alchemists will be low on workers
    if(roundnum > 4) makeShipping(1,0,0,0,0);
    s.specific[A_POWER_7C] = 0; //alchemists can get coin from VP
  }

  if(player.faction == F_DARKLINGS) {
    s.p += 2;
    s.dig += 2; //otherwise they'll refuse to use the priests for the digging...
    s.b_sh = (player.w >= 7 && player.c >= 6) ? 10 : -5;
    //only build SH if can convert 3w to 3p and must not burn too much manna (coin from 4 to 6)
    if(roundnum < 6) s.b_te += 5;  //get more priests for digging
    //SA here produces two priests, so is good before round 6
    if(AILou.ail > 1 && (roundnum == 4 || roundnum == 5)) {
      s.b_sa += 3;
      if(built_te(player) > 0) s.b_te -= 2;
    }
    if(roundnum > 4) makeShipping(1,0,0,0,0);
  }

  //build TE (63%); defer town?
  if(player.faction == F_MERMAIDS) {
    if (roundnum >= 2) makeTemple (1,0,0,3,9);
    if(roundnum < 6) s.b_te += 5;
    if(roundnum < 6) s.b_d += 10;
    if (player.pw2 >= 4) s.specific[A_POWER_7C] = player.c < 9 ? 12:6;
    s.bridge = -50;  // rarely build bridges
    s.forbridge = -50;
    if(game.finalscoring == 2) s.b_sh += 4;
    //increase shipping for shipVP bonus
    s.shipping += player.shipping;
    if (player.bonustile[T_BON_PASSSHIPVP_3PW] || game.bonustiles[T_BON_PASSSHIPVP_3PW]) {
      if(player.shipping < 3) s.shipping += 3;
      if(player.shipping >= 3 && roundnum > 4) s.shipping += 6;
    }
    if (player.shipping == 5) s.shipping = 0;
  }

  //SH gives free TP per round
  if(player.faction == F_SWARMLINGS) {
    if(roundnum > 1) makeSHEssential(10, 10, 0, player.w > 6 ? 15:0);
    //only in round 2 because I think early SH for swarmlings results in too few dwellings ==> no worker income
    //all their buildings must have increased score, or they'll refuse to spend resources on them
    if(roundnum < 6) {
      s.b_d++;
      s.b_tp++;
      s.b_te++;
      s.b_sh++;
      s.b_sa++;
    }
    if(roundnum > 2) makeTemple(1,0,0,0,0);
    //SA here produces two priests, so is good before round 6
    if(AILou.ail > 1 && (roundnum == 4 || roundnum == 5)) {
      s.b_sa += 3;
      if(built_te(player) > 0) s.b_te -= 2;
    }
    if(roundnum > 4) makeShipping(1,0,0,0,0);
  }

  // most SH start (72%) with 3D, but TE does better
  if(player.faction == F_AUREN) {
    if(roundnum >= 4) s.b_sh += 5;
    if(roundnum > 4) makeShipping(1,0,0,0,0);
    s.specific[A_POWER_7C] -= 3;
  }

  //build SH (50%) soon  LOU15 change priority to temple and cult track
  if(player.faction == F_WITCHES) {
    if(roundnum >= 1) makeTemple(1,0,0,0,0);      
    else if(roundnum >= 3) {
      if(game.finalscoring == 2 && built_sh(player) == 0) {
        if(built_d(player) >= 2 && built_tp(player) == 0) s.b_tp += 5;
        s.b_sh += 5;
      }
      else if(game.finalscoring == 3) {
        s.b_sh += 2;
        if(built_d(player) >= 2 && built_tp(player) == 0) s.b_tp += 2;
      }
    }
    //LOU13 probability of anolther TE too small
    if(built_sh(player) == 1 && built_te(player) == 0) s.b_te += roundnum+0.5;
    s.t_tw += 5;  //get extra 5VP for making town
    s.bridge -= 2;  //avoid unneeded bridge from E9-D11 in F&I World
    if(roundnum >= 3 && player.bonustile == T_BON_3PW_SHIP) makeShipping(1,0,0,0,0);
    if(roundnum >= 4 && game.finalcoring != 2) makeTemple(2,0,0,0,0);
  }

  //repairs needed; build TE (75%) two TE to get the 5PW; ENG_BRIDGE fix, not ship
  if(player.faction == F_ENGINEERS) {
    s.w += 0.5; //do NOT make this number any higher. Setting it to += 1 makes engineers build nothing anymore...
    if(roundnum >= 5) s.conbridge = 6;
    s.forbridge = 0;
    s.shipping -= 2;
    s.b_sa -= 3;
    if(roundnum == 1 && built_d(player) > 1) s.b_tp += 3;
    if(roundnum == 1 && built_te(player) == 0) s.b_te += 5;
    if(roundnum <= 4 && built_te(player) == 1) s.b_te += 3;
    if(built_te(player) >= 2) s.b_te -= 9;
    if(built_tp(player) >= 2) s.b_tp -= 9;

    if(roundnum >= 4 && game.finalscoring == 2) s.b_sh += 6;
    if(built_bridges(player) && built_sh(player) == 0) {
      s.b_sh += 10;
      if(built_tp(player) == 0) {
        s.b_tp += 10;
        s.b_te = -10;
      }
    }
    if(roundnum < 6) s.digging = -5;
    if(built_d(player) < 3) s.b_d += 5;
    if(built_d(player) >= 3) s.b_d += 2;
    s.specific[A_POWER_7C] -= 2;
    s.specific[A_POWER_2W] += 2;
    if (roundnum >= 5 && built_sh(player) == 1) {
      s.conbridge += 6;
      s.shipping -= 5;
    }
    //once shipping, then SH or SA are less useful
    if(player.shipping > 0 && game.finalscoring != 2) {
      s.b_sh -= 4;
      s.b_sa -= 4;
      s.conbridge = 0;
    }
    //if not SH-SA, not need SA as much
    if(game.finalscoring != 2) s.b_sa -= 2;
    //prefer D to TP since more W needed for faction
    if(built_tp(player) == 1) s.b_tp -=3;
  }

  //Dwarves - should TE be earlier?
  if(player.faction == F_DWARVES) {
    s.digging = 0; //they should go to non-dig places instead
    s.b_tp -= 1;
    if(built_d(player) > 7) s.b_tp += 2;
    s.c -= 0.05;  //coin surplus in most games
    s.specific[A_POWER_1P] += 2;
    s.specific[A_POWER_7C] -= 4;
    if(roundnum >= 3 && built_te(player) == 0) s.b_te += 1.5;
  }

  //add tuning for fireice factions:
  //IceMaidens have free FavorTile, get 3 VP per TE on Pass when SH
  if(player.faction == F_ICEMAIDENS) {
    s.b_te += 2.0;
    s.specific[A_POWER_1P] = 0;
    if(roundnum >= 1) makeTemple(1,0,0,4,2);
    if(roundnum > 2) makeTemple(2,0,0,5,3);
    if(roundnum > 4) makeShipping(1,0,0,6,4);
    //LOU12 digging is beneficial to ice factions
    s.digging += 2;
    if(built_te(player) >= 2) s.b_sh += 11;
    if(built_sh(player) && game.finalscoring != 2) s.b_sa -= 5;
    s.specific[A_POWER_7C] -= 2;
  }

  //TE first (55%), or SH(23%); has higher value for PW, better with SH
  if(player.faction == F_YETIS) {
    // yeti get a discount on power actions and can overlay with SH
    s.specific[A_POWER_1P] = player.p < 2 ? 6 : 3;
    s.specific[A_POWER_2W] = player.w < 4 ? 4 : 2;
    s.specific[A_POWER_7C] = player.c < 6 ? 6 : 3;
    s.specific[A_POWER_SPADE] = 6;
    s.specific[A_POWER_2SPADE] = 8;
    if(getRoundTile() == T_ROUND_SHSA5VP_2F1W || getRoundTile() == T_ROUND_SHSA5VP_2A1W) {
      makeSHEssential(0,0,0,0);
    }
    else if(built_d(player) > 2) makeTemple(1,0,0,0,0);
    //LOU12 digging is beneficial to ice factions
    s.digging += 2;
    //need to keep more tokens for later use
    if(roundnum < 6) {
      s.burn = -.3;
      s.b_te += 3;
      s.b_sh += 4;
      s.maxburn = 8;
    }
    if(roundnum > 4) makeShipping(1,player.c > 8 ? 0:4,0,1,2);
  }

  if(player.faction == F_ACOLYTES) {
    if(roundnum > 2) makeTemple(1,0,0,0,0);
    if(roundnum > 4) makeShipping(1,0,0,0,0);
    s.b_tp -= 1;
  }

  //Add special tuning for Dragonlords to make SH after Round 1 and keep 4 Power
  if(player.faction == F_DRAGONLORDS) {
    if(roundnum > 1) {
      makeSHEssential(10, 5, -50, -50);
    }
    if(roundnum > 4) makeShipping(1,player.c > 8 ? 0:10,0,0,0);
    //see strategy.js for dig implementation
    if((player.pw0 + player.pw1 + player.pw2) <= 5) s.digging = 0;
  }

  if(player.faction == F_SHAPESHIFTERS) {
    if(player.bonustile == T_BON_3PW_SHIP || player.bonustile == T_BON_PASSDVP_2C) {
      makeTemple(1,0,0,0,0);
    } else if(player.bonustile == T_BON_PASSSHSAVP_2W) {
      makeSHEssential(0, 0, 0, 0);
    } else {
      if(roundnum > 1  && !state.fireiceerrata) makeSHEssential(0, 0, 0, 0);
      if(roundnum > 2) makeTemple(1,0,0,0,0);
    }
    if(roundnum > 4) makeShipping(1,0,0,0,0);
    if(roundnum < 6) s.b_sa = 1;
    s.specific[A_POWER_7C] -= 2;
    s.specific[A_POWER_2W] -= 1;
    //allow AI action when SH is built to spend 3/5 tokens or 3/5 power to change free color
    if(player.b_sh == 0) {
      var oldColor = player.auxcolor;
      newColor = oldColor;   //from strategy.js
      useToken = 0;          //from strategy.js
      var result = AILou.getNewAuxColor(player, oldColor); //get shift color and value
      var shiftcost = state.fireiceerrata ? 5 : 3;
      if(result >= 2 && player.pw2 >= shiftcost) s.shift = result + 8;
      else if(result >= 2 && player.pw2 == shiftcost-1) s.shift = result + 4;
      if(roundnum == 6 && player.pw0+player.pw1 >= shiftcost) {
        s.shift2 = 6; // will get 2VP at end even if not used
        useToken = shiftcost;
      }
    }
  }

  if(player.faction == F_RIVERWALKERS) {
    s.shipping = 0;
    // generally need more coin and priest, not workers
    s.specific[A_POWER_1P] = roundnum < 3 ? 4 : 3;
    s.specific[A_POWER_2W] -= 3;
    s.specific[A_POWER_SPADE] = -50;
    s.specific[A_POWER_2SPADE] = -50;
    //build temple early for priest
    makeTemple(1,10,0,0,0);
    //gain from two temples later, avoid sanctuary
    if(roundnum < 4) {
      s.b_tp -= 1;
      s.b_te -= 2;
    } else {
      makeTemple(2,5,0,0,0);
    }

    s.b_sa = 0;
    s.b_d += 4;
    if(roundnum > 5) {
      s.b_d += 2;
      s.b_sh += 4;
    }

    //LOU12 improve odds of SH in rounds 4 and 5, avoid building bridges pending 2 bridge build
    if(roundnum == 4) {
      if(getRoundTile() == T_ROUND_SHSA5VP_2F1W || getRoundTile() == T_ROUND_SHSA5VP_2A1W) {
        s.b_sh += 5;
        if(built_sh(player) == 0) s.bridge -=10;
      }
      if(getRoundTileP1() == T_ROUND_SHSA5VP_2F1W || getRoundTileP1() == T_ROUND_SHSA5VP_2A1W) {
        s.b_sh -= 5;
        s.t_tw -= 5;
        if(built_sh(player) == 0) s.bridge -= 10;
      }
    }
    else if(roundnum == 5) {
      if(getRoundTile() == T_ROUND_SHSA5VP_2F1W || getRoundTile() == T_ROUND_SHSA5VP_2A1W) {
        s.b_sh += 5;
        if(built_sh(player) == 0) s.bridge -=10;
      }
      if(game.finalscoring == 2) {
        s.b_sh += 10;
        if(built_sh(player) == 0) s.bridge -=10;
      }
    }
    else if(roundnum == 6 && game.finalscoring == 2 && built_sh(player) > 0) s.b_sa += 15;

    //must use power if full or less than replacement (SPADE not allowed)
    if(roundnum > 4 && (player.pw0 + player.pw1) <= 1) {
      s.specific[A_POWER_1P] = 10;
      if(player.c > 2*player.w) {
        s.specific[A_POWER_2W] = 12;
      } else {
        if (player.w < 7) s.specific[A_POWER_2W] = 12;
        s.specific[A_POWER_7C] = 16;
      }
    }
    s.existingtown = -4;
  }

/* general strength from terra.snellman.net + BGG suggestions
Rating	Name	        Games
1141	shapeshifters	612	color brown,gray,yellow
1086	riverwalkers	618	color red,yellow,brown = get to correct spaces
1074	darklings		5862	build 3-4D, P bonus, build TE soon
1044	chaosmagicians	5671	build TE/SA, four tiles 1E, 1F, 2A, 2E
1040	nomads		4988	build TE/2TP/SH, tile 1E, bonus 2W, SH start
1031	mermaids		4335	build 3D+TP, TE soon, tile 1E, ship ship track/nonus
1029	cultists		2859	build TE, tile 1E
1027	witches		4506	build 4D/ SH, bonus 2W, SH start
1021	swarmlings		4290	build 3D+TE/ SH+TE, tile 1E, 1A
995	giants		2342	build SH, 2W bonus, SH start
991	halflings		4754	build 4D or TE, tile 1E, P bonus, up build track
966	dragonlords		643	build 4D, SH second turn
961	icemaidens		578	build TE
959	engineers		3192	build 4D/2TE(common), tile 2E
955	fakirs		1528	avoid in standard game
953	dwarves		3187	build TE or SA, tile 1E
948	yetis			718	build TE
943	auren			2170	4D is good, otherwise build SH
930	alchemists		3027	build SH, use 10 VP for $
894	acolytes		427	avoid in expansion
*/

//LOU check to see how much shipping will benefit network
//LOU compute score, add 1 to shipping, determine benefit
//LOU give score to shipping based on benefit, return shipping value to original
//LOU if benefit is high, reserve resources for shipping for later use.

//scoreProjection returns array of projected end game scores per player.
//Per player it's an array of: total, cult, network, final, resource, passing
//if(state.round == 6) scoreProjection = projectEndGameScores();
//var p = scoreProjection[player.index];
 if(player.faction == F_FAKIRS || player.faction == F_DWARVES
   || player.faction == F_RIVERWALKERS || roundnum < 6 ) {
 } else {
  var reserveOneShip = 0;
  var reserveTwoShip = 0;
  var reserveThreeShip = 0;
  var reserveTotal = 0;
  var scoreNow = [];
  var scoreShip1 = [];
  var scoreShip2 = [];
  var scoreShip3 = [];
  var scoreProjection = [];
  var xplayerp = player.p;
  var xplayerc = player.c;
  var xplayers = player.shipping;
  var adjustCoin = 0;
  var shipVP = 0;

  //get more coin if needed
  if((player.c < 4) && (player.getFaction().canTakeAction(player, A_POWER_7C, game))) {
    s.specific[A_POWER_7C] += 20;
  } else {
  if(player.c == 7 && player.p > 1 && (player.pw2 > 0 || player.w > 0)) adjustCoin = 1;
  if(player.c == 3 && player.p > 0 && (player.pw2 > 0 || player.w > 0)) adjustCoin = 1;
  if(player.c == 2 && player.p > 0 && (player.pw2 > 1 || player.w > 1)) adjustCoin = 2;
  if(player.c == 1 && player.p > 0 && (player.pw2 > 2 || player.w > 2)) adjustCoin = 3;
  if(player.c == 0 && player.p > 0 && player.w > 3) adjustCoin = 4;

  //determine value of more shipping
  if(player.p > 0 && player.c > (3-adjustCoin) && player.shipping < 3) {
    //if(AILou.info) addLog('SHIP: AI endship for: ' + logPlayerNameFun(player) );
    scoreProjection = projectEndGameScores();
    scoreNow = scoreProjection[player.index];
    if(AILou.info) addLog('SHIP: AI endship scoreNow: ' + scoreNow);
    player.p--;
    player.c -= 4;
    player.shipping++;
    shipVP = player.shipping+1;
    scoreProjection = projectEndGameScores();
    scoreShip1 = scoreProjection[player.index];
    scoreShip1[0] += shipVP;
    if(AILou.info) addLog('SHIP: AI scoreShip1 num_'+ player.shipping +': ' + scoreShip1);
    if (scoreShip1[0] > (scoreNow[0] + 6)) {
      reserveOneShip = scoreShip1[0] - scoreNow[0];
    }
    if (player.p > 0 && player.c > (3-adjustCoin)  && player.shipping < 3) {
      player.p--;
      player.c -= 4;
      player.shipping++;
      shipVP = player.shipping+1;
      scoreProjection = projectEndGameScores();
      scoreShip2 = scoreProjection[player.index];
      scoreShip2[0] += shipVP;
      if(AILou.info) addLog('SHIP: AI scoreShip2 num_'+ player.shipping +': ' + scoreShip2);
      if (scoreShip2[0] > (scoreShip1[0] + 8)
        && scoreShip2[0] > (scoreNow[0] + 10) ) {
        reserveTwoShip = scoreShip2[0] - scoreShip1[0];
      }
    }
    if (player.p > 0 && player.c > 3 && player.shipping < 3) {
      player.p--;
      player.c -= 4;
      player.shipping++;
      shipVP = player.shipping+1;
      scoreProjection = projectEndGameScores();
      scoreShip3 = scoreProjection[player.index];
      scoreShip3[0] += shipVP;
      if(AILou.info) addLog('SHIP: AI scoreShip3 num_'+ player.shipping +': ' + scoreShip3);
      if (scoreShip3[0] > (scoreShip2[0] + 10)
        && scoreShip3[0] > (scoreShip1[0] + 12)
        && scoreShip3[0] > (scoreNow[0] + 14)  ) {
        reserveThreeShip = scoreShip3[0] - scoreShip2[0];
      }
    }
    reserveTotal = reserveOneShip + reserveTwoShip + reserveThreeShip;

    //temporary to see if reserve is needed
    if (reserveTotal > 0) s.shipping += reserveTotal + 4;
    else s.shipping = 0;

    player.p = xplayerp;
    player.c = xplayerc;
    player.shipping = xplayers;
   }
  }
 }

//NEXT- There are many VP for the following: (Use scoreProjection, then undo)
// 1. Dwelling placement to extend network
// 2. Stronghold for bonus VP and sh_sa
// 3. Sanctuary for town and sh_sa
// 4. TODO Project several turns ahead

  // Final finetuning
  if(built_te(player) + built_sa(player) == 0) s.b_te += 2;
  if(built_d(player) == 8) s.b_tp += s.b_d; //make room for more dwellings
  if(built_tp(player) == 4) s.b_te += s.b_tp; //make room for more tps
  if(built_d(player) < 2) s.b_tp = 0; //ensure to have some worker income
  s.specific[A_CONVERT_5PW_1P] = -10; //no matter how good that action for some races, don't burn 5 pw for it...

  // Update restrictions based on that too
  this.restrictions = {
    w_cost: s.w,
    p_cost: s.p,
    pw_cost: s.pw,
    burn_cost: -s.burn,
    max_burn: (roundnum < 6 ? s.maxburn : 4),
    digFun: defaultRestrictions.digFun
  };
};

AILou.prototype.scoreActionAI_ = function(player, actions, roundnum) {
  return AILou.scoreAction(player, actions, this.scoreActionValues, roundnum);
};

//bonus tiles chosen from world
AILou.prototype.getPreferredBonusTile_ = function(player) {
  if(!this.scoreActionvalues) this.updateScoreActionValues_(player, state.round);

  var avtiles = [];
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) {
    if(game.bonustiles[i]) avtiles.push(i);
  }

  var scores = [];
  for(var i = 0; i < avtiles.length; i++) {
    scores.push(this.scoreBonusTile_(player, avtiles[i], state.round));
  }
  if(AILou.info) {
    var scores2 = [];
    for(var i = 0; i < scores.length; i++) {
      scores2[i] = Math.round(scores[i]*100)/100;
    }
    addLog('BONUS: bonus tile: '+AILou.xfaction+' tiles '+avtiles+' scores '+scores2);
  }
  return avtiles[AILou.pickWithBestScore(avtiles, scores, false)];
};

AILou.prototype.scoreBonusTile_ = function(player, tile, roundnum) {
  var score = 0;
  var s = this.scoreActionValues;

  if(tile == T_BON_SPADE_2C) {
    AILou.ybonus = 1;
    var r = getNumTilesReachable(player, true);
    //if there are almost no no-dig tiles, and several 1- or 2-dig tiles, digging is useful
    if(r[0] < 2 && (r[1] > 1 || r[2] > 1)) {
      var digcost = player.getActionCost(A_SPADE);
      score += digcost[1] * s.w + digcost[1] * s.p;
      score += s.digging;
    }
    score += s.c * 2;
  }
  else if(tile == T_BON_CULT_4C) {
    AILou.ybonus = 2;
    score += s.c * 4;
    score += s.cult[0][0];
    if(player.c < 8) score++;
  }
  else if(tile == T_BON_6C) {
    AILou.ybonus = 3;
    score += s.c * 6;
    if(player.c < 8) score += 2;
  }
  else if(tile == T_BON_3PW_SHIP) {
    AILou.ybonus = 4;
    score += s.pw * 3;
    if(roundnum < 3) score += getNumFreeTilesReachableByShipping(player, player.shipping + 1)[0] * 3;
    if(roundnum < 3 && player.faction != F_NOMADS && player.faction != F_HALFLINGS) score++; //TODO what is the value of shipping?
  }
  else if(tile == T_BON_3PW_1W) {
    AILou.ybonus = 5;
    score += s.pw * 3;
    score += s.w;
  }
  else if(tile == T_BON_PASSDVP_2C) {
    AILou.ybonus = 6;
    score += s.c * 2;
    score += 1 * built_d(player); //todo: it must use the number of dwellings it expects to have built next round here
    if(roundnum > 3) score++;
  }
  else if(tile == T_BON_PASSTPVP_1W) {
    AILou.ybonus = 7;
    score += s.w * 1;
    score += 1 * built_tp(player) * 2; //todo: idem
    if(roundnum > 3) score++;
  }
  else if(tile == T_BON_PASSSHSAVP_2W) {
    AILou.ybonus = 8;
    score += s.w * 2;
    score += (built_sh(player) + built_sa(player)) * 4; //todo: idem
    if(roundnum > 3) score++;
  }
  else if(tile == T_BON_1P) {
    AILou.ybonus = 9;
    score += s.p * 1;
  }
  else if(tile == T_BON_PASSSHIPVP_3PW) {
    AILou.ybonus = 10;
    score += player.shipping * 3 + s.pw * 3;
  }

  //LOU Add extra score for the coins on the bonus tile
  score += s.c * undef0(game.bonustilecoins[tile]);

  //Add starting preference score for the faction and the bonus tile
  var BONUS_PREF = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0],
    [0,3,1,3,3,3,3,0,0,4,2,1,2,3,3, 3,4,1,1,2,-9], // T_BON_SPADE_2C     (BON1)
    [0,0,2,1,2,1,4,0,1,2,1,0,3,3,0, 1,3,2,3,2,5],  // T_BON_CULT_4C      (BON2)
    [0,0,2,2,3,1,1,0,1,3,1,0,1,1,0, 1,2,2,4,1,4],  // T_BON_6C           (BON3)
    [0,2,3,0,0,1,1,1,1,6,1,5,6,1,0, 1,1,1,2,3,-9], // T_BON_3PW_SHIP     (BON4)
    [0,3,2,1,1,2,2,4,3,0,1,0,4,3,3, 4,4,1,2,3,0],  // T_BON_3PW_1W       (BON5)
    [0,0,2,1,5,2,1,1,1,1,2,0,2,1,1, 2,2,2,1,3,2],  // T_BON_PASSDVP_2C   (BON6)
    [0,2,1,1,0,1,1,1,1,0,1,0,1,1,2, 1,0,1,1,1,0],  // T_BON_PASSTPVP_1W  (BON7)
    [0,4,5,1,8,1,0,5,2,1,2,0,1,1,1, 3,1,1,4,4,0],  // T_BON_PASSSHSAVP_2W(BON8)
    [0,2,1,3,1,0,2,3,5,1,2,0,1,1,1, 1,0,2,1,1,6],  // T_BON_1P           (BON9)
    [0,0,1,0,0,1,1,1,1,2,1,0,1,0,0, 0,0,1,1,3,-2]  // T_BON_PASSSHIPVP_3PW(BON10)
    ];
  if(roundnum <= 1) score += BONUS_PREF[Math.floor(AILou.ybonus)][Math.floor(AILou.xfaction)];

  //Add middle preference score for the faction and the bonus tile
  var BONUS_PREF2 = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0],
    [0,2,0,2,3,2,2,0,0,2,2,1,1,2,2, 3,3,0,0,1,-9], // T_BON_SPADE_2C     (BON1)
    [0,2,0,2,2,2,2,0,0,2,1,0,1,2,0, 1,2,1,2,1,2],  // T_BON_CULT_4C      (BON2)
    [0,0,2,1,3,0,0,0,0,0,0,0,0,0,0, 3,1,1,2,0,2],  // T_BON_6C           (BON3)
    [0,1,1,0,0,0,0,2,0,1,0,2,3,0,0, 1,2,0,1,2,-9], // T_BON_3PW_SHIP     (BON4)
    [0,1,1,0,1,1,1,2,1,0,0,0,2,1,1, 3,3,0,0,2,1],  // T_BON_3PW_1W       (BON5)
    [0,1,1,1,2,2,1,1,2,2,2,0,2,1,1, 2,1,2,2,2,3],  // T_BON_PASSDVP_2C   (BON6)
    [0,1,2,1,2,1,1,3,2,2,4,0,1,1,2, 1,1,1,1,1,0],  // T_BON_PASSTPVP_1W  (BON7)
    [0,1,1,1,2,1,1,2,1,0,1,0,1,1,1, 0,1,0,0,0,1],  // T_BON_PASSSHSAVP_2W(BON8)
    [0,1,0,1,1,1,1,1,3,0,0,0,0,0,1, 1,0,2,1,1,2],  // T_BON_1P           (BON9)
    [0,1,0,0,0,0,0,0,1,4,0,0,1,0,0, 1,0,0,0,1,-2]  // T_BON_PASSSHIPVP_3PW(BON10)
    ];
  if(roundnum ==2 || roundnum == 3 )
    score += BONUS_PREF2[Math.floor(AILou.ybonus)][Math.floor(AILou.xfaction)]

  //Add end preference score for the faction and the bonus tile
  var BONUS_PREF3 = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0],
    [0,0,0,1,0,0,0,0,0,1,2,0,1,0,1, 2,1,0,2,0,-9], // T_BON_SPADE_2C     (BON1)
    [0,0,0,0,0,0,2,0,0,1,0,0,0,0,1, 0,2,0,0,0,2],  // T_BON_CULT_4C      (BON2)
    [0,0,0,0,2,0,0,0,0,0,0,0,0,0,0, 2,1,0,0,0,2],  // T_BON_6C           (BON3)
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 1,1,0,0,1,-9], // T_BON_3PW_SHIP     (BON4)
    [0,0,0,0,0,1,0,0,0,0,0,0,0,0,1, 3,1,0,0,3,-3], // T_BON_3PW_1W       (BON5)
    [0,1,2,1,4,3,1,1,5,3,2,0,2,1,2, 3,2,2,3,2,5],  // T_BON_PASSDVP_2C   (BON6)
    [0,1,2,1,2,1,1,4,3,2,4,0,1,1,2, 1,2,1,0,1,3],  // T_BON_PASSTPVP_1W  (BON7)
    [0,1,2,0,5,0,1,3,2,1,2,0,1,1,1, 1,2,1,4,5,1],  // T_BON_PASSSHSAVP_2W(BON8)
    [0,1,0,1,1,0,1,2,2,0,1,0,1,1,1, 1,0,2,0,1,2],  // T_BON_1P           (BON9)
    [0,1,1,0,1,0,1,1,0,6,1,0,1,0,0, 1,1,0,0,3,-2]  // T_BON_PASSSHIPVP_3PW(BON10)
    ];
  if(roundnum >= 4) score += BONUS_PREF3[Math.floor(AILou.ybonus)][Math.floor(AILou.xfaction)]

  return score;
};


//favor tile chosen from given array
AILou.prototype.getPreferredFavorTile_ = function(player, tiles) {
  var scores = [];
  for(var i = 0; i < tiles.length; i++) {
    scores.push(this.scoreFavorTile_(player, tiles[i], state.round));
  }

  return tiles[AILou.pickWithBestScore(tiles, scores, false)];
};

function getPlayerTownSize(color, clusters, size) {
  var result = [];
  for(var i = 1; i < clusters.length; i++) {
    if(getTownClusterColor(i) == color && clusters[i].power == size && clusters[i].townamount >= TOWNWAMOUNT) result.push(i);
  }
  return result;
}

function getPlayerFavorPref(xfaction, yfavor) {
  //Add starting preference score for the faction and the favor tiles
  var FAVOR_PREF = [
    [0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0],
    [0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0],  // T_FAV_3F       (FAV1)
    [0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0],  // T_FAV_3W       (FAV2)
    [0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0],  // T_FAV_3E       (FAV3)
    [0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0],  // T_FAV_3A       (FAV4)
    [0,0,2,0,3, 0,0,2,4,1,1,0,2,0,0, 2,1,0,0,2,4],  // T_FAV_2F_6TW   (FAV5)
    [0,0,1,0,0, 0,3,0,0,2,2,4,0,0,0, 2,2,0,1,0,0],  // T_FAV_2W_CULT  (FAV6)
    [0,4,0,0,0, 3,2,0,0,0,0,0,0,4,3, 3,2,0,1,0,0],  // T_FAV_2E_1PW1W (FAV7)
    [0,5,0,2,0, 0,1,0,0,0,0,0,2,2,2, 2,8,0,4,3,0],  // T_FAV_2A_4PW   (FAV8)
    [0,3,0,2,0, 0,0,0,0,0,0,0,0,0,0, 1,0,0,1,0,0],  // T_FAV_1F_3C    (FAV9)
    [0,3,2,0,3, 0,0,0,0,4,6,0,2,0,1, 4,3,0,3,3,3],  // T_FAV_1W_TPVP  (FAV10)
    [0,0,3,2,6, 4,0,0,5,5,0,0,4,1,2, 4,1,0,3,5,6],  // T_FAV_1E_DVP   (FAV11)
    [0,0,0,0,0, 0,0,0,0,0,4,0,0,0,0, 0,0,0,0,0,0]   // T_FAV_1A_PASSTPVP (FAV12)
    ];
  var result = 0;
  result = FAVOR_PREF[Math.floor(yfavor)][Math.floor(xfaction)];
  return result;
}

AILou.prototype.scoreFavorTile_ = function(player, favtile, roundnum) {
  //Add starting preference score for the faction and the favor tiles
  var score = 0;
  AILou.yfavor = 0;
  var scoreProjection = projectEndGameScores();
  var scoreFavor0 = scoreProjection[player.index];
  var scoreFavor1 = [0,0,0,0,0,0];
  var deltaVP = 0;

  //LOU increase value for 3cult if round 6
  if(favtile == T_FAV_3F) {
    AILou.yfavor = 1;
    if(player.cult[C_F] < 8) {
      score++;
      if(roundnum == 6) {
        player.cult[C_F] += 3;
        player.favortiles[favtile] = 1;
        scoreProjection = projectEndGameScores();
        scoreFavor1 = scoreProjection[player.index];
        deltaVP = scoreFavor1[0] - scoreFavor0[0];
        player.favortiles[favtile] = 0;
        player.cult[C_F] -= 3;
        score += deltaVP;
        if(AILou.info)
        addLog('FAVOR GameVP score: '+scoreFavor1+' getFavor: '+tileToStringLong(favtile, 1)+' deltaVP: '+deltaVP);
      }
    }
  }
  else if(favtile == T_FAV_3W) {
    AILou.yfavor = 2;
    if(player.cult[C_W] < 8) {
      score++;
      if(roundnum == 6) {
        player.cult[C_W] += 3;
        player.favortiles[favtile] = 1;
        scoreProjection = projectEndGameScores();
        scoreFavor1 = scoreProjection[player.index];
        deltaVP = scoreFavor1[0] - scoreFavor0[0];
        player.favortiles[favtile] = 0;
        player.cult[C_W] -= 3;
        score += deltaVP;
        if(AILou.info)
        addLog('FAVOR GameVP score: '+scoreFavor1+' getFavor: '+tileToStringLong(favtile, 1)+' deltaVP: '+deltaVP);
      }
    }
  }
  else if(favtile == T_FAV_3E) {
    AILou.yfavor = 3;
    if(player.cult[C_E] < 8) {
      score++;
      if(roundnum == 6) {
        player.cult[C_E] += 3;
        player.favortiles[favtile] = 1;
        scoreProjection = projectEndGameScores();
        scoreFavor1 = scoreProjection[player.index];
        deltaVP = scoreFavor1[0] - scoreFavor0[0];
        player.favortiles[favtile] = 0;
        player.cult[C_E] -= 3;
        score += deltaVP;
        if(AILou.info)
        addLog('FAVOR GameVP score: '+scoreFavor1+' getFavor: '+tileToStringLong(favtile, 1)+' deltaVP: '+deltaVP);
      }
    }
  }
  else if(favtile == T_FAV_3A) {
    AILou.yfavor = 4;
    if(player.cult[C_A] < 8) {
      score++;
      if(roundnum == 6) {
        player.cult[C_A] += 3;
        player.favortiles[favtile] = 1;
        scoreProjection = projectEndGameScores();
        scoreFavor1 = scoreProjection[player.index];
        deltaVP = scoreFavor1[0] - scoreFavor0[0];
        player.favortiles[favtile] = 0;
        player.cult[C_A] -= 3;
        score += deltaVP;
        if(AILou.info)
        addLog('FAVOR GameVP score: '+scoreFavor1+' getFavor: '+tileToStringLong(favtile, 1)+' deltaVP: '+deltaVP);
      }
    }
  }
  else if(favtile == T_FAV_2F_6TW) {
    AILou.yfavor = 5;
    if(upgradeSA >= 0) score = -1;
    else if(getPlayerFavorPref(AILou.xfaction, AILou.yfavor) > 0 ) {
      if(roundnum == 4 || roundnum == 5) {
       score += (6-roundnum);
       if (getRoundTileP1() == T_ROUND_TW5VP_4E1DIG) score += 2;
       if (getRoundTile() == T_ROUND_TW5VP_4E1DIG) score += 2;
       //LOU11 alter comment
       if (score >= 3 && AILou.info) addLog('FAVOR6tw for: ' + logPlayerNameFun(player) + ' score: ' + score);
      }
      else if(roundnum == 6) {
        player.cult[C_F] += 2;
        player.favortiles[favtile] = 1;
        scoreProjection = projectEndGameScores();
        scoreFavor1 = scoreProjection[player.index];
        deltaVP = scoreFavor1[0] - scoreFavor0[0];
        player.favortiles[favtile] = 0;
        player.cult[C_F] -= 2;
        //LOU12 look for size 6 town
        var town6 = getPlayerTownSize(player.woodcolor, townclusters, 6);
        if(town6.length > 0) {
          deltaVP += 8;
          addLog('NEWTOWN: add 6 size town(s) for ' + logPlayerNameFun(player) + ' number = ' + town6.length);
        }
        score += deltaVP;
        if(AILou.info)
        addLog('FAVOR GameVP score: '+scoreFavor1+' getFavor: '+tileToStringLong(favtile, 1)+' deltaVP: '+deltaVP);
      }
    }
  }
  else if(favtile == T_FAV_2W_CULT) {
    AILou.yfavor = 6;
    if(roundnum <= 3) score += 3;
    else if(roundnum == 4) score += 3;
    else if(roundnum == 5) score += 2;
    else if(roundnum == 6) {
        score += 2;  //LOU12 extra cult move at end helpful
        player.cult[C_W] += 2;
        player.favortiles[favtile] = 1;
        scoreProjection = projectEndGameScores();
        scoreFavor1 = scoreProjection[player.index];
        deltaVP = scoreFavor1[0] - scoreFavor0[0];
        player.favortiles[favtile] = 0;
        player.cult[C_W] -= 2;
        score += deltaVP;
        if(AILou.info)
        addLog('FAVOR GameVP score: '+scoreFavor1+' getFavor: '+tileToStringLong(favtile, 1)+' deltaVP: '+deltaVP);
    }
  }
  else if(favtile == T_FAV_2E_1PW1W) {
    AILou.yfavor = 7;
    if(roundnum <= 3) score += 3;
    else if(roundnum == 4) score += 2;
    else if(roundnum == 5) score += 1;
    else if(roundnum == 6) {
        player.cult[C_E] += 2;
        player.favortiles[favtile] = 1;
        scoreProjection = projectEndGameScores();
        scoreFavor1 = scoreProjection[player.index];
        deltaVP = scoreFavor1[0] - scoreFavor0[0];
        player.favortiles[favtile] = 0;
        player.cult[C_E] -= 2;
        score += deltaVP;
        if(AILou.info)
        addLog('FAVOR GameVP score: '+scoreFavor1+' getFavor: '+tileToStringLong(favtile, 1)+' deltaVP: '+deltaVP);
    }
  }
  else if(favtile == T_FAV_2A_4PW) {
    AILou.yfavor = 8;
    if(roundnum <= 3) score += 3;
    else if(roundnum == 4) score += 2;
    else if(roundnum == 5) score += 1;
    else if(roundnum == 6) {
        player.cult[C_A] += 2;
        player.favortiles[favtile] = 1;
        scoreProjection = projectEndGameScores();
        scoreFavor1 = scoreProjection[player.index];
        deltaVP = scoreFavor1[0] - scoreFavor0[0];
        player.favortiles[favtile] = 0;
        player.cult[C_A] -= 2;
        score += deltaVP;
        if(AILou.info)
        addLog('FAVOR GameVP score: '+scoreFavor1+' getFavor: '+tileToStringLong(favtile, 1)+' deltaVP: '+deltaVP);
    }
  }
  else if(favtile == T_FAV_1F_3C) {
    AILou.yfavor = 9;
    if(roundnum <= 3) score += 2;
    else if(roundnum == 4) score += 1;
    else if(roundnum == 5) score += 0.5;
    else if(roundnum == 6) score -= 4;
  }
  else if(favtile == T_FAV_1W_TPVP) {
    AILou.yfavor = 10;
    score++;
    if(player.b_tp < 3) score += 3;
    if(roundnum >= 4) score -= 3;
    if(roundnum == 6) score -= 1;
    if(getRoundTileP1() == T_ROUND_TP3VP_4W1DIG ||
       getRoundTileP1() == T_ROUND_TP3VP_4A1DIG) score += 3;
    if(getRoundTileP2() == T_ROUND_TP3VP_4W1DIG ||
       getRoundTileP2() == T_ROUND_TP3VP_4A1DIG) score += 1.5;
    if (roundnum == 3 || roundnum == 4) {
      if(game.roundtiles[5] == T_ROUND_TP3VP_4W1DIG ||
         game.roundtiles[5] == T_ROUND_TP3VP_4A1DIG) score += 1;
      if(game.roundtiles[6] == T_ROUND_TP3VP_4W1DIG ||
         game.roundtiles[6] == T_ROUND_TP3VP_4A1DIG) score += 2;
    }
  }
  else if(favtile == T_FAV_1E_DVP) {
    AILou.yfavor = 11;
    score++;
    if(player.b_d > 0) score += 5;
    if(getRoundTileP1() == T_ROUND_D2VP_4W1P || getRoundTileP1() == T_ROUND_D2VP_4F4PW) score += 2;
  }
  else if(favtile == T_FAV_1A_PASSTPVP) {
    AILou.yfavor = 12;
    var numtp = built_tp(player);
    if(upgradeSA < 0) numtp -= 1;  //LOU12 convert TP to TE for FAVOR
    score = [0,0,2,3,3,4][numtp+1];
    if(roundnum == 5) score *= 2;
    else if(roundnum == 6) {
        player.cult[C_A] += 1;
        player.favortiles[favtile] = 1;
        scoreProjection = projectEndGameScores();
        scoreFavor1 = scoreProjection[player.index];
        deltaVP = scoreFavor1[0] - scoreFavor0[0];
        if(upgradeSA < 0)deltaVP += [0,-2,-1,0,-1,0][numtp+1];
        player.favortiles[favtile] = 0;
        player.cult[C_A] -= 1;
        score = deltaVP;
        if(AILou.info)
        addLog('FAVOR GameVP score: '+scoreFavor1+' getFavor: '+tileToStringLong(favtile, 1)+' deltaVP: '+deltaVP);
    }
  }

  // add faction specific values for rounds 1-5, actual VP computed for round 6
  if(roundnum <= 5) score += getPlayerFavorPref(AILou.xfaction, AILou.yfavor);
  return score;
};

//town tile chosen from given array
AILou.prototype.getPreferredTownTile_ = function(player, tiles) {
  var scores = [];
  for(var i = 0; i < tiles.length; i++) {
    scores.push(this.scoreTownTile_(player, tiles[i], state.round));
  }

  return tiles[AILou.pickWithBestScore(tiles, scores, false)];
};

//LOU10 provide function to test against already used towns
function checkTown(arr,val) {
  return arr.some(function(arrval) { return val == arrval });
}

AILou.prototype.scoreTownTile_ = function(player, tile, roundnum) {
  var score = 0;

  if(tile == T_TW_2VP_2CULT) {
    //TODO: calculate if increasing all cults is beneficial and give better score based on that
    score = 2;
    score += 4;
    if(player.faction == F_CHAOS) score += 4;
    else if(player.faction == F_GIANTS) score += 3;
    else if(player.faction == F_AUREN) score += 4;
    else if(player.faction == F_CULTISTS) score += 4;
    else if(player.faction == F_ICEMAIDENS) score += 4;
    else if(player.faction == F_YETIS) score += 3;
    else if(player.faction == F_ENGINEERS) score += 6;
    if(score > 9 && roundnum <= 4) score += 2; 


    //LOU10 if needpw is less than power increase from cult bonus, this town will be judged injust with forced pass
    //TODO turn extra pw2 into coin before select TW2
    var needpw = player.pw0*2 + player.pw1;
    var getpw = 0;
    for (icult = 0; icult < 4; icult++) {
      if (player.cult[icult] == 1 || player.cult[icult] == 2) getpw++;
      else if (player.cult[icult] == 3 || player.cult[icult] == 4) getpw += 2;
      else if (player.cult[icult] == 5 || player.cult[icult] == 6) getpw += 2;
      //LOU10 do not allow cult of 10 (yet) since town needed
      else if (player.cult[icult] >= 8) {getpw += 3; needpw = 0};
    }
    if (getpw > needpw) score = 0;
    if (checkTown(townSelected, tile)) score = 0;
  }
  else if(tile == T_TW_4VP_SHIP) {
    score = 6;
    if(game.finalscoring == 3) score += 2;
    if(player.faction == F_FAKIRS) score += 4;
    else if(player.faction == F_DWARVES) score = 0;
    else if(player.faction == F_RIVERWALKERS) score = 0;
    else if(player.faction == F_MERMAIDS) score += 6;
    //prevent selection for faction at max shipping
    if(player.faction == F_MERMAIDS && player.shipping >= 5) score = 0;
    else if(player.faction != F_MERMAIDS && player.shipping >= 3) score = 0;
if (checkTown(townSelected, tile)) score = 0;
  }
  else if(tile == T_TW_5VP_6C) {
    score = 5;
    score += 2;
    if(player.faction == F_NOMADS && roundnum <= 3) score += 5;
    else if(player.faction == F_ENGINEERS) score -= 2;
    else if(player.faction == F_RIVERWALKERS) score +=2;
    //Use values after current move
    else if(player.c < 8 && player.w >= player.c && player.w > 2) score += 2;
    if (checkTown(townSelected, tile)) score = 0;
  }
  else if(tile == T_TW_6VP_8PW) {
    score = 6;

    //LOU10 if needpw is less than 8, this town will be judged injust with forced pass
    //TODO turn pw2 into coin first
    var needpw = player.pw0*2 + player.pw1;
    if(needpw >= 8) {
      needpw = 8;
      score += needpw/2;
    }
    else if (needpw < 8) score = 0;
    if (checkTown(townSelected, tile)) score = 0;
  }
  else if(tile == T_TW_7VP_2W) {
    score = 7;
    score += 1;
    if(player.faction == F_ENGINEERS  && player.c > player.w*2) score += 2;
    else if(player.w < 4 && player.c > player.w*2) score += 2;
    if (checkTown(townSelected, tile)) score = 0;
  }
  else if(tile == T_TW_8VP_CULT) {
    //TODO: calculate if increasing all cults is beneficial and give better score based on that
    score = 8;
    //when current value from cultSum < 6, subtract score as no cult help
    var sumCult = 0;
    for(var j = C_F; j <= C_A; j++) {
      sumCult += player.cult[j];
    }
    if(sumCult > 5) score += 2;
    if(player.faction == F_SHAPESHIFTERS) score += 3;
    else if(player.faction == F_ICEMAIDENS) score += 3;
    else if(player.faction == F_YETIS) score += 3;
    else if(player.faction == F_ENGINEERS) score += 3;


    //LOU10 if needpw is less than power increase from cult bonus, this town will be judged injust with forced pass
    var needpw = player.pw0*2 + player.pw1;
    var getpw = 0;
    var towncount = 0;
    var needtown = 0;
    for (icult = 0; icult < 4; icult++) {
      if (player.cult[icult] == 2) getpw++;
      else if (player.cult[icult] == 4) getpw += 2;
      else if (player.cult[icult] == 6) getpw += 2;
      //LOU10 do not allow cult of 10 (yet) since town needed
      else if (player.cult[icult] == 9) {getpw += 3; needtown++;}
      else if (player.cult[icult] == 10) {getpw += 3; needtown++; needpw = 0;}
      if(player.towntiles[icult] != undefined) towncount++; //examine how many town tiles are available
    }
    if (needtown > towncount) needpw = 0;
    if (getpw > needpw) score = 0;
    if (checkTown(townSelected, tile)) score = 0;
  }
  else if(tile == T_TW_9VP_P) {
    score = 9;
    score += 1;
    if(player.p == 0) score += 1;
    if(player.faction == F_DARKLINGS) score += 2;
    //LOU10 eliminate the chance to get P, since that gives RW double action
    else if(player.faction == F_RIVERWALKERS) score = 0;
    if (checkTown(townSelected, tile)) score = 0;
  }
  else if(tile == T_TW_11VP) {
    score = 9;
    if(state.round >= 5) score += 1;
    if(state.round >= 6) score += 3;
    if (checkTown(townSelected, tile)) score = 0;
  }
  return score;
};

AILou.prototype.chooseInitialBonusTile = function(playerIndex, callback) {
  var tile = this.getPreferredBonusTile_(game.players[playerIndex]);

  var error = callback(playerIndex, tile);
  if(error != '') {
    addLog('ERROR: AI tried invalid bonus tile. Error: ' + error);
    throw new Error('AI tried invalid bonus tile');
  }
};

AILou.prototype.chooseInitialFavorTile = function(playerIndex, callback) {
  var player = game.players[playerIndex];
  var tiles = getPossibleFavorTiles(player, {});
  var tilemap = {};
  for(var i = 0; i < tiles.length; i++) tilemap[tiles[i]] = true;

  var tile;
  if(AILou.ail > 1) {
    if(tilemap[T_FAV_1E_DVP] && game.bonustiles[T_BON_SPADE_2C]) tile = T_FAV_1E_DVP;
    else if(tilemap[T_FAV_2E_1PW1W]) tile = T_FAV_2E_1PW1W;
  }
  else {
    if(tilemap[T_FAV_2A_4PW] && game.bonustiles[T_BON_SPADE_2C]) tile = T_FAV_2A_4PW;
    else if(tilemap[T_FAV_2E_1PW1W]) tile = T_FAV_2E_1PW1W;
    else if(tilemap[T_FAV_1E_DVP]) tile = T_FAV_1E_DVP;
    else tile = T_FAV_1W_TPVP;
  }

  var error = callback(playerIndex, tile);
  if(error != '') {
    addLog('ERROR: AI tried invalid favor tile. Error: ' + error);
    throw new Error('AI tried invalid favor tile');
  }
};

  //LOU Add starting preference score for the faction dwelling locations.
  //LOU These are based on published experience and preference for a given world.
  // NOT YET implemented, should be made a constant
  /* parameters used for matrix
     0 - World used, 0=standard, 3=fireicealtered, 4=fireice, 5=loonlakes
     1 - player.faction+1 number (like 1=F_CHAOS, 2=F_GIANTS, ...)
     2 - score modifier
     3 - first dwelling location [x,y]
     4 - second dwelling location [x,y]
     5 = third dwelling location [x,y]
     6 - enemy faction colot (can block)
     7 - friend faction color (helpful next)
     8 - friend faction value
     9 - color
  */

  var START_LOCATIONS = [
    [9, 0,0,[ 0, 0],[ 0, 0],[ 0, 0],0,0,0,0],  // comments
    [0, 1,6,[ 9, 4],[ 0, 0],[ 0, 0],0,0,0,R],  // CHAOS
    [0, 1,3,[ 6, 4],[ 0, 0],[ 0, 0],0,0,0,R],  // CHAOS
    [0, 2,3,[ 6, 4],[ 5, 3],[ 0, 0],0,0,0,R],  // GIANTS
    [0, 2,2,[ 6, 4],[ 7, 6],[ 0, 0],0,0,0,R],  // GIANTS
    [0, 2,1,[ 6, 4],[ 9, 4],[ 0, 0],0,0,0,R],  // GIANTS
    [0, 3,4,[ 3, 4],[ 5, 5],[ 0, 0],0,0,0,Y],  // FAKIRS
    [0, 4,6,[ 3, 4],[ 5, 6],[ 5, 1],U,0,0,Y],  // NOMADS
    [0, 4,4,[ 3, 4],[ 5, 1],[ 6, 2],U,0,0,Y],  // NOMADS
    [0, 4,2,[ 5, 6],[ 3, 4],[ 8, 9],0,0,0,Y],  // NOMADS
    [0, 5,3,[ 4, 2],[ 6, 5],[ 0, 0],Y,0,0,U],  // HALFLINGS
    [0, 5,3,[ 8, 9],[10, 6],[ 0, 0],Y,0,0,U],  // HALFLINGS
    [0, 6,5,[ 6, 5],[ 4, 2],[ 3, 8],0,0,0,U],  // CULTISTS
    [0, 6,3,[11, 8],[ 8, 9],[10, 6],0,0,0,U],  // CULTISTS
    [0, 7,1,[ 3, 3],[ 5, 2],[ 0, 0],0,0,0,K],  // ALCHEMISTS
    [0, 7,4,[11, 7],[ 8, 8],[ 0, 0],0,0,0,K],  // ALCHEMISTS
    [0, 8,4,[11, 7],[ 8, 8],[ 0, 0],U,S,2,K],  // DARKLINGS
    [0, 8,2,[ 9, 2],[12, 5],[ 0, 0],U,R,2,K],  // DARKLINGS
    [0, 9,5,[ 2, 8],[ 4, 5],[ 0, 0],0,0,0,B],  // MERMAIDS
    [0,10,3,[ 2, 4],[ 2, 8],[ 0, 0],0,0,0,B],  // SWARMLINGS
    [0,10,3,[ 4, 5],[ 2, 8],[ 0, 0],0,0,0,B],  // SWARMLINGS
    [0,11,3,[ 9, 3],[ 8, 7],[ 0, 0],0,0,0,G],  // AUREN
    [0,11,7,[ 7, 3],[ 6, 6],[ 0, 0],0,0,0,G],  // AUREN
    [0,12,5,[ 6, 6],[ 9, 3],[ 0, 0],S,0,0,G],  // WITCHES
    [0,13,3,[11, 3],[11, 6],[ 0, 0],0,0,0,S],  // ENGINEERS
    [0,13,2,[ 7, 5],[ 5, 3],[ 0, 0],0,0,0,S],  // ENGINEERS
    [0,14,4,[ 7, 5],[11, 6],[ 0, 0],G,B,2,S],  // DWARVES
    [0,14,2,[ 5, 3],[ 4, 7],[ 0, 0],Y,K,2,S],  // DWARVES
    [0,20,4,[ 9, 4],[ 6, 4],[ 0, 0],G,Y,1,R],  // RIVERWALKERS  red
    [0,20,4,[ 9, 3],[ 8, 7],[ 0, 0],0,0,0,G],  // RIVERWALKERS  green
    [0,20,4,[ 8, 2],[ 8, 5],[ 0, 0],0,0,0,Y],  // RIVERWALKERS  yellow
    [4, 1,7,[ 6, 7],[ 9, 7],[ 6, 5],0,0,0,R],   // Fireice CHAOS
    [4, 2,4,[ 9, 7],[ 6, 7],[ 8, 4],0,0,0,R],   // Fireice GIANTS
    [4, 3,4,[ 5, 1],[10, 2],[ 0, 0],0,0,0,Y],   // Fireice FAKIRS
    [4, 4,6,[ 5, 1],[ 8, 3],[10, 2],0,0,0,Y],   // Fireice NOMADS
    [4, 4,3,[ 2, 2],[ 3, 7],[ 5, 1],0,0,0,Y],   // Fireice NOMADS
    [4, 5,4,[11, 5],[11, 2],[ 0, 0],K,0,0,U],   // Fireice HALFLINGS
    [4, 6,4,[ 5, 8],[ 3, 5],[ 0, 0],K,0,0,U],   // Fireice CULTISTS
    [4, 7,4,[ 4, 8],[ 2, 3],[ 0, 0],U,0,0,K],   // Fireice ALCHEMISTS
    [4, 7,3,[10, 8],[12, 7],[ 0, 0],U,0,0,K],   // Fireice ALCHEMISTS
    [4, 8,5,[10, 8],[12, 7],[12, 5],U,0,0,K],   // Fireice DARKLINGS
    [4, 8,3,[12, 2],[12, 7],[12, 5],U,0,0,K],   // Fireice DARKLINGS
    [4, 9,4,[10, 6],[12, 4],[ 0, 0],0,0,0,B],   // Fireice MERMAIDS
    [4, 9,2,[ 5, 7],[ 2, 8],[ 0, 0],0,0,0,B],   // Fireice MERMAIDS
    [4,10,4,[10, 6],[12, 4],[ 0, 0],0,0,0,B],   // Fireice SWARMLINGS
    [4,10,3,[ 7, 8],[10, 6],[ 9, 9],0,0,0,B],   // Fireice SWARMLINGS
    [4,10,2,[ 5, 7],[ 2, 8],[ 9, 9],0,0,0,B],   // Fireice SWARMLINGS
    [4,11,4,[ 7, 7],[ 7, 3],[ 0, 0],S,0,0,G],   // Fireice AUREN
    [4,12,5,[ 7, 3],[ 8, 5],[ 0, 0],S,0,0,G],   // Fireice WITCHES
    [4,12,4,[ 7, 7],[11, 5],[ 8, 5],S,0,0,G],   // Fireice WITCHES
    [4,13,2,[ 2, 4],[ 4, 7],[ 0, 0],G,0,0,S],   // Fireice ENGINEERS
    [4,13,4,[ 2, 4],[ 1, 7],[ 0, 0],G,Y,4,S],   // Fireice ENGINEERS
    [4,13,5,[12, 6],[ 9, 5],[10, 7],G,0,0,S],   // Fireice ENGINEERS
    [4,14,5,[10, 7],[ 6, 8],[ 0, 0],G,0,0,S],   // Fireice DWARVES
    [4,14,3,[ 4, 7],[ 1, 7],[ 0, 0],G,0,0,S],   // Fireice DWARVES
    [4,15,3,[ 5, 8],[ 9, 6],[ 3, 5],0,0,0,U],   // Fireice ICEMAIDENS    brown
    [4,15,1,[11, 5],[ 9, 4],[11, 2],0,0,0,U],   // Fireice ICEMAIDENS    brown
    [4,15,3,[ 5, 7],[ 7, 4],[ 7, 8],0,0,0,B],   // Fireice ICEMAIDENS    blue
    [4,15,3,[ 8, 5],[ 5, 6],[ 7, 7],0,0,0,G],   // Fireice ICEMAIDENS    green
    [4,16,2,[ 6, 3],[ 9, 6],[ 5, 8],0,0,0,U],   // Fireice YETIS         brown
    [4,16,2,[10, 8],[12, 5],[12, 2],0,0,0,K],   // Fireice YETIS         black
    [4,16,2,[ 7, 4],[ 7, 8],[ 5, 7],0,0,0,B],   // Fireice YETIS         blue
    [4,16,2,[ 8, 5],[ 7, 7],[ 5, 6],0,0,0,G],   // Fireice YETIS         green
    [4,17,5,[ 9, 6],[11, 5],[11, 2],0,0,0,U],   // Fireice ACOLYTES      brown
    [4,17,4,[ 7, 4],[ 7, 8],[10, 6],0,0,0,B],   // Fireice ACOLYTES      blue
    [4,17,3,[ 8, 5],[ 7, 7],[11, 4],0,0,0,G],   // Fireice ACOLYTES      green
    [4,18,3,[ 9, 4],[ 6, 3],[11, 5],0,0,0,U],   // Fireice DRAGONLORDS   brown
    [4,18,4,[ 7, 4],[ 7, 8],[10, 6],0,0,0,B],   // Fireice DRAGONLORDS   blue
    [4,18,5,[ 5, 6],[ 7, 7],[ 3, 4],0,0,0,G],   // Fireice DRAGONLORDS   green
    [4,19,1,[ 9, 7],[ 6, 7],[ 0, 0],0,0,0,R],   // Fireice SHAPESHIFTERS red
    [4,19,3,[11, 2],[ 9, 4],[11, 5],0,0,0,U],   // Fireice SHAPESHIFTERS brown
    [4,19,3,[ 8, 5],[11, 4],[ 5, 6],0,0,0,G],   // Fireice SHAPESHIFTERS green
    [4,20,2,[ 7, 3],[ 7, 7],[ 0, 0],S,0,0,U],   // Fireice RIVERWALKERS  green
    [4,20,4,[ 5, 4],[ 4, 8],[ 2, 3],0,0,0,K],   // Fireice RIVERWALKERS  black
    [4,20,3,[ 4, 4],[ 3, 7],[ 0, 0],0,0,0,Y],   // Fireice RIVERWALKERS  yellow
    [4,20,5,[ 6, 2],[ 6, 5],[ 0, 0],0,0,0,R]    // Fireice RIVERWALKERS  red
    ];


//callback result (second parameter) should be the chosen color enum value
AILou.prototype.chooseAuxColor = function(playerIndex, callback) {
  var player = game.players[playerIndex];
  var ispriestcolor = false;
  var used = true;
  var iscore = 0;  //used to track best score

  if(player.color == Z && mayGetPriestAsColor(player) == 2 && state.round == 6) {
    ispriestcolor = true;
  }
  else if(player.color == Z && mayGetPriestAsColor(player) < 3) {
    chosen = Z;
    //riverwalkers choosing priest -
    //just always prefer is as soon as 5 colors unlocked, 6th color in round 6
    //not smart AI, TODO: improve  choices should adapt to board,
    used = false;
  }
  if (used) {
  if(player.color == Z && player.colors[player.woodcolor - R]) ispriestcolor = true;

  var colors = [];
  for(var i = CIRCLE_BEGIN; i <= CIRCLE_END; i++) {
    if(!ispriestcolor && auxColorToPlayerMap[i] == undefined && colorToPlayerMap[i] == undefined) colors.push(i);
    if(ispriestcolor && !player.colors[i - R]) colors.push(i);
  }

  //select a new faction color or priest color
  var chosen;
  var scores = [];
  var score = 0;
  var tiles = [];
  var colorTile;
  var color;
  //select available start color for fireice factions
  if(player.color != Z) {
    for(var i = 0; i < colors.length; i++) {
      score = 0;
      color = colors[i];
      if(auxColorToPlayerMap[wrap(color - 1, R, S + 1)] == undefined) score++;
      if(auxColorToPlayerMap[wrap(color + 1, R, S + 1)] == undefined) score++;
      //LOU add in score from START_LOCATIONS
      if(AILou.info) addLog('COLOR LOCATIONS: '+color+' faction: '+player.faction+1);
      for(var ly = 1; ly < START_LOCATIONS.length; ly++) {  
        if(START_LOCATIONS[ly][0] == state.worldMap && (START_LOCATIONS[ly][1]-1) == player.faction
          && START_LOCATIONS[ly][9] == color) {
          score += START_LOCATIONS[ly][2];
          if(AILou.ail >= 5)  {
            var already = getAlreadyChosenColors();
            if(already[START_LOCATIONS[ly][6]])  score += -4;
            if(already[START_LOCATIONS[ly][7]])  score += START_LOCATIONS[ly][8];
          }  
          break; 
        }
      }
      scores[i] = score;
    }
  }
  //select starting color for riverwalkers
  else if (player.color == Z && !ispriestcolor) {
    for(var i = 0; i < colors.length; i++) {
      score = 0;
      color = colors[i];
      if(auxColorToPlayerMap[wrap(color - 1, R, S + 1)] == undefined) score++;
      if(auxColorToPlayerMap[wrap(color + 1, R, S + 1)] == undefined) score++;
      if (color == R) score += 3;
      if (color == Y) score += 2;
      if (color == G) score += 2;
      if (color == K) score += 2;
      if (color == U) score += 1;
      scores[i]= score;
    }
  }
  // GetFreeTile Function is helper from strategy.js for vacant tiles
  // check available colors, score both var adjacentCount = AILou.getColorTilesAdjacent
  // and one away by shipping tiles for next color choice
  // color order-R is 0,1,2,3,4,5,6 for R, Y, U, K, B, G, S
  else if (player.color == Z && ispriestcolor) {
    colorScores = [0,0,1,1,0,1,0,1,1,0,0,0];
    tiles = getFreeTilesReachableByShipping(player, 0);
    for(var t = 0; t < tiles.length; t++) {
      colorTile = getWorld(tiles[t][0], tiles[t][1]);
      //avoid increased score if adjacent to town
      if(touchesExistingTownWood(tiles[t][0], tiles[t][1], player.woodcolor)) colorScores[colorTile] += 0;
      else colorScores[colorTile] += 2;
    }
    tiles = getFreeTilesReachableByShipping(player, 1);
    for(var t = 0; t < tiles.length; t++) {
      colorTile = getWorld(tiles[t][0], tiles[t][1]);
      colorScores[colorTile] += 1;
      var adjacentCount = AILou.getColorTilesAdjacent(player, tiles[t][0], tiles[t][1]);
      if (adjacentCount[0] == 1 && adjacentCount[1] == 6) colorScores[colorTile] += 1;
    }
    for(var i = 0; i < colors.length; i++) {
      color = colors[i];
      scores[i] = 0;
      for(var j = CIRCLE_BEGIN; j <= CIRCLE_END; j++) {
         if (color == j) scores[i] = colorScores[j];
      }
    }
  //colors.length is the number of colors still available
  if(AILou.info) addLog('COLOR: AI finding RW priest: '+ colors + ' ---- ' + colorScores);
  }
    //LOU if !(player.color == Z && ispriestcolor && used)
    iscore = AILou.pickWithBestScore(colors, scores, false);
    chosen = colors[iscore];
    //fireice update, must have 1 or 2 coins to pick the color, otherwise it is a priest
    if (state.fireiceerrata && player.c < 2) {
      ispriestcolor = false;
      chosen = Z;
    }
  }
 //round is 6, do not pick new color where scores less than threshold
 if(player.color == Z && mayGetPriestAsColor(player) == 2 && state.round == 6) {
   if(scores[iscore] < 5 || (state.fireiceerrata && player.c < 2) ) {
     ispriestcolor = false;
     chosen = Z;
   }
 }
  var error = callback(playerIndex, chosen);
  if(error != '') {
    addLog('ERROR: AI tried invalid faction auxcolor. Error: ' + error);
    throw new Error('AI tried invalid faction auxcolor. Error: ' + error);
  }
};

//new shape, get colors from available list
AILou.getNewAuxColor = function(player, oldColor) {
  var scores = [];
  var iscore = 0;
  var tiles = [];
  var colorTile;
  var color;
  var colors = [];
  var colorValue = 0;
  var already = getNoShiftColors(getCurrentPlayer());
  for(var i = CIRCLE_BEGIN; i <= CIRCLE_END; i++) {
    //if(auxColorToPlayerMap[i] == undefined && colorToPlayerMap[i] == undefined) colors.push(i);
     if(already[i]) continue;
    colors.push(i);
  }

  if (player.color == X && state.round > 0) {
    var colorScores = [0,0,1,1,1,1,1,1,1,0,0,0];
    tiles = getReachableTransformableTiles(player, false, true);
    for(var t = 0; t < tiles.length; t++) {
      colorTile = getWorld(tiles[t][0], tiles[t][1]);
      colorScores[colorTile] += 2;
    }
    if (player.shipping > 0) {
      tiles = getFreeTilesReachableByShipping(player, 1);
      for(var t = 0; t < tiles.length; t++) {
        colorTile = getWorld(tiles[t][0], tiles[t][1]);
        colorScores[colorTile] -= 0;
      }
    }
    for(var i = 0; i < colors.length; i++) {
      color = colors[i];
      scores[i] = 0;
      for(var j = CIRCLE_BEGIN; j <= CIRCLE_END; j++) {
         if (color == j) scores[i] = colorScores[j];
      }
    }
    iscore = AILou.pickWithBestScore(colors, scores, false);
    newColor = colors[iscore];
    colorValue = colorScores[newColor] - colorScores[oldColor];  //can be negative
    if(colorValue >= 2 && AILou.info) addLog('COLOR: AI finding SS color: '+ colors + '--' + colorScores +' old:' + oldColor + ' new:' + newColor);
  }
  return colorValue;
};

//gets number of color tiles adjacent to the given tile
//count in position: 0 = color tiles, 1 = river and color, 2 = same building color adjacent, 3 = vacant and woodcolor
AILou.getColorTilesAdjacent = function(player, x, y) {
  var tiles = getNeighborTiles(x, y);
  var countColor = [0,0,0,0];
  for(var i = 0; i < tiles.length; i++) {
    if (tiles[i] != null)  {
      var tilecolor = getWorld(tiles[i][0], tiles[i][1]);
      if(tilecolor != I && tilecolor != N) countColor[0]++;
      if (tilecolor != N) countColor[1]++;
      var building = getBuilding(tiles[i][0], tiles[i][1]);
      if(building[0] != B_NONE && building[1] == player.woodcolor) countColor[2]++;
      if(building[0] == B_NONE && tilecolor == player.woodcolor) countColor[3]++;
    }
  }
  return countColor;
};

//LOU13 gets number of building tiles in color adjacent to the given tile
//count in position: 0 = color tiles, 1 = river and color, 2 = same building color adjacent, 3 = vacant and woodcolor
AILou.getBuildingTilesAdjacent = function(colorCode, x, y) {
  var tiles = getNeighborTiles(x, y);
  var countColor = [0,0,0,0];
  for(var i = 0; i < tiles.length; i++) {
    if (tiles[i] != null)  {
      var tilecolor = getWorld(tiles[i][0], tiles[i][1]);
      if(tilecolor != I && tilecolor != N) countColor[0]++;
      if (tilecolor != N) countColor[1]++;
      var building = getBuilding(tiles[i][0], tiles[i][1]);
      if(building[0] != B_NONE && building[1] == colorCode) countColor[2]++;
      if(building[0] == B_NONE && tilecolor == colorCode) countColor[3]++;
    }
  }
  return countColor;
};

//returns true/false for arrays are equal
AILou.aeq = function(a, b) {
  if (a.length != b.length) return false;
  for(var i = 0; i < a.length; i++) {
    if (a[i] != b[i])  return false;
  }
  return true;
};

AILou.prototype.chooseInitialDwelling = function(playerIndex, callback) {
  var player = game.players[playerIndex];
  var chosen = undefined;
  var locxy = [0,0];

  var otherDwelling;
  if(player.b_d < 8) {
    for(var y = 0; y < game.bh; y++)
    for(var x = 0; x < game.bw; x++)
    {
      var building = getBuilding(x, y);
      if(building[0] != B_NONE && building[1] == player.woodcolor) {
        otherDwelling = [x,y];
        break;
      }
    }
  }

  var positions = [];
  for(var y = 0; y < game.bh; y++)
  for(var x = 0; x < game.bw; x++)
  {
    if(getWorld(x, y) != player.auxcolor) continue;
    if(getBuilding(x, y)[0] != B_NONE) continue;
    positions.push([x, y]);
  }

  var scores = [];
  for(var i = 0; i < positions.length; i++) {
    var x = positions[i][0];
    var y = positions[i][1];
    var score = 0;
    if (player.faction != F_RIVERWALKERS)  {
      score += AILou.scoreTileDigEnvironment(player, x, y, player.getMainDigColor(), false); }
    score += AILou.scoreTileEnemyEnvironment(x, y, player.getMainDigColor(), false);

    var neighbors = getNumTilesAround(player, x, y);
    if(neighbors[0] == 0 && neighbors[1] == 0) score /= 2;
    //tile touches no other proper tiles, discourage this

    //LOU avoid tiles surrounded for R,G,B factions.
    //LOU adjacentCount[land tiles adjacent, edge tiles have water or land ajacent]
    var adjacentCount = AILou.getColorTilesAdjacent(player, x, y);
    var colorCode = player.color;
    if(adjacentCount[0] >= 6 &&
      (colorCode == R || colorCode == G || colorCode == B)) score = 0;
    if(adjacentCount[0] >= 6 && player.auxcolor == R) score = 0;
    //LOU degrade placing tiles on the edge except for Yellow,Black,Silver
    //LOU allow edge tiles if final scoring is OUTPOST
    if(colorCode == Z)  {
      if(adjacentCount[0] >= 6) score = -10;
      else if(adjacentCount[0] == adjacentCount[1]) score = -10;
      else if(adjacentCount[1] < 6) score = -5;
      else if(adjacentCount[0] > 3) score = 6-adjacentCount[0];
    }
    else if(game.finalscoring != 1) {
      if(adjacentCount[1] < 6 && (colorCode != Y && colorCode != K && colorCode != S)) score = 0;
      if(adjacentCount[0] < 4 && colorCode == B) score -= 4;
      if(adjacentCount[0] < 4 && colorCode == R) score -= 4;
      if(adjacentCount[0] < 3 && colorCode == G) score -= 4;
    }
    //LOU13 give more score for tiles next to edge or one away from edge
    else if(game.finalscoring == 1) {
      if(adjacentCount[0] == 4) score +=1;  //top and bottom edge, not corner
      if(x == 1) score += 1;  //left edge one in
      if(y == 1) score += 1;  //top edge one in
      if(x == game.bw-2 && adjacentCount[0] == 6) score += 1;  //right edge odd, one in
      if(y == game.bh-2) score += 1;  //bottom edge one in
    }


    //add score if primary location is on the preferred list
    for(var ly = 1; ly < START_LOCATIONS.length; ly++) {
      if(START_LOCATIONS[ly][0] == state.worldMap && (START_LOCATIONS[ly][1]-1) == player.faction) {
        locxy = [x+1,y+1];
        if(AILou.aeq(START_LOCATIONS[ly][3], locxy)) score += START_LOCATIONS[ly][2]+2;
        else if(AILou.aeq(START_LOCATIONS[ly][4], locxy)) score += START_LOCATIONS[ly][2];
      }
    }

    if(otherDwelling) {
      var h = hexDist(otherDwelling[0], otherDwelling[1], x, y);

    //add score if secondary location is on the preferred list
    for(var ly = 1; ly < START_LOCATIONS.length; ly++) {
      if(START_LOCATIONS[ly][0] == state.worldMap && (START_LOCATIONS[ly][1]-1) == player.faction) {
        locxy = [x+1,y+1];
        if(AILou.aeq(START_LOCATIONS[ly][3], otherDwelling)) {
          if(AILou.aeq(START_LOCATIONS[ly][4], locxy)) score += START_LOCATIONS[ly][2];
          else if(AILou.aeq(START_LOCATIONS[ly][5], locxy) && otherDwelling) score += START_LOCATIONS[ly][2]-1;
        }
      }
    }

      //LOU replaced! if(h >= 4 && h <= 6) score += 5;
      //LOU add more complexity to distance scoring
      switch(h) {
      case 0: score = 0;
              break;
      case 1: score = 0;
              break;
      //discourage being extremely close
      case 2: if(player.faction != F_ENGINEERS) score /= 2;
              break;
      case 3: score += 2;
              break;
      //be near your other dwelling but not too near
      case 4: score += 4;
              break;
      case 5: if (!state.fireice) score += 4;
              if (state.fireice) score += 2;
              break;
      //LOU fireice places premium on network, too far
      case 6: if (!state.fireice) score += 2;
              if (state.fireice) score = 1;
              break;
      //LOU discourage really far away for fireice
      default: score = 1;
               if (state.fireice && player.faction != F_NOMADS) score = -5;
      }
      //LOU Notice that build used is first in y direction.  Others are ignored (Nomads)
      var done = getInitialDwellingsDone(player);
      if(player.faction == F_NOMADS && done == 2) {
        if (adjacentCount[0] <= 3 && game.finalscoring == 1) score -= 4;
        else if (x == 1 && y == 1 && game.finalscoring == 1) score += 8;
        else if (x == 3 && y == 3 && game.finalscoring == 2) score += 4;
        else if (h >= 6) score -= 10;
        else if (h > 3 && game.finalscoring != 1) score -= 2;
      }

      //LOU CHEAT certain combination in fireice world cause problems
      if(state.fireice && otherDwelling[1] == y) {
        if (hexDist(otherDwelling[0], otherDwelling[1], x, y) >= 5) score = 0;
      }
    }
    scores.push(score);
  }

  var i = AILou.pickWithBestScore(positions, scores, false);
  var chosen = positions[i];
  if(AILou.info) addLog('LOCATE: map '+state.worldMap+'  '+ logPlayerNameFun(player)  +'  '
    + letters[chosen[1]] + numbers[chosen[0]] +' scores: '+ scores);

  var error = callback(playerIndex, chosen);
  if(error != '') {
    addLog('ERROR: AI tried invalid initial dwelling. Error: ' + error);
    throw new Error('AI tried invalid initial dwelling');
  }
};

AILou.prototype.chooseFaction = function(playerIndex, callback) {
  var factions2 = getPossibleFactionChoices();
  var factions = [];
  for(var i = 0; i < factions2.length; i++) {
    factions.push(factions2[i]);
  }

  var already = getAlreadyChosenColors();
  var scores = [];
  for(var i = 0; i < factions.length; i++) {
    scores[i] = this.scoreFaction_(game.players[playerIndex], already, factions[i]);
  }

  //The scores will be used as probability distribution function for random race choice.
  //But to bring the focus to the good races, subtract the lowest score from each.
  if(AILou.ail <= 1) {
    var lowest = 9999;
    for(var i = 0; i < scores.length; i++) lowest = Math.min(lowest, scores[i]);
    for(var i = 0; i < scores.length; i++) scores[i] -= lowest;
  }

 var faction = factions[AILou.pickWithBestScore(factions, scores, true)];  //factions with good score
 if(AILou.ail >= 3) faction = factions[AILou.pickWithBestScore(factions, scores, false)];  //only best factions

  var error = callback(playerIndex, faction);
  if(error != '') {
    addLog('ERROR: AI chose invalid faction. Error: ' + error);
    throw new Error('AI chose invalid faction');
  }
};

//LOU start faction probability converted into tabular form
//1. faction.index+1
//2. game.finalscoring = None
//3. game.finalscoring = Most Outposts
//4. game.finalscoring = Sanctuary-Stronghold
//5. game.finalscoring = Greatest Distance
//6. game.finalscoring = Most Settlements
//7. game.players.length == 5
//8. game.bonustiles = [T_BON_1P]
//9. game.bonustiles = [T_BON_3PW_SHIP]
//10. game.bonustiles = [T_BON_PASSSHIPVP_3PW]
//11. game.bonustiles = [T_BON_PASSSHSAVP_2W]
//12. game.bonustiles = [T_BON_PASSTPVP_1W]
//13. game.bonustiles = [FireIceWorld]
//14. game.bonustiles = [LoonLakesWorld]
var START_FACTIONS = [
    [ 1,  19, 16, 21, 19, 19, -4,  0,  0,  0,  0,  0,  0,  0],   //  CHAOS
    [ 2,  19, 20, 21, 20, 20,  0,  0,  0,  0,  2,  0,  0, -2],   //  GIANTS
    [ 3,  14, 14, 14, 19, 19,  0,  0,  0,  0,  0,  0,  0,  0],   //  FAKIRS
    [ 4,  30, 28, 26, 24, 23,  0,  0,  0,  0,  2,  0,  0,  2],   //  NOMADS
    [ 5,  19, 24, 19, 19, 20,  0,  0,  0,  0,  0,  0,  0,  0],   //  HALFLINGS
    [ 6,  20, 22, 21, 23, 19,  0,  0,  0,  0,  0,  0,  0,  0],   //  CULTISTS
    [ 7,  17, 15, 21, 11, 13,  0,  0,  0,  0,  0,  0,  0, -1],   //  ALCHEMISTS
    [ 8,  29, 31, 15, 22, 22,  0,  3,  0,  0,  0,  0,  0,  0],   //  DARKLINGS
    [ 9,  14, 10, 12, 14, 12,  2,  0,  3,  8,  0,  2, -3,  4],   //  MERMAIDS
    [ 10, 22, 14, 25, 19, 18,  0,  0,  0,  0,  0,  2,  0,  0],   //  SWARMLINGS
    [ 11, 12, 12, 11, 11, 11,  0,  0,  3,  0,  0,  0,  0,  0],   //  AUREN
    [ 12, 20, 14, 20, 20, 16,  0,  0,  4,  0,  0,  0,  0, -5],   //  WITCHES
    [ 13, 17, 21, 17, 16, 12,  0,  0,  0,  0,  0,  0, -2, -3],   //  ENGINEERS
    [ 14, 21, 15, 18, 22, 23,  2,  0,  0,  0,  0,  0,  0,  0],   //  DWARVES
    [ 15, 16, 16, 21, 17, 21,  0,  0,  0,  0,  0,  2,  0,  0],   //  ICEMAIDENS
    [ 16, 15, 12, 21, 15, 20,  2,  0,  0,  0,  0,  0,  0,  3],   //  YETIS
    [ 17, 12, 12, 10, 10, 12,  0,  0,  0,  0,  0,  0,  0,  0],   //  ACOLYTES
    [ 18, 16, 14, 21, 14, 16,  0,  0,  0,  0,  0,  0,  0,  0],   //  DRAGONLORDS
    [ 19, 18, 16, 20, 16, 18,  0,  0,  0,  0,  0,  0, -3, -4],   //  SHAPESHIFTERS
    [ 20, 24, 10, 19, 34, 34,  0,  4,  0,  0,  0,  0,  0,  0]    //  RIVERWALKERS
    ];

//already = object that has true value for each already chosen color
AILou.prototype.scoreFaction_ = function(player, already, faction) {
  //LOU add revised processing
  if(AILou.ail >= 3) AILou.info = false;  //change to true to get more info for level3+
  else AILou.info = false;
  var score = 0;
  var  color = factionColor(faction);
  if(color >= CIRCLE_BEGIN && color <= CIRCLE_END) {
    if(!already[wrap(color - 1, R, S + 1)]) score++;
    if(!already[wrap(color + 1, R, S + 1)]) score++;
  } else {
    // TODO: better heuristic for expansion colors orange and white
    score++;
  }
  //LOU15 check START_LOCATIONS table for friend and enemy colors
  //below information is repeated from enums for convenience
  //var N = 0; none (edge of hexmap)
  //var I = 1; river
  //var R = 2; solitude (red) 
  //var Y = 3; desert (yellow) 
  //var U = 4; plains (brown) 
  //var K = 5; swamp (black) 
  //var B = 6; lake (blue) 
  //var G = 7; forest (green) 
  //var S = 8; mountain (grey) 
  //var W = 9; ice (white) 
  //var O = 10; lava (orange)  
  //var X = 11; any (shapeshifters)
  //var Z = 12; many (riverwalkers) 

  if(AILou.ail >= 5) {
    if(AILou.info) addLog('ENEMY START'+color+' faction: '+faction.index+1);
    var enemycolor = 0;
    var enemyvalue = -9;
    var friendcolor = 0;
    var friendvalue = 0;
    for(var ly = 1; ly < START_LOCATIONS.length; ly++) {
      if(START_LOCATIONS[ly][0] == state.worldMap && (START_LOCATIONS[ly][1]-1) == faction.index) {     
        startcolor = START_LOCATIONS[ly][9];
        //only the first color match listing will count for selection
        if(startcolor == color) {
          enemycolor = START_LOCATIONS[ly][6]; 
          friendcolor = START_LOCATIONS[ly][7]; 
          friendvalue = START_LOCATIONS[ly][8]; 
          if(already[enemycolor]) score += enemyvalue;
          if(already[friendcolor]) score += friendvalue;
          if(AILou.info) addLog('ENEMY END'+enemycolor+' score: '+score);
          break;
        }          
      }  
    }
  }

  // Based on in percentages of http://terra.snellman.net/stats.html (before v4 changes)
  var xfaction = faction.index;
  //LOU winpercentage = (snellmanRating -900)/10 + 10) fireice added
  //code converted to table lookup by faction and setup parameters
  var result = 0;
  var yvalue = game.finalscoring+1;
  result = START_FACTIONS[Math.floor(xfaction)][Math.floor(yvalue)];
  var delta = 0;
  delta = START_FACTIONS[xfaction] [6];
  if (delta != 0 && game.players.length == 5) result += delta;
  delta = START_FACTIONS[xfaction] [7];
  if (delta != 0 && game.bonustiles[T_BON_1P] ) result += delta;
  delta = START_FACTIONS[xfaction] [8];
  if (delta != 0 && game.bonustiles[T_BON_3PW_SHIP]) result += delta;
  delta = START_FACTIONS[xfaction] [9];
  if (delta != 0 && game.bonustiles[T_BON_PASSSHIPVP_3PW]) result += delta;
  delta = START_FACTIONS[xfaction] [10];
  if (delta != 0 && game.bonustiles[T_BON_PASSSHSAVP_2W]) result += delta;
  delta = START_FACTIONS[xfaction] [11];
  if (delta != 0 && game.bonustiles[T_BON_PASSTPVP_1W]) result += delta;
  delta = START_FACTIONS[xfaction] [12];
  if (delta != 0 && state.worldMap == 4) result += delta;
  delta = START_FACTIONS[xfaction] [13];
  if (delta != 0 && state.worldMap == 5) result += delta;

  if(AILou.ail <= 1) score += (result - 10) / 20;
  else score += (result - 20);

  if(AILou.info) addLog('WINP: AI score win_' +(xfaction+1)+ ': ' + result + '   score: ' + score);
  return score;
};

AILou.prototype.leechPower = function(playerIndex, fromPlayer, amount, vpcost, roundnum, already, still, callback) {
  var player = game.players[playerIndex];
  //LOU Decline to accept power from Cultists in Rounds 5,6 (Previously all Rounds)
  //or Shapeshifters (unless fireiceerrata) to reduce their power.
  //Normal if human already accepts power.
  if(game.players[fromPlayer].faction == F_CULTISTS && !already && roundnum >= 5) {
    callback(playerIndex, false);
    return;
  }

  if(game.players[fromPlayer].faction == F_SHAPESHIFTERS && !state.fireiceerrata) {
    callback(playerIndex, false);
    return;
  }

  if(vpcost == 0) {
    callback(playerIndex, true);
    return;
  }

  //LOU decline power that can not be used (should not happen)
  var needpw = player.pw0*2 + player.pw1;
  if(vpcost+1 > needpw) {
    addLog('POWER: AI power excess for: ' + logPlayerNameFun(player) );
    callback(playerIndex, false);
    return;
  }

  //LOU YETIS can make better use of power, stronghold allows reuse of POWER actions
  if(player.faction == F_YETIS) {
    var gainpw = 7;
    if (built_sh(player) == 1) gainpw += 2;
    if(vpcost < gainpw-roundnum && roundnum < 6) {
      callback(playerIndex, true);
      return;
    }
  }

  //LOU change power from leech to round 1-6, power 4,3,2,1,1,0
  // previous power from leech was round 1-6, power 3,2,1,1,0,0
  var gainpw = 6;
  if(vpcost < gainpw-roundnum) {
      callback(playerIndex, true);
      return;
  }

  if(vpcost == 1) {
    callback(playerIndex, roundnum <= 5);
    return;
  }

  callback(playerIndex, false);
};

AILou.prototype.doRoundBonusSpade = function(playerIndex, callback) {
  var player = game.players[playerIndex];
  var num = player.spades;
  //LOU Giants rule is that one spade is forfeit, two spades digs anywhere
  //LOU when two spades, then Error: giants cannot have more than one round bonus digs (fixed in rules.js)
  var result = [];
  var dummy = [];
  var locations = [];
  digLocationChoiceSimple(player, num, 0, [0,0,0,0,0], locations, dummy);
  var prevx = -2;
  var prevy = -2;
  var prevnum = 0;
  for(var i = 0; i < locations.length; i++) {
    var x = locations[i][0];
    var y = locations[i][1];
    prevnum = ((prevx == x && prevy == y) ? (prevnum + 1) : 0);
    prevx = x;
    prevy = y;
    var types = transformDirAction(player, getWorld(x, y), player.getMainDigColor());
    if(types.length > 0) {
      result.push([types[prevnum], x, y]);
    } else {
      throw 'expected some dig actions';
    }
  }

  var error = callback(playerIndex, result);
  if(error != '') {
    addLog('ERROR: AI chose invalid round bonus dig. Error: ' + error);
    throw new Error('AI chose invalid round bonus dig. Error: ' + error);
  }
};


AILou.prototype.chooseShapeshiftersConversion =
  function(playerIndex, callback) {
  callback(playerIndex, state.round < 5);
};


AILou.prototype.chooseCultistTrack = function(playerIndex, callback) {
  var player = game.players[playerIndex];
  this.updateScoreActionValues_(player, state.round);
  var besttrack = this.getBestCultTrack_(player, 1);

  var error = callback(playerIndex, besttrack);
  if(error != '') {
    addLog('ERROR: AI chose invalid cult track. Error: ' + error);
    throw new Error('AI chose invalid cult track. Error: ' + error);
  }
};

AILou.prototype.getBestCultTrack_ = function(player, num) {
  var scores = [];
  for(var i = C_F; i <= C_A; i++) {
    scores.push(this.scoreCultTrack_(player, i, num, true));
  }
  return AILou.pickWithBestScore([C_F, C_W, C_E, C_A], scores, false);
};

//score cult track taking into account: power, bonus resources, relative positions to players and VPs
//cap = take into account top position of cult track or not?
AILou.prototype.scoreCultTrack_ = function(player, cult, num, cap) {
  var cultres = this.scoreCultTrackResources_(player, cult, num, cap);
  var cultvp = this.scoreCultTrackVP_(player, cult, num, cap);
  if(AILou.info) addLog('CULT: faction '+numbers[player.faction]
        +' cultVP: '+cultvp+' resources: '+cultres+' total: ' + (cultres+ cultvp));
  return cultres + cultvp;
};

//score cult track taking into account power and bonus resources, but not VPs
//cap = take into account top position of cult track or not?
AILou.prototype.scoreCultTrackResources_ = function(player, cult, num, cap) {
  if(cap) num = willGiveCult(player, cult, num);
  if(num == 0) return 0;

  var result = 0;

  var res = [0,0,0,0,0];
  res[3] += cultPower(player.cult[cult], player.cult[cult] + num);

  var oldcult = player.cult;
  var newcult = [player.cult[0], player.cult[1], player.cult[2], player.cult[3]];
  var oldpriests = getCultPriests(player);

  var newpriests = oldpriests + (num > 1 ? 1 : 0);
  //TODO: this is not a correct way to determine if a priest is added, some non priest actions add two cult
  newcult[cult] += num;
  cultincome = getAllComingCultRoundBonuses(oldcult, newcult,  oldpriests, newpriests);
  //LODE changed  cultincome = getAllComingCultRoundBonuses(oldcult, newcult);
  sumIncome(res, cultincome[0]);
  var spades = cultincome[1];


  var s = this.scoreActionValues;
  result += res[0] * s.c;
  result += res[1] * s.w;
  result += res[2] * s.p;
  result += res[3] * s.pw;
  result += res[4] * s.vp;
  result += spades * s.cultspade;

  return result;
};

//score cult track based only on relative positions to players and VPs, but not resources
//cap = take into account top position of cult track or not?
AILou.prototype.scoreCultTrackVP_ = function(player, cult, num, cap) {
  if(cap) num = willGiveCult(player, cult, num);
  if(num == 0) return 0;

  var result = 0;

  var highestother = -1; //highest value other players have on this track
  for(var i = 0; i < game.players.length; i++) {
    if(i == player.index) continue; //don't count self
    if(game.players[i].cult[cult] > highestother) highestother = game.players[i].cult[cult];
  }

  //TODO: take into account whether other players can/will actually still go there
  //TODO: avoid going up on track where you're already high up if others can't go there

  var fromdiff = player.cult[cult] - highestother;
  result += Math.max(0, Math.abs(5 - fromdiff));

  //ERROR Previously commented, now round dependent (and not used)
  //Pure score difference, most important in last TWO rounds
  if(state.round > 4) {
    var pcult = [];
    for(var i = 0; i < game.players.length; i++) pcult[i] = game.players[i].cult[cult];
    var fromcultvp = getDistributedPoints(player.index, pcult, [8,4,2], 1);
    pcult[player.index] += num;
    var tocultvp = getDistributedPoints(player.index, pcult, [8,4,2], 1);
    result += (tocultvp - fromcultvp);
  }

  return result;
};



/////////////////////////////Compute value of one turn action////////////////////////////////////


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
  b_sa: sanctuary upgrade VP value
  t_fav: favor tile
  t_tw: town tile (and forming town). NOTE: scoreAction does NOT add the VP's or resources on the town tile itself to that (because it doesn't know which tile the AI will pick).
  burn: burn VP value (typically 0 or negative)
  bridge: bridge VP value (assuming good placement, which is the AI's responsibility)
  conbridge: bridge VP value for bridge connecting two buildings of the players color (for engineers)
  forbridge: VP value for creating a potential bridge spot (that is, placing a building correctly over water) (for engineers)
  dig: dig VP value (assuming dig in good location, which is the AI's responsibility)  TODO: rename this spade
  cultspade: value of future cult bonus dig
  cult[[4][4][4]]: value of fire,water,earth,air cult tracks for the AI. This function takes power gain and cult round bonuses into account, but NOT cult track VPs. That is what the AIs should fill in here.
  p_gone: cost of priest permanently gone to cult track (in negative VP)
  existingtown: when doing anything that increases an existing town's size (which is not useful, so make this number negative)
  towardstown: making an existing cluster (that has at least 3 power) bigger to be closer to a town (TODO: never do this in a too small cluster that is locked in)
  interacts: it's a new dwelling that interacts with another player, that is good because it is a good TP upgrade target, plus may steal a good spot from them
  networkcon: value for each extra location in network
  shift: value for SHAPESHIFTERS using 3pw/5pw to change color
  shift2: value for SHAPESHIFTERS using 3/5 tokens to change color
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
AILou.scoreAction = function(player, actions, values, roundnum) {
  //The round number in the list was always zero is replaced.
  //keep all round and bonus tile scoring into account. They count as VP.
  //res order is: 0-coin, 1-worker, 2-priest, 3-power bowl 2, 4-victory points (c,w,p,pw2,vp)
  roundnum = state.round;
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
  var newtown = 0;
  var interacts = 0;
  var networkcon = 0;
  var outpostcon = 0;
  var shtosacon = 0;
  var distancon = 0;
  var settlecon = 0;
  var shift = 0;    //SHAPESHIFTERS
  var shift2 = 0;   //SHAPESHIFTERS
  var tilelink = 0; //ENGINEERS
  //for endgame evaluation
  var scoreProjection;
  var scoreNow;
  var scoreDwell;
  var scoreDiff;

  //added parameters for phasing of actions one or two rounds
  var defer1 = 0;
  var defer2 = 0;
  if(roundnum >= 4) { defer1 = -1.0; defer2 = -0.8; }

  //all the bonus/favor/town tiles bonus applied to all actions
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
      subtractIncome(res, player.getActionCost(A_SPADE));
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
    } else if(type == A_TRANSFORM_CW || type == A_TRANSFORM_CCW || type == A_TRANSFORM_SPECIAL) {
      dig++;
    } else if(type == A_GIANTS_TRANSFORM || type == A_TRANSFORM_SPECIAL2) {
      dig += 2; //TODO: use color distance

    //==== DWELLING ====
    } else if(type == A_SANDSTORM) {
      dig++; //TODO: use color distance
      if(touchesExistingTownWood(action.co[0], action.co[1], player.woodcolor)) existingtown++;
      if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
      //TODO: use Sandstorm to connect
      var countColor = AILou.getColorTilesAdjacent(player, action.co[0], action.co[1]);
      //increase value of adding D next to other D, towards town must have town value of 3
      if(AILou.ail > 1) {
        if(existingtown == 0 && towardstown == 0) {
        newtown += countColor[2]*2;
        }
        if(existingtown == 0) newtown += countColor[3]*2;
      }
      values.networkcon++;
      //examine VP gain at end
      if(AILou.ail > 1  && roundnum == 6) {
        scoreProjection = projectEndGameScores();
        scoreNow = scoreProjection[player.index];
        setBuilding(action.co[0], action.co[1], B_D, player.woodcolor);
        scoreProjection = projectEndGameScores();
        scoreDwell = scoreProjection[player.index];
        scoreDiff = scoreDwell - scoreNow;
        setBuilding(action.co[0], action.co[1], B_NONE, player.woodcolor);
        if (scoreDiff > 2) {
          newtown += scoreDiff;
          if(AILou.info) addLog('DWELL: '+logPlayerNameFun(player)+' AI endsand scoreNow: '+scoreNow+' scoreDwell: ' + scoreDwell+' location: '+letters[action.co[1]]+numbers[action.co[0]]);
        }
      }

    } else if(type == A_BUILD || type == A_WITCHES_D) {
      if(type == A_BUILD) subtractIncome(res, player.getFaction().getBuildingCost(B_D, false));
      b_d++;
      if(touchesExistingTownWood(action.co[0], action.co[1], player.woodcolor)) existingtown++;
      if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
      if(hasNeighbor(action.co[0], action.co[1], player.woodcolor)) interacts++;
      var countColor = AILou.getColorTilesAdjacent(player, action.co[0], action.co[1]);
      //increase value of adding D next to other D (limit roundnum for this)
      if(existingtown == 0 && towardstown == 0) {
        newtown += countColor[2]*2;
      }
      else if(towardstown > 0) {
        newtown += countColor[3]*2;
      }
      if(AILou.info && newtown > 0) {
        addLog('NEWD: AI New Dwelling: '+logPlayerNameFun(player)+' newtown: '+newtown
            +' location: '+letters[action.co[1]]+numbers[action.co[0]]);
      }

      //CONNECT evaluation. rounds 2+
      //give value for expanding network connectivity (move into new function)
      // 1. examine network size, default shipping from 0 to 1
      // 2. place temporary dwelling on location,
      // 3. recompute network size
      // 4. assign value to larger network
      // 5. erase dwelling, return shipping
      var xshipping = player.shipping;
      if (xshipping == 0) {
        if(!(player.faction == F_FAKIRS || player.faction == F_DWARVES || player.faction == F_RIVERWALKERS)) player.shipping++;
      }
      calculateNetworkClusters();
      //get biggest network of this player.
      //Precondition: calculateNetworkClusters() must have been called
      var numNetwork = getBiggestNetwork(player);
      //setup Outpost scoring
      var numOutpost = 0;
      var numOutpostPlus = 0;
      if(game.finalscoring == 1 && roundnum > 4) {
        var result1 = [];
        //TODO: replicates calculateNetworkClusters internally
        result1 = getOutpostEndScores();
        numOutpost = result1[player.index][1];
      }
      //place temporary dwelling
      setBuilding(action.co[0], action.co[1], B_D, player.woodcolor);
      calculateNetworkClusters();
      var numNetworkPlus = getBiggestNetwork(player);
      var deltaNet = numNetworkPlus - numNetwork -1;
      if(roundnum > 1 && deltaNet > 0) {
        networkcon = deltaNet;
        if(AILou.info) addLog('NETWORK: AI Network faction: '+numbers[player.faction]+' netUp: '+deltaNet
          +' location: '+letters[action.co[1]]+numbers[action.co[0]] );
      }
      if(game.finalscoring == 1 && roundnum <= 4) {
        if(countColor[1] < 6) outpostcon++;
      }
      //LOU tilelink provides a credit for specific tile locations
      else if(player.faction == F_ENGINEERS && game.finalscoring != 1 && roundnum <= 4) {
        if(action.co[0]==1 && action.co[1]==5) tilelink = 1; //value to force build here
      }
      else if(player.faction == F_ENGINEERS && built_sh(player) == 1 && roundnum >= 4 ) {
        if(action.co[0]==0 && action.co[1]==3) tilelink = 3;
      }
      else if(player.faction == F_ENGINEERS && roundnum >= 3 && game.finalscoring < 3) {
        if(action.co[0]==1 && action.co[1]==7) tilelink = 2;
      }
      else if(player.faction == F_NOMADS && roundnum >= 3 && game.finalscoring > 1) {
        if(action.co[0]==10 && action.co[1]==1) tilelink = 2;
      }

      //LOU15 design progression to get distance and settlements
      if(player.faction == F_DWARVES && state.worldMap == 4 && game.finalscoring > 2) {
        if(action.co[0]==6 && action.co[1]==6) tilelink = 3;
        else if(action.co[0]==12 && action.co[1]==3) tilelink = 1;
        else if(action.co[0]==1 && action.co[1]==8) tilelink = 1;
        else if(action.co[0]==3 && action.co[1]==8) tilelink = 2;
        else if(action.co[0]==4 && action.co[1]==5) tilelink = -5;
        else if(action.co[0]==7 && action.co[1]==3) tilelink = -5;
        else if(action.co[0]==11 && action.co[1]==7) tilelink = -3;
        else if(action.co[0]==3 && action.co[1]==6 && game.finalscoring ==3) tilelink = -2;
        if(AILou.info) addLog('DWARVES loc: '+action.co[0]+'-'+action.co[1]+ '  tilelink: '+tilelink);
      }

      if(game.finalscoring == 1 && roundnum > 4) {
        var result2 = [];
        //TODO: replicates calculateNetworkClusters internally
        result2 = getOutpostEndScores();
        numOutpostPlus = result2[player.index][1];
        outpostcon = Math.min((numOutpostPlus - numOutpost), result1[player.index][0]);
      }
      //remove dwelling and extra shipping
      setBuilding(action.co[0], action.co[1], B_NONE, player.woodcolor);
      player.shipping = xshipping;

      //LOU for AI Level > 1, examine VP gain at end
      if(AILou.ail > 1  && roundnum == 6) {
        scoreProjection = projectEndGameScores();
        scoreNow = scoreProjection[player.index];
        setBuilding(action.co[0], action.co[1], B_D, player.woodcolor);
        scoreProjection = projectEndGameScores();
        scoreDwell = scoreProjection[player.index];
        scoreDiff = scoreDwell - scoreNow;
        setBuilding(action.co[0], action.co[1], B_NONE, player.woodcolor);
        if(scoreDiff > 2) {
          newtown += scoreDiff;
          if(AILou.info) addLog('DWELL: '+logPlayerNameFun(player)+' AI endwell scoreNow: '+scoreNow+' scoreDwell: ' + scoreDwell+' location: '+letters[action.co[1]]+numbers[action.co[0]]);
        }
      }

      //==== BRIDGE action for Dwelling  ====
      if(values.forbridge > 0) {
        var dirs = [D_N, D_NE, D_SE, D_S, D_SW, D_NW];
        for(var j = 0; j < dirs.length; j++) {
          var co = bridgeCo(action.co[0], action.co[1], dirs[j], game.btoggle);
          if(outOfBounds(co[0], co[1])) continue;
          if(canHaveBridge(action.co[0], action.co[1], co[0], co[1], player.color) && isOccupiedBy(co[0], co[1], player.woodcolor)) forbridge++;
        }
      }

      //LOU WITCHES D in FI World- add points for closest green hex to another WITCHES hex
      if(player.faction == F_WITCHES && roundnum >= 3 && state.worldMap == 4) {
        if(action.co[0]==4 && action.co[1]==5) tilelink += 2;        //green tile center
        else if(action.co[0]==12 && action.co[1]==1) tilelink += 1;  //turn gray tile right
        else if(action.co[0]==8 && action.co[1]==4) tilelink += 2;   //turn gray tile to connect D11
        else if(action.co[0]==7 && action.co[1]==4) tilelink += 3;   //green tile next
        else if(action.co[0]==6 && action.co[1]==6) tilelink += 2;   //green tile
        else if(action.co[0]==7 && action.co[1]==0) tilelink += 1;   //green tile top
        else if(action.co[0]==1 && action.co[1]==5) tilelink += 2;   //red shipping 2 tile left
      }
        //LOU13 WITCHES_D - lose points for green hex far away
        //LOU13 - to use, must have SH already, look for any Green location
        //LOU13 - adjacency first, then one shipping, then two shipping, then board center
        if(type == A_WITCHES_D && getWorld(action.co[0], action.co[1]) == G) {
          var tileGreen = 0;
          if(existingtown > 0) { existingtown++; tileGreen++ }
          else if(towardstown > 0) { towardstown++; tileGreen++ }
          else {
            var tiles = getFreeTilesReachableByShipping(player, 1);
            for(var t = 0; t < tiles.length; t++) {
              if(action.co[0] == tiles[t][0] && action.co[1] == tiles[t][1]) {
                tilelink += 4; tileGreen++;
                //LOU15 tile at World4-F2 may be needed to get that section
              }
            }
            tiles = getFreeTilesReachableByShipping(player, 2);
            for(var t = 0; t < tiles.length; t++) {
              if(action.co[0] == tiles[t][0] && action.co[1] == tiles[t][1]) {
                 tilelink += 2 ; tileGreen++;
              }
            }
          }
          if(tileGreen == 0) tilelink = -2;
        }

      //LOU13 - quit before A_BUILD and wait for A_WITCHES_D
      //avoid factions with blue, gray, or RW color adjacent
      if(player.faction == F_WITCHES && player.b_sh == 0 && player.b_d > 0
        && !player.octogons[A_WITCHES_D] && roundnum >= 4) {
        //LOU 13 subtract value if adjacent building can build on the new color
        var newtown2 = 0;
        var colorCode = B;  //blue
        var countBuild = AILou.getBuildingTilesAdjacent(colorCode, action.co[0], action.co[1]);
        newtown2 -= countBuild[2];
        colorCode = S;  //gray
        countBuild = AILou.getBuildingTilesAdjacent(colorCode, action.co[0], action.co[1]);
        newtown2 -= countBuild[2];
        var countColor = AILou.getColorTilesAdjacent(player, action.co[0], action.co[1]);
        //increase value of adding D next to other D (limit roundnum for this)
        if(existingtown == 0 && towardstown == 0) {
          newtown2 += countColor[2]*2;
        }
        else if(towardstown > 0) newtown2 += 5;
        if(AILou.info && newtown2 > 0) {
          addLog('WITCH: AI New Dwelling: '+logPlayerNameFun(player)+' newtown: '+newtown
            +' location: '+letters[action.co[1]]+numbers[action.co[0]]);
        }
      }

    //==== TRADING POST ====
    } else if(type == A_UPGRADE_TP) {
      subtractIncome(res, player.getFaction().getBuildingCost(B_TP, hasNeighbor(action.co[0], action.co[1], player.woodcolor)));
      b_tp++;
      if(touchesExistingTownWood(action.co[0], action.co[1], player.woodcolor)) existingtown++;
      if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
    } else if(type == A_SWARMLINGS_TP) {
      b_tp++;
      if(touchesExistingTownWood(action.co[0], action.co[1], player.woodcolor)) existingtown++;
      if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;

    //==== TEMPLE actions ====
    } else if(type == A_UPGRADE_TE) {
      subtractIncome(res, player.getFaction().getBuildingCost(B_TE, false));
      b_te++;

      //add IceMaidens SH bonus for one temple
      if(AILou.ail > 1 && player.faction == F_ICEMAIDENS) res[4] += 3*built_sh(player)*(7-roundnum);

      //no size increase so no "touchesExistingTown" test here
      // avoid isolated TP for upgrade TE
      var countColor = AILou.getColorTilesAdjacent(player, action.co[0], action.co[1]);
      if(roundnum > 3 && countColor[2] == 0) shtosacon -= 6;
      else if(roundnum > 3 && countColor[2] == 1) shtosacon -= 2;
      //final scoring is SH_SA, get TE far away from SH, but not isolated
      if(game.finalscoring == 2 && built_sh(player)) {
        var hx, hy;
        for(var y = 0; y < game.bh; y++) {
        for(var x = 0; x < game.bw; x++) {
          var building = getBuilding(x, y);
          if(woodColorToPlayerMap[building[1]] == player.index) {
          if(building[0] == B_SH) {
            hx = x;
            hy = y;
          }
          }
        }
        }
        if(countColor[2] > 0) {
          shtosacon += hexDist(hx, hy, action.co[0], action.co[1]);
          if(AILou.info) addLog('SHTE: AI Distance SHTE: '+logPlayerNameFun(player)+' hexdist: '+shtosacon+' location: '+letters[action.co[1]]+numbers[action.co[0]] );
        }
      }

    //==== STRONGHOLD/SANCTUARY actions. SA for rounds 4+====
    } else if(type == A_UPGRADE_SH) {
      subtractIncome(res, player.getFaction().getBuildingCost(B_SH, false));
      b_sh++;
      if(player.faction == F_MERMAIDS) shipping++;

      //add IceMaidens SH bonus for built temples
      if(AILou.ail > 1 && player.faction == F_ICEMAIDENS) res[4] += 3*built_te(player)*(7-roundnum);

      if(touchesExistingTownWood(action.co[0], action.co[1], player.woodcolor)) existingtown++;
      //if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
      //examine SH/SA distance for conditions
     if(game.finalscoring == 2 && built_sa(player)) {
      var xshipping = player.shipping;
      if (xshipping == 0) {
        if(!(player.faction == F_FAKIRS || player.faction == F_DWARVES || player.faction == F_RIVERWALKERS)) player.shipping++;
      }
      //place temporary SH
      setBuilding(action.co[0], action.co[1], B_SH, player.woodcolor);
      player.b_sh = 0;
      var result = [];
      result = getSantuaryStrongholdEndScores();
      var scodis = result[player.index];
      var scoreSHSA = scodis[0];
      var distanceSHSA = scodis[1];
      if(AILou.info) {
        addLog('SHSA: AI Distance SHSA: '+logPlayerNameFun(player)+' hexdist: '  +distanceSHSA+ ' VP now: ' + scoreSHSA+' location: '+letters[action.co[1]]+numbers[action.co[0]] );
      }
      //remove SH and extra shipping
      setBuilding(action.co[0], action.co[1], B_TP, player.woodcolor);
      player.b_sh = 1;
      player.shipping = xshipping;
      if(roundnum > 4) shtosacon = Math.min(scoreSHSA, distanceSHSA*values.shtosacon);
     }
    } else if(type == A_UPGRADE_SA) {
      subtractIncome(res, player.getFaction().getBuildingCost(B_SA, false));
      b_sa++;

      //see if there is enough resources leftover after SA to build a TE first
      if(game.finalscoring == 2 && roundnum ==6 && built_sh(player)) {
        var rest = res;
        if(AILou.ail > 1 ) subtractIncome(rest, player.getFaction().getBuildingCost(B_TE, false));
        if((player.c+player.pw2 + rest[0]) >= 0 && (player.w + player.p + rest[1]) >= 0) {
          if(AILou.info) {
            addLog('TEMPLE_BUILD: '+logPlayerNameFun(player)+' location: '+letters[action.co[1]]+numbers[action.co[0]]
              +' player res(c,w,p,pw2): '+player.c+', '+player.w+', '+player.p+', '+player.pw2+ '  SA,TE res: '+rest[0]+', '+rest[1]);
          }
          //try to build the TE first, may be further away, b_sa--
        }
      }
      //subtract IceMaidens SH bonus for one temple
      if(AILou.ail > 1 && player.faction == F_ICEMAIDENS) res[4] -= 3*built_sh(player)*(7-roundnum);

      if(touchesExistingTownWood(action.co[0], action.co[1], player.woodcolor)) existingtown++;
      //if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
      //examine SH/SA distance for conditions
      if(game.finalscoring == 2 && built_sh(player)) {
      //give value for expanding network connectivity (move into new function)
      // 1. examine SH_SA distance, default shipping from 0 to 1
      // 2. place tempoorary SA/SH on location,
      // 3. compute the SH_SA distance
      // 4. assign value to SH_SA distance, compare with others now
      // 5. erase SA/SH, restore TE/TP, return shipping
      var xshipping = player.shipping;
      if (xshipping == 0) {
        if(!(player.faction == F_FAKIRS || player.faction == F_DWARVES || player.faction == F_RIVERWALKERS)) player.shipping++;
      }
      //place temporary SA
      setBuilding(action.co[0], action.co[1], B_SA, player.woodcolor);
      player.b_sa = 0;
      var result = [];
      //Definition:  for(var j = 0; j < scores.length; j++) result[j] = [scores[j], values[j]];
      result = getSantuaryStrongholdEndScores();
      var scodis = result[player.index];
      var scoreSHSA = scodis[0];
      var distanceSHSA = scodis[1];
      if(AILou.info) {
        addLog('SHSA: AI Distance SHSA: '+logPlayerNameFun(player) +' hexdist: '  +distanceSHSA + ' VP now: ' + scoreSHSA +' location: '+letters[action.co[1]]+numbers[action.co[0]]);
      }
      //remove SA and extra shipping
      setBuilding(action.co[0], action.co[1], B_TE, player.woodcolor);
      player.b_sa = 1;
      player.shipping = xshipping;
      if(roundnum > 4) shtosacon = Math.min(scoreSHSA, distanceSHSA*values.shtosacon);
     }

    //==== CULT actions ====
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
      subtractIncome(res, player.getActionCost(A_ADV_SHIP));
      res[4] += getAdvanceShipVP(player);
      shipping++;
    } else if(type == A_ADV_DIG) {
      subtractIncome(res, player.getActionCost(A_ADV_DIG));
      res[4] += getAdvanceDigVP(player);
      digging++;

    //==== BRIDGES ====
    } else if(type == A_POWER_BRIDGE) {
      res[3] -= 3;
      bridge++;
    } else if(type == A_ENGINEERS_BRIDGE) {
      res[1] -= 2;
      conbridge++;
    } else if(type == A_PLACE_BRIDGE) {
      //LOU all bridges should be SelfConected except for FORBRIDGE
      if (conbridge) {
        if(AILou.info) addLog(' BRIDGE LOCATION:'+action.cos[0][0]+','+action.cos[0][1]+','+ action.cos[1][0]+','+ action.cos[1][1]);
        //Check for both sides having same color
        var building1 = getBuilding(action.cos[0][0], action.cos[0][1]);
        var building2 = getBuilding(action.cos[1][0], action.cos[1][1]);
        if(building1[0] == B_NONE || building2[0] == B_NONE) {
          //One side has no building so there is no scoring connection yet
          if(AILou.info) addLog(' BUILDING NONE:'+action.cos[0][0]+','+action.cos[0][1]+','+ action.cos[1][0]+','+ action.cos[1][1]);
          conbridge = 0;
          forbridge++;
        }
        else if(building1[1] != player.color || building2[1] != player.color) {
          conbridge = 0;
        }
      }
    } else if(type == A_TUNNEL) {
      res[4] += 4;
    } else if(type == A_CARPET) {
      res[4] += 4;
    } else if(type == A_SHIFT || type == A_SHIFT2) {
      res[4] += 2;
      var shiftcost = state.fireiceerrata ? 5 : 3;
      if(type == A_SHIFT) {
        res[3] -= shiftcost;
        shift++;
      } else if(type == A_SHIFT2) {
        //remove tokens from pw0 and pw1 (cost?)
        //TODO correction needed here for cost of tokens
        //TODO move tokens first from pw2 to pw0 for coin.
        if (player.pw0+player.pw1 >= shiftcost) {
          burn += shiftcost;
          shift2++;  //must be temporary
        }
      }
    }

    //how many favor or town tiles does this action provide?
    t_fav += action.favtiles.length;
    t_tw += action.twtiles.length;

    if(values.specific[action.type]) spec += values.specific[action.type];
  }

  //==== more CULT actions for movement up cult track ====
  if(cult[0] || cult[1] || cult[2] || cult[3]) {
    //cap the cults to max of cult track
    for(var i = C_F; i <= C_A; i++) {
      var total = cult[i];
      var actual = willGiveCult(player, i, total);
      if(t_tw && player.cult[i] + actual == 9 && total > actual) actual++;
      //new town key not known by willGiveCult
      cult[i] = actual;

      res[3] += cultPower(player.cult[i], player.cult[i] + actual);
    }

    var oldcult = player.cult;
    var newcult = [player.cult[0] + cult[0], player.cult[1] + cult[1], player.cult[2] + cult[2], player.cult[3] + cult[3]];
    var oldpriests = getCultPriests(player);

    var newpriests = oldpriests - res[2];

    var cultincome = getAllComingCultRoundBonuses(oldcult, newcult, oldpriests, newpriests);

    sumIncome(res, cultincome[0]);
    cultspades += cultincome[1];
  }

  //==== all round, favor, and bonus TILES should be in here ====

  //D round and favor tiles
  if(getRoundTile() == T_ROUND_D2VP_4W1P || getRoundTile() == T_ROUND_D2VP_4F4PW) {
    res[4] += b_d * 2;
  }
  else if(getRoundTileP1() == T_ROUND_D2VP_4W1P || getRoundTileP1()  == T_ROUND_D2VP_4F4PW) {
    res[4] += b_d * 2 * defer1;
  }
  else if(getRoundTileP2() == T_ROUND_D2VP_4W1P || getRoundTileP2()  == T_ROUND_D2VP_4F4PW) {
    res[4] += b_d * 2 * defer2;
  }
  if(player.favortiles[T_FAV_1E_DVP]) {
    res[4] += b_d * 2;
  }

  //TP round and favor tiles
  if(getRoundTile()  == T_ROUND_TP3VP_4W1DIG || getRoundTile() == T_ROUND_TP3VP_4A1DIG) {
    res[4] += b_tp * 3;
  }
  else if(getRoundTileP1() == T_ROUND_TP3VP_4W1DIG || getRoundTileP1() == T_ROUND_TP3VP_4A1DIG) {
    res[4] += b_tp * 3 * defer1;
  }
  else if(getRoundTileP2() == T_ROUND_TP3VP_4W1DIG || getRoundTileP2() == T_ROUND_TP3VP_4A1DIG) {
    res[4] += b_tp * 3 * defer2;
  }
  if(player.favortiles[T_FAV_1W_TPVP]) {
    res[4] += b_tp * 3;
  }

  //TE round tile (fire-ice update)
  if(getRoundTile() == T_ROUND_TE4VP_P2C) {
    res[4] += b_te * 4;
  }
  else if(getRoundTileP1() == T_ROUND_TE4VP_P2C) {
    res[4] += b_te * 4 * defer1;
  }
  else if(getRoundTileP2() == T_ROUND_TE4VP_P2C) {
    res[4] += b_te * 4 * defer2;
  }

  //BONUS TILES
  if(player.bonustile == T_BON_PASSDVP_2C) {
    res[4] -= b_tp * 1;
    res[4] += b_d * 1;
  }
  else if(player.bonustile == T_BON_PASSTPVP_1W) {
    res[4] += b_tp * 2;
    res[4] -= b_sh * 2;
    res[4] -= b_te * 2;
  }
  else if(player.bonustile == T_BON_PASSSHSAVP_2W) res[4] += (b_sh + b_sa) * 4;
  else if(player.bonustile == T_BON_PASSSHIPVP_3PW) res[4] += shipping * 3;

  //SH and SA round tiles
  if(getRoundTile() == T_ROUND_SHSA5VP_2F1W || getRoundTile() == T_ROUND_SHSA5VP_2A1W) {
    res[4] += b_sh * (game.finalscoring == 2 ? 6:4);  //resources away from network
    res[4] += b_sa * (game.finalscoring == 2 ? 6:4);  //resources away from network
  }
  else if(getRoundTileP1() == T_ROUND_SHSA5VP_2F1W || getRoundTileP1() == T_ROUND_SHSA5VP_2A1W) {
    res[4] += (b_sh + b_sa) * 5 * defer1;
  }
  else if(getRoundTileP2() == T_ROUND_SHSA5VP_2F1W || getRoundTileP2() == T_ROUND_SHSA5VP_2A1W) {
    res[4] += (b_sh + b_sa) * 5 * defer2;
  }

  //DIG
  if(getRoundTile() == T_ROUND_DIG2VP_1E1C) {
    res[4] += spades * 2;
  }
  if(player.faction == F_HALFLINGS) {
    res[4] += spades;
  }
  if(player.faction == F_DARKLINGS) {
    res[4] += workerdig * 2;
  }

  //TOWN - delay gives opportunity for 5 VP and FAV5
  if(getRoundTile() == T_ROUND_TW5VP_4E1DIG) {
    res[4] += t_tw * 5;
  }
  else if((b_sh + b_sa) > 0 &&
   (getRoundTile() == T_ROUND_SHSA5VP_2F1W || getRoundTile() == T_ROUND_SHSA5VP_2A1W)) {}
  else if(getRoundTileP1() == T_ROUND_TW5VP_4E1DIG && bridge == 0) {
    res[4] += t_tw * (player.favortiles[T_FAV_2F_6TW] ? 15:20) * defer1;
    if (t_tw > 0) {
      towardstown = 0;
      if(AILou.info && action != undefined && action.co != null)
        addLog('TOWN: AI TOWN deferral for ONE round: '+numbers[player.faction]
        +' townVP: '+res[4]+' location: '+letters[action.co[1]]+numbers[action.co[0]]);
    }
  }
  else if(getRoundTileP2() == T_ROUND_TW5VP_4E1DIG && bridge == 0) {
    res[4] += t_tw * (player.favortiles[T_FAV_2F_6TW] ? 15:20) * defer2;
    if (t_tw > 0) {
      towardstown = 0;
      if(AILou.info && action != undefined && action.co != null)
        addLog('TOWN: AI TOWN deferral for TWO rounds: '+numbers[player.faction]
        +' townVP: '+res[4]+' location: '+letters[action.co[1]]+numbers[action.co[0]]);
    }
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
  for(var i = C_F; i <= C_A; i++) {
    var num = cult[i];
    if(num == 1) result += values.cult[0][i];
    else if(num == 2) result += values.cult[1][i];
    else if(num == 3) result += values.cult[2][i];
    else if(num > 3) result += values.cult[2][i] + (num - 3) * values.cult[0][i];
  }
  result += p_gone * values.p_gone;
  result += spec;
  result = Math.max(Math.min(1, result), result + existingtown * values.existingtown);
  //don't overpenalize this one
  result += towardstown * values.towardstown;
  result += interacts * values.interacts;
  result += newtown;
  result += networkcon * values.networkcon;
  result += outpostcon * values.outpostcon;
  result += shtosacon;
  result += distancon * values.distancon;
  result += settlecon * values.settlecon;
  result += shift * values.shift;
  result += shift2 * values.shift2;
  result += tilelink;

  //special rule to attempt stop of SA and bridge before round 4
  if(b_sa > 0 && roundnum < 4 && player.faction != F_CHAOS) result = 0;
  if(bridge > 0 && roundnum < 4 && player.faction != F_CHAOS) result = 0;
  if(conbridge > 0 && roundnum < 5) result = 0;

  return result;
};

//how close are neighbor tiles to the given color, up to distance 3.
//occupied tiles don't count
//center tile counts if center is true
//equal ==> +3. 1 dig ==> +2. distance > 1 ==> -(distance - 1)
//TODO: take giants and nomads into account here, for them these distances don't (always) matter
//LOU: also riverwalkers do not depend upon build distance
AILou.scoreTileDigEnvironment = function(player, tx, ty, color, center) {
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
      var colordist = digDist(player, color, color2);
      var colorscore = dist == 0 ? 4 : 3 - colordist;
      if(colordist <= 1) score += Math.max(0, colorscore - dist + 1);
    }
  }
  return score;
};

//TODO: here, too, giant and nomad enemy
AILou.scoreTileEnemyEnvironment = function(tx, ty, color, center) {
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
};
