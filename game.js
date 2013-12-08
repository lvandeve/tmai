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
// The game-related global variables


// Constructor
var Game = function() {
  this.bw = 13; //board width
  this.bh = 9; //board height

  //The world array has the color of each hex. It is inited with the standard world map.
  this.world = [];

  //array of 3-element arrays.
  //the 3 values are: N bridge, NE bridge, SE bridge
  //the value interpretation is bridge color, or N for none
  this.bridges = [];

  //array of 2-element arrays. the 2 values are: building type, color
  this.buildings = [];

  //global octogons. Octogons is a map, where undefined means the action is free, 1 means the action is taken. There are global octogons and per-player octogons.
  this.octogons = {};

  this.players = [];

  //priests sent to each cult track. The main array is for each track.
  //The sub array is the 4 priest places, the first being the value 3 one, the others the value 2 ones.
  //value N means no player is there, otherwise it's the player color
  //the '2' spots are filled in from left to right, so checking if cultp[C_F][3] == 'N' is enough to see that there's a free '2' spot left there.
  this.cultp = [[N,N,N,N],[N,N,N,N],[N,N,N,N],[N,N,N,N]];

  this.towntiles = {};
  this.favortiles = {};
  this.bonustiles = {};
  //the extra coins that appear on non-taken tiles
  this.bonustilecoins = [];
  this.roundtiles = [];
};

// The global game object
var game = new Game();
