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
player: the player owning this actor
callback: function taking array of actions to execute. Returns '' if ok, error string if the actions could not be executed.
          the array of actions must contain 1 turn-action (or three if it's chaos magicians and the first is the double-action),
          the rest can be optional non-turn-taking actions: converting and burning power.
*/
Actor.prototype.doAction = function(playerIndex /*player object can change during action attempts, so use index and get from players array*/,
                                    callback /*if this returns '', the state machine continues and you should no nothing. If it returns an error string, you should retry and call the callback again*/) {
};

//choose whether to leech power. callback should be called with true or false.
//already is true if some previous players already accepted power from this move (that is to determine what to do with the cultists, if they already received it your decision does not help them further)
//still is the amount of next players that still need to decide about this (once more useful for handling the cultists)
//this function is only called if you have enough VP to afford it and if amount > 0
Actor.prototype.leechPower = function(playerIndex /*receiver*/, fromPlayer /*sender*/, amount, vpcost, roundnum, already, still, callback) {
};

//bonus from the cult track.
//the callback must receive the player and an array of [x,y] coordinates. E.g. if num is 2, give it [[x,y],[x,y]] to dig twice on tile x,y
//the array is allowed to have less than num values, e.g. if there is no reachable spot that can be digged
//NOTE: this does not get called for giants if num would be 1, but when called, num will be 2 (and 2 dig coordinate pairs must be given, both at the same location)
Actor.prototype.doRoundBonusSpade = function(playerIndex, num, callback) {
};

//doCallback should receive player, x, y
Actor.prototype.chooseInitialDwelling = function(playerIndex, callback) {
};

//doCallback should receive player and the chosen faction enum value
Actor.prototype.chooseFaction = function(playerIndex, callback) {
};

//when other players leech from you and you're cultist, choose the cult track here
Actor.prototype.chooseCultistTrack = function(playerIndex, callback) {
};

//TODO: choose cult track when multiple of your cult tracks are at 9, and you choose the cult town bonus tile, and you have fewer keys than the cult tracks at 9.

//callback called with chosen tile. returns '' if ok (= the tile is available), if error you should retry
Actor.prototype.chooseInitialBonusTile = function(playerIndex, callback) {
};

