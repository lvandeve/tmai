/*
TM AI

Copyright (C) 2017 by Lode Vandevenne

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

//Random AI: picks random actions out of the possible ones without caring at all which one it is. Expect oddly placed bridges and the occasional town by pure chance.

var AIRandom = function() {
  this.scoreActionValues = {};
  this.restrictions = clone(defaultRestrictions);
};
inherit(AIRandom, Actor);

function AIRandomArrayValue(array) {
  return array[Math.floor(Math.random() * array.length)];
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
AIRandom.prototype.doAction = function(playerIndex, callback) {
  var player = game.players[playerIndex];
  var actions = getPossibleActions(player, this.restrictions);
  var chosen = AIRandomArrayValue(actions);

  if(!chosen) {
    var action = new Action(A_PASS);
    if(state.round != 6) action.bontile = this.getRandomBonusTile_(player);
    chosen = [action];
  }

  for(var i = 0; i < chosen.length; i++) {
    for(var j = 0; j < chosen[i].favtiles.length; j++) {
      var tiles = getPossibleFavorTiles(player, chosen[i].favtiles);
      chosen[i].favtiles[j] = this.getRandomFavorTile_(player, tiles);
    }
    for(var j = 0; j < chosen[i].twtiles.length; j++) {
      var tiles = getPossibleTownTiles(player, chosen[i].twtiles);
      chosen[i].twtiles[j] = this.getRandomTownTile_(player, tiles);
      updateWToPConversionAfterDarklingsSHTownTile(player, chosen[i]);
    }
  }

  var error = callback(playerIndex, chosen);
};

AIRandom.prototype.scoreActionAI_ = function(player, actions, roundnum) {
  return AIRandom.scoreAction(player, actions, this.scoreActionValues, roundnum);
};

//bonus tiles chosen from world
AIRandom.prototype.getRandomBonusTile_ = function(player) {
  var avtiles = [];
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) {
    if(game.bonustiles[i]) avtiles.push(i);
  }

  return AIRandomArrayValue(avtiles);
};

//favor tile chosen from given array
AIRandom.prototype.getRandomFavorTile_ = function(player, tiles) {
  return AIRandomArrayValue(tiles);
};

//town tile chosen from given array (for the unlikely case the random AI manages to form a town :D - update a bit later after testing it: apparently they do! randomly building buildings near each other does that)
AIRandom.prototype.getRandomTownTile_ = function(player, tiles) {
  return AIRandomArrayValue(tiles);
};

AIRandom.prototype.chooseInitialBonusTile = function(playerIndex, callback) {
  var tile = this.getRandomBonusTile_(game.players[playerIndex]);

  var error = callback(playerIndex, tile);
  if(error != '') {
    addLog('ERROR: AI tried invalid bonus tile. Error: ' + error);
    throw new Error('AI tried invalid bonus tile. Error: ' + error);
  }
};

AIRandom.prototype.chooseInitialFavorTile = function(playerIndex, callback) {
  var player = game.players[playerIndex];
  var tiles = getPossibleFavorTiles(player, {});
  var tile = AIRandomArrayValue(tiles);

  var error = callback(playerIndex, tile);
  if(error != '') {
    addLog('ERROR: AI tried invalid favor tile. Error: ' + error);
    throw new Error('AI tried invalid favor tile. Error: ' + error);
  }
};

//callback result (second parameter) should be the chosen color emum value
AIRandom.prototype.chooseAuxColor = function(playerIndex, callback) {
  var player = game.players[playerIndex];

  var ispriestcolor = false;
  if(player.color == Z && player.colors[player.woodcolor - R]) ispriestcolor = true;

  var colors = [];
  for(var i = CIRCLE_BEGIN; i <= CIRCLE_END; i++) {
    if(!ispriestcolor && auxColorToPlayerMap[i] == undefined && colorToPlayerMap[i] == undefined) colors.push(i);
    if(ispriestcolor && !player.colors[i - R]) colors.push(i);
  }

  var chosen = AIRandomArrayValue(colors);

  var error = callback(playerIndex, chosen);
  if(error != '') {
    addLog('ERROR: AI tried invalid faction color. Error: ' + error);
    throw new Error('AI tried invalid faction color. Error: ' + error);
  }
};

AIRandom.prototype.chooseInitialDwelling = function(playerIndex, callback) {
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

  var chosen = AIRandomArrayValue(positions);

  var error = callback(playerIndex, chosen);
  if(error != '') {
    addLog('ERROR: AI tried invalid initial dwelling. Error: ' + error);
    throw new Error('AI tried invalid initial dwelling. Error: ' + error);
  }
};

AIRandom.prototype.chooseFaction = function(playerIndex, callback) {
  var factions2 = getPossibleFactionChoices();

  var factions = [];
  for(var i = 0; i < factions2.length; i++) {
    if(factions2[i].color == O || factions2[i].color == X || factions2[i].color == Z) continue; //AIs don't support these yet
    factions.push(factions2[i]);
  }

  var faction = AIRandomArrayValue(factions);

  var error = callback(playerIndex, faction);
  if(error != '') {
    addLog('ERROR: AI chose invalid faction. Error: ' + error);
    throw new Error('AI chose invalid faction. Error: ' + error);
  }
};

AIRandom.prototype.leechPower = function(playerIndex, fromPlayer, amount, vpcost, roundnum, already, still, callback) {
  var player = game.players[playerIndex];

  var array = [false, true];
  var chosen = AIRandomArrayValue(array);

  callback(playerIndex, chosen);
};

AIRandom.prototype.doRoundBonusSpade = function(playerIndex, callback) {
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

AIRandom.prototype.chooseShapeshiftersConversion = function(playerIndex, callback) {
  callback(playerIndex, state.round < 5);
};

AIRandom.prototype.chooseCultistTrack = function(playerIndex, callback) {
  var chosen = AIRandomArrayValue([C_F, C_W, C_E, C_A]);

  var error = callback(playerIndex, chosen);
  if(error != '') {
    addLog('ERROR: AI chose invalid cult track. Error: ' + error);
    throw new Error('AI chose invalid cult track. Error: ' + error);
  }
};
