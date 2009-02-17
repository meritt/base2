/*
  base2 - copyright 2007-2008, Dean Edwards
  http://code.google.com/p/base2/
  http://www.opensource.org/licenses/mit-license.php

  Contributors:
    Doeke Zanstra
*/

// timestamp: Sat, 06 Sep 2008 16:52:33

new function(_no_shrink_) { ///////////////  BEGIN: CLOSURE  ///////////////

// =========================================================================
// JST/package.js
// =========================================================================

// JavaScript Templates

/*
  Based on the work of Erik Arvidsson:
    http://erik.eae.net/archives/2005/05/27/01.03.26/
*/

var JST = new base2.Package(this, {
  name:    "JST",
  version: "0.9.2",
  exports: "Command,Environment,Interpreter,Parser"
});

eval(this.imports);

// =========================================================================
// JST/Command.js
// =========================================================================

var STDOUT = 1;

var Command = Base.extend({
  constructor: function(command) {
    this[STDOUT] = [];    
    this.extend(command); // additional commands
  },
  
  echo: function(string) {
    this[STDOUT].push(string);
  },

  toString: function() {
    return this[STDOUT].join("");
  }
});

// =========================================================================
// JST/Environment.js
// =========================================================================

var Environment = Base.extend({
  set: function(name, value) {
    this[name] = value;
  },
  
  unset: function(name) {
    delete this[name];
  }
});

// =========================================================================
// JST/Interpreter.js
// =========================================================================

var Interpreter = Base.extend({
  constructor: function(command, environment) {
    this.command = command || {};
    this.environment = new Environment(environment);
    this.parser = new Parser;
  },
  
  command: null,
  environment: null,
  parser: null,
  
  interpret: function(template) {
    var command = new Command(this.command);
    var code = base2.namespace + JavaScript.namespace + lang.namespace +
      "\nwith(arguments[0])with(arguments[1]){\n" +
        this.parser.parse(template) +
      "}\nreturn arguments[0].toString()";
    // use new Function() instead of eval() so that the script is evaluated in the global scope
    return new Function(code)(command, this.environment);
  }
});

// =========================================================================
// JST/Escape.js
// =========================================================================

var Escape = Module.extend({
  escape: function(parser, string) {
    if (parser.escapeChar) {
      // encode escaped characters
      var ESCAPE = new RegExp(rescape(parser.escapeChar + "."), "g");
      string = string.replace(ESCAPE, function(match) {
        return String.fromCharCode(Escape.BASE + match.charCodeAt(1));
      });
    }
    return string;
  },
  
  unescape: function(parser, string) {
    // decode escaped characters
    if (parser.escapeChar) {
      string = string.replace(Escape.RANGE, function(match) {
        return parser.escapeChar + String.fromCharCode(match.charCodeAt(0) - Escape.BASE);
      });
    }
    return string;
  }
}, {
  BASE: 65280,
  RANGE: /[\uff00-\uffff]/g
});

// =========================================================================
// JST/Parser.js
// =========================================================================

// this needs a re-write but it works well enough for now.

var Parser = Base.extend({
  escapeChar: "\\",
  
  parse: function(string) {
    return this._decode(this._encode(String(string)));
  },
  
  _decode: function(string) {
    var evaluated = this._evaluated;
    while (Parser.EVALUATED.test(string)) {
      string = string.replace(Parser.EVALUATED, function(match, index) {
        return evaluated[index];
      });
    }
    delete this._evaluated;
    return this.unescape(string);
  },
  
  _encode: function(string) {    
    var TRIM = /^=|;+$/g;
    var BLOCK = /<%[^%]*%([^>][^%]*%)*>/g;
    var evaluated = this._evaluated = [];
    var evaluate = function(block) {
      block = block.replace(Parser.TRIM, "");
      if (!block) return "";
      if (block.charAt(0) == "=") {
        block = "\necho(" + block.replace(TRIM, "") + ");";
      }
      var replacement = "\x01" + evaluated.length + "\x01";
      evaluated.push(block);
      return replacement;
    };
    return Parser.TEXT.exec(this.escape(string).replace(BLOCK, evaluate));
  }
}, {
  ESCAPE: new RegGrp({
    '\\\\': '\\\\',
    '"':    '\\"',
    '\\n':  '\\n',
    '\\r':  '\\r'
  }),
  EVALUATED: /\x01(\d+)\x01/g,
  TEXT: new RegGrp({
    "\\x01\\d+\\x01": RegGrp.IGNORE,
    "[^\\x01]+": function(match) {
      return '\necho("' + Parser.ESCAPE.exec(match) + '");';
    }
  }),
  TRIM: /^<%\-\-.*\-\-%>$|^<%\s*|\s*%>$/g
});

Parser.implement(Escape);

eval(this.exports);

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
