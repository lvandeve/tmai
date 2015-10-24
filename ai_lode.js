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

//AI controller.

/*
enkele TODOs:

Intressante stats voor beslissen over actie:
-aantal bereikbare tiles met 0/1(/2/3) digs op uw huidige/1/2 shipping distance
-mogelijke town locaties met zo weinig mogelijk digs
-probeer altijd towns te maken
-bereikbaarheid van relevante tiles door andere players en dig-cost voor hen
-meer round-based hardcoded logic:
--sommige factions willen SH in 1e turn building, of misschien in 2e turn als 2e turn SH/SA 5VP tile heeft
--sommige factions willen shipping snel, andere laat of nooit
--slechts weinig factions willen digging upgraden
--in 1e ronde: zoveel mogelijk dwellings
--in laatste ronde: alles om VP's te maximizen, ook resources zijn VP's waard dus niet verspillen
--in verdere rondes: zoveel mogelijk towns vormen (in 2e is dat vooral "ernaartoe werken")
--het ding dat VP's geeft in huidige ronde zoveel mogelijk doen, en als er volgende ronde iets anders is, dat nu nog niet doen (bv geen TP's als volgende ronde 3VP/TP geeft)
--afhankelijk van uw faction, een bepaalde ideale dwelling/VP/Temple ratio hebben, probeer altijd dwellings te hebben, niet eerst alles upgraden en dan pas nieuwe dwelling
--als geen SH in 1e ronde, consider TE

rekening houden met round scoring tile van next round, bv nu geen houses bouwen als volgende ronde daar punten voor geeft en deze niet (tenzij bv dwelling nu bouwen een 5vp town round score activeert)
*/

var AILode = function() {
  this.scoreActionValues = {};
  this.restrictions = clone(defaultRestrictions);
};
inherit(AILode, Actor);


//given an array of items and an array of corresponding scores, returns the index of the item with best score.
//if the best score is shared between multiple items, a random one of those is chosen so that the AI is not predictable
//used for choosing actions, bonus tiles, favor tiles, town tiles, choosing extra dig locations, etc.....
//distributerandom:
//-if false, picks only the one with best score (randomizing if there are ties).
//-if true, every single item has a chance, the scores are the probability distribution function.
AILode.pickWithBestScore = function(items, scores, distributerandom) {
  if(distributerandom) {
    var sum = 0;
    for(var i = 0; i < scores.length; i++) sum += scores[i];
    // Make it work if all scores are 0
    if(sum <= 0) {
      sum = scores.length;
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
AILode.prototype.doAction = function(playerIndex, callback) {
  var player = game.players[playerIndex];

  this.updateScoreActionValues_(player, state.round);

  var actions = getPossibleActions(player, this.restrictions);

  //TODO: support chaos magicians double action
  var chosen;

  var scores = [];
  for(var j = 0; j < actions.length; j++) {
    scores.push(this.scoreActionAI_(player, actions[j], 0));
  }

  //handy for chrome console debugging: for(var i = 0; i < actions.length; i++) console.log(actionsToString(actions[i]) + ': ' + scores[i]);

  var besti = AILode.pickWithBestScore(actions, scores, false);
  if(scores[besti] > 0) {
    chosen = actions[besti];
  }

  if(!chosen) {
    var action = new Action(A_PASS);
    if(state.round != 6) action.bontile = this.getPreferredBonusTile_(player);
    chosen = [action];
  }

  for(var i = 0; i < chosen.length; i++) {
    for(var j = 0; j < chosen[i].favtiles.length; j++) {
      var tiles = getPossibleFavorTiles(player, chosen[i].favtiles);
      chosen[i].favtiles[j] = this.getPreferredFavorTile_(player, tiles);
    }
    for(var j = 0; j < chosen[i].twtiles.length; j++) {
      var tiles = getPossibleTownTiles(player, chosen[i].twtiles);
      chosen[i].twtiles[j] = this.getPreferredTownTile_(player, tiles);
      updateWToPConversionAfterDarklingsSHTownTile(player, chosen[i]);
    }
  }

  var error = callback(playerIndex, chosen);
  if(error != '') {
    addLog('ERROR: AI tried invalid action. Error: ' + error);

    //instead, pass.
    var action = new Action(A_PASS);
    if(state.round != 6) action.bontile = this.getPreferredBonusTile_(player);
    callback(playerIndex, [action]);

    throw new Error('AI tried invalid action: Error: ' + error + ', Action: ' + actionsToString(chosen));
  }
};

AILode.prototype.updateScoreActionValues_ = function(player, roundnum) {

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
    t_fav: 1,
    t_tw: 10, //TODO: if bridge forms town, but both parts were already 6 power or so, give PENALTY for that, because that ruins two towns for just one!
    burn: -0.166,
    bridge: 0,
    conbridge: 0,
    forbridge: 0,
    dig: 0.1, //it must have a positive value but less than the resource cost, so that for e.g. sandstorm it appreciates further dig distances more
    cultspade: 1,
    cult: [[1,1,1,1],[2,2,2,2],[3,3,3,3]],
    p_gone: player.pp < 3 ? -5 : 0,
    existingtown: -2,
    towardstown: 5,
    interacts: 1,
    specific: {}
  };

  var s = this.scoreActionValues;

  for(var i = 1; i <= 3; i++) {
    for(var j = C_F; j <= C_A; j++) {
      s.cult[i - 1][j] = this.scoreCultTrackVP_(player, j, i, false) / (5 - i); //divided because overall a single cult track move is not worth the whole VP
    }
  }

  //make the AI's go for the power actions more aggressively
  s.specific[A_POWER_1P] = 2;
  s.specific[A_POWER_2W] = player.w < 4 ? 5 : 0;
  s.specific[A_POWER_7C] = 5;
  s.specific[A_POWER_SPADE] = 5;
  s.specific[A_POWER_2SPADE] = 6;

  s.t_fav = player.favortiles.length > 3 ? 0 : 1;


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
    s.b_d = 0;
    s.b_tp = 0;
    s.b_te = 0;
    s.b_sh = 0;
    s.b_sa = 0;
  }

  var sanctuarytwiddle = 3; //The AIs are not building sanctuaries.... let's add some score
  s.b_sa += sanctuarytwiddle;

  // make SH essential, except for the given power actions
  var makeSHEssential = function(pow_7c, pow_2w, pow_dig1, pow_dig2) {
    if(built_sh(player) == 0) {
      if(built_tp(player) == 0) s.b_tp += 50;
      s.b_sh += 50;
      // But it should still do these first
      if(pow_7c > 0) s.specific[A_POWER_7C] = 50 + pow_7c;
      if(pow_2w > 0) s.specific[A_POWER_2W] = 50 + pow_2w;
      if(pow_dig1 > 0) s.specific[A_POWER_SPADE] = 50 + pow_dig1;
      if(pow_dig2 > 0) s.specific[A_POWER_2SPADE] = 50 + pow_dig2;
    }
  };

  //Faction specific

  if(player.faction == F_CHAOS) {
    if(built_d(player) > 1 && built_te(player) == 0) s.b_tp += 5;
    s.b_te += 5;
    if(player.shipping == 0) s.shipping += 5;
    else if(roundnum < 6) s.shipping = -5;
  }

  if(player.faction == F_GIANTS) {
    makeSHEssential(5, 10, 0, player.w > 6 ? 15 : 0);
    if(player.shipping == 0) s.shipping += 5;
    else if(roundnum < 6) s.shipping = -5;
  }

  if(player.faction == F_FAKIRS) {
    // Get temple early for priest income
    if(built_te(player) + built_sa(player) == 0) {
      if(built_tp(player) == 0) s.b_tp += 50;
      s.b_te += 50;
      // But it should still do these first
      s.specific[A_POWER_1P] = 70;
      s.specific[A_POWER_7C] = 60;
      s.specific[A_POWER_2W] = 60;
      s.specific[A_POWER_SPADE] = 70;
      s.specific[A_POWER_2SPADE] = 70;
    }
    // There is nothing for stronghold here because quite frankly it's expensive and not that good
  }

  if(player.faction == F_NOMADS) {
    makeSHEssential(5, 10, player.w > 6 ? 10 : 0, player.w > 6 ? 10 : 0);
  }

  if(player.faction == F_HALFLINGS) {
    s.digging = 20;
    s.b_sh = built_te(player) > 0 ? 8 : 0;
    if(roundnum < 6) s.b_d += 2;
    // Do get some dwellings first
    if(player.digging < 2 && built_d(player) > 2) {
      if(player.p == 0) s.specific[A_POWER_1P] = 20;
      if(built_te(player) == 0) {
        if(built_tp(player) == 0) s.b_tp += 20;
        s.b_te += 20;
      }
    }
  }

  if(player.faction == F_CULTISTS) {
    if(roundnum < 5) s.b_sh = 0; //don't waste resources on the SH
    else s.b_sh = 7;
    s.interacts += 2;
  }

  if(player.faction == F_ALCHEMISTS) {
    makeSHEssential(10, 10, 0, player.w > 6 ? 15 : 0);
    if(roundnum < 6) s.b_d += 2; //because alchemists will be low on workers
  }

  if(player.faction == F_DARKLINGS) {
    s.p += 2;
    s.dig += 2; //otherwise they'll refuse to use the priests for the digging...
    s.b_sh = (player.w > 6 && player.c >= 4) ? 10 : -5; //only build SH if can convert 3w to 3p and must not burn too much mana
    if(roundnum < 6) s.b_te += 5;
  }

  if(player.faction == F_MERMAIDS) {
    if(roundnum < 6) s.b_te += 5;
    if(player.shipping < 3) s.shipping += 10;
    if(roundnum < 6) s.b_d += 10;
  }

  if(player.faction == F_SWARMLINGS) {
    if(roundnum > 1) makeSHEssential(10, 10, 0, player.w > 6 ? 15 : 0); //only in round 2 because I think a too early SH for swarmlings results in too few dwellings ==> no worker income
    // all their buildings must have increased score, or they'll refuse to spend resources on them
    if(roundnum < 6) {
      s.b_d++;
      s.b_tp++;
      s.b_te++;
      s.b_sh++;
      s.b_sa++;
    }
  }

  if(player.faction == F_ENGINEERS) {
    s.w += 0.5; //do NOT make this number any higher. Setting it to += 1 makes engineers build nothing anymore...
    s.conbridge = 20;
    if(built_bridges(player) == 0) s.forbridge = 5;
    if(roundnum == 1 && built_d(player) > 1) s.b_tp += 3;
    if(roundnum == 1 && built_te(player) == 0) s.b_te += 3;
    if(built_bridges(player) && built_sh(player) == 0) {
      s.b_sh += 20;
      if(built_tp(player) == 0) {
        s.b_tp += 20;
        s.b_te = -20;
      }
    }
    if(player.shipping == 0) s.shipping += 3;
    else s.shipping = -5;
    if(roundnum < 6) s.digging = -5;
    if(roundnum > 1 && built_bridges(player) < 2 && player.shipping > 0) s.b_d += 5;
    if(built_d(player) < 3) s.b_d += 5;
  }

  //other not yet optimzed factions that should build SH soon
  if(player.faction == F_WITCHES) {
    if(player.b_sh != 0) {
      if(built_d(player) >= 2 && built_tp(player) == 0) s.b_tp = 5;
      s.b_sh = 5;
      s.b_te = -5; //no way, first SH
    }
  }
  if(player.faction == F_DWARVES || (player.faction == F_FAKIRS && built_sh(player))) {
    s.digging = 0; //they should go to non-dig places instead
  }

  // Final finetuning

  if(built_te(player) + built_sa(player) == 0) s.b_te += 2;
  if(built_d(player) == 8) s.b_tp += s.b_d; //make room for more dwellings
  if(built_tp(player) == 4) s.b_te += s.b_tp; //make room for more tps
  if(built_d(player) < 2) s.b_tp = 0; //ensure to have some worker income
  s.specific[A_CONVERT_5PW_1P] = -1 -s.digging; //no matter how good that action for some races, don't burn 5 pw for it...

  // Update restrictions based on that too
  this.restrictions = {
    w_cost: s.w,
    p_cost: s.p,
    pw_cost: s.pw,
    burn_cost: -s.burn,
    max_burn: (roundnum < 6 ? 6 : 4),
    digFun: defaultRestrictions.digFun
  };
};

AILode.prototype.scoreActionAI_ = function(player, actions, roundnum) {
  return AILode.scoreAction(player, actions, this.scoreActionValues, roundnum);
};

//bonus tiles chosen from world
AILode.prototype.getPreferredBonusTile_ = function(player) {
  if(!this.scoreActionvalues) this.updateScoreActionValues_(player, state.round);

  var avtiles = [];
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) {
    if(game.bonustiles[i]) avtiles.push(i);
  }

  var scores = [];
  for(var i = 0; i < avtiles.length; i++) {
    scores.push(this.scoreBonusTile_(player, avtiles[i], state.round));
  }

  return avtiles[AILode.pickWithBestScore(avtiles, scores, false)];
};

AILode.prototype.scoreBonusTile_ = function(player, tile, roundnum) {
  var score = 0;
  var s = this.scoreActionValues;

  if(tile == T_BON_SPADE_2C) {
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
    score += s.c * 4;
    score += s.cult[0][0];
    if(player.c < 8) score++;
  }
  else if(tile == T_BON_6C) {
    score += s.c * 6;
    if(player.c < 8) score += 2;
  }
  else if(tile == T_BON_3PW_SHIP) {
    score += s.pw * 3;
    score += getNumFreeTilesReachableByShipping(player, player.shipping + 1)[0] * 3;
    if(roundnum < 3 && player.faction != F_NOMADS && player.faction != F_HALFLINGS) score++; //TODO what is the value of shipping?
  }
  else if(tile == T_BON_3PW_1W) {
    score += s.pw * 3;
    score += s.w;
  }
  else if(tile == T_BON_PASSDVP_2C) {
    score += s.c * 2;
    score += 1 * built_d(player); //todo: it must use the number of dwellings it expects to have built next round here
    if(roundnum > 3) score++;
  }
  else if(tile == T_BON_PASSTPVP_1W) {
    score += s.w * 1;
    score += 1 * built_tp(player) * 2; //todo: idem
    if(roundnum > 3) score++;
  }
  else if(tile == T_BON_PASSSHSAVP_2W) {
    score += s.w * 2;
    score += (built_sh(player) + built_sa(player)) * 4; //todo: idem
    if(roundnum > 3) score++;
  }
  else if(tile == T_BON_1P) {
    score += s.p * 1;
  }
  else if(tile == T_BON_PASSSHIPVP_3PW) {
    score += player.shipping * 3 + s.pw * 3;
  }

  score += s.c * undef0(game.bonustilecoins[tile]);

  return score;
};


//favor tile chosen from given array
AILode.prototype.getPreferredFavorTile_ = function(player, tiles) {
  var scores = [];
  for(var i = 0; i < tiles.length; i++) {
    scores.push(this.scoreFavorTile_(player, tiles[i], state.round));
  }

  return tiles[AILode.pickWithBestScore(tiles, scores, false)];
};

AILode.prototype.scoreFavorTile_ = function(player, tile, roundnum) {
  var score = 0;

  if(tile == T_FAV_3F) {
    if(player.cult[C_F] < 8) score++;
  }
  else if(tile == T_FAV_3W) {
    if(player.cult[C_W] < 8) score++;
  }
  else if(tile == T_FAV_3E) {
    if(player.cult[C_E] < 8) score++;
  }
  else if(tile == T_FAV_3A) {
    if(player.cult[C_A] < 8) score++;
  }
  else if(tile == T_FAV_2F_6TW) {
    score++;
  }
  else if(tile == T_FAV_2W_CULT) {
    score += 2;
  }
  else if(tile == T_FAV_2E_1PW1W) {
    if(roundnum <= 3) score += 2;
    if(player.faction == F_ENGINEERS && roundnum < 3) score += 2;
  }
  else if(tile == T_FAV_2A_4PW) {
    if(roundnum <= 3) score += 2;
    if(player.faction == F_ENGINEERS && roundnum < 3) score += 2;
  }
  else if(tile == T_FAV_1F_3C) {
    if(roundnum <= 3) score += 3;
    else if(roundnum == 4) score += 2;
    else if(roundnum == 5) score += 1;
  }
  else if(tile == T_FAV_1W_TPVP) {
    if(player.b_tp > 0) score += 3;
  }
  else if(tile == T_FAV_1E_DVP) {
    if(player.b_d > 0) score += 3;
    if(player.faction == F_HALFLINGS) score += 3;
  }
  else if(tile == T_FAV_1A_PASSTPVP) {
    if(built_tp(player) > 1)score += 3;
  }

  return score;
};


//town tile chosen from given array
AILode.prototype.getPreferredTownTile_ = function(player, tiles) {
  var scores = [];
  for(var i = 0; i < tiles.length; i++) {
    scores.push(this.scoreTownTile_(player, tiles[i], state.round));
  }

  return tiles[AILode.pickWithBestScore(tiles, scores, false)];
};

AILode.prototype.scoreTownTile_ = function(player, tile, roundnum) {
  var score = 0;

  if(tile == T_TW_2VP_2CULT) {
    //TODO: calculate if increasing all cults is benificial and give better score based on that
    score++;
  }
  else if(tile == T_TW_4VP_SHIP) {
    if(player.faction != F_DWARVES) score += 2;
  }
  else if(tile == T_TW_5VP_6C) {
    if(player.c < 10) score += 2;
  }
  else if(tile == T_TW_6VP_8PW) {
    if(player.pw0  * 2 + player.pw1 >= 7) score += 2;
  }
  else if(tile == T_TW_7VP_2W) {
    if(player.w < 4) score += 2;
  }
  else if(tile == T_TW_8VP_CULT) {
    //TODO: calculate if increasing all cults is benificial and give better score based on that
    score++;
  }
  else if(tile == T_TW_9VP_P) {
    if(player.p == 0) score += 2;
  }
  else if(tile == T_TW_11VP) {
    if(state.round >= 6) score += 2;
  }

  return score;
};

AILode.prototype.chooseInitialBonusTile = function(playerIndex, callback) {
  var tile = this.getPreferredBonusTile_(game.players[playerIndex]);

  var error = callback(playerIndex, tile);
  if(error != '') {
    addLog('ERROR: AI tried invalid bonus tile. Error: ' + error);
    throw new Error('AI tried invalid bonus tile. Error: ' + error);
  }
};

AILode.prototype.chooseInitialFavorTile = function(playerIndex, callback) {
  var player = game.players[playerIndex];
  var tiles = getPossibleFavorTiles(player, {});
  var tilemap = {};
  for(var i = 0; i < tiles.length; i++) tilemap[tiles[i]] = true;

  var tile;
  if(tilemap[T_FAV_1E_DVP]) tile = T_FAV_1E_DVP;
  else if(tilemap[T_FAV_1E_DVP]) tile = T_FAV_1W_TPVP;
  else tile = T_FAV_2W_CULT;

  var error = callback(playerIndex, tile);
  if(error != '') {
    addLog('ERROR: AI tried invalid favor tile. Error: ' + error);
    throw new Error('AI tried invalid favor tile. Error: ' + error);
  }
};

//callback result (second parameter) should be the chosen color emum value
AILode.prototype.chooseAuxColor = function(playerIndex, callback) {
  var player = game.players[playerIndex];

  var ispriestcolor = false;
  if(player.color == Z && player.colors[player.woodcolor - R]) ispriestcolor = true;

  var colors = [];
  for(var i = CIRCLE_BEGIN; i <= CIRCLE_END; i++) {
    if(!ispriestcolor && auxColorToPlayerMap[i] == undefined && colorToPlayerMap[i] == undefined) colors.push(i);
    if(ispriestcolor && !player.colors[i - R]) colors.push(i);
  }

  var chosen;

  if(player.color == Z && mayGetPriestAsColor(player) < 3) {
    chosen = Z; //riverwalkers choosing priest - just always prefer is as soon as 5 colors unlocked (not smart AI, TODO: improve)
  } else {
    var scores = [];
    for(var i = 0; i < colors.length; i++) {
      var color = colors[i];
      var score = 0;
      if(auxColorToPlayerMap[wrap(color - 1, R, S + 1)] == undefined) score++;
      if(auxColorToPlayerMap[wrap(color + 1, R, S + 1)] == undefined) score++;
      scores[i] = score;
    }

    var i = AILode.pickWithBestScore(colors, scores, false);
    chosen = colors[i];
  }

  var error = callback(playerIndex, chosen);
  if(error != '') {
    addLog('ERROR: AI tried invalid faction color. Error: ' + error);
    throw new Error('AI tried invalid faction color. Error: ' + error);
  }
};

AILode.prototype.chooseInitialDwelling = function(playerIndex, callback) {
  var player = game.players[playerIndex];
  var chosen = undefined;

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
    if(player.landdist == 0 && !touchesWater(x, y)) continue;
    if(getWorld(x, y) != player.auxcolor) continue;
    if(getBuilding(x, y)[0] != B_NONE) continue;
    positions.push([x, y]);
  }

  var scores = [];
  for(var i = 0; i < positions.length; i++) {
    var x = positions[i][0];
    var y = positions[i][1];
    var score = 0;
    score += AILode.scoreTileDigEnvironment(player, x, y, player.getMainDigColor(), false);
    score += AILode.scoreTileEnemyEnvironment(x, y, player.getMainDigColor(), false);

    var neighbors = getNumTilesAround(player, x, y);
    if(neighbors[0] == 0 && neighbors[1] == 0) score /= 2; //tile touches no other proper tiles, discourage this

    if(otherDwelling) {
      var h = hexDist(otherDwelling[0], otherDwelling[1], x, y);
      if(h >= 4 && h <= 6) score += 5; //be near your other dwelling but not too near
      if(h < 3) score /= 2; //discourage being extremely close
    }
    scores.push(score);
  }

  var i = AILode.pickWithBestScore(positions, scores, false);
  var chosen = positions[i];

  var error = callback(playerIndex, chosen);
  if(error != '') {
    addLog('ERROR: AI tried invalid initial dwelling. Error: ' + error);
    throw new Error('AI tried invalid initial dwelling. Error: ' + error);
  }
};

AILode.prototype.chooseFaction = function(playerIndex, callback) {
  var factions2 = getPossibleFactionChoices();

  var factions = [];
  for(var i = 0; i < factions2.length; i++) {
    if(factions2[i].color == O || factions2[i].color == X || factions2[i].color == Z) continue; //AIs don't support these yet
    factions.push(factions2[i]);
  }

  var already = getAlreadyChosenColors();
  var scores = [];
  for(var i = 0; i < factions.length; i++) {
    scores[i] = this.scoreFaction_(game.players[playerIndex], already, factions[i]);
  }

  //The scores will be used as probability distribution function for random race choice.
  //But to bring the focus to the good races, subtract the lowest score from each.
  var lowest = 9999;
  for(var i = 0; i < scores.length; i++) lowest = Math.min(lowest, scores[i]);
  for(var i = 0; i < scores.length; i++) scores[i] -= lowest;

  var faction = factions[AILode.pickWithBestScore(factions, scores, true)];

  var error = callback(playerIndex, faction);
  if(error != '') {
    addLog('ERROR: AI chose invalid faction. Error: ' + error);
    throw new Error('AI chose invalid faction. Error: ' + error);
  }
};

//already = object that has true value for each already chosen color
AILode.prototype.scoreFaction_ = function(player, already, faction) {
  var score = 0;
  var color = factionColor(faction);
  if(color >= CIRCLE_BEGIN && color <= CIRCLE_END) {
    if(!already[wrap(color - 1, R, S + 1)]) score++;
    if(!already[wrap(color + 1, R, S + 1)]) score++;
  } else {
    // TODO: better heuristic for expansion colors
    score++;
  }

  // Based on in percentages of http://terra.snellman.net/stats.html
  var factionwinpercentage = 20;
  var index = faction.index;
  if(index == F_CHAOS) factionwinpercentage = 15;
  else if(index == F_GIANTS) factionwinpercentage = 10;
  else if(index == F_FAKIRS) factionwinpercentage = 18;
  else if(index == F_NOMADS) factionwinpercentage = 25;
  else if(index == F_HALFLINGS) factionwinpercentage = 28;
  else if(index == F_CULTISTS) factionwinpercentage = 13;
  else if(index == F_ALCHEMISTS) factionwinpercentage = 24;
  else if(index == F_DARKLINGS) factionwinpercentage = 29;
  else if(index == F_MERMAIDS) factionwinpercentage = 31;
  else if(index == F_SWARMLINGS) factionwinpercentage = 22;
  else if(index == F_AUREN) factionwinpercentage = 11;
  else if(index == F_WITCHES) factionwinpercentage = 14;
  else if(index == F_ENGINEERS) factionwinpercentage = 35;
  else if(index == F_DWARVES) factionwinpercentage = 32;
  // TODO: update and include fire & ice factions

  score += (factionwinpercentage - 10) / 20;

  return score;
};

AILode.prototype.leechPower = function(playerIndex, fromPlayer, amount, vpcost, roundnum, already, still, callback) {
  var player = game.players[playerIndex];
  if(game.players[fromPlayer].faction == F_CULTISTS && !already && roundnum >= 5) {
    callback(playerIndex, false);
    return;
  }

  if(vpcost == 0) {
    callback(playerIndex, true);
    return;
  }

  if(vpcost == 1) {
    callback(playerIndex, roundnum < 5);
    return;
  }

  if(vpcost == 2) {
    callback(playerIndex, roundnum < 3);
    return;
  }

  if(vpcost == 3) {
    callback(playerIndex, roundnum < 2 && player.vp > 20);
    return;
  }

  callback(playerIndex, false);
};

AILode.prototype.doRoundBonusSpade = function(playerIndex, callback) {
  var player = game.players[playerIndex];
  var num = player.spades;
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

AILode.prototype.chooseShapeshiftersConversion = function(playerIndex, callback) {
  callback(playerIndex, state.round < 5);
};

AILode.prototype.chooseCultistTrack = function(playerIndex, callback) {
  var player = game.players[playerIndex];
  this.updateScoreActionValues_(player, state.round);
  var besttrack = this.getBestCultTrack_(player, 1);

  var error = callback(playerIndex, besttrack);
  if(error != '') {
    addLog('ERROR: AI chose invalid cult track. Error: ' + error);
    throw new Error('AI chose invalid cult track. Error: ' + error);
  }
};

AILode.prototype.getBestCultTrack_ = function(player, num) {
  var scores = [];
  for(var i = C_F; i <= C_A; i++) {
    scores.push(this.scoreCultTrack_(player, i, num, true));
  }
  return AILode.pickWithBestScore([C_F, C_W, C_E, C_A], scores, false);
};

//score cult track taking into account: power, bonus resources, relative positions to players and VPs
//cap = take into account top position of cult track or not?
AILode.prototype.scoreCultTrack_ = function(player, cult, num, cap) {
  return this.scoreCultTrackResources_(player, cult, num, cap) + this.scoreCultTrackVP_(player, cult, num, cap);
};

//score cult track taking into account power and bonus resources, but not VPs
//cap = take into account top position of cult track or not?
AILode.prototype.scoreCultTrackResources_ = function(player, cult, num, cap) {
  if(cap) num = willGiveCult(player, cult, num);
  if(num == 0) return 0;

  var result = 0;

  var res = [0,0,0,0,0];
  res[3] += cultPower(player.cult[cult], player.cult[cult] + num);

  var oldcult = player.cult;
  var newcult = [player.cult[0], player.cult[1], player.cult[2], player.cult[3]];
  var oldpriests = getCultPriests(player);
  var newpriests = oldpriests + (num > 1 ? 1 : 0); // TODO: this is not a correct way to determine if a priest is added, some non priest actions add two cult
  newcult[cult] += num;
  cultincome = getAllComingCultRoundBonuses(oldcult, newcult, oldpriests, newpriests);
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
AILode.prototype.scoreCultTrackVP_ = function(player, cult, num, cap) {
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

  // Pure score difference, most important in last round
  /*var pcult = [];
  for(var i = 0; i < game.players.length; i++) pcult[i] = game.players[i].cult[cult];
  var fromcultvp = getDistributedPoints(player.index, pcult, [8,4,2], 1);
  pcult[player.index] += num;
  var tocultvp = getDistributedPoints(player.index, pcult, [8,4,2], 1);

  result += (tocultvp - fromcultvp);*/

  return result;
};


////////////////////////////////////////////////////////////////////////////////




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
AILode.scoreAction = function(player, actions, values, roundnum) {
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
    } else if(type == A_SANDSTORM) {
      dig++; //TODO: use color distance
      if(touchesExistingTown(action.co[0], action.co[1], player.woodcolor)) existingtown++;
      if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
    } else if(type == A_BUILD || type == A_WITCHES_D) {
      if(type == A_BUILD) subtractIncome(res, player.getFaction().getBuildingCost(B_D, false));
      b_d++;
      if(touchesExistingTown(action.co[0], action.co[1], player.woodcolor)) existingtown++;
      if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
      if(hasNeighbor(action.co[0], action.co[1], player.woodcolor)) interacts++;
      if(values.forbridge != 0) {
        var x = action.co[0];
        var y = action.co[1];
        var dirs = [D_N, D_NE, D_SE, D_S, D_SW, D_NW];
        for(var j = 0; j < dirs.length; j++) {
          var co = bridgeCo(x, y, dirs[j], game.btoggle);
          if(outOfBounds(co[0], co[1])) continue;
          if(canHaveBridge(x, y, co[0], co[1], player.color) && isOccupiedBy(co[0], co[1], player.woodcolor)) forbridge++;
        }
      }
    } else if(type == A_UPGRADE_TP) {
      subtractIncome(res, player.getFaction().getBuildingCost(B_TP, hasNeighbor(action.co[0], action.co[1], player.woodcolor)));
      b_tp++;
      if(touchesExistingTown(action.co[0], action.co[1], player.woodcolor)) existingtown++;
      if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
    } else if(type == A_SWARMLINGS_TP) {
      b_tp++;
      if(touchesExistingTown(action.co[0], action.co[1], player.woodcolor)) existingtown++;
      if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
    } else if(type == A_UPGRADE_TE) {
      subtractIncome(res, player.getFaction().getBuildingCost(B_TE, false));
      b_te++;
      //no size increase so no "touchesExistingTown" test here
    } else if(type == A_UPGRADE_SH) {
      subtractIncome(res, player.getFaction().getBuildingCost(B_SH, false));
      b_sh++;
      if(touchesExistingTown(action.co[0], action.co[1], player.woodcolor)) existingtown++;
      //if(goesTowardsNewTown(action.co[0], action.co[1], player)) towardstown++;
    } else if(type == A_UPGRADE_SA) {
      subtractIncome(res, player.getFaction().getBuildingCost(B_SA, false));
      b_sa++;
      if(touchesExistingTown(action.co[0], action.co[1], player.woodcolor)) existingtown++;
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
      subtractIncome(res, player.getActionCost(A_ADV_SHIP));
      res[4] += getAdvanceShipVP(player);
      shipping++;
    } else if(type == A_ADV_DIG) {
      subtractIncome(res, player.getActionCost(A_ADV_DIG));
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
    var oldpriests = getCultPriests(player);
    var newpriests = oldpriests - res[2];
    var cultincome = getAllComingCultRoundBonuses(oldcult, newcult, oldpriests, newpriests);
    sumIncome(res, cultincome[0]);
    cultspades += cultincome[1];
  }

  // TODO: I don't think all bonuses are in here yet
  var roundtile = game.roundtiles[roundnum];
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
    res[4] += (b_sh + b_sa) * 4; // TODO: must be 5? Or was the 4 there to make AI not overreact...
  }
  if(roundtile == T_ROUND_TE4VP_P2C) {
    res[4] += (b_te) * 4;
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
  result = Math.max(Math.min(1, result), result + existingtown * values.existingtown); //don't overpenalize this one
  result += towardstown * values.towardstown;
  result += interacts * values.interacts;
  return result;
};

//how close are neighbor tiles to the given color, up to distance 3.
//occupied tiles don't count
//center tile counts if center is true
//equal ==> +3. 1 dig ==> +2. distance > 1 ==> -(distance - 1)
//TODO: take giants and nomads into account here, for them these distances don't (always) matter
AILode.scoreTileDigEnvironment = function(player, tx, ty, color, center) {
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
AILode.scoreTileEnemyEnvironment = function(tx, ty, color, center) {
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
