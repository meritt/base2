/*
  base2 - copyright 2007-2009, Dean Edwards
  http://code.google.com/p/base2/
  http://www.opensource.org/licenses/mit-license.php

  Contributors:
    Doeke Zanstra
*/

// timestamp: Wed, 23 Sep 2009 19:38:55

new function(_no_shrink_) { ///////////////  BEGIN: CLOSURE  ///////////////

// =========================================================================
// dom/package.js
// =========================================================================

// Thanks to Diego Perini for help and inspiration.

var dom = new base2.Package(this, {
  name:    "dom",
  version:  base2.version,
  imports: "Function2",
  exports:
    "Interface,Binding,Node,Document,Element,Traversal,"+          // Core
    "AbstractView,"+                                               // Views
    "ViewCSS,CSSStyleDeclaration,"+                                // Style
    "NodeSelector,StaticNodeList,Selector,CSSParser,XPathParser,"+ // Selectors API
    "Event,EventTarget,DocumentEvent,"+                            // Events
    "HTMLDocument,HTMLElement,ClassList,"+                         // HTML
    "ElementView",                                                 // CSS Object Model
  
  bind: function(node) {
    // Apply a base2 DOM Binding to a native DOM node.
    /*@if (@_jscript_version < 5.6)
    if (node && node.getElementById) {
      node.nodeType = 9;
    }
    /*@end @*/
    if (node && node.nodeType) {
      var id = (node.nodeType == 1 ? node.uniqueID : node.base2ID) || assignID(node);
      if (!_boundElementIDs[id]) {
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
            if (node.getElementById) {
              HTMLDocument.bind(node);
            } else {
              Document.bind(node);
            }
            break;
          default:
            Node.bind(node);
        }
        _boundElementIDs[id] = true;
      }
    }
    return node;
  },
  
  isBound: function(node) {
    return !!_boundElementIDs[node.nodeType == 1 ? node.uniqueID : node.base2ID];
  }
});

eval(this.imports);

// legacy support
base2.DOM = pcopy(dom);
base2.DOM.namespace += "var DOM=dom;";

// =========================================================================
// dom/header.js
// =========================================================================

/*@cc_on @*/

var _boundElementIDs = {};

var _element = document.createElement("span"),
    _style   = _element.style;

var _TEXT_CONTENT = detect("(element.textContent)") ? "textContent" : "innerText";

var _USE_IFLAG      = /^(action|cite|codebase|data|href|longdesc|lowsrc|src|usemap)$/i,
    _USE_OUTER_HTML = /^(type|value)$/i;

var _PARENT = detect("(element.parentElement)") ? "parentElement" : "parentNode";

var _MATCH_TYPE  = /type="?([^\s">]*)"?/i,
    _MATCH_VALUE = /value="?([^\s">]*)"?/i;

function _gecko_bind(node) {
  return extend(this.base(node), "removeEventListener", function() {
    var args = Array2.slice(arguments);
    args.unshift(this);
    EventTarget.removeEventListener.apply(EventTarget, args);
  });
};

var _getSourceIndex = _element.sourceIndex == undefined ? function(node) {
  // return a key suitable for comparing nodes
  var key = 0;
  while (node) {
    var index = Traversal.getNodeIndex(node);
    key = "0000".slice(0, 4 - String(index).length) + index + "." + key;
    node = node.parentNode;
  }
  return key;
} : function(node) {
  return node.sourceIndex;
};

var _ATTRIBUTES = {
  "class": "className",
  "for": "htmlFor"
};

// These mappings are for MSIE5.x
var _HTML_ATTRIBUTES =
  "accessKey,allowTransparency,cellPadding,cellSpacing,codeBase,codeType,colSpan,dateTime,"+
  "frameBorder,longDesc,maxLength,noHref,noResize,noShade,noWrap,readOnly,rowSpan,tabIndex,useMap,vAlign";
// Convert the list of strings to a hash, mapping the lowercase name to the camelCase name.
extend(_ATTRIBUTES, Array2.combine(_HTML_ATTRIBUTES.toLowerCase().split(","), _HTML_ATTRIBUTES.split(",")));

var _getAttributeNode = _element.getAttributeNode ? function(element, name) {
  return element.getAttributeNode(name);
} : function(element, name) {
  return element.attributes[name] || element.attributes[_ATTRIBUTES[name.toLowerCase()]];
};

// =========================================================================
// dom/Interface.js
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
    if (name.indexOf("@") == 0) {
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
// dom/Binding.js
// =========================================================================

var Binding = Interface.extend(null, {
  bind: function(object) {
    // Add methods
    return extend(object, this.prototype);
  }
});

// =========================================================================
// dom/Node.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-1950641247

var Node = Binding.extend({
  // http://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-compareDocumentPosition
  "@!(element.compareDocumentPosition)" : {
    compareDocumentPosition: function(node, other) {
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
      return 1; // disconnected
    }
  }
});

// =========================================================================
// dom/Document.js
// =========================================================================

var Document = Node.extend(null, {
  bind: function(document) {
    extend(document, "createElement", function(tagName) {
      return dom.bind(this.base(tagName));
    });
    if (!document.defaultView) {
      document.defaultView = Traversal.getDefaultView(document);
    }
    AbstractView.bind(document.defaultView);
    if (document != window.document) {
      new DOMContentLoadedEvent(document);
    }
    return this.base(document);
  },

  "@Gecko": {
    bind: _gecko_bind
  }
});

// =========================================================================
// dom/Element.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-745549614

// getAttribute() will return null if the attribute is not specified. This is
//  contrary to the specification but has become the de facto standard.

// Damn. Attributes are hard. All the browsers disagree on how it should be done.

detect("(element.className='test',element.expando=true)"); // Initialise feature detection

var Element = Node.extend({
  // The spec says return an empty string, most browsers disagree and return null.
  // base2 agrees with most browsers.
  "@(element.getAttribute('made-up')===''||element.getAttribute('id')!=null||element.getAttribute('expando'))": {
    getAttribute: function(element, name) {
      var attribute = _getAttributeNode(element, name),
          specified = attribute && attribute.specified;
      /*@if (@_jscript)
        if (element.nodeName == "INPUT" && _USE_OUTER_HTML.test(name) && element.outerHTML) {
          var outerHTML = element.outerHTML || "";
          with (outerHTML) outerHTML = slice(0, indexOf(">") + 1);
          return match(outerHTML, name == "type" ? _MATCH_TYPE : _MATCH_VALUE)[1] || null;
        }
        if ((specified && _USE_IFLAG.test(name)) || (!attribute && @_jscript_version < 5.6)) {
          var method = "getAttribute";
          if (element["_" + method]) method = "_" + method;
          return element[method](name, 2);
        }
      /*@end @*/
      if (specified) {
        /*@if (@_jscript)
          if (name == "style") return element.style.cssText.toLowerCase();
        /*@end @*/
        return attribute.nodeValue;
      }
      return null;
    },

    hasAttribute: function(element, name) {
      return this.getAttribute(element, name) != null;
    }
  },

  // MSIE5-7 has its own weird dictionary of attribute names
  "@!(element.getAttribute('class'))": {
    removeAttribute: function(element, name) {
      name = _ATTRIBUTES[name.toLowerCase()] || name;
      /*@if (@_jscript)
        var method = "removeAttribute";
        if (element["_" + method]) method = "_" + method;
        element[method](name);
      @else @*/
        this.base(element, name);
      /*@end @*/
    },

    setAttribute: function(element, name, value) {
      name = _ATTRIBUTES[name.toLowerCase()] || name;
      /*@if (@_jscript)
        if (name == "style") {
          element.style.cssText = value;
        } else {
          var method = "setAttribute";
          if (element["_" + method]) method = "_" + method;
          element[method](name, String(value));
        }
      @else @*/
        this.base(element, name, value);
      /*@end @*/
    }
  },

  "@!(element.hasAttribute)": {
    hasAttribute: function(element, name) {
      return this.getAttribute(element, name) != null;
    }
  },

  // A base2 extension the was originally in the Selectors API spec
  "@!(element.matchesSelector)": {
    matchesSelector: function(element, selector) {
      return new Selector(selector).test(element);
    }
  }
}, {
  "@Gecko": {
    bind: _gecko_bind
  }
});

// =========================================================================
// dom/Traversal.js
// =========================================================================

// DOM Traversal. Just the basics.
var Traversal = Module.extend({
  contains: function(node, target) {
    node.nodeType; // throw an error if no node supplied
    while (target && (target = target[_PARENT]) && node != target) continue;
    return !!target;
  },

  getFirstElementChild: function(element) {
    element = element.firstChild;
    return this.isElement(element) ? element : this.getNextElementSibling(element);
  },

  getLastElementChild: function(element) {
    element = element.lastChild;
    return this.isElement(element) ? element : this.getPreviousElementSibling(element);
  },

  getNextElementSibling: function(element) {
    // return the next element to the supplied element
    while (element && (element = element.nextSibling) && !this.isElement(element)) continue;
    return element;
  },

  getNodeIndex: function(node) {
    var index = 0;
    while (node && (node = node.previousSibling)) index++;
    return index;
  },
  
  getOwnerDocument: function(element) {
    // return the node's containing document
    return element.ownerDocument;
  },
  
  getPreviousElementSibling: function(element) {
    // return the previous element to the supplied element
    while (element && (element = element.previousSibling) && !this.isElement(element)) continue;
    return element;
  },

  getTextContent: function(node, isHTML) {
    return node[node.nodeType == 1 ? isHTML ? "innerHTML" : _TEXT_CONTENT : "nodeValue"];
  },

  includes: function(node, target) {
    return !!target && (node == target || this.contains(node, target));
  },

  isEmpty: function(element) {
    element = element.firstChild;
    while (element) {
      if (element.nodeType == 3 || this.isElement(element)) return false;
      element = element.nextSibling;
    }
    return true;
  },

  setTextContent: function(node, text, isHTML) {
    node[node.nodeType == 1 ? isHTML ? "innerHTML" : _TEXT_CONTENT : "nodeValue"] = text;
  },

  "@!MSIE": {
    setTextContent: function(node, text, isHTML) {
      // Destroy the DOM (slightly faster for non-MISE browsers)
      with (node) while (lastChild) removeChild(lastChild);
      this.base(node, text, isHTML);
    }
  },

  "@(jscript<5.6)": {
    getOwnerDocument: function(element) {
      return element.document.parentWindow.document;
    }
  }
}, {
  TEXT_CONTENT: _TEXT_CONTENT,

  getDefaultView: function(nodeOrWindow) {
    // return the document object
    return (nodeOrWindow.ownerDocument || nodeOrWindow.document || nodeOrWindow).defaultView;
  },

  getDocument: function(nodeOrWindow) {
    // return the document object
    return this.isDocument(nodeOrWindow) ?
      nodeOrWindow : nodeOrWindow.nodeType ? this.getOwnerDocument(nodeOrWindow) : nodeOrWindow.document || null;
  },
  
  isDocument: function(node) {
    return !!node && node.nodeType == 9;
  },

  isElement: function(node) {
    return !!node && node.nodeType == 1;
  },

  isXML: function(node) {
    return !this.getDocument(node).getElementById;
  },

  "@!(document.defaultView)": {
    getDefaultView: function(nodeOrWindow) {
      // return the document object
      return (nodeOrWindow.document || nodeOrWindow).parentWindow;
    }
  },

  "@(jscript<5.6)": {
    isDocument: function(node) {
      return !!(node && (node.nodeType == 9 || node.writeln));
    },
    
    isElement: function(node) {
      return !!node && node.nodeType == 1 && node.nodeName != "!";
    }
  }
});

// =========================================================================
// DOM/views/AbstractView.js
// =========================================================================

// This doesn't do much.

var AbstractView = Binding.extend();

// =========================================================================
// DOM/events/header.js
// =========================================================================

// TO DO: textInput event

var _CAPTURING_PHASE = 1,
    _AT_TARGET       = 2,
    _BUBBLING_PHASE  = 3;


var _BUTTON_MAP      = {"2": 2, "4": 1},
    _EVENT_MAP       = {focusin: "focus", focusout: "blur"},
    _MOUSE_BUTTON    = /^mouse(up|down)|click$/,
    _MOUSE_CLICK     = /click$/,
    _NO_BUBBLE       = /^((before|un)?load|focus|blur|stop|(readystate|property|filter)change|losecapture)$/,
    _CANCELABLE      = /^((dbl)?click|mouse(down|up|over|out|wheel)|key(down|up|press)|submit|DOMActivate|(before)?(cut|copy|paste)|contextmenu|drag(start|enter|over)?|drop|before(de)?activate)$/,
    _CANNOT_DELEGATE = /^(abort|error|load|scroll|(readystate|property|filter)change)$/;
    //_CAN_DELEGATE = /^(submit|reset|select|change|blur)$|^(mouse|key|focus)|click$/;

var _wrappedListeners = {},
    _wrappedTypes = extend({}, {
  DOMContentLoaded: "base2ContentLoaded",
  mouseenter: "mouseover",
  mouseleave: "mouseout",
  "@Gecko": {
    mousewheel: "DOMMouseScroll"
  }
});

function _wrap(type, listener, wrapper) {
  var key = type + "#" + assignID(listener);
  if (!_wrappedListeners[key]) {
    _wrappedListeners[key] = wrapper;
  }
  return _wrappedListeners[key];
};

function _unwrap(type, listener) {
  return _wrappedListeners[type + "#" + listener.base2ID] || listener;
};

function _handleEvent(target, listener, event) {
  if (typeof listener == "function") {
    listener.call(target, event);
  } else {
    listener.handleEvent(event);
  }
};

// break out of clsoures to attach events in MSIE
extend(_private, {
  suppress: {},
  listeners: {},
  handlers: {},

  attachEvent: function(target, type, listener) {
    var listenerID = base2.assignID(listener);
    var handleEvent = this.handlers[listenerID];
    if (!handleEvent) {
      this.listeners[listenerID] = listener;
      handleEvent = this.handlers[listenerID] = new Function("e", "base2.toString.listeners['" + listenerID + "'](e)");
    }
    target.attachEvent(type, handleEvent);
  },

  detachEvent: function(target, type, listener, permanent) {
    var listenerID = listener.base2ID;
    target.detachEvent(type, this.handlers[listenerID]);
    if (permanent) {
      delete this.listeners[listenerID];
      delete this.handlers[listenerID];
    }
  }
});

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
      if (event.cancelable !== false) event.returnValue = false;
      if (event.type == "mousedown") { // cancel a mousedown event
        var activeElement = Traversal.getDocument(event.target).activeElement,
            suppress = _private.suppress;
        var onblur = function(event) {
          suppress.focus = true;
          activeElement.focus();
          _private.detachEvent(activeElement, "onblur", onblur, true);
          setTimeout(function() {
            delete suppress.focus;
            delete suppress.blur;
          }, 1);
        };
        suppress.blur = true;
        _private.attachEvent(activeElement, "onblur", onblur);
      }
    },

    stopPropagation: function(event) {
      event.cancelBubble = true;
    },

    "@(element.onbeforedeactivate)": {
      preventDefault: function(event) {
        if (event.cancelable !== false) event.returnValue = false;
        if (event.type == "mousedown") { // cancel a mousedown event
          var body = Traversal.getDocument(event.target).body;
          var onbeforedeactivate = function(event) {
            _private.detachEvent(body, "onbeforedeactivate", onbeforedeactivate, true);
            event.returnValue = false;
          };
          _private.attachEvent(body, "onbeforedeactivate", onbeforedeactivate);
        }
      }
    }
  }
}, {
  CAPTURING_PHASE: _CAPTURING_PHASE,
  AT_TARGET:       _AT_TARGET,
  BUBBLING_PHASE:  _BUBBLING_PHASE,

  cloneEvent: function(event) {
    if (event.isClone) return event;
    var clone = copy(event);
    clone.isClone = true;
    clone.stopPropagation = function() {
      event.stopPropagation();
      this.cancelBubble = true;
    };
    clone.preventDefault = function() {
      event.preventDefault();
      this.returnValue = false;
    };
    return clone;
  },

  "@!(document.createEvent)": {
    bind: function(event) {
      if (!event.timeStamp) {
        event.bubbles = !_NO_BUBBLE.test(event.type);
        event.cancelable = _CANCELABLE.test(event.type);
        event.timeStamp = new Date().valueOf();
      }
      event.relatedTarget = event[(event.target == event.fromElement ? "to" : "from") + "Element"];
      return this.base(event);
    }
  }
});

// =========================================================================
// DOM/events/EventDispatcher.js
// =========================================================================

// this enables a real execution context for each event.
if (detect.MSIE && !detect("element.dispatchEvent")) {
  var _fire = document.createElement(/^CSS/.test(document.compatMode) ? "meta" : "marquee"),
      _base2Event = _private.base2Event = {};

  _fire.base2Events = 0;
  _fire.attachEvent("onpropertychange", new Function('e', 'var d=base2.toString.base2Event;\
if (e.propertyName=="base2Events"){\
if(typeof d.listener=="function")d.listener.call(d.target,d.event);\
else d.listener.handleEvent(d.event)}'));
  
  document.getElementsByTagName("head")[0].appendChild(_fire);

  var EventDispatcher = Base.extend({
    constructor: function(state) {
      this.state = state;
    },

    dispatch: function(nodes, event, phase, map) {
      event.eventPhase = phase;
      var i = nodes.length;
      while (i-- && !event.cancelBubble) {
        var target = nodes[i],
            listeners = map[target.nodeType == 1 ? target.uniqueID : target.base2ID];
        if (listeners) {
          listeners = copy(listeners);
          event.currentTarget = target;
          event.eventPhase = target == event.target ? _AT_TARGET : phase;
          for (var listenerID in listeners) {
            _base2Event.event = event;
            _base2Event.target = target;
            _base2Event.listener = listeners[listenerID];
            _fire.base2Events++; // dispatch the event
            if (event.returnValue === false) {
              event.preventDefault();
            }
          }
        }
      }
    },

    handleEvent: function(event) {
      event = Event.cloneEvent(Event.bind(event));
      var type = event.type;
      if (_EVENT_MAP[type]) {
        type = event.type = _EVENT_MAP[type];
        event.bubbles = !_NO_BUBBLE.test(type);
      }

      var typeMap = this.state.events[type];
      if (typeMap && !_private.suppress[type]) {
        // Fix the mouse button (left=0, middle=1, right=2)
        if (_MOUSE_BUTTON.test(type)) {
          var button = _MOUSE_CLICK.test(type) ? this.state._button : event.button;
          event.button = _BUTTON_MAP[button] || 0;
        }

        // Collect nodes in the event hierarchy
        var target = event.target, nodes = [], i = 0;
        while (target) {
          nodes[i++] = target;
          target = target.parentNode;
        }
        /*@if (@_jscript_version < 5.6)
        if (nodes[0].nodeType == 1 && !nodes[i - 1].documentElement) {
          nodes[i] = Traversal.getDocument(nodes[0]);
        }
        /*@end @*/

        // Dispatch.
        var map = typeMap[_CAPTURING_PHASE];
        if (map) this.dispatch(nodes, event, _CAPTURING_PHASE, map);
        map = typeMap[_BUBBLING_PHASE];
        if (map && !event.cancelBubble) {
          if (event.bubbles) {
            nodes.reverse();
          } else {
            nodes.length = 1;
          }
          this.dispatch(nodes, event, _BUBBLING_PHASE, map);
        }
      }
      return event.returnValue !== false;
    }
  });
}

// =========================================================================
// DOM/events/EventTarget.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-Registration-interfaces

var EventTarget = Interface.extend({
  "@!(element.addEventListener)": {
    addEventListener: function(target, type, listener, useCapture) {
      var documentState = DocumentState.getInstance(target);

      // assign a unique id to both objects
      var targetID = assignID(target),
          listenerID = assignID(listener),
      // create a hash table of event types for the target object
          phase = useCapture ? _CAPTURING_PHASE : _BUBBLING_PHASE,
          typeMap = documentState.registerEvent(type, target),
          phaseMap = typeMap[phase];
          
      if (!phaseMap) phaseMap = typeMap[phase] = {};
      // create a hash table of event listeners for each object/event pair
      var listeners = phaseMap[targetID];
      if (!listeners) listeners = phaseMap[targetID] = {};
      // store the event listener in the hash table
      listeners[listenerID] = listener;
    },

    dispatchEvent: function(target, event) {
      event.target = target;
      event._userGenerated = true;
      return DocumentState.getInstance(target).handleEvent(event);
    },

    removeEventListener: function(target, type, listener, useCapture) {
      var events = DocumentState.getInstance(target).events;
      // delete the event listener from the hash table
      var typeMap = events[type];
      if (typeMap) {
        var phaseMap = typeMap[useCapture ? _CAPTURING_PHASE : _BUBBLING_PHASE];
        if (phaseMap) {
          var listeners = phaseMap[target.nodeType == 1 ? target.uniqueID : target.base2ID];
          if (listeners) delete listeners[listener.base2ID];
        }
      }
    }
  },

  addEventListener: function(target, type, listener, useCapture) {
    var originalListener = listener;
    if (type == "DOMContentLoaded") {
      listener = _wrap(type, originalListener, function(event) {
        event = Event.cloneEvent(event);
        event.type = type;
        event.bubbles = event.cancelable = false;
        EventTarget.removeEventListener(target, type, originalListener, useCapture);
        _handleEvent(this, originalListener, event);
      });
    } else if (type == "mouseenter" || type == "mouseleave") {
      listener = _wrap(type, originalListener, function(event) {
        if (Traversal.includes(this, event.target) && !Traversal.includes(this, event.relatedTarget)) {
          event = copy(event);
          event.target = this;
          event.type = type;
          event.bubbles = event.cancelable = false;
          _handleEvent(this, originalListener, event);
        }
      });
    }
    this.base(target, _wrappedTypes[type] || type, listener, useCapture);
  },

  removeEventListener: function(target, type, listener, useCapture) {
    this.base(target, _wrappedTypes[type] || type, _unwrap(type, listener), useCapture);
  },
  
  "@Gecko": {
    addEventListener: function(target, type, listener, useCapture) {
      if (type == "mousewheel") {
        var originalListener = listener;
        listener = _wrap(type, originalListener, function(event) {
          event = Event.cloneEvent(event);
          event.type = type;
          event.wheelDelta = (-event.detail * 40) || 0;
          _handleEvent(this, originalListener, event);
        });
      }
      this.base(target, type, listener, useCapture);
    }
  },

  "@Gecko1\\.[0-3]|Webkit[1-4]": {
    addEventListener: function(target, type, listener, useCapture) {
      if (/^mouse/.test(type)) {
        var originalListener = listener;
        listener = _wrap(type, originalListener, function(event) {
          try {
            if (event.target.nodeType == 3) {
              event = Event.cloneEvent(event);
              event.target = event.target.parentNode;
            }
          } catch (x) {
            // sometimes the target is an anonymous node, ignore these
            return;
          }
          _handleEvent(this, originalListener, event);
        });
      }
      this.base(target, type, listener, useCapture);
    }
  },

  // http://unixpapa.com/js/mouse.html
  "@webkit[1-4]|KHTML[34]": {
    addEventListener: function(target, type, listener, useCapture) {
      var originalListener = listener;
      if (_MOUSE_BUTTON.test(type)) {
        listener = _wrap(type, originalListener, function(event) {
          var button = _BUTTON_MAP[event.button] || 0;
          if (event.button != button) {
            event = Event.cloneEvent(event);
            event.button = button;
          }
          _handleEvent(this, originalListener, event);
        });
      } else if (typeof listener == "object") {
        listener = _wrap(type, originalListener, bind("handleEvent", listener));
      }
      this.base(target, type, listener, useCapture);
    }
  },

  /*"@Chrome1": {
    addEventListener: function(target, type, listener, useCapture) {
      if (type == "mousewheel") {
        var originalListener = listener;
        listener = _wrap(type, originalListener, function(event) {
          event = Event.cloneEvent(event);
          event.wheelDelta /= 3;
          _handleEvent(this, originalListener, event);
        });
      }
      this.base(target, type, listener, useCapture);
    }
  },*/

  // http://unixpapa.com/js/key.html
  "@Linux|Mac|Opera": {
    addEventListener: function(target, type, listener, useCapture) {
      // Some browsers do not fire repeated "keydown" events when a key
      // is held down. They do fire repeated "keypress" events though.
      // Cancelling the "keydown" event does not cancel the repeated
      // "keypress" events. We fix all of this here...
      if (type == "keydown") {
        var originalListener = listener;
        listener = _wrap(type, originalListener, function(keydownEvent) {
          var firedCount = 0, cancelled = false;
          extend(keydownEvent, "preventDefault", function() {
            this.base();
            cancelled = true;
          });
          function handleEvent(event) {
            if (cancelled) event.preventDefault();
            if (event == keydownEvent || firedCount > 1) {
              _handleEvent(this, originalListener, keydownEvent);
            }
            firedCount++;
          };
          var onkeyup = function() {
            this.removeEventListener("keypress", handleEvent, true);
            this.removeEventListener("keyup", onkeyup, true);
          };
          handleEvent.call(this, keydownEvent);
          this.addEventListener("keyup", onkeyup, true);
          this.addEventListener("keypress", handleEvent, true);
        });
      }
      this.base(target, type, listener, useCapture);
    }
  }
});

if (detect("Gecko")) { // this needs to be here
  EventTarget.removeEventListener._delegate = "removeEventListener";
  delete EventTarget.prototype.removeEventListener;
}

// =========================================================================
// DOM/events/DocumentEvent.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-DocumentEvent

var DocumentEvent = Interface.extend({  
  "@!(document.createEvent)": {
    createEvent: function(document, type) {
      return Event({
        bubbles: false,
        cancelable: false,
        eventPhase: 0,
        target: document,
        currentTarget: null,
        relatedTarget: null,
        timeStamp: new Date().valueOf()
      });
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
          Event.initEvent(event, "base2ContentLoaded", false, false);
          EventTarget.dispatchEvent(document, event);
        }, 1);
      }
    };
    this.listen(document);
  },
  
  listen: function(document) {
    // if all else fails fall back on window.onload
    EventTarget.addEventListener(Traversal.getDefaultView(document), "load", this.fire, false);
  },

  "@(document.addEventListener)": {
    constructor: function(document) {
      this.base(document);
      // use the real event for browsers that support it
      document.addEventListener("DOMContentLoaded", this.fire, false);
    }
  },

  "@MSIE.+win": {
    listen: function(document) {
      this.base(document);
      // Diego Perini: http://javascript.nwbox.com/IEContentLoaded/
      try {
        document.body.doScroll("left");
        if (!this.__constructing) this.fire();
      } catch (x) {
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

var ViewCSS = Interface.extend({
  "@!(document.defaultView.getComputedStyle)": {
    "@(element.currentStyle)": {
      getComputedStyle: function(view, element, pseudoElement) {
        // pseudoElement parameter is not supported
        var currentStyle  = element.currentStyle,
            computedStyle = _CSSStyleDeclaration_ReadOnly.bind({});
            
        for (var propertyName in currentStyle) {
          if (_METRICS.test(propertyName) || _COLOR.test(propertyName)) {
            computedStyle[propertyName] = this.getComputedPropertyValue(view, element, propertyName);
          } else if (propertyName.indexOf("ruby") != 0) {
            computedStyle[propertyName] = currentStyle[propertyName];
          }
        }
        forEach.csv("backgroundPosition,boxSizing,clip,cssFloat,opacity", function(propertyName) {
          computedStyle[propertyName] = this.getComputedPropertyValue(view, element, propertyName);
        }, this);
        
        return computedStyle;
      }
    }
  }
}, {
  prefix: "",
  "@Gecko":  {prefix: "Moz"},
  "@KHTML":  {prefix: "Khtml"},
  "@Webkit": {prefix: "Webkit"},
  "@Opera":  {prefix: "O"},
  "@MSIE":   {prefix: "Ms"},
  
  getComputedPropertyValue: function(view, element, propertyName) {
    var value = CSSStyleDeclaration.getPropertyValue(this.getComputedStyle(view, element, null), propertyName);
    if (_COLOR.test(propertyName)) value = _toRGB(value);
    return value;
  },

  "@!(document.defaultView.getComputedStyle)": {
    "@(element.currentStyle)": {
      getComputedPropertyValue: function(view, element, propertyName) {
        var currentStyle  = element.currentStyle,
            value = currentStyle[propertyName];

        if (value == null) {
          propertyName = _getPropertyName(propertyName);
          value = currentStyle[propertyName] || "";
        }
        
        /*if (value == "inherit") {
          var parentNode = element.parentNode;
          if (parentNode && parentNode.currentStyle) {
            value = this.getComputedPropertyValue(view, parentNode, propertyName) || value;
          }
        }*/
        
        switch (propertyName) {
          case "float":
          case "cssFloat":
            return currentStyle.cssFloat || currentStyle.styleFloat || "";
          case "cursor":
            return value == "hand" ? "pointer" : value;
          case "opacity":
            return value == null ? "1" : value;
          case "clip":
            return "rect(" + [
              currentStyle.clipTop,
              currentStyle.clipRight,
              currentStyle.clipBottom,
              currentStyle.clipLeft
            ].join(", ") + ")";
          case "backgroundPosition":
            return currentStyle.backgroundPositionX + " " + currentStyle.backgroundPositionY;
          case "boxSizing":
            return value == null ?
              /^CSS/.test(Traversal.getDocument(element).compatMode) ?
                "content-box" : "border-box" : value;
        }

        if (value.indexOf(" ") > 0) return value;
        
        if (_METRICS.test(propertyName)) {
          if (_PIXEL.test(value)) return value;
          if (value == "auto") return "0px";
          if (propertyName.indexOf("border") == 0) {
            if (currentStyle[propertyName.replace("Width", "Style")] == "none") return "0px";
            value = _NAMED_BORDER_WIDTH[value] || value;
            if (typeof value == "number") return value + "px";
          }
          /*@if (@_jscript)
            if (_NUMBER.test(value)) return _MSIE_getPixelValue(element, value);
          /*@end @*/
        } else if (_COLOR.test(propertyName)) {
          if (value == "transparent") return value;
          if (/^(#|rgb)/.test(value)) return _toRGB(value);
          /*@if (@_jscript)
            return _MSIE_getColorValue(value);
          /*@end @*/
        }
        
        return value;
      }
    }
  }
});

// =========================================================================
// DOM/style/header.js
// =========================================================================

var _NUMBER  = /\d/,
    _PIXEL   = /\dpx$/i,
    _METRICS = /(width|height|top|bottom|left|right|fontSize)$/i,
    _COLOR   = /color$/i;

var _DASH = /\-/,
    _DASH_LOWER = /\-([a-z])/g,
    _CHAR_UPPER = /[A-Z]/g;

var _NAMED_BORDER_WIDTH = {
  thin: 1,
  medium: 2,
  thick: 4
};

var _SPECIAL = {
  "@MSIE": {
    opacity: 1,
    cursor: 1
  }
};

var _getPropertyName = function(propertyName, asAttribute) {
  if (propertyName == "float" || propertyName == "cssFloat" || propertyName == "styleFloat") {
    return asAttribute ? "float" : _style.cssFloat == null ? "styleFloat" : "cssFloat";
  }
  if (_DASH.test(propertyName)) {
    propertyName = propertyName.replace(_DASH_LOWER, _toUpperCase);
  }
  if (_style[propertyName] == null) {
    var borderRadiusCorner = /^border(\w+)Radius$/;
    if (ViewCSS.prefix == "Moz" && borderRadiusCorner.test(propertyName)) {
      propertyName = propertyName.replace(borderRadiusCorner, function(match, corner) {
        return "borderRadius" + corner.charAt(0) + corner.slice(1).toLowerCase();
      });
    }
    var vendorPropertyName = ViewCSS.prefix + propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
    if (_style[vendorPropertyName] != null) {
      propertyName = vendorPropertyName;
    }
  }
  if (asAttribute) {
    propertyName = propertyName.replace(_CHAR_UPPER, _dash_lower);
  }
  return propertyName;
};

function _dash_lower(chr) {
  return "-" + chr.toLowerCase();
};

var _toUpperCase = flip(String2.toUpperCase),
    _parseInt16  = partial(parseInt, undefined, 16);

function _MSIE_getPixelValue(element, value) {
  var styleLeft = element.style.left;
  var runtimeStyleLeft = element.runtimeStyle.left;
  element.runtimeStyle.left = element.currentStyle.left;
  element.style.left = value;
  value = element.style.pixelLeft;
  element.style.left = styleLeft;
  element.runtimeStyle.left = runtimeStyleLeft;
  return value + "px";
};

function _MSIE_getColorValue(color) {
  if (window.createPopup) {
    var document = createPopup().document;
  } else {
    document = new ActiveXObject("htmlfile");
    document.write("<body>");
  }
  var body  = document.body,
      range = body.createTextRange();
  body.style.color = color.toLowerCase();
  var value = range.queryCommandValue("ForeColor");
  return format("rgb(%1, %2, %3)", value & 0xff, (value & 0xff00) >> 8,  (value & 0xff0000) >> 16);
};

function _toRGB(value) {
  if (value.indexOf("rgb") == 0) return value.replace(/(\d)\s,/g, "$1,");
  if (value.indexOf("#") != 0) return value;
  var hex = value.slice(1);
  if (hex.length == 3) hex = hex.replace(/(\w)/g, "$1$1");
  return "rgb(" + Array2.map(hex.match(/(\w\w)/g), _parseInt16).join(", ") + ")";
};

// =========================================================================
// DOM/style/CSSStyleDeclaration.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration

var _CSSStyleDeclaration_ReadOnly = Binding.extend({
  getPropertyValue: function(style, propertyName) {
    if (style[propertyName] == null) propertyName = _getPropertyName(propertyName);
    return style[propertyName] || "";
  },

  "@MSIE5": {
    getPropertyValue: function(style, propertyName) {
      if (style[propertyName] == null) propertyName = _getPropertyName(propertyName);
      var value = style[propertyName];
      if (propertyName == "cursor" && value == "hand") {
        value = "pointer";
      }
      return value || "";
    }
  }
});

var CSSStyleDeclaration = _CSSStyleDeclaration_ReadOnly.extend({
  setProperty: function(style, propertyName, value, priority) {
    if (style[propertyName] == null) propertyName = _getPropertyName(propertyName);
    if (priority) {
      this.base(style, propertyName.replace(_CHAR_UPPER, _dash_lower), value, priority);
    } else {
      style[propertyName] = value;
    }
  },

  "@!(style['setProperty'])": {
    setProperty: function(style, propertyName, value, priority) {
      if (style[propertyName] == null) propertyName = _getPropertyName(propertyName);
      /*@if (@_jscript)
        if (@_jscript_version < 5.6 && propertyName == "cursor" && value == "pointer") {
          value = "hand";
        } else if (propertyName == "opacity") {
          value *= 100;
          style.zoom = "100%";
          style.filter = "alpha(opacity=" + Math.round(value) + ")";
        }
      /*@end @*/
      if (priority == "important") {
        style.cssText += format(";%1:%2!important;", propertyName.replace(_CHAR_UPPER, _dash_lower), value);
      } else {
        style[propertyName] = value;
      }
    }
  }
}, {
  getPropertyName: _getPropertyName,

  setProperties: function(style, properties) {
    properties = extend({}, properties);
    for (var propertyName in properties) {
      var value = properties[propertyName];
      if (style[propertyName] == null) propertyName = _getPropertyName(propertyName);
      if (typeof value == "number" && _METRICS.test(propertyName)) value += "px";
      if (_SPECIAL[propertyName]) {
        this.setProperty(style, propertyName, value, "");
      } else {
        style[propertyName] = value;
      }
    }
  }
});

// =========================================================================
// DOM/style/implementations.js
// =========================================================================

// Apply the ViewCSS interface to AbstractView.

AbstractView.implement(ViewCSS);

// =========================================================================
// DOM/selectors-api/header.js
// =========================================================================

var _USE_BASE2 = detect("(input.getAttribute('type')=='text')") ? /:visited|\[(type|value)|\b(object|param)\b/i : /:visited/; // security

var _SORTER = detect("(element.compareDocumentPosition)") ? function(a, b) {
  return (a.compareDocumentPosition(b) & 2) - 1;
} : document.createRange ? function(a, b) { // Stolen shamelessly from jQuery. I'm allowed. ;)
		var document = a.ownerDocument,
        aRange = document.createRange(),
        bRange = document.createRange();
		aRange.selectNode(a);
		aRange.collapse(true);
		bRange.selectNode(b);
		bRange.collapse(true);
		return aRange.compareBoundaryPoints(Range.START_TO_END, bRange);
} : function(a, b) {
  return (Node.compareDocumentPosition(a, b) & 2) - 1;
};

var _CSS_ESCAPE =           /'(\\.|[^'\\])*'|"(\\.|[^"\\])*"|\\./g,
    _CSS_IMPLIED_ASTERISK = /([\s>+~,]|[^(]\+|^)([#.:\[])/g,
    _CSS_IMPLIED_SPACE =    /(^|,)([^\s>+~])/g,
    _CSS_TRIM =             /\s*([\^*~|$]?=|[\s>+~,]|^|$)\s*/g,
    _CSS_LTRIM =            /\s*([\])])/g,
    _CSS_RTRIM =            /([\[(])\s*/g,
    _CSS_UNESCAPE =         /\x01(\d+)\x01/g,
    _CSS_CONTEXT =          /^ \*?/g,
    _QUOTE =                /'/g;
    
var _SPECIFICITY_ID =    /#/g,
    _SPECIFICITY_CLASS = /[.:\[]/g,
    _SPECIFICITY_TAG =   /^\w|[\s>+~]\w/g;

var _COMBINATOR = /^[\s>+~]$/;

var _NOT_XML   = ":(checked|disabled|enabled|selected|hover|active|focus|link|visited|target)",
    _NOT_XPATH = _NOT_XML + "|^(#[\\w\u00a1-\uffff\\-]+\\s*)?[\\w\u00a1-\uffff\\-]+$";
if (detect("KHTML")) {
  if (detect("WebKit5")) {
    _NOT_XPATH += "|nth\\-|,";
  } else {
    _NOT_XPATH = ".";
  }
}
_NOT_XML   = new RegExp(_NOT_XML);
_NOT_XPATH = new RegExp(_NOT_XPATH);

var _matchesSelector = function(test, context) {
  if (typeof test != "function") {
    test = new Selector(test).toDOMQuery(true);
  }
  return this.base(test, context);
};

function _nthChild(match, args, position, last, not, and, mod, equals) {
  // Ugly but it works for both CSS and XPath
  last = /last/i.test(match) ? last + "+1-" : "";
  if (!isNaN(args)) args = "0n+" + args;
  else if (args == "even") args = "2n";
  else if (args == "odd") args = "2n+1";
  args = args.split("n");
  var a = args[0] ? (args[0] == "-") ? -1 : parseInt(args[0], 10) : 1;
  var b = parseInt(args[1], 10) || 0;
  var negate = a < 0;
  if (negate) {
    a = -a;
    if (a == 1) b++;
  }
  var query = format(a == 0 ? "%3%7" + (last + b) : "(%4%3-(%2))%6%1%70%5%4%3>=%2", a, b, position, last, and, mod, equals);
  if (negate) query = not + "(" + query + ")";
  return query;
};

var _xpathParser, _notParser;

function _xpath_not(match, args) {
  if (!_notParser) _notParser = new XPathParser;
  return "[not(" + _notParser.exec(trim(args))
    .replace(/\[1\]/g, "") // remove the "[1]" introduced by ID selectors
    .replace(/^(\*|[\w\u00a1-\uffff\-\x01]+)/, "[self::$1]") // tagName test
    .replace(/\]\[/g, " and ") // merge predicates
    .slice(1, -1)
  + ")]";
};

function _xpath_nthChild(match, args, position) {
  return "[" + _nthChild(match, args, position || "count(preceding-sibling::*)+1", "last()", "not", " and ", " mod ", "=") + "]";
};

// IE confuses the name attribute with id for some elements.
// Use document.all to retrieve elements with name/id instead.
var id = "base2" + Date2.now(),
    root = document.documentElement;
_element.innerHTML = '<a name="' + id + '"></a>';
root.insertBefore(_element, root.firstChild);

var _byId = document.getElementById(id) == _element.firstChild ? document.all ? function(document, id) {
  var result = document.all[id] || null;
  // Returns a single element or a collection.
  if (!result || (result.nodeType && Element.getAttribute(result, "id") == id)) return result;
  // document.all has returned a collection of elements with name/id
  for (var i = 0; i < result.length; i++) {
    if (Element.getAttribute(result[i], "id") == id) return result[i];
  }
  return null;
} : null : function(document, id) {
  return document.getElementById(id);
};

root.removeChild(_element);
// Register a node and index its children.
var _indexed = 1,
    _indexes = {};
function _register(element) {
  if (_indexes._indexed != _indexed) {
    _indexes = {_indexed: _indexed};
  }
  var isIndexed = element.sourceIndex > 0,
      id = isIndexed ? element.sourceIndex : element.uniqueID || assignID(element);
  if (!_indexes[id]) {
    var indexes = {},
        index = 1,
        child = element.firstChild;
    while (child) {
      if (child.nodeType == 1)
        /*@if (@_jscript_version < 5.6)
          if (child.nodeName != "!")
        /*@end @*/
        indexes[isIndexed ? child.sourceIndex : child.uniqueID || assignID(child)] = index++;
      child = child.nextSibling;
    }
    indexes.length = index;
    _indexes[id] = indexes;
  }
  return _indexes[id];
};

function _catchSelectorError(selector, node, count) {
  try {
    var result = selector.base(node, count);
  } catch (x) {
    if (Traversal.isDocument(node) || Traversal.isElement(node) || node.nodeType == 11) {
      if (Traversal.isXML(node) && _NOT_XML.test(selector)) {
        result = null;
      } else { // Probably an invalid selector =)
        var error = new SyntaxError(format("'%1' is not a valid CSS selector.", selector));
        error.code = 12; // DOMException.SYNTAX_ERR
        throw error;
      }
    } else {
      throw new TypeError("Invalid argument.");
    }
  }
  return result;
};

// =========================================================================
// DOM/selectors-api/StaticNodeList.js
// =========================================================================

// http://www.w3.org/TR/selectors-api/#staticnodelist

// A wrapper for an array of elements or an XPathResult.

var StaticNodeList = Base.extend({
  constructor: function(nodes) {
    nodes = nodes || [];
    if (nodes.unsorted) nodes.sort(_SORTER);
    var length = nodes.length, i = 0, j = 0;
    if (length) this[0] = undefined; // fixes a weird bug in Opera
    while (i < length) {
      // For comma separated selectors (e.g. "span,abbr") on platforms
      // that support sourceIndex, then elements are stored by sourceIndex
      // to avoid sorting.
      if (nodes[i]) this[j++] = nodes[i];
      i++;
    }
    this.length = j;
  },
  
  length: 0,

  forEach: function(block, context) {
    var length = this.length;
    for (var i = 0; i < length; i++) {
      block.call(context, this[i], i, this);
    }
  },
  
  item: Array2.prototype.item,

  not: function(test, context) {
    return this.filter(not(test), context);
  },

  slice: function(start, end) {
    return new StaticNodeList(this.map(I).slice(start, end));
  },

  "@(XPathResult)": {
    constructor: function(nodes) {
      if (nodes && nodes.snapshotItem) {
        var length = this.length = nodes.snapshotLength, i = 0;
        while (i < length) this[i] = nodes.snapshotItem(i++);
      } else this.base(nodes);
    }
  }
}, {
  bind: function(staticNodeList) {
    Base.forEach (this.prototype, function(method, name) {
      if (staticNodeList[name] === undefined) {
        staticNodeList[name] = method;
      }
    });
    return staticNodeList;
  }
});

StaticNodeList.implement(Enumerable);

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

// =========================================================================
// DOM/selectors-api/NodeSelector.js
// =========================================================================

// http://www.w3.org/TR/selectors-api/#nodeselector

var NodeSelector = Interface.extend({
  "@(element.querySelector)": {
    querySelector: function(node, selector) {
      if (!_USE_BASE2.test(selector)) {
        try {
          return this.base(node, selector);
        } catch (x) {
          // assume it's an unsupported selector
        }
      }
      return new Selector(selector).exec(node, 1);
    },
    
    querySelectorAll: function(node, selector) {
      if (!_USE_BASE2.test(selector)) {
        try {
          return StaticNodeList.bind(this.base(node, selector));
        } catch (x) {
          // assume it's an unsupported selector
        }
      }
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

if (_element.querySelectorAll) { // http://code.google.com/p/base2/issues/detail?id=100
  _element.innerHTML = '<a id="X"></a>';
  if (_element.querySelectorAll("#X").length == 0) {
    NodeSelector.implement({
      querySelectorAll: function(node, selector) {
        if (/[A-Z]/.test(selector)) {
          if (!/^CSS/.test(Traversal.getDocument(node).compatMode)) {
            return new Selector(selector).exec(node);
          }
        }
        return this.base(node, selector);
      }
    });
  }
}

// automatically bind objects retrieved using the Selectors API on a bound node
extend(NodeSelector.prototype, {
  querySelector: function(selector) {
    return dom.bind(this.base(selector));
  },

  querySelectorAll: function(selector) {
    var match = this.base(selector);
    var i = match.length;
    while (i--) dom.bind(match[i]);
    return match;
  }
});

// =========================================================================
// DOM/selectors-api/CSSParser.js
// =========================================================================

var CSSParser = RegGrp.extend({
  constructor: function(items) {
    this.base(items);
    this.cache = {};
    this.sorter = new RegGrp;
    this.sorter.add(/:not\([^)]*\)/, RegGrp.IGNORE);
    // $1: tag name
    // $3: selector part
    // $4: *-child pseudo class
    // $6: selector part
    this.sorter.add(/([ >](\*|[\w-]+))([^: >+~]*)(:\w+-child(\([^)]+\))?)([^: >+~]*)/, "$1$3$6$4");
  },
  
  cache: null,
  ignoreCase: true,

  escape: function(selector) {
    // remove strings
    var strings = this._strings = [];
    return String(selector).replace(_CSS_ESCAPE, function(string) {
      if (string.indexOf("\\") != 0) {
        string = string.slice(1, -1).replace(_QUOTE, "\\'");
      }
      return "\x01" + strings.push(string) + "\x01";
    });
  },

  format: function(selector) {
    return this.normalise(this.escape(selector + ""));
  },
  
  normalise: function(selector) {
    return selector
      .replace(_CSS_TRIM, "$1")
      .replace(_CSS_LTRIM, "$1")
      .replace(_CSS_RTRIM, "$1")
      .replace(_CSS_IMPLIED_SPACE, "$1 $2")
      .replace(_CSS_IMPLIED_ASTERISK, "$1*$2");
    //.replace(/\\/g, "");
  },
  
  parse: function(selector, simple) {
    return this.cache[selector] ||
      (this.cache[selector] = this.revert(this.exec(this.format(selector, simple))));
  },

  put: function(pattern, value) {
    return this.base(pattern.replace(/ID/g, "\\w\u00a1-\uffff\\-\\x01"), value);
  },

  revert: function(selector) {
    return this.unescape(selector);
  },

  unescape: function(selector) {
    // put string values back
    var strings = this._strings;
    return selector.replace(_CSS_UNESCAPE, function(match, index) {
      return strings[index - 1];
    });
  }
});

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
  
  format: function(selector) {
    return this.base(selector).replace(/,/g, "\x02");
  },

  unescape: function(selector) {
    return this.base(selector).replace(/\\(.)/g, "$1");
  },

  revert: function(selector) {
    return this.base(selector
      .replace(/\[self::\*\]/g, "")   // remove redundant wild cards
      .replace(/(^|\x02)\//g, "$1./") // context
      .replace(/\x02/g, " | ")        // put commas back
    ).replace(/'[^'\\]*\\'(\\.|[^'\\])*'/g, function(match) { // escape single quotes
      return "concat(" + match.split("\\'").join("',\"'\",'") + ")";
    });
  },

  "@Opera(7|8|9\\.[0-4])": {
    revert: function(selector) {
      // Opera pre 9.5 does not seem to support last() but I can't find any
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
    "@!KHTML|Opera": { // this optimisation does not work on Safari/Opera (for elements not in the DOM)
      // fast id() search
      "(^|\\x02) (\\*|[ID]+)#([ID]+)": "$1id('$3')[self::$2]"
    },

    "@!KHTML": { // this optimisation does not work on Safari
      // optimise positional searches
      "([ >])(\\*|[ID]+):([\\w-]+-child(\\(([^)]+)\\))?)": function(match, token, tagName, pseudoClass, $4, args) {
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
      this[rescape(token) + "([ID]+)"] = replacement;
    },
    
    combinators: function(replacement, combinator) {
      this[rescape(combinator) + "(\\*|[ID]+)"] = replacement;
    },
    
    attributes: function(replacement, operator) {
      this["\\[([ID]+)" + rescape(operator) +  "([^\\]]*)\\]"] = replacement;
    },
    
    pseudoClasses: function(replacement, pseudoClass) {
      this[":" + pseudoClass.replace(/\(\)$/, pseudoClass == "not()" ? "\\((([^\\s>+~]|~=)+)\\)" : "\\(([^)]+)\\)")] = replacement;
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
//    "!=": "[not(@$1='$2')]",
      "=":  "[@$1='$2']"
    },
    
    pseudoClasses: { // pseudo class selectors
//    "link":             "[false]",
//    "visited":          "[false]",
      "contains()":       "[contains(.,'$1')]",
      "empty":            "[not(child::*) and not(text())]",
//    "lang()":           "[boolean(lang('$1') or boolean(ancestor-or-self::*[@lang][1][starts-with(@lang,'$1')]))]",
      "first-child":      "[not(preceding-sibling::*)]",
      "last-child":       "[not(following-sibling::*)]",
      "not()":            _xpath_not,
      "nth-child()":      _xpath_nthChild,
      "nth-last-child()": _xpath_nthChild,
      "only-child":       "[not(preceding-sibling::*) and not(following-sibling::*)]",
      "root":             "[not(parent::*)]"
    }
  },
  
  "@Opera(7|8|9\\.[1-4])": {
    build: function() {
      this.optimised.pseudoClasses["last-child"] = this.values.pseudoClasses["last-child"];
      this.optimised.pseudoClasses["only-child"] = this.values.pseudoClasses["only-child"];
      return this.base();
    }
  }
});

// =========================================================================
// DOM/selectors-api/Selector.js
// =========================================================================

// This object can be instantiated, however it is probably better to use
// the querySelector/querySelectorAll methods on DOM nodes.

// There is no public standard for this object.

// Usage:
//
// var sel = new Selector("span#example a:first-child");
// var nodes = sel.exec(document);
// var node = sel.exec(document, 1);
// var isMatch = sel.test(element);
// var xmlNodes = sel.exec(xmlDocument);

var Selector = Base.extend({
  constructor: function(selector) {
    this.toString = K(trim(selector));
  },

  exec: function(node, count) {
    return this.toDOMQuery()(node, count);
  },

  getSpecificity: function() {
    var selector = _parser.escape(this);
    if (selector.indexOf(",") == -1) {
      return match(selector, _SPECIFICITY_ID).length * 10000 +
        match(selector, _SPECIFICITY_CLASS).length * 100 +
        match(selector, _SPECIFICITY_TAG).length;
    } else {
      return -1;
    }
  },

  split: function() {
    return Array2.map(_parser.escape(this).split(","), function(selector) {
      return new Selector(_parser.unescape(selector));
    });
  },

  test: function(element) {
    return this.toDOMQuery(true)(element);
  },

  toDOMQuery: function(isTest) {
    var cache = _cache[isTest ? "test" : "exec"];
    if (!cache[this]) {
      var fn = "",
          args = ["e0,c"],
          states = [],
          vars = (isTest ? "" : "_query.complete=false;") + "_indexed++;" +
            "var r=[],l,d=e0.nodeType==9?e0:e0.ownerDocument||Traversal.getDocument(e0),t=d.getElementById?'toUpperCase':'toString',u,v={},k=0,p0;",
          tags = [],
          caches = [],
          selectors = _parser.format(this).split(","),
          isCommaSeparated = selectors.length > 1,
          group = 0;

      // Parses a single selector in a comma-separated list of selectors.
      var parseSelector = function(selector, isTest) {
        var block = "",
            combinators = _combinators[isTest ? "test" : "exec"],
            combinator,
            uniqueIDAssigned,
            cache = 0;
        if (isTest) selector = selector.replace(_CSS_CONTEXT, "");
        var tokens = match(selector, _TOKENIZER), token;

        if (isTest) tokens.reverse(); // process backwards when matching

        for (var j = 0; token = tokens[j]; j++) {
          var parsed = "";
          uniqueIDAssigned = false;
          if (_COMBINATOR.test(token)) {
            combinator = token;
            parsed += combinators[combinator];
            if (combinator == " " || combinator == ">") {
              if (!isTest && combinator == " " && tokens[j + 1].indexOf("*") == 0) { // read ahead to fix an IE5 bug
                parsed = parsed.replace(/\bT\b/, "'*'");
              }
              group++;
              cache++;
              if (!isTest) {
                states.push(group);
              }
            }
          } else {
            var parts = match(token, _PARSE_SIMPLE_SELECTOR),
                tagName = parts[1] || "*",
                simpleSelector = parts[2] || "",
                isWildCard = tagName == "*";
            if (!isWildCard) {
              tags.push(tagName);
            }
            if (isTest) {
              if (!isWildCard) {
                parsed += "if(e.nodeName==t){";
              }
            } else {
              if (isWildCard) {
                if (!_SUPPORTS_TRAVERSAL_API && combinator == "~") {
                  parsed += "if(" + _IS_ELEMENT + "){";
                }
                /*@if (@_jscript)
                  if (combinator == " " || combinator == ">") {
                    parsed += "if(e.nodeName!='" + (@_jscript_version < 5.6 ? "!" : "#comment") + "'){";
                  }
                @else @*/
                  if (!_SUPPORTS_CHILDREN && combinator == ">") {
                    parsed += "if(e.nodeType==1){";
                  }
                /*@end @*/
              } else if (combinator != " ") {
                parsed += "if(e.nodeName==t){";
              }
              if ((cache > 1 && combinator == " ") || combinator == "~") {
                parsed += _BREAK_ON_DUPLICATES;
                caches.push(group);
                uniqueIDAssigned = true;
              }
            }
            parsed += _parser.exec(simpleSelector);
          }

          block += parsed.replace(_VARIABLES, function(match, chr, string) {
            if (string) return string;
            return chr == "T" ? "t" + tags.length : chr == "t" ? chr + (tags.length - 1) : chr == "E" ? "e" + (group - 1) : chr + group;
          });
        }
        if (isCommaSeparated) {
          var testDuplicates = "";
          if (!uniqueIDAssigned) {
            testDuplicates = _ASSIGN_ID;
          }
          if (!_IS_INDEXED) {
            if (i == 0) {
              testDuplicates += "v[u]=1;";
            } else {
              testDuplicates += "if(!v[u]){v[u]=1;";
            }
          }
          block += format(testDuplicates, group);
        }
        return block;
      };

      // Process the end of a selector.
      var closeBlock = function(block) {
        if (isTest) {
          block += "return true;"
        } else {
          var store = "if(c==1)return e%1;";
          if (isCommaSeparated && _IS_INDEXED) {
            // Store elements in the array using sourceIndex, this avoids having to sort later.
            store += "r[u]=e%1;k++;";
          } else {
            store += "r[k++]=e%1;";
          }
          store += "if(k===c){_query.state=[%state%];return r;";
          block += format(store, group);
        }
        block += Array(match(block, /\)\{/g).length + 1).join("}");
        if (isCommaSeparated && !isTest && !_IS_INDEXED) {
          // Only mark the results as unsorted if this block has added to the results.
          block += "if(l&&r.length>l)r.unsorted=1;l=r.length;";
        }
        return block;
      };

      _reg = []; // store for RegExp objects

      // Loop through comma-separated selectors.
      for (var i = 0; i < selectors.length; i++) {
        var selector = selectors[i];
        if (i > 0) fn +=  "e" + group + "=e0;";
        var indexOfID = selector.lastIndexOf("#");
        if (isTest || indexOfID == -1) {
          fn += closeBlock(parseSelector(selector, isTest));
        } else {
          // Query with an ID selector
          var matchBy = selector.slice(0, indexOfID),
              parts = match(selector.slice(indexOfID), _PARSE_ID_SELECTOR),
              id = parts[1] || "",
              selectBy = parts[2] || "";
          // Use a standard query for XML documents, disconnected elements and platforms
          // with broken getElementById().
          var block = parseSelector(selector, isTest);
          fn += "if(!_byId||!d.getElementById||(e0!=d&&Node.compareDocumentPosition(e0,d)&1)){" + closeBlock(block) + "}";
          // Now build an optimised query to get the element by ID.
          fn += format("else{var e%1=_byId(d,'%2');if(e%1&&(e0==d||Traversal.contains(e0,e%1))){", ++group, id);
          // Build an inner query to validate the left hand side of the ID selector
          var query = "";
          if (matchBy.replace(_CSS_CONTEXT, "")) {
            var currentGroup = group; // preserve group index while we build an inner query
            query = "var q" + group + "=function(e0){";
            group = 0;
            query += parseSelector(matchBy, true) + "return true";
            query += Array(match(query, /\)\{/g).length + 1).join("}") + ";";
            group = currentGroup;
          }
          block = query ? "if(q" + group + "(e" + group + ")){" : "";
          // Build the remainder of the query (after the ID part).
          block += parseSelector(selectBy);
          fn += query + closeBlock(block) + "}}";
        }
      }
      /*@if (@_jscript_version < 5.6)
        fn = fn.replace(/getElementsByTagName\('\*'\)/g, "all");
      /*@end @*/
      vars += "var reg=[" + _reg.join(",") + "];";
      vars += Array2.map(tags, function(tagName, i) {
        return "var t" + i + "='" + tagName + "'" + (tagName == tagName.toUpperCase() ? ";" : "[t]();");
      }).join("");
      vars += Array2.map(caches, function(group) {
        return "var s" + group + "={};";
      }).join("");
      forEach (states, function(group, i) {
        states[i] = "i" + group;
        args.push("a" + group);
      });
      fn = _parser.unescape(vars + fn);
      fn += isTest ? ";return false" : "_query.state=[%state%];_query.complete=true;return c==1?null:r";
      fn = fn.replace(/%state%/g, states.join(","));
      eval("var _query=function(" + args.join(",") + "){" + fn + "}");
      cache[this] = _query;
    }
    return cache[this];
  },

  toXPath: function() {
    if (!_xpathParser) _xpathParser = new XPathParser;
    return _xpathParser.parse(this);
  },

  "@(XPathResult)": {
    exec: function(node, count) {
      // use DOM methods if the XPath engine can't be used
      if (_NOT_XPATH.test(this)) {
        return this.base(node, count);
      }
      var document = Traversal.getDocument(node);
      var type = count == 1
        ? 9 /* FIRST_ORDERED_NODE_TYPE */
        : 7 /* ORDERED_NODE_SNAPSHOT_TYPE */;
      var result = document.evaluate(this.toXPath(), node, null, type, null);
      return count == 1 ? result.singleNodeValue : result;
    }
  },

  "@(jscript)": { // use MSIE's XPath engine for XML
    exec: function(node, count) {
      if (typeof node.selectNodes != "undefined" && !_NOT_XPATH.test(this)) {
        var document = Traversal.getDocument(node),
            method = count == 1 ? "selectSingleNode" : "selectNodes";
        document.setProperty("SelectionLanguage", "XPath");
        return node[method](this.toXPath());
      }
      return this.base(node, count);
    }
  },

  "@(true)": {
    exec: function(node, count) {
      this.base;
      var result = _catchSelectorError(this, node || document, count);
      return count == 1 ? result : new StaticNodeList(result);
    },
    
    test: function(element) {
      this.base;
      return !!_catchSelectorError(this, element);
    }
  }
});

// =========================================================================
// DOM/selectors-api/_parser.js
// =========================================================================

var _IS_INDEXED              = detect("(element.sourceIndex)"),
    _SUPPORTS_CHILDREN       = detect("(element.children)"),
    _SUPPORTS_TRAVERSAL_API  = detect("(element.nextElementSibling)"),
    _ID                      = _IS_INDEXED ? "e.sourceIndex" : "e.uniqueID||assignID(e)",
    _ASSIGN_ID               = "u=" + _ID.replace(/\be\b/g, "e%1") + ";",
    _IS_ELEMENT              = "e.nodeType==1",
    _BREAK_ON_DUPLICATES     = "u=" + _ID + ";if(s[u])break;s[u]=1;",
    _PARSE_SIMPLE_SELECTOR   = new RegExp("^(\\*|[\\w\u00a1-\uffff\\-\\x01]+)?(.*)$"),
    _PARSE_ID_SELECTOR       = new RegExp("^#([\\w\u00a1-\uffff\\-\\x01]+)?(.*)$"),
    _TOKENIZER               = /[^\s>+]+(~=|n\+\d)[^\s>+]+|[^\s>+~]+|[\s>+~]/g,
    _VARIABLES               = /\b([aeEijnpstT])\b|('[^']+')/g;
    
/*@if (@_jscript_version < 5.6)
  _IS_ELEMENT += "&&e.nodeName!='!'";
/*@end @*/

// variables used by the parser

var _reg   = [],        // a store for RexExp objects
    _cache = {exec:{}, test:{}}; // store parsed selectors

var _combinators = {
  exec: extend({}, {
    " ": "var i,e,p,n=E.getElementsByTagName(T);for(i=a||0;e=n[i];i++){",
    ">": "var i,e,p,n=E." + (_SUPPORTS_CHILDREN ? "children" : "childNodes") + ";for(i=a||0;e=n[i];i++){",
    "+": "while((e=e.nextSibling)&&!(" + _IS_ELEMENT + "))continue;if(e){",
    "~": "while((e=e.nextSibling)){",
    "@(element.nextElementSibling)": {
      "+": "e=e.nextElementSibling;if(e){",
      "~": "while((e=e.nextElementSibling)){"
    }
  }),

  test: {
    " ": "var e=E;while((e=e." + _PARENT + ")){",
    ">": "var e=E." + _PARENT + ";if(e){"
  }
};

_combinators.test["+"] = _combinators.exec["+"].replace("next", "previous");
_combinators.test["~"] = _combinators.exec["~"].replace("next", "previous");

var _pseudoClasses = extend({}, {
  "checked":     "e.checked",
  "contains":    "e." + Traversal.TEXT_CONTENT + ".indexOf('%1')!=-1",
  "disabled":    "e.disabled===true",
  "empty":       "Traversal.isEmpty(e)",
  "enabled":     "e.disabled===false",
  "first-child": "!(e.previousSibling&&Traversal.getPreviousElementSibling(e))",
  "last-child":  "!(e.nextSibling&&Traversal.getNextElementSibling(e))",
  "@(element.nextElementSibling)": {
    "first-child": "!e.previousElementSibling",
    "last-child":  "!e.nextElementSibling"
  },
  "root":        "e==d.documentElement",
  "target":      "e.id&&Element.getAttribute(e,'id')==d.location.hash.slice(1)",
  "hover":       "DocumentState.getInstance(d).isHover(e)",
  "active":      "DocumentState.getInstance(d).isActive(e)",
  "focus":       "DocumentState.getInstance(d).hasFocus(e)",
  "link":        "d.links&&Array2.contains(d.links,e)",
  "visited":     "false" // not implemented (security)
// not:          // defined elsewhere
// nth-child:
//"only-child":
});

_pseudoClasses["only-child"] = _pseudoClasses["first-child"] + "&&" + _pseudoClasses["last-child"];

var _operators = {
  "=":  "%1=='%2'",
//"!=": "%1!='%2'", //  not standard but other libraries support it
  "~=": /(^| )%1( |$)/,
  "|=": /^%1(-|$)/,
  "^=": /^%1/,
  "$=": /%1$/,
  "*=": /%1/
};
_operators[""] = "%1";

var _parser = new CSSParser({
  ":not\\((\\*|[ID]+)?(([^\\s>+~]|~=)+)\\)": function(match, tagName, filters) { // :not pseudo class
    var replacement = (tagName && tagName != "*") ? "if(e.nodeName!='" + tagName + "'){" : "";
    replacement += _parser.exec(filters).replace(/if\(\(/g, "if(!(");
    return replacement;
  },

  "#([ID]+)": "if(((e.submit?Element.getAttribute(e,'id'):e.id)=='$1')){", // ID selector

  "\\.([ID]+)": function(match, className) { // class selector
    // Store RegExp objects - slightly faster on MSIE
    _reg.push(new RegExp("(^|\\s)" + rescape(className) + "(\\s|$)"));
    return "if((e.className&&reg[" + (_reg.length - 1) + "].test(e.className))){";
  },

  ":nth(-last)?-child\\(([^)]+)\\)": function(match, last, args) { // :nth-child pseudo classes
    return "p=_register(e.parentNode);" + format(_ASSIGN_ID, "") +
      "var j=p[u];if((" + _nthChild(match, args, "j", "p.length", "!", "&&", "% ", "==") + ")){";
  },

  ":([a-z\\-]+)(\\(([^)]+)\\))?": function(match, pseudoClass, $2, args) { // other pseudo class selectors
    return "if((" + format(_pseudoClasses[pseudoClass] || "throw", args) + ")){";
  },

  "\\[([ID]+)([^=]?=)?([^\\]]*)\\]": function(match, attr, operator, value) { // attribute selectors
    value = trim(value);
    if (attr == "class") {
      var getAttribute = "e.className";
    } else {
      var method = (operator ? "get" : "has") + "Attribute";
      if (Element.prototype[method]) { // base2 does not trust the native method
        getAttribute = "Element." + method + "(e,'" + attr + "')";
      } else { // base2 thinks the native method is spiffing
        getAttribute = "e." + method + "('" + attr + "')";
      }
    }
    var replacement = _operators[operator || ""];
    if (instanceOf(replacement, RegExp)) {
      _reg.push(new RegExp(format(replacement.source, rescape(_parser.unescape(value)))));
      replacement = "reg[%2].test(%1)";
      value = _reg.length - 1;
    }
    return "if((" + format(replacement, getAttribute, value) + ")){";
  }
});

// =========================================================================
// DOM/selectors-api/implementations.js
// =========================================================================

// Apply the NodeSelector interface

Document.implement(NodeSelector);
Element.implement(NodeSelector);

// Allow the Selector engine to be extended.

Selector.pseudoClasses = _pseudoClasses;
Selector.operators = _operators;

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
    /*@if (@_jscript)
      for (var name, i = 0; name = _PREFIXES[i]; i++) {
        name += "Attribute";
        element["_" + name] = element[name];
      }
    /*@end @*/
    return this.base(element);
  },

  extend: function() {
    // Maintain HTML element bindings.
    // This allows us to map specific interfaces to elements by reference
    // to tag name.
    var binding = this.base.apply(this, arguments);
    forEach.csv(binding.tags, function(tagName) {
      HTMLElement.bindings[tagName] = binding;
    });
    return binding;
  }
});

HTMLElement.extend(null, {
  tags: "APPLET,EMBED,OBJECT,IFRAME",
  bind: I // Binding not allowed for these elements.
});

// Build HTMLElement.prototype using global functions to avoid memory leaks.

var _PREFIXES = "get,set,has,remove".split(",");

/*@if (@_jscript_version < 5.7)
  for (var i in HTMLElement.prototype) {
    if (i != "base" && i != "extend") {
      HTMLElement.prototype[i] = new Function("var a=base2.js.Array2.slice(arguments),m=base2.dom.HTMLElement."+i+";a.unshift(this);return m.apply(m,a)");
    }
  }
/*@end @*/

// =========================================================================
// DOM/html/ClassList.js
// =========================================================================

// http://www.whatwg.org/specs/web-apps/current-work/#domtokenlist0

// I'm not supporting length/index(). What's the point?

var ClassList = Module.extend({
  add: function(element, token) {
    if (!ClassList.contains(element, token)) {
      element.className += (element.className ? " " : "") + token;
    }
  },

  contains: function(element, token) {
    var regexp = new RegExp("(^|\\s)" + token + "(\\s|$)");
    return regexp.test(element.className || "");
  },

  remove: function(element, token) {
    var regexp = new RegExp("(^|\\s)" + token + "(\\s|$)", "g");
    element.className = trim(element.className.replace(regexp, "$2"));
  },

  toggle: function(element, token) {
    ClassList[ClassList.has(element, token) ? "remove" : "add"](element, token);
  }
});

// a constructor that binds ClassList objects to elements
var _ElementClassList = new Function("e", Array2.reduce(String2.csv("add,contains,remove,toggle"), function(body, method) {
  return body += "this." + method + "=function(t){return base2.dom.ClassList."+ method + "(e,t)};"
}, ""));

ClassList.has = ClassList.contains;

// =========================================================================
// DOM/cssom/header.js
// =========================================================================

// Quite a lot of browser sniffing here. It's not really possible to feature
// detect all of the various bugs. Newer browsers mostly get it right though.

var _TABLE_TH_TD  = /^(TABLE|TH|TD)$/,
    _QUIRKS_MODE  = detect("QuirksMode"),
    _MSIE6        = detect("MSIE6"),
    _FIX_BORDER   = detect("Webkit5") ? _TABLE_TH_TD :
                    detect("Opera8") ? {
                      test: function(nodeName) {
                        return !_TABLE_TH_TD.test(nodeName)
                      }
                    } : {
                      test: False
                    };
                  
var _offsets = new Base({
  getBodyClient: function(document) {
    var left = 0,
        top = 0,
        view = document.defaultView,
        body = document.body,
        bodyStyle = ViewCSS.getComputedStyle(view, body, null),
        position = bodyStyle.position,
        isAbsolute = position != "static";
        
    if (isAbsolute) {
      left += parseInt(bodyStyle.left) + parseInt(bodyStyle.marginLeft);
      top  += parseInt(bodyStyle.top) + parseInt(bodyStyle.marginTop);
      if (position == "relative") {
        var rootStyle = ViewCSS.getComputedStyle(view, document.documentElement, null);
        left += parseInt(rootStyle.paddingLeft) + parseInt(rootStyle.borderLeftWidth);
        top  += parseInt(rootStyle.paddingTop) + parseInt(rootStyle.borderTopWidth);
        // MSIE6 stores the margin but doesn't apply it.
        if (!_MSIE6) {
          left += parseInt(rootStyle.marginLeft);
          top += parseInt(rootStyle.marginTop);
        }
      }
    } else {
      var dummy = document.createElement("div");
      body.insertBefore(dummy, body.firstChild);
      left += dummy.offsetLeft - parseInt(bodyStyle.paddingLeft);
      top += dummy.offsetTop - parseInt(bodyStyle.paddingTop);
      body.removeChild(dummy);
    }

    return {
      position: position,
      isAbsolute: isAbsolute,
      left: left,
      top: top
    };
  },

  getBodyOffset: function(document) {
    var client = this.getBodyClient(document),
        view = document.defaultView,
        body = document.body;
    
    return {
      isAbsolute: client.isAbsolute,
      left: client.left + parseInt(ViewCSS.getComputedPropertyValue(view, body, "borderLeftWidth")),
      top: client.top + parseInt(ViewCSS.getComputedPropertyValue(view, body, "borderTopWidth"))
    };
  },

  getViewport: function(document) {
    var view = document.defaultView,
        documentElement = document.documentElement;
    return {
      left: parseInt(ViewCSS.getComputedPropertyValue(view, documentElement, "marginLeft")),
      top: parseInt(ViewCSS.getComputedPropertyValue(view, documentElement, "marginTop"))
    };
  },

  getGeckoRoot: function(document) {
    var rootStyle = document.defaultView.getComputedStyle(document.documentElement, null);
        
    return {
      x: parseInt(rootStyle.marginLeft) + parseInt(rootStyle.borderLeftWidth),
      y: parseInt(rootStyle.marginTop) + parseInt(rootStyle.borderTopWidth)
    };
  },

  "@MSIE.+QuirksMode": {
    getViewport: K({left: 0, top: 0})
  },

  "@(true)": {
    getBodyClient: _memoise(1),
    getBodyOffset: _memoise(2),
    getViewport: _memoise(3),
    getGeckoRoot: _memoise(4)
  }
});

function _memoise(type) {
  return function(document) {
    var key = type + (document.base2ID || assignID(document));
    if (!_memoise[key]) _memoise[key] = this.base(document);
    return _memoise[key];
  };
};

// =========================================================================
// DOM/cssom/ElementView.js
// =========================================================================

// http://www.w3.org/TR/cssom-view/#the-elementview

var ElementView = Interface.extend({
  "@!(element.getBoundingClientRect)": {
    getBoundingClientRect: function(element) {
      var document = element.ownerDocument;

      switch (element.nodeName) {
        case "HTML":
          var offset = _offsets.getViewport(document);
          break;
        case "BODY":
          offset = _offsets.getBodyClient(document);
          break;
        default:
          var left = element.offsetLeft,
              top = element.offsetTop,
              view = document.defaultView,
              documentElement = document.documentElement,
              computedStyle = view.getComputedStyle(element, null);
              offsetParent = element.offsetParent;

          while (offsetParent && (offsetParent != documentElement || computedStyle.position == "static")) {
            left += offsetParent.offsetLeft - offsetParent.scrollLeft;
            top += offsetParent.offsetTop - offsetParent.scrollTop;

            computedStyle = view.getComputedStyle(offsetParent, null);
            
            if (_FIX_BORDER.test(offsetParent.nodeName)) {
              if (offsetParent.clientLeft === undefined) {
                left += parseInt(computedStyle.borderLeftWidth);
                top  += parseInt(computedStyle.borderTopWidth);
              } else {
                left += offsetParent.clientTop;
                top  += offsetParent.clientLeft;
              }
            }
            offsetParent = offsetParent.offsetParent;
          }
          offset = {
            left: left,
            top: top
          };
      }

      return {
        top:    offset.top,
        right:  offset.left + element.clientWidth,
        bottom: offset.top + element.clientHeight,
        left:   offset.left
      };
    },

    "@Webkit5": {
      getBoundingClientRect: function(element) {
        // Tweak the above result for Safari 3.x if the document body is absolutely positioned.

        var clientRect = this.base(element);

        if (element.nodeName != "HTML") {
          var document = element.ownerDocument,
              offset = _offsets.getBodyOffset(document);
          if (!offset.isAbsolute) {
            offset = _offsets.getViewport(document)
          }
          clientRect.left += offset.left;
          clientRect.top += offset.top;
        }

        return clientRect;
      }
    },

    "@(document.getBoxObjectFor)": {
      getBoundingClientRect: function(element) {
        var document = element.ownerDocument,
            view = document.defaultView,
            documentElement = document.documentElement,
            box = document.getBoxObjectFor(element),
            computedStyle = view.getComputedStyle(element, null),
            left = box.x - parseInt(computedStyle.borderLeftWidth),
            top = box.y - parseInt(computedStyle.borderTopWidth),
            parentNode = element.parentNode;

        if (element != documentElement) {
          while (parentNode && parentNode != documentElement) {
            left -= parentNode.scrollLeft;
            top -= parentNode.scrollTop;
            computedStyle = view.getComputedStyle(parentNode, null);
            if (computedStyle.position != "absolute") {
              left += parseInt(computedStyle.borderTopWidth);
              top  += parseInt(computedStyle.borderLeftWidth);
            }
            parentNode = parentNode.parentNode;
          }

          if (computedStyle.position != "fixed") {
            left -= view.pageXOffset;
            top -= view.pageYOffset;
          }

          var bodyPosition = view.getComputedStyle(document.body, null).position;
          if (bodyPosition == "relative") {
            var offset = document.getBoxObjectFor(documentElement);
          } else if (bodyPosition == "static") {
            offset = _offsets.getGeckoRoot(document);
          }
          if (offset) {
            left += offset.x;
            top += offset.y;
          }
        }
        
        return {
          top: top,
          right: left + element.clientWidth,
          bottom: top + element.clientHeight,
          left: left
        };
      }
    }
  },

  "@(jscript)": {
    getBoundingClientRect: function(element) {
      // MSIE doesn't bother to calculate client rects for the documentElement.

      var clientRect = this.base(element);

      if (element.nodeName == "HTML") {
        var document = Traversal.getDocument(element),
            viewport = _offsets.getViewport(document),
            documentElement = document.documentElement,
            left = viewport.left - documentElement.scrollLeft,
            top = viewport.left - documentElement.scrollTop;
        clientRect = {
          top: top,
          right: left + clientRect.right - clientRect.left,
          bottom: top + clientRect.bottom - clientRect.top,
          left: left
        };
      }
      
      return clientRect;
    }
  },

  "@Gecko1\\.9([^\\.]|\\.0)": { // bug in Gecko1.9.0 only
    getBoundingClientRect: function(element) {
      var clientRect = this.base(element);

      if (element.nodeName != "HTML" && _offsets.getBodyClient(element.ownerDocument).position == "absolute") {
        var offset = _offsets.getGeckoRoot(document);
        return {
          top:    clientRect.top - offset.y,
          right:  clientRect.right - offset.x,
          bottom: clientRect.bottom - offset.y,
          left:   clientRect.left - offset.x
        };
      }

      return clientRect;
    }
  }
}, {
  getOffsetFromBody: function(element) {
    var left = 0,
        top = 0;

    if (element.nodeName != "BODY") {
      var document = Traversal.getOwnerDocument(element),
          view = document.defaultView,
          documentElement = document.documentElement,
          body = document.body,
          clientRect = this.getBoundingClientRect(element);
          
      left = clientRect.left + Math.max(documentElement.scrollLeft, body.scrollLeft);
      top = clientRect.top + Math.max(documentElement.scrollTop, body.scrollTop);

      var bodyOffset = _offsets.getBodyOffset(document);

      /*@if (@_jscript)
        if (_MSIE6 && body.currentStyle.position != "relative") {
          left -= documentElement.clientLeft;
          top -= documentElement.clientTop;
        }
        if (@_jscript_version == 5.7 || document.documentMode == 7) {
          var rect = documentElement.getBoundingClientRect();
          left -= rect.left;
          top -= rect.top;
        }
        if (_QUIRKS_MODE) {
          left -= body.clientLeft;
          top -= body.clientTop;
          bodyOffset.isAbsolute = false;
        }
      /*@end @*/

      if (bodyOffset.isAbsolute) {
        left -= bodyOffset.left;
        top -= bodyOffset.top;
      }
    }
    
    return {
      left: left,
      top: top
    };
  },

  "@!(element.getBoundingClientRect)": {
    "@Webkit5": {
      getOffsetFromBody: function(element) {
        // Tweak the above result for Safari 3.x if the document body is absolutely positioned.

        var elementOffset = this.base(element);

        if (element.nodeName != "HTML") {
          var document = element.ownerDocument,
              offset = _offsets.getBodyOffset(document);
          if (!offset.isAbsolute) {
            offset = _offsets.getViewport(document)
          }
          elementOffset.left -= offset.left;
          elementOffset.top -= offset.top;
        }

        return elementOffset;
      }
    }
  },

  "@Gecko1\\.([^9]|9(\\.0|[^\\.]))": {
    getOffsetFromBody: function(element) {
      var offset = this.base(element);

      // slightly different rules when the body is absolutley positioned
      if (!_offsets.getBodyClient(element.ownerDocument).isAbsolute) {
        var rootOffset = _offsets.getGeckoRoot(document);
        offset.left -= rootOffset.x;
        offset.top -= rootOffset.y;
      }

      return offset;
    }
  },

  // Manage offsetX/Y.
  
  getOffsetXY: function(element, clientX, clientY) { // slightly faster if clientLeft/Top are defined
    var clientRect = this.getBoundingClientRect(element);
    return {
      x: clientX - clientRect.left - element.clientLeft,
      y: clientY - clientRect.top - element.clientTop
    }
  },

  "@!(element.clientLeft)": {
    getOffsetXY: function(element, clientX, clientY) {
      var clientRect = this.getBoundingClientRect(element),
          computedStyle = element.ownerDocument.defaultView.getComputedStyle(element, null);
      return {
        x: clientX - clientRect.left - parseInt(computedStyle.borderLeftWidth),
        y: clientY - clientRect.top - parseInt(computedStyle.borderTopWidth)
      }
    }
  }
});

// =========================================================================
// DOM/cssom/implementations.js
// =========================================================================

// Apply the ElementView interface to HTMLElement

HTMLElement.implement(ElementView);

// =========================================================================
// dom/DocumentState.js
// =========================================================================

// Store some state for HTML documents.
// Used for fixing event handlers and supporting the Selectors API.

var DocumentState = Base.extend({
  init: function(document) {
    this.document = document;
    this.events = {};
    this._hoverElement = document.documentElement;
    var EVENT_HANDLER = /^on((DOM)?\w+|[a-z]+)$/;
    forEach (this, function(method, name, documentState) {
      if (EVENT_HANDLER.test(name)) {
        documentState.registerEvent(name.slice(2));
      }
    });
  },

  hasFocus: function(element) {
    return element == this._focusElement;
  },

  isActive: function(element) {
    return Traversal.includes(element, this._activeElement);
  },

  isHover: function(element) {
    return Traversal.includes(element, this._hoverElement);
  },

  handleEvent: function(event) {
    if (!event._userGenerated) {
      this["on" + event.type](event);
    }
  },

  onblur: function(event) {
    delete this._focusElement;
  },

  onmouseover: function(event) {
    this._hoverElement = event.target;
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

  "@!(document.activeElement)": {
    init: function(document) {
      this.base(document);
      if (dom.isBound(document)) {
        document.activeElement = document.body;
      }
    },

    onfocus: function(event) {
      this.base(event);
      if (dom.isBound(this.document)) {
        this.document.activeElement = this._focusElement;
      }
    },

    onblur: function(event) {
      this.base(event);
      if (dom.isBound(this.document)) {
        this.document.activeElement = this.document.body;
      }
    }
  },

  "@!(element.addEventListener)": {
    init: function(document) {
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

    registerEvent: function(type, target) { //-@DRE
      var events = this.events[type],
          targetIsWindow = target && target.Infinity,
          canDelegate = !targetIsWindow && !_CANNOT_DELEGATE.test(type);
      if (!events || !canDelegate) {
        if (!events) events = this.events[type] = {};
        if (canDelegate || !target) target = this.document;
        if (!target) target = this.document;
        this.addEvent(type, target);
      }
      return events;
    },

    addEvent: function(type, target) {
      var state = this;
      target["on" + type] = function(event) {
        if (!event) {
          event = Traversal.getDefaultView(this).event;
        }
        if (event) state.handleEvent(event);
      };
    },

    "@(element.attachEvent)": {
      init: function(document) {
        this.base(document);
        var forms = {};
        this._registerForm = function(form) {
          var formID = assignID(form);
          if (!forms[formID]) {
            forms[formID] = true;
            _private.attachEvent(form, "onsubmit", this._dispatch);
            _private.attachEvent(form, "onreset", this._dispatch);
          }
        };
        var state = this;
        this._onselect = function(event) {
          if (state._activeElement == event.target) {
            state._selectEvent = copy(event);
          } else {
            state._dispatch(event);
          }
        };
      },
      
      registered: {},

      fireEvent: function(type, event) {
        event = Event.cloneEvent(event);
        event.type = type;
        this.handleEvent(event);
      },

      addEvent: function(type, target) {
        var key = assignID(target) + type;
        if (!this.registered[key] && target["on" + type] !== undefined) {
          this.registered[key] = true;
          var state = this;
          _private.attachEvent(target, "on" + type, function(event) {
            /*@if (@_jscript_version < 5.6)
            if (event.srcElement && !event.srcElement.nodeName) return;
            /*@end @*/
            event.target = event.srcElement || target;
            state.handleEvent(event);
            if (state["after" + type]) {
              state["after" + type](event);
            }
          });
        }
      },

      onDOMContentLoaded: function(event) {
        forEach (event.target.forms, this._registerForm, this);
        this.activate(this.document.activeElement);
      },

      onmousedown: function(event) {
        this.base(event);
        this._button = event.button;
      },

      onmouseup: function(event) {
        this.base(event);
        if (!event._userGenerated && this._button == null) {
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
        this.activate(event.target);
        this.onfocus(event);
      },

      activate: function(element) {
        var change = this.events.change && element.onchange !== undefined,
           select = this.events.select && element.onselect !== undefined;
        if (change || select) {
          var dispatch = this._dispatch, onselect = this._onselect;
          if (change) _private.attachEvent(element, "onchange", dispatch);
          if (select) _private.attachEvent(element, "onselect", onselect);
          var onblur = function() {
            _private.detachEvent(element, "onblur", onblur, true);
            if (change) _private.detachEvent(element, "onchange", dispatch);
            if (select) _private.detachEvent(element, "onselect", onselect);
          };
          _private.attachEvent(element, "onblur", onblur);
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
        if (!event._userGenerated) this.fireEvent("click", event);
      },

      "@!(element.onfocusin)": {
        init: function(document) {
          this.base(document);
          var state = this, activeElement = document.activeElement;
          _private.attachEvent(document, "onpropertychange", function(event) {
            if (event.propertyName == "activeElement") {
              if (activeElement) {
                _private.attachEvent(activeElement, "onblur", onblur);
              }
              activeElement = document.activeElement;
              if (activeElement) {
                _private.attachEvent(activeElement, "onfocus", onfocus);
                state.activate(activeElement);
              }
            }
          });
          function onfocus(event) {
            _private.detachEvent(event.srcElement, "onfocus", onfocus);
            event.target = event.srcElement;
            state.handleEvent(event);
          };
          function onblur(event) {
            _private.detachEvent(event.srcElement, "onblur", onblur);
            event.target = event.srcElement;
            state.handleEvent(event);
          };
        }
      }
    }
  }
}, {
  createState: function(document) {
    var base2ID = assignID(document);
    if (!this[base2ID] && !Traversal.isXML(document)) {
      this[base2ID] = new this();
      this[base2ID].init(document);
    }
    return this[base2ID];
  },

  getInstance: function(node) {
    var document = Traversal.getDocument(node);
    return this[document.base2ID] || this.createState(document);
  }
});

DocumentState.createState(document);
new DOMContentLoadedEvent(document);

eval(this.exports);

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
