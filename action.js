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


//Action class and a few functions about the action enum types.

//A single action performed during a player's turn
//However, a turn exists out of an array of these actions: some parts, such as converting resources, do not count as
//a full player's turn. Also, the chaos magicions can have 2 more actions if there is their double action action.
// constructor
function Action(type) {
  this.type = type;
  // Coordinate for dig, build, ... e.g. [0,0]
  this.co = null;
  this.cos = []; //array of coordinates for multi-coordinate actions such as bridge

  this.bontile = T_NONE; //passing tile
  this.favtiles = []; //favor tiles taken. Can be multiple (for chaos magicians)
  this.twtiles = []; //town tiles. Can be multiple (e.g. when taking 6 town size tile)
  this.cult = C_NONE; //for cult track actions
  this.color = N; //for color related actions
}

function makeActionWithXY(type, x, y) {
  var result = new Action(type);
  result.co = [x, y];
  return result;
}

function makeActionWithCult(type, cult) {
  var result = new Action(type);
  result.cult = cult;
  return result;
}

//Whether it's an action that you can do once per turn. If false, it's an auxiliary action such as burn/convert.
//Even though they can be combined, every spade, transform and build action is also a turn action. Further code is needed to enforce their rules during a turn.
function isTurnAction(action) {
  return action.type >= A_PASS;
}

//Does NOT include halflings SH upgrade.
function isSpadeGivingAction(action) {
  return action.type >= A_SPADE && action.type <= A_GIANTS_2SPADE;
}

//A transform action is any action that transforms terrain and allows also doing A_BUILD afterwards.
function isTransformAction(action) {
  return action.type >= A_TRANSFORM_CW && action.type <= A_SANDSTORM;
}

//This excludes the sandstorm. This are actions that consume spades, so are ok in the same turn after using a power or bonus action that gives spades.
function isSpadeConsumingAction(action) {
  return action.type >= A_TRANSFORM_CW && action.type <= A_TRANSFORM_SPECIAL;
}

//returns how many spades the action produces (positive) or consumes (negative). Includes halflings SH etc...
function spadesDifference(player, action) {
  if(action.type == A_SPADE) return 1;
  if(action.type == A_BONUS_SPADE) return 1;
  if(action.type == A_POWER_SPADE) return 1;
  if(action.type == A_POWER_2SPADE) return 2;
  if(action.type == A_GIANTS_2SPADE) return 2;
  if(action.type == A_UPGRADE_SH && player.faction == F_HALFLINGS) return 3;
  if(action.type == A_TRANSFORM_CW) return -1;
  if(action.type == A_TRANSFORM_CCW) return -1;
  if(action.type == A_GIANTS_TRANSFORM) return -2;
  if(action.type == A_TRANSFORM_SPECIAL) return -1;
  // A_SANDSTORM and A_TRANSFORM_SPECIAL2: 0!
  return 0;
}

function actionsSpadesDifference(player, actions) {
  var result = 0;
  for(var i = 0; i < actions.length; i++) result += spadesDifference(player, actions[i]);
  return result;
}

function isUpgradeAction(action) {
  return action.type >= A_UPGRADE_TP && action.type <= A_SWARMLINGS_TP;
}

//any build action that can be involved in founding a town, includes dwelling and mermaids watertown tile
function isTownyBuildAction(action) {
  return action.type == A_BUILD || (action.type == A_WITCHES_D && action.co != null) || action.type == A_CONNECT_WATER_TOWN;
}

function isBuildDwellingAction(action) {
  return action.type == A_BUILD || (action.type == A_WITCHES_D && action.co != null);
}

//any build action that can be involved in founding a town, includes dwelling and mermaids watertown tile
function isBridgeAction(action) {
  return action.type == A_PLACE_BRIDGE;
}

function isConvertAction(action) {
  return action.type > A_BURN && action.type <= A_CONVERT_1W_1P;
}

function isConvertOrBurnAction(action) {
  return action.type >= A_BURN && action.type <= A_CONVERT_1W_1P;
}

//whether this is a faction-specific action
function isFactionAction(action) {
  if(action == A_CONNECT_WATER_TOWN) return true;
  if(action == A_CONVERT_1W_1P) return true;
  if(action == A_CONVERT_1VP_1C) return true;
  if(action == A_CONVERT_2C_1VP) return true;
  if(action == A_DOUBLE) return true;
  if(action == A_TUNNEL) return true;
  if(action == A_CARPET) return true;
  if(action == A_GIANTS_2SPADE) return true;
  if(action == A_GIANTS_TRANSFORM) return true;
  if(action == A_TRANSFORM_SPECIAL) return true;
  if(action == A_TRANSFORM_SPECIAL2) return true;
  if(action == A_SANDSTORM) return true;
  if(action == A_WITCHES_D) return true;
  if(action == A_SWARMLINGS_TP) return true;
  if(action == A_AUREN_CULT) return true;
  if(action == A_ENGINEERS_BRIDGE) return true;
  if(action == A_SHIFT) return true;
  if(action == A_SHIFT2) return true;
  return false;
}

function actionRequiresTownClusterRecalc(action) {
  return (isUpgradeAction(action) && action.type != A_UPGRADE_TE) || isTownyBuildAction(action) || isBridgeAction(action);
}

function actionMightFormTown(action) {
  if(actionRequiresTownClusterRecalc(action)) return true;
  for(var i = 0; i < action.favtiles.length; i++) {
    if(action.favtiles[i] == T_FAV_2F_6TW) return true;
  }
  return false;
}

function actionsRequireTownClusterRecalc(actions) {
  for(var i = 0; i < actions.length; i++) if(actionRequiresTownClusterRecalc(actions[i])) return true;
  return false;
}
