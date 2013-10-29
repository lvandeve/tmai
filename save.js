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

//serialization of gamestate, backing it up, and Undo

function saveGameState(includeLog) {
  var game = {};
  game.world = clone(world);
  game.buildings = clone(buildings);
  game.bridges = clone(bridges);
  game.players = clone(players); //all the players (restoring the player parameter would do nothing outside of this function)
  game.octogons = clone(octogons);
  game.cultp = clone(cultp);
  game.towntiles = clone(towntiles);
  game.favortiles = clone(favortiles);
  game.bonustiles = clone(bonustiles);
  game.bonustilecoins = clone(bonustilecoins);
  game.roundtiles = clone(roundtiles);
  game.state = clone(state);
  if(includeLog) game.logText = logText;
  //game.humanstate = humanstate;
  return game;
}

function loadGameState(game) {
  world = game.world;
  players = game.players;
  buildings = game.buildings;
  bridges = game.bridges;
  octogons = game.octogons;
  cultp = game.cultp;
  towntiles = game.towntiles;
  favortiles = game.favortiles;
  bonustiles = game.bonustiles;
  bonustilecoins = game.bonustilecoins;
  roundtiles = game.roundtiles;
  state = game.state;
  if(game.logText) {
    logText = game.logText;
    logEl.innerHTML = logText;
  }
  //humanstate = game.humanstate;

  waterDistanceCalculated = [];
  createColorToPlayerMap();
  calculateTownClusters();
  //calculateNetworkClusters();
}

//also reinits
function loadGameStateHard(game) {
  loadGameState(game);
  clearHumanState();
  clearPopupElementNow();
  if(state.currentStateDone) state.nextState();
  else state.executeState();
  showingNextButtonPanel = false;
  pactions = [];

  uiElement.innerHTML = '';
  drawMap();
  drawMapClick();
  drawSaveLoadUI(false);
  drawHud();
}

function encode3DArray(array) {
  var result = '[';
  for(var i = 0; i < array.length; i++) {
    result += '[';
    for(var j = 0; j < array[i].length; j++) {
      result += '[';
      var num = array[i][j].length;
      for(var k = 0; k < num; k++) result += array[i][j][k] + (k < num - 1 ? ',' : '');
      result += ']';
      if(j < array[i].length - 1) result += ',';
    }
    result += ']';
    if(i < array.length - 1) result += ',';
  }
  result += ']';
  return result;
}

function decode3DArray(text) {
  text = trim(text);
  var result = [];
  var stack = [];
  stack.push(result);
  var text2 = '';
  for(var i = 1; i < text.length - 1; i++) {
    var c = text.charAt(i);
    if(c == '[') {
      var a = [];
      stack[stack.length - 1].push(a);
      stack.push(a);
    }
    else if(c == ']') {
      if(text2 != '') {
        stack[stack.length - 1].push(parseInt(text2));
        text2 = '';
      }
      stack.pop();
    }
    else if(c == ',') {
      if(text2 != '') {
        stack[stack.length - 1].push(parseInt(text2));
        text2 = '';
      }
    }
    else {
      text2 += c;
    }
  }
  if(text2 != '') stack[stack.length - 1].push(parseInt(text2));
  return result;
}

var colorLetters = ['n' /*null, edge of hexmap*/, 'R', 'Y', 'O', 'K', 'B', 'G', 'E', 'i' /*river*/];
var buildingLetters = ['n' /*none*/, 'D', 'P', 'E', 'H', 'A', 'M' /*mermaids*/];

//returns it as a string
function serializeGameState(game) {
  var result = '';
  
  result += 'size:\n';
  result += '' + BW + ',' + BH;
  result += '\n';
  
  result += 'landscape:\n';

  for(var y = 0; y < BH; y++) {
    if(y % 2 == 1) result += ' ';
    for(var x = 0; x < BW; x++) {
      result += colorLetters[getWorld(x, y)] + ',';
    }
    result += '\n';
  }
  
  result += 'buildings:\n';
  for(var y = 0; y < BH; y++) {
    if(y % 2 == 1) result += ' ';
    for(var x = 0; x < BW; x++) {
      result += buildingLetters[getBuilding(x, y)[0]] + ',';
    }
    result += '\n';
  }
  
  result += 'bridges:\n';
  for(var y = 0; y < BH; y++) {
    if(y % 2 == 1) result += '  ';
    for(var x = 0; x < BW; x++) {
      var code = colorLetters[bridges[arCo(x, y)][0]] + colorLetters[bridges[arCo(x, y)][1]] + colorLetters[bridges[arCo(x, y)][2]];
      result += code + ',';
    }
    result += '\n';
  }

  for(var i = 0; i < players.length; i++) {
    var p = players[i];
    result += 'player:\n';
    result += p.name + ',' + p.human + ',' + p.faction + ',' + colorLetters[p.color] + ',' + p.passed + '\n';
    result += p.c + ',' + p.w + ',' + p.p + ',' + p.pp + ',' + p.pw0 + ',' + p.pw1 + ',' + p.pw2 + ',' + p.vp + '\n';
    result += p.b_d + ',' + p.b_tp + ',' + p.b_te + ',' + p.b_sh + ',' + p.b_sa + ',' + p.bridges + '\n';
    result += '' + (p.bonustile ? (p.bonustile - T_BON_BEGIN) : 0) + '\n';
    for(var j = T_FAV_BEGIN + 1; j < T_FAV_END; j++) result += undef0(p.favortiles[j]) + (j == T_FAV_END - 1 ? '\n' : ',');
    for(var j = T_TW_BEGIN + 1; j < T_TW_END; j++) result += undef0(p.towntiles[j]) + (j == T_TW_END - 1 ? '\n' : ',');
    for(var j = O_NONE + 1; j < O_END; j++) result += undef0(p.octogons[j]) + (j == O_END - 1 ? '\n' : ',');
    result += p.cult[0] + ',' + p.cult[1] + ',' + p.cult[2] + ',' + p.cult[3] + ',' + p.keys + '\n';
    result += p.shipping + ',' + p.maxshipping + ',' + p.bonusshipping + ',' + p.digging + ',' + p.maxdigging + '\n';
    // player.tunnelcarpetdistance not saved: is instead calculated after loading
    result += p.vp_start + ',' + p.vp_round + ',' + p.vp_bonus + ',' + p.vp_town + ',' + p.vp_favor + ',' +
        p.vp_advance + ',' + p.vp_faction + ',' + p.vp_leech + ',' + p.vp_cult[0] + ',' + p.vp_cult[1] + ',' + p.vp_cult[2] + ',' + p.vp_cult[3] + ',' +
        p.vp_network + ',' + p.vp_resources + ',' + p.vp_other + '\n';
  }
  
  result += 'octogons:\n';
  for(var i = O_NONE + 1; i < O_END; i++) result += undef0(game.octogons[i]) + (i == O_END - 1 ? '\n' : ',');
  
  result += 'cultpriests:\n';
  for(var i = 0; i < 16; i++) {
    result += game.cultp[Math.floor(i / 4)][i % 4];
    if(i < 15) result += ',';
  }
  result += '\n';
  
  result += 'tiles:\n';
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) result += game.bonustiles[i] + (i == T_BON_END - 1 ? '\n' : ',');
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) result += undef0(game.bonustilecoins[i]) + (i == T_BON_END - 1 ? '\n' : ',');
  for(var i = T_FAV_BEGIN + 1; i < T_FAV_END; i++) result += game.favortiles[i] + (i == T_FAV_END - 1 ? '\n' : ',');
  for(var i = T_TW_BEGIN + 1; i < T_TW_END; i++) result += game.towntiles[i] + (i == T_TW_END - 1 ? '\n' : ',');
  for(var i = 1; i <= 6; i++) result += '' + (game.roundtiles[i] - T_ROUND_BEGIN - 1) + (i == 6 ? '\n' : ',');
  
  result += 'gamestate:\n';
  result += '' + game.state.type + ',' + game.state.round + ',' + game.state.startPlayer + ',' + game.state.currentPlayer + ',' + game.state.rounddigsdone  + ',' + game.state.currentStateDone + '\n';
  result += '' + encode3DArray(game.state.leecharray) + ',' + game.state.leechi + ',' + game.state.leechj + ',' + game.state.leechtaken + '\n';

  if(game.logText) {
    result += '\n';
    result += 'log:\n';
    result += game.logText.replace(/<br\/>/g, '\n');
  }

  /*result += 'uistate:\n';
  result += '' + game.humanstate + ',' + showingNextButtonPanel + '\n';
  result += '\n';*/

  return result;
}

function parseLabelPart(text, label, n) {
  if(!n) n = 0;
  var begin = text.indexOf(label) + label.length;
  if(begin < label.length) return null;
  while(n > 0) {
    n--;
    begin = text.indexOf(label, begin) + label.length;
    if(begin < label.length) return null;
  }
  var end = text.indexOf(':', begin + label.length + 1);
  if(end < 0) end = text.length
  while(text.charCodeAt(end) > 32) end--; //skip to previous line
  if(end <= begin) return null;
  return text.substring(begin, end);
}


//returns array of BW * BH strings
function parseWorldString(text, label, n) {
  var s = parseLabelPart(text, label, n);
  if(!s) return null;
  return getCommas(s);
}

function getLines(text) {
  return text.split(/\r\n|\r|\n/);
}

function getNonEmptyLines(text) {
  lines = getLines(text);
  for(var i = 0; i < lines.length; i++) {
    if(lines[i] == '') {
      lines.splice(i, 1);
      i--;
    }
  }
  return lines;
}

function getCommas(text) {
  var result = text.split(',');
  for(var i = 0; i < result.length; i++) result[i] = trim(result[i]);
  return result;
}

//returns null on fail (invalid text, ...)
function deSerializeGameState(text) {

  var result = saveGameState(false); //a way to get an initialized object

  var colorMap = {};
  for(var i = 0; i < colorLetters.length; i++) colorMap[colorLetters[i]] = i;
  var buildingMap = {};
  for(var i = 0; i < buildingLetters.length; i++) buildingMap[buildingLetters[i]] = i;

  var s;
  var lines; //lines of a section
  var el; //split line

  s = parseLabelPart(text, 'size:');
  if(!s || s == '') {
    // support old saves that don't have size
    BW = 13;
    BH = 9;
  } else {
    el = getCommas(s);
    if(el.length != 2) return null;
    BW = parseInt(el[0]);
    BH = parseInt(el[1]);
  }

  s = parseWorldString(text, 'landscape:');
  if(!s || s.length < BW * BH) return null;
  for(var i = 0; i < BW * BH; i++) result.world[i] = colorMap[s[i]];

  s = parseWorldString(text, 'buildings:');
  if(!s || s.length < BW * BH) return null;
  for(var i = 0; i < BW * BH; i++) {
    var building = buildingMap[s[i]];
    var color = building == B_NONE ? N : result.world[i];
    if(building == B_MERMAIDS) color = B;
    result.buildings[i] = [building, color];
  }

  s = parseWorldString(text, 'bridges:');
  if(!s || s.length < BW * BH) return null;
  for(var i = 0; i < BW * BH; i++) {
    if(s[i].length != 3) return null;
    var b0 = colorMap[s[i].charAt(0)];
    var b1 = colorMap[s[i].charAt(1)];
    var b2 = colorMap[s[i].charAt(2)];
    result.bridges[i] = [b0,b1,b2];
  }

  var index = 0;
  result.players = [];
  while(true) {
    s = parseLabelPart(text, 'player:', index);
    if(s == null) {
      if(index == 0) return null;
      else break;
    }
    lines = getNonEmptyLines(s);
    if(lines.length != 10) return null;
    var player = new Player();
    result.players[index] = player;

    player.index = index;
    
    el = getCommas(lines[0]);
    if(el.length != 5) return null;
    player.name = el[0];
    player.human = (el[1] == 'true');
    if(player.human) player.actor = new Human();
    else player.actor = new AI();
    player.faction = parseInt(el[2]);
    player.color = colorMap[el[3]];
    player.passed = (el[4] == 'true');

    el = getCommas(lines[1]);
    if(el.length != 8) return null;
    player.c = parseInt(el[0]);
    player.w = parseInt(el[1]);
    player.p = parseInt(el[2]);
    player.pp = parseInt(el[3]);
    player.pw0 = parseInt(el[4]);
    player.pw1 = parseInt(el[5]);
    player.pw2 = parseInt(el[6]);
    player.vp = parseInt(el[7]);

    el = getCommas(lines[2]);
    if(el.length != 6) return null;
    player.b_d = parseInt(el[0]);
    player.b_tp = parseInt(el[1]);
    player.b_te = parseInt(el[2]);
    player.b_sh = parseInt(el[3]);
    player.b_sa = parseInt(el[4]);
    player.bridges = parseInt(el[5]);

    el = getCommas(lines[3]);
    if(el.length != 1) return null;
    var bonint = parseInt(el[0]);
    player.bonustile = bonint == 0 ? T_NONE : bonint + T_BON_BEGIN;

    el = getCommas(lines[4]);
    if(el.length != T_FAV_END - T_FAV_BEGIN - 1) return null;
    for(var i = T_FAV_BEGIN + 1; i < T_FAV_END; i++) player.favortiles[i] = parseInt(el[i - T_FAV_BEGIN - 1]);
    el = getCommas(lines[5]);
    if(el.length != T_TW_END - T_TW_BEGIN - 1) return null;
    for(var i = T_TW_BEGIN + 1; i < T_TW_END; i++) player.towntiles[i] = parseInt(el[i- T_TW_BEGIN - 1]);
    el = getCommas(lines[6]);
    if(el.length != O_END - O_NONE - 1) return null;
    for(var i = O_NONE + 1; i < O_END; i++) {
      var octoint = parseInt(el[i - O_NONE - 1]);
      if(octoint) player.octogons[i] = octoint;
    }

    el = getCommas(lines[7]);
    if(el.length != 5) return null;
    player.cult[0] = parseInt(el[0]);
    player.cult[1] = parseInt(el[1]);
    player.cult[2] = parseInt(el[2]);
    player.cult[3] = parseInt(el[3]);
    player.keys = parseInt(el[4]);

    el = getCommas(lines[8]);
    if(el.length != 5) return null;
    player.shipping = parseInt(el[0]);
    player.maxshipping = parseInt(el[1]);
    player.bonusshipping = parseInt(el[2]);
    player.digging = parseInt(el[3]);
    player.maxdigging = parseInt(el[4]);

    el = getCommas(lines[9]);
    if(el.length != 15) return null;
    player.vp_start = parseInt(el[0]);
    player.vp_round = parseInt(el[1]);
    player.vp_bonus = parseInt(el[2]);
    player.vp_town = parseInt(el[3]);
    player.vp_favor = parseInt(el[4]);
    player.vp_advance = parseInt(el[5]);
    player.vp_faction = parseInt(el[6]);
    player.vp_leech = parseInt(el[7]);
    player.vp_cult[0] = parseInt(el[8]);
    player.vp_cult[1] = parseInt(el[9]);
    player.vp_cult[2] = parseInt(el[10]);
    player.vp_cult[3] = parseInt(el[11]);
    player.vp_network = parseInt(el[12]);
    player.vp_resources = parseInt(el[13]);
    player.vp_other = parseInt(el[14]);

    // values deduced from the rest:
    player.tunnelcarpetdistance = 0;
    if(player.faction = F_DWARVES) {
      player.tunnelcarpetdistance = 1;
    }
    if(player.faction = F_FAKIRS) {
      player.tunnelcarpetdistance = 1;
      if(built_sh(player)) player.tunnelcarpetdistance++;
      player.tunnelcarpetdistance += player.towntiles[T_TW_4VP_SHIP];
    }

    index++;
  }

  s = parseLabelPart(text, 'octogons:');
  el = getCommas(s);
  if(el.length != O_END - O_NONE - 1) return null;
  for(var i = O_NONE + 1; i < O_END; i++) {
    var octoint = parseInt(el[i - O_NONE - 1]);
    result.octogons[i] = octoint;
  }

  s = parseLabelPart(text, 'cultpriests:');
  el = getCommas(s);
  if(el.length != 16) return null;
  for(var i = 0; i < 16; i++) {
    result.cultp[Math.floor(i / 4)][i % 4] = parseInt(el[i]);
  }

  s = parseLabelPart(text, 'tiles:');
  lines = getNonEmptyLines(s);
  if(lines.length != 5) return null;
  el = getCommas(lines[0]);
  if(el.length != T_BON_END - T_BON_BEGIN - 1) return null;
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) result.bonustiles[i] = parseInt(el[i - T_BON_BEGIN - 1]);
  el = getCommas(lines[1]);
  if(el.length != T_BON_END - T_BON_BEGIN - 1) return null;
  for(var i = T_BON_BEGIN + 1; i < T_BON_END; i++) result.bonustilecoins[i] = parseInt(el[i - T_BON_BEGIN - 1]);
  el = getCommas(lines[2]);
  if(el.length != T_FAV_END - T_FAV_BEGIN - 1) return null;
  for(var i = T_FAV_BEGIN + 1; i < T_FAV_END; i++) result.favortiles[i] = parseInt(el[i - T_FAV_BEGIN - 1]);
  el = getCommas(lines[3]);
  if(el.length != T_TW_END - T_TW_BEGIN - 1) return null;
  for(var i = T_TW_BEGIN + 1; i < T_TW_END; i++) result.towntiles[i] = parseInt(el[i- T_TW_BEGIN - 1]);
  el = getCommas(lines[4]);
  if(el.length != 6) return null;
  for(var i = 1; i <= 6; i++) result.roundtiles[i] = parseInt(el[i - 1]) + T_ROUND_BEGIN + 1;
  
  s = parseLabelPart(text, 'gamestate:');
  lines = getNonEmptyLines(s);
  if(lines.length != 2) return null;
  el = getCommas(lines[0]);
  if(el.length != 6) return null;
  result.state.type = parseInt(el[0]);
  result.state.round = parseInt(el[1]);
  result.state.startPlayer = parseInt(el[2]);
  result.state.currentPlayer = parseInt(el[3]);
  result.state.rounddigsdone = parseInt(el[4]);
  result.state.currentStateDone = el[5] == 'true';
  var leecharrayend = lines[1].lastIndexOf(']');
  if(leecharrayend <= 0) return null;
  result.state.leecharray = decode3DArray(lines[1].substring(0, leecharrayend + 1));
  el = getCommas(lines[1].substring(leecharrayend + 2));
  if(el.length != 3) return null;
  result.state.leechi = parseInt(el[0]);
  result.state.leechj = parseInt(el[1]);
  result.state.leechtaken = parseInt(el[2]);
  
  var logPos = text.indexOf('log:');
  if(logPos > 0) {
    logPos += 4;
    var lines = getLines(text.substring(logPos));
    result.logText = '';
    for(var i = 0; i < lines.length; i++) result.logText += lines[i] + '<br/>';
  }

  
  return result;
}

