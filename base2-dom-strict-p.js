/*
  base2 - copyright 2007-2009, Dean Edwards
  http://code.google.com/p/base2/
  http://www.opensource.org/licenses/mit-license.php

  Contributors:
    Doeke Zanstra
*/
new function(_0){eval(base2.namespace);eval(DOM.namespace);eval(lang.namespace);DocumentEvent.implement({createEvent:function(a,b){assertArity(arguments);assert(Traversal.isDocument(a),"Invalid object.");return this.base(a,b)}});EventTarget.implement({addEventListener:strictEventListener,dispatchEvent:function(a,b){assertArity(arguments);assertEventTarget(a);assert(b&&b.type,"Invalid event object.",TypeError);return this.base(a,b)},removeEventListener:strictEventListener});function strictEventListener(a,b,c,d){assertArity(arguments);assertEventTarget(a);assertType(c.handleEvent||c,"function","Invalid event listener.");assertType(d,"boolean","Invalid capture argument.");return this.base(a,b,c,d)};function assertEventTarget(a){assert(a==window||Traversal.isDocument(a)||Traversal.isElement(a),"Invalid event target.",TypeError)};if(detect("Gecko")){EventTarget.removeEventListener._1="removeEventListener";delete EventTarget.prototype.removeEventListener}NodeSelector.implement({querySelector:strictNodeSelector,querySelectorAll:strictNodeSelector});function strictNodeSelector(a,b){assertArity(arguments);assert(Traversal.isDocument(a)||Traversal.isElement(a),"Invalid object.",TypeError);return this.base(a,b)}};