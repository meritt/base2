
// This file is required if you wish to support any of the following browsers:
//  * IE5.0 (Windows)
//  * IE5.x (Mac)
//  * Netscape 6
//  * Safari 1.x

window.undefined = void(0);

new function() {
  var slice = Array.prototype.slice, html = document.documentElement;

  window.$Legacy = {
    has: function(object, key) {
      if (object[key] !== undefined) return true;
      key = String(key);
      for (var i in object) if (i == key) return true;
      return false;
    }
  };

  var jscript = NaN/*@cc_on||@_jscript_version@*/;

  if (jscript < 5.1) {
    var _onload = onload;
    onload = function() {
      with (base2.DOM) {
        var event = DocumentEvent.createEvent(document, "Events");
        Event.initEvent(event, "DOMContentLoaded", true, false);
        EventTarget.dispatchEvent(document, event);
      }
      if (_onload) _onload();
    };
  }

  if (typeof encodeURIComponent == "undefined") {
    encodeURIComponent = function(string) {
      return escape(string).replace(/\%(21|7E|27|28|29)/g, unescape).replace(/[@+\/]/g, function(chr) {
        return "%" + chr.charCodeAt(0).toString(16).toUpperCase();
      });
    };
    decodeURIComponent = unescape;
  }

  if (!window.Error) {
    createError("Error");
    createError("TypeError");
    createError("SyntaxError");
    createError("ReferenceError");
  }

  function createError(name) {
    if (typeof window[name] == "undefined") {
      var error = window[name] = function(message) {
        this.message = message;
      };
      error.prototype = new window.Error;
      error.prototype.name = name;
    }
  };

  function extend(klass, name, method) {
    if (!klass.prototype[name]) {
      klass.prototype[name] = method;
    }
  };

  if ("11".slice(-1) != "1") { // for IE5.0
    var _slice = String.prototype.slice;
    String.prototype.slice = function(start, length) {
      if (arguments.length == 1 && start < 0) {
        arguments[0] = this.length + start;
        arguments[1] = -start;
      }
      return _slice.apply(this, arguments);
    };
  }
  
  if (!Array.prototype.unshift) {
    extend(Array, "pop", function() {
      if (this.length) {
        var i = this[this.length - 1];
        this.length--;
        return i;
      }
      return undefined;
    });

    extend(Array, "push", function() {
      for (var i = 0; i < arguments.length; i++) {
        this[this.length] = arguments[i];
      }
      return this.length;
    });

    extend(Array, "shift", function() {
      var r = this[0];
      if (this.length) {
        var a = this.slice(1), i = a.length;
        while (i--) this[i] = a[i];
        this.length--;
      }
      return r;
    });

    extend(Array, "splice", function(i, c) {
      var r = c ? this.slice(i, i + c) : [];
      var a = this.slice(0, i).concat(slice.apply(arguments, [2])).concat(this.slice(i + c));
      this.length = i = a.length;
      while (i--) this[i] = a[i];
      return r;
    });

    extend(Array, "unshift", function() {
      var a = this.concat.call(slice.apply(arguments, [0]), this), i = a.length;
      while (i--) this[i] = a[i];
      return this.length;
    });
  }

  if (!Function.prototype.apply) {
    var ns = this;
    extend(Function, "apply", function(a, b) {
      var c = "*apply", d;
      if (a === undefined) a = ns;
      else if (a == null) a = window;
      else if (typeof a == "string") a = new String(a);
      else if (typeof a == "number") a = new Number(a);
      else if (typeof a == "boolean") a = new Boolean(a);
      if (arguments.length == 1) b = [];
      else if (b[0] && b[0].writeln) b[0] = b[0].documentElement.document || b[0];
      a[c] = this;
      switch (b.length) { // unroll for speed
        case 0: d = a[c](); break;
        case 1: d = a[c](b[0]); break;
        case 2: d = a[c](b[0],b[1]); break;
        case 3: d = a[c](b[0],b[1],b[2]); break;
        case 4: d = a[c](b[0],b[1],b[2],b[3]); break;
        case 5: d = a[c](b[0],b[1],b[2],b[3],b[4]); break;
        default:
          var args = [], i = b.length - 1;
          do args[i] = "b[" + i + "]"; while (i--);
          eval("d=a[c](" + args + ")");
      }
      if (typeof a.valueOf == "function") { // not a COM object
        delete a[c];
      } else {
        a[c] = undefined;
        if (d && d.writeln) d = d.documentElement.document || d;
      }
      return d;
    });

    extend(Function, "call", function(o) {
      return this.apply(o, slice.apply(arguments, [1]));
    });
  }

  extend(Number, "toFixed", function(n) {
    // Andrea Giammarchi
    n = parseInt(n);
    var	value = Math.pow(10, n);
    value = String(Math.round(this * value) / value);
    if (n > 0) {
      value = value.split(".");
      if (!value[1]) value[1] = "";
      value[1] += Array(n - value[1].length + 1).join(0);
      value = value.join(".");
    };
    return value;
  });

  // Fix String.replace (Safari1.x/IE5.0).
  if ("".replace(/^/, String)) {
    var GLOBAL = /(g|gi)$/;
    var RESCAPE = /([\/()[\]{}|*+-.,^$?\\])/g;
    var _replace = String.prototype.replace;
    String.prototype.replace = function(expression, replacement) {
      if (typeof replacement == "function") { // Safari doesn't like functions
        if (expression && expression.constructor == RegExp) {
          var regexp = expression;
          var global = regexp.global;
          if (global == null) global = GLOBAL.test(regexp);
          // we have to convert global RexpExps for exec() to work consistently
          if (global) regexp = new RegExp(regexp.source); // non-global
        } else {
          regexp = new RegExp(String(expression).replace(RESCAPE, "\\$1"));
        }
        var match, string = this, result = "";
        while (string && (match = regexp.exec(string))) {
          result += string.slice(0, match.index) + replacement.apply(this, match);
          string = string.slice(match.index + match[0].length);
          if (!global) break;
        }
        return result + string;
      }
      return _replace.apply(this, arguments);
    };
  }
  
  // mozilla fixes
  if (window.Components) {
    // for older versions of gecko we need to use getPropertyValue() to
    // access css properties returned by getComputedStyle().
    // we don't want this so we fix it.
    try {
      var computedStyle = getComputedStyle(html, null);
      // the next line will throw an error for some versions of mozilla
      var pass = computedStyle.display;
    } catch (ex) {
      // the previous line will throw an error for some versions of mozilla
    } finally {
      if (!pass) {
      	var UPPER_CASE = /[A-Z]/g;
      	function dashLowerCase(match){return "-" + match.toLowerCase()};
      	function assignStyleGetter(propertyName) {
      		var cssName = propertyName.replace(UPPER_CASE, dashLowerCase);
      		CSSStyleDeclaration.prototype.__defineGetter__(propertyName, function() {
      			return this.getPropertyValue(cssName);
      		});
      	};
      	for (var propertyName in html.style) {
      		if (typeof html.style[propertyName] == "string") {
      			assignStyleGetter(propertyName);
      		}
      	}
      }
    }

    if (parseInt(navigator.productSub) < 20040614) {
      HTMLInputElement.prototype.__defineGetter__("clientWidth", function() {
        var cs = getComputedStyle(this, null);
        return this.offsetWidth - parseInt(cs.borderLeftWidth) - parseInt(cs.borderRightWidth);
      });
      HTMLInputElement.prototype.__defineGetter__("clientHeight", function() {
        var cs = getComputedStyle(this, null);
        return this.offsetHeight - parseInt(cs.borderTopWidth) - parseInt(cs.borderBottomWidth);
      });
    }
  }
};
