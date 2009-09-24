/*
  base2 - copyright 2007-2009, Dean Edwards
  http://code.google.com/p/base2/
  http://www.opensource.org/licenses/mit-license.php

  Contributors:
    Doeke Zanstra
*/

// timestamp: Wed, 23 Sep 2009 19:38:56

new function(_no_shrink_) { ///////////////  BEGIN: CLOSURE  ///////////////

// =========================================================================
// jsb/package.js
// =========================================================================

// JavaScript Behaviors.

base2.global.jsb = new base2.Package(this, {
  name:    "jsb",
  version: "0.9.6",
  imports: "Function2,Enumerable,dom",
  exports: "Animation,Rule,RuleList,behavior",

  INTERVAL:  25, // milliseconds

  // Max time for hogging the processor.
  TIMEOUT: 100, // milliseconds

  // Restrict the number of elements returned by a DOM query.
  // This ensures that the tick() function does not run for too long.
  // It also ensures that elements are returned in batches appropriate
  // for consistent rendering.
  QUERY_SIZE: 100,

  // Simple style sheet creation.
  // This is overridden later to provide more complex style sheets.

  createStyleSheet: function(cssText) {
    if (document.body) {
      var style = document.createElement("style");
      style.type = "text/css";
      if (style.textContent === undefined) {
        style.innerHTML = cssText;
      } else {
        style.textContent = cssText;
      }
      new Selector("head").exec(document, 1).appendChild(style);
    } else {
      document.write('<style type="text/css">' + cssText + '<\/style>');
    }
  },

  "@(document.createStyleSheet)": {
    createStyleSheet: function(cssText) {
      document.createStyleSheet().cssText = cssText;
    }
  }
});

eval(this.imports);

;;; if (typeof console2 == "undefined") global.console2={log:Undefined,update:Undefined};

jsb.host = _getCurrentHost();

// =========================================================================
// jsb/header.js
// =========================================================================

/*@cc_on @*/

var _EVENT              = /^on([a-z]{3,}|DOM[A-Z]\w+)$/,
    _EVENT_BUTTON       = /^mouse(up|down)|click$/,
    _EVENT_CLICK        = /click$/,
    _EVENT_MOUSE        = /^mouse|click$/,
    _EVENT_OVER_OUT     = /^mouse(enter|leave|over|out)$/,
    _EVENT_PSEUDO       = /^(attach|detach|(content|document)ready)$/,
    _EVENT_TEXT         = /^(key|text)/,
    _EVENT_USE_CAPTURE  = /^(focus|blur)$/;

var _CANNOT_DELEGATE    = /^(abort|error|load|scroll|DOMAttrModified|mouse(enter|leave)|(readystate|property|filter)change)$/,
    _HTML_BODY          = /^(HTML|BODY)$/,
    _MOUSE_BUTTON_LEFT  = /^[^12]$/;

var _DIGITS             = /\d+/g,
    _RGB_VALUE          = /\d+%?/g;

var _GENERIC_EVENTS     = detect("(document.createEvent('Events'))") ? "Events" : "UIEvents";

var _allAttachments     = {};

var _parseInt16 = partial(parseInt, undefined, 16);

function _by_specificity(selector1, selector2) {
  return selector2.specificity - selector1.specificity;
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

var _style = document.createElement("span").style;

function _getCurrentHost() {
  var host = location.pathname,
      script = Array2.item(document.getElementsByTagName("script"), -1);
      
  if (script) host = script.src || host;
  ;;; host = host.replace(/build\.php\?package=([\w\/]+)package\.xml.*$/, "$1");
  return host.replace(/[\?#].*$/, "").replace(/[^\/]*$/, "");
};

// =========================================================================
// jsb/behavior.js
// =========================================================================

var _Behavior = Base.extend({
  attach: Undefined,
  detach: Undefined,
  modify: Undefined,

  jsbExtendedMouse: false, // allow right and middle button clicks
  jsbUseDispatch: true,    // use event dispatch (not a callback)
  jsbUseDelegation: true,  // use event delegation (appropriate events are handled by the document object)

  ancestorOf: function(behavior) {
    return behavior instanceof this.constructor;
  },

  extend: function(_interface) {
    // Extend a behavior to create a new behavior.

    if (!_interface) _interface = {};
    
    // Create the Behavior constructor.
    var Behavior = function(){};
    (Behavior.prototype = new this.constructor).constructor = Behavior;

    var interfaces = _interface["implements"] || [];
    delete _interface["implements"];
    interfaces.push(_interface);
    for (var i = 0; _interface = interfaces[i]; i++) {
      extend(Behavior.prototype, _interface);
    }

    var behavior = new Behavior;

    // Extract events.

    var delegatedEvents = [],
        events,
        eventListener = {
          handleEvent: function(event) {
            jsb.eventDispatcher.dispatch(behavior, event.target, event);
          }
        };

    for (var name in behavior) {
      if (typeof behavior[name] == "function" && _EVENT.test(name)) {
        var type = name.slice(2);
        // Store event handlers.
        if (!behavior.jsbUseDelegation || _CANNOT_DELEGATE.test(type)) {
          if (!events) events = [];
          events.push(type);
        } else if (!_EVENT_PSEUDO.test(type)) {
          delegatedEvents.push(type);
        }
      }
    }

    var attachments = {behavior: behavior};

    behavior.attach = function(element) {
      var uniqueID = element.uniqueID || assignID(element);

      if (attachments[uniqueID] === undefined) { // don't attach more than once
        // Maintain attachment state.
        attachments[uniqueID] = true;
        if (!_allAttachments[uniqueID]) _allAttachments[uniqueID] = 0;
        _allAttachments[uniqueID]++;

        // Add event handlers
        if (delegatedEvents) {
          for (var i = 0; type = delegatedEvents[i]; i++) {
            jsb.eventDelegator.addEventListener(type, attachments);
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
        if (arguments[1]) { // events only
          attachments[uniqueID] = false;
        } else {
          delete attachments[uniqueID];
        }
        _allAttachments[uniqueID]--;
        if (events) {
          for (var i = 0; type = events[i]; i++) {
            EventTarget.removeEventListener(element, type, eventListener, false);
          }
        }
      }
    };

    var modifications = Behavior.modifications = {},
        specificities = {};

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
        }
      };
    };

    return behavior;
  },

  // Manage properties

  get: function(element, propertyName) {
    // Retrieve a DOM property.

    // special cases
    if (propertyName == "textContent") {
      propertyName = Traversal.TEXT_CONTENT;
    }
    
    var attributes = this.constructor.modifications[element.uniqueID] || this,
        defaultValue = attributes[propertyName],
        value;

    if (propertyName != "type") {
      value = element[propertyName];
    }
    if (value === undefined) {
      value = Element.getAttribute(element, propertyName);
    }
    if (value == null) return defaultValue;
    
    switch (typeof defaultValue) {
      case "boolean": return true;
      case "number":  return value - 0;
    }
    return value;
  },

  set: function(element, propertyName, value) {
    // Set a DOM property.

    // special cases
    var isInnerHTML = propertyName == "innerHTML";
    if (isInnerHTML || propertyName == "textContent") {
      Traversal.setTextContent(element, value, isInnerHTML);
      // Don't send an event for these modifications
    } else {
      var originalValue = element[propertyName];
      if (originalValue === undefined) {
        originalValue = this.get(element, propertyName);
        if (typeof this[propertyName] == "boolean" && !value) {
          Element.removeAttribute(element, propertyName);
        } else {
          Element.setAttribute(element, propertyName, value);
        }
      } else {
        element[propertyName] = value;
      }
      if (originalValue !== this.get(element, propertyName)) {
        this.dispatchEvent(element, "propertyset", {
          propertyName: propertyName,
          originalValue: originalValue
        });
      }
    }
  },

  toggle: function(element, propertyName) {
    this.set(element, propertyName, !this.get(element, propertyName));
  },

  dispatchEvent: function(node, event, data) {
    if (typeof event == "string") {
      var type = event;
      event = DocumentEvent.createEvent(document, _GENERIC_EVENTS);
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
    event.returnValue = undefined;
    event.cancelBubble = false;
    EventTarget.dispatchEvent(node, event);
  },

  // You should mostly use element.style.
  // Use this to retrieve newer properties like "opacity".

  getStyle: function(element, propertyName) {
    return CSSStyleDeclaration.getPropertyValue(element.style, propertyName);
  },

  // Setting element.style is quicker but this offers cross-browser safety and the
  // ability to set the !important flag.

  setStyle: function(element, propertyName, value, important) {
    var style = element.style;
    if (arguments.length > 2) {
      CSSStyleDeclaration.setProperty(style, propertyName, value, important ? "important" : "");
    } else {
      CSSStyleDeclaration.setProperties(style, arguments[1]);
    }
  },

  getComputedStyle: function(element, propertyName) {
    var view = document.defaultView;
    if (arguments.length == 1) {
      return ViewCSS.getComputedStyle(view, element, null);
    } else {
      return ViewCSS.getComputedPropertyValue(view, element, propertyName);
    }
  },

  animate: function(element, transitions) {
    return new Animation(element.style, transitions, element, true);
  },

  // For positioning popups.

  getOffsetFromBody: function(element) {
    return ElementView.getOffsetFromBody(element);
  },

  // Mouse capture. Useful for drag/drop. Not perfect, but almost always good enough.

  setCapture: function(element) {
    if (element != _state.captureElement) this.releaseCapture();
    if (!_state.captureElement) {
      _state.captureElement = element;
    }
  },

  releaseCapture: function() {
    var element = _state.captureElement;
    if (element) {
      delete _state.captureElement;
      this.dispatchEvent(element, "losecapture");
      if (!this.matchesSelector(element, ":hover")) {
        this.dispatchEvent(element, "mouseout");
      }
    }
  }
});

var behavior = _Behavior.prototype;

// Bind timers to behaviors.

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

// querySelector/querySelectorAll

forEach.csv ("querySelector,querySelectorAll", function(name) {
  behavior[name] = function(node, selector) {
    if (arguments.length == 1) {
      selector = node;
      node = document;
    }
    return NodeSelector[name](node, selector);
  };
});

// Additional DOM methods (from base2.DOM).

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

// addClass/hasClass/removeClass/toggleClass

ClassList.forEach(function(method, name) {
  if (name == "contains") name = "has";
  behavior[name + "Class"] = method;
});

behavior = new _Behavior; // seal-off

// =========================================================================
// jsb/Rule.js
// =========================================================================

// A Selector associated with a behavior.

var Rule = Base.extend({
  constructor: function(selector, behavior) {
    if (!(selector instanceof Selector)) {
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
      if (typeof behavior.attach == "function") {
        selector.exec(document).forEach(behavior.attach);
      }
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
  put: function(key, value) { // allow feature detection
    key = String(key);
    if (key.indexOf("@") == 0) {
      if (detect(key.slice(1))) this.merge(value);
    } else {
      this.base.apply(this, arguments);
    }
  },
  
  refresh: function() {
    this.invoke("refresh");
  }
}, {
  Item: Rule
});

// =========================================================================
// jsb/Animation.js
// =========================================================================

var Animation = Base.extend({
  constructor: function(object, params, styleElement, autostart) {
    var transitions = {}, defaultTransition;
    
    var createTransition = function(transition, propertyName) {// recurse after we've broken down shorthand properties
      // If the transition is a string then it defines the end point
      // of the transition only.
      if (typeof transition != "object") {
        transition = {end: String(transition)};
      }
      // The first transition in the list defines the default
      // values for duration and delay in subsequent transitions.
      if (!defaultTransition) defaultTransition = transition;
      transition = copy(transition);
      transition.styleElement = styleElement;
      if (transition.delay == null && defaultTransition.delay != null) {
        transition.delay = defaultTransition.delay;
      }
      if (transition.duration == null && defaultTransition.duration != null) {
        transition.duration = defaultTransition.duration;
      }

      // Break shorthand properties into the longhand version.
      // This only parses property names. Values are parsed in Transition.js.
      // Some shorthand properties cannot be parsed.
      // (I may fix backgroundPosition eventually).
      if (/^(font|background(Position)?)$/.test(propertyName)) {
        throw "Cannot animate shorthand property '" + propertyName + "'.";
      } else if (/^border(Top|Right|Bottom|Left)?$/.test(propertyName)) { // shorthand border properties
        var property = propertyName,
            start = _split(transition.start),
            end = _split(transition.end),
            names = ["Width", "Style", "Color"];
        // recurse after we've broken down shorthand properties
        forEach (end, function(end, i) {
          var params = copy(transition);
          params.start = start[i];
          params.end = end;
          createTransition(params, property + names[i]);
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
          //addTransition(property + side + name, params);
          transitions[property + side + name] = params;
        });
      } else {
        //addTransition(propertyName, transition);
        transitions[propertyName] = transition;
      }
    };
    
    forEach (params, createTransition);

    function addTransition(propertyName, params) {
      return _state.transitions.add(object, propertyName, params);
    };

    var started = false;
    this.start = function() {
      forEach (transitions, function(params, propertyName) {
        var transition = addTransition(propertyName, params);
        if (!started) {
          params.start = transition.start;
          params.duration = transition.duration;
        }
      });
      started = true;
    };

    this.reverse = function(duration) {
      forEach (transitions, function(transition, propertyName) {
        addTransition(propertyName, {
          end: transition.start,
          duration: duration || transition.duration,
          styleElement: styleElement
        });
      });
    };

    this.accelerate = function(rate) {
      forEach (transitions, function(transition, propertyName) {
        transition = _state.transitions.get(transition);
        if (transition) transition.accelerate(rate);
      });
    };

    /*this.pause = function() {
      forEach (transitions, function(transition, propertyName) {
        transition = _state.transitions.get(transition);
        if (transition) transition.pause();
      });
    };*/
    
    if (autostart) this.start();
  },
  
  transitions: null,

  // defined in the constructor function
  accelerate: Undefined,
  reverse:    Undefined,
  start:      Undefined/*,
  stop:       Undefined,
  pause:      Undefined*/
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
  }
});

// =========================================================================
// jsb/Transition.js
// =========================================================================

// Special parsing of colours and "clip" are bulking this out. :-(

var Transition = Base.extend({
  constructor: function(object, propertyName, params) {
    extend(this, params);

    this.toString = K(Transition.getKey(object, propertyName, params));
    
    this.propertyName = propertyName;

    var styleElement = this.styleElement,
        startValue = this.start,
        ease = this.timing;
        
    if (styleElement) propertyName = CSSStyleDeclaration.getPropertyName(propertyName);
        
    if (startValue == null) {
      startValue = this.start = object[propertyName] ||
        (styleElement ? ViewCSS.getComputedPropertyValue(document.defaultView, styleElement, propertyName) : "") || "";
    }
    
    // Parse the start/end values and create the underlying timing function.
    if (/color$/i.test(propertyName)) {
      startValue = this.parseColor(startValue);
      var endValue = this.parseColor(this.end),
          delta = map(startValue, function(value, i) {
            return endValue[i] - value;
          }),
          calculateValue = function(t) {
            return "#" + map(startValue, function(value, i) {
              value = Math.round(ease(t, value, delta[i], duration));
              return (value < 16 ? "0" : "") + value.toString(16);
            }).join("");
          };
    } else if (styleElement && propertyName == "clip") {
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
    } else if (/^\-?\.?\d/.test(this.end)) { // Numeric.
      var unit = String(this.end).replace(/^[-.\d]+/, "").toLowerCase();  // strip number
      if (!parseFloat(startValue)) startValue = this.start = 0 + unit;
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
      calculateValue = function(t) { // flip only at the end
        return ease(t, 0, 1, duration) < 1 ? startValue : endValue;
      };
    }

    var timestamp = 0,
        reversed = false,
        started = 0,
        paused = 0,
        delay = ~~(this.delay * 1000),
        duration = ~~(this.duration * 1000),
        speed = 1,
        elapsedTime = 0;

    if (typeof ease != "function") {
      ease = Animation.timingFunctions[ease];
    }
    
    assertType(ease, "function", "Invalid timing function.");
    
    this.tick = function(now) {
      if (!timestamp) timestamp = now;
      if (!this.complete && !paused) {
        elapsedTime = now - timestamp;
        if (!started && elapsedTime >= delay) {
          started = now;
        }
        if (started) {
          elapsedTime = Math.round(Math.min((now - started) * speed, duration));
          
          var t = reversed ? duration - elapsedTime : elapsedTime;
          
          if (styleElement) {
            CSSStyleDeclaration.setProperty(object, propertyName, calculateValue(t));
          } else {
            object[propertyName] = calculateValue(t);
          }


          this.complete = elapsedTime >= duration;
          if (this.complete) {
            this.elapsedTime = now - timestamp;
          }
        }
      }
    };

    this.reverse = function() {
      var temp = this.start;
      this.start = this.end;
      this.end = temp;
      this.complete = false;
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
      speed = s;
      if (started) {
        started = Date2.now() - elapsedTime / speed;
      }
    };

    this.accelerate = function(rate) {
      this.setSpeed(speed * rate);
    };
  },

  complete: false,
  delay: 0,
  duration: 1, // seconds
  timing: "ease",
  start: null,
  end: null,

  compare: function(value, position) {
    if (/color$/i.test(this.propertyName)) {
      return this.parseColor(this[position]).join(",") == this.parseColor(value).join(",");
    } else if (this.propertyName == "clip") {
      // Stoopid incompatible clip rects:
      // http://www.ibloomstudios.com/articles/misunderstood_css_clip/
      var COMMAS = /,\s*/g;
      return this[position].replace(COMMAS, " ") == value.replace(COMMAS, " ");
    }
    return this[position] == value;
  },

  parseColor: function(color) { // return an array of rgb values
    color = color.toLowerCase();
    var colors = Transition.colors, // cache
        value = color,
        rgb = colors[color];
    if (typeof rgb == "string") {
      value = rgb;
      rgb = "";
    }
    if (!rgb) {
      if (/^rgb/.test(value)) {
        rgb = map(value.match(_RGB_VALUE), function(value) {
          return value.indexOf("%") == -1 ?
            value - 0 :
            Math.round(2.55 * value.slice(0, -1));
        });
      } else if (value.indexOf("#") == 0) {
        var hex = value.slice(1);
        if (hex.length == 3) hex = hex.replace(/([0-9a-f])/g, "$1$1");
        rgb = map(hex.match(/([0-9a-f]{2})/g), _parseInt16);
      } else {
        // If it's a named colour then use getComputedStyle to parse it.
        // Meh. It's ugly but it's less code than a table of colour names.
        var dummy = Transition._dummy;
        if (!dummy) {
          dummy = Transition._dummy = document.createElement("input");
          dummy.style.cssText = "position:absolute;left:0;top:-9999px;";
        }
        document.body.appendChild(dummy);
        try {
          dummy.style.color = value;
          var computedValue = ViewCSS.getComputedPropertyValue(document.defaultView, dummy, "color");
        } catch (x) {}
        document.body.removeChild(dummy);
        if (computedValue != value) {
          rgb = this.parseColor(computedValue || "#000");
        }
      }
      if (!rgb || rgb.length != 3 || Array2.contains(rgb, NaN)) {
        throw "Invalid color '" + color + "'.";
      }
      colors[color] = rgb;
    }
    return rgb;
  }
}, {
  colors: {}, // a cache for parsed colour values

  getKey: function(object, propertyName, params) {
    var target = params.styleElement || object,
        key = assignID(target);
    if (params.styleElement) key += ".style";
    return key + "." + propertyName;
  }
});

// =========================================================================
// jsb/Transitions.js
// =========================================================================

var Transitions = Collection.extend({
  constructor: function(transitions) {
    this.base(transitions);
    this.tick = bind(this.tick, this);
  },
  
  add: function(object, propertyName, params) {
    var key = Transition.getKey(object, propertyName, params),
        transition = this.get(key);
    if (transition) {
      if (transition.duration != params.duration) {
        transition.setSpeed(transition.duration / (params.duration || 1)); // change gears
      }
      if (transition.compare(params.end, "start")) { // flipped start/end points indicate the reversal of a transition
        transition.reverse();
      }
    } else {
      transition = this.put(key, object, propertyName, params);
      if (!this._timer) {
        this._timer = setTimeout(this.tick, 4);
      }
    }
    return transition;
  },

  tick: function() {
    this.invoke("tick", Date2.now());

    var complete = this.filter(function(transition) {
      return transition.complete;
    });

    complete.forEach(this.remove, this);

    complete.forEach(function(transition) {
      if (transition.styleElement) {
        behavior.dispatchEvent(transition.styleElement, "transitionend", {
          propertyName: transition.propertyName,
          elapsedTime: transition.elapsedTime / 1000
        });
      }
    });

    delete this._timer;
    if (this.size() > 0) {
      this._timer = setTimeout(this.tick, 4);
    }
  }
}, {
  Item: Transition,

  create: function(key, object, propertyName, params) {
    return new this.Item(object, propertyName, params);
  }
});

// =========================================================================
// jsb/createStyleSheet.js
// =========================================================================

extend(jsb, "createStyleSheet", function(cssText) {
  if (typeof cssText != "string") {
    var rules = cssText;

    var styleSheet = {
      toString: function() {
        return map(this, function(properties, selector) {
          return selector + properties;
        }).join("\n").replace(/!([^\w])/g, "!important$1");
      }
    };

    var baseRule;
    
    var createRule = function(properties, selector) {
      if (/,/.test(selector)) {
        forEach (new Selector(selector).split(), partial(createRule, properties));
      } else {
        if (!baseRule) {
          baseRule = selector == "*" ? properties : {};
        }
        if (selector != "*") {
          var rule = styleSheet[selector];
          if (!rule) {
            rule = styleSheet[selector] = extend({toString: function() {
              return " {\n" +
                map(this, function(value, propertyName) {
                  if (typeof value == "function") value = "none";
                  return "  " + propertyName.replace(/[A-Z]/g, function(captialLetter) {
                    return "-" + captialLetter.toLowerCase();
                  }) + ": " + value;
                }).join(";\n") +
              "\n}";
            }}, baseRule);
          }
          forEach.detect (properties, function(value, propertyName) {
            if (_style[propertyName] == undefined) {
              propertyName = CSSStyleDeclaration.getPropertyName(propertyName);
            }
            if (_style[propertyName] != undefined) {
              if (value == "initial") {
                forEach (rule, function(initialPropertyValue, initialPropertyName) {
                  if (initialPropertyName.indexOf(propertyName) == 0) {
                    delete rule[initialPropertyName];
                  }
                });
                delete rule[propertyName];
              } else {
                /*@if (@_jscript_version < 5.6)
                if (propertyName == "cursor" && value == "pointer") value = "hand";
                /*@end @*/
                rule[propertyName] = value;
              }
            }
          });
        }
      }
    };
    
    forEach.detect (rules, createRule);

    cssText = styleSheet.toString();
  }

  // This shouldn't really be here.
  // JSB shouldn't really know about Chrome. Oh well.
  cssText = cssText.replace(/%theme%/g, "themes/" + jsb.theme);
  
  var URL = /(url\s*\(\s*['"]?)([\w\.]+[^:\)]*['"]?\))/gi;
  this.base(cssText.replace(URL, "$1" + _getCurrentHost() + "$2"));
  
  return cssText;
});

// =========================================================================
// jsb/External.js
// =========================================================================

var External = Base.extend({
  constructor: function(url, register) {
    url = url.split("#");
    this.src = url[0];
    this.path = url[1].split(".");
    this.register = register;
  },

//id: null,
//src: "",
//script: null,

  attach: true,

  getObject: function() {
    var object = global, i = 0;
    while (object && i < this.path.length) {
      object = object[this.path[i++]];
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
      if (!object.attach) this.attach = false;
    }
    return object;
  }
}, {
  SCRIPT: document.createElement("script"),
  scripts: {}
});

// =========================================================================
// jsb/eventDelegator.js
// =========================================================================

jsb.eventDelegator = new Base({
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
    
    if (target.nodeType != 1) return;
    
    var type = event.type,
        isMouseEvent = _EVENT_MOUSE.test(type),
        capture = isMouseEvent && _state.captureElement;
        
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
    
    var cancelBubble = capture || !event.bubbles,
        element = capture ? _state.captureElement : target;

    if (!cancelBubble) {
      extend(event, "stopPropagation", function() {
        this.base();
        cancelBubble = true;
      });
    }
    
    // Dispatch events.
    do {
      var uniqueID = element.uniqueID;
      if (_allAttachments[uniqueID]) {
        for (var i = 0, attachments; attachments = map[i]; i++) {
          // make sure it's an attached element
          if (attachments[uniqueID]) {
            jsb.eventDispatcher.dispatch(attachments.behavior, element, event);
          }
        }
      }
      element = element.parentNode;
    } while (element && !cancelBubble);
  }
});

// =========================================================================
// jsb/eventDispatcher.js
// =========================================================================

jsb.eventDispatcher = new Base({
  dispatch: function(behavior, element, event, isPseudoEvent) {
    var type = event.type;
    _jsbEvent.listener = behavior["on" + type];

    if (!_jsbEvent.listener || _jsbEvent.listener == Undefined) return;

    _jsbEvent.behavior = behavior;
    _jsbEvent.args = [element, event];

    // Build the event signature.
    if (_EVENT_MOUSE.test(type)) {
      if (type == "mousewheel") {
        _jsbEvent.args.push(event.wheelDelta);
      } else {
        if (_EVENT_BUTTON.test(type)) {
          if (behavior.jsbExtendedMouse) {
            _jsbEvent.args.push(event.button);
          } else {
            if (!_MOUSE_BUTTON_LEFT.test(event.button || 0)) return;
          }
        }
        if (element == event.target) {
          var x = event.offsetX,
              y = event.offsetY;
        } else {
          var offset = ElementView.getOffsetXY(element, event.clientX, event.clientY);
          x = offset.x;
          y = offset.y;
        }
        _jsbEvent.args.push(x, y, event.screenX, event.screenY);
      }
    } else if (_EVENT_TEXT.test(type)) {
      _jsbEvent.args.push(event.keyCode, event.shiftKey, event.ctrlKey, event.altKey, event.metaKey);
    } else if (type == "propertychange" || type == "propertyset" || type == "transitionend") {
      _jsbEvent.args.push(event.propertyName);
    }

    // Trigger the underlying event.
    // Use the host's event dispatch mechanism so that we get a real
    // execution context.
    if (behavior.jsbUseDispatch && (isPseudoEvent || event.bubbles || event.eventPhase == Event.CAPTURING_PHASE)) {
      if (_fire) {
        _fire.jsbEvents++;
      } else {
        var fire = document.createEvent(_GENERIC_EVENTS);
        fire.initEvent("jsbEvents", false, false);
        document.dispatchEvent(fire);
      }
    } else {
      _jsbEvent.listener.apply(behavior, _jsbEvent.args);
    }
  }
});

// The dispatch mechanism.
var _jsbEvent = _private.jsbEvent = {};
if (detect.MSIE && !detect("element.dispatchEvent")) {
  var _fire = document.createElement(/^CSS/.test(document.compatMode) ? "meta" : "marquee");

  _fire.jsbEvents = 0;
  _fire.attachEvent("onpropertychange", new Function("e", 'if(e.propertyName=="jsbEvents"){var d=base2.toString.jsbEvent;d.listener.apply(d.behavior,d.args)}'));

  document.getElementsByTagName("head")[0].appendChild(_fire);
} else {
  document.addEventListener("jsbEvents", function() {
    _jsbEvent.listener.apply(_jsbEvent.behavior, _jsbEvent.args);
  }, false);
}

var _jsbCustomEvent = DocumentEvent.createEvent(document, _GENERIC_EVENTS);
_jsbCustomEvent.initEvent("dummy", false, false);
_jsbCustomEvent = Event.cloneEvent(_jsbCustomEvent);

function _dispatchJSBEvent(behavior, element, type) {
  _jsbCustomEvent.target = element;
  _jsbCustomEvent.type = type;
  jsb.eventDispatcher.dispatch(behavior, element, _jsbCustomEvent, true);
};

// =========================================================================
// jsb/_state.js
// =========================================================================

;;; console2.update();
;;; console2.log(base2.userAgent);
;;; console2.log("START");
;;; var begin = Date2.now();
;;; var tick = 0;

var _state = new Base({
//active: false,
//busy:   false,
//loaded: false,
//ready:  false,
//started: false,
  timestamp: Date2.now(),

  contentReadyQueue: [],
  documentReadyQueue: [],
  liveRules: [],
  rules: [],
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

  onblur: function() {
    _state._lastFocusElement = _state._focusElement;
    _state._focusElement = null;
  },

  onfocus: function(event) {
    _state._focusElement = event.target;
  },

  onmousedown: function(event) {
    _state.active = _state.busy = true;
    //console2.log("BUSY");
  },

  onmouseup: function() {
    _state.active = _state.busy = false;
    //console2.log("IDLE");
  },

  /*onkeydown: function() {
    _state.active = _state.busy = true;
    //console2.log("BUSY");
  },

  onkeyup: function() {
    _state.active = _state.busy = false;
    //console2.log("IDLE");
  },

  onmousemove: function() {
    if (!_state.busy) _state.setBusyState(true)
  },

  onmousewheel: function() {
    if (!_state.busy) _state.setBusyState(true)
  },*/

  addRule: function(selector, behavior) {
    var rule = {
      query: selector.toDOMQuery(),
      behavior: behavior,
      specificity: selector.getSpecificity()
    };
    ;;; rule.toString = selector.toString;
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
    return _state.busy ? jsb.INTERVAL * 10 : jsb.INTERVAL;
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
    if (_HTML_BODY.test(element.nodeName)) return _state.loaded;
    while (element && !element.nextSibling) {
      element = element.parentNode;
    }
    return !!element;
  },

  parseComplete: function() {
    _state.rules = Array2.filter(_state.liveRules, function(rule) {
      return !!rule.behavior.attach;
    });
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
          contentReadyQueue.push(item); // add it to the end
        }
        if (k++ < 5 || k % 50 == 0) now = Date2.now();
      }

      // Process attachments.
      while (count && rules.length && (now - start < jsb.TIMEOUT)) {
        if (i == null) i = j = 0;
        var rule = rules[i],
            behavior = rule.behavior;

        if (behavior.attach) {
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
                rules.splice(i, 1); // rules.removeAt(i);
                delete query.state;
              } else i++;
            }
          }
        } else {
          rules.splice(i, 1); // rules.removeAt(i);
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
  }/*,

  setBusyState: function(busy) {
    _state.busy = _state.active || !!busy;
    if (_state.busy) setTimeout(_state.setBusyState, 250);
    //console2.log(_state.busy?"BUSY":"IDLE");
  }*/
});

for (var i in _state) if (_EVENT.test(i)) {
  EventTarget.addEventListener(document, i.slice(2), _state[i], i != "onDOMContentLoaded");
}

// =========================================================================
// jsb/init.js
// =========================================================================

// release capture

EventTarget.addEventListener(window, "blur", function(event) {
  var element = _state.captureElement;
  if (element && document.body == _state._lastFocusElement) {
    behavior.releaseCapture();
    if (behavior.matchesSelector(element, ":hover")) {
      behavior.dispatchEvent(element, "mouseout");
    }
  }
}, false);

behavior.addClass(document.documentElement, "jsb-enabled");

eval(this.exports);

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
