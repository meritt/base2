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
// JSB/package.js
// =========================================================================

// JavaScript Behaviors

var JSB = new base2.Package(this, {
  name:    "JSB",
  version: "0.9.2",
  imports: "DOM",
  exports: "Behavior,Rule,RuleList,ExtendedMouse"
});

eval(this.imports);

;;; if (typeof console2 == "undefined") global.console2={log:Undefined,update:Undefined};

// =========================================================================
// JSB/header.js
// =========================================================================

var _MSIE   = detect("MSIE"),
    _OPERA9 = detect("opera9");

// Max time for hogging the processor.
var _MAX_PROCESSING_TIME = 200; // milliseconds

// Restrict the number of elements returned by a DOM query
// This ensures that the recalc() function does not run for too long.
// It also ensures that elements are returned in batches
// appropriate for consistent rendering.
var _MAX_ELEMENTS = 200;

var _TICK =  0;

var _EVENT          = /^on(DOM\w+|[a-z]+)$/,
    _EVENT_BUTTON   = /^mouse(up|down)|click$/,
    _EVENT_CAPTURE  = /^(focus|blur)$/,
    _EVENT_CLICK    = /click$/,
    _EVENT_MOUSE    = /^mouse|click$/,
    _EVENT_TEXT     = /^(key|text)/;

var _MOUSE_BUTTON_LEFT = /^[^12]$/,
    _MOUSE_CAPTURE     = /^mouse(up|move)$/;

var _CANNOT_DELEGATE = /^(abort|error|load|scroll|readystatechange|propertychange|filterchange)$/;

// =========================================================================
// JSB/Behavior.js
// =========================================================================

var Behavior = new Base({
  attach: Function2.I,
  detach: Function2.I,

  modify: function(_interface) {
    // Extend a behavior to create a new behavior.
    var behavior = pcopy(this).extend(_interface);
    behavior.EventDelegator = this.EventDelegator || EventDelegator;
    if (_interface && _interface.EventDelegator) {
      behavior.EventDelegator = behavior.EventDelegator.extend(_interface.EventDelegator);
    }
    var events, delegatedEvents = [];
    var attachedElementIDs = {}; // base2IDs
    var eventListener = new EventListener(new behavior.EventDelegator(behavior, attachedElementIDs));
    
    if (behavior.ondocumentready) {
      behavior._documentReadyQueue = [];
    }

    // Extract events.
    forEach (behavior, function(property, name) {
      if (typeof property == "function" && _EVENT.test(name)) {
        var type = name.slice(2);
        // Store event handlers.
        if (_CANNOT_DELEGATE.test(type)) {
          if (!events) events = [];
          events.push(type);
        } else {
          delegatedEvents.push(type);
        }
      }
    });

    behavior.attach = function(element) {
      var base2ID = element.base2ID || assignID(element);
      if (!attachedElementIDs[base2ID]) { // Don't attach more than once.
        attachedElementIDs[base2ID] = true;
        // Add event handlers
        if (delegatedEvents) {
          forEach (delegatedEvents, eventListener.delegate, eventListener);
          delegatedEvents = null;
        }
        if (events) {
          forEach (events, bind(eventListener.add, eventListener, element));
        }
        // Pseudo events.
        if (behavior.onattach) behavior.onattach(element);
        if (behavior.oncontentready) {
          if (DocumentState.isContentReady(element)) {
            behavior.oncontentready(element);
          } else {
            DocumentState.contentReadyQueue.push({element: element, behavior: behavior});
          }
        }
        if (behavior._documentReadyQueue) {
          behavior._documentReadyQueue.push(element);
        }
        if (element == document.activeElement && behavior.onfocus) {
          behavior.dispatchEvent(element, "focus");
        }
      }
      return element;
    };

    behavior.detach = function(element) {
      delete attachedElementIDs[element.base2ID];
      return element;
    };

    return behavior;
  },

  EventDelegator: null,

  dispatchEvent: function(element, event, data) {
    if (typeof event == "string") {
      var type = event;
      event = DocumentEvent.createEvent(document, "Events");
      Event.initEvent(event, type, true, false);
    }
    if (data) extend(event, data);
    EventTarget.dispatchEvent(element, event);
  },

  handleEvent: function(element, event, type) {
    // We could use the passed event type but we can't trust the descendant
    // classes to always pass it. :-)
    type = event.type;
    var handler = "on" + type;
    if (this[handler]) {
      if (_EVENT_MOUSE.test(type)) {
        if (!_EVENT_BUTTON.test(type) || _MOUSE_BUTTON_LEFT.test(event.button)) {
          if (type == "mousewheel") {
            this[handler](element, event, event.wheelDelta);
          } else {
            this[handler](element, event, event.offsetX, event.offsetY, event.screenX, event.screenY);
          }
        }
      } else if (_EVENT_TEXT.test(type)) {
        this[handler](element, event, event.keyCode, event.shiftKey, event.ctrlKey, event.altKey, event.metaKey);
      } else {
        this[handler](element, event);
      }
    }
  },

  getProperty: function(element, name) {
    var defaultValue = this[name];
    var value = Element.getAttribute(element, name);
    if (value == null) {
      value = defaultValue;
    } else if (defaultValue != null) {
      value = defaultValue.constructor(value); // cast
    }
    return value;
  },

  getComputedStyle: function(element, propertyName) {
    var view = document.defaultView;
    if (propertyName) return ViewCSS.getComputedPropertyValue(view, element, propertyName);
    return ViewCSS.getComputedStyle(view, element, null);
  },

  getCSSProperty: function(element, propertyName) {
    CSSStyleDeclaration.getPropertyValue(element.style, propertyName);
  },

  setCSSProperty: function(element, propertyName, value, important) {
    CSSStyleDeclaration.setProperty(element.style, propertyName, value, important ? "important" : "");
  },

  setCapture: function(element) {
    if (!Behavior._captureMouse) {
      var behavior = this;
      Behavior._captureElement = element;
      Behavior._captureMouse = function(event) {
        if (_OPERA9) getSelection().collapse(document.body, 0); // prevent text selection
        if (event.type == "mousemove" || event.eventPhase == Event.BUBBLING_PHASE) {
          behavior.handleEvent(element, event, event.type);
        }
      };
      this.addEventListener(document, "mouseup", Behavior._captureMouse, true);
      this.addEventListener(document, "mousemove", Behavior._captureMouse, true);
    }
  },

  releaseCapture: function() {
    if (Behavior._captureMouse) {
      this.removeEventListener(document, "mouseup", Behavior._captureMouse, true);
      this.removeEventListener(document, "mousemove", Behavior._captureMouse, true);
      delete Behavior._captureMouse;
      delete Behavior._captureElement;
    }
  },

  "@MSIE": {
    setCapture: function(element) {
      element.setCapture();
      behavior = this;
      element.attachEvent("onlosecapture", function() {
        if (Behavior._captureMouse) {
          // element.fireEvent("onmouseup");
          behavior.dispatchEvent(element, "mouseup");
        }
        element.detachEvent("onlosecapture", arguments.callee);
      });
      this.base(element);
    },

    releaseCapture: function() {
      this.base();
      document.releaseCapture();
    }
  }
});

// Additional methods (all the good ones)

forEach.csv("setInterval,setTimeout", function(name) {
  Behavior[name] = function(callback, delay) {
    if (typeof callback == "string") callback = this[callback];
    var args = Array2.slice(arguments, 2);
    var self = this;
    return global[name](function() {
      callback.apply(self, args);
    }, delay || 0);
  };
});

forEach ([
  EventTarget,
  NodeSelector,
  Node,
  Element
], function(_interface) {
  _interface.forEach(function(method, name) {
    if (!Behavior[name]) {
      Behavior[name] = bind(method, _interface);
    }
  });
});

ClassList.forEach(function(method, name) {
  Behavior[name + "Class"] = bind(method, ClassList);
});

// =========================================================================
// JSB/Rule.js
// =========================================================================

// A Selector associated with a Behavior.

var Rule = Base.extend({
  constructor: function(selector, behavior) {
    if (!instanceOf(selector, Selector)) {
      selector = new Selector(selector);
    }
    if (typeof behavior == "string") {
      behavior = new External(behavior, function(external) {
        behavior = external;
      });
    } else if (!behavior || Behavior.constructor != behavior.constructor) {
      behavior = Behavior.modify(behavior);
    }
    
    this.refresh = function() {
      if (behavior.attach) selector.exec(document).forEach(behavior.attach);
    };

    this.toString = selector.toString;
    
    DocumentState.addRule(selector, behavior);
  },
  
  refresh: Undefined // defined in the constructor function
});

// =========================================================================
// JSB/RuleList.js
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
// JSB/EventListener.js
// =========================================================================

// Mostly fixes for event.offsetX/Y

var EventListener = Base.extend({
  constructor: function(delegator) {
    this.delegator = delegator;
  },
  
  delegator: null,

  add: function(target, type) {
    EventTarget.addEventListener(target, type, this, _EVENT_CAPTURE.test(type));
  },

  delegate: function(type) {
    this.add(document, type);
  },
  
  handleEvent: function(event) {
    this.delegator.handleEvent(event);
  },

  "@Opera" : {
    handleEvent: function(event) {
      var target = event.target;
      if (_EVENT_MOUSE.test(event.type)) {
        event = Event.cloneEvent(event);
        event.offsetX += target.clientLeft;
        event.offsetY += target.clientTop;
      }
      this.delegator.handleEvent(event);
    }
  },

  "@MSIE" : {
    handleEvent: function(event) {
      var target = event.target;
      if (_EVENT_MOUSE.test(event.type)) {
        event = Event.cloneEvent(event);
        var hasLayout = target.currentStyle.hasLayout;
        if (hasLayout === false || !target.clientWidth) {
          event.offsetX -= target.offsetLeft;
          event.offsetY -= target.offsetTop;
          if (hasLayout === undefined) { // this should probably be a test for quirks mode
            event.offsetX -= 2;
            event.offsetY -= 2;
          }
        }
        event.offsetX += target.clientLeft;
        event.offsetY += target.clientTop;
      }
      this.delegator.handleEvent(event);
    }
  },

  "@Gecko" : {
    handleEvent: function(event) {
      if (_EVENT_MOUSE.test(event.type)) {
        var target = event.target;
        if (target.nodeType == 3) {
          target = target.parentNode;
        }
        if (target.getBoundingClientRect) {
          var rect = target.getBoundingClientRect();
        } else {
          var box = document.getBoxObjectFor(target);
          var computedStyle = getComputedStyle(target, null);
          rect = {
            left: box.x - parseInt(computedStyle.borderLeftWidth),
            top: box.y - parseInt(computedStyle.borderTopWidth)
          };
          // for ancient moz browsers
          if (isNaN(rect.left)) {
            rect.left = target.offsetLeft;
            rect.top = target.offsetTop;
          }
        }
        event.offsetX = event.pageX - rect.left;
        event.offsetY = event.pageY - rect.top;
      }
      this.delegator.handleEvent(event);
    }
  }
});

// =========================================================================
// JSB/EventDelegator.js
// =========================================================================

var EventDelegator = Base.extend({
  constructor: function(behavior, attached) {
    this.behavior = behavior;
    this.attached = attached;
  },

  behavior: null,
  attached: null,
  
  handleEvent: function(event) {
    var type = event.type;
    var behavior = this.behavior;
    if (type == "documentready") {
      if (behavior._documentReadyQueue) {
        forEach (behavior._documentReadyQueue, behavior.ondocumentready, behavior);
        delete behavior._documentReadyQueue;
      }
    } else {
      var capture = Behavior._captureMouse && _MOUSE_CAPTURE.test(type);
      var target = capture ? Behavior._captureElement : event.target;
      var cancelBubble = !event.bubbles || capture;
      if (!cancelBubble) {
        extend(event, "stopPropagation", function() {
          this.base();
          cancelBubble = true;
        });
      }
      do {
        // make sure it's an attached element
        if (this.attached[target.base2ID]) {
          behavior.handleEvent(target, event, type);
        }
        target = target.parentNode;
      } while (target && !cancelBubble);
    }
  }
});

// =========================================================================
// JSB/ExtendedMouse.js
// =========================================================================

// The default behavior for JSB is to only handle mouse events for the left
// mouse button.
// This behavior allows any button click. Relevant events get the "button"
// parameter as the first argument after the "event" parameter.

var ExtendedMouse = Behavior.modify({
  handleEvent: function(element, event, type) {
    type = event.type;
    if (_EVENT_BUTTON.test(type)) {
      var handler = this["on" + type];
      if (handler) {
        this[handler](element, event, event.button, event.offsetX, event.offsetY, event.screenX, event.screenY);
      }
    } else {
      this.base(element, event);
    }
  }
});

// =========================================================================
// JSB/DocumentState.js
// =========================================================================

;;; console2.log("START");
;;; console2.update();
;;; var start = Date2.now();

var DocumentState = Behavior.modify({
  EventDelegator: {
    handleEvent: function(event) {
      this.behavior["on" + event.type](event.target, event.offsetX, event.offsetY);
    }
  },

  active: false,
  busy:   false,
  loaded: false,
  ready:  false,

  contentReadyQueue: [],
  rules: new Array2,
  
  onDOMContentLoaded: function() {
    this.loaded = true;
    ;;; console2.log("DOMContentLoaded");
    ;;; console2.log("Document load time: " + (Date2.now() - start));
    if (!this.ready && !this.rules.length) this.fireReady(document);
  },

  onkeydown: function() {
    this.active = this.busy = true;
  },

  onkeyup: function() {
    this.active = this.busy = false;
  },

  onmousedown: function(element, x, y) {
    // If the user has clicked on a scrollbar then carry on processing.
    this.active = this.busy = (
      x < element.offsetWidth &&
      y < element.offsetHeight
    );
  },

  onmouseup: function() {
    this.active = this.busy = false;
  },

  onmousemove: function() {
    if (!this.busy) this.setBusyState(true)
  },

  addRule: function(selector, behavior) {
    assert(!this.loaded, "Cannot add JSB rules after the DOM has loaded.");
    assert(!/:/.test(selector), format("Pseudo class selectors not allowed in JSB (selector='%2').", selector));
    var query = Selector.parse(selector);
    this.rules.push({query: query, behavior: behavior});
    if (this.rules.length == 1) this.recalc(); // start the timer
  },

  fireReady: function() {
    if (!this.ready) {
      this.ready = true;
      this.dispatchEvent(document, "documentready");
      ;;; console2.log("documentready");
      ;;; console2.log("Document ready time: " + (Date2.now()  - start));
    }
  },

  isContentReady: function(element) {
    if (this.loaded || !element.canHaveChildren) return true;
    while (element && !element.nextSibling) {
      element = element.parentNode;
    }
    return !!element;
  },

  recalc: function(i, j, elements) {
    //;;; console2.log("TICK: busy=" + this.busy);
    var rules = this.rules;
    if (!this.busy) {
      // Process the contentready queue.
      var contentReadyQueue = this.contentReadyQueue;
      var now = Date2.now(), start = now, k = 0;
      while (contentReadyQueue.length && (now - start < _MAX_PROCESSING_TIME)) {
        var ready = contentReadyQueue[0];
        if (this.isContentReady(ready.element)) {
          ready.behavior.oncontentready(ready.element);
          contentReadyQueue.shift();
        }
        if (k++ < 5 || k % 50 == 0) now = Date2.now();
      }
      
      // Process attachments.
      var count = rules.length;
      while (count && rules.length && (now - start < _MAX_PROCESSING_TIME)) {
        if (i == null) i = j = 0;
        var rule = rules[i];
        var behavior = rule.behavior;
        
        // Execute a DOM query.
        var queryComplete = false;
        if (!elements) {
          var query = rule.query;
          var state = query.state || [];
          state.unshift(document, behavior.constructor == External ? 2 : _MAX_ELEMENTS);
          elements = query.apply(null, state);
          queryComplete = !!query.complete;
        }

        now = Date2.now(); // update the clock

        var length = elements.length, k = 0;

        if (length && behavior.constructor == External) {
          // Load the external behavior.
          rule.behavior = behavior.getObject() || behavior;
          delete query.state;
          elements = null;
          i++;
        } else {
          // Attach behaviors.
          while (j < length && (now - start < _MAX_PROCESSING_TIME)) {
            behavior.attach(elements[j++]);
            if (k++ < 5 || k % 50 == 0) now = Date2.now();
          }

          // Maintain the loop.
          if (j == length) { // no more elements
            j = 0;
            elements = null;
            if (this.loaded && queryComplete) { // stop processing after DOMContentLoaded
              rules.removeAt(i);
            } else i++;
          }
        }
        if (i >= rules.length) i = 0; // at end, loop to first rule
        count--;
      }
    }
    if (rules.length) {
      this.setTimeout(this.recalc, _TICK, i, j, elements);
    } else {
      if (!this.ready) this.fireReady(document);
    }
  },
  
  setBusyState: function(state) {
    this.busy = this.active || !!state;
    if (this.busy) this.setTimeout(this.setBusyState, 250);
  }
});

DocumentState.attach(document);

// =========================================================================
// JSB/External.js
// =========================================================================

var External = Base.extend({
  constructor: function(url, callback) {
    url = url.split("#");
    this.src = url[0];
    this.id = url[1].split(".");
    this.callback = callback;
  },

//id: null,
//loaded: false,
//src: "",
//script: null,
  
  getObject: function() {
    if (!this.loaded) this.load();
    var object = window, i = 0;
    while (object && i < this.id.length) {
      object = object[this.id[i++]];
    }
    if (object) {
      this.callback(object);
      this.unload();
    }
    return object;
  },

  load: function() {
    // load the external script
    External.SCRIPT.src = this.src;
    if (!External.scripts[External.SCRIPT.src]) {
      External.scripts[External.SCRIPT.src] = true;
      this.script = document.createElement("script");
      this.script.type = "text/javascript";
      this.script.src = this.src;
      Document.querySelector(document, "head").appendChild(this.script);
    }
    this.loaded = true;
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

eval(this.exports);

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
