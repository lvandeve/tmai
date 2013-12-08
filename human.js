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

//Human controller and parts of the UI


var Human = function() {
};
inherit(Human, Actor);

//for the human player
var mapClickFun = null;
var tileClickFun = null;
var cultClickFun = null;

//enum for human action states. This is a sub-division of the main game-states for human UI only.
//By locking certain activities into certain states, ruining the game by overwriting the mapClickFun etc... with something different is prevented
var HS_MAIN = 1; //no state means you're choosing action sequence. Only here, the Execute button should be visible (if also gamestate is S_ACTION)
var HS_MAP = 2; //must click the map for something other than dig or normal build (e.g. upgrade, bridge endpoint, mermaids town tile, witches dwelling, ...)
var HS_DIG = 3; //must click the map for dig and/or build
var HS_CULT = 4; //must go on the cult track
var HS_BONUS_TILE = 5;
var HS_FAVOR_TILE = 6;
var HS_TOWN_TILE = 7;

var humanstate = HS_MAIN;

var undoGameStates = []; //remember game state from last action
var undoIndex = 0;

function humanStateBusy() {
  return mapClickFun != null || tileClickFun != null || cultClickFun != null;
}

function setHumanState(state, helptext, fun) {
  if(humanStateBusy()) {
    throw new Error('should not set callback if one is already active');
  }
  humanstate = state;
  if(helptext) setHelp(helptext);
  if(state == HS_MAP) mapClickFun = fun;
  else if(state == HS_DIG) mapClickFun = fun;
  else if(state == HS_BONUS_TILE || state == HS_FAVOR_TILE || state == HS_TOWN_TILE) tileClickFun = fun;
  else if(state == HS_CULT) cultClickFun = fun;
  drawHud();
}

var onClearHumanState = []; //e.g. for queueHumanState

function clearHumanState() {
  humanstate = HS_MAIN;
  clearHelp();
  mapClickFun = null;
  tileClickFun = null;
  cultClickFun = null;
  if(game.players.length > 0) drawHud();
  // notify the clearHumanState listeners and clear onClearHumanState.
  var temp = onClearHumanState;
  onClearHumanState = [];
  for(var i = 0; i < temp.length; i++) temp[i]();
}

//necessary for those cases where multiple happenings requiring human states are triggered at once
//e.g. when forming town while using multi-spade dig action, where you need to pick town tile, then continue digging
function queueHumanState(state, helptext, fun) {
  if(humanStateBusy()) {
    onClearHumanState.push(function() {
      setHumanState(state, helptext, fun);
    });
  }
  else setHumanState(state, helptext, fun);
}

var pactions = []; //your sequence of actions until you press "execute"

function prepareAction(action) {
  if(state.type != S_ACTION) {
    return; //not supposed to do actions while gamestate is in another state
  }

  var player = getCurrentPlayer();

  //automatically add tunneling/carpet if needed
  if(player.faction == F_FAKIRS || player.faction == F_DWARVES) {
    if(isBuildDwellingAction(action) || isTransformAction(action)) {
      var hastunnel = false;
      for(var i = 0; i < pactions.length; i++) {
        if(pactions[i].type == A_TUNNEL || pactions[i].type == A_CARPET) {
          hastunnel = true;
        }
      }
      if(!hastunnel && onlyReachableThroughFactionSpecial(player, action.co[0], action.co[1])) {
        var a = new Action(player.faction == F_DWARVES ? A_TUNNEL : A_CARPET);
        a.co = action.co;
        pactions.push(a);
      }
    }
  }

  pactions.push(action);

  if(player.faction == F_DARKLINGS && action.type == A_UPGRADE_SH) {
    //take the conversions into account
    var testres = testConvertSequence(player, pactions);
    //don't include converting 3pw into workers as well: the AI can extend this action sequence afterwards if it wants to do that.
    var num = Math.min(3, testres[1] - 4);
    num = Math.min(num, player.pp - testres[2]);
    for(var i = 0; i < num; i++) pactions.push(new Action(A_CONVERT_1W_1P));
  }


  actionEl.innerHTML = actionsToString(pactions);

  function tryPrepareAction(action) {
    actionEl.innerHTML = actionsToString(pactions);
    if(action.type == A_PASS && action.bontile == T_NONE && state.round != 6) {
      var fun = function(tile) {
        if(!isBonusTile(tile)) return;
        action.bontile = tile;
        clearHumanState();
        tryPrepareAction(action);
      };
      setHumanState(HS_BONUS_TILE, 'choose a bonus tile for passing', fun);
    }
    else if(action.favtiles.length < actionGivesFavorTile(player, action)) {
      setHelp('choose a favor tile', true);
      var fun = function(tile) {
        if(!isFavorTile(tile)) return;
        action.favtiles.push(tile);
        clearHumanState();
        tryPrepareAction(action);
      };
      setHumanState(HS_FAVOR_TILE, 'choose a favor tile', fun);
    }
    //town tiles MUST be checked after favor tiles! This because there is a favor tile that can turn the action into a town-creation action.
    else if(action.twtiles.length < actionCreatesTown(player, action, pactions)) {
      var fun = function(tile) {
        if(!isTownTile(tile)) return;
        action.twtiles.push(tile);
        updateWToPConversionAfterDarklingsSHTownTile(player, pactions);
        clearHumanState();
        tryPrepareAction(action);
      };
      setHumanState(HS_TOWN_TILE, 'that will form a town! choose a town tile', fun);
    }
    else if(action.type == A_UPGRADE_SH && player.faction == F_HALFLINGS) {
      letClickMapForHalflingsStrongholdDigs();
    }
  }

  tryPrepareAction(action);
}

function letClickMapForHalflingsStrongholdDigs() {
  digAndBuildFun(DBM_BUILD, 'click where to dig for halflings SH bonus')
}

function letClickMapForBridge(action) {
  var remaining = 2;
  var clickFun = function(x, y) {
    clearHumanState();
    remaining--;
    action.cos.push([x,y]);
    if(remaining == 0) {
      prepareAction(action);
    } else {
      setHumanState(HS_MAP, 'click bridge end point', clickFun);
    }
  };
  setHumanState(HS_MAP, 'click bridge start point', clickFun);
}

function isHandlingActionInput() {
  return state.type == S_ACTION && humanstate == HS_MAIN && getCurrentPlayer().human && !showingNextButtonPanel;
}

var executeButtonFun_ = null;

var executeButtonFun = function() {
  if(executeButtonFun_) executeButtonFun_();
};

var executeButtonClearFun_ = null;

var executeButtonClearFun = function() {
  if(executeButtonClearFun_) executeButtonClearFun_();
};

function saveUndoState(undoGameState) {
  if(undoIndex + 1 < undoGameStates.length) undoGameStates.length = undoIndex + 1; //lose the redo states
  if(undoGameStates.length > 100) undoGameStates = undoGameStates.splice(50, 1); //ensure it doesn't grow too extreme
  undoGameStates.push(undoGameState);
  undoIndex = undoGameStates.length - 1;
}

Human.prototype.doAction = function(playerIndex, callback) {
  executeButtonFun_ = function() {
    var undoGameState = saveGameState(game, state, logText)
    actionEl.innerHTML = '';
    var error = callback(playerIndex, pactions);
    pactions = [];
    if(error != '') {
      setHelp('Execute action error: ' + error);
    } else {
      executeButtonFun_ = null;
      executeButtonClearFun_ = null;
      saveUndoState(undoGameState);
    }
  };
  executeButtonClearFun_ = function() {
    pactions.pop();
    actionEl.innerHTML = actionsToString(pactions);
  };
};


Human.prototype.chooseInitialBonusTile = function(playerIndex, callback) {
  var fun = function(tile) {
    var error = callback(playerIndex, tile);
    if(error == '') clearHumanState();
    else setHelp('invalid bonus tile, please try again');
  }
  setHumanState(HS_BONUS_TILE, null, fun);
};

//returns true if successful, false if house could not be placed there
function humanPlaceInitialDwelling(x, y) {
  var player = getCurrentPlayer();
  if(getWorld(x, y) != player.color) return false;
  if(getBuilding(x, y)[0] != B_NONE) return false;
  if(player.b_d <= 0) return false;
  player.b_d--;
  setBuilding(x, y, B_D, player.color);
  //drawMap();
  //drawHud();
  return true;
}

Human.prototype.chooseInitialDwelling = function(playerIndex, callback) {
  var fun = function(x, y) {
    undoGameState = saveGameState(game, state, undefined);
    var error = callback(playerIndex, [x, y]);
    if(error == '') {
      clearHumanState();
      saveUndoState(undoGameState);
    }
    else setHelp('could not place initial dwelling: ' + error + ' - Please try again');
  };
  setHumanState(HS_MAP, null, fun);
};

Human.prototype.chooseFaction = function(playerIndex, callback) {
  var buttonClickFun = function(faction) {
    var error = callback(playerIndex, faction);
    if(error != '') setHelp('invalid faction: ' + error + ' - Please try again');
  };

  var already = getAlreadyChosenColors();
  var j = 0;
  //drawHud();
  var bg = makeSizedDiv(300, 100, 200, 300, popupElement);
  //bg.style.backgroundColor = 'rgba(255,255,255,0.85)'; //alpha does not work in IE
  bg.style.backgroundColor = '#FFFFFF';
  bg.innerHTML = 'choose faction';
  bg.style.border = '1px solid black';

  for(var i = F_ALL_BEGIN; i <= F_ALL_END; i++) {
    if(already[factionColor(i)]) continue;
    var el = makeLinkButton(305, 100 + (j + 1) * 16, getFactionName(i), popupElement);
    el.onclick = bind(buttonClickFun, i);
    j++;
  }
};

var autoLeech = false;
var autoLeech1 = false;
var autoLeechNo = false;//for debug

var leechYesFun = null; //for shortcuts
var leechNoFun = null; //for shortcuts

Human.prototype.leechPower = function(playerIndex, fromPlayer, amount, vpcost, roundnum, already, still, callback) {
  var doAutoLeech = function() {
    // Let an AI do the decisions for you.
    (new AI).leechPower(playerIndex, fromPlayer, amount, vpcost, roundnum, already, still, callback);
    return;
  }

  if(autoLeechNo) {
    callback(playerIndex, false);
    return;
  }

  if(autoLeech) {
    doAutoLeech();
    return;
  }

  if(autoLeech1 && amount <= 1 && game.players[fromPlayer].race != F_CULTISTS) {
    callback(playerIndex, true);
    return;
  }

  var already = getAlreadyChosenColors();
  var j = 0;
  //drawHud();
  var bg = makeSizedDiv(ACTIONPANELX, ACTIONPANELY, ACTIONPANELW, ACTIONPANELH, popupElement);
  bg.style.backgroundColor = '#fff';
  bg.innerHTML = 'leech ' + amount + ' power from ' + getFullName(game.players[fromPlayer]) + '?';
  bg.style.border = '1px solid black';

  var yes = makeLinkButton(ACTIONPANELX + 5, ACTIONPANELY + 30, 'yes', popupElement);
  leechYesFun = function() {
    leechNoFun = null;
    leechYesFun = null;
    callback(playerIndex, true);
  }
  yes.onclick = leechYesFun;

  var no = makeLinkButton(ACTIONPANELX + 5, ACTIONPANELY + 55, 'no', popupElement);
  leechNoFun = function() {
    leechNoFun = null;
    leechYesFun = null;
    callback(playerIndex, false);
  }
  no.onclick = leechNoFun;

  if(amount <= 1) {
    var a = makeLinkButton(ACTIONPANELX + 5, ACTIONPANELY + 80, 'auto for 1', popupElement);
    a.title = 'automatically leech if it is 1 power and not from cultists';
    a.onclick = function() {
      autoLeech1 = true;
      leechNoFun = null;
      leechYesFun = null;
      callback(playerIndex, true);
    }
  }

  var a2 = makeLinkButton(ACTIONPANELX + 5, ACTIONPANELY + 128, 'auto "smart"', popupElement);
  a2.onclick = function() {
    a2.title = 'Automatically decide whether to accept or decline leeching based on amount and round number. Never see the leech question again this game!';
    autoLeech = true;
    leechNoFun = null;
    leechYesFun = null;
    doAutoLeech();
  }

  var a3 = makeLinkButton(ACTIONPANELX + 480, ACTIONPANELY + 128, 'never', popupElement);
  a3.style.color = '#eee';
  a3.onclick = function() {
    autoLeechNo = true;
    callback(playerIndex, false);
  }
};


//Similar to transformDirAction, except returns A_TRANSFORM_CW if the tile is already your color, for the human UI dig controls (not applicable to giants)
function humanTransformDirAction(player, fromcolor, tocolor) {
  var result = transformDirAction(player, fromcolor, tocolor);
  return result == A_NONE ? A_TRANSFORM_CW : result;
}

//Returns opposite direction of humanTransformDirAction (not applicable to giants)
function humanAntiTransformDirAction(player, fromcolor, tocolor) {
  var result = humanTransformDirAction(player, fromcolor, tocolor);
  if(result == A_TRANSFORM_CW) result = A_TRANSFORM_CCW;
  else if(result == A_TRANSFORM_CCW) result = A_TRANSFORM_CW;
  return result;
}

Human.prototype.doRoundBonusSpade = function(playerIndex, num, callback) {
  if(num < 2 && game.players[playerIndex].faction == F_GIANTS) {
    callback(playerIndex, []);
    return;
  }

  var result = [];
  var player = game.players[playerIndex];

  actionEl.innerHTML = 'rounddig';

  var currentNum = num;
  var done = 0;
  var fun = function(x, y) {
    if(currentNum <= 0) return;
    currentNum--;
    var type = A_NONE;
    if(player.faction == F_GIANTS) type = A_GIANTS_TRANSFORM;
    else if(digAndBuildMode == DBM_ONE) type = humanTransformDirAction(player, getWorld(x, y), player.color);
    else if(digAndBuildMode == DBM_ANTI) type = humanAntiTransformDirAction(player, getWorld(x, y), player.color);
    result.push([type,x,y]);
    actionEl.innerHTML = 'rounddig ';
    for(var i = 0; i < result.length; i++) {
      actionEl.innerHTML += printCo(result[i][1], result[i][2]);
      if(i < result.length - 1) actionEl.innerHTML += ', ';
    }
  };
  digAndBuildMode = player.faction == F_GIANTS ? DBM_COLOR : DBM_ONE;
  setHumanState(HS_DIG, 'You got ' + num + '  bonus spades from the cult track. Click on map to dig, press execute when done.', fun);

  executeButtonFun_ = function() {
    var error = callback(playerIndex, result);
    if(error != '') {
      setHelp('Round bonus spade error: ' + error);
      result = [];
      actionEl.innerHTML = 'rounddig';
      currentNum = num;
    } else {
      clearHumanState();
      executeButtonFun_ = null;
      executeButtonClearFun_ = null;
      actionEl.innerHTML = '';
    }
  };

  executeButtonClearFun_ = function() {
    result.pop();
    actionEl.innerHTML = 'rounddig ' + printCos(result);
  };
};

Human.prototype.chooseCultistTrack = function(playerIndex, callback) {
  var fun = function(cult) {
    var error = callback(playerIndex, cult);
    if(error == '') clearHumanState();
    else {
      setHelp('invalid cult. Please try again');
    }
  };
  setHumanState(HS_CULT, 'click on which cult track to increase', fun);
};

//dig&build mode
var DBM_BUILD = 0; //dig to your color if needed (as DBM_COLOR), and put a dwelling on it
var DBM_COLOR = 1; //dig all the way to your color (either with as much spades as needed, or sandstorm, or giants)
var DBM_ONE = 2; //dig once in your direction (or clockwise if it's your color)
var DBM_ANTI = 3; //dig once in opposite direction (or counterclockwise if it's your color)

var digAndBuildMode = DBM_BUILD;


function getFreeSpades(player, actions) {
  var result = 0;
  for(var i = 0; i < actions.length; i++) {
    result += spadesDifference(player, actions[i]);
  }
  return result;
}

//If this is called after e.g. a power dig or bonus dig or so, that action must already have been edded.
//This function will add extra A_SPADE actions if needed (to bring a full terrain to your color).
//If it's about round bonus spades, then not of course.
function digAndBuildFun(initialMode, helpText) {
  var player = getCurrentPlayer();

  digAndBuildMode = initialMode;
  
  var ptype = pactions.length > 0 ? pactions[pactions.length - 1].type : A_NONE; //previous action type
  var roundend = state.type == S_ROUND_END_DIG;
  var halflingssh = (ptype == A_UPGRADE_SH && player.faction == F_HALFLINGS);
  var cansplit = ptype == A_POWER_2SPADE || halflingssh;
  var canaddspades = !roundend && ptype != A_SANDSTORM && !halflingssh;

  var fun = function(x, y) {
    clearHumanState();
    if(digAndBuildMode == DBM_BUILD || digAndBuildMode == DBM_COLOR) {
      if(ptype == A_SANDSTORM) {
        pactions[pactions.length - 1].co = [x, y];
      } else {
        var tactions = getAutoTransformActions(player, x, y, player.color, getFreeSpades(player, pactions), 999);
        for(var i = 0; i < tactions.length; i++) prepareAction(tactions[i]);
      }
      if(digAndBuildMode == DBM_BUILD) {
        var action = new Action(A_BUILD);
        action.co = [x, y];
        prepareAction(action);
      }
    } else {
      var type = A_NONE;
      if(player.faction == F_GIANTS) type = A_GIANTS_TRANSFORM;
      else if(digAndBuildMode == DBM_ONE) type = humanTransformDirAction(player, getWorld(x, y), player.color);
      else if(digAndBuildMode == DBM_ANTI) type = humanAntiTransformDirAction(player, getWorld(x, y), player.color);
      if(getFreeSpades(player, pactions) < 1) prepareAction(new Action(A_SPADE));
      var action = new Action(type);
      action.co = [x, y];
      prepareAction(action);
    }

    if(getFreeSpades(player, pactions) > 0) {
      if(digAndBuildMode != DBM_ANTI) digAndBuildMode = DBM_ONE;
      queueHumanState(HS_DIG, helpText, fun);
      drawHud();
    }
  };
  setHumanState(HS_DIG, helpText, fun);
}

//Gets the building at the x, y coordinate, but in case of chaos magicians
//double action, takes into account that this building may be built or upgraded
//from a previous action even though it's not on the map yet.
function getBuildingForUpgradeClick(x, y) {
  var b = getBuilding(x, y)[0];
  for(var i = 0; i < pactions.length; i++) {
    var action = pactions[i];
    if(action.co && action.co[0] == x && action.co[1] == y) {
      if(action.type == A_BUILD || action.type == A_WITCHES_D) b = B_D;
      else if(action.type == A_UPGRADE_TP || action.type == A_SWARMLINGS_TP) b = B_TP;
      else if(action.type == A_UPGRADE_TE) b = B_TE;
      else if(action.type == A_UPGRADE_SH) b = B_SH;
      else if(action.type == A_UPGRADE_SA) b = B_SA;
    }
  }
  return b;
}

function upgrade1fun() {
  var fun = function(x, y) {
    clearHumanState();
    //Commented out because e.g. chaos magician double action may have turned it to your color before, this just doesn't detect that yet
    //var tile = getWorld(x, y);
    //if(tile != getCurrentPlayer().color) return;
    var b = getBuildingForUpgradeClick(x, y);
    var action = new Action(A_NONE);
    if(b == B_D) action.type = A_UPGRADE_TP;
    else if(b == B_TP) action.type = A_UPGRADE_SH;
    else return;
    action.co = [x, y];
    prepareAction(action);
  };
  setHumanState(HS_MAP, 'click where to upgrade to TP/SH', fun);
}

function upgrade2fun() {
  var fun = function(x, y) {
    clearHumanState();
    //Commented out because e.g. chaos magician double action may have turned it to your color before, this just doesn't detect that yet
    //var tile = getWorld(x, y);
    //if(tile != getCurrentPlayer().color) return;
    var b = getBuildingForUpgradeClick(x, y);
    var action = new Action(A_NONE);
    if(b == B_TP) action.type = A_UPGRADE_TE;
    else if(b == B_TE) action.type = A_UPGRADE_SA;
    else return;
    action.co = [x, y];
    prepareAction(action);
  };
  setHumanState(HS_MAP, 'click where to upgrade to TE/SA', fun);
}

registerKeyHandler(88 /*X*/, executeButtonFun);
registerKeyHandler(13 /*enter*/, executeButtonFun);
registerKeyHandler(66 /*B*/, function() {
  if(isHandlingActionInput()) digAndBuildFun(DBM_BUILD, 'click where to dig&build');
});
registerKeyHandler(78 /*N*/, function() {
  if(nextButtonFun) nextButtonFun();
  else if(leechNoFun) leechNoFun();
});
registerKeyHandler(89 /*Y*/, function() {
  if(leechYesFun) leechYesFun();
});
registerKeyHandler(70 /*F*/, function() {
  if(fastButtonFun) fastButtonFun();
});
registerKeyHandler(85 /*U*/, function() {
  if(isHandlingActionInput()) upgrade1fun();
});
registerKeyHandler(86 /*V*/, function() {
  if(isHandlingActionInput()) upgrade2fun();
});
