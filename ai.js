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

//LOU include specific advice on preferred bonus and favor tiles
    xfaction = 0;
    ybonus = 0;
    yfavor = 0;

//LOU function to convert power (usually to coins) to avoid power overflow
//LOU Check for power income and compare against bowls
//LOU returns true if power use, false if unchanged

function powerToCoin (actions,coin)  {
  if (coin == 0 ) return false;
  for(var i = 0; i < coin; i++) {
    var action2 = new Action(A_CONVERT_1PW_1C);
    actions.push(action2);
  }
  return true;
}

function convertPower (playerIndex) {
  var player = game.players[playerIndex];
  var restrictions = {w_cost: 0.33, p_cost: 1, pw_cost: 0.16, burn_cost: 1, max_burn: 6 };
  var actions = getPossibleActions(player, restrictions);
  var bowl2 = player.pw2;
  var powerUse = bowl2;
  var takePower = 0;
  var coin = 0;
  
  // Check for no ability to get power
  if (player.pw0 + player.pw1 == 0)  {
    switch(bowl2) {
      case 0: return 0;
      case 1: powerToCoin(actions, powerUse);
              coin += powerUse;
              break;             
      case 2: powerToCoin(actions, powerUse);
              coin += powerUse;
              break; 
      case 3: if (player.getFaction().canTakeAction(player, A_POWER_1P, game)) {
              var action2 = new Action(A_POWER_1P);
              takePower++;
              actions.push(action2);
              coin += powerUse;
              break;
              } else {
              powerToCoin(actions, powerUse);
              coin += powerUse;
              break;
              }
      case 4: if (player.getFaction().canTakeAction(player, A_POWER_7C, game)) {
              var action2 = new Action(A_POWER_7C);
              takePower++;
              actions.push(action2);
              coin += powerUse;
              break;                              // look for Pow7c or Pow2w;
              } else {
              powerToCoin(actions, powerUse);
              coin += powerUse;
              break;
              }
      case 5: powerToCoin(actions, 1);
              coin += 1;
              break;
      case 6: break;
      case 7: 
      default: powerToCoin(actions, 1);
              coin += 1;
    }
  }

  // Check powerIncome greater than can be used
  // INCOME = { c: player.c, w: player.w, p: player.p, pw: [player.pw1, player.pw2], vp: player.vp }; 
  //LOU use all power action up even if one left over
  if (state.round < 6)  {
    var income = getIncome(player, true, state.round);   // from Game   
    var powerIncome = income[3];
    var powerSurplus = powerIncome - (coin*2 + player.pw0*2 + player.pw1);
    var powerLeft = powerUse - coin;
    if (powerSurplus > 0 && powerLeft > 0) {   
      var powerOver = Math.min(Math.ceil(powerSurplus/2, powerLeft));
      powerToCoin(actions, powerOver);
      coin += powerOver;
    } 
  }

  if (coin > 0) {
    // execute all those actions, can pass afterwards unless takePower
  }
  return takePower;
}


var AI = function() {
  this.scoreActionValues = {};
  this.restrictions = clone(defaultRestrictions);
};
inherit(AI, Actor);


//given an array of items and an array of corresponding scores, returns the index of the item with best score.
//if the best score is shared between multiple items, a random one of those is chosen so that the AI is not predictable
//used for choosing actions, bonus tiles, favor tiles, town tiles, choosing extra dig locations, etc.....
//distributerandom:
//-if false, picks only the one with best score (randomizing if there are ties).
//-if true, every single item has a chance, the scores are the probability distribution function.
function pickWithBestScore(items, scores, distributerandom) {
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
}

/*
Debuggen AI scoring in de chrome console:
var actions = getPossibleActions(game.players[1], defaultRestrictions);
var scores = [];
for(var j = 0; j < actions.length; j++) {
  scores.push(game.players[1].actor.scoreActionAI_(game.players[1], actions[j], 0));
}
for(var i = 0; i < actions.length; i++) console.log(actionsToString(actions[i]) + ' ' + scores[i]);
*/
AI.prototype.doAction = function(playerIndex, callback) {
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

  var besti = pickWithBestScore(actions, scores, false);
  if(scores[besti] > 0) {
    chosen = actions[besti];
  }

  if(!chosen) {
    //LOU this is where pass option selected, convert power before pass
    var cantPass = convertPower(playerIndex);
    if (cantPass > 0) return
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

  //LOU this is where the chosen action placebridge previously fails.
  var error = callback(playerIndex, chosen);
  if(error != '') {
    addLog('ERROR: AI tried invalid action. Error: ' + error);

    //instead, pass.
    var action = new Action(A_PASS);
    if(state.round != 6) action.bontile = this.getPreferredBonusTile_(player);
    callback(playerIndex, [action]);
  }
};

AI.prototype.updateScoreActionValues_ = function(player, roundnum) {

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
    shift: 0,    //SHAPESHIFTERS
    shift2: 0,   //SHAPESHIFTERS
    specific: {}, 
    };

  var s = this.scoreActionValues;

  for(var i = 1; i <= 3; i++) {
    for(var j = C_F; j <= C_A; j++) {
      s.cult[i - 1][j] = this.scoreCultTrackVP_(player, j, i, false) / (5 - i); //divided because overall a single cult track move is not worth the whole VP
    }
  }

  //make the AI's go for the power actions more aggressively
  s.specific[A_POWER_1P] = roundnum < 6 ? 2 : 3;
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
    s.shipping = 3;
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

  // make the num_temple (can be 0,1,2,3), except for the given power actions
  var makeTemple = function(num_temple, pow_7c, pow_2w, pow_dig1, pow_dig2) {
    if(built_te(player) == num_temple-1) {
      if(built_tp(player) == 0) s.b_tp += 10;
      s.b_te += 10;
      // But it should still do these first
      if(pow_7c > 0) s.specific[A_POWER_7C] = 20 + pow_7c;
      if(pow_2w > 0) s.specific[A_POWER_2W] = 20 + pow_2w;
      if(pow_dig1 > 0) s.specific[A_POWER_SPADE] = 20 + pow_dig1;
      if(pow_dig2 > 0) s.specific[A_POWER_2SPADE] = 20 + pow_dig2;
    }
  };

  // make the num_ship (can be 0,1,2,3), except for the given power actions
  var makeShipping = function(num_ship, pow_7c, pow_2w, pow_dig1, pow_dig2) {
    if(player.shipping == num_ship-1) {
      s.shipping += 7;
      // But it should still do these first
      if(pow_7c > 0) s.specific[A_POWER_7C] = 20 + pow_7c;
      if(pow_2w > 0) s.specific[A_POWER_2W] = 20 + pow_2w;
      if(pow_dig1 > 0) s.specific[A_POWER_SPADE] = 20 + pow_dig1;
      if(pow_dig2 > 0) s.specific[A_POWER_2SPADE] = 20 + pow_dig2;
    }
  };

   
  if (roundnum == 6) {
    //TODO modify build temple for last round to  get cult+3 favor
    s.b_te += 2;
    //TODO add value for dwelling as an outpost
    if(game.finalscoring == 1) s.b_d += 2;
    //TODO add value for SH or SA only if in network
    if(game.finalscoring == 2 && built_sa(player) > 0) s.b_sh += 10;
    if(game.finalscoring == 2 && built_sh(player) > 0) s.b_sa += 10;
  }

  //Faction specific

  if(player.faction == F_CHAOS) {
    xfaction = 1;
    if(built_d(player) > 1) makeTemple(1,0,0,0,0);
    s.b_te += 2;
    if(player.shipping == 0) s.shipping += 5;
    if(roundnum > 3 && player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2;
  }

  if(player.faction == F_GIANTS) {
    xfaction = 2;
    makeSHEssential(5, 10, 0, player.w > 6 ? 15:0);
    if(roundnum > 3) makeTemple (1,10,5,0,5);
    if(player.shipping == 0 && roundnum > 4) s.shipping += 10;
  }

  // build TE (70%)
  if(player.faction == F_FAKIRS) {
    xfaction = 3;
    // Get temple early for priest income
    makeTemple (1,10,10,15,20);
    if(built_sh(player)) s.digging = 0;  //they should go to non-dig places instead
    // There is nothing for stronghold here because quite frankly it is expensive and not that good
    s.b_sh = 0;
    if (roundnum > 3 && player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2;
  }

  // either SH first (68%) or TE first
  if(player.faction == F_NOMADS) {
    xfaction = 4;
    if(player.bonustile == T_BON_PASSSHSAVP_2W  || player.bonustile == T_BON_PASSDVP_2C
      || player.bonustile == T_BON_PASSTPVP_1W) {
      makeSHEssential(10, player.w > 6 ? 0:5, player.w > 7 ? 5:0, player.w > 7 ? 5:0);
      if(roundnum > 2) makeTemple(1,10,player.w > 6 ? 0:5,player.w > 6 ? 10:0, player.w > 6 ? 10:0);
    }
    else {
      makeTemple(1,10,player.w > 6 ? 0:5,player.w > 6 ? 5:0, player.w > 6 ? 5:0);
      if(roundnum > 2) makeSHEssential(10, player.w > 6 ? 0:5, player.w > 7 ? 5:0, player.w > 7 ? 5:0);  
    }
    if(roundnum > 4) makeShipping(1,10,player.w > 6 ? 0:5,player.w > 6 ? 5:0, player.w > 6 ? 5:0)
    if(player.pw2 >= 4) s.specific[A_POWER_7C] = player.c < 9 ? 12 : 6;    
    if(player.p == 0 && roundnum == 6) s.specific[A_POWER_1P] = 20; 
    if(player.c <= 8 && roundnum == 6) s.specific[A_POWER_7C] = 30; 
  }

  //look for spade>>2 in round 4
  if(player.faction == F_HALFLINGS) {
    xfaction = 5;
    s.digging = 20;
    s.b_sh = built_te(player) > 0 ? 6 : 0;
    if(roundnum < 6) s.b_d += 2;
    // Do get some dwellings first
    if(built_d(player) > 2) makeTemple (1,10,0,0,0);
    if(roundnum < 3 && player.p == 0) s.specific[A_POWER_1P] += 10;     
    if(roundnum > 4) makeShipping(1,10,0,0,0);
    if(roundnum > 3 && player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2;
  }

  //build TE (72%)
  if(player.faction == F_CULTISTS) {
    xfaction = 6;
    if(roundnum < 5) s.b_sh = 0; //don't waste resources on the SH
    else s.b_sh = 7;
    s.interacts += 2;
    if(roundnum > 3 && player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2;
    if(roundnum > 1) makeTemple (1,0,0,0,0);
    if(roundnum > 4) makeShipping(1,0,0,0,0);
  }

  if(player.faction == F_ALCHEMISTS) {
    xfaction = 7;
    makeSHEssential(10, 10, 0, player.w > 6 ? 15 : 0);
    if(roundnum < 6) s.b_d += 2; //because alchemists will be low on workers
    if(player.shipping == 0 && roundnum > 4) s.shipping += 5;  
    if (roundnum > 3 && player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2;  
  }

  if(player.faction == F_DARKLINGS) {
    xfaction = 8;
    s.p += 2;
    s.dig += 2; //otherwise they'll refuse to use the priests for the digging...
    s.b_sh = (player.w > 6 && player.c >= 4) ? 10 : -5; 
    //only build SH if can convert 3w to 3p and must not burn too much mana
    if(roundnum < 6) s.b_te += 5;
    if(roundnum > 4) makeShipping(1,10,0,0,0);
  }

  //build TE (63%); defer town?
  if(player.faction == F_MERMAIDS) {
    xfaction = 9;
    // if (roundnum == 1) makeTemple (1,0,0,3,9);
    if(roundnum < 6) s.b_te += 5;
    if(roundnum < 6) s.b_d += 10;
    if (player.pw2 >= 4) s.specific[A_POWER_7C] = player.c < 9 ? 12:6;
    s.bridge = -20;  // rarely build bridges
    //increase shipping for shipVP bonus
    if (game.bonustiles[T_BON_PASSSHIPVP_3PW] != 0) {
       if(player.shipping < 3) s.shipping += 5;
      if(player.shipping == 1 && roundnum > 3) s.shipping += 5;
      if(player.shipping == 2 && roundnum > 4) s.shipping += 5;
      if(player.shipping >= 3 && roundnum > 5) s.shipping += 5;
    }
  }

  //SH gives free TP per round
  if(player.faction == F_SWARMLINGS) {
    xfaction = 10;
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
    if(roundnum > 4) makeShipping(1,10,0,0,0); 
  }

  //build SH (50%) soon
  if(player.faction == F_WITCHES) {
    xfaction = 11;
    if(player.b_sh != 0) {   
      if(built_d(player) >= 2 && built_tp(player) == 0) s.b_tp = 5;
      s.b_sh += 5; 
      s.b_te = -5;  //no way, first SH
    }
    s.t_tw += 5;  //get extra 5VP for making town
    //reduce value of coin if have too many    
    if(player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2;     
    if(roundnum > 3) makeTemple(1,0,0,0,0);
    if(roundnum > 4) makeShipping(1,0,0,0,0);
  }

  // most SH start (72%) with 3D, but TE does better
  if(player.faction == F_AUREN) {
    xfaction = 12;
    if (player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2;  
    if(roundnum > 4) makeShipping(1,0,0,0,0);
  }

  //repairs needed; build TE (75%) two TE to get the 5PW; ENG_BRIDGE fix, not ship
  if(player.faction == F_ENGINEERS) {
    xfaction = 13;
    s.w += 0.5; //do NOT make this number any higher. Setting it to += 1 makes engineers build nothing anymore...
    s.conbridge = 20;
    if(built_bridges(player) == 0) s.forbridge = 5;
    if(roundnum == 1 && built_d(player) > 1) s.b_tp += 3;
    if(roundnum == 1 && built_te(player) == 0) s.b_te += 5;
    if(roundnum >= 2 && built_te(player) <= 1) s.b_te += 3;
    if(built_bridges(player) && built_sh(player) == 0) {
      s.b_sh += 20;
      if(built_tp(player) == 0) {
        s.b_tp += 20;
        s.b_te = -20;
      }
    }
    if(roundnum < 6) s.digging = -5;
    if(roundnum > 1 && built_bridges(player) < 2 && player.shipping > 0) s.b_d += 5;
    if(built_d(player) < 3) s.b_d += 5;
    if (roundnum > 3 && player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2;
    if (roundnum > 5 && built_bridges(player) == 0) s.specific[A_POWER_BRIDGE] = 20; 
  }

  //should TE be earlier?
  if(player.faction == F_DWARVES) {
    xfaction = 14;
    s.digging = 0; //they should go to non-dig places instead
    if (roundnum > 3 && player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2;
  }

  //add tuning for fireice factions
  if(player.faction == F_ICEMAIDENS) {
    xfaction = 15;
    s.b_te += 2.0;
    if(built_te(player) >= 2 ) s.b_sh += 9;  
    if(roundnum > 2) makeTemple(1,0,0,0,0);
    if(roundnum > 4) makeShipping(1,0,0,0,0);
    if(roundnum > 3 && player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2; 
  }

  //TE first (55%), or SH(23%); has higher value for PW, better with SH
  if(player.faction == F_YETIS) {
    xfaction = 16;
    // yeti get a discount on power actions and can overlay
    s.specific[A_POWER_1P] = player.p < 2 ? 5 : 3;
    s.specific[A_POWER_2W] = player.w < 4 ? 5 : 2;
    s.specific[A_POWER_7C] = player.c < 6 ? 7 : 3;
    s.specific[A_POWER_SPADE] = 7;
    s.specific[A_POWER_2SPADE] = 8;
    if(built_d(player) > 2) makeTemple(1,0,0,0,0);
    if(roundnum > 4) makeShipping(1,player.c > 8 ? 0:10,0,1,1);
    if(roundnum > 3 && player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2;    
  }

  //Add special tuning for Dragonlords to make SH after Round 1 and keep 4 Power
  if(player.faction == F_DRAGONLORDS) {
    xfaction = 17;
    if(roundnum > 1) {
      makeSHEssential(15, 5, -50, -50);
    }
    if(roundnum > 4) makeShipping(1,player.c > 8 ? 0:10,0,0,0);
    //see strategy.js for dig implementation
    if((player.pw0 + player.pw1 + player.pw2) <= 5) s.digging = 0;   
  }

  if(player.faction == F_ACOLYTES) {
    xfaction = 18;
    if(player.shipping == 0 && roundnum > 4) s.shipping += 7;
    s.b_te += 1.0;
    if(roundnum > 2) makeTemple(1,0,0,0,0);
    if (roundnum > 3 && player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2;  
  }

  if(player.faction == F_SHAPESHIFTERS) {
    xfaction = 19;
    if (roundnum > 3 && player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2;  
    s.b_te += 1.0;  
    //TODO allow AI action when SH is built to spend 3 tokens or 3 power to change color for build
    //makeSHEssential(0, 0, 0, 0);
    if(roundnum > 3) makeTemple(1,0,0,0,0); 
    if(roundnum > 4) makeShipping(1,0,0,0,0); 
  }

  if(player.faction == F_RIVERWALKERS) {
    xfaction = 20;
    s.shipping = 0;
    // generally need more coin and priest, not workers  
    s.specific[A_POWER_1P] = roundnum < 3 ? 3 : 2;
    s.specific[A_POWER_7C] += 2;
    s.specific[A_POWER_2W] -= 2;
    s.specific[A_POWER_SPADE] = -50;
    s.specific[A_POWER_2SPADE] = -50;
    //build temple early for priest
    makeTemple(1,10,0,0,0);
    //gain from two temples, avoid sanctuary
    s.b_sa = 0;
    s.b_tp -= 1;
    s.b_te -= 2;
    s.b_d += 3;
    if (roundnum > 5) s.b_d += 2;
    if (roundnum > 3 && player.c > 8 && (player.c > (2.5 * player.w))) s.c /= 2;  
    //NEXT- when build stronghold, add two bridges
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
1021	swarmlings	4290	build 3D+TE/ SH+TE, tile 1E, 1A
995	giants		2342	build SH, 2W bonus, SH start
991	halflings		4754	build 4D or TE, tile 1E, P bonus, up build track
966	dragonlords	643	build 4D, SH second turn
961	icemaidens	578	build TE
959	engineers		3192	build 4D/2TE(common), tile 2E
955	fakirs		1528	avoid in standard game
953	dwarves		3187	build TE or SA, tile 1E
948	yetis		718	build TE
943	auren		2170	4D is good, otherwise build SH
930	alchemists	3027	build SH, use 10 VP for $
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
 if(player.faction == F_FAKIRS || player.faction == F_MERMAIDS 
   || player.faction == F_DWARVES || player.faction == F_RIVERWALKERS
   || roundnum < 6 ) { 
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
  //get more coin if needed
  var restrictions = clone(defaultRestrictions);
  var actions = getPossibleActions(player, restrictions);
  if((player.c < 8) && (player.getFaction().canTakeAction(player, A_POWER_7C, game))) {
    s.specific[A_POWER_7C] = 50;
  } else {
  if(player.c == 3 && player.p > 0 && player.pw2 > 0) powerToCoin(actions, 1); 
  if(player.c == 7 && player.p > 1 && player.pw2 > 0) powerToCoin(actions, 1);  
  if(player.p > 0 && player.c > 3 && player.shipping < 3) { 
    //addLog('INFO: AI endship for: ' + logPlayerNameFun(player) );
    scoreProjection = projectEndGameScores(); 
    scoreNow = scoreProjection[player.index];
    //addLog('INFO: AI computing scoreNow: ' + scoreNow);
    player.p--;
    player.c -= 4; 
    player.shipping++;
    scoreProjection = projectEndGameScores();
    scoreShip1 = scoreProjection[player.index];
    //addLog('INFO: AI computing scoreShip '+ player.shipping +': ' + scoreShip1);
    if (scoreShip1[0] > (scoreNow[0] + 6)) {
      reserveOneShip = scoreShip1[0] - scoreNow[0];
    }
    if (player.p > 0 && player.c > 3 && player.shipping < 3) {
      player.p--;
      player.c -= 4; 
      player.shipping++;
      scoreProjection = projectEndGameScores();
      scoreShip2 = scoreProjection[player.index];
      //addLog('INFO: AI computing scoreShip '+ player.shipping +': ' + scoreShip2);
      if (scoreShip2[0] > (scoreShip1[0] + 8)
        && scoreShip2[0] > (scoreNow[0] + 10) ) {
        reserveTwoShip = scoreShip2[0] - scoreShip1[0];
      }
    }
    if (player.p > 0 && player.c > 3 && player.shipping < 3) {
      player.p--;
      player.c -= 4; 
      player.shipping++;
      scoreProjection = projectEndGameScores();
      scoreShip3 = scoreProjection[player.index];
      //addLog('INFO: AI computing scoreShip 3: '+ scoreShip3);
      if (scoreShip3[0] > (scoreShip2[0] + 10) 
        && scoreShip3[0] > (scoreShip1[0] + 12)
        && scoreShip3[0] > (scoreNow[0] + 14)  ) {
        reserveThreeShip = scoreShip3[0] - scoreShip2[0];
      }
    }
    reserveTotal = reserveOneShip + reserveTwoShip + reserveThreeShip;

    //temporary to see if reserve is needed
    if (reserveTotal > 0) s.shipping += reserveTotal + 6;
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
    max_burn: (roundnum < 6 ? 6 : 4),
    digFun: defaultRestrictions.digFun
  };
};

AI.prototype.scoreActionAI_ = function(player, actions, roundnum) {
  return scoreAction(player, actions, this.scoreActionValues, roundnum);
};

//bonus tiles chosen from world
AI.prototype.getPreferredBonusTile_ = function(player) {
  if(!this.scoreActionvalues) this.updateScoreActionValues_(player, state.round);

  var avtiles = [];
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) {
    if(game.bonustiles[i]) avtiles.push(i);
  }

  var scores = [];
  for(var i = 0; i < avtiles.length; i++) {
    scores.push(this.scoreBonusTile_(player, avtiles[i], state.round));
  }

  return avtiles[pickWithBestScore(avtiles, scores, false)];
};

AI.prototype.scoreBonusTile_ = function(player, tile, roundnum) {
  var score = 0;
  var s = this.scoreActionValues;

  if(tile == T_BON_SPADE_2C) {
    ybonus = 1;
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
    ybonus = 2;
    score += s.c * 4;
    score += s.cult[0][0];
    if(player.c < 8) score++;
  }
  else if(tile == T_BON_6C) {
    ybonus = 3;
    score += s.c * 6;
    if(player.c < 8) score += 2;
  }
  else if(tile == T_BON_3PW_SHIP) {
    ybonus = 4;
    score += s.pw * 3;
    score += getNumFreeTilesReachableByShipping(player, player.shipping + 1)[0] * 3;
    if(roundnum < 3 && player.faction != F_NOMADS && player.faction != F_HALFLINGS) score++; //TODO what is the value of shipping?
  }
  else if(tile == T_BON_3PW_1W) {
    ybonus = 5;
    score += s.pw * 3;
    score += s.w;
  }
  else if(tile == T_BON_PASSDVP_2C) {
    ybonus = 6;
    score += s.c * 2;
    score += 1 * built_d(player); //todo: it must use the number of dwellings it expects to have built next round here
    if(roundnum > 3) score++;
  }
  else if(tile == T_BON_PASSTPVP_1W) {
    ybonus = 7;
    score += s.w * 1;
    score += 1 * built_tp(player) * 2; //todo: idem
    if(roundnum > 3) score++;
  }
  else if(tile == T_BON_PASSSHSAVP_2W) {
    ybonus = 8;
    score += s.w * 2;
    score += (built_sh(player) + built_sa(player)) * 4; //todo: idem
    if(roundnum > 3) score++;
  }
  else if(tile == T_BON_1P) {
    ybonus = 9;
    score += s.p * 1;
  }
  else if(tile == T_BON_PASSSHIPVP_3PW) {
    ybonus = 10;
    score += player.shipping * 3 + s.pw * 3;
  }

  //LOU Add extra score for the coins on the bonus tile
  score += s.c * undef0(game.bonustilecoins[tile]);

  //Add starting preference score for the faction and the bonus tile
  var BONUS_PREF = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,4,1,3,2,3,3,0,0,3,2,2,0,3,3,0,0,1,1,0,-9], // T_BON_SPADE_2C     (BON1)
    [0,1,2,1,1,1,4,0,1,2,1,3,0,3,3,2,1,3,2,2,3],  // T_BON_CULT_4C      (BON2)
    [0,3,2,2,1,1,1,0,1,1,1,1,0,1,1,1,1,4,2,1,4],  // T_BON_6C           (BON3)
    [0,1,3,0,0,1,1,1,1,5,1,3,0,1,0,2,3,2,1,3,-9], // T_BON_3PW_SHIP     (BON4) 
    [0,1,2,1,2,2,2,4,3,1,1,3,0,3,3,3,4,1,1,3,0],  // T_BON_3PW_1W       (BON5)
    [0,1,2,1,2,2,1,1,1,1,2,1,0,1,1,1,1,3,2,2,2],  // T_BON_PASSDVP_2C   (BON6)
    [0,1,1,1,2,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,0],  // T_BON_PASSTPVP_1W  (BON7)
    [0,3,4,1,5,1,0,2,2,1,1,1,0,1,1,1,1,4,1,1,0],  // T_BON_PASSSHSAVP_2W(BON8)
    [0,1,1,3,1,0,2,3,5,1,2,1,0,1,1,1,1,1,2,1,6],  // T_BON_1P           (BON9)
    [0,1,1,0,0,1,1,1,1,4,1,1,0,0,0,4,1,1,1,4,-9]  // T_BON_PASSSHIPVP_3PW(BON10)
    ];
  // originally for roundnum 1,2,3 TODO: different table for roundnum 4,5,6
  if (roundnum <= 3) score += BONUS_PREF[Math.floor(ybonus)][Math.floor(xfaction)];

  //Add end preference score for the faction and the bonus tile
  var BONUS_PREF2 = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,0,0,0,0,0,0,2,1,0,0,1,0,0,0,0,0,-9], // T_BON_SPADE_2C     (BON1)
    [0,0,0,0,0,0,2,0,0,0,0,0,0,0,1,0,0,0,0,0,2],  // T_BON_CULT_4C      (BON2)
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],  // T_BON_6C           (BON3)
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,-9], // T_BON_3PW_SHIP     (BON4) 
    [0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,3,0,0,0,1],  // T_BON_3PW_1W       (BON5)
    [0,1,2,1,4,3,1,1,5,2,2,2,0,1,1,1,1,3,2,2,4],  // T_BON_PASSDVP_2C   (BON6)
    [0,1,2,1,2,1,1,1,3,0,4,1,0,1,1,2,1,1,1,1,0],  // T_BON_PASSTPVP_1W  (BON7)
    [0,1,2,0,5,0,1,2,2,0,2,1,0,1,1,1,1,4,1,1,0],  // T_BON_PASSSHSAVP_2W(BON8)
    [0,1,0,1,1,0,1,3,2,0,1,1,0,1,1,1,1,1,2,1,1],  // T_BON_1P           (BON9)
    [0,1,1,0,1,0,1,1,1,5,1,1,0,0,0,4,3,1,1,4,-9]  // T_BON_PASSSHIPVP_3PW(BON10)
    ];
    if (roundnum > 3) score += BONUS_PREF2[Math.floor(ybonus)][Math.floor(xfaction)];
  
  return score;
};


//favor tile chosen from given array
AI.prototype.getPreferredFavorTile_ = function(player, tiles) {
  var scores = [];
  for(var i = 0; i < tiles.length; i++) {
    scores.push(this.scoreFavorTile_(player, tiles[i], state.round));
  }

  return tiles[pickWithBestScore(tiles, scores, false)];
};

AI.prototype.scoreFavorTile_ = function(player, tile, roundnum) {
  var score = 0;
  yfavor = 0;

  //LOU increase value for 3cult if round6
  if(tile == T_FAV_3F) {
    yfavor = 1;
    if(player.cult[C_F] < 8) {
      score++;
      if (roundnum == 6) score += 3;
    }
  }
  else if(tile == T_FAV_3W) {
    yfavor = 2;
    if(player.cult[C_W] < 8) {
      score++;
      if (roundnum == 6) score += 3;
    }
  }
  else if(tile == T_FAV_3E) {
    yfavor = 3;
    if(player.cult[C_E] < 8) {
      score++;
      if (roundnum == 6) score += 3;
    }
  }
  else if(tile == T_FAV_3A) {
    yfavor = 4;
    if(player.cult[C_A] < 8) {
      score++;
      if (roundnum == 6) score += 3;
    }
  }

  else if(tile == T_FAV_2F_6TW) {
    yfavor = 5;
    score += 3;
  }
  else if(tile == T_FAV_2W_CULT) {
    yfavor = 6;
    score += 2;
  }
  else if(tile == T_FAV_2E_1PW1W) {
    yfavor = 7;
    score++;
    if(roundnum <= 3) score += 3;
  }
  else if(tile == T_FAV_2A_4PW) {
    yfavor = 8;
    score++;
    if(roundnum <= 3) score += 3;
  }
  else if(tile == T_FAV_1F_3C) {
    yfavor = 9;
    if(roundnum <= 3) score += 2;
    else if(roundnum == 4) score += 1;
    else if(roundnum == 5) score += 0.5;
  }
  else if(tile == T_FAV_1W_TPVP) {
    yfavor = 10;
    score++;
    if(player.b_tp > 0) score += 3;
  }
  else if(tile == T_FAV_1E_DVP) {
    yfavor = 11;
    score++;
    if(player.b_d > 0) score += 5;
  }
  else if(tile == T_FAV_1A_PASSTPVP) {
    yfavor = 12;
    if(built_tp(player) > 1) score += 3;
    if(built_tp(player) > 3) score += 1;
    if (roundnum == 6) score ++;
  }

  //Add starting preference score for the faction and the favor tiles
  var FAVOR_PREF = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],  // T_FAV_3F       (FAV1)
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],  // T_FAV_3W       (FAV2)
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],  // T_FAV_3E       (FAV3)
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],  // T_FAV_3A       (FAV4)
    [0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],  // T_FAV_2F_6TW   (FAV5)
    [0,0,0,0,0,0,2,0,0,2,2,0,4,0,0,0,1,0,0,0,0],  // T_FAV_2W_CULT  (FAV6)
    [0,0,0,0,0,3,2,0,0,0,0,0,0,2,3,0,2,0,0,0,0],  // T_FAV_2E_1PW1W (FAV7)
    [0,0,0,2,0,0,0,0,0,0,0,2,0,3,2,0,4,0,0,0,0],  // T_FAV_2A_4PW   (FAV8)
    [0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],  // T_FAV_1F_3C    (FAV9)
    [0,0,0,0,3,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,3],  // T_FAV_1W_TPVP  (FAV10)
    [0,0,0,2,6,4,0,0,0,4,0,4,0,0,2,0,0,0,0,0,6],  // T_FAV_1E_DVP   (FAV11)
    [0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0]   // T_FAV_1A_PASSTPVP (FAV12)
  ]
  
  // add in faction specific values for early rounds
  if (roundnum <= 5) score += FAVOR_PREF[Math.floor(yfavor)][Math.floor(xfaction)];

  return score;
};


//town tile chosen from given array
AI.prototype.getPreferredTownTile_ = function(player, tiles) {
  var scores = [];
  for(var i = 0; i < tiles.length; i++) {
    scores.push(this.scoreTownTile_(player, tiles[i], state.round));
  }

  return tiles[pickWithBestScore(tiles, scores, false)];
};

AI.prototype.scoreTownTile_ = function(player, tile, roundnum) {
  var score = 0;

  if(tile == T_TW_2VP_2CULT) {
    //TODO: calculate if increasing all cults is benificial and give better score based on that
    score = 2;
    score += 4;
    if(player.faction == F_CHAOS) score += 5;
    else if(player.faction == F_GIANTS) score += 5;
    else if(player.faction == F_AUREN) score += 4;
    else if(player.faction == F_CULTISTS) score += 4;
    else if(player.faction == F_ICEMAIDENS) score += 3;
    else if(player.faction == F_YETIS) score += 3;
  }
  else if(tile == T_TW_4VP_SHIP) {
    score = 6;
    if(player.faction == F_FAKIRS) score = 0;
    else if(player.faction == F_DWARVES) score = 0;
    else if(player.faction == F_RIVERWALKERS) score = 0;
    else if(player.faction == F_MERMAIDS) score += 6;
  }
  else if(tile == T_TW_5VP_6C) {
    score = 5;
    if(player.c < 10) score += 3;
  }
  else if(tile == T_TW_6VP_8PW) {
    score = 6;
    if(player.pw0  * 2 + player.pw1 >= 7) score += 4;
  }
  else if(tile == T_TW_7VP_2W) {
    score = 7;
    if(player.w < 4) score += 3;
  }
  else if(tile == T_TW_8VP_CULT) {
    //TODO: calculate if increasing all cults is benificial and give better score based on that
    score = 10;
    if(player.faction == F_RIVERWALKERS) score += 5;
    else if(player.faction == F_SHAPESHIFTERS) score += 5;
    else if(player.faction == F_ICEMAIDENS) score += 3;
    else if(player.faction == F_YETIS) score += 3;
  }
  else if(tile == T_TW_9VP_P) {
    score = 10;
    if(player.p == 0) score += 2;
    if(player.faction == F_DARKLINGS) score += 2;
  }
  else if(tile == T_TW_11VP) {
    score = 9;
    if(state.round >= 6) score += 3;
  }
  return score;
};

AI.prototype.chooseInitialBonusTile = function(playerIndex, callback) {
  var tile = this.getPreferredBonusTile_(game.players[playerIndex]);

  var error = callback(playerIndex, tile);
  if(error != '') {
    addLog('ERROR: AI tried invalid bonus tile. Error: ' + error);
    throw new Error('AI tried invalid bonus tile');
  }
};

AI.prototype.chooseInitialFavorTile = function(playerIndex, callback) {
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
    throw new Error('AI tried invalid favor tile');
  }
};

//callback result (second parameter) should be the chosen color emum value
AI.prototype.chooseAuxColor = function(playerIndex, callback) {
  var player = game.players[playerIndex];
  if(player.color == Z && mayGetPriestAsColor(player) < 3) {
    chosen = Z; 
    //riverwalkers choosing priest - 
    //just always prefer is as soon as 5 colors unlocked 
    //not smart AI, TODO: improve  choices should adapt to board,  
  } else {
  
  var ispriestcolor = false;
  if(player.color == Z && player.colors[player.woodcolor - R]) ispriestcolor = true;

  var colors = [];
  for(var i = CIRCLE_BEGIN; i <= CIRCLE_END; i++) {
    if(!ispriestcolor && auxColorToPlayerMap[i] == undefined && colorToPlayerMap[i] == undefined) colors.push(i);
    if(ispriestcolor && !player.colors[i - R]) colors.push(i);
  }
  var chosen;
  var scores = [];
  if(player.color != Z) {  
    for(var i = 0; i < colors.length; i++) {
      var color = colors[i];
      var score = 0;
      if(auxColorToPlayerMap[wrap(color - 1, R, S + 1)] == undefined) score++;
      if(auxColorToPlayerMap[wrap(color + 1, R, S + 1)] == undefined) score++;
      scores[i] = score;
    }
  }
  else if (player.color == Z && !ispriestcolor) {
    var scores = [];
    for(var i = 0; i < colors.length; i++) {
      var color = colors[i];
      var score = 0;
      if(auxColorToPlayerMap[wrap(color - 1, R, S + 1)] == undefined) score++;
      if(auxColorToPlayerMap[wrap(color + 1, R, S + 1)] == undefined) score++;
      if (color == R) score += 3;
      if (color == Y) score += 2;
      if (color == G) score += 3;
      if (color == K) score += 2;
      if (color == U) score += 1;
      scores[i]= score;
    }
  }
  // GetFreeTile Function is helper from strategy.js for vacant tiles 
  // check available colors, score both var adjacentCount = getColorTilesAdjacent and one away tiles for next color choice 
  // color order-R is 0,1,2,3,4,5,6 for R, Y, U, K, B, G, S
  else if (player.color == Z && ispriestcolor) {      
    var scores = [];
    var tiles;
    var colorTile;
    var colorScores = [0,0,1,1,2,0,1,1,1,0,0,0];
    tiles = getFreeTilesReachableByShipping(player, 0);   
    for(var t = 0; t < tiles.length; t++) {
      colorTile = getWorld(tiles[t][0], tiles[t][1]);
      colorScores[colorTile] += 2;
    }
    tiles = getFreeTilesReachableByShipping(player, 1);   
    for(var t = 0; t < tiles.length; t++) {
      colorTile = getWorld(tiles[t][0], tiles[t][1]);
      colorScores[colorTile] += 1;
      var adjacentCount = getColorTilesAdjacent(player, tiles[t][0], tiles[t][1]);
      if (adjacentCount[0] == 1 && adjacentCount[1] == 6) colorScores[colorTile] += 0.5;
    }
    for(var i = 0; i < colors.length; i++) {
      var color = colors[i];
      var score = 0;
      scores[i] = 0;
      for(var j = CIRCLE_BEGIN; j <= CIRCLE_END; j++) {
         if (color == j) scores[i] = colorScores[j];
      }
    }
  //addLog('INFO: AI finding RW priest: '+ colors + ' ---- ' + colorScores);
  }

  var i = pickWithBestScore(colors, scores, false);
  chosen = colors[i];
  }
  var error = callback(playerIndex, chosen);
  if(error != '') {
    addLog('ERROR: AI tried invalid faction auxcolor. Error: ' + error);
    throw new Error('AI tried invalid faction auxcolor. Error: ' + error);
  }
};

//gets number of color tiles adjacent to the given tile
function getColorTilesAdjacent(player, x, y) {
  var tiles = getNeighborTiles(x, y);
  var countColor = [0,0];
  for(var i = 0; i < tiles.length; i++) {
    if (tiles[i] != null)  { 
      var tilecolor = getWorld(tiles[i][0], tiles[i][1]);
      if(tilecolor != I && tilecolor != N) countColor[0]++;
      if (tilecolor != N) countColor[1]++;
    }
  }
  return countColor;
}

AI.prototype.chooseInitialDwelling = function(playerIndex, callback) {
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
    if(getWorld(x, y) != player.auxcolor) continue;
    if(getBuilding(x, y)[0] != B_NONE) continue;
    positions.push([x, y]);
  }

  var scores = [];
  for(var i = 0; i < positions.length; i++) {
    var x = positions[i][0];
    var y = positions[i][1];
    var score = 0;
    score += scoreTileDigEnvironment(player, x, y, player.getMainDigColor(), false);
    score += scoreTileEnemyEnvironment(x, y, player.getMainDigColor(), false);

    var neighbors = getNumTilesAround(player, x, y);
    if(neighbors[0] == 0 && neighbors[1] == 0) score /= 2; 
    //tile touches no other proper tiles, discourage this

    //LOU avoid tiles surrounded for R,G,B, and brown (U) factions. 
    //LOU adjacentCOUNT[land tiles adjacent, edge tiles have water or land ajacent]
    var adjacentCount = getColorTilesAdjacent(player, x, y);
    var colorCode = player.color;
    if(adjacentCount[0] >= 6 && 
      (colorCode == R || colorCode == G || colorCode == B || colorCode == U)) score = 0; 
    //LOU degrade placing tiles on the edge except for Yellow and blacK  (Line#880)
    //LOU allow edge tiles if final scoring is OUTPOST
    if (game.finalscoring == 1) {
      if(adjacentCount[1] < 6 && colorCode == Z) score = 0;
      if(adjacentCount[0] > 3 && colorCode == Z) score = 0;
    } 
    else {
      if(adjacentCount[1] < 6 && (colorCode != Y && colorCode != K)) score = 0;
      if(adjacentCount[0] < 4 && colorCode == B) score -= 4; 
      if(adjacentCount[0] < 4 && colorCode == R) score -= 4;
      if(adjacentCount[0] < 3 && colorCode == G) score -= 4;
      if(adjacentCount[0] > 3 && colorCode == Z) score = 0;
    }
    
    if(otherDwelling) {
      var h = hexDist(otherDwelling[0], otherDwelling[1], x, y);
      //LOU replaced! if(h >= 4 && h <= 6) score += 5; //be near your other dwelling but not too near
      //LOU add more complexity to distance scoring
      switch(h) {
      case 0: score = 0;
              break;
      case 1: score = 0;
              break;             
      //discourage being extremely close
      case 2: score /= 2;
              break;
      case 3: score += 2;
              break;
      //be near your other dwelling but not too near
      case 4: score += 4;
              break;             
      case 5: if (!state.fireice) score += 4;            
              break;
      //LOU fireice places premium on network, too far
      case 6: if (!state.fireice) score += 2;
              if (state.fireice) score = 0;
              break;
      //LOU discourage really far away
      default: score = 0;
      }
      //LOU Notice that build used is first in y direction.  Others are ignored (Nomads)
      if(player.faction == F_NOMADS) {
        var done = getInitialDwellingsDone(player);
        if (done == 2  && h > 3) score -= 2;
        if (done == 2  && h >= 6) score -= 10;
      }
      //LOU CHEAT certain combination in fireice world cause problems
      if(state.fireice && otherDwelling[1] == y) {
        if (hexDist(otherDwelling[0], otherDwelling[1], x, y) >= 5) score = 0;
      }
    }

  //LOU Add starting preference score for the faction dwelling locations.
  //LOU These are based on published experience and preference for a given world.
  // NOT YET implemented, should be made a constant
  /* parameters used for matrix
     0 - World used, 0=none, 1=standard, 2=fireicealtered, 3=fireice
     1 - faction number from above (can be the name like 1=F_CHAOS, 2=F_GIANTS, ,..)
     2 - score modifier
     3 - first dwelling location [x,y]
     4 - second dwelling location [x,y]
     5 = third dwlling location [x,y]
     6 - enemy faction number (can block)
     7 - friend faction number (helpful next)
     8 - spare
     9 - spare   
     
  var START_LOCATIONS = [
    [0, 0,0,[ 0, 0],[ 0, 0],[ 0, 0], 0, 0,0,0],  //  comments
    [1, 1,5,[ 9, 4],[ 0, 0],[ 0, 0], 0, 0,0,0],  // CHAOS 
    [1, 1,3,[ 6, 4],[ 0, 0],[ 0, 0], 0, 0,0,0],  // CHAOS 
    [1, 2,3,[ 6, 4],[ 5, 3],[ 0, 0], 0, 0,0,0],  // GIANTS 
    [1, 2,2,[ 6, 4],[ 7, 6],[ 0, 0], 0, 0,0,0],  // GIANTS 
    [1, 2,1,[ 6, 4],[ 9, 4],[ 0, 0], 0, 0,0,0],  // GIANTS  
    [1, 3,4,[ 3, 4],[ 5, 5],[ 0, 0], 0, 0,0,0],  // FAKIRS  
    [1, 4,6,[ 3, 4],[ 5, 6],[ 5, 1], 5, 0,0,0],  // NOMADS  
    [1, 4,4,[ 3, 4],[ 5, 1],[ 6, 2], 0, 0,0,0],  // NOMADS  
    [1, 4,2,[ 5, 6],[ 3, 4],[ 8, 9], 0, 0,0,0],  // NOMADS  
    [1, 5,3,[ 4, 2],[ 2, 5],[ 0, 0], 0, 0,0,0],  // HALFLINGS  
    [1, 5,3,[10, 6],[ 8, 9],[ 0, 0], 0, 0,0,0],  // HALFLINGS  
    [1, 6,2,[ 6, 5],[10, 6],[ 0, 0], 0, 0,0,0],  // CULTISTS  
    [1, 6,1,[11, 8],[ 8, 9],[ 0, 0], 0, 0,0,0],  // CULTISTS  
    [1, 7,2,[ 3, 3],[ 5, 2],[ 0, 0], 0, 0,0,0],  // ALCHEMISTS  
    [1, 7,4,[11, 7],[12, 5],[ 0, 0], 0, 0,0,0],  // ALCHEMISTS  
    [1, 8,4,[11, 7],[ 8, 8],[ 0, 0], 0, 0,0,0],  // DARKLINGS  
    [1, 8,2,[ 9, 2],[12, 5],[ 0, 0], 0, 0,0,0],  // DARKLINGS  
    [1, 9,5,[ 7, 8],[ 4, 5],[ 0, 0], 0, 0,0,0],  // MERMAIDS  
    [1,10,3,[ 2, 4],[ 2, 8],[ 0, 0], 0, 0,0,0],  // SWARMLINGS  
    [1,10,3,[ 4, 5],[ 2, 8],[ 0, 0], 0, 0,0,0],  // SWARMLINGS  
    [1,11,4,[ 7, 3],[10, 8],[ 0, 0], 0, 0,0,0],  // ENGINEERS  
    [1,12,4,[ 7, 5],[11, 6],[ 0, 0], 0, 0,0,0],  // DWARVES  
    [1,13,2,[ 6, 6],[ 7, 3],[ 0, 0], 0, 0,0,0],  // WITCHES  
    [1,14,2,[ 9, 3],[ 8, 7],[ 0, 0], 0, 0,0,0],  // AUREN  
    [3, 1,4,[ 6, 5],[ 0, 0],[ 0, 0], 0, 0,0,0],  // Fireice CHAOS 
    [3, 2,4,[ 8, 4],[ 6, 7],[ 0, 0], 0, 0,0,0]   // Fireice GIANTS 
    [3, 2,4,[ 9, 7],[12, 8],[ 0, 0], 0, 0,0,0]   // Fireice GIANTS 
    [3, 3,4,[ 8, 3],[ 2, 2],[ 0, 0], 0, 0,0,0]   // Fireice FAKIRS 
    [3, 4,4,[ 8, 3],[10, 2],[ 5, 1], 0, 0,0,0]   // Fireice NOMADS 
    [3, 4,4,[ 4, 4],[ 2, 2],[ 3, 7], 0, 0,0,0]   // Fireice NOMADS 
    [3, 5,4,[ 9, 4],[11, 2],[ 0, 0], 0, 0,0,0]   // Fireice HALFLINGS 
    [3, 6,4,[ 5, 8],[ 3, 5],[ 0, 0], 0, 0,0,0]   // Fireice CULTISTS 
    [3, 7,4,[10, 8],[12, 7],[ 0, 0], 0, 0,0,0]   // Fireice ALCHEMISTS 
    [3, 8,4,[12, 2],[12, 5],[ 0, 0], 0, 0,0,0]   // Fireice DARKLINGS 
    [3, 8,4,[10, 8],[12, 7],[ 0, 0], 0, 0,0,0]   // Fireice DARKLINGS 
    [3, 9,4,[10, 6],[12, 4],[ 0, 0], 0, 0,0,0]   // Fireice MERMAIDS 
    [3,10,4,[ 5, 7],[ 2, 8],[ 0, 0], 0, 0,0,0]   // Fireice SWARMLINGS 
    [3,11,4,[ 4, 7],[ 2, 4],[ 0, 0], 0, 0,0,0]   // Fireice ENGINEERS 
    [3,12,4,[10, 7],[ 6, 8],[ 0, 0], 0, 0,0,0]   // Fireice DWARVES 
    [3,13,4,[ 5, 6],[ 3, 4],[ 0, 0], 0, 0,0,0]   // Fireice WITCHES 
    [3,14,4,[ 8, 5],[ 7, 7],[ 0, 0], 0, 0,0,0]   // Fireice AURENS 
    [3,15,4,[ 7, 5],[ 2, 3],[ 0, 0], 0, 0,0,0]   // Fireice ICEMAIDENS 
    [3,16,4,[ 5, 4],[ 4, 8],[ 0, 0], 0, 0,0,0]   // Fireice YETIS 
    [3,17,4,[ 6, 3],[ 3, 5],[ 0, 0], 0, 0,0,0]   // Fireice DRAGONLORDS 
    [3,18,4,[ 6, 3],[ 3, 5],[ 0, 0], 0, 0,0,0]   // Fireice ACOLYTES 
    [3,19,4,[ 9, 7],[ 6, 5],[ 0, 0], 0, 0,0,0]   // Fireice SHAPESHIFTERS 
    [3,20,2,[ 9, 4],[ 6, 3],[ 0, 0], 0, 0,0,0]   // Fireice RIVERWALKERS  brown
    [3,20,3,[ 8, 3],[ 6, 1],[ 0, 0], 0, 0,0,0]   // Fireice RIVERWALKERS  yellow
    [3,20,5,[ 6, 5],[ 6, 2],[ 0, 0], 0, 0,0,0]   // Fireice RIVERWALKERS  red


    ];
  */
  //LOU now apply these values to modify or override the score

    scores.push(score);
  }

  var i = pickWithBestScore(positions, scores, false);
  var chosen = positions[i];

  var error = callback(playerIndex, chosen);
  if(error != '') {
    addLog('ERROR: AI tried invalid initial dwelling. Error: ' + error);
    throw new Error('AI tried invalid initial dwelling');
  }
};

AI.prototype.chooseFaction = function(playerIndex, callback) {
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
  var lowest = 9999;
  for(var i = 0; i < scores.length; i++) lowest = Math.min(lowest, scores[i]);
  for(var i = 0; i < scores.length; i++) scores[i] -= lowest;

  var faction = factions[pickWithBestScore(factions, scores, true)];

  var error = callback(playerIndex, faction);
  if(error != '') {
    addLog('ERROR: AI chose invalid faction. Error: ' + error);
    throw new Error('AI chose invalid faction');
  }
};

//already = object that has true value for each already chosen color
AI.prototype.scoreFaction_ = function(player, already, faction) {
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
  //LOU winpercentage = (snellmanRating -900)/10 + 10) fireice added
  if(index == F_CHAOS) factionwinpercentage = 24;
  else if(index == F_GIANTS) factionwinpercentage = 19;
  else if(index == F_FAKIRS) factionwinpercentage = game.finalscoring >= 3 ? 20:15;
  else if(index == F_NOMADS) factionwinpercentage = 24;
  else if(index == F_HALFLINGS) factionwinpercentage = 19;
  else if(index == F_CULTISTS) factionwinpercentage = 23;
  else if(index == F_ALCHEMISTS) factionwinpercentage = 13;
  else if(index == F_DARKLINGS) factionwinpercentage = 27;
  else if(index == F_MERMAIDS) factionwinpercentage = 23;
  else if(index == F_SWARMLINGS) factionwinpercentage = 22;
  else if(index == F_WITCHES) factionwinpercentage = 23;
  else if(index == F_AUREN) factionwinpercentage = 14;
  else if(index == F_ENGINEERS) factionwinpercentage = 26;
  else if(index == F_DWARVES) factionwinpercentage = game.finalscoring >= 3 ? 20:15;
  else if(index == F_ICEMAIDENS) factionwinpercentage = 16; 
  else if(index == F_YETIS) factionwinpercentage = 15; 
  else if(index == F_DRAGONLORDS) factionwinpercentage = 16; 
  else if(index == F_ACOLYTES) factionwinpercentage = 10; 
  else if(index == F_SHAPESHIFTERS) factionwinpercentage = 27;  //should be 34 (before new rules) 
  else if(index == F_RIVERWALKERS) factionwinpercentage = 29; 
  score += (factionwinpercentage - 10) / 20;
  return score;
};

AI.prototype.leechPower = function(playerIndex, fromPlayer, amount, vpcost, roundnum, already, still, callback) {
  var player = game.players[playerIndex];
  //LOU Decline at all times to accept power from Cultists (previously in Rounds 5,6)
  //LOU or Shapeshifters to reduce their power. Normal if human already accepts power.
  if(game.players[fromPlayer].faction == F_CULTISTS && !already && roundnum >= 1) {
    callback(playerIndex, false);
    return;
  }

  if(game.players[fromPlayer].faction == F_SHAPESHIFTERS && roundnum >= 1) {
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

AI.prototype.doRoundBonusSpade = function(playerIndex, callback) {
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
    throw new Error('AI chose invalid round bonus dig');
  }
};

AI.prototype.chooseCultistTrack = function(playerIndex, callback) {
  var player = game.players[playerIndex];
  this.updateScoreActionValues_(player, state.round);
  var besttrack = this.getBestCultTrack_(player, 1);

  var error = callback(playerIndex, besttrack);
  if(error != '') {
    addLog('ERROR: AI chose invalid cult track. Error: ' + error);
    throw new Error('AI chose invalid cult track');
  }
};

AI.prototype.getBestCultTrack_ = function(player, num) {
  var scores = [];
  for(var i = C_F; i <= C_A; i++) {
    scores.push(this.scoreCultTrack_(player, i, num, true));
  }
  return pickWithBestScore([C_F, C_W, C_E, C_A], scores, false);
};

//score cult track taking into account: power, bonus resources, relative positions to players and VPs
//cap = take into account top position of cult track or not?
AI.prototype.scoreCultTrack_ = function(player, cult, num, cap) {
  return this.scoreCultTrackResources_(player, cult, num, cap) + this.scoreCultTrackVP_(player, cult, num, cap);
};

//score cult track taking into account power and bonus resources, but not VPs
//cap = take into account top position of cult track or not?
AI.prototype.scoreCultTrackResources_ = function(player, cult, num, cap) {
  if(cap) num = willGiveCult(player, cult, num);
  if(num == 0) return 0;

  var result = 0;

  var res = [0,0,0,0,0];
  res[3] += cultPower(player.cult[cult], player.cult[cult] + num);

  var oldcult = player.cult;
  var newcult = [player.cult[0], player.cult[1], player.cult[2], player.cult[3]];
  newcult[cult] += num;
  cultincome = getAllComingCultRoundBonuses(oldcult, newcult);
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
AI.prototype.scoreCultTrackVP_ = function(player, cult, num, cap) {
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


