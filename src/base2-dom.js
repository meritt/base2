/*
  base2 - copyright 2007-2008, Dean Edwards
  http://code.google.com/p/base2/
  http://www.opensource.org/licenses/mit-license.php

  Contributors:
    Doeke Zanstra
*/

// timestamp: Mon, 08 Sep 2008 15:48:07

new function(_no_shrink_) { ///////////////  BEGIN: CLOSURE  ///////////////

// =========================================================================
// DOM/package.js
// =========================================================================

var DOM = new base2.Package(this, {
  name:    "DOM",
  version: "1.0.1",
  imports: "Function2",
  exports:
    "Interface,Binding,Node,Document,Element,AbstractView,HTMLDocument,HTMLElement,"+
    "Selector,Traversal,CSSParser,XPathParser,NodeSelector,DocumentSelector,ElementSelector,"+
    "StaticNodeList,Event,EventTarget,DocumentEvent,ViewCSS,CSSStyleDeclaration,ClassList",
  
  bind: function(node) {
    // Apply a base2 DOM Binding to a native DOM node.
    if (node && node.nodeType) {
      var base2ID = assignID(node);
      if (!DOM.bind[base2ID]) {
        switch (node.nodeType) {
          case 1: // Element
            if (typeof node.className == "string") {
              // It's an HTML element, so use bindings based on tag name.
              (HTMLElement.bindings[node.tagName] || HTMLElement).bind(node);
            } else {
              Element.bind(node);
            }
            break;
          case 9: // Document
            if (node.writeln) {
              HTMLDocument.bind(node);
            } else {
              Document.bind(node);
            }
            break;
          default:
            Node.bind(node);
        }
        DOM.bind[base2ID] = true;
      }
    }
    return node;
  },
  
  "@MSIE5.+win": {
    bind: function(node) {
      if (node && node.writeln) {
        node.nodeType = 9;
      }
      return this.base(node);
    }
  }
});

eval(this.imports);

var _MSIE = detect("MSIE");
var _MSIE5 = detect("MSIE5");

// =========================================================================
// DOM/Interface.js
// =========================================================================

// The Interface module is the base module for defining DOM interfaces.
// Interfaces are defined with reference to the original W3C IDL.
// e.g. http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-1950641247

var Interface = Module.extend(null, {
  forEach: function(block, context) {
    forEach (this, function(method, name) {
      if (typeOf(method) == "function" && (this.prototype[name] || method._delegate)) {
        block.call(context, method, name, this);
      }
    }, this, Module);
  },
  
  implement: function(_interface) {
    if (typeof _interface == "object") {
      _createDelegates(this, _interface);
    } else if (Interface.ancestorOf(_interface)) {
      for (var name in _interface) {
        if (_interface[name] && _interface[name]._delegate) {
          this[name] = bind(name, _interface);
          this[name]._delegate = name;
        }
      }
    }
    return this.base(_interface);
  }
});

function _createDelegates(module, _interface) {
  var id = module.toString().slice(1, -1);
  for (var name in _interface) {
    var property = _interface[name];
    if (name.charAt(0) == "@") {
      _createDelegates(module, property);
    } else if (!module[name] && typeof property == "function" && property.call) {
      // delegate a static method to the bound object
      //  e.g. for most browsers:
      //    EventTarget.addEventListener(element, type, listener, capture)
      //  forwards to:
      //    element.addEventListener(type, listener, capture)
      var args = "abcdefghij".slice(0, property.length).split("");
      var fn = new Function(args.join(","), format("%2.base=%2.%1.ancestor;var m=%2.base?'base':'%1';return %2[m](%3)", name, args[0], args.slice(1)));
      fn._delegate = name;
      module[name] = fn;
      module.namespace += "var " + name + "=base2.lang.bind('" + name + "'," + id + ");";
    }
  }
};

// =========================================================================
// DOM/Binding.js
// =========================================================================

var Binding = Interface.extend(null, {
  bind: function(object) {
    return extend(object, this.prototype);
  }
});

// =========================================================================
// DOM/Node.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-1950641247

var Node = Binding.extend({  
  "@!(element.compareDocumentPosition)" : {
    compareDocumentPosition: function(node, other) {
      // http://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-compareDocumentPosition
      
      if (Traversal.contains(node, other)) {
        return 4|16; // following|contained_by
      } else if (Traversal.contains(other, node)) {
        return 2|8;  // preceding|contains
      }
      
      var nodeIndex = _getSourceIndex(node);
      var otherIndex = _getSourceIndex(other);
      
      if (nodeIndex < otherIndex) {
        return 4; // following
      } else if (nodeIndex > otherIndex) {
        return 2; // preceding
      }      
      return 0;
    }
  }
}, {
  "@Gecko": {
    bind: function(node) {
      return extend(this.base(node), "removeEventListener", function() {
        var args = Array2.slice(arguments);
        args.unshift(this);
        EventTarget.removeEventListener.apply(EventTarget, args);
      });
    }
  }
});

var _getSourceIndex = document.documentElement.sourceIndex ? function(node) {
  return node.sourceIndex;
} : function(node) {
  // return a key suitable for comparing nodes
  var key = 0;
  while (node) {
    key = Traversal.getNodeIndex(node) + "." + key;
    node = node.parentNode;
  }
  return key;
};

// =========================================================================
// DOM/Document.js
// =========================================================================

var Document = Node.extend(null, {
  bind: function(document) {
    extend(document, "createElement", function(tagName) {
      return DOM.bind(this.base(tagName));
    });
    AbstractView.bind(document.defaultView);
    if (document != window.document)
      new DOMContentLoadedEvent(document);
    return this.base(document);
  },
  
  "@!(document.defaultView)": {
    bind: function(document) {
      document.defaultView = Traversal.getDefaultView(document);
      return this.base(document);
    }
  }
});

// =========================================================================
// DOM/Element.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-745549614

// getAttribute() will return null if the attribute is not specified. This is
//  contrary to the specification but has become the de facto standard.

var _ATTRIBUTES = {
  "class": "className",
  "for": "htmlFor"
};

var Element = Node.extend({
  "@MSIE.+win": {
    getAttribute: function(element, name) {
      if (element.className === undefined) { // XML
        return this.base(element, name);
      }
      var attribute = _getAttributeNode(element, name);
      if (attribute && (attribute.specified || name == "value")) {
        if (name == "href" || name == "src") {
          element.base = element.getAttribute.ancestor;
          return element[element.base ? "base" : "getAttribute"](name, 2);
        } else if (name == "style") {
         return element.style.cssText.toLowerCase();
        } else {
         return attribute.nodeValue;
        }
      } else if (name == "type" && element.nodeName == "INPUT") {
        var outerHTML = element.outerHTML;
  			with (outerHTML) outerHTML = slice(0, indexOf(">") + 1);
  			return match(outerHTML, /type="?([^\s">]*)"?/i)[1] || null;
      }
      return null;
    },

    removeAttribute: function(element, name) {
      if (element.className !== undefined) { // XML
        name = _ATTRIBUTES[name.toLowerCase()] || name;
      }
      this.base(element, name);
    },

    setAttribute: function(element, name, value) {
      if (element.className === undefined) { // XML
        this.base(element, name, value);
      } else if (name == "style") {
        element.style.cssText = value;
      } else {
        value = String(value);
        var attribute = _getAttributeNode(element, name);
        if (attribute) {
          attribute.nodeValue = value;
        } else {
          this.base(element, _ATTRIBUTES[name.toLowerCase()] || name, value);
        }
      }
    }
  },

  "@!(element.hasAttribute)": {
    hasAttribute: function(element, name) {
      if (element.className === undefined) { // XML
        return this.base(element, name);
      }
      return this.getAttribute(element, name) != null;
    }
  }
});

// remove the base2ID for clones
if (detect("MSIE.+win")) extend(Element.prototype, "cloneNode", function(deep) {
  var clone = this.base(deep || false);
  clone.base2ID = undefined;
  return clone;
});

var _HTML_ATTRIBUTES = "colSpan,rowSpan,vAlign,dateTime,accessKey,tabIndex,encType,maxLength,readOnly,longDesc";
// Convert the list of strings to a hash, mapping the lowercase name to the camelCase name.
extend(_ATTRIBUTES, Array2.combine(_HTML_ATTRIBUTES.toLowerCase().split(","), _HTML_ATTRIBUTES.split(",")));

var _getAttributeNode = document.documentElement.getAttributeNode ? function(element, name) {
  return element.getAttributeNode(name);
} : function(element, name) {
  return element.attributes[name] || element.attributes[_ATTRIBUTES[name.toLowerCase()]];
};

// =========================================================================
// DOM/Traversal.js
// =========================================================================

// DOM Traversal. Just the basics.

var TEXT = detect("(element.textContent===undefined)") ? "innerText" : "textContent";

var Traversal = Module.extend({
  getDefaultView: function(node) {
    return this.getDocument(node).defaultView;
  },
  
  getNextElementSibling: function(node) {
    // return the next element to the supplied element
    //  nextSibling is not good enough as it might return a text or comment node
    while (node && (node = node.nextSibling) && !this.isElement(node)) continue;
    return node;
  },

  getNodeIndex: function(node) {
    var index = 0;
    while (node && (node = node.previousSibling)) index++;
    return index;
  },
  
  getOwnerDocument: function(node) {
    // return the node's containing document
    return node.ownerDocument;
  },
  
  getPreviousElementSibling: function(node) {
    // return the previous element to the supplied element
    while (node && (node = node.previousSibling) && !this.isElement(node)) continue;
    return node;
  },

  getTextContent: function(node, isHTML) {
    return node[isHTML ? "innerHTML" : TEXT];
  },

  isEmpty: function(node) {
    node = node.firstChild;
    while (node) {
      if (node.nodeType == 3 || this.isElement(node)) return false;
      node = node.nextSibling;
    }
    return true;
  },

  setTextContent: function(node, text, isHTML) {
    return node[isHTML ? "innerHTML" : TEXT] = text;
  },

  "@!MSIE": {
    setTextContent: function(node, text, isHTML) {
      // Destroy the DOM (slightly faster for non-MISE browsers)
      with (node) while (lastChild) parentNode.removeChild(lastChild);
      return this.base(node, text, isHTML);
    }
  },

  "@MSIE": {
    getDefaultView: function(node) {
      return (node.document || node).parentWindow;
    },
  
    "@MSIE5": {
      // return the node's containing document
      getOwnerDocument: function(node) {
        return node.ownerDocument || node.document;
      }
    }
  }
}, {
  contains: function(node, target) {
    node.nodeType; // throw an error if no node supplied
    while (target && (target = target.parentNode) && node != target) continue;
    return !!target;
  },
  
  getDocument: function(node) {
    // return the document object
    return this.isDocument(node) ? node : node.ownerDocument || node.document;
  },
  
  isDocument: function(node) {
    return !!(node && node.documentElement);
  },
  
  isElement: function(node) {
    return !!(node && node.nodeType == 1);
  },
  
  "@(element.contains)": {  
    contains: function(node, target) {
      return node != target && (this.isDocument(node) ? node == this.getOwnerDocument(target) : node.contains(target));
    }
  },
  
  "@MSIE5": {
    isElement: function(node) {
      return !!(node && node.nodeType == 1 && node.nodeName != "!");
    }
  }
});

// =========================================================================
// DOM/views/AbstractView.js
// =========================================================================

var AbstractView = Binding.extend();

// =========================================================================
// DOM/events/header.js
// =========================================================================

// TO DO

// textInput event

var _CAPTURE_TYPE = {},
    _TYPE_MAP     = {"2": 2, "4": 1};

var _CAPTURING_PHASE = 1,
    _AT_TARGET       = 2,
    _BUBBLING_PHASE  = 3;
    
var _MOUSE_BUTTON   = /^mouse(up|down)|click$/,
    _MOUSE_CLICK    = /click$/,
    _BUBBLES        = "abort|error|select|change|resize|scroll|", // + _CANCELABLE
    _CANCELABLE     = "(dbl)?click|mouse(down|up|over|move|out|wheel)|key(down|up)|submit|reset";

    _BUBBLES = new RegExp("^(" + _BUBBLES + _CANCELABLE + ")$");
    _CANCELABLE = new RegExp("^(" + _CANCELABLE + ")$");

if (_MSIE) {
  var _W3C_EVENT_TYPE = {focusin: "focus", focusout: "blur"};
      _CAPTURE_TYPE   = {focus: "focusin", blur: "focusout"};
}

var _CAN_DELEGATE = /^(blur|submit|reset|change|select)$|^(mouse|key|focus)|click$/;

// =========================================================================
// DOM/events/Event.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-Event

var Event = Binding.extend({
  "@!(document.createEvent)": {
    initEvent: function(event, type, bubbles, cancelable) {
      event.type = String(type);
      event.bubbles = !!bubbles;
      event.cancelable = !!cancelable;
    },

    preventDefault: function(event) {
      if (event.cancelable !== false) {
        event.returnValue = false;
      }
    },

    stopPropagation: function(event) {
      event.cancelBubble = true;
    },
    
    "@MSIE": {
      preventDefault: function(event) {
        this.base(event);
        if (event.type == "mousedown") {
          var type = "onbeforedeactivate";
          var document = Traversal.getDocument(event.target);
          document.attachEvent(type, function(event) {
            // Allow a mousedown event to cancel a focus event.
            event.returnValue = false;
            document.detachEvent(type, arguments.callee);
          });
        }
      }
    }
  }
}, {
  CAPTURING_PHASE: _CAPTURING_PHASE,
  AT_TARGET:       _AT_TARGET,
  BUBBLING_PHASE:  _BUBBLING_PHASE,
    
  "@!(document.createEvent)": {
    "@MSIE": {
      bind: function(event) {
        var type = event.type;
        if (!event.timeStamp) {
          event.bubbles = _BUBBLES.test(type);
          event.cancelable = _CANCELABLE.test(type);
          event.timeStamp = new Date().valueOf();
        }
        event.relatedTarget = event[(event.target == event.fromElement ? "to" : "from") + "Element"];
        return this.base(event);
      }
    }
  },

  cloneEvent: function(event) {
    var clone = copy(event);
    clone.stopPropagation = function() {
      event.stopPropagation();
    };
    clone.preventDefault = function() {
      event.preventDefault();
    };
    return clone;
  },

  "@MSIE" : {
    cloneEvent: copy
  }
});

// =========================================================================
// DOM/events/EventDispatcher.js
// =========================================================================

var EventDispatcher = Base.extend({
  constructor: function(state) {
    this.state = state;
    this.events = state.events;
  },

  dispatch: function(nodes, event, phase) {
    event.eventPhase = phase;
    var map = this.events[event.type][phase];
    if (map) {
      var i = nodes.length;
      while (i-- && !event.cancelBubble) {
        var currentTarget = nodes[i];
        var listeners = map[currentTarget.base2ID];
        if (listeners) {
          listeners = copy(listeners);
          event.currentTarget = currentTarget;
          event.eventPhase = currentTarget == event.target ? _AT_TARGET : phase;
          for (var listenerID in listeners) {
            var listener = listeners[listenerID];
            if (typeof listener == "function") {
              listener.call(currentTarget, event);
            } else {
              listener.handleEvent(event);
            }
          }
        }
      }
    }
  },

  handleEvent: function(event, fixed) {
    Event.bind(event);
    var type = event.type;
    var w3cType = _W3C_EVENT_TYPE[type];
    if (w3cType) {
      event = copy(event);
      type = event.type = w3cType;
    }
    if (this.events[type]) {
      // Fix the mouse button (left=0, middle=1, right=2)
      if (_MOUSE_BUTTON.test(type)) {
        var button = _MOUSE_CLICK.test(type) ? this.state._button : event.button;
        button = _TYPE_MAP[button] || 0;
        if (event.button != button) {
          event = copy(event);
          event.button = button;
        }
      }
      // Collect nodes in the event hierarchy
      var currentTarget = event.target;
      var nodes = [], i = 0;
      while (currentTarget) {
        nodes[i++] = currentTarget;
        currentTarget = currentTarget.parentNode;
      }
      this.dispatch(nodes, event, _CAPTURING_PHASE);
      if (!event.cancelBubble) {
        if (!event.bubbles) nodes.length = 1;
        nodes.reverse();
        this.dispatch(nodes, event, _BUBBLING_PHASE);
      }
    }
    return event.returnValue !== false;
  },

  "@MSIE.+win": {
    handleEvent: function(event) {
      if (event.type == "scroll") {
        // horrible IE bug (setting style during scroll event causes crash)
        // the scroll event can't be cancelled so it's not a problem to use a timer
        setTimeout(bind(this.base, this, copy(event), true), 0);
        return true;
      } else {
        return this.base(event);
      }
    },
    
    "@MSIE5": {
      dispatch: function(nodes, event, phase) {
        // IE5.x documentElement does not have a parentNode so document is missing
        // from the nodes collection
        if (phase == _CAPTURING_PHASE && !Array2.item(nodes, -1).documentElement) {
          nodes.push(nodes[0].document);
        }
        this.base(nodes, event, phase);
      }
    }
  }
});

// =========================================================================
// DOM/events/EventTarget.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-Registration-interfaces

var _wrappedListeners = {};

var EventTarget = Interface.extend({
  "@!(element.addEventListener)": {
    addEventListener: function(target, type, listener, useCapture) {
      var documentState = DocumentState.getInstance(target);

      // assign a unique id to both objects
      var targetID = assignID(target);
      var listenerID = assignID(listener);

      // create a hash table of event types for the target object
      var phase = useCapture ? _CAPTURING_PHASE : _BUBBLING_PHASE;
      var typeMap = documentState.registerEvent(type, target);
      var phaseMap = typeMap[phase];
      if (!phaseMap) phaseMap = typeMap[phase] = {};
      // focus/blur (MSIE)
      if (useCapture) type = _CAPTURE_TYPE[type] || type;
      // create a hash table of event listeners for each object/event pair
      var listeners = phaseMap[targetID];
      if (!listeners) listeners = phaseMap[targetID] = {};
      // store the event listener in the hash table
      listeners[listenerID] = listener;
    },

    dispatchEvent: function(target, event) {
      event.target = target;
      return DocumentState.getInstance(target).handleEvent(event);
    },

    removeEventListener: function(target, type, listener, useCapture) {
      var events = DocumentState.getInstance(target).events;
      // delete the event listener from the hash table
      var typeMap = events[type];
      if (typeMap) {
        var phaseMap = typeMap[useCapture ? _CAPTURING_PHASE : _BUBBLING_PHASE];
        if (phaseMap) {
          var listeners = phaseMap[target.base2ID];
          if (listeners) delete listeners[listener.base2ID];
        }
      }
    }
  },

  "@(element.addEventListener)": {
    "@Gecko": {
      addEventListener: function(target, type, listener, useCapture) {
        if (type == "mousewheel") {
          type = "DOMMouseScroll";
          var originalListener = listener;
          listener = _wrappedListeners[assignID(listener)] = function(event) {
            event = Event.cloneEvent(event);
            event.type = "mousewheel";
            event.wheelDelta = (-event.detail * 40) || 0;
            _handleEvent(target, originalListener, event);
          };
        }
        this.base(target, type, listener, useCapture);
      }
    },

    // http://unixpapa.com/js/mouse.html
    "@webkit[1-4]|KHTML[34]": {
      addEventListener: function(target, type, listener, useCapture) {
        if (_MOUSE_BUTTON.test(type)) {
          var originalListener = listener;
          listener = _wrappedListeners[assignID(listener)] = function(event) {
            var button = _TYPE_MAP[event.button] || 0;
            if (event.button != button) {
              event = Event.cloneEvent(event);
              event.button = button;
            }
            _handleEvent(target, originalListener, event);
          };
        } else if (typeof listener == "object") {
          listener = _wrappedListeners[assignID(listener)] = bind("handleEvent", listener);
        }
        this.base(target, type, listener, useCapture);
      }
    },

    // http://unixpapa.com/js/key.html
    "@Linux|Mac|opera": {
      addEventListener: function(target, type, listener, useCapture) {
        // Some browsers do not fire repeated "keydown" events when a key
        // is held down. They do fire repeated "keypress" events though.
        // Cancelling the "keydown" event does not cancel the repeated
        // "keypress" events. We fix all of this here...
        if (type == "keydown") {
          var originalListener = listener;
          listener = _wrappedListeners[assignID(listener)] = function(keydownEvent) {
            var firedCount = 0, cancelled = false;
            extend(keydownEvent, "preventDefault", function() {
              this.base();
              cancelled = true;
            });
            function handleEvent(event) {
              if (cancelled) event.preventDefault();
              if (event == keydownEvent || firedCount > 1) {
                _handleEvent(target, originalListener, keydownEvent);
              }
              firedCount++;
            };
            handleEvent(keydownEvent);
            target.addEventListener("keyup", function() {
              target.removeEventListener("keypress", handleEvent, true);
              target.removeEventListener("keyup", arguments.callee, true);
            }, true);
            target.addEventListener("keypress", handleEvent, true);
          };
        }
        this.base(target, type, listener, useCapture);
      }
    },

    removeEventListener: function(target, type, listener, useCapture) {
      this.base(target, type, _wrappedListeners[listener.base2ID] || listener, useCapture);
    }
  }
});

if (detect("Gecko")) {
  EventTarget.removeEventListener._delegate = "removeEventListener";
  delete EventTarget.prototype.removeEventListener;
}

function _handleEvent(target, listener, event) {
  if (typeof listener == "function") {
    listener.call(target, event);
  } else {
    listener.handleEvent(event);
  }
};

// =========================================================================
// DOM/events/DocumentEvent.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-DocumentEvent

var DocumentEvent = Interface.extend({  
  "@!(document.createEvent)": {
    createEvent: function(document, type) {
      var event = document.createEventObject ? document.createEventObject() : {};
      event.bubbles = false;
      event.cancelable = false;
      event.eventPhase = 0;
      event.target = document;
      event.currentTarget = null;
      event.relatedTarget = null;
      event.timeStamp = new Date().valueOf();
      return Event(event);
    }
  },
  
  "@(document.createEvent)": {
    "@!(document.createEvent('Events'))": { // before Safari 3
      createEvent: function(document, type) {
        return this.base(document, type == "Events" ? "UIEvents" : type);
      }
    }
  }
});

// =========================================================================
// DOM/events/DOMContentLoadedEvent.js
// =========================================================================

// http://dean.edwards.name/weblog/2006/06/again

var DOMContentLoadedEvent = Base.extend({
  constructor: function(document) {
    var fired = false;
    this.fire = function() {
      if (!fired) {
        fired = true;
        // this function will be called from another event handler so we'll user a timer
        //  to drop out of any current event
        setTimeout(function() {
          var event = DocumentEvent.createEvent(document, "Events");
          Event.initEvent(event, "DOMContentLoaded", true, false);
          EventTarget.dispatchEvent(document, event);
        }, 1);
      }
    };
    // use the real event for browsers that support it (opera & firefox)
    EventTarget.addEventListener(document, "DOMContentLoaded", function() {
      fired = true;
    }, false);
    this.listen(document);
  },

  listen: Undefined,

  "@!Gecko20([^0]|0[3-9])|Webkit[5-9]|Opera[19]|MSIE.+mac": {
    listen: function(document) {
      // if all else fails fall back on window.onload
      EventTarget.addEventListener(Traversal.getDefaultView(document), "load", this.fire, false);
    },

    "@MSIE.+win": {
      listen: function(document) {
        // http://javascript.nwbox.com/IEContentLoaded/
        try {
          document.body.doScroll("left");
          if (!this.__constructing) this.fire();
        } catch (e) {
          setTimeout(bind(this.listen, this, document), 10);
        }
      }
    },

    "@KHTML": {
      listen: function(document) {
        // John Resig
        if (/loaded|complete/.test(document.readyState)) { // loaded
          if (!this.__constructing) this.fire();
        } else {
          setTimeout(bind(this.listen, this, document), 10);
        }
      }
    }
  }
});

// =========================================================================
// DOM/events/implementations.js
// =========================================================================

Document.implement(DocumentEvent);
Document.implement(EventTarget);

Element.implement(EventTarget);

// =========================================================================
// DOM/style/ViewCSS.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-ViewCSS

var _PIXEL     = /^\d+(px)?$/i,
    _METRICS   = /(width|height|top|bottom|left|right|fontSize)$/,
    _COLOR     = /^(color|backgroundColor)$/,
    _RGB_BLACK = "rgb(0, 0, 0)",
    _BLACK     = {black:1, "#000":1, "#000000":1};

var ViewCSS = Interface.extend({
  "@!(document.defaultView.getComputedStyle)": {
    "@MSIE": {
      getComputedStyle: function(view, element, pseudoElement) {
        // pseudoElement parameter is not supported
        var currentStyle = element.currentStyle;
        var computedStyle = {};
        for (var propertyName in currentStyle) {
          if (_METRICS.test(propertyName) || _COLOR.test(propertyName)) {
            computedStyle[propertyName] = this.getComputedPropertyValue(view, element, propertyName);
          } else if (propertyName.indexOf("ruby") != 0) {
            computedStyle[propertyName] = currentStyle[propertyName];
          }
        }
        return computedStyle;
      }
    }
  },
  
  getComputedStyle: function(view, element, pseudoElement) {
    return _CSSStyleDeclaration_ReadOnly.bind(this.base(view, element, pseudoElement));
  }
}, {
  getComputedPropertyValue: function(view, element, propertyName) {
    return CSSStyleDeclaration.getPropertyValue(this.getComputedStyle(view, element, null), propertyName);
  },
  
  "@MSIE": {
    getComputedPropertyValue: function(view, element, propertyName) {
      propertyName = this.toCamelCase(propertyName);
      var value = element.currentStyle[propertyName];
      if (_METRICS.test(propertyName))
        return _MSIE_getPixelValue(element, value) + "px";
      if (!_MSIE5 && _COLOR.test(propertyName)) {
        var rgb = _MSIE_getColorValue(element, propertyName == "color" ? "ForeColor" : "BackColor");
        return (rgb == _RGB_BLACK && !_BLACK[value]) ? value : rgb;
      }
      return value;
    }
  },
  
  toCamelCase: function(string) {
    return string.replace(/\-([a-z])/g, flip(String2.toUpperCase));
  }
});

function _MSIE_getPixelValue(element, value) {
  if (_PIXEL.test(value)) return parseInt(value);
  var styleLeft = element.style.left;
  var runtimeStyleLeft = element.runtimeStyle.left;
  element.runtimeStyle.left = element.currentStyle.left;
  element.style.left = value || 0;
  value = element.style.pixelLeft;
  element.style.left = styleLeft;
  element.runtimeStyle.left = runtimeStyleLeft;
  return value;
};

function _MSIE_getColorValue(element, type) {
  // elements need to have "layout" for this to work.
  if (element.createTextRange) {
    var range = element.createTextRange();
  } else {
    range = element.document.body.createTextRange();
    range.moveToElementText(element);
  }
  var color = range.queryCommandValue(type);
  return format("rgb(%1, %2, %3)", color & 0xff, (color & 0xff00) >> 8,  (color & 0xff0000) >> 16);
};

// =========================================================================
// DOM/style/CSSStyleDeclaration.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration

var _CSSStyleDeclaration_ReadOnly = Binding.extend({
  getPropertyValue: function(style, propertyName) {
    return this.base(style, _CSSPropertyNameMap[propertyName] || propertyName);
  },
  
  "@MSIE.+win": {
    getPropertyValue: function(style, propertyName) {
      return propertyName == "float" ? style.styleFloat : style[ViewCSS.toCamelCase(propertyName)];
    }
  }
});

var CSSStyleDeclaration = _CSSStyleDeclaration_ReadOnly.extend({
  setProperty: function(style, propertyName, value, priority) {
    return this.base(style, _CSSPropertyNameMap[propertyName] || propertyName, value, priority);
  },
  
  "@MSIE.+win": {
    setProperty: function(style, propertyName, value, priority) {
      if (propertyName == "opacity") {
        value *= 100;
        style.opacity = value;
        style.zoom = 1;
        style.filter = "Alpha(opacity=" + value + ")";
      } else {
        if (priority == "important") {
          style.cssText += format(";%1:%2!important;", propertyName, value);
        } else {
          style.setAttribute(ViewCSS.toCamelCase(propertyName), value);
        }
      }
    }
  }
}, {
  "@MSIE": {
    bind: function(style) {
      style.getPropertyValue = this.prototype.getPropertyValue;
      style.setProperty = this.prototype.setProperty;
      return style;
    }
  }
});

var _CSSPropertyNameMap = new Base({
  "@Gecko": {
    opacity: "-moz-opacity"
  },

  "@KHTML": {
    opacity: "-khtml-opacity"
  }
});

with (CSSStyleDeclaration.prototype) getPropertyValue.toString = setProperty.toString = K("[base2]");

// =========================================================================
// DOM/style/implementations.js
// =========================================================================

AbstractView.implement(ViewCSS);

// =========================================================================
// DOM/selectors-api/NodeSelector.js
// =========================================================================

// http://www.w3.org/TR/selectors-api/

var NodeSelector = Interface.extend({
  "@(element.querySelector)": {
    querySelector: function(node, selector) {
      try {
        var element = this.base(node, trim(selector));
        if (element) return element;
      } catch(x) {}
      // assume it's an unsupported selector
      return new Selector(selector).exec(node, 1);
    },
    
    querySelectorAll: function(node, selector) {
      try {
        var nodeList = this.base(node, trim(selector));
        if (nodeList) return new StaticNodeList(nodeList);
      } catch(x) {}
      // assume it's an unsupported selector
      return new Selector(selector).exec(node);
    }
  },

  "@!(element.querySelector)": {
    querySelector: function(node, selector) {
      return new Selector(selector).exec(node, 1);
    },

    querySelectorAll: function(node, selector) {
      return new Selector(selector).exec(node);
    }
  }
});

// automatically bind objects retrieved using the Selectors API on a bound node

extend(NodeSelector.prototype, {
  querySelector: function(selector) {
    return DOM.bind(this.base(selector));
  },

  querySelectorAll: function(selector) {
    return extend(this.base(selector), "item", function(index) {
      return DOM.bind(this.base(index));
    });
  }
});

// =========================================================================
// DOM/selectors-api/DocumentSelector.js
// =========================================================================

// http://www.w3.org/TR/selectors-api/#documentselector

var DocumentSelector = NodeSelector.extend();

// =========================================================================
// DOM/selectors-api/ElementSelector.js
// =========================================================================

var ElementSelector = NodeSelector.extend({
  "@!(element.matchesSelector)": { // future-proof
    matchesSelector: function(element, selector) {
      return new Selector(selector).test(element);
    }
  }
});

// =========================================================================
// DOM/selectors-api/CSSParser.js
// =========================================================================

var _CSS_ESCAPE =           /'(\\.|[^'\\])*'|"(\\.|[^"\\])*"/g,
    _CSS_IMPLIED_ASTERISK = /([\s>+~,]|[^(]\+|^)([#.:\[])/g,
    _CSS_IMPLIED_SPACE =    /(^|,)([^\s>+~])/g,
    _CSS_WHITESPACE =       /\s*([\s>+~,]|^|$)\s*/g,
    _CSS_WILD_CARD =        /\s\*\s/g,
    _CSS_UNESCAPE =         /\x01(\d+)/g,
    _QUOTE =                /'/g;
  
var CSSParser = RegGrp.extend({
  constructor: function(items) {
    this.base(items);
    this.cache = {};
    this.sorter = new RegGrp;
    this.sorter.add(/:not\([^)]*\)/, RegGrp.IGNORE);
    this.sorter.add(/([ >](\*|[\w-]+))([^: >+~]*)(:\w+-child(\([^)]+\))?)([^: >+~]*)/, "$1$3$6$4");
  },
  
  cache: null,
  ignoreCase: true,

  escape: function(selector, simple) {
    // remove strings
    var strings = this._strings = [];
    selector = this.optimise(this.format(String(selector).replace(_CSS_ESCAPE, function(string) {
      return "\x01" + strings.push(string.slice(1, -1).replace(_QUOTE, "\\'"));
    })));
    if (simple) selector = selector.replace(/(^|,) \*?/g, "$1");
    return selector;
  },
  
  format: function(selector) {
    return selector
      .replace(_CSS_WHITESPACE, "$1")
      .replace(_CSS_IMPLIED_SPACE, "$1 $2")
      .replace(_CSS_IMPLIED_ASTERISK, "$1*$2");
  },
  
  optimise: function(selector) {
    // optimise wild card descendant selectors
    return this.sorter.exec(selector.replace(_CSS_WILD_CARD, ">* "));
  },
  
  parse: function(selector, simple) {
    return this.cache[selector] ||
      (this.cache[selector] = this.unescape(this.exec(this.escape(selector, simple))));
  },
  
  unescape: function(selector) {
    // put string values back
    var strings = this._strings;
    return selector.replace(_CSS_UNESCAPE, function(match, index) {
      return strings[index - 1];
    });
  }
});

function _nthChild(match, args, position, last, not, and, mod, equals) {
  // ugly but it works for both CSS and XPath
  last = /last/i.test(match) ? last + "+1-" : "";
  if (!isNaN(args)) args = "0n+" + args;
  else if (args == "even") args = "2n";
  else if (args == "odd") args = "2n+1";
  args = args.split("n");
  var a = args[0] ? (args[0] == "-") ? -1 : parseInt(args[0]) : 1;
  var b = parseInt(args[1]) || 0;
  var negate = a < 0;
  if (negate) {
    a = -a;
    if (a == 1) b++;
  }
  var query = format(a == 0 ? "%3%7" + (last + b) : "(%4%3-%2)%6%1%70%5%4%3>=%2", a, b, position, last, and, mod, equals);
  if (negate) query = not + "(" + query + ")";
  return query;
};

// =========================================================================
// DOM/selectors-api/XPathParser.js
// =========================================================================

// XPath parser
// converts CSS expressions to *optimised* XPath queries

// This code used to be quite readable until I added code to optimise *-child selectors. 

var XPathParser = CSSParser.extend({
  constructor: function() {
    this.base(XPathParser.build());
    // The sorter sorts child selectors to the end because they are slow.
    // For XPath we need the child selectors to be sorted to the beginning,
    // so we reverse the sort order. That's what this line does:
    this.sorter.putAt(1, "$1$4$3$6");
  },
  
  escape: function(selector, simple) {
    return this.base(selector, simple).replace(/,/g, "\x02");
  },
  
  unescape: function(selector) {
    return this.base(selector
      .replace(/\[self::\*\]/g, "")   // remove redundant wild cards
      .replace(/(^|\x02)\//g, "$1./") // context
      .replace(/\x02/g, " | ")        // put commas back      
    ).replace(/'[^'\\]*\\'(\\.|[^'\\])*'/g, function(match) { // escape single quotes
      return "concat(" + match.split("\\'").join("',\"'\",'") + ")";
    });
  },

  "@opera(7|8|9\\.[1-4])": {
    unescape: function(selector) {
      // opera pre 9.5 does not seem to support last() but I can't find any
      //  documentation to confirm this
      return this.base(selector.replace(/last\(\)/g, "count(preceding-sibling::*)+count(following-sibling::*)+1"));
    }
  }
}, {
  build: function() {
    // build the rules collection
    this.values.attributes[""] = "[@$1]";
    forEach (this.types, function(add, type) {
      forEach (this.values[type], add, this.rules);
    }, this);
    this.build = K(this.rules);
    return this.rules;
  },
  
  optimised: {
    pseudoClasses: {
      "first-child": "[1]",
      "last-child":  "[last()]",
      "only-child":  "[last()=1]"
    }
  },
  
  rules: extend({}, {
    "@!KHTML|opera": { // this optimisation does not work on Safari/opera
      // fast id() search
      "(^|\\x02) (\\*|[\\w-]+)#([\\w-]+)": "$1id('$3')[self::$2]"
    },
    
    "@!KHTML": { // this optimisation does not work on Safari
      // optimise positional searches
      "([ >])(\\*|[\\w-]+):([\\w-]+-child(\\(([^)]+)\\))?)": function(match, token, tagName, pseudoClass, $4, args) {
        var replacement = (token == " ") ? "//*" : "/*";
        if (/^nth/i.test(pseudoClass)) {
          replacement += _xpath_nthChild(pseudoClass, args, "position()");
        } else {
          replacement += XPathParser.optimised.pseudoClasses[pseudoClass];
        }
        return replacement + "[self::" + tagName + "]";
      }
    }
  }),
  
  types: {
    identifiers: function(replacement, token) {
      this[rescape(token) + "([\\w-]+)"] = replacement;
    },
    
    combinators: function(replacement, combinator) {
      this[rescape(combinator) + "(\\*|[\\w-]+)"] = replacement;
    },
    
    attributes: function(replacement, operator) {
      this["\\[\\s*([\\w-]+)\\s*" + rescape(operator) +  "\\s*([^\\]\\s]*)\\s*\\]"] = replacement;
    },
    
    pseudoClasses: function(replacement, pseudoClass) {
      this[":" + pseudoClass.replace(/\(\)$/, "\\(([^)]+)\\)")] = replacement;
    }
  },
  
  values: {
    identifiers: {
      "#": "[@id='$1'][1]", // ID selector
      ".": "[contains(concat(' ',@class,' '),' $1 ')]" // class selector
    },
    
    combinators: {
      " ": "/descendant::$1", // descendant selector
      ">": "/child::$1", // child selector
      "+": "/following-sibling::*[1][self::$1]", // direct adjacent selector
      "~": "/following-sibling::$1" // indirect adjacent selector
    },
    
    attributes: { // attribute selectors
      "*=": "[contains(@$1,'$2')]",
      "^=": "[starts-with(@$1,'$2')]",
      "$=": "[substring(@$1,string-length(@$1)-string-length('$2')+1)='$2']",
      "~=": "[contains(concat(' ',@$1,' '),' $2 ')]",
      "|=": "[contains(concat('-',@$1,'-'),'-$2-')]",
      "!=": "[not(@$1='$2')]",
      "=":  "[@$1='$2']"
    },
    
    pseudoClasses: { // pseudo class selectors
      "link":             "[false]",
      "visited":          "[false]",
      "empty":            "[not(child::*) and not(text())]",
//-   "lang()":           "[boolean(lang('$1') or boolean(ancestor-or-self::*[@lang][1][starts-with(@lang,'$1')]))]",
      "first-child":      "[not(preceding-sibling::*)]",
      "last-child":       "[not(following-sibling::*)]",
      "not()":            _xpath_not,
      "nth-child()":      _xpath_nthChild,
      "nth-last-child()": _xpath_nthChild,
      "only-child":       "[not(preceding-sibling::*) and not(following-sibling::*)]",
      "root":             "[not(parent::*)]"
    }
  },
  
  "@opera(7|8|9\\.[1-4])": {
    build: function() {
      this.optimised.pseudoClasses["last-child"] = this.values.pseudoClasses["last-child"];
      this.optimised.pseudoClasses["only-child"] = this.values.pseudoClasses["only-child"];
      return this.base();
    }
  }
});

// these functions defined here to make the code more readable
var _notParser;
function _xpath_not(match, args) {
  if (!_notParser) _notParser = new XPathParser;
  return "[not(" + _notParser.exec(trim(args))
    .replace(/\[1\]/g, "") // remove the "[1]" introduced by ID selectors
    .replace(/^(\*|[\w-]+)/, "[self::$1]") // tagName test
    .replace(/\]\[/g, " and ") // merge predicates
    .slice(1, -1)
  + ")]";
};

function _xpath_nthChild(match, args, position) {
  return "[" + _nthChild(match, args, position || "count(preceding-sibling::*)+1", "last()", "not", " and ", " mod ", "=") + "]";
};

// =========================================================================
// DOM/selectors-api/Selector.js
// =========================================================================

// This object can be instantiated, however it is probably better to use
// the querySelector/querySelectorAll methods on DOM nodes.

// There is no public standard for this object.

var Selector = Base.extend({
  constructor: function(selector) {
    this.toString = K(trim(selector));
  },

  exec: function(context, count, simple) {
    return Selector.parse(this, simple)(context, count);
  },

  isSimple: function() {
    if (!_parser.exec) _parser = new CSSParser(_parser);
    return !_COMBINATOR.test(trim(_parser.escape(this)));
  },

  test: function(element) {
    if (this.isSimple()) {
      return !!Selector.parse(this, true)(element, 1);
    } else {
      element.setAttribute("b2-test", true);
      var result = new Selector(this + "[b2-test]").exec(Traversal.getOwnerDocument(element), 1);
      element.removeAttribute("b2-test");
      return result == element;
    }
  },

  toXPath: function(simple) {
    return Selector.toXPath(this, simple);
  },

  "@(XPathResult)": {
    exec: function(context, count, simple) {
      // use DOM methods if the XPath engine can't be used
      if (_NOT_XPATH.test(this)) {
        return this.base(context, count, simple);
      }
      var document = Traversal.getDocument(context);
      var type = count == 1
        ? 9 /* FIRST_ORDERED_NODE_TYPE */
        : 7 /* ORDERED_NODE_SNAPSHOT_TYPE */;
      var result = document.evaluate(this.toXPath(simple), context, null, type, null);
      return count == 1 ? result.singleNodeValue : result;
    }
  },

  "@MSIE": {
    exec: function(context, count, simple) {
      if (typeof context.selectNodes != "undefined" && !_NOT_XPATH.test(this)) { // xml
        var method = single ? "selectSingleNode" : "selectNodes";
        return context[method](this.toXPath(simple));
      }
      return this.base(context, count, simple);
    }
  },

  "@(true)": {
    exec: function(context, count, simple) {
      try {
        var result = this.base(context || document, count, simple);
      } catch (error) { // probably an invalid selector =)
        throw new SyntaxError(format("'%1' is not a valid CSS selector.", this));
      }
      return count == 1 ? result : new StaticNodeList(result);
    }
  }
}, {
  toXPath: function(selector, simple) {
    if (!_xpathParser) _xpathParser = new XPathParser;
    return _xpathParser.parse(selector, simple);
  }
});

var _COMBINATOR = /[^,]\s|[+>~]/;

var _NOT_XPATH = ":(checked|disabled|enabled|contains|hover|active|focus)|^(#[\\w-]+\\s*)?\\w+$";
if (detect("KHTML")) {
  if (detect("WebKit5")) {
    _NOT_XPATH += "|nth\\-|,";
  } else {
    _NOT_XPATH = ".";
  }
}
_NOT_XPATH = new RegExp(_NOT_XPATH);

// Selector.parse() - converts CSS selectors to DOM queries.

// Hideous code but it produces fast DOM queries.
// Respect due to Alex Russell and Jack Slocum for inspiration.

Selector.operators = {
  "=":  "%1=='%2'",
//"!=": "%1!='%2'", //  not standard but other libraries support it
  "~=": /(^| )%1( |$)/,
  "|=": /^%1(-|$)/,
  "^=": /^%1/,
  "$=": /%1$/,
  "*=": /%1/
};
Selector.operators[""] = "%1!=null";

Selector.pseudoClasses = { //-dean: lang()
  "checked":     "e%1.checked",
  "contains":    "e%1[TEXT].indexOf('%2')!=-1",
  "disabled":    "e%1.disabled",
  "empty":       "Traversal.isEmpty(e%1)",
  "enabled":     "e%1.disabled===false",
  "first-child": "!Traversal.getPreviousElementSibling(e%1)",
  "last-child":  "!Traversal.getNextElementSibling(e%1)",
  "only-child":  "!Traversal.getPreviousElementSibling(e%1)&&!Traversal.getNextElementSibling(e%1)",
  "root":        "e%1==Traversal.getDocument(e%1).documentElement",
  "target":      "e%1.id&&e%1.id==location.hash.slice(1)",
  "hover":       "DocumentState.getInstance(d).isHover(e%1)",
  "active":      "DocumentState.getInstance(d).isActive(e%1)",
  "focus":       "DocumentState.getInstance(d).hasFocus(e%1)",
  "link":        "false", // not implemented (security)
  "visited":     "false"
// nth-child     // defined below
// not
};

var _INDEXED = document.documentElement.sourceIndex !== undefined,
    _VAR = "var p%2=0,i%2,e%3,n%2=e%1.",
    _ID = _INDEXED ? "e%1.sourceIndex" : "assignID(e%1)",
    _TEST = "var g=" + _ID + ";if(!p[g]){p[g]=1;",
    _STORE = "r[k++]=e%1;if(s==1)return e%1;if(k===s){_query.state=[%2];_query.complete=%3;return r;",
    _FN = "var _query=function(e0,s%1){_indexed++;var r=[],p={},p0=0,reg=[%4],d=Traversal.getDocument(e0),c=d.writeln?'toUpperCase':'toString',k=0;";

var _xpathParser;

// variables used by the parser

var _reg,        // a store for RexExp objects
    _index,
    _wild,       // need to flag certain wild card selectors as MSIE includes comment nodes
    _list,       // are we processing a node list?
    _group,
    _listAll,
    _duplicate,  // possible duplicates?
    _cache = {}, // store parsed selectors
    _simple = {};

function sum(list) {
  var total = 0;
  for (var i = 0; i < list.length; i++) {
    total += list[i];
  }
  return total;
};

// a hideous parser
var _parser = {
  "^(\\*|[\\w-]+)": function(match, tagName) {
    return tagName == "*" ? "" : format("if(e0.nodeName=='%1'[c]()){", tagName);
  },

  "^ \\*:root": function(match) { // :root pseudo class
    _wild = false;
    var replacement = "e%2=d.documentElement;if(Traversal.contains(e%1,e%2)){";
    return format(replacement, _index++, _index);
  },

  " (\\*|[\\w-]+)#([\\w-]+)": function(match, tagName, id) { // descendant selector followed by ID
    _wild = false;
    var replacement = "var e%2=_byId(d,'%4');if(e%2&&";
    if (tagName != "*") replacement += "e%2.nodeName=='%3'[c]()&&";
    replacement += "Traversal.contains(e%1,e%2)){";
    if (_list[_group]) replacement += format("i%1=n%1.length;", sum(_list));
    return format(replacement, _index++, _index, tagName, id);
  },

  " (\\*|[\\w-]+)": function(match, tagName) { // descendant selector
    _duplicate++; // this selector may produce duplicates
    _wild = tagName == "*";
    var replacement = format(_VAR, _index++, "%2", _index);
    // IE5.x does not support getElementsByTagName("*");
    replacement += (_wild && _MSIE5) ? "all" : "getElementsByTagName('%3')";
    replacement += ";for(i%2=a%2||0;(e%1=n%2[i%2]);i%2++){";
    _list[_group]++;
    return format(replacement, _index, sum(_list), tagName);
  },

  ">(\\*|[\\w-]+)": function(match, tagName) { // child selector
    var children = _MSIE && _index;
    _wild = tagName == "*";
    var replacement = _VAR + (children ? "children" : "childNodes");
    replacement = format(replacement, _index++, "%2", _index);
    if (!_wild && _MSIE && children) replacement += ".tags('%3')";
    replacement += ";for(i%2=a%2||0;(e%1=n%2[i%2]);i%2++){";
    if (_wild) {
      replacement += "if(e%1.nodeType==1){";
      _wild = _MSIE5;
    } else {
      if (!_MSIE || !children) replacement += "if(e%1.nodeName=='%3'[c]()){";
    }
    _list[_group]++;
    return format(replacement, _index, sum(_list), tagName);
  },

  "\\+(\\*|[\\w-]+)": function(match, tagName) { // direct adjacent selector
    var replacement = "";
    if (_wild && _MSIE) replacement += "if(e%1.nodeName!='!'){";
    _wild = false;
    replacement += "e%1=Traversal.getNextElementSibling(e%1);if(e%1";
    if (tagName != "*") replacement += "&&e%1.nodeName=='%2'[c]()";
    replacement += "){";
    return format(replacement, _index, tagName);
  },

  "~(\\*|[\\w-]+)": function(match, tagName) { // indirect adjacent selector
    var replacement = "";
    if (_wild && _MSIE) replacement += "if(e%1.nodeName!='!'){";
    _wild = false;
    _duplicate = 2; // this selector may produce duplicates
    replacement += "while(e%1=e%1.nextSibling){if(e%1.b2_adjacent==_indexed)break;if(";
    if (tagName == "*") {
      replacement += "e%1.nodeType==1";
      if (_MSIE5) replacement += "&&e%1.nodeName!='!'";
    } else replacement += "e%1.nodeName=='%2'[c]()";
    replacement += "){e%1.b2_adjacent=_indexed;";
    return format(replacement, _index, tagName);
  },

  "#([\\w-]+)": function(match, id) { // ID selector
    _wild = false;
    var replacement = "if(e%1.id=='%2'){";
    if (_list[_group]) replacement += format("i%1=n%1.length;", sum(_list));
    return format(replacement, _index, id);
  },

  "\\.([\\w-]+)": function(match, className) { // class selector
    _wild = false;
    // store RegExp objects - slightly faster on IE
    _reg.push(new RegExp("(^|\\s)" + rescape(className) + "(\\s|$)"));
    return format("if(e%1.className&&reg[%2].test(e%1.className)){", _index, _reg.length - 1);
  },

  ":not\\((\\*|[\\w-]+)?([^)]*)\\)": function(match, tagName, filters) { // :not pseudo class
    var replacement = (tagName && tagName != "*") ? format("if(e%1.nodeName=='%2'[c]()){", _index, tagName) : "";
    replacement += _parser.exec(filters);
    return "if(!" + replacement.slice(2, -1).replace(/\)\{if\(/g, "&&") + "){";
  },

  ":nth(-last)?-child\\(([^)]+)\\)": function(match, last, args) { // :nth-child pseudo classes
    _wild = false;
    last = format("e%1.parentNode.b2_length", _index);
    var replacement = "if(p%1!==e%1.parentNode)p%1=_register(e%1.parentNode);";
    replacement += "var i=e%1[p%1.b2_lookup];if(p%1.b2_lookup!='b2_index')i++;if(";
    return format(replacement, _index) + _nthChild(match, args, "i", last, "!", "&&", "% ", "==") + "){";
  },

  ":([\\w-]+)(\\(([^)]+)\\))?": function(match, pseudoClass, $2, args) { // other pseudo class selectors
    return "if(" + format(Selector.pseudoClasses[pseudoClass] || "throw", _index, args || "") + "){";
  },

  "\\[\\s*([\\w-]+)\\s*([^=]?=)?\\s*([^\\]\\s]*)\\s*\\]": function(match, attr, operator, value) { // attribute selectors
    value = trim(value);
    if (_MSIE) {
      var getAttribute = "Element.getAttribute(e%1,'%2')";
    } else {
      getAttribute = "e%1.getAttribute('%2')";
    }
    getAttribute = format(getAttribute, _index, attr);
    var replacement = Selector.operators[operator || ""];
    if (instanceOf(replacement, RegExp)) {
      _reg.push(new RegExp(format(replacement.source, rescape(_parser.unescape(value)))));
      replacement = "reg[%2].test(%1)";
      value = _reg.length - 1;
    }
    return "if(" + format(replacement, getAttribute, value) + "){";
  }
};

(function(_no_shrink_) {
  // IE confuses the name attribute with id for form elements,
  // use document.all to retrieve elements with name/id instead
  var _byId = detect("MSIE[5-7]") ? function(document, id) {
    var result = document.all[id] || null;
    // returns a single element or a collection
    if (!result || result.id == id) return result;
    // document.all has returned a collection of elements with name/id
    for (var i = 0; i < result.length; i++) {
      if (result[i].id == id) return result[i];
    }
    return null;
  } : function(document, id) {
    return document.getElementById(id);
  };

  // register a node and index its children
  var _indexed = 1;
  function _register(element) {
    if (element.rows) {
      element.b2_length = element.rows.length;
      element.b2_lookup = "rowIndex";
    } else if (element.cells) {
      element.b2_length = element.cells.length;
      element.b2_lookup = "cellIndex";
    } else if (element.b2_indexed != _indexed) {
      var index = 0;
      var child = element.firstChild;
      while (child) {
        if (child.nodeType == 1 && child.nodeName != "!") {
          child.b2_index = ++index;
        }
        child = child.nextSibling;
      }
      element.b2_length = index;
      element.b2_lookup = "b2_index";
    }
    element.b2_indexed = _indexed;
    return element;
  };

  Selector.parse = function(selector, simple) {
    var cache = simple ? _simple : _cache;
    if (!cache[selector]) {
      if (!_parser.exec) _parser = new CSSParser(_parser);
      _reg = []; // store for RegExp objects
      _list = [];
      var fn = "";
      var selectors = _parser.escape(selector, simple).split(",");
      for (_group = 0; _group < selectors.length; _group++) {
        _wild = _index = _list[_group] = 0; // reset
        _duplicate = selectors.length > 1 ? 2 : 0; // reset
        var block = _parser.exec(selectors[_group]) || "throw;";
        if (_wild && _MSIE) { // IE's pesky comment nodes
          block += format("if(e%1.tagName!='!'){", _index);
        }
        // check for duplicates before storing results
        var store = (_duplicate > 1) ? _TEST : "";
        block += format(store + _STORE, _index, "%2");
        // add closing braces
        block += Array(match(block, /\{/g).length + 1).join("}");
        fn += block;
      }
      fn = _parser.unescape(fn);
      if (selectors.length > 1) fn += "r.unsorted=1;";
      var args = "";
      var state = [];
      var total = sum(_list);
      for (var i = 1; i <= total; i++) {
        args += ",a" + i;
        //state.push("i" + i);
        state.push("i" + i + "?(i" + i + "-1):0");
      }
      if (total) {
        var complete = [], k = 0;
        for (var i = 0; i < _group; i++) {
          k += _list[i];
          if (_list[i]) complete.push(format("n%1&&i%1==n%1.length", k));
        }
      }
      fn += "_query.state=[%2];_query.complete=%3;return s==1?null:r}";
      eval(format(_FN + fn, args, state.join(","), total ? complete.join("&&") : true, _reg));
      cache[selector] = _query;
    }
    return cache[selector];
  };
})();

// =========================================================================
// DOM/selectors-api/StaticNodeList.js
// =========================================================================

// http://www.w3.org/TR/selectors-api/#staticnodelist

// A wrapper for an array of elements or an XPathResult.
// The item() method provides access to elements.
// Implements Enumerable so you can forEach() to your heart's content... :-)

var StaticNodeList = Base.extend({
  constructor: function(nodes) {
    nodes = nodes || [];
    this.length = nodes.length;
    this.item = function(index) {
      if (index < 0) index += this.length; // starting from the end
      return nodes[index];
    };
    if (nodes.unsorted) nodes.sort(_SORTER);
  },
  
  length: 0,
  
  forEach: function(block, context) {
    for (var i = 0; i < this.length; i++) {
      block.call(context, this.item(i), i, this);
    }
  },

  item: Undefined, // defined in the constructor function

  not: function(test, context) {
    return this.filter(not(test), context);
  },

  slice: function(start, end) {
    return new StaticNodeList(this.map(I).slice(start, end));
  },

  "@(XPathResult)": {
    constructor: function(nodes) {
      if (nodes && nodes.snapshotItem) {
        this.length = nodes.snapshotLength;
        this.item = function(index) {
          if (index < 0) index += this.length; // starting from the end
          return nodes.snapshotItem(index);
        };
      } else this.base(nodes);
    }
  }
});

StaticNodeList.implement(Enumerable);

var _matchesSelector = function(test, context) {
  if (typeof test != "function") {
    test = bind("test", new Selector(test));
  }
  return this.base(test, context);
};

StaticNodeList.implement({
  every: _matchesSelector,
  filter: _matchesSelector,
  not: _matchesSelector,
  some: _matchesSelector
});

StaticNodeList.implement({
  filter: function(test, context) {
    return new StaticNodeList(this.base(test, context));
  }
});

var _SORTER = _INDEXED ? function(node1, node2) {
  return node1.sourceIndex - node2.sourceIndex;
} : function(node1, node2) {
  return (Node.compareDocumentPosition(node1, node2) & 2) - 1;
};

// =========================================================================
// DOM/selectors-api/implementations.js
// =========================================================================

Document.implement(DocumentSelector);
Element.implement(ElementSelector);

// =========================================================================
// DOM/html/HTMLDocument.js
// =========================================================================

// http://www.whatwg.org/specs/web-apps/current-work/#htmldocument

var HTMLDocument = Document.extend(null, {
  bind: function(document) {
    DocumentState.createState(document);
    return this.base(document);
  }
});

// =========================================================================
// DOM/html/HTMLElement.js
// =========================================================================

var HTMLElement = Element.extend(null, {
  bindings: {},
  tags: "*",
  
  bind: function(element) {
    if (!element.classList) {
      element.classList = new _ElementClassList(element);
    }
    if (!element.ownerDocument) {
      element.ownerDocument = Traversal.getOwnerDocument(element);
    }
    return this.base(element);
  },

  extend: function() {
    // Maintain HTML element bindings.
    // This allows us to map specific interfaces to elements by reference
    // to tag name.
    var binding = base(this, arguments);
    forEach.csv(binding.tags, function(tagName) {
      HTMLElement.bindings[tagName] = binding;
    });
    return binding;
  }
});

HTMLElement.extend(null, {
  tags: "APPLET,EMBED",  
  bind: I // Binding not allowed for these elements.
});

// =========================================================================
// DOM/html/ClassList.js
// =========================================================================

// http://www.whatwg.org/specs/web-apps/current-work/#domtokenlist0

// I'm not supporting length/index(). What's the point?

var ClassList = Module.extend({
  add: function(element, token) {
    if (!this.has(element, token)) {
      element.className += (element.className ? " " : "") + token;
    }
  },

  has: function(element, token) {
    var regexp = new RegExp("(^|\\s)" + token + "(\\s|$)");
    return regexp.test(element.className);
  },

  remove: function(element, token) {
    var regexp = new RegExp("(^|\\s)" + token + "(\\s|$)", "g");
    element.className = trim(element.className.replace(regexp, "$2"));
  },

  toggle: function(element, token) {
    this[this.has(element, token) ? "remove" : "add"](element, token);
  }
});

function _ElementClassList(element) {
  this.add = function(token) {
    ClassList.add(element, token);
  };
  this.has = function(token) {
    return ClassList.has(element, token);
  };
  this.remove = function(token) {
    ClassList.remove(element, token);
  };
};

_ElementClassList.prototype.toggle = function(token) {
  this[this.has(token) ? "remove" : "add"](token);
};

// =========================================================================
// DOM/DocumentState.js
// =========================================================================

// Store some state for HTML documents.
// Used for fixing event handlers and supporting the Selectors API.

var DocumentState = Base.extend({
  constructor: function(document) {
    this.document = document;
    this.events = {};
    this._hoverElement = document.documentElement;
    this.isBound = function() {
      return !!DOM.bind[document.base2ID];
    };
    forEach (this, function(method, name, documentState) {
      if (/^on((DOM)?\w+|[a-z]+)$/.test(name)) {
        documentState.registerEvent(name.slice(2));
      }
    });
  },

  includes: function(element, target) {
    return target && (element == target || Traversal.contains(element, target));
  },

  hasFocus: function(element) {
    return element == this._focusElement;
  },

  isActive: function(element) {
    return this.includes(element, this._activeElement);
  },

  isHover: function(element) {
    return this.includes(element, this._hoverElement);
  },

  handleEvent: function(event) {
    return this["on" + event.type](event);
  },

  onblur: function(event) {
    delete this._focusElement;
  },

  onmouseover: function(event) {
    this._hoverElement = event.target;
  },

  onmouseout: function(event) {
    delete this._hoverElement;
  },

  onmousedown: function(event) {
    this._activeElement = event.target;
  },

  onfocus: function(event) {
    this._focusElement = event.target;
  },

  onmouseup: function(event) {
    delete this._activeElement;
  },

  registerEvent: function(type) {
    this.document.addEventListener(type, this, true);
    this.events[type] = true;
  },

  "@(document.activeElement===undefined)": {
    constructor: function(document) {
      this.base(document);
      if (this.isBound()) {
        document.activeElement = document.body;
      }
    },

    onfocus: function(event) {
      this.base(event);
      if (this.isBound()) {
        this.document.activeElement = this._focusElement;
      }
    },

    onblur: function(event) {
      this.base(event);
      if (this.isBound()) {
        this.document.activeElement = this.document.body;
      }
    }
  },

  "@!(element.addEventListener)": {
    constructor: function(document) {
      this.base(document);
      var dispatcher = new EventDispatcher(this);
      this._dispatch = function(event) {
        event.target = event.target || event.srcElement || document;
        dispatcher.handleEvent(event);
      };
      this.handleEvent = function(event) {
        if (this["on" + event.type]) {
          this["on" + event.type](event);
        }
        return dispatcher.handleEvent(event);
      };
    },

    registerEvent: function(type, target) {
      var events = this.events[type];
      var canDelegate = _CAN_DELEGATE.test(type);
      if (!events || !canDelegate) {
        if (!events) events = this.events[type] = {};
        if (canDelegate || !target) target = this.document;
        var state = this;
        target["on" + type] = function(event) {
          if (!event) {
            event = Traversal.getDefaultView(this).event;
          }
          if (event) state.handleEvent(event);
        };
      }
      return events;
    },

    "@MSIE.+win": {
      constructor: function(document) {
        this.base(document);
        var forms = {};
        this._registerForm = function(form) {
          var formID = assignID(form);
          if (!forms[formID]) {
            forms[formID] = true;
            form.attachEvent("onsubmit", this._dispatch);
            form.attachEvent("onreset", this._dispatch);
          }
        };
      },

      fireEvent: function(type, event) {
        event = copy(event);
        event.type = type;
        this.handleEvent(event);
      },

      registerEvent: function(type, target) {
        var events = this.events[type];
        var canDelegate = _CAN_DELEGATE.test(type);
        if (!events || !canDelegate) {
          if (!events) events = this.events[type] = {};
          if (canDelegate || !target) target = this.document;
          var state = this;
          target.attachEvent("on" + type, function(event) {
            event.target = event.srcElement || state.document;
            state.handleEvent(event);
            if (state["after" + type]) {
              state["after" + type](event);
            }
          });
        }
        return events;
      },

      onDOMContentLoaded: function(event) {
        forEach (event.target.forms, this._registerForm, this);
        this.setFocus(this.document.activeElement);
      },

      onmousedown: function(event) {
        this.base(event);
        this._button = event.button;
      },

      onmouseup: function(event) {
        this.base(event);
        if (this._button == null) {
          this.fireEvent("mousedown", event);
        }
        delete this._button;
      },

      aftermouseup: function() {
        if (this._selectEvent) {
          this._dispatch(this._selectEvent);
          delete this._selectEvent;
        }
      },

      onfocusin: function(event) {
        this.setFocus(event.target);
        this.onfocus(event);
      },

      setFocus: function(target) {
        var change = this.events.change, select = this.events.select;
        if (change || select) {
          var dispatch = this._dispatch;
          if (change) target.attachEvent("onchange", dispatch);
          if (select) {
            var state = this;
            var onselect = function(event) {
              if (state._activeElement == target) {
                state._selectEvent = copy(event);
              } else {
                dispatch(event);
              }
            };
            target.attachEvent("onselect", onselect);
          }
          target.attachEvent("onblur", function() {
            target.detachEvent("onblur", arguments.callee);
            if (change) target.detachEvent("onchange", dispatch);
            if (select) target.detachEvent("onselect", onselect);
          });
        }
      },

      onfocusout: function(event) {
        this.onblur(event);
      },

      onclick: function(event) {
        var target = event.target;
        if (target.form) this._registerForm(target.form);
      },

      ondblclick: function(event) {
        this.fireEvent("click", event);
      }
    }
  }
}, {
  init: function() {
    assignID(document);
    DocumentState = this;
    this.createState(document);
    new DOMContentLoadedEvent(document);
  },

  createState: function(document) {
    var base2ID = document.base2ID;
    if (!this[base2ID]) {
      this[base2ID] = new this(document);
    }
    return this[base2ID];
  },

  getInstance: function(target) {
    return this[Traversal.getDocument(target).base2ID];
  }
});

eval(this.exports);

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
