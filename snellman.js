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

var snellmandebug = false;

function snellmanDebugLog(text)  {
  if(snellmandebug) console.log(text);
}

/*
handy for debugging:
logText.replace(/<br\/>/g, '\n')
drawHud(); drawMap(); displayLog();
getCallBackStateDebugString()
this.lines[this.l]
*/

// maps from and to snellman tile, case insensitive
var fromSnellmanTile = {
  'fav1' : T_FAV_3F, 'fav2' : T_FAV_3W, 'fav3' : T_FAV_3E, 'fav4' : T_FAV_3A, 'fav5' : T_FAV_2F_6TW,
  'fav6' : T_FAV_2W_CULT, 'fav7' : T_FAV_2E_1PW1W, 'fav8' : T_FAV_2A_4PW, 'fav9' : T_FAV_1F_3C,
  'fav10' : T_FAV_1W_TPVP, 'fav11' : T_FAV_1E_DVP, 'fav12' : T_FAV_1A_PASSTPVP,
  'bon1' : T_BON_SPADE_2C, 'bon2' : T_BON_CULT_4C, 'bon3' : T_BON_6C, 'bon4' : T_BON_3PW_SHIP,
  'bon5' : T_BON_3PW_1W, 'bon6' : T_BON_PASSSHSAVP_2W, 'bon7' : T_BON_PASSTPVP_1W, 'bon8' : T_BON_1P,
  'bon9' : T_BON_PASSDVP_2C, 'bon10' : T_BON_PASSSHIPVP_3PW,
  'score1' : T_ROUND_DIG2VP_1E1C, 'score2' : T_ROUND_TW5VP_4E1DIG, 'score3' : T_ROUND_D2VP_4W1P, 'score4' : T_ROUND_SHSA5VP_2F1W,
  'score5' : T_ROUND_D2VP_4F4PW, 'score6' : T_ROUND_TP3VP_4W1DIG, 'score7' : T_ROUND_SHSA5VP_2A1W, 'score8' : T_ROUND_TP3VP_4A1DIG,
  'tw1' : T_TW_5VP_6C, 'tw2' : T_TW_7VP_2W, 'tw3' : T_TW_9VP_P, 'tw4' : T_TW_6VP_8PW,
  'tw5' : T_TW_8VP_CULT, 'tw6' : T_TW_2VP_2CULT, 'tw7' : T_TW_4VP_SHIP, 'tw8' : T_TW_11VP
};
var toSnellmanTile = {};
for(var tile in fromSnellmanTile) toSnellmanTile[fromSnellmanTile[tile]] = tile;

function fromSnellmanFaction(name) {
  return name == 'chaosmagicians' ? factions[F_CHAOS] : codeNameToFaction(name);
}
function toSnellmanFaction(faction) {
  faction = ensureFactionClass(faction);
  return faction == factions[F_CHAOS] ? 'chaosmagicians' : getFactionCodeName(faction);
}
function fromSnellmanFaction2(name) {
  return name == 'chaos magicians' ? factions[F_CHAOS] : codeNameToFaction(name);
}
function toSnellmanFaction2(faction) {
  faction = ensureFactionClass(faction);
  return faction == factions[F_CHAOS] ? 'chaos magicians' : getFactionCodeName(faction);
}
//snellman coordinates: x does not increase over water, instead water uses "r#" notation
var fromSnellmanCo_ = {};
function createSnellmanCo(game) {
  fromSnellmanCo_ = {};
  var r = 0; // for river coordinates
  for(var y = 0; y < game.bh; y++) {
    var x2 = 0;
    for(var x = 0; x < game.bw; x++) {
      var color = standardWorld[arCo2(x, y, 13)];
      if(color != I && color != N) {
        x2++;
        fromSnellmanCo_[String.fromCharCode(65 + y) + x2] = [x, y];
      }
      else if(color == I) {
        fromSnellmanCo_['R' + r] = [x, y]; //it's lowercase in snellman log, but we compare coordinates with uppercase, hence 'R'
        r++;
      }
    }
  }
}
var parseSnellmanCo = function(text) {
  return fromSnellmanCo_[text.toUpperCase()];
};
var fromSnellmanActionOctogon = {
    'act1' : A_POWER_BRIDGE, 'act2' : A_POWER_1P, 'act3' : A_POWER_2W, 'act4' : A_POWER_7C, 'act5' : A_POWER_SPADE, 'act6' : A_POWER_2SPADE,
    'bon1' : A_BONUS_SPADE, 'bon2' : A_BONUS_CULT, 'fav6' : A_FAVOR_CULT, 'actn' : A_SANDSTORM, 'actw': A_WITCHES_D, 'acta': A_AUREN_CULT,
    'acts': A_SWARMLINGS_TP, 'actc': A_DOUBLE, 'actg': A_GIANTS_2SPADE
};
var fromSnellmanCultName = { 'fire' : C_F, 'water': C_W, 'earth' : C_E, 'air' : C_A };
var fromSnellmanPlusCultName = { '+fire' : C_F, '+water': C_W, '+earth' : C_E, '+air' : C_A };
var toSnellmanPlusCultName = [];
for(var c in fromSnellmanPlusCultName) toSnellmanPlusCultName[fromSnellmanPlusCultName[c]] = c;
//TODO: expansion colors
var toSnellmanColorName_ = ['', '', 'red', 'yellow', 'brown', 'black', 'blue', 'green', 'grey'];
var fromSnellmanColorName_ = { 'red': R, 'yellow': Y, 'brown': U, 'black': K, 'blue': B, 'green': G, 'grey': S };
function fromSnellmanColorName(text) {
  if(text == 'gray') return S;
  else return fromSnellmanColorName_[text];
}

// Finds the amount of players and which factions they have chosen from the log.
// In some logs, there are specific lines "player: rob" and their faction can be found at the first numPlayers "income_for_faction" lines
// In other logs, those player: lines are missing, but if the full snellman page was copied, the player names can be found at their board e.g. chaosmagicians (playername)
// The input text must be small caps, but for the rest does not have to be cleaned of anything
// Returns array of [faction, playername] in order of first round (start player are 0)
function findSnellmanPlayersAndFactions(text) {
  var result = [];
  var lines = getNonEmptyLines(text);
  for(var i = 0; i < lines.length; i++) {
    if(stringContains(lines[i], 'income_for_faction')) {
      prev = true;
      var words = getWords(lines[i]);
      var faction = fromSnellmanFaction(words[0]);
      result.push([faction, null]);
    }
    else if(result.length > 0) break; //done
  }

  // Name-find method one
  for(var i = 0; i < result.length; i++) {
    var pos = text.indexOf('player ' + (i + 1));
    var end = text.indexOf('\n', pos);
    if(pos < 0) continue;
    var line = text.substring(pos, end);
    var words = getWords(line);
    var name = '';
    for(var j = 2; j < words.length; j++) {
      name += words[j] + (j + 1 < words.length ? ' ' : '');
    }
    result[i][1] = name;
  }

  // Name-find method two
  for(var i = 0; i < result.length; i++) {
    if(result[i][1]) continue; //already has name
    var faction = toSnellmanFaction2(result[i][0]);
    var pos = text.indexOf(faction + ' (');
    var end = text.indexOf(')', pos);
    if(pos < 0 || end < 0) continue;
    var name = text.substring(pos + (faction + ' (').length, end);
    result[i][1] = name;
  }


  // Name substitutes if none found
  for(var i = 0; i < result.length; i++) {
    if(!result[i][1]) result[i][1] = 'Player ' + (i + 1);
  }


  return result;
}

//Filters out all the lines which are player moves from the text. That includes initial dwellings, passing, leeching, actions, ...
//Returns an array of arrays. One array per player, with the lines relevant to that player for each player. The order is the initial player order.
//Players is array of [faction, playername] in initial player order, as returned by findSnellmanPlayersAndFactions
function filterSnellmanMoves(text, players, snellmanunittesttext) {
  var result = [];
  //everything before this does not contain player actions for sure, but may contain e.g. witches (playername) which could confuse the parsing that looks for lines starting with faction names
  var removingtilepos = text.indexOf('removing tile');
  text = text.substring(removingtilepos);
  var factiontoplayermap = {};
  for(var i = 0; i < players.length; i++) {
    factiontoplayermap[toSnellmanFaction(players[i][0])] = i;
    result[i] = [];
  }
  var lines = getNonEmptyLines(text);

  for(var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if(stringContains(line, 'income_for_faction')) continue;
    if(stringContains(line, 'all opponents' /*' declined power'*/)) continue;
    if(stringContains(line, 'score_resources')) continue;
    if(stringContains(line, 'setup')) continue;

    var words = getWords(lines[i]);
    var factionname = words[0];
    if(factionname[factionname.length - 1] == ':') factionname = factionname.substr(0, factionname.length - 1);

    var index = factiontoplayermap[factionname];
    if(index == undefined) continue;

    line = line.substr(words[0].length + 1);

    /*var cultslashespos = line.search(/[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{1,2}/);
    if(cultslashespos >= 0) {
      for(;;) {
        cultslashespos++;
        var c = line[cultslashespos];
        var n = line.charCodeAt(cultslashespos);
        if(n >= 48 && n <= 57) continue;
        if(c == '/' || c == ' ' || c == '\t') continue;
        break;
      }
      line = line.substring(cultslashespos);
      line = line.trim();
    }*/

    result[index].push(line);
    snellmanunittesttext[0] += words[0] + ': ' + line + '\n';
  }

  return result;
}


//Returns array of first number, first resource name, second number, second resource name, index in words array where last used word was
//E.g. for "convert 3pw to w build e3", it would return [3, 'pw', 1, 'w', index + 3]
//But also supports e.g.: convert 3 pw to 1 w build e3, etc... (spaces in between)
//index is index of the first word after 'convert' in words.
//Expects a potential number, some letter(s), 'to', potential number, and again some letters.
function parseConvertNumbersAndLetters(words, index) {
  var state = 0; //1=first number, 2=first word, 3=second number, 4=second word
  var i = index;
  var n1 = 0;
  var n2 = 0;
  var w1 = '';
  var w2 = '';
  while(i < words.length) {
    var word = words[i];
    for(var j = 0; j < word.length; j++) {
      if(word == 'to') {
        state = 3;
        continue;
      }
      var n = word.charCodeAt(j) - 48;
      if(n >= 0 && n <= 9) {
        // digit
        if(state == 0) {
          state = 1;
          n1 = n;
        }
        else if(state == 1) n1 = n1 * 10 + n;
        else if(state == 3) n2 = n2 * 10 + n;
      } else {
        // letter
        var c = word[j];
        if(state < 2) state = 2;
        if(state == 2) w1 += c;
        if(state == 3) state = 4;
        if(state == 4) w2 += c;
      }
    }
    if(state == 4) break; //don't continue parsing past the one word
    i++;
  }
  if(n1 == 0) n1 = 1;
  if(n2 == 0) n2 = 1;
  return [n1, w1, n2, w2, i];
}

var snellmanFailureSaveState = null; //load after test fail with loadGameState(snellmanFailureSaveState); drawMap(); drawHud();

var globalSnellmanParseDone = false;

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

// Actor which executes the Snellman log lines starting with its name sequentially every time the Game State calls any if its choice functions.
var SnellmanActor = function() {
  this.factionkey = '';
  this.l = 0; //index in own lines
  this.lines = [];
  this.l2 = 0; //sub-index in own lines: this is for a single line containing two built-initial-dwelling actions
};
inherit(SnellmanActor, Actor);

SnellmanActor.prototype.doAction = function(playerIndex, callback) {
  if(this.l >= this.lines.length) {
    globalSnellmanParseDone = true;
    return;
  }
  var line = this.lines[this.l];
  var player = game.players[playerIndex];

  // actions from which we learn the coordinates or other parameters only later
  var witchesd = null; //free dwelling action for witches
  var swarmlingstp = null; //free trading post action for swarmlings
  var sandstormact = null; //free trading post action for swarmlings

  var skipline = false;
  // If the player can receive only 0 power, then by the state machine "leechpower" does not get called even though
  // the snellman game log may still contain decline or leech lines. Skip such lines.
  // it could be always skipped, but it is only done if pw0 and pw1 are 0 so that if we are at the wrong line due
  // to a bug, we can still see an error.
  if(player.pw0 == 0 && player.pw1 == 0 && (stringContains(line, 'leech') || stringContains(line, 'decline'))) skipline = true;
  // Lines containing "wait" should be ignored
  if(stringContains(line, 'wait')) skipline = true;

  if(skipline) {
    this.l++;
    this.doAction(playerIndex, callback);
    return;
  }

  snellmanDebugLog('DEBUG: executing doAction: ' + playerIndex + ' ' + line);
  var result = [];
  var words = getWords(line);
  var spades = 0;
  for(var i = 0; i < words.length; i++) {
    var word = words[i];
    if(word == 'upgrade') {
      var type;
      if(words[i + 3] == 'tp') type = A_UPGRADE_TP;
      else if(words[i + 3] == 'sh') type = A_UPGRADE_SH;
      else if(words[i + 3] == 'te') type = A_UPGRADE_TE;
      else if(words[i + 3] == 'sa') type = A_UPGRADE_SA;
      if(type == A_UPGRADE_TP && swarmlingstp != null) {
        swarmlingstp.co = parseSnellmanCo(words[i + 1]);
      } else {
        var action = new Action(type);
        action.co = parseSnellmanCo(words[i + 1]);
        result.push(action);

        if(type == A_UPGRADE_SH && player.faction == F_HALFLINGS) spades += 3;
      }
      i += 3;
    }
    else if(word == 'burn') {
      var amount = parseInt(words[i + 1]);
      if(amount) i++;
      else amount = 1;
      for(var j = 0; j < amount; j++) result.push(new Action(A_BURN));
    }
    else if(word == 'action') {
      var a = fromSnellmanActionOctogon[words[i + 1]];
      var action = new Action(a);
      result.push(action);
      if(a == A_POWER_BRIDGE) result.push(new Action(A_PLACE_BRIDGE));
      if(a == A_POWER_SPADE) spades += 1;
      if(a == A_BONUS_SPADE) spades += 1;
      if(a == A_POWER_2SPADE) spades += 2;
      if(a == A_GIANTS_2SPADE) spades += 2;
      if(a == A_SANDSTORM) sandstormact = action;
      if(a == A_WITCHES_D) witchesd = action;
      if(a == A_SWARMLINGS_TP) swarmlingstp = action;
      i++;
    }
    else if(word == 'transform') {
      var co = parseSnellmanCo(words[i + 1]);
      var tocolor = player.getMainDigColor();
      if(words[i + 2] == 'to') {
        tocolor = fromSnellmanColorName(words[i + 3]);
        i += 2;
      }
      if(spades > 0) {
        // Auto-transform since the action did not contain transform commands
        var tactions = getAutoTransformActions(player, co[0], co[1], tocolor, 999, spades);
        for(var j = 0; j < tactions.length; j++) result.push(tactions[j]);
        spades += actionsSpadesDifference(player, tactions);
      }
      if(sandstormact != null) {
        sandstormact.co = co;
        sandstormact = null;
      }
      i++;
    }
    else if(word == 'build') {
      var co = parseSnellmanCo(words[i + 1]);
      var x = co[0];
      var y = co[1];
      if(spades > 0) {
        // Auto-transform since the action did not contain transform commands
        var tactions = getAutoTransformActions(player, x, y, player.getMainDigColor(), 999, spades);
        for(var j = 0; j < tactions.length; j++) result.push(tactions[j]);
        spades += actionsSpadesDifference(player, tactions);
      }
      if(witchesd != null) {
        witchesd.co = co;
      } else {
        var action = new Action(A_BUILD);
        action.co = co;
        result.push(action);
      }
      if(sandstormact != null) {
        sandstormact.co = co;
        sandstormact = null;
      }
      i++;
    }
    else if(word == 'send') {
      var cult = fromSnellmanCultName[words[i + 3]];
      var amount = (words.length > i + 5 && words[i + 4] == 'for') ? parseInt(words[i + 5]) : 0;

      var type = amount == 0 ? getAutoSendPriestCultAction(player, cult) : getCultActionForAmount(amount);
      var action = new Action(type);
      action.cult = cult;
      result.push(action);

      i += (amount == 0 ? 2 : 4);
    }
    else if(word && word[0] == '+') {
      var text = word.substring(1);
      var num = 1;
      if(text.charCodeAt(0) >= 48 && text.charCodeAt(0) <= 57) {
        num = text.charCodeAt(0) - 48;
        text = text.substring(1);
      }
      var tile = fromSnellmanTile[text];
      if(isFavorTile(tile)) {
        // Finds which of the actions gave the favor tile
        for(var j = result.length - 1; j >= 0; j--) {
          if(isUpgradeAction(result[j])) {
            result[j].favtiles.push(tile);
            //if j is not the last action, then possibly there are convert actions between the upgrading and the favor tile taking
            //the favor tile taking can change pw
            //therefore, in fact the upgrade action must be executed after those convert actions
            //so swap the order
            //TODO: use convertActionsToMove and moveElementsInFrontSorted system from the town tiles below. The convert actions should be shifted, not change order.
            if(j != result.length - 1) {
              var temp = result[j];
              result[j] = result[result.length - 1];
              result[result.length - 1] = temp;
            }
            break;
          }
        }
      }
      else if(isTownTile(tile)) {
        var townformations = actionsCreateTowns(player, result, result.length);
        var convertActionsToMove = [];
        // Find which of the actions made the town
        for(var j = result.length - 1; j >= 0; j--) {
          // If there is a convert action between the town forming action and the +TW# command, the convert actually happened before the town action.
          // E.g. build G7. convert 4PW to 4C. +TW4 --> that is the +8pw town tile. The order matters! convert happens before build.
          if(isConvertOrBurnAction(result[j])) {
            convertActionsToMove.push(j);
          }
          if(townformations[j] > result[j].twtiles.length) {
            result[j].twtiles.push(tile);
            if(convertActionsToMove.length > 0) {
              result = moveElementsInFrontSorted(result, convertActionsToMove, j);
              convertActionsToMove = [];
            }
            if(num <= 0) break;
            if(num > 1) j--;
            num--;
          }
        }
      }
      else if(word == '+fire') {
        result[result.length - 1].cult = C_F;
      }
      else if(word == '+water') result[result.length - 1].cult = C_W;
      else if(word == '+earth') {
        result[result.length - 1].cult = C_E;
      }
      else if(word == '+air') {
        result[result.length - 1].cult = C_A;
      }
      else if(word == '+2fire') result[result.length - 1].cult = C_F;
      else if(word == '+2water') result[result.length - 1].cult = C_W;
      else if(word == '+2earth') result[result.length - 1].cult = C_E;
      else if(word == '+2air') result[result.length - 1].cult = C_A;
      //dodgy manipulations sometimes used to fix up games
      else if(word == '+1pw') result.push(new Action(A_CHEAT_PW));
    }
    else if(word == 'dig') {
      var num = parseInt(words[i + 1]);
      for(var j = 0; j < num; j++) {
        result.push(new Action(A_SPADE));
        spades++;
      }
      i++;
    }
    else if(word == 'convert') {
      var values = parseConvertNumbersAndLetters(words, i + 1);
      var n = values[2];
      var from = values[1];
      var to = values[3];
      for(var j = 0; j < n; j++) {
        if(from == 'pw') {
          if(to == 'c') result.push(new Action(A_CONVERT_1PW_1C));
          else if(to == 'w') result.push(new Action(A_CONVERT_3PW_1W));
          else if(to == 'p') result.push(new Action(A_CONVERT_5PW_1P));
        } else if(from == 'p') {
          if(to == 'c') {
            result.push(new Action(A_CONVERT_1P_1W));
            result.push(new Action(A_CONVERT_1W_1C));
          } else if(to == 'w') result.push(new Action(A_CONVERT_1P_1W));
        } else if(from == 'w') {
          if(to == 'c') result.push(new Action(A_CONVERT_1W_1C));
          else if(to == 'bridge') {
          result.push(new Action(A_ENGINEERS_BRIDGE));
          result.push(new Action(A_PLACE_BRIDGE));
        } else if(to == 'p') result.push(new Action(A_CONVERT_1W_1P));
        } else if(from == 'vp') {
          if(to == 'c') result.push(new Action(A_CONVERT_1VP_1C));
        }
      }
      i = values[4];
    }
    else if(word == 'bridge') {
      var coords = words[i + 1].split(':');
      //assuming the last pushed action is the power or eng bridge action
      var action = result[result.length - 1];
      action.cos.push(parseSnellmanCo(coords[0]));
      action.cos.push(parseSnellmanCo(coords[1]));
      i++;
    }
    else if(word == 'connect') {
      var coords = words[i + 1].split(':');
      var parsed = [];
      for(var j = 0; j < coords.length; j++) parsed[j] = parseSnellmanCo(coords[j]);
      var co;
      if(parsed.length == 3) {
        // old between three land tiles format
        co = getTileBetween3(parsed[0][0], parsed[0][1], parsed[1][0], parsed[1][1], parsed[2][0], parsed[2][1]);
      }
      else if(parsed.length == 2) {
        // old between two land tiles format
        co = getWaterTileBetween(parsed[0][0], parsed[0][1], parsed[1][0], parsed[1][1]);
      }
      else if(parsed.length == 1) {
        // new r# format
        co = [parsed[0][0], parsed[0][1]];
      } else {
        throw new Error('unknown water connect format: ' + line);
      }

      if(co != null) {
        var action = new Action(A_CONNECT_WATER_TOWN);
        action.co = co;
        result.push(action);
      }
    }
    else if(word == 'advance') {
      var track = words[i + 1];
      if(track == 'ship' || track == 'shipping') result.push(new Action(A_ADV_SHIP));
      if(track == 'dig' || track == 'digging') result.push(new Action(A_ADV_DIG));
    }
    else if(word == 'pass') {
      var action = new Action(A_PASS);
      var bontile = fromSnellmanTile[words[i + 1]];
      //in some snellman games, players passed with a bon tile in round 6 even though it has no effect. Don't add it to the action or it causes error
      if(bontile && state.round != 6) action.bontile = bontile;
      result.push(action);
      i++;
    }
  }
  insertCarpetTunnelActionIfNeeded(player, result);
  reorderDigBuildActionsToNotStartWithIncompleteTransforms(player, result);
  this.l++;
  var error = callback(playerIndex, result);
  if(error != '') {
    snellmanFailureSaveState = saveGameState(game, state, undefined);
    console.log('snellman loading error: ' + error);
    globalSnellmanParseDone = true;
  }
};

SnellmanActor.prototype.leechPower = function(playerIndex /*receiver*/, fromPlayer /*sender*/, amount, vpcost, roundnum, already, still, callback) {
  if(this.l >= this.lines.length) {
    //globalSnellmanParseDone = true;
    addLog('player in snellman game did not choose whether to leech yet, doing substitute instead');
    //callback(playerIndex, false);
    newAI().leechPower(playerIndex, fromPlayer, amount, vpcost, roundnum, already, still, callback);
    return;
  }

  var line = this.lines[this.l];
  snellmanDebugLog('DEBUG: executing leechPower: ' + playerIndex + ' ' + line);
  var skipline = false;
  // Lines containing "wait" should be ignored
  if(stringContains(line, 'wait')) skipline = true;
  if(skipline) {
    this.l++;
    this.leechPower(playerIndex, fromPlayer, amount, vpcost, roundnum, already, still, callback);
    return;
  }

  var fromFactionName = toSnellmanFaction(game.players[fromPlayer].faction);

  // Given line must be leech line.
  var isFromCorrectPlayer = function(line) {
    if(!stringContains(line, 'from')) return true; //old log that did not contain from player faction name. Assume it is the right one.
    if(stringContains(line, fromFactionName)) return true;
    return false;
  };

  var m = this.l;
  // Sometimes when leeching from multiple players, the leech commands are not in the same order as the actions that happened, while the game state
  // machine does ask it in that order. Put the leech/decline line with the correct faction to the front.
  // Note also that sometimes a decline line is not present at all, so stop as soon as an action line (not containing word leech or decline) is reached.
  for(;;) {
    if(m >= this.lines.length || m - this.l > 5) {
      m = this.l;
      break;
    }
    var line2 = this.lines[m];
    if(!stringContains(line2, 'leech') && !stringContains(line2, 'decline')) {
      m = this.l;
      break;
    }
    if(isFromCorrectPlayer(line2)) break;
    m++;
  }
  if(m > this.l) {
    var line = this.lines[m];
    this.lines.splice(m, 1);
    this.lines.splice(this.l, 0, line);
    line = this.lines[this.l];
  }

  // A line may actually contain part of an action and a leech statement, all in one line!!
  // For example:
  // Convert pw to c. Decline 5 from nomads
  // The convert is actually part of the NEXT action. So let's move it to there.
  if(stringContains(line, 'convert')) {
    var end = line.indexOf('leech');
    if(end < 0) end = line.indexOf('decline');
    if(end > 0 && this.lines.length > m + 1) {
      this.lines[m + 1] = line.substr(0, end) + '. ' + this.lines[m + 1];
    }
  }

  snellmanDebugLog('DEBUG: executing leechPower: ' + playerIndex + ' ' + line);
  var result = false;
  if(isFromCorrectPlayer(line)) {
    if(stringContains(line, 'leech')) {
      result = true;
      this.l++;
    }
    else if(stringContains(line, 'decline')) {
      this.l++;
    }
  }

  var error = callback(playerIndex, result);
  if(error != '') {
    console.log(error);
    globalSnellmanParseDone = true;
  }
};

SnellmanActor.prototype.doRoundBonusSpade = function(playerIndex, callback) {
  if(this.l >= this.lines.length) {
    globalSnellmanParseDone = true;
    return;
  }

  var player = game.players[playerIndex];
  var num = player.spades;

  var line = this.lines[this.l];
  snellmanDebugLog('DEBUG: executing doRoundBonusSpade: ' + playerIndex + ' ' + line);
  var result = [];
  var words = getWords(line);
  var numdone = 0;
  for(var i = 0; i < words.length; i++) {
    var word = words[i];
    if(word == 'transform') {
      var co = parseSnellmanCo(words[i + 1]);
      var tocolor = player.getMainDigColor();
      if(words[i + 2] == 'to') {
        tocolor = fromSnellmanColorName(words[i + 3]);
        i += 2;
      }
      var tactions = getAutoTransformActions(player, co[0], co[1], tocolor, 999, numdone == 0 ? num : 1);
      for(var j = 0; j < tactions.length; j++) result.push([tactions[j].type, tactions[j].co[0], tactions[j].co[1]]);
      numdone++;
      i++;
    }
  }
  this.l++;
  var error = callback(playerIndex, result);
  if(error != '') {
    console.log(error);
    globalSnellmanParseDone = true;
  }
};

SnellmanActor.prototype.chooseInitialDwelling = function(playerIndex, callback) {
  if(this.l >= this.lines.length) {
    globalSnellmanParseDone = true;
    return;
  }

  var line = this.lines[this.l];
  snellmanDebugLog('DEBUG: executing chooseInitialDwelling: ' + playerIndex + ' ' + line);
  var words = getWords(line);
  var separatecount = 0; //sometimes two actions are on a single line, e.g. building two starting dwellings, or initial dwelling then pass bonus tile
  for(var i = 0; i < words.length; i++) {
    if(words[i] == 'build' || words[i] == 'pass') {
      separatecount++;
      i++;
    }
  }
  if(separatecount == 0) throw new Error(game.players[playerIndex].name + ': no build on current line for chooseInitialDwelling: ' + line);

  var j = 0;
  for(var i = 0; i < words.length; i++) {
    if(words[i] == 'build') {
      j++;
      if(this.l2 == (j - 1)) {
        var co = parseSnellmanCo(words[i + 1]);
        var error = callback(playerIndex, co);
        if(error != '') {
          console.log(error);
          globalSnellmanParseDone = true;
        }
        i++;
        this.l2++;
        break;
      }
    }
  }
  if(this.l2 == separatecount) {
    this.l++;
    this.l2 = 0;
  }
};

SnellmanActor.prototype.chooseFaction = function(playerIndex, callback) {
  snellmanDebugLog('DEBUG: executing chooseFaction: ' + playerIndex + ' ' + this.factionkey);
  var error = callback(playerIndex, fromSnellmanFaction(this.factionkey));
  if(error != '') {
    console.log(error);
    globalSnellmanParseDone = true;
  }
};

SnellmanActor.prototype.chooseCultistTrack = function(playerIndex, callback) {
  if(this.l >= this.lines.length) {
    //globalSnellmanParseDone = true;
    addLog('player in snellman game did not choose cultists track yet, doing substitute instead');
    //callback(playerIndex, C_F);
    newAI().chooseCultistTrack(playerIndex, callback);
    return;
  }

  var m = this.l;
  // Sometimes the +cult command is after leech commands off other players
  // The +cult command normally occurs immediately after the cultists own action though.
  // Fix the order by moving this line to the front if needed, so that the leech lines
  // are in the correct order after this when the state machine asks about the leeching.
  for(;;) {
    if(m >= this.lines.length) {
      m = this.l;
      break;
    }
    var line = this.lines[m];
    var words = getWords(line);
    //I think that the cult advance is always at the beginning of the line, so only use words[0].
    //NOTE: sometimes there happen 5 moves of the cultists before another player finally accepts their power and the cultists increase their track. Some of those 5 moves may be 'action fav6. +earth'
    //do not take those moves for cultist track advances.
    if(words[0] == '+fire') break;
    if(words[0] == '+water') break;
    if(words[0] == '+earth') break;
    if(words[0] == '+air') break;
    m++;
  }
  //TODO: if the line is far in the future, but also contains something else like an action or leech, then that part should not be moved...
  if(m != this.l) {
    var line = this.lines[m];
    this.lines.splice(m, 1);
    this.lines.splice(this.l, 0, line);
  } else {
    m = this.l;
  }

  var line = this.lines[this.l];
  snellmanDebugLog('DEBUG: executing chooseCultistTrack: ' + playerIndex + ' ' + line);
  var error = '';
  var cult = -1;
  // Note: a line can sometimes be: "+water. action fav6. +earth." if a cultists choice and cult action were combined on one line. Ensure to take the first word, not the second, as the one now.
  var words = getWords(line);
  for(var i = 0; i < words.length; i++) {
    var word = words[i];
    if(word == '+fire') cult = C_F;
    if(word == '+water') cult = C_W;
    if(word == '+earth') cult = C_E;
    if(word == '+air') cult = C_A;
    if(cult > -1) break;
  }
  error = callback(playerIndex, cult);
  if(error != '') {
    console.log(error);
    globalSnellmanParseDone = true;
  }

  //sometimes the cultists track command is on the same line as an action command. If that happens, cut off that part
  var spliced = false;
  if(cult > -1) {
    var loc = line.indexOf(toSnellmanPlusCultName[cult]);
    if(loc > -1) loc = line.indexOf(' ', loc);
    if(loc > -1 && loc < line.length - 3 /*enough to contain a command*/) {
      this.lines.splice(m + 1, 0, line.substr(loc));
      spliced = true;
    }
  }

  //If cultists get cultist track choice, and get power income during another player action after that, two possible things
  //can happen in the log: Either it is two lines, the first being "leech", the second "+cult". Or, it is one single line,
  //with on it the order "+cult. leech N from P"
  if(spliced || !stringContains(line, 'leech')) this.l++;
};

SnellmanActor.prototype.chooseInitialBonusTile = function(playerIndex, callback) {
  if(this.l >= this.lines.length) {
    globalSnellmanParseDone = true;
    return;
  }

  var line = this.lines[this.l];
  snellmanDebugLog('DEBUG: executing chooseInitialBonusTile: ' + playerIndex + ' ' + line);
  var words = getWords(line);
  for(var i = 0; i < words.length; i++) {
    if(words[i] == 'pass') {
      var tile = fromSnellmanTile[words[i + 1]];
      var error = callback(playerIndex, tile);
      if(error != '') {
        console.log(error);
        globalSnellmanParseDone = true;
      }
      this.l++;
      this.l2 = 0; //could be still set due to Build and Pass on same line.
      return;
    }
  }
  throw new Error(game.players[playerIndex].name + ': no pass on current line for chooseInitialBonusTile: ' + line);
};

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

var snellmanunittesttext = '';

function deSerializeGameStateSnellmanLog_(text) {
  // Remove "show history"
  text = text.replace(/show history/g, '');
  text = text.replace(/[0-9]+ VP.*[0-9]+\/[0-9]+\/[0-9]+\/[0-9]+/g, ''); // removes the summaries in the center of each action line, such as "67 VP 9 C 9 W 1 P +1 0/1/4 PW 2/2/7/8"
  // removes add/subtract numbers near said summaries, such as +1
  text = text.replace(/\s\+[0-9]+/g, ' ');
  text = text.replace(/\s-[0-9]+/g, ' ');
  // make all whitespaces one space
  text = text.replace(/(\t| )+/g, ' ');
  // It contains the commands as typed by players, so be case-insensitive
  text = text.toLowerCase();

  globalSnellmanParseDone = false;
  snellmanunittesttext = 'show history\n';

  game = new Game();
  state = new State();
  logText = '';
  state.newcultistsrule = stringContains(text, 'errata-cultist-power');
  state.towntilepromo2013 = stringContains(text, 'mini-expansion-1');
  state.bonustilepromo2013 = stringContains(text, 'shipping-bonus');
  state.fireice = false;

  game.finalscoring = nameToFinalScoring['none'];
  //if(stringContains(text, 'fire-and-ice-final-scoring')) {
    if(stringContains(text, 'connected-clusters')) {
      game.finalscoring = nameToFinalScoring['settlements'];
    }
    else if(stringContains(text, 'connected-sa-sh-distance')) {
      game.finalscoring = nameToFinalScoring['sh_sa'];
    }
    else if(stringContains(text, 'connected-distance')) {
      game.finalscoring = nameToFinalScoring['distance'];
    }
    else if(stringContains(text, 'building-on-edge')) {
      game.finalscoring = nameToFinalScoring['outposts'];
    }
  //}

  if(state.newcultistsrule) snellmanunittesttext += 'option errata-cultist-power\n';
  if(state.towntilepromo2013) snellmanunittesttext += 'option mini-expansion-1\n';
  if(state.bonustilepromo2013) snellmanunittesttext += 'option shipping-bonus\n';

  var map = 0;
  if(codeNameToWorld['fire_ice'] && codeNameToWorld['fire_ice_altered']) {
    if(stringContains(text, '95a66999127893f5925a5f591d54f8bcb9a670e6')) map = codeNameToWorld['fire_ice'];
    else if(stringContains(text, 'be8f6ebf549404d015547152d5f2a1906ae8dd90')) map = codeNameToWorld['fire_ice_altered'];
  }
  worldGenerators[map](game); // Create the world map
  initBoard();

  var players = findSnellmanPlayersAndFactions(text);

  players.length;
  game.players.length = players.length;

  for(var i = 0; i < players.length; i++) {
    var player = new Player();
    player.index = i;
    player.name = players[i][1];
    player.human = false;
    var actor = new SnellmanActor();
    player.actor = actor;
    actor.factionkey = toSnellmanFaction(players[i][0]);

    game.players[i] = player;
  }

  var lines = getNonEmptyLines(text);

  var removed = false;
  for(var i = 0; i < lines.length; i++) {
    if(stringContains(lines[i], 'removing tile')) {
      var words = getWords(lines[i]);
      for(var j = 0; j < words.length; j++) {
        if(words[j] == 'removing') game.bonustiles[fromSnellmanTile[words[j + 2]]] = 0;
      }
      removed = true;
      snellmanunittesttext += lines[i].trim() + '\n';
    }
    else if(removed) break; //done
  }

  for(var i = 1; i <= 6; i++) {
    var pos = text.indexOf('round ' + i + ' scoring: score');
    game.roundtiles[i] = fromSnellmanTile['score' + text.charAt(pos + 22)];
    snellmanunittesttext += 'round ' + i + ' scoring: ' + toSnellmanTile[game.roundtiles[i]] + '\n';
  }

  for(var i = 0; i < players.length; i++) snellmanunittesttext += 'player ' + (i + 1) + ': ' + game.players[i].name + '\n';
  for(var i = 0; i < players.length; i++) snellmanunittesttext += toSnellmanFaction(players[i][0]) + ' income_for_faction\n';

  var pointer = [snellmanunittesttext];
  var moves = filterSnellmanMoves(text, players, pointer);
  snellmanunittesttext = pointer[0];
  for(var i = 0; i < players.length; i++) game.players[i].actor.lines = moves[i];

  initialGameLogMessage();
  createSnellmanCo(game);

  var count = 0;
  state.type = S_INIT_FACTION;
  gameLoopBlocking(function() {
    count++;
    return globalSnellmanParseDone || count > lines.length || state.type == S_GAME_OVER;
  });

  // Make the players human and AI (TODO: which player should become the human? --> The one who is supposed to do an action now. That check can be combined with the isFinishedFun
  // of gameLoopBlocking: if all lines consumed, that one must be the player supposed to take an action next)
  for(var i = 0; i < players.length; i++) {
    var human = true;
    var player = game.players[i];
    player.human = human;
    player.actor = human ? new Human() : newAI();
  }

  var result = clone(game);
  result.logText = logText;//text.replace(/\n/g, '<br/>');
  result.state = state;

  snellmanunittesttext = snellmanunittesttext.replace(/\n/g, '\\n\\\n');

  return result;
}

function deSerializeGameStateSnellmanLog(text) {
  var temp = null;
  if(game.buildings && game.buildings.length > 0) temp = saveGameState(game, state, logText);
  try {
    var result = deSerializeGameStateSnellmanLog_(text)
    if(temp) loadGameState(temp); // This is because loading a snellman game overwrites the current game, so put it back
    return result;
  }
  catch(e) {
    console.log(e + ' ' + e.stack);
    if(temp) loadGameState(temp);
    return null;
  }
}

