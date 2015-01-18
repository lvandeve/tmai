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

//Base class for any human or AI controller.

//Constructor for the actor of a player (interface class for human, or any AI implementation)
var Actor = function() {
};

/*
For all the functions below, the following parameters have the following meaning:
playerIndex: Index of the player owning this actor - player object can change during action attempts so index is more stable)
callback: function taking two parameter, the playerIndex and the result (type of the result depends on the type of choice).
          Returns '' if ok (then just return), error string if the actions could not be executed (so you should retry with different result).
          the type of the result parameter is described at each function below.
          E.g. for leechPower where it is boolean: callback(playerIndex, true)
*/

//callback result (second parameter) should be the chosen faction
Actor.prototype.chooseFaction = function(playerIndex, callback) {
};

//callback result (second parameter) object should be [x, y]
Actor.prototype.chooseInitialDwelling = function(playerIndex, callback) {
};

//callback result (second parameter) should be the chosen bonus tile emum value
Actor.prototype.chooseInitialBonusTile = function(playerIndex, callback) {
};

//callback result (second parameter) should be the chosen favor tile emum value
Actor.prototype.chooseInitialFavorTile = function(playerIndex, callback) {
};

//callback result (second parameter) should be the chosen color emum value
//this function gets called during faction selection for factions where needed, but also later in game when unlocking new colors. In that case, return Z for getting the priest instead.
Actor.prototype.chooseAuxColor = function(playerIndex, callback) {
};

//callback results hould be an array of actions (valid according to the game rules) to execute
Actor.prototype.doAction = function(playerIndex, callback) {
};

//amount: how much power to gain (already taken into account if you receive less due to quite full power bowls). This function is only called if this is > 0.
//vpcost: how much vp points it costs to accept this power
//roundnum: which round the game is in
//already: amount of players who have already taken power for this action. If 0, it means your decision will affect the cultists result
//still: how much players after you receive non-0 amount of power due to the action
//callback result (second parameter) should be "true" or "false"
Actor.prototype.leechPower = function(playerIndex /*receiver*/, fromPlayer /*sender*/, amount, vpcost, roundnum, already, still, callback) {
};

//when other players leech from you and you're cultist, choose the cult track here
//callback result (second parameter) should be the chosen cult track enum value
Actor.prototype.chooseCultistTrack = function(playerIndex, callback) {
};
//TODO (maybe): choose cult track when multiple of your cult tracks are at 9, and you choose the cult town bonus tile, and you have fewer keys than the cult tracks at 9.

//bonus from the cult track.
//the callback result (second parameter) must be array of [x,y] coordinates. E.g. if num is 2, give it [[x,y],[x,y]] to dig twice on tile x,y
//the array is allowed to have less than num values, e.g. if there is no reachable spot that can be digged
//NOTE: this does not get called for giants if num would be 1, but when called, num will be 2 (and 2 dig coordinate pairs must be given, both at the same location)
Actor.prototype.doRoundBonusSpade = function(playerIndex, callback) {
};

