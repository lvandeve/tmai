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

//JavaScript utilities

////////////////////////////////////////////////////////////////////////////////
// Objects and functions
////////////////////////////////////////////////////////////////////////////////

//bind a single argument to a function
function bind(f, args) {
  var params = Array.prototype.slice.call(arguments);
  params.shift();
  return function(args2) {
    var params2 = params;
    for(var i = 0; i < arguments.length; i++) params2 = params2.concat([arguments[i]]);
    return f.apply(this, params2);
  };
}

function clone(obj) {
  // Handle the 3 simple types, and null or undefined
  if(null == obj || "object" != typeof obj) return obj;

  // Handle Array
  if(obj instanceof Array) {
    var copy = [];
    for (var i = 0, len = obj.length; i < len; i++) {
        copy[i] = clone(obj[i]);
    }
    return copy;
  }

  // Handle Object
  if (obj instanceof Object) {
    var copy = new obj.constructor(); //This makes it also have the correct prototype
    for(var attr in obj) {
      if(obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
    }
    return copy;
  }

  throw new Error("Cloning this object not supported.");
}

//must be objects
function shallowCopy(from, to) {
  for(var attr in from) {
    if(from.hasOwnProperty(attr)) to[attr] = from[attr];
  }
}

function inherit(subclass, parent) {
  subclass.prototype = new parent();
  subclass.prototype.constructor = subclass;
}

// Exists in newer browsers, not in pre-9 IE.
if(!Array.isArray) {
  Array.isArray = function(arg) {
    return Object.prototype.toString.call(arg) === "[object Array]";
  };
}

//can encode things like 5, [1,2], [[1,2],3,[4,[5]]], ... as strings
function encodeNestedArray(array) {
  var stack = [[[array], 0]];
  var result = '';
  for(;;) {
    var s = stack[stack.length - 1];
    if(s[1] >= s[0].length) {
      stack.pop();
      if (stack.length == 0) break;
      result += ']';
    } else {
      if(s[1] > 0) result += ',';
      var el = s[0][s[1]];
      if(Array.isArray(el)) {
        result += '[';
        stack.push([el, 0]);
      } else {
        result += el;
      }
      s[1]++;
    }
  }
  return result;
}

// Decodes nested array from string in [] notation
function decodeNestedArray(text) {
  text = text.trim();
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

////////////////////////////////////////////////////////////////////////////////
// Math and random
////////////////////////////////////////////////////////////////////////////////

//wrap value in range [start,end - 1]
function wrap(v, start, end) {
  if(end <= start) throw new Error('invalid range');
  while(v < start) v += (end - start);
  while(v >= end) v -= (end - start);
  return v;
}

//returns 0 for anything that is false, the value otherwise
function undef0(v) {
  return v || 0;
}

//x can be undefined and is then treated as 0
function incrUndef(x, y) {
  return x ? x + y : y;
}

//returns a random integer in range [0, limit - 1]
function randomInt(limit) {
  var result = Math.floor(Math.random() * limit);
  if(result == limit) result--; //should never happen, but if it does number belongs in highest bucket.
  return result;
}

function randomIndex(array) {
  return randomInt(array.length);
}

//helper function for predictable pseudo random numbers
function randomTwiddle_(key) {
  key += ~(key << 15);
  key ^= (key >> 10);
  key += (key << 3);
  key ^= (key >> 6);
  key += ~ (key << 11);
  key ^= (key >> 16);
  return key;
}

//returns a predictable pseudo random number. The same key will always return the same number. It's a bit like a fast hash.
//result is between 0 and 256
function pseudoRandom(n) {
  return ((randomTwiddle_(n) + 1) * 7) % 256;
}

function pseudoRandom2D(x, y) {
  return pseudoRandom((y << 16) + x);
}

function pseudoRandom3D(x, y, z) {
  return pseudoRandom((z << 32) + (y << 16) + x);
}

////////////////////////////////////////////////////////////////////////////////
// DOM
////////////////////////////////////////////////////////////////////////////////

function makeElement(parent, tag) {
  var el =  document.createElement(tag);
  parent.appendChild(el);
  return el;
}

function makeAbsElement(px, py, parent, tag) {
  var el =  document.createElement(tag);
  el.style.position = 'absolute';
  el.style.left = '' + Math.floor(px) + 'px';
  el.style.top = '' + Math.floor(py) + 'px';
  parent.appendChild(el);
  return el;
}

function makeDiv(px, py, parent) {
  return makeAbsElement(px, py, parent, 'div');
}

function makeText(px, py, text, parent) {
  var el = makeAbsElement(px, py, parent, 'div');
  el.innerHTML = text;
  return el;
}

function makeSizedDiv(px, py, sizex, sizey, parent) {
  var el =  makeDiv(px, py, parent);
  el.style.width = sizex;
  el.style.height = sizey;
  return el;
}

function makeSameSizeDiv(other, parent) {
  var el =  document.createElement('div');
  el.style.position = 'absolute';
  el.style.left = other.style.left;
  el.style.top = other.style.top;
  el.style.width = other.style.width;
  el.style.height = other.style.height;
  parent.appendChild(el);
  return el;
}

function makeLinkButton(px, py, text, parent) {
  var el =  makeDiv(px, py, parent);
  el.style.textDecoration = 'underline';
  el.style.color = '#0000aa';
  el.style.cursor = 'pointer';
  el.innerHTML = text;
  return el;
}

////////////////////////////////////////////////////////////////////////////////
// CSS
////////////////////////////////////////////////////////////////////////////////

//supports the following formats: #aaa, #aaaaaa, rgb(10,20,30), rgba(10, 20, 30, 0.5). Does NOT support HSL, HSLA, color names.
//returns the color as an array [r,g,b,a], everything in range 0-255.
//Note that it returns RGBA, not just RGB.
function cssColorToRGB(color) {
  if(color.length == 7 && /*color[0] == '#'*/ color.substring(0, 1) == '#') {
    var r = parseInt(color.substring(1, 3), 16);
    var g = parseInt(color.substring(3, 5), 16);
    var b = parseInt(color.substring(5, 7), 16);
    return [r, g, b, 255];
  }
  if(color.length == 4) {
    var r = parseInt(color.substring(1, 2), 16);
    var g = parseInt(color.substring(2, 3), 16);
    var b = parseInt(color.substring(3, 4), 16);
    return [r + 16 * r, g + 16 * g, b + 16 * g, 255];
  }
  if(color.length >= 10 && color.substring(0, 3) == 'rgb') {
    var s = color.substring(4, color.length - 1);
    var values = s.split(',');
    if(values.length == 3) {
      return [parseInt(values[0]), parseInt(values[1]), parseInt(values[2]), 255];
    }
  }
  if(color.length >= 11 && color.substring(0, 4) == 'rgba') {
    var s = color.substring(5, color.length - 1);
    var values = s.split(',');
    if(values.length == 4) {
      return [parseInt(values[0]), parseInt(values[1]), parseInt(values[2]), Math.floor(255 * parseFloat(values[3]))];
    }
  }
  return [0,0,0,255]; //unknown
}

var CSS_FORMAT_HEX3 = 0;
var CSS_FORMAT_HEX6 = 1;
var CSS_FORMAT_RGB = 2;
var CSS_FORMAT_RGBA = 3;

//rgba is an array of the form [r,g,b] or [r,g,b,a], everything in range 0-255
//no format given ==> auto
function RGBToCssColor(rgba, format) {
  if(rgba.length == 3) rgba = [rgba[0], rgba[1], rgba[2], 255];
  if(!format) format = rgba[3] == 255 ? CSS_FORMAT_HEX6 : CSS_FORMAT_RGBA;

  if(format == CSS_FORMAT_HEX3) {
    var r = Number(Math.floor(rgba[0] / 16)).toString(16);
    var g = Number(Math.floor(rgba[1] / 16)).toString(16);
    var b = Number(Math.floor(rgba[2] / 16)).toString(16);
    return '#' + r + g + b;
  }
  else if(format == CSS_FORMAT_HEX6) {
    function toTwoHexDigits(number) {
      return (number < 16 ? '0' : '') + Number(Math.floor(number)).toString(16);
    }

    var r = toTwoHexDigits(rgba[0]);
    var g = toTwoHexDigits(rgba[1]);
    var b = toTwoHexDigits(rgba[2]);
    return '#' + r + g + b;
  }
  else if(format == CSS_FORMAT_RGB) {
    var r = Number(Math.floor(rgba[0])).toString(10);
    var g = Number(Math.floor(rgba[1])).toString(10);
    var b = Number(Math.floor(rgba[2])).toString(10);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  else if(format == CSS_FORMAT_RGBA) {
    // Does not work in IE pre 9
    var r = Number(Math.floor(rgba[0])).toString(10);
    var g = Number(Math.floor(rgba[1])).toString(10);
    var b = Number(Math.floor(rgba[2])).toString(10);
    var a = Number(rgba[3] / 255).toString(10);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  return '#000'; //unknown
}

//adds text vertically and horizontally centered, multiline depending on width.
//returns the text element
function makeCenteredText(text, width, x, y, parent) {
  var div =  document.createElement('div');
  div.style.position = 'absolute';
  div.style.left = '' + Math.floor(x - width / 2) + 'px';
  div.style.top = '' + Math.floor(y - 50) + 'px';
  try {
    //not supported in IE8 and below due to making a div a table cell.
    div.style.display = 'table-cell';
  } catch(e) {
  }
  div.style.textAlign = 'center';
  div.style.verticalAlign = 'middle';
  div.innerHTML = text;
  parent.appendChild(div);
  return div;
}

////////////////////////////////////////////////////////////////////////////////
// Text
////////////////////////////////////////////////////////////////////////////////

// Because not in pre-IE9
if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, '');
  };
}

//does not support regex
function stringContains(text, subtext) {
  return text.indexOf(subtext, 0) >= 0;
}

////////////////////////////////////////////////////////////////////////////////
// Keyboard
////////////////////////////////////////////////////////////////////////////////

var keyHandlers_ = {};

//This one is instead of onkeypress for some non-alphanumeric keys that don't trigger onkeypress in Chrome
document.onkeydown = function(e) {
  var k;
  var ctrl;
  if (window.event != null) {
    k = window.event.keyCode;
    ctrl = window.event.ctrlKey;
  } else {
    k = e.charCode;
    if(k == 0) k = e.keyCode;
    ctrl = e.ctrlKey;
  }

  var result = false;
  if(!ctrl) {
    if(keyHandlers_[k] != undefined) {
      keyHandlers_[k]();
    }
    else result = true;
  }
  else result = true;

  return result; //this overrides shortcuts in e.g. firefox (e.g. / would do quick find in firefox)
};

//dos_code: e.g. 13 for enter, 88 for X, ...
//TODO: works in all browsers? e.g. what do the keycodes do on mac?
function registerKeyHandler(dos_code, fun) {
  if (dos_code.charCodeAt != undefined) dos_code = dos_code.charCodeAt(0);
  keyHandlers_[dos_code] = fun;
}
