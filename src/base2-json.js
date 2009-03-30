/*
  base2 - copyright 2007-2009, Dean Edwards
  http://code.google.com/p/base2/
  http://www.opensource.org/licenses/mit-license.php

  Contributors:
    Doeke Zanstra
*/

// timestamp: Mon, 30 Mar 2009 18:26:18

new function(_no_shrink_) { ///////////////  BEGIN: CLOSURE  ///////////////

// =========================================================================
// JSON/package.js
// =========================================================================

// This code is loosely based on Douglas Crockford's original:
//  http://www.json.org/json.js

// This package will attempt to mirror the ES4 JSON package.
// This package will not be finalised until the ES4 JSON proposal is also finalised.

var JSON = new base2.Package(this, {
  name:    "JSON",
  imports: "Enumerable",
  version: "0.9",

  // IE5.0 doesn't like non-greedy RegExps
  //VALID: /^("(\\.|[^"\\\n\r])*?"|[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t])+?$/,
  VALID: /^("(\\.|[^"\\\n\r])*"|[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t])*$/,
  
  copy: function(object) {
    // use JSON to make a deep copy of an object
    return this.parse(this.toString(object));
  },
  
  parse: function(string) {
    return this.String.parseJSON(string);
  }
});

eval(this.imports);

JSON.toString = function(object) {
  if (arguments.length == 0) return "[base2.JSON]";
  // find the appropriate module
  var module = this.Object; // default
  try {
    forEach (this, function(property, name) {
      if (JSON.Object.ancestorOf(property) && instanceOf(object, global[name])) {
        module = property;
        throw StopIteration;
      }
    });
  } catch (error) {
    if (error != StopIteration) throw error;
  }
  return module.toJSONString(object);
};

// =========================================================================
// JSON/Object.js
// =========================================================================

JSON.Object = Module.extend({
  toJSONString: function(object) {
    return object == null ? "null" : "{" + reduce(object, function(properties, property, name) {
      if (JSON.Object.isValid(property)) {
        properties.push(JSON.String.toJSONString(name) + ":" + JSON.toString(property));
      }
      return properties;
    }, []).join(",") + "}";
  }
}, {
  VALID_TYPE: /^(object|boolean|number|string)$/,
  
  isValid: function(object) {
    return this.VALID_TYPE.test(typeof object);
  }
});

// =========================================================================
// JSON/Array.js
// =========================================================================

JSON.Array = JSON.Object.extend({
  toJSONString: function(array) {
    return "[" + reduce(array, function(items, item) {
      if (JSON.Object.isValid(item)) {
        items.push(JSON.toString(item));
      }
      return items;
    }, []).join(",") + "]";
  }
});

// =========================================================================
// JSON/Boolean.js
// =========================================================================

JSON.Boolean = JSON.Object.extend({
  toJSONString: function(bool) {
    return String(bool);
  }
});

// =========================================================================
// JSON/Date.js
// =========================================================================

JSON.Date = JSON.Object.extend({
  toJSONString: function(date) {
    var pad = function(n) {
      return n < 10 ? "0" + n : n;
    };
    return '"' + date.getUTCFullYear() + "-" +
      pad(date.getUTCMonth() + 1) + "-" +
      pad(date.getUTCDate()) + "T" +
      pad(date.getUTCHours()) + ":" +
      pad(date.getUTCMinutes()) + ":" +
      pad(date.getUTCSeconds()) + 'Z"';
  }
});

// =========================================================================
// JSON/Number.js
// =========================================================================

JSON.Number = JSON.Object.extend({
  toJSONString: function(number) {
    return isFinite(number) ? String(number) : "null";
  }
});

// =========================================================================
// JSON/String.js
// =========================================================================

JSON.String = JSON.Object.extend({
  parseJSON: function(string) {
    try {
      if (JSON.VALID.test(string)) {
        return new Function("return " + string)();
      }
    } catch (error) {
      throw new SyntaxError("parseJSON");
    }
    return "";
  },

  toJSONString: function(string) {
    return '"' + this.ESCAPE.exec(string) + '"';
  }
}, {
  ESCAPE: new RegGrp({
    '\b':   '\\b',
    '\\t':  '\\t',
    '\\n':  '\\n',
    '\\f':  '\\f',
    '\\r':  '\\r',
    '"' :   '\\"',
    '\\\\': '\\\\',
    '[\\x00-\\x1f]': function(chr) {
      var charCode = chr.charCodeAt(0);
      return '\\u00' + Math.floor(charCode / 16).toString(16) + (charCode % 16).toString(16);
    }
  })
});

eval(this.exports);

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
