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
// jsb/package.js
// =========================================================================

// JavaScript Behaviors.

base2.global.jsb = new base2.Package(this, {
  name:    "jsb",
  version: "0.9.5",
  imports: "Function2,Enumerable,DOM",
  exports: "Rule,RuleList,behavior",
  
  INTERVAL:  1, // milliseconds

  // Max time for hogging the processor.
  TIMEOUT: 200, // milliseconds

  // Restrict the number of elements returned by a DOM query.
  // This ensures that the tick() function does not run for too long.
  // It also ensures that elements are returned in batches appropriate
  // for consistent rendering.
  QUERY_SIZE: 200,
  
  // Simple style sheet creation.
  // This is overridden later to provide more complex style sheets.

  createStyleSheet: function(cssText, document) {
    if (document.body) {
      var style = document.createElement("style");
      style.type = "text/css";
      style.textContent = cssText;
      new Selector("head").exec(document, 1).appendChild(style);
    } else {
      document.write(format('<style type="text/css">%1<\/style>', cssText));
    }
  },

  "@MSIE": {
    createStyleSheet: function(cssText, document) {
      document.createStyleSheet().cssText = cssText;
    }
  }
});

eval(this.imports);

;;; if (typeof console2 == "undefined") global.console2={log:Undefined,update:Undefined};

// =========================================================================
// jsb/header.js
// =========================================================================

var _EVENT              = /^on([a-z|DOM\w+]+)$/,
    _EVENT_BUTTON       = /^mouse(up|down)|click$/,
    _EVENT_CLICK        = /click$/,
    _EVENT_MOUSE        = /^mouse|click$/,
    _EVENT_OVER_OUT     = /^mouse(over|out)$/,
    _EVENT_PSEUDO       = /^(attach|detach|(content|document)ready)$/,
    _EVENT_TEXT         = /^(key|text)/,
    _EVENT_USE_CAPTURE  = /^(focus|blur)$/;

var _CANNOT_DELEGATE    = /^(abort|error|load|scroll|(readystate|property|filter)change)$/,
    _HTML_BODY          = /^(HTML|BODY)$/,
    _MOUSE_BUTTON_LEFT  = /^[^12]$/;
    
var _DIGITS             = /\d+/g;

var _allAttachments       = {};

var _parseInt16 = partial(parseInt, undefined, 16);

function _createDummyElement(tagName) {
  var dummy = document.createElement(tagName || "span");
  dummy.style.cssText = "position:absolute;left:0;top:-9999px;";
  document.body.appendChild(dummy);
  return dummy;
};

function _split(value, fill) { // uased for splitting multiple CSS values
  if (value == null) return [];
  value = trim(value).split(/\s+/);
  if (fill) {
    if (value.length == 1) value[1] = value[0];
    if (value.length == 2) value[2] = value[0];
    if (value.length == 3) value[3] = value[1];
  }
  return value;
};
// =========================================================================
// jsb/behavior.js
// =========================================================================

var _Behavior = Base.extend({
  attach: I,
  detach: I,
  modify: Null,
  
  extendedMouse: false, // allow right and middle button clicks
  
  ancestorOf: function(behavior) {
    return behavior instanceof this.constructor;
  },

  extend: function(_interface) {
    // Extend a behavior to create a new behavior.
    var Behavior = function(){};
    Behavior.prototype = new this.constructor;
    Behavior.prototype.constructor = Behavior;
    var interfaces = _interface["implements"] || [];
    delete _interface["implements"];
    interfaces.push(_interface);
    for (var i = 0; _interface = interfaces[i]; i++) {
      extend(Behavior.prototype, _interface);
    }
    var behavior = new Behavior;
    
    // Private.
    var attachments = {behavior: behavior}, // uniqueIDs
        modifications = {}, specificities = {},
        delegatedEvents = [], events = null, type,
        eventListener = {
          handleEvent: function(event) {
            _dispatchEvent(behavior, event.target, event);
          }
        };
    Behavior.modifications = modifications;
        
    // Extract events.
    for (var name in behavior) {
      if (typeof behavior[name] == "function" && _EVENT.test(name)) {
        var type = name.slice(2);
        // Store event handlers.
        if (_CANNOT_DELEGATE.test(type)) {
          if (!events) events = [];
          events.push(type);
        } else if (!_EVENT_PSEUDO.test(type)) {
          delegatedEvents.push(type);
        }
      }
    }

    behavior.attach = function(element) {
      var uniqueID = element.uniqueID || assignID(element, "uniqueID");
          
      if (!attachments[uniqueID]) { // don't attach more than once
        // Maintain attachment state.
        attachments[uniqueID] = true;
        if (!_allAttachments[uniqueID]) _allAttachments[uniqueID] = 0;
        _allAttachments[uniqueID]++;
        
        // Add event handlers
        if (delegatedEvents) {
          for (var i = 0; type = delegatedEvents[i]; i++) {
            _eventDelegator.addEventListener(type, attachments);
          }
          delegatedEvents = null; // we only need to attach these once per document
        }
        if (events) { // these events cannot be delegated
          for (var i = 0; type = events[i]; i++) {
            EventTarget.addEventListener(element, type, eventListener, false);
          }
        }
        
        // JSB events.
        if (behavior.onattach) {
          _dispatchJSBEvent(behavior, element, "attach");
        }
        if (behavior.oncontentready) {
          if (_state.isContentReady(element)) {
            _dispatchJSBEvent(behavior, element, "contentready");
          } else {
            _state.contentReadyQueue.push({behavior: behavior, element: element});
          }
        }
        if (behavior.ondocumentready) {
          if (_state.ready) {
            _dispatchJSBEvent(behavior, element, "documentready");
          } else {
            _state.documentReadyQueue.push({behavior: behavior, element: element});
          }
        }
        if (behavior.onfocus && element == document.activeElement) {
          behavior.dispatchEvent(element, "focus");
        }
      }
    };

    behavior.detach = function(element) {
      var uniqueID = element.uniqueID;
      if (attachments[uniqueID]) {
        delete attachments[uniqueID];
        _allAttachments[uniqueID]--;
        if (events) {
          for (var i = 0; type = events[i]; i++) {
            EventTarget.removeEventListener(element, type, eventListener, false);
          }
        }
      }
    };

    behavior.modify = function(attributes) {
      attributes = extend(pcopy(behavior), attributes);
      return {
        isModification: true,

        attach: function(element, rule) {
          behavior.attach(element);
          var uniqueID = element.uniqueID;
          if (rule.specificity >= (specificities[uniqueID] || 0)) { // this shouldn't be necessary as rules are sorted by specificity
            specificities[uniqueID] = rule.specificity;
            modifications[uniqueID] = attributes;
          }
          return element;
        }
      };
    };

    return behavior;
  },
  
  animate: function(element, transitions) {
    // An ugly method. I may move it to Transitions.js. ;-)
    
    var defaultTransition;
    forEach (transitions, function(transition, propertyName) {
      var recurse = arguments.callee; // recurse after we've broken down shorthand properties
      if (typeof transition == "string") {
        transition = {end: transition};
      }
      // The first transition in the list defines the default
      // values for duration and  delay for subsequent transitions.
      if (!defaultTransition) defaultTransition = transition;
      transition = copy(transition);
      if (transition.delay == null && defaultTransition.delay != null) {
        transition.delay = defaultTransition.delay;
      }
      if (transition.duration == null && defaultTransition.duration != null) {
        transition.duration = defaultTransition.duration;
      }
      // Break shorthand properties into the longhand version.
      // This only parses property names. Values are parsed in Transition.js.
      // Some shorthand properties cannot be parsed. (I should fix backgroundPosition eventually)
      if (/^(font|background(Position)?)$/.test(propertyName)) {
        throw "Cannot animate complex property '" + propertyName + "'.";
      } else if (/^border(Top|Right|Bottom|Left)?$/.test(propertyName)) { // shorthand border properties
        var property = propertyName,
            start = _split(transition.start),
            end = _split(transition.end),
            names = ["Width", "Style", "Color"];
        forEach (end, function(end, i) {
          var params = copy(transition);
          params.start = start[i];
          params.end = end;
          recurse(params, property + names[i]);
        });
      } else if (/^(margin|padding|border(Width|Color|Style))$/.test(propertyName)) { // shorthand rect properties (T,R,B,L)
        var property = propertyName.replace(/Width|Color|Style/, ""),
            name = propertyName.replace(property, "");
        start = _split(transition.start, true);
        end = _split(transition.end, true);
        forEach.csv ("Top,Right,Bottom,Left", function(side, i) {
          var params = copy(transition);
          params.start = start[i];
          params.end = end[i];
          _state.transitions.add(element, property + side + name, params);
        });
      } else {
        _state.transitions.add(element, propertyName, transition);
      }
    });
  },
  
  // Manage properties

  get: function(element, propertyName) {
    // Retrieve a DOM property.
    var attributes = this.constructor.modifications[element.uniqueID] || this,
        defaultValue = attributes[propertyName],
        value = Element.getAttribute(element, propertyName);
    if (value == null) return defaultValue;
    switch (typeof defaultValue) {
      case "boolean": return true;
      case "number":  return value - 0;
    }
    return value;
  },

  set: function(element, propertyName, value) {
    var originalValue = this.get(element, propertyName);
    Element.setAttribute(element, propertyName, value);
    if (originalValue !== value) {
      this.dispatchEvent(element, propertyName + "change", {originalValue: originalValue});
    }
  },

  dispatchEvent: function(node, event, data) {
    if (typeof event == "string") {
      var type = event;
      event = DocumentEvent.createEvent(document, "Events");
      var bubbles = true, cancelable = false;
      if (data) {
        if (data.bubbles != null) bubbles = !!data.bubbles;
        if (data.cancelable != null) cancelable = !!data.cancelable;
        delete data.bubbles;
        delete data.cancelable;
      }
      Event.initEvent(event, type, bubbles, cancelable);
    }
    if (data) extend(event, data);
    EventTarget.dispatchEvent(node, event);
  },
  
  getComputedStyle: function(element, propertyName) {
    var view = document.defaultView;
    if (arguments.length == 1) {
      return ViewCSS.getComputedStyle(view, element, null);
    } else {
      return ViewCSS.getComputedPropertyValue(view, element, propertyName);
    }
  },
  
  // Setting element.style is quicker but this offers cross-browser safety and the
  // ability to set the !important flag.

  setStyle: function(element, propertyName, value, important) {
    var style = element.style;
    if (arguments.length == 2) {
      var properties = extend({}, arguments[1]);
      for (propertyName in properties) {
        CSSStyleDeclaration.setProperty(style, propertyName, properties[propertyName], "");
      }
    } else {
      CSSStyleDeclaration.setProperty(style, propertyName, value, important ? "important" : "");
    }
  },
  
  // For positioning popups.

  getOffsetFromBody: function(element) {
    return ElementView.getOffsetFromBody(element);
  },
  
  // Mouse capture. Useful for drag/drop. Not perfect, but almost always good enough.

  captureMouse: function(element) {
    if (!_state.captureElement) _state.captureElement = element;
  },

  releaseMouse: function() {
    delete _state.captureElement;
  }
});

var behavior = _Behavior.prototype;

forEach.csv ("setInterval,setTimeout", function(name) {
  behavior[name] = function(callback, delay) {
    if (typeof callback == "string") callback = this[callback];
    var args = Array2.slice(arguments, 2);
    var self = this;
    return global[name](function() {
      callback.apply(self, args);
    }, delay || 1);
  };
});

// Additional methods (from base2.DOM)

forEach.csv ("querySelector,querySelectorAll", function(name) {
  behavior[name] = function(node, selector) {
    if (arguments.length == 1) {
      selector = node;
      node = document;
    }
    return NodeSelector[name](node, selector);
  };
});

forEach ([ // attach generic DOM methods
  EventTarget,
  ElementView,
  Node,
  Element
], function(_interface) {
  _interface.forEach(function(method, name) {
    if (!behavior[name]) {
      behavior[name] = bind(method, _interface);
    }
  });
});

ClassList.forEach(function(method, name) {
  behavior[name + "Class"] = bind(method, ClassList);
});

behavior = new _Behavior; // seal-off

// =========================================================================
// jsb/Rule.js
// =========================================================================

// A Selector associated with a behavior.

var Rule = Base.extend({
  constructor: function(selector, behavior) {
    if (!instanceOf(selector, Selector)) {
      selector = new Selector(selector);
    }
    
    if (typeof behavior == "string") { // external resource
      behavior = new External(behavior, function(external) {
        behavior = external;
      });
    } else if (!behavior.isModification && !jsb.behavior.ancestorOf(behavior)) {
      behavior = jsb.behavior.extend(behavior);
    }
    
    this.refresh = function() {
      if (behavior.attach) selector.exec(document).forEach(behavior.attach);
    };

    this.toString = selector.toString;
    
    forEach (selector.split(), function(selector) {
      _state.addRule(selector, behavior);
    });
  },
  
  refresh: Undefined // defined in the constructor function
});

// =========================================================================
// jsb/RuleList.js
// =========================================================================

// A collection of Rule objects

var RuleList = Collection.extend({
  constructor: function(rules) {
    this.base(extend({}, rules));
  },
  
  refresh: function() {
    this.invoke("refresh");
  }
}, {
  Item: Rule
});

// =========================================================================
// jsb/Transition.js
// =========================================================================

// Special parsing of colours and "clip" are bulking this out. :-(

var Transition = Base.extend({
  constructor: function(element, propertyName, params) {
    extend(this, params);
    
    this.toString = K(element.uniqueID + "." + propertyName);
    
    this.property = propertyName;

    var style = element.style,
        startValue = this.start,
        ease = this.timing;
        
    if (startValue == null) {
      startValue = this.start = style[propertyName] || ViewCSS.getComputedPropertyValue(document.defaultView, element, propertyName) || "";
    }
    
    // Parse the start/end values and create the underlying timing function.
    if (/color$/i.test(propertyName)) {
      startValue = this.parseColor(startValue);
      var endValue = this.parseColor(this.end),
          delta = map(startValue, function(value, i) {
            return endValue[i] - value;
          }),
          calculateValue = function(t) {
            return "rgb(" + map(startValue, function(value, i) {
              return Math.round(ease(t, value, delta[i], duration));
            }).join(", ") + ")";
          };
    } else if (propertyName == "clip") {
      startValue = map(match(startValue, _DIGITS), Number);
      endValue = map(match(this.end, _DIGITS), Number);
      delta = map(startValue, function(value, i) {
        return endValue[i] - value;
      });
      calculateValue = function(t) {
        return "rect(" + map(startValue, function(value, i) {
          return Math.round(ease(t, value, delta[i], duration));
        }).join("px, ") + "px)";
      };
    } else if (/\d/.test(this.end)) { // Numeric. I probably need a better test!
      var unit = String(this.end).replace(/^[-.\d]+/, "").toLowerCase();  // strip number
      if (parseInt(startValue) == 0) startValue = this.start = 0 + unit;
      startValue = Number(String(startValue).replace(unit, ""));          // strip unit
      endValue = Number(String(this.end).replace(unit, ""));              // strip unit
      delta = endValue - startValue;
      calculateValue = function(t) {
        var value = ease(t, startValue, delta, duration);
        if (unit == "px") value = Math.round(value);
        return value + unit;
      };
    } else {
      endValue = this.end || "";
      calculateValue = function(t) { // flip halfway
        return ease(t, 0, 1, duration) < 0.5 ? startValue : endValue;
      };
    }

    var timestamp = Date2.now(),
        complete = this.compare(this.start, "end"),
        reversed = false,
        started = 0,
        paused = 0,
        delay = this.delay * 1000,
        duration = this.duration * 1000,
        speed = 1,
        elapsedTime = 0;

    if (typeof ease != "function") {
      ease = Transition.timingFunctions[ease];
    }
    
    assertType(ease, "function", "Invalid timing function.");

    this.tick = function(now) {
      if (!complete && !paused) {
        elapsedTime = now - timestamp;
        if (!started && elapsedTime >= delay) {
          started = now;
        }
        if (started) {
          elapsedTime = Math.min((now - started) * speed, duration);
          complete = elapsedTime >= duration;
          var t = reversed ? duration - elapsedTime : elapsedTime;
          CSSStyleDeclaration.setProperty(style, propertyName, calculateValue(t), "");
          if (complete) {
            behavior.dispatchEvent(element, "transitionend", {propertyName: propertyName, elapsedTime: (now - timestamp) / 1000});
          }
        }
      }
      return !complete;
    };

    this.flip = function() {
      var temp = this.start;
      this.start = this.end;
      this.end = temp;
      reversed = !reversed;
      if (started) {
        started = Date2.now() - (duration - elapsedTime) / speed;
      }
    };

    /*this.stop = function() {
      speed = 1;
      paused = 0;
      complete = true;
    };

    this.pause = function() {
      paused = Date2.now();
    };

    this.resume = function() {
      started += Date2.now() - paused;
      paused = 0;
    };*/

    this.setSpeed = function(s) {
      if (started) {
        speed = s;
        started = Date2.now() - elapsedTime / speed;
      }
    };
  },

  delay: 0,
  duration: 1, // seconds
  timing: "ease",
  //start: null,
  //end: null,

  compare: function(value, position) {
    if (/color$/i.test(this.property)) {
      return this.parseColor(this[position]).join(",") == this.parseColor(value).join(",");
    } else if (this.property == "clip") {
      // Stoopid incompatible clip rects:
      // http://www.ibloomstudios.com/articles/misunderstood_css_clip/
      return this[position].replace(/,\s*/g, " ") == value.replace(/,\s*/g, " ");
    }
    return this[position] == value;
  },

  parseColor: function(color) { // return an array of rgb values
    var colors = Transition.colors; // cache
    if (!colors[color]) {
      if (/^rgb/.test(color)) {
        colors[color] = map(color.match(_DIGITS), Number);
      } else if (color.indexOf("#") == 0) {
        var hex = color.slice(1);
        if (hex.length == 3) hex = hex.replace(/([0-9a-f])/g, "$1$1");
        colors[color] = map(hex.match(/([0-9a-f]{2})/g), _parseInt16);
      } else {
        // If it's a named colour then use getComputedStyle to parse it.
        // Meh. It's ugly but it's less code than a table of colour names.
        var dummy = Transition._dummy;
        if (dummy) {
          document.body.appendChild(dummy);
        } else {
          dummy = Transition._dummy = _createDummyElement("input");
        }
        try {
          dummy.style.color = color;
          var computedValue = ViewCSS.getComputedPropertyValue(document.defaultView, dummy, "color");
        } catch (x) {}
        document.body.removeChild(dummy);
        if (computedValue != color) {
          colors[color] = this.parseColor(computedValue || "#000");
        }
      }
    }
    var rgb = colors[color];
    if (!rgb || rgb.length != 3 || Array2.contains(rgb, NaN)) {
      throw "Invalid color '" + color + "'.";
    }
    return rgb;
  }
}, {
  timingFunctions: {
    "ease": function(t, b, c, d) {
      if ((t/=d/2) < 1) {
        return c/2*t*t*t*t + b;
      }
      return -c/2 * ((t-=2)*t*t*t - 2) + b;
    },

    "linear": function(t, b, c, d) {
      return c*t/d + b;
    },

    "ease-in": function(t, b, c, d) {
      return c*(t/=d)*t + b;
    },

    "ease-out": function(t, b, c, d) {
      return -c *(t/=d)*(t-2) + b;
    },

    "ease-in-out": function(t, b, c, d) {
      if ((t/=d/2) < 1) {
        return c/2*t*t + b;
      }
      return -c/2 * ((--t)*(t-2) - 1) + b;
    }
  },
  
  colors: {} // a cache for parsed colour values
});

// =========================================================================
// jsb/Transitions.js
// =========================================================================

var Transitions = Collection.extend({
  add: function(element, propertyName, params) {
    var key = element.uniqueID + "." + propertyName;
    var currentTransition = this.get(key);
    if (currentTransition) {
      currentTransition.setSpeed(currentTransition.duration / (params.duration || 1)); // change gears
      if (currentTransition.compare(params.end, "start")) { // flipped start/end points indicate the reversal of a transition
        currentTransition.flip();
      }
    } else {
      this.put(key, element, propertyName, params);
      if (!this._timer) this.tick();
    }
  },

  tick: function() {
    var now = Date2.now(),
        completed = [];
    forEach (this, function(transition, key) {
      if (!transition.tick(now)) {
        completed.push(key); // remove later
      }
    });
    forEach (completed, this.remove, this);
    if (this.size() > 0) {
      this._timer = setTimeout(bind(this.tick, this), 1); // loop
    } else {
      delete this._timer;
    }
  }
}, {
  Item: Transition,

  create: function(key, element, propertyName, params) {
    return new this.Item(element, propertyName, params);
  }
});

// =========================================================================
// jsb/createStyleSheet.js
// =========================================================================

extend(jsb, "createStyleSheet", function(cssText, document) {
  if (!document) document = global.document;
  if (typeof cssText != "string") {
    var rules = cssText;

    var styleSheet = {
      toString: function() {
        return map(this, function(properties, selector) {
          return selector + properties;
        }).join("\n").replace(/!([^\w])/g, "!important$1");
      }
    };

    var baseRule = rules["*"] || {};
    baseRule.toString = function() {
      return " {\n" +
        map(this, function(value, propertyName) {
          if (typeof value == "function") value = "none";
          return "  " + propertyName.replace(/[A-Z]/g, function(captialLetter) {
            return "-" + captialLetter.toLowerCase();
          }) + ": " + value;
        }).join(";\n") +
      "\n}";
    };
    delete rules["*"];

    var LEADING_CAP = /^[A-Z]/;
    forEach.detect (rules, function(properties, selector) {
      if (/,/.test(selector)) {
        forEach (new Selector(selector).split(), partial(arguments.callee, properties));
      } else {
        var rule = styleSheet[selector];
        if (!rule) rule = styleSheet[selector] = extend({toString: baseRule.toString}, baseRule);
        forEach.detect (properties, function(value, propertyName) {
          if (/^Webkit/.test(propertyName)) arguments.callee(value, "Khtml" + propertyName.slice(6));
          if (LEADING_CAP.test(propertyName) && propertyName.indexOf(ViewCSS.VENDOR) != 0) {
            arguments.callee(value, propertyName.replace(LEADING_CAP, String2.toLowerCase));
            propertyName = ViewCSS.VENDOR + propertyName;
          }
          if (value == "initial") {
            forEach (rule, function(initialPropertyValue, initialPropertyName) {
              if (initialPropertyName.indexOf(propertyName) == 0) {
                delete rule[initialPropertyName];
              }
            });
            delete rule[propertyName];
          }
          rule[propertyName] = value;
        });
      }
    });

    cssText = styleSheet.toString();
  }

  var host = location.pathname;
  var script = Array2.item(document.getElementsByTagName("script"), -1);
  if (script) host = script.src || host;
  ;;; host = host.replace(/\/build\.php.*$/, '/base2/jsb/chrome/themes/');
  host = host.replace(/[\?#].*$/, "").replace(/[^\/]*$/, "");
  
  cssText = cssText.replace(/%theme%/g, "themes/" + jsb.theme);
  
  var URL = /(url\s*\(\s*['"]?)([\w\.]+[^:\)]*['"]?\))/gi;
  this.base(cssText.replace(URL, "$1" + host + "$2"), document);
  
  return cssText;
});

// =========================================================================
// jsb/External.js
// =========================================================================

var External = Base.extend({
  constructor: function(url, register) {
    url = url.split("#");
    this.src = url[0];
    this.id = url[1].split(".");
    this.register = register;
  },

//id: null,
//src: "",
//script: null,

  getObject: function() {
    var object = global, i = 0;
    while (object && i < this.id.length) {
      object = object[this.id[i++]];
    }
    return object;
  },

  load: function() {
    var object = this.getObject();
    if (!object && !this.script) {
      // load the external script
      External.SCRIPT.src = this.src;
      if (!External.scripts[External.SCRIPT.src]) { // only load a script once
        External.scripts[External.SCRIPT.src] = true;
        this.script = document.createElement("script");
        this.script.type = "text/javascript";
        this.script.src = this.src;
        behavior.querySelector("head").appendChild(this.script);
      }
      object = this.getObject();
    }
    if (object) {
      this.register(object);
      this.unload();
    }
    return object;
  },

  unload: function() {
    // remove the external script (keeps the DOM clean)
    if (this.script) {
      this.script.parentNode.removeChild(this.script);
      this.script = null;
    }
  }
}, {
  SCRIPT: document.createElement("script"),
  scripts: {}
});

// =========================================================================
// jsb/_eventDelegator.js
// =========================================================================

var _eventDelegator = {
  types: {},

  addEventListener: function(type, attachments) {
    var types = this.types;
    if (!types[type]) {
      types[type] = [];
      EventTarget.addEventListener(document, type, this, _EVENT_USE_CAPTURE.test(type));
    }
    types[type].push(attachments);
  },

  handleEvent: function(event) {
    var target = event.target;
    
    if (target.nodeType != 1) return; // you can only attach behaviors to elements
    
    var type = event.type,
        isMouseEvent = _EVENT_MOUSE.test(type),
        capture = _state.captureElement && isMouseEvent;
        
    // Don't process mouseover/out when using mouse capture.
    if (capture && _EVENT_OVER_OUT.test(type)) return;
    
    var map = this.types[type];
    if (!map || !map.length) return;

    // Fix offsetX/Y.
    if (isMouseEvent && type != "mousewheel") {
      if (event.offsetX != null) {
        event = Event.cloneEvent(event);
      }
      var offset = ElementView.getOffsetXY(target, event.clientX, event.clientY);
      event.offsetX = offset.x;
      event.offsetY = offset.y;
    }
    
    var cancelBubble = !event.bubbles || capture,
        element = capture ? _state.captureElement : target;

    if (!cancelBubble) {
      extend(event, "stopPropagation", function() {
        this.base();
        cancelBubble = true;
      });
    }
    
    // Dispatch events.
    do {
      if (_allAttachments[element.uniqueID]) {
        for (var i = 0, attachments; attachments = map[i]; i++) {
          // make sure it's an attached element
          if (attachments[element.uniqueID]) {
            _dispatchEvent(attachments.behavior, element, event);
          }
        }
      }
      element = element.parentNode;
    } while (element && !cancelBubble);
  }
};

// =========================================================================
// jsb/_eventDispatcher.js
// =========================================================================

var _MSIE = detect("MSIE");

var _currentBehavior, _handler, _eventArgs;

// The dispatch mechanism.
if (_MSIE) {
  var _fire = document.createElement("meta");
  _fire.jsbEvents = 0;
  _fire.attachEvent("onpropertychange", function(event) {
    if (event.propertyName == "jsbEvents") {
      _handler.apply(_currentBehavior, _eventArgs);
    }
  });
  document.getElementsByTagName("head")[0].appendChild(_fire);
} else {
  document.addEventListener("jsbEvents", function() {
    _handler.apply(_currentBehavior, _eventArgs);
  }, false);
}

function _dispatchEvent(behavior, element, event, isPseudoEvent) {
  var type = event.type;
  _handler = behavior["on" + type];
  
  if (!_handler || _handler == Undefined) return;
  
  _currentBehavior = behavior;
  _eventArgs = [element, event];
  
  // Build the event signature.
  if (_EVENT_MOUSE.test(type)) {
    if (type == "mousewheel") {
      _eventArgs.push(event.wheelDelta);
    } else {
      if (_EVENT_BUTTON.test(type)) {
        if (behavior.extendedMouse) {
          _eventArgs.push(event.button);
        } else {
          if (!_MOUSE_BUTTON_LEFT.test(event.button || 0)) return;
        }
      }
      if (!_EVENT_OVER_OUT.test(type)) {
        if (element == event.target) {
          var x = event.offsetX,
              y = event.offsetY;
        } else {
          var offset = ElementView.getOffsetXY(element, event.clientX, event.clientY);
          x = offset.x;
          y = offset.y;
        }
        _eventArgs.push(x, y, event.screenX, event.screenY);
      }
    }
  } else if (_EVENT_TEXT.test(type)) {
    _eventArgs.push(event.keyCode, event.shiftKey, event.ctrlKey, event.altKey, event.metaKey);
  }
  
  // Trigger the underlying event.
  // Use the host's event dispatch mechanism so that we get a real
  // execution context.
  if (isPseudoEvent || event.bubbles) {
    if (_MSIE) {
      _fire.jsbEvents++;
    } else {
      var fire = document.createEvent("UIEvents");
      fire.initEvent("jsbEvents", false, false);
      document.dispatchEvent(fire);
    }
  } else {
    _handler.apply(behavior, _eventArgs);
  }
};

var _jsbEvent = Document.createEvent(document, "UIEvents");
_jsbEvent.initEvent("dummy", false, false);
_jsbEvent = Event.cloneEvent(_jsbEvent);

function _dispatchJSBEvent(behavior, element, type) {
  _jsbEvent.target = element;
  _jsbEvent.type = type;
  _dispatchEvent(behavior, element, _jsbEvent, true);
};

// =========================================================================
// jsb/_state.js
// =========================================================================

;;; console2.log("START");
;;; console2.update();
;;; var begin = Date2.now();

var _state = new Base({
//active: false,
//activeElement: null,
//busy:   false,
//loaded: false,
//ready:  false,
//started: false,
  timestamp: Date2.now(),

  contentReadyQueue: [],
  documentReadyQueue: [],
  liveRules: new Array2,
  rules: new Array2,
  transitions: new Transitions,

  onDOMContentLoaded: function() {
    _state.loaded = true;
    ;;; console2.log("DOMContentLoaded");
    ;;; console2.log("Document load time: " + (Date2.now() - begin));
    if (!_state.ready && !_state.rules.length) {
      setTimeout(_state.fireReady, _state.getInterval());
    }
    _state.isContentReady = True;
  },

  onkeydown: function() {
    _state.active = _state.busy = true;
  },

  onkeyup: function() {
    _state.active = _state.busy = false;
  },

  onmousedown: function(event) {
    _state.activeElement = event.target;
    _state.active = _state.busy = true;
    /*
    // If the user has clicked on a scrollbar then carry on processing.
    _state.active = _state.busy = (
      event.offsetX < event.target.offsetWidth &&
      event.offsetY < event.target.offsetHeight
    );
    */
  },

  onmousemove: function() {
    if (!_state.busy) _state.setBusyState(true)
  },

  onmousewheel: function() {
    if (!_state.busy) _state.setBusyState(true)
  },

  onmouseup: function() {
    _state.activeElement = null;
    _state.active = _state.busy = false;
  },

  addRule: function(selector, behavior) {
    if (selector.isPseudo()) {
      throw "Pseudo class selectors are not allowed in JSB rules (selector='" + selector + "').";
    }
    var rule = {
      selector: selector,
      query: Selector.parse(selector),
      behavior: behavior,
      specificity: selector.getSpecificity()
    };
    _state.liveRules.push(rule);
    if (!_state.loaded) {
      _state.rules.push(rule);
      _state.rules.unsorted = true;
    }
    if (!_state.started) {
      _state.started = true;
      _state.tick(); // start the timer
    }
  },

  getInterval: function() {
    return _state.busy ? Math.sqrt(jsb.INTERVAL) * 50 : jsb.INTERVAL;
  },

  fireReady: function() {
    if (!_state.ready) {
      _state.ready = true;
      ;;; console2.log("documentready");
      ;;; console2.log("Document ready time: " + (Date2.now()  - begin));
      Array2.batch(_state.documentReadyQueue, function(item) {
        _dispatchJSBEvent(item.behavior, item.element, "documentready");
      }, jsb.TIMEOUT, _state.parseComplete);
      _state.documentReadyQueue = [];
    }
  },

  isContentReady: function(element) {
    if (_HTML_BODY.test(element.nodeName)) return false;
    if (!element.hasChildNodes()) return true;
    while (element && !element.nextSibling) {
      element = element.parentNode;
    }
    return !!element;
  },

  parseComplete: function() {
    _state.rules = _state.liveRules.copy();
    _state.rules.sort(_by_specificity);
    _state.tick();
  },

  tick: function(i, j, elements) {
    //;;; console2.log("TICK: busy=" + _state.busy + "(" + (tick++) + ")");
    
    var timestamp = Date2.now(),
        rules = _state.rules,
        count = rules.length;
    
    if (!_state.busy && _state.timestamp - timestamp <= jsb.INTERVAL) {
      _state.timestamp = timestamp;
      
      // Process the contentready queue.
      var contentReadyQueue = _state.contentReadyQueue;
      var now = Date2.now(), start = now, k = 0;
      while (contentReadyQueue.length && (now - start < jsb.TIMEOUT)) {
        var item = contentReadyQueue.shift();
        if (_state.isContentReady(item.element)) {
          _dispatchJSBEvent(item.behavior, item.element, "contentready");
        } else {
          contentReadypush(item); // add it to the end
        }
        if (k++ < 5 || k % 50 == 0) now = Date2.now();
      }

      // Process attachments.
      while (count && rules.length && (now - start < jsb.TIMEOUT)) {
        if (i == null) i = j = 0;
        var rule = rules[i],
            behavior = rule.behavior;

        // Execute a DOM query.
        var queryComplete = false;
        if (!elements) {
          var query = rule.query;
          var queryState = query.state || [];
          queryState.unshift(document, behavior.constructor == External ? 2 : jsb.QUERY_SIZE);
          elements = query.apply(null, queryState);
          queryComplete = !!query.complete;
        }

        now = Date2.now(); // update the clock

        var length = elements.length, k = 0;

        if (length && behavior.constructor == External) {
          // Load the external behavior.
          rule.behavior = behavior.load() || behavior;
          delete query.state;
          elements = null;
          i++;
        } else {
          // Attach behaviors.
          while (j < length && (now - start < jsb.TIMEOUT)) {
            behavior.attach(elements[j++], rule);
            if (k++ < 5 || k % 50 == 0) now = Date2.now();
          }

          // Maintain the loop.
          if (j == length) { // no more elements
            j = 0;
            elements = null;
            if (_state.loaded && queryComplete) { // stop processing after DOMContentLoaded
              rules.removeAt(i);
              delete query.state;
            } else i++;
          }
        }
        if (i >= rules.length) {
          i = 0; // at end, loop to first rule
          if (rules.unsorted) {
            rules.sort(_by_specificity);
            rules.unsorted = false;
          }
        }
        count--;
      }
    }
    if (rules.length) {
      var callback = function(){_state.tick(i, j, elements)};
    } else {
      if (_state.ready) {
        callback = _state.parseComplete;
      } else {
        callback = _state.fireReady;
      }
    }
    setTimeout(callback, _state.getInterval());
  },

  setBusyState: function(_state) {
    _state.busy = _state.active || !!_state;
    if (_state.busy) setTimeout(arguments.callee, 250);
  }
});

for (var i in _state) if (_EVENT.test(i)) {
  EventTarget.addEventListener(document, i.slice(2), _state[i], i != "onDOMContentLoaded");
}

function _by_specificity(selector1, selector2) {
  return selector2.specificity - selector1.specificity;
};

// text resize

EventTarget.addEventListener(window, "load", function() {
  var dummy = _createDummyElement(), height;
  dummy.innerHTML = "&nbsp;";
  setTimeout(function() {
    if (!_state.busy) {
      var resized = height != null && height != dummy.clientHeight;
      height = dummy.clientHeight;
      if (resized) {
        var event = Document.createEvent(document, "UIEvents");
        event.initEvent("textresize", false, false);
        EventTarget.dispatchEvent(document, event);
      }
    }
    setTimeout(arguments.callee, _state.busy || resized ? 500 : 100);
  }, 100);
}, false);

eval(this.exports);

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
