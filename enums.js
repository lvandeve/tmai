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
//Game-rule related enums and their (code)name and description. (so not some other internal enums)


/*
Tile color enum, 1-letter on purpose for land maps
Color letters for now and for possible future expansions.
rationale of letter choices:
  river: I (second letter)
  null/none: N
  red: R
  orange: O
  yellow: Y
  green: G
  cyan: C
  blue: B
  violet/purple: V
  magenta/pink: M
  white: W
  grey/gray: S ("silver")
  black: K (code for black in "CMYK")
  brown: U (etymology "brun")
*/
var N = 0; /*none (edge of hexmap)*/
var I = 1; /*river*/
var R = 2; /*solitude (red)*/
var Y = 3; /*desert (yellow)*/
var U = 4; /*plains (brown)*/
var K = 5; /*swamp (black)*/
var B = 6; /*lake (blue)*/
var G = 7; /*forest (green)*/
var S = 8; /*mountain (grey)*/
var W = 9; /*ice (white)*/
var O = 10; /*lava (orange)*/
var X = 11; /*any*/
var Z = 12; /*many*/
// All colors
var COLOR_BEGIN = I; //includes I because it also has a render color (light blue)
var COLOR_END = Z;
// The possible landscape colors (also the possible colors of wooden pieces)
var LANDSCAPE_BEGIN = R;
var LANDSCAPE_END = O;
// The 7 main circle colors
var CIRCLE_BEGIN = R;
var CIRCLE_END = S;
// The possible faction colors
var FACTION_COLOR_BEGIN = R;
var FACTION_COLOR_END = Z;

var colorCodeName = ['N' /*null, edge of hexmap*/, 'I' /*river*/, 'R', 'Y', 'U', 'K', 'B', 'G', 'S', 'W', 'O', 'X', 'Z'];
var codeNameToColor = {};
for(var i = 0; i < colorCodeName.length; i++) codeNameToColor[colorCodeName[i]] = i;

function getColorName(color) {
  switch(color) {
    case N: return 'none';
    case I: return 'river';
    case R: return 'red';
    case Y: return 'yellow';
    case U: return 'brown';
    case K: return 'black';
    case B: return 'blue';
    case G: return 'green';
    case S: return 'grey';
    case W: return 'white';
    case O: return 'orange';
    case X: return 'any'; // like the shapeshifters
    case Z: return 'many'; // like the riverwalkers
    default: return 'unknown';
  }
}


//Buildings
var B_NONE = 0;
var B_D = 1;
var B_TP = 2;
var B_TE = 3;
var B_SH = 4;
var B_SA = 5;
//mermaids town over water connection tile.
//This is implemented as a building, because the clustering calculation works like that, and it can connect up to 3 parts together.
//it's only allowed to build this if it results in forming a new town (that ensures the rule "may skip only ONE river tile", and prevents placing tons in a row to cross large river distances)
var B_MERMAIDS = 6;

var buildingCodeName = ['N' /*none*/, 'D', 'P', 'E', 'H', 'A', 'M' /*mermaids*/];
var codeNameToBuilding = {};
for(var i = 0; i < buildingCodeName.length; i++) codeNameToBuilding[buildingCodeName[i]] = i;


//Directions
//For bridges: N, NE, SE, S, SW, NW
//For touching tiles: NE, E, SE, SW, W, NW
var D_INVALID = 0; //for tiles not in correct relative location
var D_N = 1;
var D_NE = 2;
var D_E = 3;
var D_SE = 4;
var D_S = 5;
var D_SW = 6;
var D_W = 7;
var D_NW = 8;


//Actions. The cost and result are not included, must be known given the A_ value, faction and player stats.
var A_index = 0;
var A_BEGIN = A_index++; // Not an action, first enum value
var A_NONE = A_index++;
//Burn & convert power (non-turn actions)
var A_BURN = A_index++; //burn power
var A_CONVERT_1PW_1C = A_index++;
var A_CONVERT_3PW_1W = A_index++;
var A_CONVERT_5PW_1P = A_index++;
var A_CONVERT_1P_1W = A_index++;
var A_CONVERT_1W_1C = A_index++;
var A_CONVERT_1VP_1C = A_index++; //alchemists only
var A_CONVERT_2C_1VP = A_index++; //alchemists only (TODO: remove this as action? It is only for endgame scoring)
var A_CONVERT_1W_1P = A_index++; //darklings only, after building their SH, max 3 times (the SH upgrade action must precede)
//Faction specific non-turn actions
var A_CONNECT_WATER_TOWN = A_index++; //mermaids
var A_ACOLYTES_CULT = A_index++; //using freecult from spades on cult tracks
var A_DOUBLE = A_index++; //chaos magicians double action
var A_TUNNEL = A_index++; //dwarves special ability.
var A_CARPET = A_index++; //fakirs special ability.
//Cheat actions
var A_CHEAT_C = A_index++;
var A_CHEAT_W = A_index++;
var A_CHEAT_P = A_index++;
var A_CHEAT_PW = A_index++;
//Placing bridge is NOT a turn taking action, because it comes after a turn-taking action that gives the bridge as resource. Hence defined before A_PASS
var A_PLACE_BRIDGE = A_index++; //the A_POWER_BRIDGE and A_ENGINEERS_BRIDGE give a bridge as resource, the A_PLACE_BRIDGE action puts it on the map
//Pass
var A_PASS = A_index++;
//Power resources
var A_POWER_1P = A_index++;
var A_POWER_2W = A_index++;
var A_POWER_7C = A_index++;
//Spade giving actions
var A_SPADE = A_index++; //Convert workers into spade (or priest if alchemists)
var A_BONUS_SPADE = A_index++; //From the pass bonus tile.
var A_POWER_SPADE = A_index++;
var A_POWER_2SPADE = A_index++;
var A_GIANTS_2SPADE = A_index++;
//Transforming actions
var A_TRANSFORM_CW = A_index++; //transform terrain clockwise 1 step
var A_TRANSFORM_CCW = A_index++; //transform terrain counterclockwise 1 step
var A_GIANTS_TRANSFORM = A_index++; //transform terrain to giants home color. Consumes two spades.
var A_TRANSFORM_SPECIAL = A_index++; //transform to special terrain color
var A_TRANSFORM_SPECIAL2 = A_index++; //transform to special terrain color 2
var A_SANDSTORM = A_index++; //nomads sandstorm. No spades needed for this action.
//The build dwelling actions
var A_BUILD = A_index++; //build a dwelling. This action can either be on its own, or after any of the DIG actions
var A_WITCHES_D = A_index++; //free dwelling anywhere on the green color
//The upgrade actions need the coordinates of the location of the building to upgrade, plus potentially more for the SH effect, potential town tile, ...
var A_UPGRADE_TP = A_index++;
var A_UPGRADE_TE = A_index++; //includes taking favor tile(s)
var A_UPGRADE_SH = A_index++; //includes any of the actions of the faction, including up to 3 dig coordinates + house coordinate for halflings
var A_UPGRADE_SA = A_index++; //includes taking favor tile(s)
var A_SWARMLINGS_TP = A_index++; //free TP upgrade
//Cult
var A_CULT_PRIEST3 = A_index++; //priest to first spot on cult track, move 3 up
var A_CULT_PRIEST2 = A_index++; //priest to remaining spot on cult track, move 2 up
var A_CULT_PRIEST1 = A_index++; //priest comes back to pool, move 1 up
var A_BONUS_CULT = A_index++;
var A_FAVOR_CULT = A_index++;
var A_AUREN_CULT = A_index++; //2 cult advances
//Advance
var A_ADV_SHIP = A_index++;
var A_ADV_DIG = A_index++;
var A_SHIFT = A_index++;
var A_SHIFT2 = A_index++;
//Bridge
var A_POWER_BRIDGE = A_index++; //from the power action
var A_ENGINEERS_BRIDGE = A_index++;
//Debug
var A_DEBUG_SKIP = A_index++; //skip a whole round for debug purposes (such as watching AI's) - pass, ignoring bonus tiles
var A_DEBUG_STEP = A_index++; //skip an action for debug purposes (such as watching AI's) - do a no-op this turn
var A_END = A_index++; //Not an action, last enum value



//code names compatible with savegame format
function getActionCodeName(type) {
  switch(type) {
    case A_NONE: return 'none';
    case A_BURN: return 'burn';
    case A_CONVERT_1PW_1C: return '1pwto1c';
    case A_CONVERT_3PW_1W: return '3pwto1w';
    case A_CONVERT_5PW_1P: return '5pwto1p';
    case A_CONVERT_1P_1W: return '1pto1w';
    case A_CONVERT_1W_1C: return '1wto1c';
    case A_CONVERT_1VP_1C: return '1vpto1c';
    case A_CONVERT_2C_1VP: return '2cto1vp';
    case A_CONVERT_1W_1P: return '1wto1p';
    case A_CONNECT_WATER_TOWN: return 'watertown';
    case A_ACOLYTES_CULT: return 'spadecult';
    case A_DOUBLE: return 'chaosdouble';
    case A_CHEAT_C: return 'cheatc';
    case A_CHEAT_W: return 'cheatw';
    case A_CHEAT_P: return 'cheatp';
    case A_CHEAT_PW: return 'cheatpw';
    case A_PASS: return 'pass';
    case A_POWER_1P: return 'pow1p';
    case A_POWER_2W: return 'pow2w';
    case A_POWER_7C: return 'pow7c';
    case A_BUILD: return 'build';
    case A_WITCHES_D: return 'witchesride';
    case A_SPADE: return 'spade';
    case A_BONUS_SPADE: return 'bonspade';
    case A_POWER_SPADE: return 'powspade';
    case A_POWER_2SPADE: return 'pow2spade';
    case A_GIANTS_2SPADE: return 'giants2spade';
    case A_TRANSFORM_CW: return 'transformcw';
    case A_TRANSFORM_CCW: return 'transformccw';
    case A_GIANTS_TRANSFORM: return 'giantstransform';
    case A_TRANSFORM_SPECIAL: return 'icetransform';
    case A_TRANSFORM_SPECIAL2: return 'firetransform';
    case A_SANDSTORM: return 'sandstorm';
    case A_UPGRADE_TP: return 'upgradetp';
    case A_SWARMLINGS_TP: return 'swarmlingstp';
    case A_UPGRADE_TE: return 'upgradete';
    case A_UPGRADE_SH: return 'upgradesh';
    case A_UPGRADE_SA: return 'upgradesa';
    case A_CULT_PRIEST3: return 'cult3';
    case A_CULT_PRIEST2: return 'cult2';
    case A_CULT_PRIEST1: return 'cult1';
    case A_BONUS_CULT: return 'boncult';
    case A_FAVOR_CULT: return 'favcult';
    case A_AUREN_CULT: return 'aurencult2';
    case A_ADV_SHIP: return 'advshipping';
    case A_ADV_DIG: return 'advdigging';
    case A_SHIFT: return 'shift_pw'; //shift with 3 or 5 regular power cost
    case A_SHIFT2: return 'shift_pt'; //shift with 3 or 5 power tokens cost
    case A_POWER_BRIDGE: return 'powbridge';
    case A_ENGINEERS_BRIDGE: return 'engbridge';
    case A_PLACE_BRIDGE: return 'placebridge';
    case A_TUNNEL: return 'tunnel';
    case A_CARPET: return 'carpet';
    case A_DEBUG_SKIP: return 'debugskip';
    case A_DEBUG_STEP: return 'debugstep';
    default: return 'unknown';
  }
}

var codeNameToAction_ = {};
for(var i = A_BEGIN; i < A_END; i++) codeNameToAction_[getActionName(i)] = i;

function codeNameToAction(name) {
  return codeNameToAction_[name];
}

function getActionName(type) {
  return getActionCodeName(type);
}



//Bonus, favor, town and round scoring tiles
var T_index = 0;
var T_NONE = T_index++;
var T_DUMMY = T_index++; //not a real tile, but filled in by action generation functions, to be replaced with proper tiles later
var T_BON_BEGIN = T_index++;
var T_BON_SPADE_2C = T_index++;
var T_BON_CULT_4C = T_index++;
var T_BON_6C = T_index++;
var T_BON_3PW_SHIP = T_index++;
var T_BON_3PW_1W = T_index++;
var T_BON_PASSDVP_2C = T_index++;
var T_BON_PASSTPVP_1W = T_index++;
var T_BON_PASSSHSAVP_2W = T_index++;
var T_BON_1P = T_index++;
var T_BON_PASSSHIPVP_3PW = T_index++; //bonus tile promo 2013
var T_BON_END = T_index++;
var T_FAV_BEGIN = T_index++;
var T_FAV_3F = T_index++;
var T_FAV_3W = T_index++;
var T_FAV_3E = T_index++;
var T_FAV_3A = T_index++;
var T_FAV_2F_6TW = T_index++;
var T_FAV_2W_CULT = T_index++;
var T_FAV_2E_1PW1W = T_index++;
var T_FAV_2A_4PW = T_index++;
var T_FAV_1F_3C = T_index++;
var T_FAV_1W_TPVP = T_index++;
var T_FAV_1E_DVP = T_index++; //place dwelling VP
var T_FAV_1A_PASSTPVP = T_index++;
var T_FAV_END = T_index++;
var T_TW_BEGIN = T_index++;
var T_TW_2VP_2CULT = T_index++; //town tile promo 2013
var T_TW_4VP_SHIP = T_index++; //town tile promo 2013
var T_TW_5VP_6C = T_index++;
var T_TW_6VP_8PW = T_index++;
var T_TW_7VP_2W = T_index++;
var T_TW_8VP_CULT = T_index++;
var T_TW_9VP_P = T_index++;
var T_TW_11VP = T_index++; //town tile promo 2013
var T_TW_END = T_index++;
var T_ROUND_BEGIN = T_index++;
var T_ROUND_DIG2VP_1E1C = T_index++;
var T_ROUND_TW5VP_4E1DIG = T_index++;
var T_ROUND_D2VP_4W1P = T_index++;
var T_ROUND_SHSA5VP_2F1W = T_index++;
var T_ROUND_D2VP_4F4PW = T_index++;
var T_ROUND_TP3VP_4W1DIG = T_index++;
var T_ROUND_SHSA5VP_2A1W = T_index++;
var T_ROUND_TP3VP_4A1DIG = T_index++;
var T_ROUND_END = T_index++;
var T_TILE_ENUM_END = T_index++;



// returns codename, no spaces
function getTileCodeName(tile) {
  if(tile == T_NONE) return 'none';
  if(tile == T_DUMMY) return 'dummy';
  if(tile == T_BON_SPADE_2C) return 'BONspade';
  if(tile == T_BON_CULT_4C) return 'BONcult';
  if(tile == T_BON_6C) return 'BON6c';
  if(tile == T_BON_3PW_SHIP) return 'BONship';
  if(tile == T_BON_3PW_1W) return 'BON3pw1w';
  if(tile == T_BON_PASSDVP_2C) return 'BONdvp';
  if(tile == T_BON_PASSTPVP_1W) return 'BONtpvp';
  if(tile == T_BON_PASSSHSAVP_2W) return 'BONsvp';
  if(tile == T_BON_1P) return 'BON1p';
  if(tile == T_BON_PASSSHIPVP_3PW) return 'BONshipvp';
  if(tile == T_FAV_3F) return 'FAV3F';
  if(tile == T_FAV_3W) return 'FAV3W';
  if(tile == T_FAV_3E) return 'FAV3E';
  if(tile == T_FAV_3A) return 'FAV3A';
  if(tile == T_FAV_2F_6TW) return 'FAV6tw';
  if(tile == T_FAV_2W_CULT) return 'FAVcult';
  if(tile == T_FAV_2E_1PW1W) return 'FAV1pw1w';
  if(tile == T_FAV_2A_4PW) return 'FAV4pw';
  if(tile == T_FAV_1F_3C) return 'FAV3c';
  if(tile == T_FAV_1W_TPVP) return 'FAVtpvp';
  if(tile == T_FAV_1E_DVP) return 'FAVdvp';
  if(tile == T_FAV_1A_PASSTPVP) return 'FAVptpvp';
  if(tile == T_TW_2VP_2CULT) return 'TW2';
  if(tile == T_TW_4VP_SHIP) return 'TW4';
  if(tile == T_TW_5VP_6C) return 'TW5';
  if(tile == T_TW_6VP_8PW) return 'TW6';
  if(tile == T_TW_7VP_2W) return 'TW7';
  if(tile == T_TW_8VP_CULT) return 'TW8';
  if(tile == T_TW_9VP_P) return 'TW9';
  if(tile == T_TW_11VP) return 'TW11';
  if(tile == T_ROUND_DIG2VP_1E1C) return 'RNDdigEc';
  if(tile == T_ROUND_TW5VP_4E1DIG) return 'RNDtwEspade';
  if(tile == T_ROUND_D2VP_4W1P) return 'RNDdWp';
  if(tile == T_ROUND_SHSA5VP_2F1W) return 'RNDsFw';
  if(tile == T_ROUND_D2VP_4F4PW) return 'RNDdFpw';
  if(tile == T_ROUND_TP3VP_4W1DIG) return 'RNDtpWspade';
  if(tile == T_ROUND_SHSA5VP_2A1W) return 'RNDsAw';
  if(tile == T_ROUND_TP3VP_4A1DIG) return 'RNDtpAspade';
  return 'unk';
}

function getTileVPDetail(tile) {
  if(tile == T_BON_PASSDVP_2C) return 'bonus pass d';
  if(tile == T_BON_PASSTPVP_1W) return 'bonus pass tp';
  if(tile == T_BON_PASSSHSAVP_2W) return 'bonus pass sh/sa';
  if(tile == T_BON_PASSSHIPVP_3PW) return 'bonus pass ship';
  if(tile == T_FAV_1W_TPVP) return 'favor tp';
  if(tile == T_FAV_1E_DVP) return 'favor d';
  if(tile == T_FAV_1A_PASSTPVP) return 'favor pass tp';
  if(tile == T_ROUND_DIG2VP_1E1C) return 'round dig';
  if(tile == T_ROUND_TW5VP_4E1DIG) return 'round town';
  if(tile == T_ROUND_D2VP_4W1P) return 'round d';
  if(tile == T_ROUND_SHSA5VP_2F1W) return 'round sh/sa';
  if(tile == T_ROUND_D2VP_4F4PW) return 'round d';
  if(tile == T_ROUND_TP3VP_4W1DIG) return 'round tp';
  if(tile == T_ROUND_SHSA5VP_2A1W) return 'round sh/sa';
  if(tile == T_ROUND_TP3VP_4A1DIG) return 'round tp';
  return '???';
}

var codeNameToTile_ = {};
for(var i = T_NONE; i < T_TILE_ENUM_END; i++) codeNameToTile_[getTileCodeName(i)] = i;

function codeNameToTile(name) {
  return codeNameToTile_[name];
}

function tileToStringLong(tile, prefix) {
  var result = '';
  if(prefix) {
    if(tile > T_BON_BEGIN && tile < T_BON_END) result += 'BON ';
    if(tile > T_FAV_BEGIN && tile < T_FAV_END) result += 'FAV ';
    if(tile > T_TW_BEGIN && tile < T_TW_END) result += 'TW ';
    if(tile > T_ROUND_BEGIN && tile < T_ROUND_END) result += 'RND ';
  }

  if(tile == T_NONE) result += 'none';
  else if(tile == T_DUMMY) result += 'dummy';
  else if(tile == T_BON_SPADE_2C) result += 'dig 2c';
  else if(tile == T_BON_CULT_4C) result += 'cult 4c';
  else if(tile == T_BON_6C) result += '6c';
  else if(tile == T_BON_3PW_SHIP) result += '3pw ship';
  else if(tile == T_BON_3PW_1W) result += '3pw 1w';
  else if(tile == T_BON_PASSDVP_2C) result += 'pass:d=1vp 2c';
  else if(tile == T_BON_PASSTPVP_1W) result += 'pass:tp=2vp 1w';
  else if(tile == T_BON_PASSSHSAVP_2W) result += 'pass:sh/sa=4vp 2w';
  else if(tile == T_BON_1P) result += '1p';
  else if(tile == T_BON_PASSSHIPVP_3PW) result += 'pass:ship=3vp 3pw';
  else if(tile == T_FAV_3F) result += '3F';
  else if(tile == T_FAV_3W) result += '3W';
  else if(tile == T_FAV_3E) result += '3E';
  else if(tile == T_FAV_3A) result += '3A';
  else if(tile == T_FAV_2F_6TW) result += '2F 6tw';
  else if(tile == T_FAV_2W_CULT) result += '2W cult';
  else if(tile == T_FAV_2E_1PW1W) result += '2E 1pw1w';
  else if(tile == T_FAV_2A_4PW) result += '2A 4pw';
  else if(tile == T_FAV_1F_3C) result += '1F 3c';
  else if(tile == T_FAV_1W_TPVP) result += '1W tpvp';
  else if(tile == T_FAV_1E_DVP) result += '1E dvp';
  else if(tile == T_FAV_1A_PASSTPVP) result += '1A pass: tp [0,2,3,3,4] vp';
  else if(tile == T_TW_2VP_2CULT) result += '2vp 4cults2 2key';
  else if(tile == T_TW_4VP_SHIP) result += '4vp +ship/carpet';
  else if(tile == T_TW_5VP_6C) result += '5vp 6c';
  else if(tile == T_TW_6VP_8PW) result += '6vp 8pw';
  else if(tile == T_TW_7VP_2W) result += '7vp 2w';
  else if(tile == T_TW_8VP_CULT) result += '8vp 4cult';
  else if(tile == T_TW_9VP_P) result += '9vp 1p';
  else if(tile == T_TW_11VP) result += '11vp';
  else if(tile == T_ROUND_DIG2VP_1E1C) result += 'dig2vp 1E=c';
  else if(tile == T_ROUND_TW5VP_4E1DIG) result += 'tw5vp 4E=spd';
  else if(tile == T_ROUND_D2VP_4W1P) result += 'dv2p 4W=p';
  else if(tile == T_ROUND_SHSA5VP_2F1W) result += 's5vp 2F=w';
  else if(tile == T_ROUND_D2VP_4F4PW) result += 'd2vp 4F=4pw';
  else if(tile == T_ROUND_TP3VP_4W1DIG) result += 'tp3vp 4W=spd';
  else if(tile == T_ROUND_SHSA5VP_2A1W) result += 's5vp 2A=w';
  else if(tile == T_ROUND_TP3VP_4A1DIG) result += 'tp3vp 4A=spd';
  else result += 'unk';
  return result;
}

function tileToHelpString(tile, prefix) {
  var result = '';
  if(prefix) {
    if(tile > T_BON_BEGIN && tile < T_BON_END) prefix += 'passing bonus tile: ';
    if(tile > T_FAV_BEGIN && tile < T_FAV_END) prefix += 'temple favor tile: ';
    if(tile > T_TW_BEGIN && tile < T_TW_END) prefix += 'town tile: ';
    if(tile > T_ROUND_BEGIN && tile < T_ROUND_END) prefix += 'round tile: ';
  }

  if(tile == T_NONE) result += 'none';
  else if(tile == T_DUMMY) result += 'dummy tile';
  else if(tile == T_BON_SPADE_2C) result += 'free spade action + 2c income';
  else if(tile == T_BON_CULT_4C) result += 'free cult action + 4c income';
  else if(tile == T_BON_6C) result += '6c income';
  else if(tile == T_BON_3PW_SHIP) result += '3pw income + temporary shiping distance increase';
  else if(tile == T_BON_3PW_1W) result += '3pw + 1w income';
  else if(tile == T_BON_PASSDVP_2C) result += '1vp per d when passing + 2c income';
  else if(tile == T_BON_PASSTPVP_1W) result += '2vp per tp when passing + 1w income';
  else if(tile == T_BON_PASSSHSAVP_2W) result += '4vp per sh/sa when passing + 2w income';
  else if(tile == T_BON_1P) result += '1p income';
  else if(tile == T_BON_PASSSHIPVP_3PW) result += '3vp per ship level when passing + 3pw income';
  else if(tile == T_FAV_3F) result += '3 fire cult';
  else if(tile == T_FAV_3W) result += '3 water cult';
  else if(tile == T_FAV_3E) result += '3 earth cult';
  else if(tile == T_FAV_3A) result += '3 air cult';
  else if(tile == T_FAV_2F_6TW) result += '2 fire cult + form towns at 6 instead of 7 power';
  else if(tile == T_FAV_2W_CULT) result += '2 water cult + free cult action';
  else if(tile == T_FAV_2E_1PW1W) result += '2 earth cult + 1pw and 1w income';
  else if(tile == T_FAV_2A_4PW) result += '2 air cult + 4pw income';
  else if(tile == T_FAV_1F_3C) result += '1 fire cult + 3c income';
  else if(tile == T_FAV_1W_TPVP) result += '1 water cult + 3vp when building tp';
  else if(tile == T_FAV_1E_DVP) result += '1 earth cult + 2vp when building d';
  else if(tile == T_FAV_1A_PASSTPVP) result += '1 air cult + [2,3,3,4] vp for [1,2,3,4] tp when passing';
  else if(tile == T_TW_2VP_2CULT) result += '2vp + advance each cult twice + 2 instead of 1 town keys';
  else if(tile == T_TW_4VP_SHIP) result += '4vp + free shiping advance (for fakirs: 1 extra carpet distance)';
  else if(tile == T_TW_5VP_6C) result += '5vp + 6c';
  else if(tile == T_TW_6VP_8PW) result += '6vp + 8pw';
  else if(tile == T_TW_7VP_2W) result += '7vp + 2w';
  else if(tile == T_TW_8VP_CULT) result += '8vp + advance each cult once';
  else if(tile == T_TW_9VP_P) result += '9vp + 1p';
  else if(tile == T_TW_11VP) result += '11vp';
  else if(tile == T_ROUND_DIG2VP_1E1C) result += '2vp per spade action. End income: 1 coin per earth level';
  else if(tile == T_ROUND_TW5VP_4E1DIG) result += '5vp when forming town. End income: 1 spade per 4 earth levels';
  else if(tile == T_ROUND_D2VP_4W1P) result += '2vp when building dwelling. End income: 1 priest per 4 water levels';
  else if(tile == T_ROUND_SHSA5VP_2F1W) result += '5vp when upgrading to sa/sh. End income: 1 worker per 2 fire levels';
  else if(tile == T_ROUND_D2VP_4F4PW) result += '2vp when building dwelling. End income: 4 power per 4 fire levels';
  else if(tile == T_ROUND_TP3VP_4W1DIG) result += '3vp when upgrading to tp. End income: 1 spade per 4 water levels';
  else if(tile == T_ROUND_SHSA5VP_2A1W) result += '2vp when upgrading to sa/sh. End income: 1 worker per 2 air levels';
  else if(tile == T_ROUND_TP3VP_4A1DIG) result += '3vp when upgrading to tp. End income: 1 spade per 4 air levels';
  else result += 'unknown tile';
  return result;
}


//cults
//TODO: Name these according to the element instead of color: C_F, C_W, C_E and C_A
var C_NONE = -1;
var C_F = 0; //fire, red
var C_W = 1; //water, blue
var C_E = 2; //earth, brown
var C_A = 3; //air, white

function getCultName(cult) {
  if(cult == C_F) return 'fire';
  if(cult == C_W) return 'water';
  if(cult == C_E) return 'earth';
  if(cult == C_A) return 'air';
  return 'unknown';
}


//Gamestate enum
var S_index = 0;
S_NONE = S_index++;
S_PRE = S_index++; //Pre-game state, where you can choose options, amount of players, start player, ...
//Initial states, each next state is either the same with a next player, or the next one (until S_ACTION is reached)
S_INIT_FACTION = S_index++; //Choosing faction.
S_INIT_FACTION_COLOR = S_index++; //Faction initialization: color
S_INIT_FAVOR = S_index++; //Choosing initial favor tile.
S_INIT_AUX_COLOR = S_index++; //Faction initialization: aux color
S_INIT_DWELLING = S_index++; //Placing initial dwellings until all done.
S_INIT_BONUS = S_index++; //Choosing initial bonus tile.
//The most complex state, handles player taking actions on their turn, passing, rounds, and income between rounds.
S_ACTION = S_index++; //Taking actions, for 6 rounds long.
//States between actions or caused by actions. Next state is again itself, or S_ACTION
S_LEECH = S_index++; //Player making leeching decision
S_CULTISTS = S_index++; //Cultists player choosing cult track after leeching
S_CULT = S_index++; //Choosing cult track
S_PRIEST_COLOR = S_index++; //Choosing color with priest (for riverwalkers)
//States between rounds. Next state is again itself, or S_ACTION
S_ROUND_END_DIG = S_index++; //Player digging due to round end cult bonus
//Final state after all actions and rounds are done.
S_GAME_OVER = S_index++; //Game done, final scores shown.
S_ENUM_END = S_index++;

function getGameStateCodeName(state) {
  switch(state) {
    case S_NONE: return 'none';
    case S_PRE: return 'pre';
    case S_INIT_FACTION: return 'choose_faction';
    case S_INIT_FACTION_COLOR: return 'choose_faction_color';
    case S_INIT_FAVOR: return 'choose_favor';
    case S_INIT_AUX_COLOR: return 'choose_aux_color';
    case S_INIT_DWELLING: return 'initial_dwelling';
    case S_INIT_BONUS: return 'initial_bonus';
    case S_ACTION: return 'action';
    case S_LEECH: return 'leech';
    case S_CULTISTS: return 'cultists';
    case S_CULT: return 'cult';
    case S_ROUND_END_DIG: return 'round_dig';
    case S_GAME_OVER: return 'game_over';
  }
  return 'unknown';
}

var codeNameToGameState_ = {};
for(var i = S_NONE; i < S_ENUM_END; i++) codeNameToGameState_[getGameStateCodeName(i)] = i;

function codeNameToGameState(name) {
  return codeNameToGameState_[name];
}


// Resources (cost or income)
// The order (and enum values) match the order in resource-array objects
var R_index = 0;
R_NONE = -1;
R_C = R_index++;
R_W = R_index++;
R_P = R_index++;
R_PW = R_index++;
R_VP = R_index++;
R_PP = R_index++;
R_KEY = R_index++;
R_SPADE = R_index++;
R_PT = R_index++;
R_CULT = R_index++; //of any, but same, track, indicated by cult variable in action
R_FREECULT = R_index++; // any cult (if multiple: splittable amongst tracks)
R_PT0 = R_index++;
R_PT1 = R_index++;
R_PT2 = R_index++;
R_DARKLINGCONVERTS = R_index++; // TODO: use this as a resource for player.darklingconverts action
R_SPADEVP = R_index++; // *potential* spade-action VPs for if the round bonus point tile is there even though no digging was involved (for lava factions)
R_FIRE = R_index++;
R_WATER = R_index++;
R_EARTH = R_index++;
R_AIR = R_index++;
R_B_D = R_index++; //TODO: use this as a resource for witches dwelling action
R_B_TP = R_index++; //TODO: use this as a resource for swarmlings TP action
R_B_TE = R_index++;
R_B_SH = R_index++;
R_B_SA = R_index++;
R_BRIDGE = R_index++;

