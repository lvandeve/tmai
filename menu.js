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

/*
each button fun receives the following object containing the dropdown states:
{
  numplayers: 2 - 5
  startplayer: -1 - 4 (-1 means random, 0 is human, 1-4 are the AI's)
  finalscoring: -1 - N (-1 means random, 0-N is preset chosen one)
  worldGenerator: one of the registered worldGenerators functions
  presetfaction: [humanfaction, ai1faction, ...] --> none means random
  presetround: [round1tile, round2tile, ...] --> none means random
  presetbonus: {preferred bonus tiles} --> those in the set will be chosen first with the random selection
  newcultistsrule
  towntilepromo2013
  bonustilepromo2013
  fireice
  turnorder: variable turn order
}
*/
function renderPreScreen(px, py, standardButtonFun, randomButtonFun, beginnerButtonFun, quickButtonFun) {
  var parent = hudElement;

  makeText(px, py - 135, 'TM AI: Play TM against AI players.<br/>'
      + 'Programmed by Lode Vandevenne.<br/>'
      + 'AI tweaks by Lou New.<br/>'
      + 'Drawings by Giordano Segatta.<br/>'
      + 'version: v.20150509<br/>'
      + 'Links:<br/>'
      + 'TM on BGG: <a href="http://boardgamegeek.com/boardgame/120677/terra-mystica">http://boardgamegeek.com/boardgame/120677/terra-mystica</a><br/>'
      + 'Snellman: <a href="http://terra.snellman.net/">http://terra.snellman.net/</a><br/>'
      + '<br/>'
      + '*: Choices with an asterix are outside of the regular game rules.<br/>'
      , parent);

  var ppy = py + 20;
  var numPlayerEl = makeLabeledDropDown(px, ppy, 'Num Players', ['5', '4', '3', '2', '1*'], parent);
  assignPreferenceToDropdown(numPlayerEl, preferences.numplayersdropdown);

  var startPlayerEl = makeLabeledDropDown(px + 95, ppy, 'Start Player', ['random', 'human', 'ai1', 'ai2', 'ai3', 'ai4'], parent);
  assignPreferenceToDropdown(startPlayerEl, preferences.startplayerdropdown);

  // It's a checkbox now. It used to be a dropdown with "Human vs AI" and "Observe". TODO: rename everything to checkbox and change the preference to boolean instead of int.
  var playerTypeDropDown = makeCheckbox(px + 200, ppy, parent, 'Observe (only AIs play)', 'Disable to be able to play yourself against the AIs.');
  playerTypeDropDown.checked = (preferences.playertypedropdown == 1);

  ppy += 50;
  var gameTypeDropDown = makeLabeledDropDown(px, ppy, 'Game Type', ['Standard', 'Random*', 'Beginner', 'Quick'], parent);
  gameTypeDropDown.title = 'Standard: game with standard rules (some rules can be overridden with preset choices below). Random: random faction assigned to players ("choose" dropdowns implicitely turned to "random"). Beginner: official beginner setup, faction based on start position, preset settings ignored. Quick: starts the game immediately in the action, faction choice/initial dwellings/... are automatically set up, use preset dropdown below to ensure a certain faction.';
  assignPreferenceToDropdown(gameTypeDropDown, preferences.gametypedropdown);

  var worldMapEl = makeLabeledDropDown(px + 100, ppy, 'World Map', worldNames, parent);
  assignPreferenceToDropdown(worldMapEl, preferences.worldmapdropdown);
  worldMapEl.onchange = function() {
    preferences.worldmapdropdown = worldMapEl.selectedIndex; //this one is stored immediately so you can also use this dropdown to choose snellman game type
  };

  var newcultistcb = makeCheckbox(px, ppy + 55, parent, 'New cultists rule', 'The official new rule where cultists receive 1 power if everyone refuses to take power');
  newcultistcb.checked = preferences.newcultistsrule;
  var towntilepromo2013cb = makeCheckbox(px + 160, ppy + 55, parent, 'Town tile promo 2013', 'Enable the new town tiles from the official 2013 mini expansion');
  towntilepromo2013cb.checked = preferences.towntilepromo2013;
  var bonustilepromo2013cb = makeCheckbox(px + 350, ppy + 55, parent, 'Bonus tile promo 2013', 'Enable the new bonus tile from the official 2013 mini expansion. If checked, tile may appear randomly just like any other bonus tile.');
  bonustilepromo2013cb.checked = preferences.bonustilepromo2013;
  var fireicecb = makeCheckbox(px, ppy + 72, parent, 'Fire & Ice expansion', 'Enable the fire & ice expansion. NOTE: With this checkbox disabled, you can still select expansion worlds, factions and scoring in the preset options below and it will work. Disabling this checkbox will prevent them from being chosen by "random" or by the faction choice in-game.');
  fireicecb.checked = preferences.fireice;
  // Variable turnorder by Lou
  var turnordercb = makeCheckbox(px + 160, ppy + 72, parent, ' Variable Turn Order', 'Enable variable turn order expansion. NOTE: With this checkbox disabled, the original fixed turn order after the first player pass is used.');
  turnordercb.checked = preferences.turnorder;

  ppy += 160;
  makeText(px, ppy, 'Preset* factions', parent).title = 'Override faction choice. Set to "choose" to choose the faction during the game according to normal game rules. Set to "random" to assign a random faction. Set to a given faction to assign that faction to this player';
  var factionDropDowns = [];
  for(var i = 0; i < 5; i++) {
    makeText(px, ppy + 20 + i * 32 + 5, 'player ' + (i + 1), parent);
    var factionsc = [];
    factionsc.push('choose');
    factionsc.push('random');
    for(var j = 0; j < factions.length; j++) factionsc.push(getFactionCodeName(factions[j]));
    var dropdown = makeDropDown(px + 60, ppy + 20 + i * 32, factionsc, parent);
    factionDropDowns.push(dropdown);
    if(preferences.factiondropdown) assignPreferenceToDropdown(dropdown, preferences.factiondropdown[i]);
  }

  var ppx = px + 180;
  makeText(ppx, ppy, 'Preset* round tiles', parent);
  var roundDropDowns = [];
  for(var i = 0; i < 6; i++) {
    makeText(ppx, ppy + 20 + i * 32 + 5, 'round ' + (i + 1), parent);
    var tiles = [];
    tiles.push('random');
    for(var j = T_ROUND_BEGIN + 1; j < T_ROUND_END; j++) tiles.push(tileToStringLong(j, false));
    roundDropDowns.push(makeDropDown(ppx + 60, ppy + 20 + i * 32, tiles, parent));
    if(preferences.presetroundtiles) assignPreferenceToDropdown(roundDropDowns[i], preferences.presetroundtiles[i]);
  }

  ppx = px + 390;
  var bonusBoxesTitle = makeText(ppx, ppy, 'Preset* bonus tiles', parent);
  bonusBoxesTitle.title = 'check the preferred bonus tiles, those are given precedence during random selection. Check a small enough amount of tiles, and those are ensured to be in the game. Or check all except a few, and those few are ensured to be excluded. Selecting all or selecting none does exactly the same: fully randomize them according to the normal game rules.';
  var bonusBoxes = [];
  for(var i = 0; i < (T_BON_END - T_BON_BEGIN - 1); i++) {
    var j = i + T_BON_BEGIN + 1;
    var c = makeCheckbox(ppx, ppy + 20 + i * 22, parent, getTileCodeName(j));
    c.checked = false;
    if(preferences.presetbonustiles) c.checked = !!preferences.presetbonustiles[i];
    bonusBoxes.push(c);
  }
  bonusBoxesTitle.onclick = function() {
    var c = !bonusBoxes[0].checked;
    for(var i = 0; i < bonusBoxes.length; i++) bonusBoxes[i].checked = c;
  }

  var thereIsOnlyOneFinalScoring = (finalScoringDisplayNames.length <= 1);

  ppx = px + 520;
  var finalScoringDropdown;
  if(!thereIsOnlyOneFinalScoring) {
    var finalScoringChoices = ['random'];
    for(var i = 0; i < finalScoringDisplayNames.length; i++) finalScoringChoices.push(finalScoringDisplayNames[i]);
    finalScoringDropdown = makeLabeledDropDown(ppx, ppy, 'Preset* final scoring', finalScoringChoices, parent);
    finalScoringDropdown.title = 'Final scoring: random for regular ';
    assignPreferenceToDropdown(finalScoringDropdown, preferences.finalscoringdropdown);
  }

  //var allc = makeCheckbox(px + 450, ppy - 5, parent, 'Preset bonus tiles', 'check the preferred bonus tiles, those are given precedence during random selection. Check a small enough amount of tiles, and those are ensured to be in the game. Or check all except a few, and those few are ensured to be excluded. Selecting all or selecting none does exactly the same: fully randomize them according to the normal game rules.');
  var allc = makeLinkButton(px, ppy + 200, 'Reset to defaults', parent);
  allc.title = 'resets all presets to defaults';
  allc.onclick = function() {
    for(var i = 0; i < bonusBoxes.length; i++) bonusBoxes[i].checked = false;
    for(var i = 0; i < roundDropDowns.length; i++) roundDropDowns[i].selectedIndex = 0;
    for(var i = 0; i < factionDropDowns.length; i++) factionDropDowns[i].selectedIndex = 0;
  }

  function buttonFun(fun) {
    var params = {};
    params.numplayers = 5 - numPlayerEl.selectedIndex;
    preferences.numplayersdropdown = numPlayerEl.selectedIndex;
    params.startplayer = startPlayerEl.selectedIndex - 1;
    preferences.startplayerdropdown = startPlayerEl.selectedIndex;
    params.worldGenerator = worldGenerators[worldMapEl.selectedIndex] || initStandardWorld;
    params.presetfaction = [];
    for(var i = 0; i < factionDropDowns.length; i++) {
      var f = factions[factionDropDowns[i].selectedIndex - 2] /*because first two choices are 'choose' and 'random'*/;
      if(factionDropDowns[i].selectedIndex == 0) f = 'choose';
      if(factionDropDowns[i].selectedIndex == 1) f = 'random';
      params.presetfaction[i] = f;
      preferences.factiondropdown[i] = factionDropDowns[i].selectedIndex;
    }
    params.presetround = [];
    for(var i = 0; i < roundDropDowns.length; i++) {
      var r = roundDropDowns[i].selectedIndex + T_ROUND_BEGIN;
      if(roundDropDowns[i].selectedIndex == 0) r = T_NONE;
      params.presetround[i] = r;
      preferences.presetroundtiles[i] = roundDropDowns[i].selectedIndex;
    }
    params.presetbonus = {};
    for(var i = 0; i < bonusBoxes.length; i++) {
      if(bonusBoxes[i].checked) params.presetbonus[i + T_BON_BEGIN + 1] = true;
      preferences.presetbonustiles[i] = bonusBoxes[i].checked;
    }

    params.allai = playerTypeDropDown.checked;

    params.finalscoring = thereIsOnlyOneFinalScoring ? 0 : (finalScoringDropdown.selectedIndex - 1);

    params.newcultistsrule = newcultistcb.checked;
    params.towntilepromo2013 = towntilepromo2013cb.checked;
    params.bonustilepromo2013 = bonustilepromo2013cb.checked;
    params.fireice = fireicecb.checked;
    params.turnorder = turnordercb.checked;

    preferences.newcultistsrule = newcultistcb.checked;
    preferences.towntilepromo2013 = towntilepromo2013cb.checked;
    preferences.bonustilepromo2013 = bonustilepromo2013cb.checked;
    preferences.fireice = fireicecb.checked;
    preferences.turnorder = turnordercb.checked;

    preferences.gametypedropdown = gameTypeDropDown.selectedIndex;
    preferences.playertypedropdown = (playerTypeDropDown.checked ? 1 : 0);
    preferences.worldmapdropdown = worldMapEl.selectedIndex;
    preferences.finalscoringdropdown = thereIsOnlyOneFinalScoring ? 0 : finalScoringDropdown.selectedIndex;

    fun(params);
  }

  ppy = py + 170;
  makeButton(px, ppy, 'Start', parent, bind(buttonFun, function(params) {
    if(gameTypeDropDown.selectedIndex == 0) standardButtonFun(params);
    if(gameTypeDropDown.selectedIndex == 1) randomButtonFun(params);
    if(gameTypeDropDown.selectedIndex == 2) beginnerButtonFun(params);
    if(gameTypeDropDown.selectedIndex == 3) quickButtonFun(params);
  }), 'Start new game');

  makeText(px, py + 480, '<h3>Documentation:</h3>' +
    '<h4>Updates</h4>' +
    '<p>20150509: AI tweaks by Lou New added.<p/>' +
    '<p>20150108: Riverwalkers added (possibly still with bugs).<p/>' +
    '<p>20141021: The alternate Fire & Ice world also added.<p/>' +
    '<p>20141019: Fire & Ice expansion: 4 of the 6 new factions added, new map and new final scorings. It is still somewhat beta (may contain bugs).<p/>' +
    '<p>20140406: When taking a power action, it will now auto-burn power if needed. Some game setup dropdowns now remember their state.<p/>' +
    '<p>20131208:You can now also load games from terra.snellman.net. For this, select and copy all the text on the site of a game (ctrl+a, ctrl+c), then paste it in the load game dialog. ' +
        'It will then execute the actions of the game log line by line, until it reaches the same state as on terra.snellman.net. May break on some edge cases.<p/>' +
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
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

// reset with: localStorage.clear();
var preferences = {
  gametypedropdown: undefined,
  playertypedropdown: undefined,
  worldmapdropdown: undefined,
  finalscoringdropdown: undefined,
  factiondropdown: [],
  numplayersdropdown: undefined,
  startplayerdropdown: undefined,
  presetroundtiles: [],
  presetbonustiles: [], //booleans

  newcultistsrule: true,
  towntilepromo2013: true,
  bonustilepromo2013: true,
  fireice: true,
  turnorder: false
};

function assignPreferenceToDropdown(dropdown, value) {
  if(value != undefined && value > 0 && value < dropdown.length) dropdown.selectedIndex = value;
}

//local storage and JSON stringify both supported from IE8 onwards, and by the other common browsers.
function setLocalStorage() {
  if(!localStorageSupported()) return;

  localStorage['gametypedropdown'] = preferences.gametypedropdown;
  localStorage['playertypedropdown'] = preferences.playertypedropdown;
  localStorage['worldmapdropdown'] = preferences.worldmapdropdown;
  localStorage['finalscoringdropdown'] = preferences.finalscoringdropdown;
  localStorage['factiondropdown0'] = preferences.factiondropdown[0];
  localStorage['factiondropdown1'] = preferences.factiondropdown[1];
  localStorage['factiondropdown2'] = preferences.factiondropdown[2];
  localStorage['factiondropdown3'] = preferences.factiondropdown[3];
  localStorage['factiondropdown4'] = preferences.factiondropdown[4];
  localStorage['presetroundtiles'] = JSON.stringify(preferences.presetroundtiles);
  localStorage['presetbonustiles'] = JSON.stringify(preferences.presetbonustiles);
  localStorage['numplayersdropdown'] = preferences.numplayersdropdown;
  localStorage['startplayerdropdown'] = preferences.startplayerdropdown;
  localStorage['newcultistsrule'] = preferences.newcultistsrule;
  localStorage['towntilepromo2013'] = preferences.towntilepromo2013;
  localStorage['bonustilepromo2013'] = preferences.bonustilepromo2013;
  localStorage['fireice'] = preferences.fireice;
  localStorage['turnorder'] = preferences.turnorder;
}

//no longer a cookie, but html5 local storage
function getLocalStorage() {
  if(!localStorageSupported()) return;

  preferences.gametypedropdown = localStorage['gametypedropdown'];
  preferences.playertypedropdown = localStorage['playertypedropdown'];
  preferences.worldmapdropdown = localStorage['worldmapdropdown'];
  preferences.finalscoringdropdown = localStorage['finalscoringdropdown'];
  preferences.factiondropdown[0] = localStorage['factiondropdown0'];
  preferences.factiondropdown[1] = localStorage['factiondropdown1'];
  preferences.factiondropdown[2] = localStorage['factiondropdown2'];
  preferences.factiondropdown[3] = localStorage['factiondropdown3'];
  preferences.factiondropdown[4] = localStorage['factiondropdown4'];
  if(localStorage['presetroundtiles']) preferences.presetroundtiles = JSON.parse(localStorage['presetroundtiles']);
  if(localStorage['presetbonustiles']) preferences.presetbonustiles = JSON.parse(localStorage['presetbonustiles']);
  preferences.numplayersdropdown = localStorage['numplayersdropdown'];
  preferences.startplayerdropdown = localStorage['startplayerdropdown'];
  if(localStorage['newcultistsrule'] != undefined) preferences.newcultistsrule = localStorage['newcultistsrule'] == 'true';
  if(localStorage['towntilepromo2013'] != undefined) preferences.towntilepromo2013 = localStorage['towntilepromo2013'] == 'true';
  if(localStorage['bonustilepromo2013'] != undefined) preferences.bonustilepromo2013 = localStorage['bonustilepromo2013'] == 'true';
  if(localStorage['fireice'] != undefined) preferences.fireice = localStorage['fireice'] == 'true';
  if(localStorage['turnorder'] != undefined) preferences.turnorder = localStorage['turnorder'] == 'true';
}

window.onbeforeunload = setLocalStorage;
getLocalStorage();
