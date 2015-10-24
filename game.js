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
// The game-related global variables

// The main function
function beginGame() {
  game.bw = 13;
  game.bh = 9;
  game.btoggle = false;
  clearHumanState();

  fastestMode = false;
  fastMode = false;
  autoLeech = false;
  autoLeech1 = false;
  autoLeechNo = false;
  drawSaveLoadUI(true);
  gameLoopNonBlocking(S_PRE, false);
}


// Constructor
var Game = function() {
  this.bw = 13; //board width
  this.bh = 9; //board height
  this.btoggle = false; //toggle so that first line is one tile smaller rather than one tile bigger than next (shifted more to right rather than more to left than next line)

  //The world array has the color of each hex. It is inited with the standard world map.
  this.world = [];

  //array of 3-element arrays.
  //the 3 values are: N bridge, NE bridge, SE bridge
  //the value interpretation is bridge color, or N for none
  this.bridges = [];

  //array of 2-element arrays. the 2 values are: building type, color
  this.buildings = [];

  //global octogons. Octogons is a map, where undefined means the action is free, 1 means the action is taken. There are global octogons and per-player octogons.
  this.octogons = {};

  this.players = [];

  //priests sent to each cult track. The main array is for each track.
  //The sub array is the 4 priest places, the first being the value 3 one, the others the value 2 ones.
  //value N means no player is there, otherwise it's the player color
  //the '2' spots are filled in from left to right, so checking if cultp[C_F][3] == 'N' is enough to see that there's a free '2' spot left there.
  this.cultp = [[N,N,N,N],[N,N,N,N],[N,N,N,N],[N,N,N,N]];

  this.towntiles = {};
  this.favortiles = {};
  this.bonustiles = {};
  //the extra coins that appear on non-taken tiles
  this.bonustilecoins = [];
  this.roundtiles = [];

  this.finalscoring = 0; //index to finalScoringFunctions, e.g. 'none' or greatest sh-sa distance (0 is none)

  // NOTE: a few options are in the state rather than in the game: state.bonustilepromo2013, state.fireice, etc...
};

// The global game object
var game = new Game();

var newAI = function() {
  return state.louAI ? new AILou() : new AILode();
};

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function makeNewAIPlayer(name) {
  var player = new Player();
  player.human = false;
  player.actor = newAI();
  player.name = name;
  return player;
}

function makeNewHumanPlayer(name) {
  var player = new Player();
  player.human = true;
  player.actor = new Human();
  player.name = name;
  return player;
}

function initParams(params) {
  state.newcultistsrule = params.newcultistsrule;
  state.towntilepromo2013 = params.towntilepromo2013;
  state.bonustilepromo2013 = params.bonustilepromo2013;
  state.fireice = params.fireice;
  state.turnorder = params.turnorder;
  state.louAI = params.louAI;
  state.fireiceerrata = params.fireiceerrata;
  state.roundtilepromo2015 = params.roundtilepromo2015;

  var finalscoring = params.finalscoring;
  if(finalscoring == -1) {
    if(params.fireice && finalScoringCodeNames.length > 1) {
      finalscoring = 1 + Math.floor(Math.random() * (finalScoringCodeNames.length - 1));
    } else {
      // No Fire & Ice expansion final scoring.
      finalscoring = 0;
    }
  }

  game.finalscoring = finalscoring;
}

function startNewRound() {
  state.round++;
  addLog('');
  addLog('ROUND ' + state.round + (logUpsideDown ? ' started ^' : ' started'));
  this.currentPlayer = this.startPlayer;
  for(var i = 0; i < game.players.length; i++) {
    var player = game.players[i];
    var income = getIncome(player, true, state.round - 1 /*because you get the round bonus from last round*/);
    addIncome(player, income);
    addLog(logPlayerNameFun(player) + ' Income: ' + incomeToStringWithPluses(income) + getGreyedResourcesLogString(player));
    player.passed = false;
  }

  state.turnMatrix[0] = state.turnMatrix[1];
  state.turnMatrix[1] = [];
  while(state.turnMatrix[0].length < game.players.length) state.turnMatrix[0].push(-1);

  initOctogons();
  addBonusTileCoins();
}

// With the round tiles etc...
function initialGameLogMessage() {
  var playernames = '';
  for(var i = 0; i < game.players.length; i++) playernames += (game.players[wrapPlayer(state.startPlayer + i)].name) + (i < game.players.length - 1 ? ', ' : '');
  addLog('Players: ' + playernames);
  addLog(game.players[state.startPlayer].name + ' is the starting player');

  if(state.newcultistsrule) addLog('cultists errata enabled');
  if(state.towntilepromo2013) addLog('town tiles promo 2013 enabled');
  if(state.bonustilepromo2013) addLog('shipping bonus tile promo 2013 enabled');
  if(state.fireice) addLog('fire & ice expansion enabled');
  if(state.turnorder) addLog('variable turn order enabled');
  if(state.louAI) addLog('Lou New\'s AI enabled');
  if(state.fireiceerrata) addLog('fire & ice errata enabled');
  if(state.roundtilepromo2015) addLog('round tile promo 2015 enabled');

  addLog('round 1 tile: ' + tileToStringLong(game.roundtiles[1], true));
  addLog('round 2 tile: ' + tileToStringLong(game.roundtiles[2], true));
  addLog('round 3 tile: ' + tileToStringLong(game.roundtiles[3], true));
  addLog('round 4 tile: ' + tileToStringLong(game.roundtiles[4], true));
  addLog('round 5 tile: ' + tileToStringLong(game.roundtiles[5], true));
  addLog('round 6 tile: ' + tileToStringLong(game.roundtiles[6], true));
  var j = 0;
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) {
    if(game.bonustiles[i]) {
      j++;
      addLog('bonus tile ' + j + ': ' + tileToStringLong(i, true));
    }
  }
  addLog('');
}


function initialGameRender() {
  uiElement.innerHTML = '';
  drawMap();
  drawMapClick();
  drawHud();
  drawSaveLoadUI(false);
}

function initWorldForParams(params) {
  if(localStorageSupported() && location && location.search &&
      location.search.indexOf('playtest') >= 0 &&
      localStorage['karteneditor_world']) {
    parseWorld(localStorage['karteneditor_world']);
  }

  params.worldGenerator(game);
}

function getAIPlayerName(index) {
  if(index < 5) return ['Talos', 'Galatea', 'Golem', 'Hal', 'Automaton'][index];
  else return 'AI' + (index + 1);
}

function getHumanPlayerName(index) {
  if(index < 5) return ['Human', 'Human2', 'Human3', 'Human4', 'Human5'][index];
  else return 'Human' + (index + 1);
}

function initPlayers(params) {
  var numai = 0;
  var numhuman = 0;

  for(var i = 0; i < params.numplayers; i++) {
    if(i == 0 && !params.allai) {
      game.players[i] = makeNewHumanPlayer(getHumanPlayerName(numhuman));
      numhuman++;
    } else {
      game.players[i] = makeNewAIPlayer(getAIPlayerName(numai));
      numai++;
    }
    game.players[i].index = i;
  }

  var startplayer = params.startplayer;
  if(startplayer == -1) startplayer = randomInt(game.players.length);
  startplayer = wrapPlayer(startplayer)
  state.startPlayer = startplayer;
  state.currentPlayer = startplayer;
}

// Start the default game
function startGameButtonFun(params) {
  initParams(params);
  initWorldForParams(params);
  initBoard();
  initPlayers(params);
  chooseOrRandomizePlayerFactions(params);

  chooseRoundTiles(params);
  chooseBonusTiles(params);

  initialGameRender();
  initialGameLogMessage();
  state.initNewStateType(S_INIT_FACTION); //TODO: do this better
  gameLoopNonBlocking(S_INIT_FACTION, false);
}

function startBeginnerGameButtonFun(params) {
  initParams(params);
  initStandardWorld(game); // Random world not supported here
  initBoard();
  initPlayers(params);

  //beginner game factions
  if(game.players.length <= 2) {
    // 1-player not supported
    game.players[state.startPlayer].setFaction(F_WITCHES);
    game.players[wrapPlayer(state.startPlayer + 1)].setFaction(F_NOMADS);
  }
  else if(game.players.length == 3) {
    game.players[state.startPlayer].setFaction(F_WITCHES);
    game.players[wrapPlayer(state.startPlayer + 1)].setFaction(F_NOMADS);
    game.players[wrapPlayer(state.startPlayer + 2)].setFaction(F_ALCHEMISTS);
  }
  else if(game.players.length == 4) {
    game.players[state.startPlayer].setFaction(F_WITCHES);
    game.players[wrapPlayer(state.startPlayer + 1)].setFaction(F_NOMADS);
    game.players[wrapPlayer(state.startPlayer + 2)].setFaction(F_HALFLINGS);
    game.players[wrapPlayer(state.startPlayer + 3)].setFaction(F_MERMAIDS);
  }
  else if(game.players.length == 5) {
    game.players[state.startPlayer].setFaction(F_WITCHES);
    game.players[wrapPlayer(state.startPlayer + 1)].setFaction(F_NOMADS);
    game.players[wrapPlayer(state.startPlayer + 2)].setFaction(F_HALFLINGS);
    game.players[wrapPlayer(state.startPlayer + 3)].setFaction(F_MERMAIDS);
    game.players[wrapPlayer(state.startPlayer + 4)].setFaction(F_GIANTS);
  }
  for(var i = 0; i < game.players.length; i++) {
    game.players[i].color = factionColor(game.players[i].getFaction());
    game.players[i].auxcolor = game.players[i].color;
    game.players[i].woodcolor = game.players[i].color;
    initPlayerFaction(game.players[i]);
  }
  recalculateColorMaps();

  //beginner game bonus tiles
  if(game.players.length == 2) {
    game.bonustiles[T_BON_CULT_4C] = 0;
    game.bonustiles[T_BON_PASSDVP_2C] = 0;
    game.bonustiles[T_BON_PASSTPVP_1W] = 0;
    game.bonustiles[T_BON_1P] = 0;
    game.bonustiles[T_BON_PASSSHIPVP_3PW] = 0;
  }
  else if(game.players.length == 3) {
    game.bonustiles[T_BON_CULT_4C] = 0;
    game.bonustiles[T_BON_PASSDVP_2C] = 0;
    game.bonustiles[T_BON_PASSTPVP_1W] = 0;
    game.bonustiles[T_BON_PASSSHIPVP_3PW] = 0;
  }
  else if(game.players.length == 4) {
    game.bonustiles[T_BON_PASSDVP_2C] = 0;
    game.bonustiles[T_BON_PASSTPVP_1W] = 0;
    game.bonustiles[T_BON_PASSSHIPVP_3PW] = 0;
  }
  else if(game.players.length == 5) {
    game.bonustiles[T_BON_PASSDVP_2C] = 0;
    game.bonustiles[T_BON_PASSSHIPVP_3PW] = 0;
  }

  //beginner game round tiles
  game.roundtiles[1] = T_ROUND_D2VP_4F4PW;
  game.roundtiles[2] = T_ROUND_SHSA5VP_2A1W;
  game.roundtiles[3] = T_ROUND_DIG2VP_1E1C;
  game.roundtiles[4] = T_ROUND_TP3VP_4W1DIG;
  game.roundtiles[5] = T_ROUND_SHSA5VP_2F1W;
  game.roundtiles[6] = T_ROUND_TP3VP_4W1DIG;

  //beginner game starting dwellings
  function placeBeginnerDwelling(i, x, y) {
    var error = placeInitialDwelling(game.players[wrapPlayer(state.startPlayer + i)], x, y);
    if(error != '') throw new Error('invalid beginner dwelling coordinates: ' + error + ' ' + x + ' ' + y + ' ' + game.players[wrapPlayer(state.startPlayer + i)].color);
  }
  if(game.players.length == 2) {
    placeBeginnerDwelling(0, 6, 2);
    placeBeginnerDwelling(0, 5, 5);
    placeBeginnerDwelling(1, 7, 4);
    placeBeginnerDwelling(1, 4, 5);
    placeBeginnerDwelling(1, 6, 8);
  }
  if(game.players.length == 3) {
    placeBeginnerDwelling(0, 10, 4);
    placeBeginnerDwelling(0, 5, 5);
    placeBeginnerDwelling(1, 4, 5);
    placeBeginnerDwelling(1, 9, 6);
    placeBeginnerDwelling(1, 6, 8);
    placeBeginnerDwelling(2, 4, 4);
    placeBeginnerDwelling(2, 10, 6);
  }
  if(game.players.length == 4) {
    placeBeginnerDwelling(0, 10, 4);
    placeBeginnerDwelling(0, 5, 5);
    placeBeginnerDwelling(1, 2, 3);
    placeBeginnerDwelling(1, 7, 4);
    placeBeginnerDwelling(1, 6, 8);
    placeBeginnerDwelling(2, 5, 4);
    placeBeginnerDwelling(2, 9, 5);
    placeBeginnerDwelling(3, 6, 3);
    placeBeginnerDwelling(3, 3, 4);
  }
  else if(game.players.length == 5) {
    placeBeginnerDwelling(0, 6, 2);
    placeBeginnerDwelling(0, 10, 4);
    placeBeginnerDwelling(1, 4, 0);
    placeBeginnerDwelling(1, 2, 3);
    placeBeginnerDwelling(1, 6, 8);
    placeBeginnerDwelling(2, 5, 4);
    placeBeginnerDwelling(2, 9, 5);
    placeBeginnerDwelling(3, 3, 4);
    placeBeginnerDwelling(3, 6, 7);
    placeBeginnerDwelling(4, 5, 3);
    placeBeginnerDwelling(4, 10, 3);
  }

  calculateTownClusters();

  initialGameRender();
  initialGameLogMessage();
  state.currentPlayer = wrapPlayer(state.startPlayer - 1);
  state.initNewStateType(S_INIT_BONUS); //TODO: do this better
  gameLoopNonBlocking(S_INIT_BONUS, false); //faction and starting dwellings already done.
}

//debug scenario, where you're immediately in the actions, dwelling and such are already placed
function startQuickGameButtonFun(params) {
  initParams(params);
  initWorldForParams(params);
  initBoard();

  for(var i = 0; i < params.numplayers; i++) {
    game.players[i] = makeNewAIPlayer(getAIPlayerName(i));
    game.players[i].index = i;
  }

  chooseOrRandomizePlayerFactions(params);
  var startplayer = params.startplayer;
  if(startplayer == -1) startplayer = randomInt(game.players.length);
  startplayer = wrapPlayer(startplayer)
  state.startPlayer = startplayer;
  state.currentPlayer = startplayer;

  chooseRoundTiles(params);
  chooseBonusTiles(params);

  state.type = S_INIT_FACTION;
  gameLoopBlocking(function() {
    return state.type == S_ACTION;
  });


  if (!params.allai) {
    game.players[0].human = true;
    game.players[0].actor = new Human();
    game.players[0].name = 'human';
  }

  initialGameRender();
  initialGameLogMessage();
  state.initNewStateType(S_ACTION); //TODO: do this better
  gameLoopNonBlocking(S_ACTION, false);
}

function startRandomGameButtonFun(params) {
  for(var i = 0; i < params.presetfaction.length; i++) {
    if(params.presetfaction[i] == 'choose') params.presetfaction[i] = 'random';
  }

  startGameButtonFun(params);
}

function randomShuffle(list) {
  // Fisher-Yates shuffle
  for(var i = list.length - 1; i > 0; i--) {
    var j = randomInt(i + 1);
    var temp = list[i];
    list[i] = list[j];
    list[j] = temp;
  }
}

//Randomizes, or sets to chosen value from params, if applicable.
//That is, it leaves the faction empty for players with dropdowns that had 'choose' (so the normal gamestate will handle
//the choice), randomizes it for those with 'random', and sets the ones with a pre-chosen faction
function chooseOrRandomizePlayerFactions(params) {
  // The players with pre-determined race
  var takencolors = {};
  if(!params.fireice) {
    //disable the expansion colors for random selection if fireice is diabled
    takencolors[O] = true;
    takencolors[W] = true;
    takencolors[X] = true;
    takencolors[Z] = true;
  }
  for(var i = 0; i < game.players.length; i++) {
    if(params.presetfaction[i] != 'choose' && params.presetfaction[i] != 'random') {
      var color = factionColor(params.presetfaction[i]);
      if(takencolors[color]) continue;
      game.players[i].setFaction(params.presetfaction[i]);
      game.players[i].color = color;
      game.players[i].woodcolor = color; // TODO: handle auxcolor and woodcolor correctly here
      takencolors[color] = true;
    }
  }
  var freecolors = [];
  for(var i = FACTION_COLOR_BEGIN; i <= FACTION_COLOR_END; i++) {
    if(!takencolors[i]) freecolors.push(i);
  }
  // The players with random race
  randomShuffle(freecolors);
  var j = 0;
  for(var i = 0; i < game.players.length; i++) {
    if(params.presetfaction[i] == 'random') {
      for(;;) {
        var color = freecolors[j];
        j++;
        var factions = colorFactions(color);
        if(factions.length > 0) {
          game.players[i].setFaction(factions[randomIndex(factions)]);
          game.players[i].color = color;
          game.players[i].woodcolor = color; // TODO: handle auxcolor and woodcolor correctly here
          break;
        }
      }
    }
  }

  // The ones set to 'choose' remain as-is and will be chosen when the game starts
}

function chooseRoundTiles(params) {
  for(var i = 6; i > 0; i--) game.roundtiles[i] = T_NONE;

  var taken = {};
  for(var i = 6; i > 0; i--) {
    var index = params.presetround[i - 1];
    if(i >= 5 && index == T_ROUND_DIG2VP_1E1C) continue; //no digging VP's in the last two rounds due to halflings abuse
    if(taken[index]) continue; //no duplicate round tiles
    taken[index] = true;
    game.roundtiles[i] = index;
  }
  for(var i = 6; i > 0; i--) {
    if(game.roundtiles[i] != T_NONE) continue;
    while(true) {
      var index = T_ROUND_BEGIN + 1 + randomInt(T_ROUND_END - T_ROUND_BEGIN - 1);
      if(i >= 5 && index == T_ROUND_DIG2VP_1E1C) continue; //no digging VP's in the last two rounds due to halflings abuse
      if(!params.roundtilepromo2015 && isRoundTilePromo2015Tile(index)) continue;
      if(taken[index]) continue; //no duplicate round tiles
      taken[index] = true;
      game.roundtiles[i] = index;
      break;
    }
  }
}

function chooseBonusTiles(params) {
  game.bonustilecoins = [];

  var list1 = []; //the preferred ones
  var list2 = [];
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) {
    if (!params.bonustilepromo2013 && isBonusTilePromo2013Tile(i)) {
      continue;
    }
    if(params.presetbonus[i]) {
      list1.push(i);
    } else {
      list2.push(i);
    }
  }

  randomShuffle(list1);
  randomShuffle(list2);

  var chosen = {};
  var amount = Math.min(game.players.length + 3, T_BON_END - T_BON_BEGIN - 1);
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) game.bonustiles[i] = 0;

  for(var i = 0; i < amount; i++) {
    if(i < list1.length) game.bonustiles[list1[i]] = 1;
    else game.bonustiles[list2[i - list1.length]] = 1;
  }
}
