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
// DOM/strict/package.js
// =========================================================================

// employ strict validation of DOM calls

eval(base2.namespace);
eval(DOM.namespace);
eval(lang.namespace);

// =========================================================================
// DOM/strict/DocumentEvent.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-DocumentEvent

DocumentEvent.implement({
  createEvent: function(document, type) {
    assertArity(arguments);
    assert(Traversal.isDocument(document), "Invalid object.");
    return this.base(document, type);
  }
});

// =========================================================================
// DOM/strict/EventTarget.js
// =========================================================================

EventTarget.implement({
  addEventListener: strictEventListener,

  dispatchEvent: function(target, event) {
    assertArity(arguments);
    assertEventTarget(target);
    assert(event && event.type, "Invalid event object.", TypeError);
    return this.base(target, event);
  },

  removeEventListener: strictEventListener
});

function strictEventListener(target, type, listener, capture) {
  assertArity(arguments);
  assertEventTarget(target);
  assertType(listener.handleEvent || listener, "function", "Invalid event listener.");
  assertType(capture, "boolean", "Invalid capture argument.");
  return this.base(target, type, listener, capture);
};

function assertEventTarget(target) {
  assert(target == window || Traversal.isDocument(target) || Traversal.isElement(target), "Invalid event target.", TypeError);
};

if (detect("Gecko")) {
  EventTarget.removeEventListener._delegate = "removeEventListener";
  delete EventTarget.prototype.removeEventListener;
}

// =========================================================================
// DOM/strict/NodeSelector.js
// =========================================================================

NodeSelector.implement({ 
  querySelector:    strictNodeSelector,
  querySelectorAll: strictNodeSelector
});

function strictNodeSelector(node, selector) {
  assertArity(arguments);
  assert(Traversal.isDocument(node) || Traversal.isElement(node), "Invalid object.", TypeError);
  return this.base(node, selector);
};

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
