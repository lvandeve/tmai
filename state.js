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

//The game state machine


//Callback state enum. For debugging only.
//Each state goes through the progression executeActor -> (callback) -> transitionState -> gameLoopNonBlocking --> ...
//This shows in which stage it is, for debuggin.
CS_NONE = 0;
CS_EXECUTE = 1;
CS_ACTOR = 2;
CS_CALLBACK = 3;
CS_TRANSITION = 4;
CS_GAMELOOP = 5;

//This is just there for debugging, has no actually function.
function getCallbackStateName(state) {
  switch(state) {
    case CS_NONE: return 'none';
    case CS_EXECUTE: return 'execute';
    case CS_ACTOR: return 'actor';
    case CS_CALLBACK: return 'callback';
    case CS_TRANSITION: return 'transition';
    case CS_GAMELOOP: return 'gameloop';
  }
  return 'unknown';
}

var callbackState = CS_NONE;
// for running in JS console
function getCallBackStateDebugString() {
  return 'round: ' + state.round +
         ', player: ' + state.currentPlayer +
         ', leechi: ' + state.leechi +
         ', leecharray: ' + encodeNestedArray(state.leecharray) +
         ', state type: ' + getGameStateCodeName(state.type) +
         ', next_type: ' + getGameStateCodeName(state.next_type) +
         ', callback state: ' + getCallbackStateName(callbackState);
}

//Constructor
var State = function() {
  this.type = S_PRE;
  this.typestack = []; //TODO: also support different currentPlayer and other vars on the stack. TODO: replace everything with stack.
  this.next_type = S_NONE;
  this.round = 0; //the round for actions. 0 = pre-rounds, 1-6 = game rounds.
  this.startPlayer = 0;
  this.currentPlayer = 0;
  this.showResourcesPlayer = 0;

  this.numHandledForState = 0; //counter for bookkeeping for how much of something already done, e.g. to know when each player chose a faction

  this.leecharray = []; //2D leech array described at function getLeechEffect (array of [playerIndex, amount])
  this.leechi = 0; //index in leech array
  this.leechtaken = 0;

  // game rule options. TODO: newcultistsrule etc... belongs more in the Game class than here. Move it?
  this.newcultistsrule = true; // getting 1 power if nobody leeches from them
  this.towntilepromo2013 = true; // new town tiles
  this.bonustilepromo2013 = true; // new bonus tile
  this.fireice = true; // Fire & Ice expansion
};

function logPlayerNameFun(player) {
  return logColored ? getFullNameColored(player) : getFullName(player);
}

var state = new State();

function getCurrentPlayer() {
  return game.players[state.currentPlayer];
}


var nextButtonFun = null; //for shortcut
var fastButtonFun = null; //for shortcut
var fastestButtonFun = null; //for shortcut

var fastMode = false;
var fastestMode = false;
var nscount = 0;
var nsfuncount = 0;
var showingNextButtonPanel = false;
// When this function is called, everything must be set up and ready for the next state (which will now become the current state) - this may mean initNewStateType must be called before it
// This function may show a "next" button to the player or handle UI in other ways, that is, if this function did nothing, the game would just keep going on with no possible interaction
// progress = whether the state change progresses the game (= should pause for the player)
function gameLoopNonBlocking(type, progress) {
  callbackState = CS_GAMELOOP;
  state.type = type; //set that here so that the state in savegame is correct when using the "save" button now.

  var nsfun = function(type) {
    var noActorCallback = function() {
      popupElement.innerHTML = ''; // Remove any human UI that remained
      state.transitionState();
      gameLoopNonBlocking(state.type, true);
    };
    var executeResultCallback = function(player, result) {
      displayLog();
      var error = state.executeResult(player, result);
      if(error == '') noActorCallback();
      return error;
    };
    displayLog();
    nextButtonFun = null;
    fastButtonFun = null;
    showingNextButtonPanel = false;
    state.executeActor(executeResultCallback, noActorCallback);
    if(game.players.length > 0) {
      drawHud();
      drawMap();
    }
  };

  // Do not show "next" button if fast mode, or if not a progression state
  var fast = !progress || fastMode || type == S_PRE;

  if(fast) {
    // Turn off fastMode again when it was the action of the current player again.
    if(getCurrentPlayer() && getCurrentPlayer().human && !fastestMode && state.type != S_LEECH) fastMode = false;

    // First let previous player's functions all finish
    // Without this, some stuff breaks, due to actor functions still doing some things after calling callbacks (mostly the human actor though)
    // This makes it slower, but in fact nicer, it makes the screen being redrawn between every action of every AI player, which gives a nice progressive update animation.
    // A possible speedup (losing the animation effect) is to only do the setTimeout if the current player is the human player
    window.setTimeout(bind(nsfun, type), 0);
  } else {
    // Slow (that is, requiring user interaction)
    window.setTimeout(function() {
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
      displayLog();
      drawHud();
      drawMap();
    }, 0);
  }
}

function gameLoopBlocking(isFinishedFun) {
  state.initNewStateType(state.type);
  for(;;) {
    var callbackcalled = false;
    var executeResultCallback = function(player, result) {
      var error = state.executeResult(player, result);
      state.transitionState();
      callbackcalled = true;
      return error;
    };
    var noActorCallback = function() {
      callbackcalled = true;
      state.transitionState();
    };

    state.executeActor(executeResultCallback, noActorCallback);

    if(!callbackcalled && state.type != S_GAME_OVER && !isFinishedFun()) {
      console.log('error: callback must be called in blocking gameloop. ' + getCallBackStateDebugString());
      addLog('error: callback must be called in blocking gameloop');
      return;
    }

    if(isFinishedFun()) return;
  }
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
  for(var i = C_F; i <= C_A; i++) {
    addLog('');
    var scores = getCultEndScores(i);
    for(var j = 0; j < scores.length; j++) {
      if(scores[j] != 0) {
        addLog(logPlayerNameFun(game.players[j]) + ' gets ' + scores[j] + ' VP from ' + getCultName(i) + ' cult');
        game.players[j].addVP(scores[j], 'cult', ['fire', 'water', 'earth', 'air'][i - C_F]);
      }
    }
  }

  //network
  var networkscores = getNetworkEndScores();
  addLog('');
  for(var j = 0; j < networkscores.length; j++) {
    if(networkscores[j][0] != 0) {
      addLog(logPlayerNameFun(game.players[j]) + ' gets ' + networkscores[j][0] + ' VP from network ' + networkscores[j][1]);
      game.players[j].addVP(networkscores[j][0], 'network', 'network');
    }
  }

  //expansion final scoring
  var finalscores = getFinalScores();
  addLog('');
  for(var j = 0; j < finalscores.length; j++) {
    if(finalscores[j][0] != 0) {
      addLog(logPlayerNameFun(game.players[j]) + ' gets ' + finalscores[j][0] + ' VP from ' + finalScoringCodeNames[game.finalscoring] + ' ' + finalscores[j][1]);
      game.players[j].addVP(finalscores[j][0], 'final', 'final');
    }
  }

  //resources
  var scores = getResourceEndScores();
  addLog('');
  for(var i = 0; i < game.players.length; i++) {
    addLog(logPlayerNameFun(game.players[i]) + ' gets ' + scores[i] + ' VP from resources');
    game.players[i].addVP(scores[i], 'resources', 'resources');
  }

  //log final scores
  addLog('');
  addLog(logUpsideDown ? 'FINAL SCORES ^' : 'FINAL SCORES');
  for(var i = 0; i < game.players.length; i++) {
    addLog(logPlayerNameFun(game.players[i]) + ': ' + game.players[i].vp);
  }
}

function wrapPlayer(i) {
  return wrap(i, 0, game.players.length);
}


State.prototype.selectNextActionPlayer_ = function() {
  var count = 0;
  while(true) {
    if(count > game.players.length) throw new Error('this function should not be called if everyone passed');
    this.currentPlayer = wrapPlayer(this.currentPlayer + 1);
    if(!game.players[this.currentPlayer].passed) break;
    count++;
  }
};

//returns false if all dwellings are placed
State.prototype.selectNextInitialDwellingPlayer_ = function() {
  //tiers:
  //0: busy placing first dwellings.
  //1: all except chaos have 1 dwelling.
  //2: all except chaos have 2 dwellings.
  //3: nomads have 3th dwelling
  //4: chaos magicians have dwelling. Everything done.
  var tier = 4;
  for(var i = 0; i < game.players.length; i++) {
    var player = game.players[i];
    var done = getInitialDwellingsDone(player);
    if(tier >= 1 && player.faction != F_CHAOS && done < 1) { tier = 0; break; }
    if(tier >= 2 && player.faction != F_CHAOS && done < 2) tier = 1;
    if(tier >= 3 && player.faction == F_NOMADS && done < 3) tier = 2;
    if(tier >= 4 && player.faction == F_CHAOS && done == 0) tier = 3;
  }
  if(tier == 4) {
    return false;
  } else {
    if(tier == 0) {
      this.currentPlayer = wrapPlayer(this.currentPlayer + 1);
      if(game.players[this.currentPlayer].faction == F_CHAOS) this.currentPlayer = wrapPlayer(this.currentPlayer + 1);
    }
    else if(tier == 1) {
      for(var i = 0; i < game.players.length; i++) {
        var j = wrapPlayer(this.startPlayer - 1 - i);
        if(game.players[j].faction != F_CHAOS && getInitialDwellingsDone(game.players[j]) < 2) { this.currentPlayer = j; break; }
      }
    }
    else if(tier == 2) {
      for(var i = 0; i < game.players.length; i++) {
        if(game.players[i].faction == F_NOMADS) { this.currentPlayer = i; break; }
      }
    }
    else if(tier == 3) {
      for(var i = 0; i < game.players.length; i++) {
        if(game.players[i].faction == F_CHAOS) { this.currentPlayer = i; break; }
      }
    }
  }
  return true;
};

// switches to new kind of state type (chooses correct starting player for it, returns the given type so that you can assign it)
// Set current player to start player for that state type, if relevant
// Only call when starting a next phase of the game (e.g. placing initial dwellings, or starting a new round), but not when switching from power leeching back to actions in current round.
// In other words, only call when the concept of a starting player for this kind of phase is relevant.
State.prototype.initNewStateType = function(type) {
  if(type == S_PRE) {
  }
  else if(type == S_INIT_FACTION) {
    recalculateColorMaps(); // there may already be colors in it if preset factions were set
    this.currentPlayer = this.startPlayer;
    this.numHandledForState = 0;
  }
  else if(type == S_INIT_FACTION_COLOR) {
  }
  else if(type == S_INIT_FAVOR) {
  }
  else if(type == S_INIT_AUX_COLOR) {
    this.currentPlayer = this.startPlayer;
    this.numHandledForState = 0;
  }
  else if(type == S_INIT_DWELLING) {
    this.currentPlayer = wrapPlayer(this.startPlayer - 1); // so that selectNextInitialDwellingPlayer_ makes it correct
    this.selectNextInitialDwellingPlayer_();
  }
  else if(type == S_INIT_BONUS) {
    this.currentPlayer = wrapPlayer(this.startPlayer - 1); //last player chooses bonus tile first
  }
  else if(type == S_ACTION) {
    this.currentPlayer = this.startPlayer;
  }
  else if(type == S_LEECH) {
  }
  else if(type == S_CULT) {
  }
  else if(type == S_CULTISTS) {
  }
  else if(type == S_ROUND_END_DIG) {
    this.currentPlayer = this.startPlayer;
  }
  else if(type == S_GAME_OVER) {
    //Nothing to do here.
  }
  return type;
};

// Go from the current state to the next state (which may be the same, or different, type)
// Some code seems duplicated here (e.g. selectNextInitialDwellingPlayer_ called in two places), but that is
// because every combination of from- and to- state may require its own code path.
State.prototype.transitionState = function() {

  // This if is specifically for having free cult income from spades at the end of the round (for acolytes)
  if((this.type == S_ROUND_END_DIG || this.type == S_CULT) && game.players[this.currentPlayer].freecult > 0) {
    // TODO: support this with state stack instead
    if(this.type != S_CULT) this.typestack.push(this.type);
    this.type = S_CULT;
    return;
  }

  if(this.typestack.length > 0) {
    this.type = this.typestack.pop();
  }

  callbackState = CS_TRANSITION;
  var next_state = this.next_type == S_NONE ? this.type : this.next_type;

  if(this.type == S_PRE) {
    next_state = this.initNewStateType(S_INIT_FACTION);
  }
  else if(this.type == S_INIT_FACTION) {
    next_state = S_INIT_FACTION_COLOR;
  }
  else if(this.type == S_INIT_FACTION_COLOR) {
    next_state = S_INIT_FAVOR;
  }
  else if(this.type == S_INIT_FAVOR) {
    var nextplayer = wrapPlayer(this.currentPlayer + 1);
    if(this.numHandledForState >= game.players.length /*this means we went fully around*/) {
      recalculateColorMaps();
      next_state = this.initNewStateType(S_INIT_AUX_COLOR);
    } else {
      next_state = S_INIT_FACTION;
      this.currentPlayer = nextplayer;
    }
  }
  else if(this.type == S_INIT_AUX_COLOR) {
    var nextplayer = wrapPlayer(this.currentPlayer + 1);
    if(this.numHandledForState >= game.players.length /*this means we went fully around*/) {
      createAuxColorToPlayerMap();
      next_state = this.initNewStateType(S_INIT_DWELLING);
    } else {
      this.currentPlayer = nextplayer;
    }
  }
  else if(this.type == S_INIT_DWELLING) {
    if(!this.selectNextInitialDwellingPlayer_()) {
      calculateTownClusters();
      next_state = this.initNewStateType(S_INIT_BONUS);
    }
  }
  else if(this.type == S_INIT_BONUS) {
    var nextplayer = wrapPlayer(this.currentPlayer - 1);
    if(game.players[nextplayer].bonustile != T_NONE) {
      startNewRound();
      next_state = this.initNewStateType(S_ACTION);
    } else {
      this.currentPlayer = nextplayer;
    }
  }
  else if(this.type == S_ACTION) {
    var passcount = 0;
    var firstpass = -1;
    for(var i = 0; i < game.players.length; i++) {
      if(game.players[i].passed) {
        passcount++;
        firstpass = i;
      }
    }
    if(passcount == 1) {
      this.startPlayer = firstpass;
    }
    if(passcount == game.players.length) {
      this.currentPlayer = this.startPlayer;
      if(this.round == 6 && this.next_type == S_ACTION) {
        addEndGameScore();
        next_state = S_GAME_OVER;
      } else {
        next_state = this.initNewStateType(S_ROUND_END_DIG);
      }
    } else {
      if(this.next_type == S_ACTION) {
        this.selectNextActionPlayer_();
      }
    }
  }
  else if(this.type == S_LEECH) {
    this.leechi++;
    if(this.leechi >= this.leecharray.length) {
      // leeching done. Reset state and handle cultists.
      var player = game.players[this.currentPlayer];
      var cultists = player && player.faction == F_CULTISTS;
      var taken = this.leechtaken > 0;

      if(cultists && taken) {
        setHelp('player ' + player.name + ' choose cultists track');
        next_state = S_CULTISTS;
      } else {
        // check if players actually declined. If they were full on power, it does not count as decline
        var declined = false;
        if(!taken) {
          for(var i = 0; i < this.leecharray.length; i++) {
            var leecher = game.players[this.leecharray[i][0]];
            if(leecher.pw0 > 0 || leecher.pw1 > 0) {
              declined = true;
              break;
            }
          }
        }
        if(taken || declined) {
          player.getFaction().getGaveLeechIncome(player, taken);
          // TODO: add log if other faction gave resources too
          if(cultists && declined) addLog(logPlayerNameFun(player) + ' receives one extra pw because everyone declined the cultists' + getGreyedResourcesLogString(player));
        }
        next_state = S_ACTION;
      }
      this.leechtaken = 0;
      this.leechi = 0;
      this.leecharray = [];

      if(next_state == S_ACTION) this.selectNextActionPlayer_();
    }
  }
  else if(this.type == S_CULTISTS) {
    // Cultists leeching is a one time state that goes to next action immediately after.
    next_state = S_ACTION;
    this.selectNextActionPlayer_();
  }
  else if(this.type == S_CULT) {
    // Nothing to do, should go to previous state with stack
  }
  else if(this.type == S_ROUND_END_DIG) {
    for(;;) {
      this.currentPlayer = wrapPlayer(this.currentPlayer + 1);
      if(this.currentPlayer == this.startPlayer) {
        startNewRound();
        next_state = this.initNewStateType(S_ACTION);
        break;
      }
      var digs = getRoundBonusDigs(game.players[this.currentPlayer], this.round);
      if(digs > 0) break;
    }

  }
  else if(this.type == S_GAME_OVER) {
    //Nothing to do here.
  }

  //gameLoopNonBlocking(next_state, true);
  this.type = next_state;
};


//Actually executes the current state after choosing right player, possible transitions other next states, etc...
//the callback and the transitionIfNoActorCallback must do at least transitionState in them. noActorCallback is used if no actor handles the state with a callback to let it transition anyway.
State.prototype.executeActor = function(callback, transitionIfNoActorCallback) {
  state.showResourcesPlayer = state.currentPlayer;
  state.next_type = S_NONE;
  callbackState = CS_EXECUTE;
  if(this.type == S_PRE) {
    renderPreScreen(200, 300, startGameButtonFun, startRandomGameButtonFun, startBeginnerGameButtonFun, startQuickGameButtonFun);
    //transitionIfNoActorCallback();
  }
  else if(this.type == S_INIT_FACTION) {
    this.numHandledForState++;
    var player = game.players[this.currentPlayer];
    if(player.faction == F_NONE) {
      setHelp('player ' + player.name + ' choose faction');
      callbackState = CS_ACTOR;
      player.actor.chooseFaction(this.currentPlayer, callback);
    } else {
      // The player already has a faction, this happens when a "preset" game type was chosen were factions were picked or random
      trySetFaction(player, player.getFaction()); //inits it (such as setting player.color)
      initPlayerFaction(player);
      addLog(logPlayerNameFun(player) + ' preassigned faction: ' + getFactionCodeName(player.getFaction()) + getGreyedResourcesLogString(player));
      transitionIfNoActorCallback();
    }
  }
  else if(this.type == S_INIT_FACTION_COLOR) {
    var player = game.players[this.currentPlayer];
    if(player.color == X || player.color == W) {
      setHelp('player ' + player.name + ' choose faction color');
      callbackState = CS_ACTOR;
      player.actor.chooseAuxColor(this.currentPlayer, callback);
    } else {
      transitionIfNoActorCallback();
    }
  }
  else if(this.type == S_INIT_FAVOR) {
    var player = game.players[this.currentPlayer];
    if(player.getFaction().hasInitialFavorTile()) {
      setHelp('player ' + player.name + ' choose initial favor tile');
      callbackState = CS_ACTOR;
      player.actor.chooseInitialFavorTile(this.currentPlayer, callback);
    } else {
      transitionIfNoActorCallback();
    }
  }
  else if(this.type == S_INIT_AUX_COLOR) {
    this.numHandledForState++;
    var player = game.players[this.currentPlayer];
    if(player.color == O) {
      setHelp('player ' + player.name + ' choose faction color');
      callbackState = CS_ACTOR;
      player.actor.chooseAuxColor(this.currentPlayer, callback);
    } else {
      if(player.auxcolor == N) player.auxcolor = player.color;
      transitionIfNoActorCallback();
    }
  }
  else if(this.type == S_INIT_DWELLING) {
    setHelp('player ' + game.players[this.currentPlayer].name + ' place initial dwelling');
    callbackState = CS_ACTOR;
    game.players[this.currentPlayer].actor.chooseInitialDwelling(this.currentPlayer, callback);
  }
  else if(this.type == S_INIT_BONUS) {
    setHelp('player ' + game.players[this.currentPlayer].name + ' choose bonus tile');
    callbackState = CS_ACTOR;
    game.players[this.currentPlayer].actor.chooseInitialBonusTile(this.currentPlayer, callback);
  }
  else if(this.type == S_ACTION) {
    var player = game.players[this.currentPlayer];
    setHelp('player ' + player.name + ' action');
    actionEl.innerHTML = '';
    callbackState = CS_ACTOR;
    player.actor.doAction(this.currentPlayer, callback);
  }
  else if(this.type == S_LEECH) {
    var leech = this.leecharray[this.leechi];
    setHelp('player ' + game.players[leech[0]].name + ' leech decision');
    var amount = actualLeechAmount(game.players[leech[0]], leech[1]);
    if(amount > 0) {
      callbackState = CS_ACTOR;
      state.showResourcesPlayer = leech[0];
      game.players[leech[0]].actor.leechPower(leech[0], this.currentPlayer, amount, amount - 1, this.round, this.leechtaken, this.leecharray.length - this.leechi - 1, callback);
    } else {
      addLog(logPlayerNameFun(game.players[leech[0]]) + ' could not leech, power already full' + getGreyedResourcesLogString(game.players[leech[0]]));
      transitionIfNoActorCallback();
    }
  }
  else if(this.type == S_CULTISTS) {
    callbackState = CS_ACTOR;
    game.players[this.currentPlayer].actor.chooseCultistTrack(this.currentPlayer, callback);
  }
  else if(this.type == S_CULT) {
    callbackState = CS_ACTOR;
    game.players[this.currentPlayer].actor.chooseCultistTrack(this.currentPlayer, callback);
  }
  else if(this.type == S_ROUND_END_DIG) {
    var j = this.currentPlayer;
    var player = game.players[j];
    var digs = getRoundBonusDigs(player, this.round);
    if(digs > 0) {
      var res = player.getActionIncome(A_SPADE);
      if(res[R_SPADE] > 0) {
        player.spades = digs; // initPlayerTemporaryTurnState at beginning of every turn action attempt will set it back to 0, so no need to decrease it here later in the callback
        callbackState = CS_ACTOR;
        player.actor.doRoundBonusSpade(j, callback);
      } else {
        addIncome(player, mulIncome(res, digs));
        transitionIfNoActorCallback();
      }
    } else {
      transitionIfNoActorCallback();
    }
  }
  else if(this.type == S_GAME_OVER) {
    setHelp('');
    drawMap();
    drawHud();
  }
};

function getGreyedResourcesLogString(player) {
  return ' <span style="color:#bbb">[' + getPlayerResourcesString(player, false) +
      ', ' + player.cult[0] + '/' + player.cult[1] + '/' + player.cult[2] + '/' + player.cult[3] + ' cult' +
      ', ' + player.vp + 'vp]</span>'
}

function getCultDifferenceString(before, after) {
  var result = '';
  for(var i = C_F; i <= C_A; i++) {
    var b = before[i - C_F];
    var a = after[i - C_F];
    if(b != a) {
      if(result.length > 0) result += ' ';
      var diff = a - b;
      if(diff > 0) result += '+';
      if(diff != 1) result += diff;
      result += getCultName(i);
    }
  }
  return result;
}

//Actually executes the current state after choosing right player, possible transitions other next states, etc...
State.prototype.executeResult = function(playerIndex, result) {
  var player = game.players[playerIndex];
  callbackState = CS_CALLBACK;
  if(this.type == S_PRE) {
  }
  else if(this.type == S_INIT_FACTION) {
    var faction = result;
    var error = trySetFaction(player, faction);
    if(error == '') {
      initPlayerFaction(player);
      addLog(logPlayerNameFun(player) + ' chose faction: ' + getFactionCodeName(faction) + getGreyedResourcesLogString(player));
    }
    else addLog(logPlayerNameFun(player) + ' chose illegal faction: ' + getFactionCodeName(faction));
    recalculateColorMaps();
    return error;
  }
  else if(this.type == S_INIT_FACTION_COLOR) {
    var color = result;
    var error = '';
    // TODO: extract this to function in rules.js
    if(!(color >= CIRCLE_BEGIN && color <= CIRCLE_END)) {
      error = 'invalid color';
    } else if(colorToPlayerMap[color] != undefined) {
      error = 'color already chosen';
    } else {
      if(player.color == X) player.woodcolor = player.auxcolor = color;
      else player.auxcolor = color;
      recalculateColorMaps();
    }
    if(error == '') {
      addLog(logPlayerNameFun(player) + ' chose faction color: ' + getColorName(color) + getGreyedResourcesLogString(player));
    }
    else addLog(logPlayerNameFun(player) + ' chose illegal faction color: ' + getColorName(color));
    return error;
  }
  else if(this.type == S_INIT_FAVOR) {
    var tile = result;
    var error = giveFavorTile(player, tile);
    if(error == '') addLog(logPlayerNameFun(player) + ' took favor tile ' + getTileCodeName(tile) + getGreyedResourcesLogString(player));
    else addLog(logPlayerNameFun(player) + ' attempted illegal favor tile ' + tile + '. Error: ' + error);
    return error;
  }
  else if(this.type == S_INIT_AUX_COLOR) {
    var color = result;
    var error = '';
    // TODO: extract this to function in rules.js
    if(!(color >= CIRCLE_BEGIN && color <= CIRCLE_END)) {
      error = 'invalid color';
    } else if(colorToPlayerMap[color] != undefined) {
      error = 'color already chosen';
    } else {
      player.auxcolor = color;
      createAuxColorToPlayerMap();
    }
    if(error == '') {
      addLog(logPlayerNameFun(player) + ' chose faction color: ' + getColorName(color) + getGreyedResourcesLogString(player));
    }
    else addLog(logPlayerNameFun(player) + ' chose illegal faction color: ' + getColorName(color));
    return error;
  }
  else if(this.type == S_INIT_DWELLING) {
    var x = result[0];
    var y = result[1];
    var error = placeInitialDwelling(player, x, y);
    if(error == '') addLog(logPlayerNameFun(player) + ' placed initial dwelling at ' + printCo(x, y) + getGreyedResourcesLogString(player));
    else addLog(logPlayerNameFun(player) + ' attempted illegal initial dwelling ' + printCo(x, y) + '. Error: ' + error);
    return error;
  }
  else if(this.type == S_INIT_BONUS) {
    var tile = result;
    var error = giveBonusTile(player, tile);
    if(error == '') addLog(logPlayerNameFun(player) + ' took bonus tile ' + getTileCodeName(tile) + getGreyedResourcesLogString(player));
    else addLog(logPlayerNameFun(player) + ' attempted illegal bonus tile ' + tile + '. Error: ' + error);
    return error;
  }
  else if(this.type == S_ACTION) {
    var actions = result;
    var resbefore = [player.c, player.w, player.p, player.pw2, player.vp];
    var cultbefore = [player.cult[0], player.cult[1], player.cult[2], player.cult[3]];
    var tokensbefore = player.pw0 + player.pw1 + player.pw2;
    var error = tryActions(player, actions);
    var resafter = [player.c, player.w, player.p, player.pw2, player.vp];
    var cultafter = [player.cult[0], player.cult[1], player.cult[2], player.cult[3]];
    var tokensafter = player.pw0 + player.pw1 + player.pw2;
    subtractIncome(resafter, resbefore);
    var resstring = incomeToStringWithPluses(resafter);
    var cultstring = getCultDifferenceString(cultbefore, cultafter);
    var diffstring = resstring + (resstring.length > 0 && cultstring.length > 0 ? ' ' : '') + (tokensbefore == tokensafter ? '' : ' burnt:' + (tokensbefore - tokensafter)) + cultstring;
    if(diffstring.length > 0) diffstring = ' [' + diffstring + ']';
    if(error == '') addLog(logPlayerNameFun(player) + ' Action: <b>' + actionsToString(actions) + '</b>' + diffstring + getGreyedResourcesLogString(player));
    else addLog(logPlayerNameFun(player) + ' attempted illegal action: ' + actionsToString(actions) + ' Error: ' + error);

    if(error == '') {
      var leech = getLeechEffect(player.index, actions);
      if(leech.length > 0) {
        state.leecharray = leech;
        state.leechi = 0;
        state.leechtaken = 0;
        state.next_type = S_LEECH;
      } else {
        state.next_type = S_ACTION;
      }
    }
    return error;
  }
  else if(this.type == S_LEECH) {
    var leech = result;
    var amount = this.leecharray[this.leechi][1];
    if(leech) {
      leechPower(player, amount);
      addLog(logPlayerNameFun(player) + ' leeched ' + amount + ' from ' + logPlayerNameFun(getCurrentPlayer()) + getGreyedResourcesLogString(player));
      state.leechtaken++;
    } else {
      addLog(logPlayerNameFun(player) + ' declined to leech ' + amount + ' from ' + logPlayerNameFun(getCurrentPlayer()) + getGreyedResourcesLogString(player));
    }
  }
  else if(this.type == S_CULTISTS) {
    var cult = result;
    giveCult(player, cult, 1);
    addLog(logPlayerNameFun(player) + ' used cultists ability on ' + getCultName(cult) + getGreyedResourcesLogString(player));
  }
  else if(this.type == S_CULT) {
    var cult = result;
    giveCult(player, cult, 1);
    player.freecult--;
    addLog(logPlayerNameFun(player) + ' chose cult track ' + getCultName(cult) + getGreyedResourcesLogString(player));
  }
  else if(this.type == S_ROUND_END_DIG) {
    var digs = result;
    var error = canDoRoundBonusDigs(player, digs);
    if(error != '') {
      addLog(logPlayerNameFun(player) + ' attempted illegal round bonus dig at: ' + printCos(digs) + '. Error: ' + error);
      return error; //the error is ignored for humans, so that human player can click invalid tiles if no valid ones exist. TODO: throw errors instead and give UI to skip it instead
    }
    for(var i = 0; i < digs.length; i++) {
      error = tryRoundBonusDig(player, digs[i][0], digs[i][1], digs[i][2]);
      if(error == '') {
        addLog(logPlayerNameFun(player) + ' did round bonus dig at ' + printCo(digs[i][1], digs[i][2]) + getGreyedResourcesLogString(player));
      } else {
        addLog(logPlayerNameFun(player) + ' attempted illegal round bonus dig at: ' + printCos(digs) + '. Error: ' + error);
        return error;
      }
    }
    return error;
  }
  else if(this.type == S_GAME_OVER) {
  }

  return '';
};
