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

/*
Factions covered:
unittesttext0:
mermaids
halflings (but no SH upgrade)
fakirs
witches
dwarves

unittesttext1:
halflings (but no SH upgrade)
witches
dwarves
mermaids
chaosmagicians
*/

var unittesttext0 = 'show history\n\
removing tile bon3\n\
round 1 scoring: score8\n\
round 2 scoring: score5\n\
round 3 scoring: score6\n\
round 4 scoring: score1\n\
round 5 scoring: score3\n\
round 6 scoring: score7\n\
player 1: qbert80\n\
player 2: riku\n\
player 3: schummel\n\
player 4: marcel\n\
player 5: adjunction\n\
mermaids income_for_faction\n\
halflings income_for_faction\n\
fakirs income_for_faction\n\
witches income_for_faction\n\
dwarves income_for_faction\n\
mermaids: build e4\n\
halflings: build f7\n\
fakirs: build f3\n\
witches: build f4\n\
dwarves: build f6. build e7\n\
witches: build f2\n\
fakirs: build d3\n\
halflings: build h7\n\
mermaids: build d2\n\
dwarves: pass bon6\n\
witches: pass bon1\n\
fakirs: pass bon2\n\
halflings: pass bon5\n\
mermaids: pass bon8\n\
mermaids: upgrade e4 to tp\n\
halflings: upgrade f7 to tp\n\
dwarves: leech 1 from halflings\n\
fakirs: leech 1 from mermaids\n\
fakirs: burn 3. action act2\n\
witches: upgrade f4 to tp\n\
fakirs: leech 1 from witches\n\
dwarves: leech 1 from witches\n\
dwarves: burn 4. action act3\n\
mermaids: burn 4. action act4\n\
halflings: upgrade f7 to te. +fav11\n\
dwarves: leech 1 from halflings\n\
fakirs: upgrade d3 to tp\n\
mermaids: leech 3 from fakirs\n\
witches: upgrade f4 to sh\n\
fakirs: leech 1 from witches\n\
dwarves: leech 1 from witches\n\
dwarves: upgrade e7 to tp\n\
witches: leech 3 from dwarves\n\
mermaids: upgrade e4 to te. +fav11\n\
halflings: burn 6. action act6. transform e10 to brown. build g5\n\
dwarves: leech 1 from halflings\n\
fakirs: leech 2 from mermaids\n\
fakirs: upgrade d3 to te. +fav8\n\
mermaids: leech 3 from fakirs\n\
witches: action actw. build g3\n\
dwarves: upgrade e7 to sh\n\
witches: decline 3 from dwarves\n\
mermaids: advance ship\n\
halflings: build e10\n\
fakirs: action bon2. +air\n\
witches: action bon1. transform h4 to green\n\
dwarves: leech 1 from halflings\n\
dwarves: upgrade f6 to tp\n\
mermaids: build h2\n\
halflings: leech 4 from dwarves\n\
halflings: build d8\n\
fakirs: pass bon9\n\
witches: pass bon4\n\
dwarves: pass bon1\n\
mermaids: pass bon2\n\
halflings: pass bon6\n\
fakirs: transform e6 to yellow\n\
fakirs: build e6\n\
witches: decline 3 from fakirs\n\
witches: action actw. build d1\n\
mermaids: leech 1 from witches\n\
dwarves: leech 3 from fakirs\n\
dwarves: action bon1. build d4\n\
mermaids: advance ship\n\
halflings: send p to earth\n\
fakirs: leech 1 from dwarves\n\
fakirs: burn 4. action act5. build b2\n\
witches: build h4\n\
dwarves: burn 1. action act3\n\
mermaids: build a4\n\
halflings: convert 1pw to 1c. build f5\n\
fakirs: leech 1 from mermaids\n\
fakirs: build a5\n\
witches: burn 3. action act6. transform f1 to green. build g1\n\
mermaids: leech 1 from fakirs\n\
dwarves: leech 2 from halflings\n\
dwarves: build c2\n\
mermaids: build i4\n\
halflings: pass bon5\n\
fakirs: leech 1 from dwarves\n\
fakirs: build e8\n\
witches: build f1\n\
dwarves: leech 3 from fakirs\n\
dwarves: build h6\n\
halflings: leech 2 from dwarves\n\
mermaids: burn 3. action act4\n\
fakirs: pass bon7\n\
witches: pass bon9\n\
dwarves: pass bon6\n\
mermaids: action bon2. +water\n\
mermaids: pass bon1\n\
halflings: action act4\n\
fakirs: burn 1. action act5. build a7\n\
witches: action actw. build a3\n\
dwarves: upgrade c2 to tp\n\
fakirs: leech 1 from dwarves\n\
mermaids: leech 1 from witches\n\
mermaids: send p to water\n\
halflings: upgrade g5 to tp\n\
fakirs: upgrade e6 to tp\n\
witches: decline 3 from fakirs\n\
witches: upgrade d1 to tp\n\
mermaids: leech 1 from witches\n\
dwarves: leech 3 from halflings\n\
dwarves: decline 4 from fakirs\n\
dwarves: action act1. bridge d4:c2\n\
mermaids: action bon1. build c3\n\
dwarves: leech 1 from mermaids\n\
halflings: upgrade f5 to tp\n\
dwarves: leech 2 from halflings\n\
fakirs: upgrade f3 to tp\n\
witches: leech 3 from fakirs\n\
witches: pass bon2\n\
dwarves: dig 1. build e9. convert pw to c\n\
mermaids: build d5\n\
dwarves: decline 4 from mermaids\n\
halflings: leech 3 from dwarves\n\
halflings: advance dig\n\
fakirs: leech 1 from mermaids\n\
fakirs: pass bon9\n\
dwarves: action act2\n\
mermaids: upgrade d5 to tp\n\
fakirs: leech 1 from mermaids\n\
dwarves: decline 4 from mermaids\n\
halflings: pass bon7\n\
dwarves: send p to earth\n\
mermaids: upgrade d5 to te. +fav6\n\
dwarves: decline 4 from mermaids\n\
dwarves: pass bon5\n\
fakirs: leech 1 from mermaids\n\
mermaids: action fav6. +earth\n\
mermaids: pass bon8\n\
mermaids: transform i3 to blue\n\
witches: upgrade d1 to te. +fav4\n\
mermaids: leech 1 from witches\n\
dwarves: action act5. build d7\n\
halflings: leech 2 from dwarves\n\
mermaids: action act4\n\
halflings: advance dig\n\
fakirs: action act2\n\
witches: burn 1. action act6. build e1\n\
dwarves: convert w to c. upgrade c2 to te. +fav7\n\
fakirs: leech 1 from dwarves\n\
mermaids: dig 1. build c4\n\
halflings: dig 3. transform h8 to brown\n\
fakirs: dig 1. build g2\n\
witches: decline 3 from fakirs\n\
witches: action actw. build i6\n\
dwarves: pass bon6\n\
mermaids: send p to fire\n\
halflings: burn 1. action act3\n\
fakirs: build i7\n\
witches: leech 2 from fakirs\n\
witches: burn 2. convert 2pw to 2c. upgrade h4 to tp\n\
mermaids: send p to earth\n\
fakirs: leech 1 from witches\n\
halflings: dig 1. transform g4 to brown\n\
fakirs: build b4\n\
witches: convert 4w to 4c. upgrade h4 to te. +fav8\n\
fakirs: leech 1 from witches\n\
mermaids: leech 1 from fakirs\n\
mermaids: send p to earth\n\
halflings: dig 2. transform i10 to brown\n\
fakirs: convert 1pw to 1c. pass bon1\n\
witches: pass bon9\n\
mermaids: action fav6. +earth\n\
halflings: dig 2. transform g6 to brown\n\
mermaids: dig 1. transform i2 to blue\n\
halflings: dig 2. transform e11 to brown\n\
mermaids: convert 1pw to 1c. pass bon5\n\
halflings: dig 1. transform g7 to brown\n\
halflings: dig 1. transform i11 to blue\n\
halflings: pass bon2\n\
dwarves: burn 2. action act4\n\
mermaids: action act5. build b5\n\
halflings: send p to air\n\
fakirs: leech 1 from mermaids\n\
fakirs: action bon1. build a6\n\
witches: dig 2. build e3\n\
mermaids: decline 3 from witches\n\
fakirs: decline 2 from witches\n\
dwarves: build c5\n\
mermaids: upgrade b5 to tp\n\
halflings: build g4\n\
fakirs: leech 1 from mermaids\n\
fakirs: convert 1pw to 1c. upgrade f3 to te. +fav5\n\
witches: decline 3 from fakirs\n\
witches: burn 1. convert 3pw to 3c. upgrade e3 to tp. +tw5\n\
fakirs: leech 2 from witches\n\
mermaids: decline 3 from witches\n\
dwarves: leech 1 from halflings\n\
dwarves: upgrade c2 to sa. +fav10. +tw2\n\
mermaids: upgrade c4 to tp. connect c4:d5. +tw1\n\
halflings: build g7\n\
fakirs: leech 1 from dwarves\n\
fakirs: leech 1 from mermaids\n\
fakirs: convert 1pw to 1c. upgrade a5 to tp\n\
mermaids: leech 1 from fakirs\n\
witches: action actw. build a10\n\
mermaids: leech 2 from witches\n\
dwarves: upgrade d7 to tp\n\
halflings: decline 2 from dwarves\n\
mermaids: action fav6. +fire\n\
halflings: build i10. +tw2\n\
dwarves: leech 1 from halflings\n\
fakirs: convert 3pw to 3c. upgrade b2 to tp. +tw1\n\
mermaids: leech 1 from fakirs\n\
witches: pass bon7\n\
dwarves: leech 3 from fakirs\n\
dwarves: upgrade e9 to tp. +tw3\n\
halflings: decline 3 from dwarves\n\
mermaids: build i2\n\
halflings: build e11\n\
fakirs: pass bon9\n\
dwarves: send p to earth\n\
mermaids: build i3\n\
halflings: upgrade d8 to tp. +tw5\n\
dwarves: leech 2 from halflings\n\
dwarves: action act2\n\
mermaids: build a11\n\
halflings: action bon2. +earth\n\
dwarves: build i9\n\
mermaids: send p to earth\n\
witches: leech 1 from mermaids\n\
halflings: burn 1. action act3\n\
dwarves: pass bon1\n\
mermaids: send p to earth\n\
halflings: build g6\n\
mermaids: pass bon6\n\
halflings: build h8\n\
halflings: pass bon8\n\
dwarves: decline 2 from halflings\n\
witches: action act1. bridge f4:g3\n\
dwarves: action act3\n\
mermaids: action fav6. +earth\n\
halflings: send p to water\n\
fakirs: action act4\n\
witches: convert 2pw to 2c. convert 1w to 1c. upgrade h4 to sa. +tw3. +fav2\n\
fakirs: leech 1 from witches\n\
dwarves: advance dig\n\
mermaids: convert 2pw to 2c. send p to fire\n\
halflings: send p to air\n\
fakirs: upgrade f3 to sa. +fav1. +tw4\n\
witches: decline 3 from fakirs\n\
witches: send p to air\n\
dwarves: advance dig\n\
mermaids: upgrade d5 to sa. +fav5. convert 1pw to 1c\n\
fakirs: leech 1 from mermaids\n\
halflings: action act2\n\
fakirs: action act5. build e2\n\
mermaids: leech 1 from fakirs\n\
witches: decline 7 from fakirs\n\
witches: send p to water\n\
dwarves: decline 4 from mermaids\n\
dwarves: action bon1. transform d6 to gray\n\
mermaids: upgrade i2 to tp\n\
halflings: upgrade f7 to sa. +fav12\n\
dwarves: decline 2 from halflings\n\
fakirs: upgrade e6 to sh\n\
witches: decline 3 from fakirs\n\
witches: send p to water\n\
dwarves: decline 4 from fakirs\n\
dwarves: dig 1. transform a12 to gray\n\
mermaids: convert 1p to 1c. convert 4pw to 4c. upgrade i2 to sh. +tw4\n\
halflings: dig 2. transform i12 to brown\n\
fakirs: convert 1p to 1w. build b1\n\
witches: burn 1. convert 4pw to 4c. advance ship\n\
dwarves: convert p to w. dig 1. transform i11 to green\n\
mermaids: send p to water\n\
halflings: dig 2. transform i11 to black\n\
fakirs: pass\n\
witches: send p to water\n\
dwarves: pass\n\
mermaids: pass\n\
halflings: send p to fire\n\
witches: pass\n\
halflings: pass\n\
mermaids: +8vp for fire\n\
halflings: +2vp for fire\n\
fakirs: +4vp for fire\n\
mermaids: +6vp for water\n\
halflings: +2vp for water\n\
witches: +6vp for water\n\
mermaids: +8vp for earth\n\
halflings: +3vp for earth\n\
dwarves: +3vp for earth\n\
halflings: +4vp for air\n\
fakirs: +2vp for air\n\
witches: +8vp for air\n\
mermaids: +9vp for network\n\
halflings: +9vp for network\n\
fakirs: +18vp for network\n\
';

var unittesttext1 = 'show history\n\
removing tile bon6\n\
round 1 scoring: score6\n\
round 2 scoring: score5\n\
round 3 scoring: score7\n\
round 4 scoring: score1\n\
round 5 scoring: score4\n\
round 6 scoring: score2\n\
player 1: chris\n\
player 2: cooper\n\
player 3: michel\n\
player 4: snoozefest\n\
player 5: dave\n\
halflings income_for_faction\n\
witches income_for_faction\n\
dwarves income_for_faction\n\
mermaids income_for_faction\n\
chaosmagicians income_for_faction\n\
halflings: build f5\n\
witches: build c3\n\
dwarves: build f6\n\
mermaids: build e4. build d5\n\
dwarves: build e7\n\
witches: build g3\n\
halflings: build f7\n\
chaosmagicians: build e3. pass bon1\n\
mermaids: pass bon4\n\
dwarves: pass bon5\n\
witches: pass bon8\n\
halflings: pass bon2\n\
halflings: burn 3. action act2\n\
witches: advance shipping\n\
dwarves: upgrade e7 to tp\n\
mermaids: leech 1 from dwarves\n\
mermaids: burn 5. action act6. transform c1 to blue. build c4\n\
chaosmagicians: action bon1. build d3\n\
halflings: upgrade f5 to tp\n\
witches: upgrade c3 to tp\n\
mermaids: leech 1 from chaosmagicians\n\
mermaids: leech 1 from witches\n\
dwarves: leech 1 from halflings\n\
dwarves: upgrade e7 to te. +fav11\n\
mermaids: leech 1 from dwarves\n\
mermaids: build c1\n\
chaosmagicians: leech 1 from mermaids\n\
chaosmagicians: upgrade d3 to tp\n\
mermaids: leech 2 from chaosmagicians\n\
halflings: upgrade f5 to te. +fav11\n\
witches: upgrade c3 to sh\n\
dwarves: leech 1 from halflings\n\
dwarves: pass bon9\n\
mermaids: leech 1 from witches\n\
mermaids: build d2\n\
chaosmagicians: leech 3 from mermaids\n\
chaosmagicians: upgrade d3 to te. +fav7. +fav8\n\
halflings: send p to water\n\
mermaids: leech 3 from chaosmagicians\n\
witches: action actw. build d1\n\
mermaids: leech 1 from witches\n\
mermaids: action act4\n\
chaosmagicians: pass bon5\n\
halflings: action bon2. +water\n\
witches: pass bon3\n\
mermaids: build h2\n\
halflings: pass bon1\n\
mermaids: build a11\n\
mermaids: pass bon2\n\
halflings: transform g5 to brown\n\
dwarves: burn 5. action act6. transform f4 to grey. build d4\n\
witches: leech 3 from dwarves\n\
mermaids: leech 1 from dwarves\n\
mermaids: upgrade d2 to tp\n\
witches: leech 1 from mermaids\n\
chaosmagicians: leech 3 from mermaids\n\
chaosmagicians: action act4\n\
halflings: action bon1. build e10\n\
witches: action actw. build f2\n\
dwarves: leech 1 from halflings\n\
dwarves: build f4\n\
mermaids: upgrade d5 to tp\n\
chaosmagicians: leech 1 from witches\n\
chaosmagicians: advance ship\n\
witches: leech 3 from mermaids\n\
halflings: build g5\n\
dwarves: leech 1 from halflings\n\
dwarves: leech 3 from mermaids\n\
witches: action act5. transform c2 to green. build c2\n\
dwarves: build h6\n\
halflings: leech 1 from dwarves\n\
mermaids: build a4\n\
chaosmagicians: dig 1. build g1\n\
halflings: build d8\n\
witches: burn 3. action act2\n\
dwarves: pass bon7\n\
mermaids: upgrade d5 to te. +fav8\n\
witches: leech 3 from mermaids\n\
chaosmagicians: action act3\n\
halflings: build h7\n\
witches: advance shipping\n\
mermaids: upgrade c1 to tp\n\
chaosmagicians: leech 2 from mermaids\n\
chaosmagicians: build g2\n\
dwarves: leech 1 from chaosmagicians\n\
dwarves: leech 1 from halflings\n\
dwarves: leech 3 from mermaids\n\
halflings: pass bon9\n\
witches: build a3\n\
mermaids: leech 1 from witches\n\
mermaids: action bon2. +air\n\
chaosmagicians: build i5\n\
witches: burn 1. convert 1pw to 1c. build i6\n\
mermaids: pass bon1\n\
chaosmagicians: leech 1 from witches\n\
chaosmagicians: pass bon2\n\
witches: pass bon5\n\
dwarves: action act4\n\
mermaids: action bon1. build a10\n\
chaosmagicians: upgrade d3 to sa. +fav5. +fav4\n\
halflings: advance dig\n\
witches: dig 1. transform h4 to green\n\
mermaids: decline 5 from chaosmagicians\n\
dwarves: upgrade e7 to sa. +fav10\n\
mermaids: leech 2 from dwarves\n\
mermaids: action act6. build e2\n\
witches: leech 2 from mermaids\n\
chaosmagicians: leech 1 from mermaids\n\
chaosmagicians: action act3\n\
halflings: send p to air\n\
witches: action actw. build h4\n\
dwarves: advance dig\n\
mermaids: send p to air\n\
chaosmagicians: action act5. burn 2. convert 2pw to 2c. build f3\n\
halflings: pass bon3\n\
dwarves: leech 1 from chaosmagicians\n\
witches: convert 3w to 3c. upgrade f2 to tp\n\
chaosmagicians: leech 1 from witches\n\
mermaids: leech 1 from witches\n\
dwarves: pass bon9\n\
mermaids: pass bon4\n\
chaosmagicians: send p to air\n\
witches: pass bon1\n\
chaosmagicians: action bon2. +air\n\
chaosmagicians: pass bon8\n\
halflings: advance dig\n\
witches: burn 1. action act6. transform e1 to green. build e1\n\
mermaids: decline 1 from witches\n\
dwarves: burn 1. convert 1pw to 1c. advance dig\n\
mermaids: action act4\n\
chaosmagicians: burn 4. action act5. build i7\n\
witches: leech 2 from chaosmagicians\n\
halflings: dig 2. transform g6 to brown\n\
witches: action bon1. transform f1 to green. build f1\n\
mermaids: leech 1 from witches\n\
dwarves: dig 1. transform e9 to gray\n\
mermaids: action act2\n\
chaosmagicians: send p to earth\n\
halflings: dig 2. build d7\n\
witches: dig 2. transform b3 to green\n\
dwarves: dig 2. transform e8 to gray\n\
mermaids: advance dig\n\
chaosmagicians: convert 5w to 5c. advance dig\n\
halflings: dig 2. transform i10 to brown\n\
witches: action actw. -free_d\n\
dwarves: send p to earth\n\
mermaids: advance dig\n\
chaosmagicians: convert 3w to 3c. upgrade i5 to tp\n\
halflings: dig 1. build g4\n\
witches: leech 1 from chaosmagicians\n\
witches: pass bon2\n\
dwarves: leech 1 from halflings\n\
dwarves: pass bon1\n\
mermaids: dig 2. build h3\n\
chaosmagicians: leech 1 from mermaids\n\
chaosmagicians: pass bon9\n\
halflings: dig 1. transform g7 to brown\n\
mermaids: upgrade h3 to tp\n\
chaosmagicians: leech 1 from mermaids\n\
halflings: pass bon7\n\
mermaids: convert 2w to 2c. build i4\n\
mermaids: dig 1. transform b5 to blue\n\
mermaids: pass bon3\n\
chaosmagicians: leech 2 from mermaids\n\
witches: upgrade d1 to tp\n\
dwarves: build e8\n\
mermaids: leech 3 from witches\n\
mermaids: leech 2 from dwarves\n\
mermaids: action act3\n\
chaosmagicians: action act6. build e6\n\
dwarves: decline 5 from chaosmagicians\n\
halflings: send p to fire\n\
witches: action actw. build b3\n\
dwarves: send p to earth for 2\n\
mermaids: upgrade h3 to sh\n\
chaosmagicians: leech 1 from mermaids\n\
chaosmagicians: upgrade e6 to tp\n\
halflings: upgrade f5 to sa. +fav10\n\
witches: convert 2w to 2c. upgrade b3 to tp\n\
dwarves: decline 5 from chaosmagicians\n\
dwarves: leech 1 from halflings\n\
dwarves: build h8\n\
mermaids: upgrade i4 to tp\n\
chaosmagicians: leech 2 from mermaids\n\
chaosmagicians: upgrade e6 to sh\n\
dwarves: decline 5 from chaosmagicians\n\
halflings: leech 1 from dwarves\n\
halflings: burn 3. action act4\n\
witches: burn 3. action act1. bridge b3:c3\n\
dwarves: build e9\n\
halflings: decline 5 from dwarves\n\
mermaids: convert 1p to 1w. convert 3pw to 3c. convert 2w to 2c. upgrade d5 to sa. +fav1\n\
witches: decline 3 from mermaids\n\
chaosmagicians: send p to fire\n\
halflings: upgrade e10 to tp\n\
dwarves: decline 5 from mermaids\n\
dwarves: leech 2 from halflings\n\
witches: action bon2. +water\n\
dwarves: action bon1. transform g6 to yellow\n\
mermaids: pass bon8\n\
chaosmagicians: pass bon3\n\
halflings: upgrade d7 to tp\n\
dwarves: leech 1 from halflings\n\
witches: pass bon9\n\
dwarves: convert 1pw to 1c. pass bon5\n\
halflings: pass bon2\n\
mermaids: action act4\n\
chaosmagicians: action actc. action act1. bridge g1:f3. +tw3. upgrade i5 to te. +fav10. +fav12\n\
halflings: upgrade g4 to tp. +tw5\n\
witches: leech 1 from chaosmagicians\n\
witches: upgrade f1 to tp. +tw3\n\
mermaids: leech 1 from witches\n\
mermaids: leech 2 from chaosmagicians\n\
dwarves: decline 1 from halflings\n\
dwarves: action act6. build g6\n\
mermaids: build b5. connect c4:d5. +tw5\n\
chaosmagicians: upgrade g2 to tp\n\
halflings: decline 3 from dwarves\n\
halflings: burn 2. action act2\n\
dwarves: leech 1 from chaosmagicians\n\
witches: action act5. dig 1. transform a6 to green\n\
dwarves: convert 1w to 1c. upgrade e8 to tp. +tw1\n\
mermaids: decline 3 from dwarves\n\
mermaids: upgrade i4 to te. +fav5. connect a4:c1. +tw2\n\
chaosmagicians: convert 2pw to 2c. convert 4w to 4c. advance dig\n\
halflings: build g7. +tw1\n\
dwarves: decline 2 from halflings\n\
witches: action actw. build a6. +tw2\n\
dwarves: upgrade f6 to tp\n\
halflings: decline 7 from dwarves\n\
mermaids: upgrade e2 to tp\n\
witches: decline 7 from mermaids\n\
chaosmagicians: leech 1 from mermaids\n\
chaosmagicians: send p to fire\n\
halflings: advance ship\n\
witches: advance shipping\n\
dwarves: upgrade g6 to tp\n\
mermaids: action act3\n\
chaosmagicians: burn 2. convert 2pw to 2c. convert 2w to 2c. upgrade g2 to te. +fav3. +fav6\n\
dwarves: leech 1 from chaosmagicians\n\
halflings: decline 4 from dwarves\n\
halflings: dig 2. build d6\n\
witches: dig 2. transform e5 to green\n\
dwarves: pass\n\
mermaids: leech 1 from halflings\n\
mermaids: dig 1. build i2. +tw4\n\
chaosmagicians: action fav6. +water\n\
halflings: send p to air\n\
witches: pass bon1\n\
mermaids: convert 2pw to 2c. advance shipping\n\
chaosmagicians: pass\n\
halflings: build i10\n\
mermaids: convert 3pw to 3c. convert 1w to 1c. advance shipping\n\
halflings: dig 1. transform h5 to brown\n\
mermaids: pass\n\
halflings: action bon2. +fire\n\
halflings: pass\n\
dwarves: leech 1 from halflings\n\
halflings: +2vp for fire\n\
mermaids: +4vp for fire\n\
chaosmagicians: +8vp for fire\n\
halflings: +8vp for water\n\
mermaids: +2vp for water\n\
chaosmagicians: +4vp for water\n\
halflings: +2vp for earth\n\
dwarves: +4vp for earth\n\
chaosmagicians: +8vp for earth\n\
halflings: +4vp for air\n\
mermaids: +2vp for air\n\
chaosmagicians: +8vp for air\n\
halflings: +18vp for network\n\
witches: +9vp for network\n\
mermaids: +9vp for network\n\
'

var unittesttext2 = 'show history\n\\n\
clusters\t18/12/6\n\
Default game options\n\
option strict-leech\n\
option strict-darkling-sh\n\
option strict-chaosmagician-sh\n\
option errata-cultist-power\n\
option mini-expansion-1\n\
option shipping-bonus\n\
option fire-and-ice-final-scoring\n\
option email-notify\n\
map be8f6ebf549404d015547152d5f2a1906ae8dd90\n\
Randomize setup\n\
Round 1 scoring: SCORE4, SA/SH >> 5\n\
Round 2 scoring: SCORE1, SPADE >> 2\n\
Round 3 scoring: SCORE6, TP >> 3\n\
Round 4 scoring: SCORE2, TOWN >> 5\n\
Round 5 scoring: SCORE5, D >> 2\n\
Round 6 scoring: SCORE7, SA/SH >> 5\n\
Removing tile BON8\n\
Removing tile BON9\n\
Removing tile BON7\n\
Removing tile BON2\n\
Player 1: Rob\n\
Player 2: Lode\n\
Player 3: Jan\n\
Added final scoring tile: connected-clusters\n\
swarmlings setup\n\
chaosmagicians setup\n\
nomads setup\n\
swarmlings build E4\n\
nomads build D3\n\
nomads build E8\n\
swarmlings build H2\n\
nomads build B2\n\
chaosmagicians build D6\n\
nomads Pass BON6\n\
chaosmagicians Pass BON4\n\
swarmlings Pass BON1\n\
Round 1 income\n\
swarmlings income_for_faction\n\
chaosmagicians income_for_faction\n\
nomads income_for_faction\n\
Round 1, turn 1\n\
swarmlings 1 upgrade E4 to TP\n\
nomads Leech 1 from swarmlings\n\
chaosmagicians burn 4. action ACT4\n\
nomads 2 upgrade D3 to TP\n\
swarmlings -1 Leech 2 from nomads\n\
Round 1, turn 2\n\
swarmlings action BON1. build I2\n\
chaosmagicians upgrade D6 to TP\n\
nomads burn 3. action ACT2\n\
Round 1, turn 3\n\
swarmlings build I1\n\
chaosmagicians upgrade D6 to TE. +FAV11. +FAV7\n\
nomads send p to FIRE\n\
Round 1, turn 4\n\
swarmlings 2 upgrade E4 to SH\n\
chaosmagicians build C5\n\
nomads -1 Leech 2 from swarmlings\n\
nomads 3 upgrade D3 to SH\n\
swarmlings -2 Leech 3 from nomads\n\
Round 1, turn 5\n\
swarmlings action ACTS. Upgrade I1 to TP\n\
chaosmagicians build A12\n\
nomads action ACTN. transform E7 to yellow\n\
Round 1, turn 6\n\
swarmlings pass BON3\n\
chaosmagicians pass BON1\n\
nomads build E7\n\
nomads pass BON5\n\
Round 2 income\n\
swarmlings income_for_faction\n\
chaosmagicians income_for_faction\n\
nomads income_for_faction\n\
Round 2, turn 1\n\
swarmlings action ACT6. build H3\n\
chaosmagicians action BON1. build D7\n\
nomads burn 3. action ACT4\n\
Round 2, turn 2\n\
swarmlings build I4\n\
chaosmagicians advance ship\n\
nomads action ACTN. build E6\n\
Round 2, turn 3\n\
swarmlings action ACTS. Upgrade I4 to TP. +TW7\n\
chaosmagicians pass BON10\n\
nomads 3 build E5\n\
swarmlings -2 Leech 3 from nomads\n\
Round 2, turn 4\n\
swarmlings upgrade I1 to TE. +FAV11\n\
nomads 3 upgrade E5 to TP\n\
swarmlings -2 Leech 3 from nomads\n\
Round 2, turn 5\n\
swarmlings pass BON4\n\
nomads 3 convert 2W to 2C. upgrade E5 to TE. +FAV10\n\
nomads pass BON1\n\
swarmlings Decline 3 from nomads\n\
Round 3 income\n\
chaosmagicians income_for_faction\n\
nomads income_for_faction\n\
swarmlings income_for_faction\n\
Round 3, turn 1\n\
chaosmagicians advance ship\n\
nomads send p to WATER\n\
swarmlings 3 action ACT6. transform I6 to blue. build C1\n\
Round 3, turn 2\n\
chaosmagicians burn 4. action ACT5. build B4\n\
nomads -2 Leech 3 from swarmlings\n\
nomads 1 action ACTN. build D2\n\
swarmlings Leech 1 from nomads\n\
swarmlings action ACT4\n\
Round 3, turn 3\n\
chaosmagicians build A6\n\
nomads 1 convert 2PW to 2C. upgrade D2 to TP\n\
swarmlings Leech 1 from nomads\n\
swarmlings Send p to earth\n\
Round 3, turn 4\n\
chaosmagicians 2 convert 2w to 2c. build d4\n\
nomads -1 Leech 2 from chaosmagicians\n\
nomads action BON1. transform E2 to yellow\n\
swarmlings 1 build A4\n\
nomads Leech 1 from swarmlings\n\
Round 3, turn 5\n\
chaosmagicians pass BON3\n\
nomads 1 burn 2. convert 3PW to 3C. upgrade E6 to TP\n\
swarmlings 5 action ACTS. Upgrade C1 to TP\n\
chaosmagicians Leech 1 from nomads\n\
nomads Decline 5 from swarmlings\n\
Round 3, turn 6\n\
nomads pass BON6\n\
swarmlings pass BON1\n\
Round 4 income\n\
chaosmagicians income_for_faction\n\
nomads income_for_faction\n\
swarmlings income_for_faction\n\
nomads transform E3 to yellow\n\
Round 4, turn 1\n\
chaosmagicians 3 upgrade D4 to TP\n\
nomads -2 Leech 3 from chaosmagicians\n\
nomads action ACT4\n\
swarmlings send p to EARTH\n\
Round 4, turn 2\n\
chaosmagicians 3 convert 1W to 1C. upgrade D4 to TE. +FAV9. +FAV6\n\
nomads -2 Leech 3 from chaosmagicians\n\
nomads 3 build E3\n\
swarmlings -2 Leech 3 from nomads\n\
swarmlings action BON1. build A3\n\
Round 4, turn 3\n\
chaosmagicians action FAV6. +EARTH\n\
nomads build E2. +TW5\n\
swarmlings action ACT1. Bridge C1:A3\n\
Round 4, turn 4\n\
chaosmagicians 1 convert 2w to 2c. dig 1. build C2\n\
nomads Leech 1 from chaosmagicians\n\
nomads 2 convert 1PW to 1C. upgrade E7 to TP. +TW5\n\
swarmlings action ACT6. build A2\n\
chaosmagicians -1 Leech 2 from nomads\n\
Round 4, turn 5\n\
chaosmagicians convert pw to c. pass bon10\n\
nomads action ACTN. transform F1 to yellow. convert 1PW to 1C\n\
swarmlings 5 upgrade C1 to TE. +FAV5\n\
nomads -2 Leech 5 from swarmlings\n\
Round 4, turn 6\n\
nomads 1 1 convert 1PW to 1C. upgrade B2 to TP\n\
swarmlings Leech 1 from nomads\n\
swarmlings action ACTS. Upgrade A2 to TP. +TW3\n\
Round 4, turn 7\n\
nomads advance ship\n\
chaosmagicians Leech 1 from nomads\n\
swarmlings send p to EARTH\n\
Round 4, turn 8\n\
nomads convert 3PW to 1W. pass BON4\n\
swarmlings pass BON6\n\
Round 5 income\n\
chaosmagicians income_for_faction\n\
nomads income_for_faction\n\
swarmlings income_for_faction\n\
chaosmagicians transform G4 to red\n\
swarmlings transform D1 to blue. transform F3 to blue\n\
Round 5, turn 1\n\
chaosmagicians convert pw to c. build G4\n\
nomads 1 action ACT5. build F5\n\
swarmlings send p to Air\n\
chaosmagicians Leech 1 from nomads\n\
Round 5, turn 2\n\
chaosmagicians advance ship\n\
nomads 2 build B1\n\
swarmlings -1 Leech 2 from nomads\n\
swarmlings action act4\n\
Round 5, turn 3\n\
chaosmagicians 4 convert 2PW to 2C. dig 1. build F4\n\
nomads decline 4 from chaosmagicians\n\
nomads build F1\n\
swarmlings 3 build D1\n\
Round 5, turn 4\n\
chaosmagicians action FAV6. +FIRE\n\
nomads Decline 3 from swarmlings\n\
nomads 4 build H1\n\
swarmlings Decline 4 from nomads\n\
swarmlings 1 4 build F3\n\
chaosmagicians Leech 1 from swarmlings\n\
Round 5, turn 5\n\
chaosmagicians 2 convert 1PW to 1C. convert 2W to 2C. upgrade C2 to TP\n\
nomads -3 leech 4 from swarmlings\n\
nomads -1 Leech 2 from chaosmagicians\n\
nomads 1 1 action ACTN. build A5\n\
chaosmagicians Leech 1 from nomads\n\
swarmlings Leech 1 from nomads\n\
swarmlings send p to AIR\n\
Round 5, turn 6\n\
chaosmagicians send p to EARTH\n\
nomads burn 1. action ACT2\n\
swarmlings 1 4 action ACTS. Upgrade F3 to TP\n\
chaosmagicians Leech 1 from swarmlings\n\
Round 5, turn 7\n\
chaosmagicians 2 convert 2pw to 2c. convert p to w. build i5\n\
nomads Decline 4 from swarmlings\n\
nomads send p to FIRE\n\
swarmlings -1 Leech 2 from chaosmagicians\n\
swarmlings 3 dig 1. build F2\n\
nomads -2 Leech 3 from swarmlings\n\
Round 5, turn 8\n\
chaosmagicians pass BON3\n\
nomads advance ship\n\
swarmlings convert pw to c. pass BON10\n\
nomads pass BON6\n\
Round 6 income\n\
chaosmagicians income_for_faction\n\
nomads income_for_faction\n\
swarmlings income_for_faction\n\
Round 6, turn 1\n\
chaosmagicians upgrade D6 to SA. Convert pw to c. +FAV10. +FAV12\n\
nomads 1 2 upgrade B2 to TE. convert 2PW to 2C. +FAV5. convert 1PW to 1C\n\
chaosmagicians Leech 2 from nomads\n\
swarmlings Leech 1 from nomads\n\
swarmlings action ACT4\n\
Round 6, turn 2\n\
chaosmagicians 2 4 convert 1PW to 1C. upgrade F4 to TP\n\
nomads -2 Leech 4 from chaosmagicians\n\
nomads 1 1 upgrade A5 to TP. convert 1PW to 1C\n\
chaosmagicians Leech 1 from nomads\n\
swarmlings Decline 2 from chaosmagicians\n\
swarmlings Leech 1 from nomads\n\
swarmlings advance ship\n\
Round 6, turn 3\n\
chaosmagicians convert 1PW to 1C. send p to fire\n\
nomads 3 action ACTN. build B3\n\
swarmlings 1 build I6\n\
chaosmagicians Leech 3 from nomads\n\
chaosmagicians Leech 1 from swarmlings\n\
Round 6, turn 4\n\
chaosmagicians 2 convert 1PW to 1C. build g2\n\
nomads 1 2 convert 1PW to 1C. upgrade B2 to SA. +FAV12. +TW8\n\
swarmlings Decline 2 from chaosmagicians\n\
swarmlings Leech 1 from nomads\n\
swarmlings action ACTS. Upgrade H3 to TP\n\
chaosmagicians Decline 2 from nomads\n\
Round 6, turn 5\n\
chaosmagicians 3 upgrade A6 to TP\n\
nomads Decline 3 from chaosmagicians\n\
nomads send p to Water\n\
swarmlings build H4\n\
Round 6, turn 6\n\
chaosmagicians send p to AIR\n\
nomads pass\n\
swarmlings action ACT2\n\
Round 6, turn 7\n\
chaosmagicians action FAV6. +AIR. convert 1PW to 1C\n\
swarmlings advance ship\n\
Round 6, turn 8\n\
chaosmagicians pass\n\
swarmlings 5 Convert 2pw to 2c. convert 3w to 3c. upgrade C1 to SA. +FAV12\n\
Round 6, turn 9\n\
swarmlings send p to WATER. burn 2. convert 5pw to p\n\
Round 6, turn 10\n\
swarmlings Send p to water\n\
swarmlings pass\n\
nomads Leech 5 from swarmlings\n\
Scoring connected-clusters\n\
swarmlings vp for connected-clusters\n\
chaosmagicians vp for connected-clusters\n\
nomads vp for connected-clusters\n\
Scoring FIRE cult\n\
swarmlings vp for FIRE\n\
chaosmagicians vp for FIRE\n\
nomads vp for FIRE\n\
Scoring WATER cult\n\
swarmlings vp for WATER\n\
chaosmagicians vp for WATER\n\
nomads vp for WATER\n\
Scoring EARTH cult\n\
swarmlings vp for EARTH\n\
chaosmagicians vp for EARTH\n\
nomads vp for EARTH\n\
Scoring AIR cult\n\
swarmlings vp for AIR\n\
chaosmagicians vp for AIR\n\
nomads vp for AIR\n\
Scoring network\n\
swarmlings vp for network\n\
chaosmagicians vp for network\n\
nomads vp for network\n\
Converting resources to VPs\n\
swarmlings score_resources\n\
chaosmagicians score_resources\n\
nomads score_resources\n\
'

function expect(boolean, message) {
  if(!boolean) {
    if(message) console.log(message);
    throw new Error(message || 'test failed');
  }
}

function expectEqual(a, b) {
  expect(a == b, 'expected ' + a + ' got ' + b);
}

function runUnitTest() {
  try {
    //snellmandebug = true;
    var game;

    game = deSerializeGameState(unittesttext0);
    expectEqual(127, game.players[0].vp);
    expectEqual(158, game.players[1].vp);
    expectEqual(137, game.players[2].vp);
    expectEqual(102, game.players[3].vp);
    expectEqual(107, game.players[4].vp);

    game = deSerializeGameState(unittesttext1);
    expectEqual(175, game.players[0].vp);
    expectEqual(94, game.players[1].vp);
    expectEqual(101, game.players[2].vp);
    expectEqual(106, game.players[3].vp);
    expectEqual(98, game.players[4].vp);

    game = deSerializeGameState(unittesttext2);
    expectEqual(143, game.players[0].vp);
    expectEqual(126, game.players[1].vp);
    expectEqual(147, game.players[2].vp);

    console.log('test success');
    addLog('test success');
  } catch(e) {
    console.log('test fail - print out snellmanunittesttext or set snellmandebug = true to see log');
    addLog('test fail');
  }
  drawHud();
  drawMap();
  displayLog();
}
