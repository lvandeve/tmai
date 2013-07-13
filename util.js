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

//wrap value in range [start,end - 1]
function wrap(v, start, end) {
  if(end <= start) throw 'invalid range';
  while(v < start) v += (end - start);
  while(v >= end) v -= (end - start);
  return v;
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

//returns 0 for anything that is false, the value otherwise
function undef0(v) {
  return v || 0;
}

//x can be undefined and is then treated as 0
function incrUndef(x, y) {
  return x ? x + y : y;
}

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
    // Does not work in IE
    var r = Number(Math.floor(rgba[0])).toString(10);
    var g = Number(Math.floor(rgba[1])).toString(10);
    var b = Number(Math.floor(rgba[2])).toString(10);
    var a = Number(rgba[3] / 255).toString(10);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  return '#000'; //unknown
}

function trim(text) {
  return text.replace(/\s/gm, '');
}

//adds text vertically and horizontally centered, multiline depending on width.
//returns the text element
//not supported in IE8 and below due to making a div a table cell.
function makeCenteredText(text, width, x, y, parent) {
  var div =  document.createElement('div');
  div.style.position = 'absolute';
  div.style.left = '' + Math.floor(x - width / 2) + 'px';
  div.style.top = '' + Math.floor(y - 50) + 'px';
  div.style.display = 'table-cell';
  div.style.textAlign = 'center';
  div.style.verticalAlign = 'middle';
  div.innerHTML = text;
  parent.appendChild(div);
  return div;
}
