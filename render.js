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

//Everything related to drawing and UI

var SIZE = 64;


var mapElement =  document.createElement('div');
document.body.appendChild(mapElement);

//UI that never changes
var uiElement =  document.createElement('div');
document.body.appendChild(uiElement);

//UI that gets redrawn all the time
var hudElement =  document.createElement('div');
document.body.appendChild(hudElement);


var helpEl = makeDiv(563, 500, document.body);
helpEl.style.fontWeight = 'bold';
var actionEl = makeDiv(563, 528, document.body);
var logEl = makeDiv(5, 1920, document.body);

//UI that pops up temporarily sometimes
var popupElement =  document.createElement('div');
document.body.appendChild(popupElement);

//hex grid coordinates to pixel coordinates
//the result is the center of where the hex cell should be
//hex grid uses the type of coordinate system where odd and even rows are different
function pixelCo(x, y) {
  x++;
  y++;
  var size = SIZE;
  var px = x * size;
  if(y % 2) px -= size / 2;
  //var py = y * size * 21 / 23;
  var py = y * size * 11 / 15;
  return [px, py + 16];
}

var logText = '';
var logUpsideDown = false;

function addLog(text) {
  if(logUpsideDown) logText = text + '<br/>' + logText;
  else logText += '<br/>' + text;
  logEl.innerHTML = logText;
  actionEl.innerHTML = text;
}

//removes last log entry
function popLog() {
  var br = logText.indexOf('<br/>');
  logText = logText.substring(br + 5);
  logEl.innerHTML = logText;
  actionEl.innerHTML = '';
}

function setHelp(text, extravisible) {
  helpEl.innerHTML = text;
  if(extravisible) helpEl.style.color = 'red';
  else helpEl.style.color = 'black';
}

function clearHelp() {
  helpEl.innerHTML = '';
}

function addText(px, py, text) {
  return makeText(px, py, text, hudElement);
}

function drawTileMapElement(px, py, tilex, tiley, parent) {
  var el =  makeDiv((px - SIZE/2), (py - SIZE/3), parent);
  el.className = 'tiles';
  el.style.width = '' + SIZE + 'px';
  el.style.height = '' + SIZE + 'px';
  el.style.backgroundPosition = '' + (-64 * tilex) + 'px ' + (-64 * tiley) + 'px';
  return el;
}

function drawTileMapElementOnGrid(x, y, tilex, tiley, parent) {
  var co = pixelCo(x, y);
  var px = co[0];
  var py = co[1];
  return drawTileMapElement(px, py, tilex, tiley, parent);
}

function drawHexagon(x, y, color) {
  return drawTileMapElementOnGrid(x, y, 0, color - 1, mapElement);
}


function drawBuilding(x, y, building, color, parent) {
  return drawTileMapElementOnGrid(x, y, building == B_MERMAIDS ? 9 : building, color - 1, parent);
}

function drawIcon(px, py, symbol, color, parent) {
  return drawTileMapElement(px, py, symbol, color - 1, parent);
}

//draw a small player color token somewhere
function drawOrb(px, py, color) {
  return drawIcon(px, py + SIZE/3 - SIZE/2, 9, color, hudElement);
}

function drawGridSymbol(x, y, text) {
  var co = pixelCo(x, y);
  el = makeSizedDiv(co[0]-30, co[1] + 18, 60, 16, mapElement);
  el.innerHTML = text;
  el.style.textAlign = 'center';
  if(isInTown(x, y)) {
    el.style.fontWeight = 'bold';
    el.style.color = highc[world[arCo(x, y)]];
  } else {
    el.style.color = lowc[world[arCo(x, y)]];
  }
}

function drawBridge(x0, y0, x1, y1, color) {
  if(y0 < y1) {
    var temp;
    temp = x0; x0 = x1; x1 = temp;
    temp = y0; y0 = y1; y1 = temp;
  }
  var co = pixelCo(x0, y0);
  var dir = getBridgeDir(x0, y0, x1, y1);

  if(dir == D_NE) {
    drawIcon(co[0] + (5*SIZE/7), co[1] - (5*SIZE/13), 7, color, mapElement);
  }
  else if(dir == D_NW) {
    drawIcon(co[0] - (5*SIZE/7), co[1] - (5*SIZE/13), 8, color, mapElement);
  }
  else if(dir == D_N) {
    drawIcon(co[0], co[1] - (3*SIZE/4), 6, color, mapElement);
  }
}

function drawBridges() {
  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    if(bridges[arCo(x, y)][0] != N) {
      drawBridge(x, y, x, y - 2, bridges[arCo(x, y)][0]);
    }
    if(bridges[arCo(x, y)][1] != N) {
      var co = bridgeCo(x , y, D_NE);
      drawBridge(x, y, co[0], co[1], bridges[arCo(x, y)][1]);
    }
    if(bridges[arCo(x, y)][2] != N) {
      var co = bridgeCo(x, y, D_SE);
      drawBridge(x, y, co[0], co[1], bridges[arCo(x, y)][2]);
    }
  }
}

//given the tile color, return the RGB color as used in the tiles.png image
function getImageColor(color) {
  /*if(color == I) return '#ffffff';
  if(color == N) return '#ffffff';
  if(color == R) return '#e61e1e';
  if(color == Y) return '#fff000';
  if(color == U) return '#dc8a46';
  if(color == K) return '#373737';
  if(color == B) return '#6187f7';
  if(color == G) return '#48c048';
  if(color == S) return '#aaaaaa';*/
  /*if(color == I) return '#ffffff';
  if(color == N) return '#ffffff';
  if(color == R) return '#ee1c24';
  if(color == Y) return '#fff200';
  if(color == U) return '#8c6239';
  if(color == K) return '#3e362f';
  if(color == B) return '#00a99d';
  if(color == G) return '#8dc73f';
  if(color == S) return '#959595';*/
  if(color == I) return '#ffffff';
  if(color == N) return '#ffffff';
  if(color == R) return '#ee1c24';
  if(color == Y) return '#fff200';
  if(color == U) return '#cb823e';
  if(color == K) return '#252525';
  if(color == B) return '#009ce5';
  if(color == G) return '#2bda2c';
  if(color == S) return '#959595';
}

//given a CSS hex RGB color, get a high contrast color (= either white or black)
function getHighContrastColor(color) {
  var r = parseInt(color.substring(1, 3), 16);
  var g = parseInt(color.substring(3, 5), 16);
  var b = parseInt(color.substring(5, 7), 16);
  //var lightness = (r + g + b) / 3;
  var lightness = (0.3 * r + 0.59 * g + 0.11 * b); //luma
  return lightness < 140 ? '#ffffff' : '#000000';
}

//given a CSS hex RGB color, get a color that is just readable with it
//color must be a string of 7 characters
//this is for non-ugly text on tiles
function getLowContrastColor(color) {
  var r = parseInt(color.substring(1, 3), 16);
  var g = parseInt(color.substring(3, 5), 16);
  var b = parseInt(color.substring(5, 7), 16);
  var lightness = (r + g + b) / 3;
  var r2 = lightness > 128 ? 0 : 255;
  var g2 = lightness > 128 ? 0 : 255;
  var b2 = lightness > 128 ? 0 : 255;
  var N = (lightness < 64 || lightness > 128) ? 4 : 2;
  r = ((N - 1) * r + r2) / N;
  g = ((N - 1) * g + g2) / N;
  b = ((N - 1) * b + b2) / N;
  return RGBToCssColor([r, g, b]);
}

//alpha in range 0-255
function getTranslucentColor(cssColor, alpha) {
  var rgba = cssColorToRGB(cssColor);
  //rgba[3] = alpha;

  // Because IE doesn't support CSS alpha colors, set alpha to 100% and instead blend with white
  rgba[3] = 255;
  if(alpha < 255) {
    rgba[0] = Math.floor((rgba[0] * alpha + 255 * (255 - alpha)) / 255.0);
    rgba[1] = Math.floor((rgba[1] * alpha + 255 * (255 - alpha)) / 255.0);
    rgba[2] = Math.floor((rgba[2] * alpha + 255 * (255 - alpha)) / 255.0);
  }

  
  return RGBToCssColor(rgba);
}

//precalculate the map contrast colors
var lowc = [];
for(var i = COLOR_BEGIN; i <= COLOR_END; i++) lowc[i] = getLowContrastColor(getImageColor(i));
var highc = [];
for(var i = COLOR_BEGIN; i <= COLOR_END; i++) highc[i] = getHighContrastColor(getImageColor(i));

var altco = false; //have coordinates like 0,0 instead of A1 on the map (for debugging)

function drawMap() {
  mapElement.innerHTML = '';
  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    var tile = world[arCo(x, y)];
    if(tile != N) {
      drawHexagon(x, y, tile);

      if(altco) drawGridSymbol(x, y, x + ',' + y);
      else drawGridSymbol(x, y, printCo(x, y));
    }
    var building = buildings[arCo(x, y)];
    if(building[0] != B_NONE) {
      drawBuilding(x, y, building[0], building[1], mapElement);
    }
  }
  drawBridges();
}

function getCultColor(cult) {
  if(cult == C_F) return '#f64';
  if(cult == C_W) return '#99f';
  if(cult == C_E) return '#a70';
  if(cult == C_A) return '#ddd';
}

function drawCultTracks(px, py) {
  var trackwidth = 60;
  var trackheight = 450;
  
  function drawTrack(x, y, cult) {
    var color = getCultColor(cult);
    var track = makeSizedDiv(x, y, trackwidth, trackheight, hudElement);
    track.style.backgroundColor = color;
    for(var i = 0; i < 11; i++) {
      var text = makeDiv(x + trackwidth / 2 - 8, y + Math.floor(trackheight * (i + 0.5) / 12), hudElement);
      text.innerHTML = 10 - i;
    }
    for(var i = 0; i < players.length; i++) {
      var player = players[i];
      var num = player.cult[cult];
      drawOrb(x + 20 + Math.floor(i * (trackwidth - 40) / players.length), 7 + Math.floor(trackheight * (11 - num + 0.5) / 12), player.color);
    }
    for(var i = 0; i < 4; i++) {
      var x2 = x + 5 + Math.floor(5 + i * trackwidth / 5);
      var y2 = y + Math.floor(trackheight * 11.5 / 12);
      var text = makeDiv(x2, y2, hudElement);
      text.innerHTML = i == 0 ? 3 : 2;
      if(cultp[cult][i] != N) drawOrb(x2 + 4, y2 + 6, cultp[cult][i]);
    }
    
    var ui = makeSameSizeDiv(track, hudElement);
    ui.style.cursor = 'pointer';
    ui.onclick = bind(function(cult) {
      if(cultClickFun) cultClickFun(cult);
    }, cult);
  }

  function drawVLine(x, y, width, color) {
    var el = makeSizedDiv(x, y, width, 1, hudElement)
    el.style.backgroundColor = color;
    el.style.fontSize = '0%'; //IE refuses to make a div smaller than fontsize so set fontsize small
  }

  drawTrack(px + trackwidth * 0, py, C_F);
  drawTrack(px + trackwidth * 1, py, C_W);
  drawTrack(px + trackwidth * 2, py, C_E);
  drawTrack(px + trackwidth * 3, py, C_A);

  drawVLine(px, py + trackheight / 12, trackwidth * 4, players[0].keys > 2 ? '#000' : '#b00');
  drawVLine(px, py + trackheight / 12 + 3, trackwidth * 4, players[0].keys > 1 ? '#000' : '#b00');
  drawVLine(px, py + trackheight / 12 + 6, trackwidth * 4, players[0].keys > 0 ? '#000' : '#b00');
  drawVLine(px, py + 4 * trackheight / 12, trackwidth * 4, '#000');
  drawVLine(px, py + 4 * trackheight / 12 + 3, trackwidth * 4, '#000');
  drawVLine(px, py + 6 * trackheight / 12, trackwidth * 4, '#000');
  drawVLine(px, py + 6 * trackheight / 12 + 3, trackwidth * 4, '#000');
  drawVLine(px, py + 8 * trackheight / 12, trackwidth * 4, '#000');
}

function renderTownTile(px, py, tile, vp, text, onTileClick) {
  var el = makeDiv(px, py, hudElement);
  el.style.border = '1px solid #ff8822';
  el.style.width = 45;
  el.style.height = 45;
  el.style.backgroundColor = '#888888';
  var text1el = makeDiv(px + 5, py + 5, hudElement);
  text1el.innerHTML = vp + 'vp';
  var text2el = makeDiv(px + 5, py + 25, hudElement);
  text2el.innerHTML = text;

  if(onTileClick) {
    var elui = makeSameSizeDiv(el, hudElement);
    elui.style.cursor = 'pointer';
    elui.onclick = function() {
      onTileClick(tile);
    };
    IEClickHack(elui);
    elui.title = tileToHelpString(tile, true);
  }

  return [46, 46];
}

function drawTownTile(px, py, tile, onTileClick) {
  var vp = 0;
  var text = '';
  if(tile == T_TW_2VP_2CULT) { vp = 2; text = 'cults2'; }
  else if(tile == T_TW_4VP_SHIP) { vp = 4; text = 'ship/c'; }
  else if(tile == T_TW_5VP_6C) { vp = 5; text = '6c'; }
  else if(tile == T_TW_6VP_8PW) { vp = 6; text = '8pw'; }
  else if(tile == T_TW_7VP_2W) { vp = 7; text = '2w'; }
  else if(tile == T_TW_8VP_CULT) { vp = 8; text = 'cults'; }
  else if(tile == T_TW_9VP_P) { vp = 9; text = '1p'; }
  else if(tile == T_TW_11VP) { vp = 11; text = ''; }
  return renderTownTile(px, py, tile, vp, text, onTileClick);
}

function renderBonusTile(px, py, tile, text1, text2, text3, onTileClick) {
  var el = makeDiv(px, py, hudElement);
  el.style.border = '1px solid #55a';
  el.style.width = 47;
  el.style.height = 62;
  el.style.backgroundColor = '#ffeebb';
  var text1el = makeDiv(px + 2, py + 5, hudElement);
  text1el.innerHTML = text1;
  var text2el = makeDiv(px + 2, py + 21, hudElement);
  text2el.innerHTML = text2;
  var text3el = makeDiv(px + 2, py + 37, hudElement);
  text3el.innerHTML = text3;
  if (bonustilecoins[tile]) addText(px, py-12, '+' + bonustilecoins[tile] + 'c');

  if(onTileClick) {
    var elui = makeSameSizeDiv(el, hudElement);
    elui.style.cursor = 'pointer';
    elui.onclick = function() {
      onTileClick(tile);
    };
    IEClickHack(elui);
    elui.title = tileToHelpString(tile, true);
  }

  return [48, 63];
}

function drawBonusTile(px, py, tile, onTileClick) {
  var text1 = '';
  var text2 = '';
  var text3 = '';
  if(tile == T_BON_SPADE_2C) { text1 = 'act:dig'; text2 = ''; text3 = '+2c';}
  else if(tile == T_BON_CULT_4C) { text1 = 'act:cult'; text2 = ''; text3 = '+4c'; }
  else if(tile == T_BON_6C) { text1 = ''; text2 = ''; text3 = '+6c'; }
  else if(tile == T_BON_3PW_SHIP) { text1 = '+ship'; text2 = ''; text3 = '+3pw'; }
  else if(tile == T_BON_3PW_1W) { text1 = ''; text2 = '+1w'; text3 = '+3pw'; }
  else if(tile == T_BON_PASSDVP_2C) { text1 = 'pass:'; text2 = 'D 1vp'; text3 = '+2c'; }
  else if(tile == T_BON_PASSTPVP_1W) { text1 = 'pass:'; text2 = 'TP 2vp'; text3 = '+1w'; }
  else if(tile == T_BON_PASSSHSAVP_2W) { text1 = 'pass:'; text2 = 'S 4vp'; text3 = '+2w'; }
  else if(tile == T_BON_1P) { text1 = ''; text2 = ''; text3 = '+1p'; }
  else if(tile == T_BON_PASSSHIPVP_3PW) { text1 = 'pass'; text2 = 'shipvp'; text3 = '+3pw'; }
  return renderBonusTile(px, py, tile, text1, text2, text3, onTileClick);
}

function renderFavorTile(px, py, tile, cult, num, text1, text2, onTileClick) {
  var el = makeDiv(px, py, hudElement);
  el.style.border = '1px solid #aaa';
  el.style.width = 70;
  el.style.height = 60;
  el.style.backgroundColor = '#eedd00';
  var cultcolor = getCultColor(cult);
  var culttext = num == 1 ? 'o' : num == 2 ? 'oo' : 'ooo';
  var text1el = makeDiv(px + 5, py + 5, hudElement);
  text1el.style.color = 'black';
  text1el.style.backgroundColor = cultcolor;
  text1el.innerHTML = culttext;
  var text2el = makeDiv(px + 5, py + 25, hudElement);
  text2el.innerHTML = text1;
  var text3el = makeDiv(px + 5, py + 40, hudElement);
  text3el.innerHTML = text2;

  if(onTileClick) {
    var elui = makeSameSizeDiv(el, hudElement);
    elui.style.cursor = 'pointer';
    elui.onclick = function() {
      onTileClick(tile);
    };
    IEClickHack(elui);
    elui.title = tileToHelpString(tile, true);
  }

  return [71, 61];
}

function drawFavorTile(px, py, tile, onTileClick) {
  var text1 = '';
  var text2 = '';
  var num;
  var cult;
  if(tile == T_FAV_3F) { num = 3; cult = C_F; }
  else if(tile == T_FAV_3W) { num = 3; cult = C_W; }
  else if(tile == T_FAV_3E) { num = 3; cult = C_E; }
  else if(tile == T_FAV_3A) { num = 3; cult = C_A; }
  else if(tile == T_FAV_2F_6TW) { text1 = 'tw:'; text2 = 'size 6'; num = 2; cult = C_F; }
  else if(tile == T_FAV_2W_CULT) { text1 = 'act:'; text2 = 'cult'; num = 2; cult = C_W; }
  else if(tile == T_FAV_2E_1PW1W) { text1 = '+1pw'; text2 = '+1w'; num = 2; cult = C_E; }
  else if(tile == T_FAV_2A_4PW) { text1 = '+4pw'; num = 2; cult = C_A; }
  else if(tile == T_FAV_1F_3C) { text1 = '+3c'; num = 1; cult = C_F; }
  else if(tile == T_FAV_1W_TPVP) { text1 = 'tp: 3vp'; num = 1; cult = C_W; }
  else if(tile == T_FAV_1E_DVP) { text1 = 'd: 2vp'; num = 1; cult = C_E; }
  else if(tile == T_FAV_1A_PASSTPVP) { text1 = 'tp pass'; text2 = '[2,3,3,4]'; num = 1; cult = C_A; }
  return renderFavorTile(px, py, tile, cult, num, text1, text2, onTileClick);
}

function renderRoundTile(px, py, tile, cult, num, text1, text2, index) {
  var el = makeDiv(px, py, hudElement);
  el.style.border = '1px solid black';
  el.style.width = 70;
  el.style.height = 60;
  if(index > state.round) el.style.backgroundColor = '#88a';
  else if(index == state.round && state.type != S_GAME_OVER) el.style.backgroundColor = '#88ff88';
  else el.style.backgroundColor = '#444444';

  el.title = tileToHelpString(tile, true);

  var text2el = makeDiv(px + 5, py + 5, hudElement);
  text2el.innerHTML = text1;

  if(index != 6) {
    var cultcolor = getCultColor(cult);
    var culttext = num == 1 ? 'o' : num == 2 ? 'oo' : num == 3 ? 'ooo' : 'oooo';
    var text1el = makeDiv(px + 5, py + 25, hudElement);
    text1el.style.color = 'black';
    text1el.style.backgroundColor = cultcolor;
    text1el.innerHTML = culttext;
    var text3el = makeDiv(px + 5, py + 40, hudElement);
    text3el.innerHTML = text2;
  }

  var text4el = makeDiv(px + 1, py - 12, hudElement);
  text4el.innerHTML = 'round ' + index;

  return [71, 61];
}

function drawRoundTile(px, py, tile, index) {
  var text1 = '';
  var text2 = '';
  var num;
  var cult;

  if(tile == T_ROUND_DIG2VP_1E1C) { text1 = 'dig:2VP'; text2 = '1C'; num = 1; cult = C_E; }
  else if(tile == T_ROUND_TW5VP_4E1DIG) { text1 = 'TW:5VP'; text2 = 'dig'; num = 4; cult = C_E; }
  else if(tile == T_ROUND_D2VP_4W1P) { text1 = 'D:2VP'; text2 = '1P'; num = 4; cult = C_W; }
  else if(tile == T_ROUND_SHSA5VP_2F1W) { text1 = 'S:5VP'; text2 = '1W'; num = 2; cult = C_F; }
  else if(tile == T_ROUND_D2VP_4F4PW) { text1 = 'D:2VP'; text2 = '4PW'; num = 4; cult = C_F; }
  else if(tile == T_ROUND_TP3VP_4W1DIG) { text1 = 'TP:3VP'; text2 = 'dig'; num = 4; cult = C_W; }
  else if(tile == T_ROUND_SHSA5VP_2A1W) { text1 = 'S:5VP'; text2 = '1W'; num = 2; cult = C_A; }
  else if(tile == T_ROUND_TP3VP_4A1DIG) { text1 = 'TP:3VP'; text2 = 'dig'; num = 4; cult = C_A; }
  else return [0, 0];
  return renderRoundTile(px, py, tile, cult, num, text1, text2, index);
}

//returns draw width
function drawTile(px, py, tile, onTileClick, index) {
  if(tile > T_FAV_BEGIN && tile < T_FAV_END) return drawFavorTile(px, py, tile, onTileClick);
  else if(tile > T_BON_BEGIN && tile < T_BON_END) return drawBonusTile(px, py, tile, onTileClick);
  else if(tile > T_TW_BEGIN && tile < T_TW_END) return drawTownTile(px, py, tile, onTileClick);
  else if(tile > T_ROUND_BEGIN && tile < T_ROUND_END) return drawRoundTile(px, py, tile, index);
  else return [0,0];
}

//returns draw width
//ui: whether it's the clickable ones that need ui click elements on them
function drawTilesMap(px, py, tiles, maxWidth, startX, onTileClick) {
  var px2 = 0;
  var py2 = 0;
  var i = 0;
  for (var tile in tiles) {
    if (tiles.hasOwnProperty(tile) && tiles[tile] > 0) {
      if (tiles[tile] > 1) addText(px + px2, py + py2 - 12, tiles[tile] + 'x');
      var size = drawTile(px + px2, py + py2, tile, onTileClick, i);
      if(px2 + size[0] + 5 > maxWidth) {
        px2 = (startX - px);
        py2 += size[1] + 14;
      } else {
        px2 += size[0] + (size[0] == 0 ? 0 : 5);
      }
      i++;
    }
  }
  return [px2, py2];
}

function drawTilesArray(px, py, tiles, maxWidth, startX, onTileClick) {
  var px2 = 0;
  var py2 = 0;
  for (var i = 0; i < tiles.length; i++) {
    var size = drawTile(px + px2, py + py2, tiles[i], onTileClick, i);
    if(px2 + size[0] + 5 > maxWidth) {
      px2 = (startX - px);
      py2 += size[1] + 14;
    } else {
      px2 += size[0] + (size[0] == 0 ? 0 : 5);
    }
  }
  return [px2, py2];
}

//convert a cost array to a string, ignoring things that are 0.
function costToString(cost) {
  var result = '';
  if(cost[4] != 0) result += cost[4] + 'vp ';
  if(cost[3] != 0) result += cost[3] + 'pw ';
  if(cost[2] != 0) result += cost[2] + 'p ';
  if(cost[1] != 0) result += cost[1] + 'w ';
  if(cost[0] != 0) result += cost[0] + 'c ';
  return result;
}

function incomeToStringWithPluses(cost) {
  var result = '';
  function signed(num) {
    return num < 0 ? '' + num : '+' + num;
  }
  if(cost[0] != 0) result += signed(cost[0]) + 'c ';
  if(cost[1] != 0) result += signed(cost[1]) + 'w ';
  if(cost[2] != 0) result += signed(cost[2]) + 'p ';
  if(cost[3] != 0) result += signed(cost[3]) + 'pw ';
  if(cost[4] != 0) result += signed(cost[4]) + 'vp ';
  if(result.length > 0 && result.charAt(result.length - 1) == ' ') result = result.substring(0, result.length - 1);
  return result;
}

//for displaying TP cost
function costAlternativesToString(cost1, cost2) {
  var result = '';
  if(cost1[4] != cost2[4]) result += cost1[4] + '/' + cost2[1] + 'vp ';
  else if(cost1[4] != 0) result += cost1[4] + 'vp ';
  if(cost1[3] != cost2[3]) result += cost1[3] + '/' + cost2[1] + 'pw ';
  else if(cost1[3] != 0) result += cost1[3] + 'pw ';
  if(cost1[2] != cost2[2]) result += cost1[2] + '/' + cost2[1] + 'p ';
  else if(cost1[2] != 0) result += cost1[2] + 'p ';
  if(cost1[1] != cost2[1]) result += cost1[1] + '/' + cost2[1] + 'w ';
  else if(cost1[1] != 0) result += cost1[1] + 'w ';
  if(cost1[0] != cost2[0]) result += cost1[0] + '/' + cost2[0] + 'c ';
  else if(cost1[0] != 0) result += cost1[0] + 'c ';
  return result;
}

function getFullVPDetailsText(player) {
  var vpbreakdown = '';
  for(name in player.vp_detail) {
    vpbreakdown += name + ':' + player.vp_detail[name] + ' \n';
  }
  return 'VP:' + player.vp + ' \n' + vpbreakdown;
}

function dangerColor(danger, text) {
  return danger ? '<font color="red">' + text + '</font>' : text;
}

function drawPlayerPanel(px, py, player, scoreProjection) {
  var bg = makeSizedDiv(px - 5, py - 5, 1073, 185, hudElement)
  bg.style.border = player == players[0] ? '2px solid black' : '1px solid black';
  bg.style.backgroundColor = '#fff0e0';

  function drawDigCircle(px, py) {
    var num = LANDSCAPE_END - LANDSCAPE_BEGIN + 1;
    var b = LANDSCAPE_BEGIN;
    drawOrb(px + 0, py + 0, player.color);
    drawOrb(px + 16, py + 8, b + (player.color + 1 - b) % num);
    drawOrb(px + -16, py + 8, b + (player.color + 6 - b) % num);
    drawOrb(px + 20, py + 25, b + (player.color + 2 - b) % num);
    drawOrb(px + -20, py + 25, b + (player.color + 5 - b) % num);
    drawOrb(px + 9, py + 39, b + (player.color + 3 - b) % num);
    drawOrb(px + -9, py + 39, b + (player.color + 4 - b) % num);
  }
  var playertext = addText(px, py, getFullName(player));
  var imColor = getImageColor(player.color);
  if(player.passed) {
    playertext.style.backgroundColor = getTranslucentColor(imColor, 64);
    playertext.style.color = getTranslucentColor(getHighContrastColor(imColor), 128);
  } else {
    playertext.style.backgroundColor = imColor;
    playertext.style.color = getHighContrastColor(imColor);
  }

  
  var vptext = addText(px, py + 15, 'VP: ' + player.vp);
  vptext.title = getFullVPDetailsText(player);
  vptext.style.fontWeight = 'bold';
  var passedtext = ''
  if(player.passed && player.index == state.startPlayer) passedtext += 'passed, start';
  else if(player.passed) passedtext += 'passed';
  else if(player.index == state.startPlayer) passedtext += 'start';
  addText(px + 130, py , passedtext);
  addText(px, py + 30, 'res: ' + player.c + ' c, ' + player.w + ' w, '
      + player.p + '/' + player.pp + ' p, '
      + player.pw0 + '/' + player.pw1 + '/' + player.pw2 + ' pw ');
  
  addText(px, py + 45, 'D: ' + dangerColor(player.b_d == 0, built_d(player) + '/8') + ' cost: ' + costToString(getBuildingCost(player.faction, B_D, false)) +
      ' next: ' + costToString(getIncomeForNextBuilding(player, B_D)));
  addText(px, py + 60, 'TP: ' + dangerColor(player.b_tp == 0, built_tp(player) + '/4') + ' cost: ' +
      costAlternativesToString(getBuildingCost(player.faction, B_TP, true), getBuildingCost(player.faction, B_TP, false)) +
      ' next: ' + costToString(getIncomeForNextBuilding(player, B_TP)));
  addText(px, py + 75, 'TE: ' + dangerColor(player.b_te == 0, built_te(player) + '/3') + ' cost: ' + costToString(getBuildingCost(player.faction, B_TE, true)) +
      ' next: ' + costToString(getIncomeForNextBuilding(player, B_TE)));
  addText(px, py + 90, 'SH: ' + built_sh(player) + '/1 cost: ' + costToString(getBuildingCost(player.faction, B_SH, true)) +
      ' next: ' + costToString(getIncomeForNextBuilding(player, B_SH)));
  addText(px, py + 105, 'SA: ' + built_sa(player) + '/1 cost: ' + costToString(getBuildingCost(player.faction, B_SA, true)) +
      ' next: ' + costToString(getIncomeForNextBuilding(player, B_SA)));

      
  if(player.maxdigging > 0) addText(px, py + 120, 'digging: <b>' + player.digging + '</b> (' + player.digging + '/' + player.maxdigging + ') advcost: ' + costToString(getAdvanceDigCost(player.faction)));
  else addText(px, py + 120, 'digging: N/A');
  if(player.maxshipping > 0) addText(px, py + 135, 'shipping: <b>' + getShipping(player) + '</b> (' + player.shipping + '/' + player.maxshipping + (player.bonusshipping ? ' + ' + player.bonusshipping : '') + ') advcost: ' + costToString(getAdvanceShipCost(player.faction)));
  else if(player.maxtunnelcarpetdistance > 0) addText(px, py + 135, 'range: <b>' + player.tunnelcarpetdistance + '/' + player.maxtunnelcarpetdistance);
  else addText(px, py + 135, 'shipping: N/A');

  if(state.round == 6 && state.type != S_GAME_OVER) {
    var p = scoreProjection[player.index];
    addText(px, py + 150, 'projected end vp: <b>' + p[0] + '</b> (current: ' + player.vp + ', cult: ' + p[1] + ', netw: ' + p[2] + ', res: ' + p[3] + ', pass: ' + p[4] + ')');
  } else {
    var income = getIncome(player, player.passed /*display bonus tile income only when passed*/, state.round);
    var dangerp = income[2] > player.pp - player.p;
    var dangerpw = income[3] > player.pw0 * 2 + player.pw1;

    addText(px, py + 150, 'income: ' + income[0] + ' c, ' + income[1] + ' w, ' +
        dangerColor(dangerp, income[2] + ' p') + ', ' + dangerColor(dangerpw, income[3] + ' pw'));
  }

  addText(px, py + 165, 'octogons: ').title = 'the actions with an action token this player has exclusive access to (striked through when already used this round)';
  var actionsText = '';
  function addActionText(octogon) {
    var name = getActionName(octogon);
    var taken = player.octogons[octogon];
    actionsText += (taken ? '<span style="text-decoration: line-through">' + name + '</span>' : name) + ' ';
  }
  if(player.bonustile == T_BON_SPADE_2C) addActionText(A_BONUS_SPADE);
  if(player.bonustile == T_BON_CULT_4C) addActionText(A_BONUS_CULT);
  if(player.favortiles[T_FAV_2W_CULT]) addActionText(A_FAVOR_CULT);
  if(built_sh(player)) {
    if(player.faction == F_CHAOS) addActionText(A_DOUBLE);
    if(player.faction == F_GIANTS) addActionText(A_GIANTS_2SPADE);
    if(player.faction == F_NOMADS) addActionText(A_SANDSTORM);
    if(player.faction == F_SWARMLINGS) addActionText(A_SWARMLINGS_TP);
    if(player.faction == F_AUREN) addActionText(A_AUREN_CULT);
    if(player.faction == F_WITCHES) addActionText(A_WITCHES_D);
  }
  addText(px + 70, py + 165, actionsText);

  drawDigCircle(px + 280, py + 20);

  var bonustiles = {};
  if(player.bonustile) bonustiles[player.bonustile] = 1;

  var px2 = 0;
  var py2 = 0;
  var co;

  co = drawTilesMap(px + 320 + px2, py + 10 + py2, bonustiles, 600 - px2, px + 320, null);
  px2 += co[0] + 5;
  if(co[1] != 0 && py2 == 0) { py2 = 80; }

  co = drawTilesMap(px + 320 + px2, py + 10 + py2, player.favortiles, 600 - px2, px + 320, null);
  px2 += co[0] + 5;
  if(co[1] != 0 && py2 == 0) { py2 = 80;}

  co = drawTilesMap(px + 320 + px2, py + 10 + py2, player.towntiles, 600 - px2, px + 320, null);
}

//if onTileClick not null, added as onclick for the tile elements. Gets the tile as argument.
function drawHud2(players, onTileClickMain) {
  hudElement.innerHTML = '';
  var scoreProjection;
  if(state.round == 6) scoreProjection = projectEndGameScores();
  for(var i = 0; i < players.length; i++) drawPlayerPanel(10, 900 + 205 * i, players[i], scoreProjection);

  drawTilesArray(5, 520, roundtiles, 500, 5, onTileClickMain);
  drawTilesMap(5, 595, bonustiles, 500, 5, onTileClickMain);
  drawTilesMap(5, 675, towntiles, 500, 5, onTileClickMain);
  drawTilesMap(5, 735, favortiles, 450, 5, onTileClickMain);

  drawCultTracks(840, 40);
  drawHumanUI(563, 570, 0 /*playerIndex*/);
  if(state.type == S_GAME_OVER) drawEndGameScoring(ACTIONPANELX, ACTIONPANELY, 0 /*playerIndex*/);
}

function drawEndGameScoring(px, py) {
  var parent = hudElement;

  var bg = makeSizedDiv(px, py, ACTIONPANELW, ACTIONPANELH, parent);
  bg.style.backgroundColor = '#ffffff';
  bg.style.border = '1px solid black';
  actionEl.innerHTML = '';

  makeText(px + 5, py + 5, '<b>Game over</b> (detailed log is at the bottom of the web page)', parent);
  makeText(px + 5, py + 25, 'Final scores (hover for more details):', parent);

  var sorted = [];
  for(var i = 0; i < players.length; i++) {
    sorted[i] = players[i];
  }
  sorted.sort(function(a, b) {
    return b.vp - a.vp;
  });

  for(var i = 0; i < sorted.length; i++) {
    var p = sorted[i];
    var text = getFullNameColored(sorted[i]) + ': <b>' + p.vp + '</b>';
    makeText(px + 5, py + 40 + 16 * i, text, parent).title = getFullVPDetailsText(sorted[i]);
    var vp_game = p.getVPFor('start') + p.getVPFor('round') + p.getVPFor('town') + p.getVPFor('favor') + p.getVPFor('bonus') + p.getVPFor('faction') + p.getVPFor('advance') + p.getVPFor('leech');
    var cultvp = '[' + p.getVPForDetail('fire') + ',' + p.getVPForDetail('water') + ',' + p.getVPForDetail('earth') + ',' + p.getVPForDetail('air') + ']';
    if(cultvp.length < 5) cultvp = p.getVPFor('cult');
    var text2 = ' cult:' + cultvp + ' netw:' + p.getVPFor('network') + ' res:' + p.getVPFor('resources') + ' game:' + vp_game;
    makeText(px + 200, py + 40 + 16 * i, text2, parent).title = getFullVPDetailsText(sorted[i]);
  }
}

function makeHtmlTextWithColors(text, fgcolor, bgcolor) {
  return '<span style="color: ' + fgcolor + '; background-color:' + bgcolor + '">' + text + '</span>';
}

//summary near the actions panel so that you don't have to look at other parts of the screen to see your resources etc...
function drawSummary(px, py, playerIndex) {
  var parent = hudElement;

  makeText(px, py, 'Players: ', parent);
  var playerText = '';

  for(var i = 0; i < players.length; i++) {
    var fgcolor;
    var bgcolor;
    var player = players[i];
    var imColor = getImageColor(player.color);
    if(player.passed) {
      bgcolor = getTranslucentColor(imColor, 64);
      fgcolor = getTranslucentColor(getHighContrastColor(imColor), 128);
    } else {
      bgcolor = imColor;
      fgcolor = getHighContrastColor(imColor);
    }
    var name = getFactionCodeName(player.faction) + ' ' + player.vp;
    if(player == players[state.currentPlayer]) name += '*';
    if(player == players[state.startPlayer]) name += ' [S]';
    playerText += makeHtmlTextWithColors(name, fgcolor, bgcolor) + ' ';
  }
  makeText(px + 60, py, playerText, parent);


  makeText(px, py + 16, 'Taken: ', parent).title = 'list of octogon-actions taken this round. Includes the faction specific actions of other players';
  var octotext = '';
  // Public octogons
  for(var i = A_BEGIN + 1; i < A_END; i++) {
    if(octogons[i]) octotext += getActionName(i) + ' ';
  }
  // Personal octogons
  for(var i = A_BEGIN + 1; i < A_END; i++) {
    if(players[playerIndex].octogons[i]) octotext += getActionName(i) + ' ';
  }
  // Faction octogons of other players
  for(var j = 0; j < players.length; j++) {
    if(j == playerIndex) continue;
    for(var i = A_BEGIN + 1; i < A_END; i++) {
      if(isFactionOctogonAction(i) && players[j].octogons[i]) octotext += getActionName(i) + ' ';
    }
  }
  makeText(px + 50, py + 16, octotext, parent).style.textDecoration = 'line-through';


  var player = players[playerIndex];
  addText(px, py + 32, 'Resources: <b>' +  player.c + ' c, ' + player.w + ' w, ' +
      player.p + '/' + player.pp + ' p, ' +
      player.pw0 + '/' + player.pw1 + '/' + player.pw2 + ' pw' + '</b>');
  addText(px, py + 48, 'Buildings: <b>' + dangerColor(player.b_d == 0, (8 - player.b_d) + '/8 D') + ', ' +
      dangerColor(player.b_tp == 0, (4 - player.b_tp) + '/4 TP') + ', ' +
      dangerColor(player.b_te == 0, (3 - player.b_te) + '/3 TE') + ', ' +
      (1 - player.b_sh) + '/1 SH, ' + (1 - player.b_sa) + '/1 SA' + '</b>');
  addText(px, py + 64, 'Advances: <b>dig: ' + player.digging + ', ship: ' + player.shipping + '</b>');
  var income = getIncome(player, player.passed /*display bonus tile income only when passed*/, state.round);
  var dangerp = income[2] > player.pp - player.p;
  var dangerpw = income[3] > player.pw0 * 2 + player.pw1;
  if(state.round != 6) {
    addText(px, py + 80, 'Income: &nbsp;&nbsp;&nbsp;<b>' + income[0] + ' c, ' + income[1] + ' w, ' +
        dangerColor(dangerp, income[2] + ' p') + ', ' + dangerColor(dangerpw, income[3] + ' pw') + '</b>');
  }
}

function makeExecButton(player, x, y, parent, executButtonFun, title) {
  var execbutton = makeButton(x, y, 'execute', parent, executeButtonFun, title);
  if(player.color) execbutton[0].style.backgroundColor = getImageColor(player.color); //give the execute button the player's faction color
  if(player.color == Y || player.color == S) execbutton[1].style.color = 'black';
}


var ACTIONPANELX = 0;
var ACTIONPANELY = 0;
var ACTIONPANELW = 0;
var ACTIONPANELH = 0;

function drawHumanUI(px, py, playerIndex) {
  var parent = hudElement;
  var player = players[playerIndex];

  ACTIONPANELX = px - 5;
  ACTIONPANELY = py - 5;
  ACTIONPANELW = 520;
  ACTIONPANELH = 150;
  var bg = makeSizedDiv(ACTIONPANELX, ACTIONPANELY, ACTIONPANELW, ACTIONPANELH, parent).style.border = '1px solid black';

  if(showingNextButtonPanel) {
    var bg = makeSizedDiv(ACTIONPANELX, ACTIONPANELY, ACTIONPANELW, ACTIONPANELH, hudElement);
    bg.style.backgroundColor = 'white';
    bg.style.border = '1px solid black';
    var cx = ACTIONPANELX + ACTIONPANELW / 2;
    var cy = ACTIONPANELY + ACTIONPANELH / 2;
    var button = makeButton(cx - 105, cy - 16, 'Next', hudElement, nextButtonFun, 'Next player');
    var buttonFast = makeButton(cx + 5, cy - 16, 'Fast', hudElement, fastButtonFun, 'Go fast: all AI players take their action without interruption until it\'s your turn again.');
    var buttonFastest = makeLinkButton(ACTIONPANELX + ACTIONPANELW - 60, ACTIONPANELY + ACTIONPANELH - 16, 'Fastest', hudElement);
    buttonFastest.title = 'Makes it go fast forever, never see the Next button again, but never see the AI actions one by one anymore either';
    buttonFastest.onclick = fastestButtonFun;
  }
  else if(state.type == S_ACTION && humanstate == HS_MAIN && state.currentPlayer == 0 /*human*/) {
    drawPlayerActions(px, py, playerIndex, parent);
  } else {
    var cx = ACTIONPANELX + ACTIONPANELW / 2;
    var cy = ACTIONPANELY + ACTIONPANELH / 2;
    if(state.type == S_INIT_DWELLING) {
      //draw dwelling to indicate your color
      drawIcon(cx, cy, 0, player.color, parent);
      drawIcon(cx, cy, B_D, player.color, parent);
      makeText(px, py + 2, 'click a valid location on the map to continue', parent);
    }
    else if(humanstate == HS_DIG) {
      var ptype = pactions.length > 0 ? pactions[pactions.length - 1].type : A_NONE; //previous action type

      var button;
      var ry = py + 5;

      if(state.type != S_ROUND_END_DIG) {
        button = makeLinkButton(px + 16, ry, 'transform & build', parent);
        button.onclick = function() { digAndBuildMode = DBM_BUILD; drawHud(); };
        button.title = 'Build a dwelling. First transforms the landscape to your color if needed.';
        if(digAndBuildMode == DBM_BUILD) makeText(px, ry, '>', parent);
        ry += 24;
      }

      if(state.type != S_ROUND_END_DIG || player.faction == F_GIANTS) {
        button = makeLinkButton(px + 16, ry, 'transform full', parent);
        button.onclick = function() { digAndBuildMode = DBM_COLOR; drawHud(); };
        button.title = 'Transforms the landscape to your color.';
        if(digAndBuildMode == DBM_COLOR) makeText(px, ry, '>', parent);
        ry += 24;
      }

      if(player.faction != F_GIANTS && ptype != A_SANDSTORM) {
        button = makeLinkButton(px + 16, ry, 'transform once', parent);
        button.onclick = function() { digAndBuildMode = DBM_ONE; drawHud(); };
        button.title = 'Transforms the landscape one step towards your color.';
        if(digAndBuildMode == DBM_ONE) makeText(px, ry, '>', parent);
        ry += 24;

        button = makeLinkButton(px + 16, ry, 'anti-transform', parent);
        button.onclick = function() { digAndBuildMode = DBM_ANTI; drawHud(); };
        button.title = 'Transforms the landscape in the opposite direction.';
        if(digAndBuildMode == DBM_ANTI) makeText(px, ry, '>', parent);
        ry += 24;
      }

      if(state.type != S_ROUND_END_DIG) {
        button = makeLinkButton(px + 16, ry, 'stop', parent);
        button.onclick = function() { clearHumanState(); };
        button.title = 'Cancel digging.';
        ry += 24;
      } else {
        var execbutton = makeExecButton(players[playerIndex], px + 410, py + 100, parent, executeButtonFun, 'Execute round bonus digs.');
      }
    }
    else if(humanstate == HS_MAP) {
      drawIcon(cx, cy, 0, player.color, parent);
      makeText(px, py + 2, 'click a valid location on the map to continue', parent);
    }
    else if(humanstate == HS_CULT) {
      makeText(px, py + 2, 'click on a cult track, right of the map, to continue', parent);
      //TODO: draw something better to indicate cult
      //makeText(cx - 20, cy, 'cult', parent);
      drawOrb(cx - 20, cy, R);
      drawOrb(cx - 5, cy, B);
      drawOrb(cx + 10, cy, U);
      drawOrb(cx + 25, cy, S);
    }
    else if(humanstate == HS_BONUS_TILE) {
      makeText(px, py + 2, 'click on a bonus tile on the left to continue. An example is shown below.', parent);
      renderBonusTile(cx - 30, cy - 32, T_NONE, '', '?', '', undefined);
    }
    else if(humanstate == HS_FAVOR_TILE) {
      makeText(px, py + 2, 'click on a favor tile on the left to continue. An example is shown below.', parent);
      renderFavorTile(cx - 30, cy - 32, T_NONE, C_F, 0, '?', '', undefined);
    }
    else if(humanstate == HS_TOWN_TILE) {
      makeText(px, py + 2, 'click on a town tile on the left to continue. An example is shown below.', parent);
      renderTownTile(cx - 30, cy - 32, T_NONE, 0, '?', undefined);
    }
  }

  if(players.length > 0) drawSummary(px, py + ACTIONPANELH + 5, playerIndex);
}

function drawPlayerActions(px, py, playerIndex, parent /*parent DOM element*/) {
  //an action that doesn't require coordinates or other parameters
  function addSimpleActionButton(px, py, name, actiontype) {
    var button = makeLinkButton(px, py, name, parent);
    var action = new Action(actiontype);
    button.onclick = function() {
      prepareAction(action);
      //drawMap();
      //drawHud();
    };
    return button;
  }

  var button;

  makeText(px, py, 'POWER:', parent);
  if(!octogons[A_POWER_BRIDGE]) {
    button = makeLinkButton(px + 90, py, getActionName(A_POWER_BRIDGE), parent);
    button.title = '3pw to build a bridge';
    button.style.backgroundColor = '#ff4';
    button.onclick = function() {
      letClickMapForBridge(new Action(A_POWER_BRIDGE));
    };
  }
  if(!octogons[A_POWER_1P]) {
    button = makeLinkButton(px + 170, py, getActionName(A_POWER_1P), parent);
    button.title = '3pw to get a priest';
    button.style.backgroundColor = '#ff4';
    button.onclick = function() {
      prepareAction(new Action(A_POWER_1P));
    };
  }
  if(!octogons[A_POWER_2W]) {
    button = makeLinkButton(px + 220, py, getActionName(A_POWER_2W), parent);
    button.title = '4pw to get 2 workers';
    button.style.backgroundColor = '#ff4';
    button.onclick = function() {
      prepareAction(new Action(A_POWER_2W));
    };
  }
  if(!octogons[A_POWER_7C]) {
    button = makeLinkButton(px + 275, py, getActionName(A_POWER_7C), parent);
    button.title = '4pw to get 7 coins';
    button.style.backgroundColor = '#ff4';
    button.onclick = function() {
      prepareAction(new Action(A_POWER_7C));
    };
  }
  if(!octogons[A_POWER_SPADE]) {
    button = makeLinkButton(px + 330, py, 'pow1dig', parent);
    button.title = '4pw to get 1 spade. Note: by default also builds where you click, use the selector to change to other transform actions.';
    button.style.backgroundColor = '#ff4';
    button.onclick = function() {
      prepareAction(new Action(A_POWER_SPADE));
      digAndBuildFun(DBM_BUILD, 'click where to dig & build');
    };
  }
  if(!octogons[A_POWER_2SPADE]) {
    button = makeLinkButton(px + 395, py, 'pow2dig', parent);
    button.title = '6pw to get 2 spades. Note: by default also builds where you click, use the selector to change to other transform actions.';
    button.style.backgroundColor = '#ff4';
    button.onclick = function() {
      prepareAction(new Action(A_POWER_2SPADE));
      digAndBuildFun(DBM_BUILD, 'click where to dig & build');
    };
  }

  makeText(px, py + 16, 'CONVERT: ', parent);
  addSimpleActionButton(px + 90, py+16, 'burn', A_BURN).title = 'sacrifice power from second bowl to get one in your main bowl';
  addSimpleActionButton(px+130, py+16, 'pw->c', A_CONVERT_1PW_1C);
  addSimpleActionButton(px+180, py+16, 'pw->w', A_CONVERT_3PW_1W);
  addSimpleActionButton(px+235, py+16, 'pw->p', A_CONVERT_5PW_1P);
  addSimpleActionButton(px+290, py+16, 'p->w', A_CONVERT_1P_1W);
  addSimpleActionButton(px+330, py+16, 'w->c', A_CONVERT_1W_1C);
  
  makeText(px, py + 32, 'PRIEST: ', parent);

  var sendPriestFun = function(type) {
    var fun = function(cult) {
      clearHumanState();
      var action = new Action(type);
      action.cult = cult;
      prepareAction(action);
    };
    setHumanState(HS_CULT, 'choose which cult track to send the priest to', fun);
  }
  var sendPriestAutoFun = function(type) {
    var fun = function(cult) {
      clearHumanState();
      var type = A_CULT_PRIEST1;
      if(players[playerIndex].cult[cult] >= 9) type = A_CULT_PRIEST1; //if already at 9, don't permanently waste a priest
      else if(cultp[cult][0] == N) type = A_CULT_PRIEST3;
      else if(cultp[cult][3] == N) type = A_CULT_PRIEST2;
      var action = new Action(type);
      action.cult = cult;
      prepareAction(action);
    };
    setHumanState(HS_CULT, 'choose which cult track to send the priest to', fun);
  }
  
  var priestbutton = makeLinkButton(px + 90, py + 32, 'cult', parent);
  priestbutton.onclick = sendPriestAutoFun;
  priestbutton.title = 'send priest to highest free value on a cult track';
  var priest1button = makeLinkButton(px + 140, py + 32, getActionName(A_CULT_PRIEST1), parent);
  priest1button.onclick = bind(sendPriestFun, A_CULT_PRIEST1);
  var priest2button = makeLinkButton(px + 190, py + 32, getActionName(A_CULT_PRIEST2), parent);
  priest2button.onclick = bind(sendPriestFun, A_CULT_PRIEST2);
  var priest3button = makeLinkButton(px + 240, py + 32, getActionName(A_CULT_PRIEST3), parent);
  priest3button.onclick = bind(sendPriestFun, A_CULT_PRIEST3);
  
  makeText(px, py + 48, 'TRANSFORM: ', parent);

  function addDigButton(px, py, text, num, type) {
    var digbutton = makeLinkButton(px, py, text, parent);
    digbutton.onclick = function() {
      prepareAction(new Action(type));
      digAndBuildFun(DBM_BUILD, 'click where to dig & build');
    };
    return digbutton;
  }
  var build2button = makeLinkButton(px + 90, py + 48, 'dig&build', parent);
  build2button.title = 'Dig on terrain and build, or other terrain transformation actions.';
  build2button.style.color = 'brown';
  build2button.onclick = bind(digAndBuildFun, DBM_BUILD, 'click where to dig&build');

  var build3button = makeLinkButton(px + 175, py + 48, 'dig', parent);
  build3button.title = 'Dig on terrain with various transformation actions. Same as dig&build, except it defaults the selector to another action than transform&build.';
  build3button.style.color = 'brown';
  build3button.onclick = bind(digAndBuildFun, digAndBuildMode == DBM_BUILD ? DBM_COLOR : digAndBuildMode, 'click where to dig');


  var buildbutton = makeLinkButton(px + 210, py + 48, getActionName(A_BUILD), parent);
  buildbutton.title = 'build a dwelling (D) on a tile that is already your color';
  buildbutton.style.color = 'brown';
  buildbutton.onclick = function() {
    var fun = function(x, y) {
      clearHumanState();
      var action = new Action(A_BUILD);
      action.co = [x, y];
      prepareAction(action);
    };
    setHumanState(HS_MAP, 'click where to build dwelling', fun);
  };
  
  makeText(px, py + 64, 'UPGRADE: ', parent);
  var upgr1button = makeLinkButton(px + 90, py + 64, 'upgr1', parent);
  upgr1button.title = 'upgrade to trading post (TP) or to stronghold (SH)';
  upgr1button.onclick = upgrade1fun;
  var upgr2button = makeLinkButton(px + 140, py + 64, 'upgr2', parent);
  upgr2button.title = 'upgrade to temple (TE) or to sanctuary (SA)';
  upgr2button.onclick = upgrade2fun;

  makeText(px, py + 80, 'ADVANCE: ', parent);
  addSimpleActionButton(px + 90, py + 80, getActionName(A_ADV_DIG), A_ADV_DIG);
  addSimpleActionButton(px + 170, py + 80, getActionName(A_ADV_SHIP), A_ADV_SHIP);

  var px2;

  makeText(px, py + 96, 'TILES: ', parent);
  function addCultButton(px, py, text, num, type) {
    var button = makeLinkButton(px, py, text, parent);
    button.onclick = function() {
      var fun = function(cult) {
        clearHumanState();
        var action = new Action(type);
        action.cult = cult;
        prepareAction(action);
      };
      setHumanState(HS_CULT, 'click on which cult track to increase', fun);
    };
    return button;
  }
  px2 = px + 90;
  if(players[playerIndex].bonustile == T_BON_SPADE_2C && !players[playerIndex].octogons[A_BONUS_SPADE]) {
    button = addDigButton(px2, py + 96, getActionName(A_BONUS_SPADE), 1, A_BONUS_SPADE);
    button.style.color = 'red';
    button.title = 'dig action from the bonus dig tile. Note: by default also builds where you click, use the selector to change to other transform actions.';
    px2 += 75;
  }
  if(players[playerIndex].bonustile == T_BON_CULT_4C && !players[playerIndex].octogons[A_BONUS_CULT]) {
    button = addCultButton(px2, py + 96, getActionName(A_BONUS_CULT), 1, A_BONUS_CULT);
    button.style.color = 'red';
    button.title = 'cult action from the bonus cult tile';
    px2 += 60;
  }
  if(players[playerIndex].favortiles[T_FAV_2W_CULT] && !players[playerIndex].octogons[A_FAVOR_CULT]) {
    button = addCultButton(px2, py + 96, getActionName(A_FAVOR_CULT), 1, A_FAVOR_CULT);
    button.style.color = 'red';
    button.title = 'cult action from the favor cult tile';
    px2 += 60;
  }

  makeText(px, py + 112, 'FACTION: ', parent);
  px2 = px + 90;
  if(players[playerIndex].faction == F_CHAOS && players[playerIndex].b_sh == 0 && !players[playerIndex].octogons[A_DOUBLE]) {
    button = addSimpleActionButton(px2, py + 112, getActionName(A_DOUBLE), A_DOUBLE);
    button.style.color = 'red';
    button.title = 'cult action from the favor cult tile';
    px2 += 60;
  }
  if(players[playerIndex].faction == F_GIANTS && players[playerIndex].b_sh == 0 && !players[playerIndex].octogons[A_GIANTS_2SPADE]) {
    button = addDigButton(px2, py + 112, getActionName(A_GIANTS_2SPADE), 1, A_GIANTS_2SPADE);
    button.style.color = 'red';
    button.title = 'giants dig. Note: by default also builds where you click, use the selector to change to other transform actions.';
    px2 += 90;
  }
  if(players[playerIndex].faction == F_NOMADS && players[playerIndex].b_sh == 0 && !players[playerIndex].octogons[A_SANDSTORM]) {
    button = makeLinkButton(px2, py + 112, getActionName(A_SANDSTORM), parent);
    button.style.color = 'red';
    button.title = 'sandstorm. Note: by default also builds where you click, use the selector to change to other transform actions.';
    button.onclick = function() {
      prepareAction(new Action(A_SANDSTORM));
      digAndBuildFun(DBM_BUILD, 'click where to sandstorm & build');
    };
    px2 += 60;
  }
  if(players[playerIndex].faction == F_ALCHEMISTS) {
    button = addSimpleActionButton(px2, py + 112, getActionName(A_CONVERT_1VP_1C), A_CONVERT_1VP_1C);
    px2 += 60;
  }
  if(players[playerIndex].faction == F_MERMAIDS) {
    button = makeLinkButton(px2, py + 112, getActionName(A_CONNECT_WATER_TOWN), parent);
    button.title = 'form a town with the mermaids special ability, by clicking a water tile. This can be done whenever your current action sequence will form a town.';
    button.onclick = function() {
      var fun = function(x, y) {
        clearHumanState();
        if(getWorld(x, y) != I) return;
        var a = new Action(A_CONNECT_WATER_TOWN);
        a.co = [x, y];
        prepareAction(a);
      };
      setHumanState(HS_MAP, 'click where to form water town', fun);
    };
    px2 += 60;
  }
  if(players[playerIndex].faction == F_AUREN && players[playerIndex].b_sh == 0 && !players[playerIndex].octogons[A_AUREN_CULT]) {
    button = addCultButton(px2, py + 112, getActionName(A_AUREN_CULT), 2, A_AUREN_CULT);
    button.style.color = 'red';
    button.title = 'cult action from the auren';
    px2 += 60;
  }
  if(players[playerIndex].faction == F_SWARMLINGS && players[playerIndex].b_sh == 0 && !players[playerIndex].octogons[A_SWARMLINGS_TP]) {
    button = makeLinkButton(px2, py + 112, getActionName(A_SWARMLINGS_TP), parent);
    button.style.color = 'red';
    button.onclick = function() {
      var fun = function(x, y) {
        clearHumanState();
        var action2 = new Action(A_SWARMLINGS_TP);
        action2.co = [x, y];
        prepareAction(action2);
      };
      setHumanState(HS_MAP, 'click dwelling to upgrade', fun);
    };
    px2 += 60;
  }
  if(players[playerIndex].faction == F_WITCHES && players[playerIndex].b_sh == 0 && !players[playerIndex].octogons[A_WITCHES_D]) {
    button = makeLinkButton(px2, py + 112, getActionName(A_WITCHES_D), parent);
    button.style.color = 'red';
    button.onclick = function() {
      var fun = function(x, y) {
        clearHumanState();
        var action2 = new Action(A_WITCHES_D);
        action2.co = [x, y];
        prepareAction(action2);
      };
      setHumanState(HS_MAP, 'click where to fly and build free dwelling', fun);
    };
    px2 += 60;
  }
  if(players[playerIndex].faction == F_ENGINEERS) {
    button = makeLinkButton(px2, py + 112, getActionName(A_ENGINEERS_BRIDGE), parent);
    button.title = '2wto build a bridge';
    button.onclick = function() {
      letClickMapForBridge(new Action(A_ENGINEERS_BRIDGE));
    };
    px2 += 60;
  }

  makeText(px, py + 128, 'PASS: ', parent);
  var passbutton = makeLinkButton(px + 90, py + 128, getActionName(A_PASS), parent);
  passbutton.onclick = function() {
    prepareAction(new Action(A_PASS));
  };
  passbutton.title = 'Pass for this round. Click on a chosen bonus tile after this, then press execute';


  var execbutton = makeExecButton(players[playerIndex], px + 410, py + 100, parent, executeButtonFun, 'Execute chosen action sequence.\n\nOnly works while doing actions, not during other game decisions (such as leeching power or digging from round bonus).\n\nPress this button after choosing all actions from the left in the correct order. You may do multiple actions, but only one true turn action. For example, you can burn power or convert resources, then dig, then build, convert some more resources, then press execute. Or chaos magicians may do their double action move followed by two turn actions.\n\nIf it fails (e.g. not enough resources), the error message is shown and you can retry with a new action sequence.\n\nSome actions require clicking on the map, a cult track, favor or town tiles before pressing this button. Please see the appropriate messages that appear on screen when you need to do so.');

  var clearbutton = makeLinkButton(px + 420, py + 84, 'cancel', parent);
  clearbutton.title = 'remove last action from your action sequence';
  clearbutton.onclick = executeButtonClearFun;

  var hintbutton = makeLinkButton(px + 480, py + 84, 'hint', parent);
  hintbutton.title = 'show several possible action sequences you can do. This list is what the AIs use to pick their actions from.';
  hintbutton.onclick = function() {
    var actions = getPossibleActions(players[playerIndex], defaultRestrictions);
    var text = '';
    for(var i = 0; i < actions.length; i++) {
      text += actionsToString(actions[i]) + '\n';
    }
    alert(text);
  };
}

//IE hack: IE refuses to have onclick on transparent elements. But first line of tiles.png is see-through. So use it as bg image.
function IEClickHack(el) {
  el.style.backgroundImage = 'url("tiles.png")';
}

//creates the invisible buttons on the hex tiles
function drawMapClick() {
  for(var y = 0; y < BH; y++)
  for(var x = 0; x < BW; x++)
  {
    var tile = world[arCo(x, y)];
    if(tile != N /*I is allowed, due to mermaids town*/) {
      var co = pixelCo(x, y);
      var px = co[0];
      var py = co[1];
      var el =  makeDiv(px - SIZE/2, py - SIZE/3 + SIZE/6, uiElement);
      el.style.width = '' + SIZE + 'px';
      el.style.height = '' + (SIZE - 2*SIZE/6) + 'px';
      var closure_x = x;
      var closure_y = y;
      el.onclick = bind(function(x, y) { if (mapClickFun) mapClickFun(x, y); }, x, y);
      el.style.cursor = 'pointer';
      IEClickHack(el);
    }
  }
}

function makeDropDown(x, y, options, parent) {
  var sel = makeAbsElement(x, y, parent, 'select');
  for(var i = 0; i < options.length; i++) {
    makeElement(sel, 'option').innerHTML = options[i];
  }
  return sel;
}

function makeLabeledDropDown(x, y, label, options, parent) {
  makeDiv(x, y, hudElement).innerHTML = label;
  return makeDropDown(x, y + 16, options, parent);
}

function makeCheckbox(x, y, parent, label, title) {
  //var result = makeAbsElement(x, y, parent, 'input');

  var result =  document.createElement('input');
  result.style.position = 'absolute';
  result.style.left = '' + x + 'px';
  result.style.top = '' + y + 'px';
  result.type = 'checkbox'; //must be set before appending it to the DOM, otherwise it breaks in IE7 (and maybe later)
  parent.appendChild(result);

  if(label) {
    var label = makeText(x + 25, y + 5, label, parent);
    if(title) label.title = title;
  }
  
  return result;
}

//returns the [bg, labelDiv, button], so you can set colors etc...
function makeButton(x, y, label, parentEl, clickfun, tooltip) {
  var bg = makeSizedDiv(x, y, 100, 40, parentEl);
  bg.style.backgroundColor = '#d00';
  bg.style.border = '1px solid black';
  var labelDiv = makeSizedDiv(x, y + 14, 100, 16, parentEl);
  labelDiv.innerHTML = label;
  labelDiv.style.color = 'white';
  labelDiv.style.fontWeight = 'bold';
  labelDiv.style.textAlign = 'center';
  var button = makeSameSizeDiv(bg, parentEl);
  button.onclick = clickfun;
  button.style.cursor = 'pointer';
  IEClickHack(button);
  if(tooltip) button.title = tooltip;
  return [bg, labelDiv, button];
}

/*
each button fun receives the following object containing the dropdown states:
{
  numplayers: 2 - 5
  startplayer: -1 - 4 (-1 means random, 0 is human, 1-4 are the AI's)
  worldmap: 0 for standard, 1 for random, 2 for small random
  presetfaction: [humanfaction, ai1faction, ...] --> none means random
  presetround: [round1tile, round2tile, ...] --> none means random
  presetbonus: {preferred bonus tiles} --> those in the set will be chosen first with the random selection
  newcultistsrule
  towntilepromo2013
  bonustilepromo2013
}
*/
function renderPreScreen(px, py, standardButtonFun, presetButtonFun, beginnerButtonFun, observeButtonFun, debugButtonFun) {
  var parent = hudElement;

  makeText(px, py - 100, 'TM AI: Play TM against AI players.<br/>'
      + 'Programmed by Lode Vandevenne.<br/>'
      + 'Drawings by Giordano Segatta.<br/>'
      + 'Based on: <a href="http://boardgamegeek.com/boardgame/120677/terra-mystica">http://boardgamegeek.com/boardgame/120677/terra-mystica</a><br/>'
      + 'version: v0.8 (20131130)', parent);

  var ppy = py;
  var numPlayerEl = makeLabeledDropDown(px, ppy, 'num players', ['5', '4', '3', '2', '1'], parent);
  var startPlayerEl = makeLabeledDropDown(px + 250, ppy, 'start player', ['random', 'human', 'ai1', 'ai2', 'ai3', 'ai4'], parent);
  var worldMapEl = makeLabeledDropDown(px + 400, ppy, 'world map', ['standard', 'randomized', 'randomized small'], parent);
  /*makeButton(px + 120, py, 'Standard', parent, bind(buttonFun, standardButtonFun), 'Begin a game with standard rules and choice of faction');
  makeButton(px + 240, py, 'Preset', parent, bind(buttonFun, presetButtonFun), 'Begin a game with factions preset below, or random factions by default');
  makeButton(px + 360, py, 'Beginner', parent, bind(buttonFun, beginnerButtonFun), 'Begin a game with beginner setup. No choice of faction, it is based on player start position');
  makeButton(px + 480, py, 'Observe', parent, bind(buttonFun, observeButtonFun), 'Observe a pure AI game');*/
  //makeButton(px + 600, py, 'Debug', parent, bind(buttonFun, debugButtonFun), 'DEBUG');
  var gameTypeDrowpDown = makeLabeledDropDown(px + 120, ppy, 'Game Type', ['Standard', 'Preset', 'Beginner', 'Observe'], parent);
  gameTypeDrowpDown.title = 'Standard: choice of faction. Preset: use Preset settings below. Beginner: official beginner setup, faction based on start position. Observe: Watch only AIs play';

  var newcultistcb = makeCheckbox(px, ppy + 50, parent, 'New cultists rule', 'The official new rule where cultists receive 1 power if everyone refuses to take power');
  newcultistcb.checked = state.newcultistsrule;
  var towntilepromo2013cb = makeCheckbox(px + 160, ppy + 50, parent, 'town tile promo 2013', 'Enable the new town tiles from the official 2013 mini expansion');
  towntilepromo2013cb.checked = state.towntilepromo2013;
  var bonustilepromo2013cb = makeCheckbox(px + 350, ppy + 50, parent, 'bonus tile promo 2013', 'Enable the new bonus tile from the official 2013 mini expansion. If checked, tile may appear randomly just like any other bonus tile.');
  bonustilepromo2013cb.checked = state.bonustilepromo2013;

  ppy = py + 160;
  makeText(px, ppy, 'Preset factions', parent);
  var factionDropDowns = [];
  for(var i = 0; i < 5; i++) {
    makeText(px, ppy + 20 + i * 32 + 5, 'player ' + (i + 1), parent);
    var factions = [];
    factions.push('random');
    for(var j = F_ALL_BEGIN; j <= F_ALL_END; j++) factions.push(getFactionCodeName(j));
    factionDropDowns.push(makeDropDown(px + 60, ppy + 20 + i * 32, factions, parent));
  }

  makeText(px + 200, ppy, 'Preset round tiles', parent);
  var roundDropDowns = [];
  for(var i = 0; i < 6; i++) {
    makeText(px + 200, ppy + 20 + i * 32 + 5, 'round ' + (i + 1), parent);
    var tiles = [];
    tiles.push('random');
    for(var j = T_ROUND_BEGIN + 1; j < T_ROUND_END; j++) tiles.push(tileToStringLong(j, false));
    roundDropDowns.push(makeDropDown(px + 260, ppy + 20 + i * 32, tiles, parent));
  }

  var allc = makeCheckbox(px + 450, ppy - 5, parent, 'Preset bonus tiles', 'check the preferred bonus tiles, those are given precedence during random selection');
  allc.checked = false;
  var bonusBoxes = [];
  for(var i = 0; i < (T_BON_END - T_BON_BEGIN - 1); i++) {
    var j = i + T_BON_BEGIN + 1;
    var c = makeCheckbox(px + 450, ppy + 30 + i * 22, parent, getTileCodeName(j));
    c.checked = false;
    bonusBoxes.push(c);
  }
  allc.onclick = function() {
    for(var i = 0; i < bonusBoxes.length; i++) bonusBoxes[i].checked = allc.checked;
  }

  function buttonFun(fun) {
    var params = {};
    params.numplayers = 5 - numPlayerEl.selectedIndex;
    params.startplayer = startPlayerEl.selectedIndex - 1;
    params.worldmap = worldMapEl.selectedIndex;
    params.presetfaction = [];
    for(var i = 0; i < factionDropDowns.length; i++) {
      var f = factionDropDowns[i].selectedIndex + F_ALL_BEGIN - 1 /*because first choice is random*/;
      if(factionDropDowns[i].selectedIndex == 0) f = F_NONE;
      params.presetfaction[i] = f;
    }
    params.presetround = [];
    for(var i = 0; i < roundDropDowns.length; i++) {
      var r = roundDropDowns[i].selectedIndex + T_ROUND_BEGIN;
      if(roundDropDowns[i].selectedIndex == 0) r = T_NONE;
      params.presetround[i] = r;
    }
    params.presetbonus = {};
    for(var i = 0; i < bonusBoxes.length; i++) {
      if(bonusBoxes[i].checked) params.presetbonus[i + T_BON_BEGIN + 1] = true;
    }

    params.newcultistsrule = newcultistcb.checked;
    params.towntilepromo2013 = towntilepromo2013cb.checked;
    params.bonustilepromo2013 = bonustilepromo2013cb.checked;
    
    fun(params);
  }

  ppy = py + 90;
  makeButton(px, ppy, 'Start', parent, bind(buttonFun, function(buttonFun) {
    if(gameTypeDrowpDown.selectedIndex == 0) standardButtonFun(buttonFun);
    if(gameTypeDrowpDown.selectedIndex == 1) presetButtonFun(buttonFun);
    if(gameTypeDrowpDown.selectedIndex == 2) beginnerButtonFun(buttonFun);
    if(gameTypeDrowpDown.selectedIndex == 3) observeButtonFun(buttonFun);
  }), 'Start new game');

  makeText(px, py + 420, '<h3>Documentation:</h3>' +
    '<h4>Updates</h4>' +
    '<p>20131130:Multistep undo/redo system added. New promo bonus tile.  New more futureproof savegame format. Mermaids town with bridge bugfix.<p/>' +
    '<p>20131029: The new Essen 2013 promo town tiles have been added.<p/>' +
    '<h4>About</h4>' +
    '<p>In this boardgame computer implementation, you will be pitted against AI opponents in TM. This allows for a very quick game to try out strategies with any faction. Multiplayer is not possible.<p/>' +
    '<p>This is on the internet, but works offline (there is no game server, everything is calculated in JavaScript). Closing the window will lose the game forever. This is for quick play only.<p/>' +
    '<p>On the left below the game board are the round, bonus, town and favor tiles. On the right is your action panel and a summary. Below are the player boards. Yours is the top one, the AIs are shown below. There you can see resources, non-placed buildings, and VPs<p/>' +
    '<p>When the game is finished, the final scores are shown where the action buttons were. There is also a log at the bottom.<p/>' +
    '<h4>Game Rules</h4>' +
    '<p>Please consult the TM rulebook<p/>' +
    '<h4>Starting the game</h4>' +
    '<p>Choose the number of players, the start player, and one of the game modes:<br/>' +
    ' -Standard: every player chooses a faction according to the standard choice rules. Preset faction settings are not used.<br/>' +
    ' -Preset: by default, play with randomly assigned faction. Use the preset dropdowns to assign chosen factions to each player.<br/>' +
    ' -Beginner: play with the beginner set up. Only a bonus tile needs to be chosen, no initial dwellings or faction. The faction depends on the starting player<br/>' +
    ' -Observe: observe AIs play a standard game against each other.</p>' +
    'Choose preset options if applicable. Then press Start' +
    '<h4>Preset options</h4>' +
    '<p>To finetune the game more, there are preset options. Preset faction only works when playing a Preset game. Preset round tiles and bonus tiles work in all games except the Beginner game.' +
    ' </p><p>To assign preset round tiles, choose the tile for each round (see below for abbreviations), or select random to randomize the tile of some round. </p><p>To assign preset bonus tiles, select' +
    ' the preferred bonus tiles. The selected ones are given precedence in the random selection, the unchecked ones are only used if all checked ones are already picked.' +
    ' Please note that having all bonus tiles selected or having none selected has the same effect: full randomness. </p><p>For all preset options,' +
    ' the game will resolve conflicts (such as choosing two factions of the same color or the same round tile twice) automatically with random selection.</p>' +
    '<h4>Performing Actions</h4>' +
    '<p>The action usage may be a little confusing at first, but it works as follows: when it is your turn, you can perform an action sequence. That is, you\'re only allowed to do a single actual action,' +
    ' but other minor actions such as burning power or converting power to coins can precede and follow the main action. Therefore, you always have to specify your complete action sequence first,' +
    ' then press the Execute button. You only see the result of the action after pressing that button. If it is not allowed by the game rules, you will see the reason, and can retry with a new' +
    ' action sequence. Depending on the action, you will be asked to click a hex on the map, click a favor tile to pick from, etc... The on screen instructions will tell each time what to do.</p>' +
    '<p>After doing an action, you can press Next to cycle through the AI\'s actions, or Fast to go through them faster.</p>' +
    '<p>To get the basic idea, here are some click sequences for typical actions:<br/>' +
    ' -dig&build: click on a map tile. It will automatically do as many dig actions as needed to make the tile your color, and put a dwelling on it. Press Execute to actually perform it.<br/>' +
    ' -dig once: use the dig or dig&build button, but then before clicking on the map, first set the transform mode to "transform once"<br/>' +
    ' -cult: click on a cult track, then press Execute to send a priest to 3 if available, otherwise 2 if available, otherwise 1<br/>' +
    ' -upgr1: click a dwelling to upgrade to TP, or a TP to upgrade to SH, then press Execute<br/>' +
    ' -upgr2: click a TP to upgrade to TE, or a TE to upgrade to SA, then press Execute<br/>' +
    ' -forming a town: if any action results in a town, you must choose a town tile before pressing execute<br/>' +
    '</p>' +
    '<h4>Other input</h4>' +
    '<p>Apart from actions, sometimes you need to provide another type of input. For these, you usually don\'t need the "Execute" button. This is for the following types of input:<br/>' +
    ' -Choosing initial faction: pick it from the popup<br/>' +
    ' -Placing initial dwelling: click on a map hex of your color<br/>' +
    ' -Choosing an initial bonus tile: click on a bonus tile, they are the parchment (very light yellow) colored ones<br/>' +
    ' -Leeching power from an opponent: click yes, no, "auto 1" to automatically do "yes" for 1, "auto smart" to never show the popup anymore (sometimes does lose VPs, depending on round)<br/>' +
    ' -Bonus digs at the end of the round from the cult track: click the map as many times as you have digs. If no reachable tile is available, click an invalid one to continue on, it will be ignored.<br/>' +
    '</p>' +
    '<h4>Halflings</h4>' +
    '<p>When upgrading to stronghold, after clicking on the trading post to upgrade, you can apply the 3 digs, using transformation actions such as transform once or transform&build. The SH will still look like a TP at this point, that is normal.</p>' +
    '<h4>Darklings</h4>' +
    '<p>When upgrading to stronghold, it automatically adds the worker to priest conversion actions based on how many are left. If this was unwanted, use p->w to convert them back to workers.</p>' +
    '<h4>Mermaids</h4>' +
    '<p>If you can form a mermaids water town, choose the "watertown" action before pressing execute, but after doing the action that ensures the right town size.</p>' +
    '<h4>Shortcuts</h4>' +
    '<p>' +
    'Actions:<br/>' +
    ' <b>b</b>: dig&build<br/>' +
    ' <b>u</b>: upgrade to TP or SH<br/>' +
    ' <b>v</b>: upgrade to TE or SA<br/>' +
    '<br/>' +
    'Buttons:<br/>' +
    ' <b>x</b>: execute<br/>' +
    ' <b>n</b>: next<br/>' +
    ' <b>f</b>: fast<br/>' +
    '<br/>' +
    'Leeching:<br/>' +
    ' <b>y</b>: yes<br/>' +
    ' <b>n</b>: no<br/>' +
    '</p>' +
    '<h4></h4>' +
    '<h4>Abbreviations</h4>' +
    '<p>' +
    ' D: dwelling<br/>' +
    ' TP: trading post<br/>' +
    ' TE: temple<br/>' +
    ' SH: stronghold<br/>' +
    ' SA: sanctuary<br/>' +
    ' S: stronghold or sanctuary (e.g. svp = vp for SH or SA)<br/>' +
    ' c: coin<br/>' +
    ' w: worker<br/>' +
    ' p: priest<br/>' +
    ' pw: power (aka mana)<br/>' +
    ' vp: victory points<br/>' +
    ' F: fire cult track<br/>' +
    ' W: water cult track<br/>' +
    ' E: earth cult track<br/>' +
    ' A: air cult track<br/>' +
    ' P: pass<br/>' +
    ' BON: bonus tile<br/>' +
    ' FAV: favor tile<br/>' +
    ' RND: round tile<br/>' +
    ' TW: town tile<br/>' +
    ' dig: getting a spade + transforming terrain' +
    '</p>' +
    '<h4></h4>' +
    '<p></p>' +
    '', parent);
  
}


function drawHud() {
  function mainTileClick(tile) {
    if(tileClickFun) tileClickFun(tile);
  }

  logEl.style.top = 900 + players.length * 205;

  drawHud2(players, mainTileClick);
}

function drawSaveLoadUI(onlyload) {
  var parent = uiElement;
  var button;

  function makePopupUpTextArea() {
    var el = makeSizedDiv(50, 50, 540, 500, popupElement);
    el.style.backgroundColor = 'white';
    el.style.border = '1px solid black';

    var area = makeElement(el, 'textarea');
    area.type = 'text';
    area.style.position = 'absolute';
    area.style.top = 80;
    area.style.left = 20;
    area.style.width = 500;
    area.style.height = 300;
    return [el, area];
  }

  if(!onlyload) {
    button = makeLinkButton(0, 0, 'save', parent);
    button.onclick = function() {
      if(state.type == S_PRE) return;
      var els = makePopupUpTextArea();
      var el = els[0];
      var area = els[1];

      makeText(5, 5, 'Copy all the text below, and save it in a text file to keep a copy of the game state. It can be loaded again at any time.' +
          ' The state can also be shared with others. The final "log:" section is optional. Currently this feature is experimental.', el);
      
      area.value = serializeGameState(saveGameState(true));
      area.select();

      var button2 = makeButton(425, 450, 'Done', el, function() {
        popupElement.removeChild(el);
      }, 'Done');
    }
  }
  
  button = makeLinkButton(onlyload ? 0 : 50, 0, 'load', parent);
  button.onclick = function() {
    var els = makePopupUpTextArea();
    var el = els[0];
    var area = els[1];

    makeText(5, 5, 'Paste the gamestate text in the field, then press Load to load the game. It only works if the text is valid.', el);

    area.select();

    var button2 = makeButton(315, 450, 'Load', el, function() {
      var game = deSerializeGameState(area.value);
      if(game) {
        popupElement.removeChild(el);
        loadGameStateHard(game);
        if(!game.logText) addLog('<br/>Loaded a game without log<br/>');
      } else {
      }
    }, 'Load');

    var button3 = makeButton(425, 450, 'Cancel', el, function() {
      popupElement.removeChild(el);
    }, 'Cancel');
  }

  if(!onlyload) {
    button = makeLinkButton(100, 0, 'new', parent);
    button.onclick = function() {
      if(state.type == S_PRE) return;
      var el = makeSizedDiv(50, 50, 400, 150, document.body);
      el.style.backgroundColor = 'white';
      el.style.border = '1px solid black';

      //makeText(5, 5, 'Really remove current game and start a new one?', el);
      makeCenteredText('Really remove current game and start a new one?', 400, 50 + (350 / 2), 70, el);

      var button2 = makeButton(70, 60, 'Yes', el, function() {
        document.body.removeChild(el);
        resetAndBeginNewGame();
      }, 'Yes');

      var button3 = makeButton(220, 60, 'No', el, function() {
        document.body.removeChild(el);
      }, 'No');
    
    }

    button = makeLinkButton(150, 0, 'undo', parent);
    button.onclick = function() {
      if(undoIndex < 0 || undoIndex >= undoGameStates.length) return;
      if(undoIndex + 1 == undoGameStates.length) undoGameStates.push(saveGameState(true));
      var undoGameState = undoGameStates[undoIndex];
      if(undoGameState) {
        loadGameStateHard(undoGameState);
        undoIndex--;
      }
    };
    button.title = 'Undo last action';

    button = makeLinkButton(200, 0, 'redo', parent);
    button.onclick = function() {
      if(undoIndex < -2 || undoIndex + 2 >= undoGameStates.length) return;
      var undoGameState = undoGameStates[undoIndex + 2];
      if(undoGameState) {
        loadGameStateHard(undoGameState);
        undoIndex++;
      }
    };
    button.title = 'Redo undone action';


    var debugbutton = makeLinkButton(1040, 5, 'debug', uiElement);
    debugbutton.onclick = function() {
      if(state.type == S_PRE) return;
      drawDebugActions(0, 563, 850);
      debugbutton.onclick = undefined;
    }


  }
}

function resetAndBeginNewGame() {
  players.length = 0;
  window.setTimeout(function() {
    mapElement.innerHTML = '';
    uiElement.innerHTML = '';
    hudElement.innerHTML = '';
    popupElement.innerHTML = '';
    actionEl.innerHTML = '';
    helpEl.innerHTML = '';
    logEl.innerHTML = '';
    logText = '';
    beginGame();
  }, 0);
}

function drawDebugActions(pindex, px, py) {
  var DEBUGBUTTONCOLOR = 'grey';

  var title = makeDiv(px, py - 16, uiElement);
  title.innerHTML = 'debug buttons - only for debugging';
  title.style.color = DEBUGBUTTONCOLOR;

  var button;
  
  function addDebugIncomeButton(px, py, name, resources, remove) {
    var bonbutton = makeLinkButton(px, py, name, uiElement);
    bonbutton.style.color = DEBUGBUTTONCOLOR;
    bonbutton.onclick = function() {
      if(remove) consumeOverload(players[pindex], resources);
      else addIncome(players[pindex], resources);
      drawHud();
    };
  }
  addDebugIncomeButton(px+0, py, 'cheat', [1000,1000,1000,1000,0], false);
  addDebugIncomeButton(px+50, py, 'null', [1000,1000,1000,1000,0], true);
  addDebugIncomeButton(px+80, py, '12pw', [0,0,0,12,0], false);
  addDebugIncomeButton(px+0, py+16, '1c', [1,0,0,0,0], false);
  addDebugIncomeButton(px+25, py+16, '1w', [0,1,0,0,0], false);
  addDebugIncomeButton(px+50, py+16, '1p', [0,0,1,0,0], false);
  addDebugIncomeButton(px+70, py+16, '1pw', [0,0,0,1,0], false);
  addDebugIncomeButton(px+100, py+16, '1vp', [0,0,0,0,1], false);
  button = makeLinkButton(px+130, py+16, '1pp', uiElement);
  button.style.color = DEBUGBUTTONCOLOR;
  button.onclick = function() { players[0].pp++; drawHud(); };
  addDebugIncomeButton(px+160, py+16, '-1c', [1,0,0,0,0], true);
  addDebugIncomeButton(px+185, py+16, '-1w', [0,1,0,0,0], true);
  addDebugIncomeButton(px+210, py+16, '-1p', [0,0,1,0,0], true);
  addDebugIncomeButton(px+235, py+16, '-1pw', [0,0,0,1,0], true);
  addDebugIncomeButton(px+270, py+16, '-1vp', [0,0,0,0,1], true);
  button = makeLinkButton(px+315, py+16, '-1pp', uiElement);
  button.style.color = DEBUGBUTTONCOLOR;
  button.onclick = function() { players[0].pp--; drawHud(); };

  var execbutton2 = makeLinkButton(px + 120, py, 'cheatai', uiElement);
  execbutton2.style.color = DEBUGBUTTONCOLOR;
  execbutton2.onclick = function() {
    players[1].c = 999;
    players[1].w = 999;
    players[1].p = 999;
    players[1].pw0 = 0;
    players[1].pw1 = 0;
    players[1].pw2 = 12;
    drawHud();
  };

  var cultcheatbutton = makeLinkButton(px + 190, py, 'cultcheat', uiElement);
  cultcheatbutton.style.color = DEBUGBUTTONCOLOR;
  cultcheatbutton.onclick = function() {
    players[0].cult[C_F] = 9;
    players[0].cult[C_W] = 9;
    players[0].cult[C_E] = 9;
    players[0].cult[C_A] = 9;
    drawHud();
  };

  var tilecheatbutton = makeLinkButton(px + 260, py, 'tilecheat', uiElement);
  tilecheatbutton.style.color = DEBUGBUTTONCOLOR;
  tilecheatbutton.onclick = function() {
    for(var i = T_FAV_BEGIN + 1; i < T_FAV_END; i++) players[0].favortiles[i] = 1;
    for(var i = T_TW_BEGIN + 1; i < T_TW_END; i++) players[0].towntiles[i] = 1;
    drawHud();
  };

  var skipbutton = makeLinkButton(px + 420, py, 'debugskip', uiElement);
  skipbutton.style.color = DEBUGBUTTONCOLOR;
  skipbutton.onclick = function() {
    autoLeechNo = true;
    fastMode = true;
    fastestMode = true;
    prepareAction(new Action(A_DEBUG_SKIP));
    if(state.type == S_GAME_OVER) {
      //keep degubbing past round 6
      nextState(S_ROUND_END_DIG);
    } else if(state.type > S_INIT_DWELLING) {
      executeButtonFun();
    }
  };

  var skipbutton = makeLinkButton(px + 340, py, 'debugstep', uiElement);
  skipbutton.style.color = DEBUGBUTTONCOLOR;
  skipbutton.onclick = function() {
    prepareAction(new Action(A_DEBUG_STEP));
    executeButtonFun();
  };

  var refreshbutton = makeLinkButton(px + 340, py + 16, 'redraw', uiElement);
  refreshbutton.style.color = DEBUGBUTTONCOLOR;
  refreshbutton.onclick = function() {
    drawHud();
    drawMap();
  };

  var button;

  button = makeLinkButton(px + 400, py + 16, 'allai', uiElement);
  button.style.color = DEBUGBUTTONCOLOR;
  button.onclick = function() {
    players[0].actor = new AI();
  };

  button = makeLinkButton(px + 450, py + 16, 'altco', uiElement);
  button.style.color = DEBUGBUTTONCOLOR;
  button.onclick = function() {
    altco = !altco;
    drawMap();
  };
}
