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

//The game state machine

//Gamestate enum
var S_index = 0;
S_PRE = S_index++; //Pre-game state, where you can choose options, amount of players, start player, ...
//Initial states, each next state is either the same with a next player, or the next one (until S_ACTION is reached)
S_INIT_FACTION = S_index++; //Choosing faction.
S_INIT_DWELLING = S_index++; //Placing initial dwellings until all done.
S_INIT_BONUS = S_index++; //Choosing initial bonus tile.
//The most complex state, handles player taking actions on their turn, passing, rounds, and income between rounds.
S_ACTION = S_index++; //Taking actions, for 6 rounds long.
//States between actions or caused by actions. Next state is again itself, or S_ACTION
S_LEECH = S_index++; //Player making leeching decision
S_CULTISTS = S_index++; //Cultists player choosing cult track after leeching
//States between rounds. Next state is again itself, or S_ACTION
S_ROUND_END = S_index++; //Player digging due to round end cult bonus
//Final state after all actions and rounds are done.
S_GAME_OVER = S_index++; //Game done, final scores shown.

//Constructor
var State = function() {
  this.type = S_PRE;
  this.round = 0; //the round for actions. 0 = pre-rounds, 1-6 = game rounds.
  this.startPlayer = 0;
  this.currentPlayer = -1;
  this.rounddigsdone = 0; //players who have done the round dig bonus (this could be more generic, but only bonus round digs need it now - it's similar to currentPlayer, except it cound up and when >= players.length, it's all done)
  this.currentStateDone = false; //whether current state has been finished and the next should start. E.g. while waiting for the player to press "next". Keeping track of this prevents accidentially giving the same person two actions.

  this.leecharray = 0; //3D leech array described at function getLeechEffect
  this.leechi = 0; //index in main leech array
  this.leechj = 0; //player index in current leech sub array
  this.leechtaken = 0;

  this.reset = false; //for restarting a game

  // game rule options
  this.newcultistsrule = true;
  this.miniexpansion2013 = true; // new town tiles
};

var logPlayerNameFun = getFullName; //alternative is getFullNameColored, but that makes it slower to render

var state = new State();


var nextButtonFun = null; //for shortcut
var fastButtonFun = null; //for shortcut
var fastestButtonFun = null; //for shortcut

var fastMode = true;
var fastestMode = false;
var nscount = 0;
var nsfuncount = 0;
var showingNextButtonPanel = false;
// When this function is called, state.currentPlayer must be the previous player (and what previous is depends on the state, e.g. during dwelling placement it goes in various directions)
// progress = whether the state change progresses the game (= should pause for the player)
function nextState(type, progress) {
  var nsfun = function(type) {
    nextButtonFun = null;
    fastButtonFun = null;
    state.type = type;
    showingNextButtonPanel = false;
    state.nextState();
    if(players.length > 0) {
      drawHud();
      drawMap();
    }
  };

  if(state.currentPlayer == 0 && !fastestMode && state.type != S_LEECH) fastMode = false;

  var fast = !progress || fastMode || type == S_PRE;

  if(fast) {
    // First let previous player's functions all finish
    // Without this, some stuff breaks, due to actor functions still doing some things after calling callbacks (mostly the human actor though)
    // This makes it slower, but in fact nicer, it makes the screen being redrawn between every action of every AI player, which gives a nice progressive update animation.
    // A possible speedup (losing the animation effect) is to only do the setTimeout if the current player is the human player
    window.setTimeout(bind(nsfun, type), 0);
  } else {
    // Slow (that is, requiring user interaction)
    window.setTimeout(function() {
      popupElement.innerHTML = '';

      nextButtonFun = bind(nsfun, type);
      fastButtonFun = bind(function(type) {
        fastMode = true;
        nsfun(type);
      }, type);
      fastestButtonFun = bind(function(type) {
        fastMode = true;
        fastestMode = true;
        nsfun(type);
      }, type)

      showingNextButtonPanel = true;
      drawHud();
      drawMap();
    }, 0);
  }
}

function initialDwellingDoCallback(player, x, y) {
  state.currentStateDone = true;
  var error = placeInitialDwelling(player, x, y);
  if(error == '') addLog(logPlayerNameFun(player) + ' placed initial dwelling at ' + printCo(x, y));
  else addLog(logPlayerNameFun(player) + ' attempted illegal initial dwelling ' + printCo(x, y) + '. Error: ' + error);
  //drawHud();
  //drawMap();
  if(error == '') {
    nextState(S_INIT_DWELLING, true);
  }
  return error;
}

function factionDoCallback(player, faction) {
  state.currentStateDone = true;
  var error = trySetFaction(player, faction);
  if(error == '') addLog(logPlayerNameFun(player) + ' chose faction: ' + factionNames[faction]);
  else addLog(logPlayerNameFun(player) + ' chose illegal faction: ' + factionNames[faction]);
  initPlayerFaction(player);
  //drawHud();
  if(error == '') nextState(S_INIT_FACTION, true);
  return error;
}

function initialBonusTileDoCallback(player, tile) {
  state.currentStateDone = true;
  var error = giveBonusTile(player, tile);
  if(error == '') addLog(logPlayerNameFun(player) + ' took bonus tile ' + tileToString(tile));
  else addLog(logPlayerNameFun(player) + ' attempted illegal bonus tile ' + tile + '. Error: ' + error);
  //drawHud();
  if(error == '') nextState(S_INIT_BONUS, true);
  return error;
}

function leechCallback(amount, player, leech) {
  state.currentStateDone = true;
  if(leech) {
    addLog(logPlayerNameFun(player) + ' leeched ' + amount + ' from ' + logPlayerNameFun(players[state.currentPlayer]));
    leechPower(player, amount);
    state.leechtaken++;
  } else {
    addLog(logPlayerNameFun(player) + ' declined to leech ' + amount + ' from ' + logPlayerNameFun(players[state.currentPlayer]));
  }
  nextState(S_LEECH, true);
  return '';
}

function cultistsCallback(player, cult) {
  state.currentStateDone = true;
  giveCult(player, cult, 1);
  addLog(logPlayerNameFun(player) + ' used cultists ability on ' + getCultName(cult));
  nextState(S_LEECH, true);
  return '';
}

//digs = array where each element is an array [actiontype, x, y], and actiontype is  e.g. A_TRANSFORM_CW, ...
function roundDigCallback(player, digs) {
  state.currentStateDone = true;
  var error = canDoRoundBonusDigs(player, digs);
  if(error != '') {
    addLog(logPlayerNameFun(player) + ' attempted illegal round bonus dig at: ' + printCos(digs) + '. Error: ' + error);
    return error; //the error is ignored for humans, so that human player can click invalid tiles if no valid ones exist. TODO: throw errors instead and give UI to skip it instead
  }
  for(var i = 0; i < digs.length; i++) {
    var error = tryRoundBonusDig(player, digs[i][0], digs[i][1], digs[i][2]);
    if(error == '') {
      addLog(logPlayerNameFun(player) + ' did round bonus dig at ' + printCo(digs[i][1], digs[i][2]));
    } else {
      addLog(logPlayerNameFun(player) + ' attempted illegal round bonus dig at: ' + printCos(digs) + '. Error: ' + error);
      return error;
    }
  }
  nextState(S_ROUND_END, true);
  return '';
}

function startNewRound() {
  state.round++;
  addLog('');
  addLog('ROUND ' + state.round + (logUpsideDown ? ' started ^' : ' started'));
  this.currentPlayer = this.startPlayer - 1; //so that when pre-incrementing, start player begins
  for(var i = 0; i < players.length; i++) {
    var player = players[i];
    var income = getIncome(player, true, state.round - 1 /*because you get the round bonus from last round*/);
    addLog(logPlayerNameFun(player) + ' Income: ' + incomeToStringWithPluses(income));
    addIncome(player, income);
    player.passed = false;
  }
  initOctogons();
  addBonusTileCoins();
}

function actionDoCallback(player, actions) {
  state.currentStateDone = true;
  var resbefore = [player.c, player.w, player.p, player.pw2, player.vp];
  var error = tryActions(player, actions);
  var resafter = [player.c, player.w, player.p, player.pw2, player.vp];
  subtractIncome(resafter, resbefore);
  var resstring = incomeToStringWithPluses(resafter);
  if(resstring.length > 0) resstring = ' ' + resstring + ', ';
  resstring += player.vp + 'vp';
  if(error == '') addLog(logPlayerNameFun(player) + ' Action: <b>' + actionsToString(actions) + '</b> | ' + resstring);
  else addLog(logPlayerNameFun(player) + ' attempted illegal action: ' + actionsToString(actions) + ' Error: ' + error);
  //drawMap();
  //drawHud();
  if(error == '') {
    var leech = getLeechEffect(player.index, actions);
    if(leech.length > 0) {
      state.leecharray = leech;
      state.leechi = 0;
      state.leechj = -1;
      state.leechtaken = 0;
      nextState(S_LEECH, true);
    } else {
      nextState(S_ACTION, true);
    }
  }
  return error;
}

State.prototype.getHelpText = function() {
};



function makeNewAIPlayer(name) {
  var player = new Player();
  player.human = false;
  player.actor = new AI();
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
  state.miniexpansion2013 = params.miniexpansion2013;

  initBoard();
}

function initPlayers(params) {
  players[0] = makeNewHumanPlayer('human');
  players[0].index = 0;
  for(var i = 1; i < params.numplayers; i++) {
    players[i] = makeNewAIPlayer(['AI1', 'AI2', 'AI3', 'AI4'][i-1]);
    players[i].index = i;
  }

  var startplayer = params.startplayer;
  if(startplayer == -1) startplayer = randomInt(players.length);
  startplayer = wrap(startplayer, 0, players.length)
  state.startPlayer = startplayer;
  state.currentPlayer = startplayer - 1; // -1 so that when pre-incrementing it becomes the correct one.
}


function initialGameRender() {
  uiElement.innerHTML = '';
  drawMap();
  drawMapClick();
  drawHud();
  drawSaveLoadUI(false);

  addLog(players[state.startPlayer].name + ' is the starting player');

  addLog('round 1 tile: ' + tileToStringLong(roundtiles[1], true));
  addLog('round 2 tile: ' + tileToStringLong(roundtiles[2], true));
  addLog('round 3 tile: ' + tileToStringLong(roundtiles[3], true));
  addLog('round 4 tile: ' + tileToStringLong(roundtiles[4], true));
  addLog('round 5 tile: ' + tileToStringLong(roundtiles[5], true));
  addLog('round 6 tile: ' + tileToStringLong(roundtiles[6], true));
  var j = 0;
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) {
    if(bonustiles[i]) {
      j++;
      addLog('bonus tile ' + j + ': ' + tileToStringLong(i, true));
    }
  }
  addLog('');
}

function startGameButtonFun(params) {
  initParams(params);
  if(params.worldmap == 0) initStandardWorld();
  else randomizeWorld(params.worldmap == 2);
  initPlayers(params);

  chooseRoundTiles(params);
  chooseBonusTiles(params);

  initialGameRender();
  nextState(S_INIT_FACTION, false);
}

function startBeginnerGameButtonFun(params) {
  initParams(params);
  initStandardWorld(); // Random world not supported here
  initPlayers(params);

  //beginner game factions
  if(players.length <= 2) {
    // 1-player not supported
    players[state.startPlayer].faction = F_WITCHES;
    players[wrap(state.startPlayer + 1, 0, players.length)].faction = F_NOMADS;
  }
  else if(players.length == 3) {
    players[state.startPlayer].faction = F_WITCHES;
    players[wrap(state.startPlayer + 1, 0, players.length)].faction = F_NOMADS;
    players[wrap(state.startPlayer + 2, 0, players.length)].faction = F_ALCHEMISTS;
  }
  else if(players.length == 4) {
    players[state.startPlayer].faction = F_WITCHES;
    players[wrap(state.startPlayer + 1, 0, players.length)].faction = F_NOMADS;
    players[wrap(state.startPlayer + 2, 0, players.length)].faction = F_HALFLINGS;
    players[wrap(state.startPlayer + 3, 0, players.length)].faction = F_MERMAIDS;
  }
  else if(players.length == 5) {
    players[state.startPlayer].faction = F_WITCHES;
    players[wrap(state.startPlayer + 1, 0, players.length)].faction = F_NOMADS;
    players[wrap(state.startPlayer + 2, 0, players.length)].faction = F_HALFLINGS;
    players[wrap(state.startPlayer + 3, 0, players.length)].faction = F_MERMAIDS;
    players[wrap(state.startPlayer + 4, 0, players.length)].faction = F_GIANTS;
  }
  for(var i = 0; i < players.length; i++) {
    players[i].color = factionColor(players[i].faction);
    initPlayerFaction(players[i]);
  }
  createColorToPlayerMap();

  //beginner game bonus tiles
  if(players.length == 2) {
    bonustiles[T_BON_CULT_4C] = 0;
    bonustiles[T_BON_PASSDVP_2C] = 0;
    bonustiles[T_BON_PASSTPVP_1W] = 0;
    bonustiles[T_BON_1P] = 0;
  }
  else if(players.length == 3) {
    bonustiles[T_BON_CULT_4C] = 0;
    bonustiles[T_BON_PASSDVP_2C] = 0;
    bonustiles[T_BON_PASSTPVP_1W] = 0;
  }
  else if(players.length == 4) {
    bonustiles[T_BON_PASSDVP_2C] = 0;
    bonustiles[T_BON_PASSTPVP_1W] = 0;
  }
  else if(players.length == 5) {
    bonustiles[T_BON_PASSDVP_2C] = 0;
  }

  //beginner game round tiles
  roundtiles[1] = T_ROUND_D2VP_4R4PW;
  roundtiles[2] = T_ROUND_SHSA5VP_2W1W;
  roundtiles[3] = T_ROUND_DIG2VP_1O1C;
  roundtiles[4] = T_ROUND_TP3VP_4W1DIG;
  roundtiles[5] = T_ROUND_SHSA5VP_2R1W;
  roundtiles[6] = T_ROUND_TP3VP_4B1DIG;

  //beginner game starting dwellings
  function placeBeginnerDwelling(i, x, y) {
    var error = placeInitialDwelling(players[wrap(state.startPlayer + i, 0, players.length)], x, y);
    if(error != '') throw 'invalid beginner dwelling coordinates: ' + error + ' ' + x + ' ' + y + ' ' + players[wrap(state.startPlayer + i, 0, players.length)].color;
  }
  if(players.length == 2) {
    placeBeginnerDwelling(0, 6, 2);
    placeBeginnerDwelling(0, 5, 5);
    placeBeginnerDwelling(1, 7, 4);
    placeBeginnerDwelling(1, 4, 5);
    placeBeginnerDwelling(1, 6, 8);
  }
  if(players.length == 3) {
    placeBeginnerDwelling(0, 10, 4);
    placeBeginnerDwelling(0, 5, 5);
    placeBeginnerDwelling(1, 4, 5);
    placeBeginnerDwelling(1, 9, 6);
    placeBeginnerDwelling(1, 6, 8);
    placeBeginnerDwelling(2, 4, 4);
    placeBeginnerDwelling(2, 10, 6);
  }
  if(players.length == 4) {
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
  else if(players.length == 5) {
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
  state.currentPlayer = state.startPlayer; //so that when pre-decrementing, the last player chooses the bonus tile first
  nextState(S_INIT_BONUS, false); //faction and starting dwellings already done.
}

function startObserveGameButtonFun(params) {
  initParams(params);
  if(params.worldmap == 0) initStandardWorld();
  else randomizeWorld(params.worldmap == 2);

  for(var i = 0; i < params.numplayers; i++) {
    players[i] = makeNewAIPlayer(['AI0', 'AI1', 'AI2', 'AI3', 'AI4'][i]);
    players[i].index = i;
  }

  var startplayer = params.startplayer;
  if(startplayer == -1) startplayer = randomInt(players.length);
  startplayer = wrap(startplayer, 0, players.length)
  state.startPlayer = startplayer;
  state.currentPlayer = startplayer - 1; // -1 so that when pre-incrementing it becomes the correct one.

  chooseRoundTiles(params);
  chooseBonusTiles(params);

  initialGameRender();
  nextState(S_INIT_FACTION, false);
}

//debug scenario, where you're immediately in the actions, dwelling and such are already placed
function startDebugGameButtonFun(params) {
  initParams(params);
  if(params.worldmap == 0) initStandardWorld();
  else randomizeWorld(params.worldmap == 2);

  var ai = new AI(); //to auto-place everything

  params.numplayers = 2;
  params.startplayer = 0;
  initPlayers(params);
  players[0].faction = F_CULTISTS;
  players[1].faction = F_SWARMLINGS;
  for(var i = 0; i < players.length; i++) {
    players[i].color = factionColor(players[i].faction);
    initPlayerFaction(players[i]);
  }
  createColorToPlayerMap();

  function placeDwelling(player, x, y) {
    var error = placeInitialDwelling(player, x, y);
    if(error != '') throw 'invalid dwelling coordinates: ' + error + ' ' + x + ' ' + y + ' ' + player.color;
    return error;
  }
  for(var i = 0; i < players.length; i++) {
    while(getInitialDwellingsLeft(players[i]) > 0) {
      ai.chooseInitialDwelling(i, placeDwelling);
    }
  }

  chooseRoundTiles(params);
  chooseBonusTiles(params);

  for(var i = 0; i < players.length; i++) {
    ai.chooseInitialBonusTile(i, function(player, tile) {
      return giveBonusTile(player, tile);
    });
  }

  calculateTownClusters();

  initialGameRender();
  startNewRound();
  nextState(S_ACTION, false);
}

function randomShuffle(list) {
  // Fisher-Yates shuffle
  for(var i = list.length - 1; i > 0; i--) {
    var j = randomInt(i);
    var temp = list[i];
    list[i] = list[j];
    list[j] = temp;
  }
}

//randomizes, or sets to chosen value from params
function randomizePlayerFactions(params) {
  // The players with pre-determined race
  var takencolors = {};
  for(var i = 0; i < players.length; i++) {
    if(params.presetfaction[i] != F_NONE) {
      var color = factionColor(params.presetfaction[i]);
      if(takencolors[color]) continue;
      players[i].faction = params.presetfaction[i];
      players[i].color = color;
      initPlayerFaction(players[i]);
      takencolors[color] = true;
    }
  }
  var freecolors = [];
  for(var i = R; i <= E; i++) {
    if(!takencolors[i]) freecolors.push(i);
  }
  // The players with random race
  randomShuffle(freecolors);
  var j = 0;
  for(var i = 0; i < players.length; i++) {
    if(players[i].faction == F_NONE) {
      var factions = colorFactions(freecolors[i]);
      players[i].faction = factions[randomIndex(factions)];
      players[i].color = freecolors[i];
      initPlayerFaction(players[i]);
    }
  }
}

function chooseRoundTiles(params) {
  for(var i = 6; i > 0; i--) roundtiles[i] = T_NONE;

  var taken = {};
  for(var i = 6; i > 0; i--) {
    var index = params.presetround[i - 1];
    if(i >= 5 && index == T_ROUND_DIG2VP_1O1C) continue; //no digging VP's in the last two rounds due to halflings abuse
    if(taken[index]) continue; //no duplicate round tiles
    taken[index] = true;
    roundtiles[i] = index;
  }
  for(var i = 6; i > 0; i--) {
    if(roundtiles[i] != T_NONE) continue;
    while(true) {
      var index = T_ROUND_BEGIN + 1 + randomInt(T_ROUND_END - T_ROUND_BEGIN - 1);
      if(i >= 5 && index == T_ROUND_DIG2VP_1O1C) continue; //no digging VP's in the last two rounds due to halflings abuse
      if(taken[index]) continue; //no duplicate round tiles
      taken[index] = true;
      roundtiles[i] = index;
      break;
    }
  }
}

function chooseBonusTiles(params) {
  bonustilecoins = [];

  var list1 = []; //the preferred ones
  var list2 = [];
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) {
    if(params.presetbonus[i]) {
      list1.push(i);
    } else {
      list2.push(i);
    }
  }

  randomShuffle(list1);
  randomShuffle(list2);

  var chosen = {};
  var amount = Math.min(players.length + 3, T_BON_END - T_BON_BEGIN - 1);
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) bonustiles[i] = 0;

  for(var i = 0; i < amount; i++) {
    if(i < list1.length) bonustiles[list1[i]] = 1;
    else bonustiles[list2[i - list1.length]] = 1;
  }
  
}

function startPresetGameButtonFun(params) {
  initParams(params);
  if(params.worldmap == 0) initStandardWorld();
  else randomizeWorld(params.worldmap == 2);

  initPlayers(params);
  randomizePlayerFactions(params);

  createColorToPlayerMap();

  chooseRoundTiles(params);
  chooseBonusTiles(params);

  initialGameRender();
  nextState(S_INIT_DWELLING, false); //faction and starting dwellings already done.
}

function getInitialDwellingsLeft(player) {
  var numplaced = 8 - player.b_d;
  return getNumInitialDwellings(player) - numplaced;
}

function getInitialDwellingsDone(player) {
  return 8 - player.b_d;
}

//TODO: this function probably belongs in rules.js (but not the addLog things)
function addEndGameScore() {
  //cult tracks
  for(var i = C_R; i <= C_W; i++) {
    addLog('');
    var scores = getCultEndScores(i);
    for(var j = 0; j < scores.length; j++) {
      if(scores[j] != 0) {
        addLog(logPlayerNameFun(players[j]) + ' gets ' + scores[j] + ' VP from ' + getCultName(i) + ' cult');
        players[j].vp += scores[j];
        players[j].vp_cult[i] += scores[j];
      }
    }
  }

  //network
  var scores = getNetworkEndScores();
  addLog('');
  for(var j = 0; j < scores.length; j++) {
      if(scores[j][0] != 0) {
      addLog(logPlayerNameFun(players[j]) + ' gets ' + scores[j][0] + ' VP from network size ' + scores[j][1]);
      players[j].vp += scores[j][0];
      players[j].vp_network += scores[j][0];
    }
  }

  //resources
  scores = getResourceEndScores();
  addLog('');
  for(var i = 0; i < players.length; i++) {
    addLog(logPlayerNameFun(players[i]) + ' gets ' + scores[i] + ' VP from resources');
    players[i].vp += scores[i];
    players[i].vp_resources += scores[i];
  }

  //log final scores
  addLog('');
  addLog(logUpsideDown ? 'FINAL SCORES ^' : 'FINAL SCORES');
  for(var i = 0; i < players.length; i++) {
    addLog(logPlayerNameFun(players[i]) + ': ' + players[i].vp);
  }
}


State.prototype.nextState = function() {
  if(this.reset) {
    if(this.type != S_PRE) return; //you must call beginGame() yourself later to restart it
    this.reset = false;
  }

  this.currentStateDone = false;
  if(this.type == S_PRE) {
    //Nothing to do here. executeState will do it.
  }
  else if(this.type == S_INIT_FACTION) {
    this.currentPlayer = wrap(this.currentPlayer + 1, 0, players.length);
    if(players[this.currentPlayer].faction != F_NONE /*this means we went fully around*/) {
      createColorToPlayerMap();
      this.currentPlayer = this.startPlayer - 1;
      nextState(S_INIT_DWELLING); //done with current state
      return;
    }
  }
  else if(this.type == S_INIT_DWELLING) {
    //tiers:
    //0: busy placing first dwellings.
    //1: all except chaos have 1 dwelling.
    //2: all except chaos have 2 dwellings.
    //3: nomads have 3th dwelling
    //4: chaos magicians have dwelling. Everything done.
    var tier = 4;
    for(var i = 0; i < players.length; i++) {
      var player = players[i];
      var done = getInitialDwellingsDone(player);
      if(tier >= 1 && player.faction != F_CHAOS && done < 1) { tier = 0; break; }
      if(tier >= 2 && player.faction != F_CHAOS && done < 2) tier = 1;
      if(tier >= 3 && player.faction == F_NOMADS && done < 3) tier = 2;
      if(tier >= 4 && player.faction == F_CHAOS && done == 0) tier = 3;
    }

    if(tier == 4) {
      calculateTownClusters();
      this.currentPlayer = this.startPlayer; //so that when pre-decrementing, the last player chooses the bonus tile first
      nextState(S_INIT_BONUS); //TODO: chaos magician 1 dwelling, nomads 3 dwellings
      return;
    } else {
      if(tier == 0) {
        this.currentPlayer = wrap(this.currentPlayer + 1, 0, players.length);
        if(players[this.currentPlayer].faction == F_CHAOS) this.currentPlayer = wrap(this.currentPlayer + 1, 0, players.length);
      }
      else if(tier == 1) {
        for(var i = 0; i < players.length; i++) {
          var j = wrap(this.startPlayer - 1 - i, 0, players.length);
          if(players[j].faction != F_CHAOS && getInitialDwellingsDone(players[j]) < 2) { this.currentPlayer = j; break; }
        }
      }
      else if(tier == 2) {
        for(var i = 0; i < players.length; i++) {
          if(players[i].faction == F_NOMADS) { this.currentPlayer = i; break; }
        }
      }
      else if(tier == 3) {
        for(var i = 0; i < players.length; i++) {
          if(players[i].faction == F_CHAOS) { this.currentPlayer = i; break; }
        }
      }
    }
  }
  else if(this.type == S_INIT_BONUS) {
    this.currentPlayer = wrap(this.currentPlayer - 1, 0, players.length);
    if(players[this.currentPlayer].bonustile != T_NONE) {
      startNewRound();
      nextState(S_ACTION);
      return;
    }
  }
  else if(this.type == S_ACTION) {
    var passcount = 0;
    var firstpass = -1;
    for(var i = 0; i < players.length; i++) {
      if(players[i].passed) {
        passcount++;
        firstpass = i;
      }
    }

    if(passcount == players.length) {
      this.currentPlayer = this.startPlayer - 1; //so that when pre-incrementing, start player begins
      this.rounddigsdone = 0;
      if(this.round == 6) {
        addEndGameScore();
        nextState(S_GAME_OVER);
      } else {
        nextState(S_ROUND_END);
      }
      return;
    }
    if(passcount == 1) {
      this.startPlayer = firstpass;
    }

    while(true) {
      this.currentPlayer++;
      if(this.currentPlayer >= players.length) this.currentPlayer = 0;
      if(!players[this.currentPlayer].passed) break;
    }
  }
  else if(this.type == S_LEECH) {
    this.leechj++;
    if(this.leechi < this.leecharray.length && this.leechj >= this.leecharray[this.leechi].length) {
      // leeching done. Reset state and handle cultists.
      var cultists = players[this.currentPlayer] && players[this.currentPlayer].faction == F_CULTISTS;
      var taken = this.leechtaken > 0;
      this.leechtaken = 0;
      this.leechj = 0;
      this.leechi++;
      if(cultists) {
        var player = players[this.currentPlayer];
        if(taken) {
          setHelp('player ' + player.name + ' choose cultists track');
          nextState(S_CULTISTS);
          return;
        } else {
          if(state.newcultistsrule) {
            addPower(player, 1);
            addLog(logPlayerNameFun(player) + ' receives one extra pw because everyone declined the cultists');
          }
        }
      }
    }
    if(this.leechi >= this.leecharray.length) {
      nextState(S_ACTION);
      return;
    }
  }
  else if(this.type == S_CULTISTS) {
    //Nothing to do here. executeState will do it.
  }
  else if(this.type == S_ROUND_END) {
    var num = 0;
    for(var i = 0; i < players.length; i++) {
      var j = wrap(this.startPlayer + this.rounddigsdone, 0, players.length);
      this.rounddigsdone++;
      if(this.rounddigsdone > players.length) break;
      var digs = getRoundBonusDigs(players[j], this.round);
      if(digs > 0) {
        num = digs;
        break;
      }
    }
    if(num == 0) {
      startNewRound();
      nextState(S_ACTION);
      return;
    }
  }
  else if(this.type == S_GAME_OVER) {
    //Nothing to do here. executeState will do it.
  }

  this.executeState();
};


//Actually executes the current state after choosing right player, possible transitions other next states, etc...
State.prototype.executeState = function() {
  if(this.type == S_PRE) {
    renderPreScreen(200, 300, startGameButtonFun, startPresetGameButtonFun, startBeginnerGameButtonFun, startObserveGameButtonFun, startDebugGameButtonFun);
  }
  else if(this.type == S_INIT_FACTION) {
    setHelp('player ' + players[this.currentPlayer].name + ' choose faction');
    players[this.currentPlayer].actor.chooseFaction(this.currentPlayer, factionDoCallback);
  }
  else if(this.type == S_INIT_DWELLING) {
    setHelp('player ' + players[this.currentPlayer].name + ' place initial dwelling');
    players[this.currentPlayer].actor.chooseInitialDwelling(this.currentPlayer, initialDwellingDoCallback);
  }
  else if(this.type == S_INIT_BONUS) {
    setHelp('player ' + players[this.currentPlayer].name + ' choose bonus tile');
    players[this.currentPlayer].actor.chooseInitialBonusTile(this.currentPlayer, initialBonusTileDoCallback);
  }
  else if(this.type == S_ACTION) {
    var player = players[this.currentPlayer];
    setHelp('player ' + player.name + ' action');
    actionEl.innerHTML = '';
    if(this.currentPlayer == 0) popupElement.innerHTML = ''; //sometimes the popupelement is not correctly cleared after the leech yes/no menu. Take care of it here. TODO: investigate why and fix this in a better way. The button does clear it, has it something to do with timeout?
    player.actor.doAction(this.currentPlayer, actionDoCallback);
  }
  else if(this.type == S_LEECH) {
    var leech = this.leecharray[this.leechi][this.leechj];
    setHelp('player ' + players[leech[0]].name + ' leech decision');
    var amount = actualLeechAmount(players[leech[0]], leech[1]);
    if(amount > 0) players[leech[0]].actor.leechPower(leech[0], this.currentPlayer, leech[2], leech[3], amount, amount - 1, this.round, this.leechtaken, this.leecharray[this.leechi].length - this.leechj - 1, bind(leechCallback, amount));
    else nextState(S_LEECH, true); //skip 0 power leech
  }
  else if(this.type == S_CULTISTS) {
    players[this.currentPlayer].actor.chooseCultistTrack(this.currentPlayer, cultistsCallback);
  }
  else if(this.type == S_ROUND_END) {
    var j = wrap(this.startPlayer + this.rounddigsdone - 1, 0, players.length);
    var digs = getRoundBonusDigs(players[j], this.round);
    players[j].actor.doRoundBonusSpade(j, digs, roundDigCallback);
  }
  else if(this.type == S_GAME_OVER) {
    popupElement.innerHTML = '';
    setHelp('');
    drawMap();
    drawHud();
  }
}

State.prototype.doReset = function() {
  this.reset = true;
}
