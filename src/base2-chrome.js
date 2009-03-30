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
// chrome/package.js
// =========================================================================

// Browser chrome.

// Credits: some code written by Erik Arvidsson.

base2.global.chrome = new base2.Package(this, {
  name:    "chrome",
  version: "0.5",
  imports: "Enumerable,Function2,DOM,jsb",
  exports: "Popup,MenuList,ToolTip,dropdown,combobox,number,range,progressbar,slider,spinner,timepicker,datepicker,weekpicker,monthpicker,colorpicker",
  parent:  base2.jsb
});

eval(this.imports);

EventTarget.addEventListener(document, "textresize", function() {
  Array2.batch(document.getElementsByTagName("input"), function(input,i) {
    var type = input.className.replace(/^.*jsb\-(\w+).*$/, "$1"),
        behavior = chrome[type];
    if (behavior) behavior.layout(input);
  }, 100);
}, false);

/*if (detect("MSIE6")) {
  try {
    document.execCommand("BackgroundImageCache", false, true);
  } catch (ex) {}
}*/

// =========================================================================
// chrome/header.js
// =========================================================================

var PX = "px";

var _ACTIVE = "\x5factive",
    _HOVER  = "\x5fhover",
    _FOCUS  = "\x5ffocus",
    _TIMER  = "\x5ftimer";

var _timers   = {}, // store for timeouts
    _preventScroll = {
      onfocus: function(element, event) {
        if (!element.onscroll) {
          element.scrollTop = 0;
          element.onscroll = _resetScroll;
        }
        this.base(element, event);
      }
    };

function _resetScroll() {
  this.scrollTop = 0;
};

function _layout(element) {
  this.layout(element);
};

function _date_onchange(element) {
  if (element.value == "" || this.getValueAsDate(element)) {
    this.removeClass(element, "jsb-error");
  } else {
    this.addClass(element, "jsb-error");
  }
};

var _WIDTH  = "clientWidth",
    _HEIGHT = "clientHeight";

var _EVENT  = /^on(DOM\w+|[a-z]+)$/,
    _TEXT   = Traversal.TEXT;

function pad(number, length) {
  return "0000".slice(0, (length || 2) - String(number).length) + number;
};

if (window.pageXOffset == null) {
  var _CLIENT      = document.documentElement,
      _SCROLL_LEFT = "scrollLeft",
      _SCROLL_TOP  = "scrollTop";
} else {
      _CLIENT      = window;
      _SCROLL_LEFT = "pageXOffset";
      _SCROLL_TOP  = "pageYOffset";
}

if (detect("(style." + ViewCSS.VENDOR + "BorderImage!==undefined||style.borderImage!==undefined)")) {
  base2.userAgent += ";borderImage=true";
}

// =========================================================================
// chrome/theme.js
// =========================================================================

jsb.theme = new Base({
  detect: K("default"),

  "@Windows": {
    detect: function() {
      return _WIN_DETECT[_getActiveCaptionColor()] || "royale";
    },

    "@NT6": { // vista
      detect: function() {
        return _WIN_DETECT[_getActiveCaptionColor()] || "aero";
      }
    },

    "@NT5": { // xp
      detect: function() {
        return _WIN_DETECT[_getActiveCaptionColor()] || "royale";
      },

      "@MSIE": {
        detect: function() {
          var value = _WIN_DETECT[_getActiveCaptionColor()],
              scrollbarFaceColor = document.documentElement.currentStyle.scrollbarFaceColor;
          if (value == "classic") {
            if (scrollbarFaceColor == "#ffffff") return "classic/contrast/white";
            if (scrollbarFaceColor == "#88c0b8") return "classic/marine";
          }
          return value || ({
            "#ece9d8": "luna/blue",
            // can't detect olive using scrollbar colour technique
            "#e0dfe3": "luna/silver",
            "#ebe9ed": "royale"
          }[scrollbarFaceColor]) || "royale";
        }
      }
    },

    "@MSIE5": {
      detect: K("classic")
    }
  },
  
  "@Linux": {
    detect: function() {
      return _LINUX_DETECT[_getActiveCaptionColor()] || "default";
    }
  },

  "@Webkit([1-4]|5[01]|52[^89])|Camino|Mac": {
    detect: K("aqua"),

    "@Chrome|Arora": {
      detect: K("luna/blue")
    }
  }
});

var _WIN_DETECT = {
  "#0054e3": "luna/blue",
  "#8ba169": "luna/olive",
  "#c0c0c0": "luna/silver",
  "#335ea8": "royale",
  "#5e81bc": "royale",
  "#99b4d1": "aero",
  "#c4cbde": "aero",
  "#343434": "zune",
  "#c09f79": "human",
  "#83a67f": "smooth",
  "#000080": "classic",
  "#0a246a": "classic/standard",
  "#800000": "classic/brick",
  "#008080": "classic/desert",
  "#588078": "classic/eggplant",
  "#5a4eb1": "classic/lilac",
  "#484060": "classic/plum",
  "#808000": "classic/wheat",
  "#800080": "classic/contrast/black",
  "#000000": "classic/contrast/white",
  "#0000ff": "classic/contrast/high1",
  "#00ffff": "classic/contrast/high2"
}, _LINUX_DETECT = {
  "#c4c6c0": "clearlooks",
  "#eae8e3": "clearlooks",
  "#dfe4e8": "clearlooks",
  "#eaeaea": "clearlooks",
  "#edeceb": "clearlooks",
  "#efebe7": "human"
};

var rgba = rgb;

jsb.theme.toString = K(jsb.theme.detect() || "default");

base2.userAgent += ";theme=" + jsb.theme;

function rgb(r, g, b) {
  function toHex(value) {
    return (value < 16 ? "0" : "") + value.toString(16);
  };
  return "#" + toHex(r) + toHex(g) + toHex(b);
};

function _getActiveCaptionColor() {
  var element = document.createElement("input");
  var head = behavior.querySelector("body,head");
  head.appendChild(element);
  // detect XP theme by inspecting the ActiveCaption colour
  element.style.color = "ActiveCaption";
  var color = element.style.color;
  if (!_WIN_DETECT[color]) {
    color = ViewCSS.getComputedPropertyValue(document.defaultView, element, "color");
    if (/rgb/.test(color)) color = eval(color);
  }
  head.removeChild(element);
  return color;
};

// =========================================================================
// chrome/_MSIEShim.js
// =========================================================================

// Damn. This is way too big. :-(
// All this because MSIE does not respect padding in <input> elements.

var _MSIEShim = {
  onfocus: function(element) {
    this.base.apply(this, arguments);
    var behavior = this, timer;
    if (!shim.control) {
      shim.control = document.createElement("!");
      document.body.insertBefore(shim.control, document.body.firstChild);
      shim.attach(shim.control);
    }
    shim.element = element;
    shim.behavior = behavior;
    var style = shim.control.runtimeStyle;
    style.cssText = "position:absolute;border:0;display:none;background-position-x:right";
    style.pixelHeight = element.clientHeight;
    style.pixelWidth = behavior.IMAGE_WIDTH;
    style.backgroundImage = element.currentStyle.backgroundImage;
    shim.layout();
    element.attachEvent("onpropertychange", change);
    element.attachEvent("onfocusout", function() {
      element.detachEvent("onpropertychange", change);
      element.detachEvent("onfocusout", arguments.callee);
      element.scrollLeft = 9999;
      delete shim.element;
      style.display = "none";
      detachEvent("onresize", resize);
    });
    function change(event) {
      if (event.propertyName == "value") element.scrollLeft = 9999;
    };
    function position() {
      var offset = behavior.getOffsetFromBody(element),
          rect = element.getBoundingClientRect(),
          adjustRight = rect.right - rect.left - element.offsetWidth;
      style.pixelLeft = offset.left + adjustRight + element.clientWidth - behavior.IMAGE_WIDTH + element.clientLeft;
      style.pixelTop = offset.top + element.clientTop;
      timer = null;
    };
    function resize() {
      if (!timer) timer = setTimeout(position, 50);
    };
    attachEvent("onresize", resize);
    position();
    setTimeout(function() {
      style.display = "";
    }, 1);
  },
  
  onmouseover: _shimMouseOverOut,
  onmouseout: _shimMouseOverOut,
  onmouseup: function(element) {
    this.base.apply(this, arguments);
    if (element == shim.element) shim.layout();
  },

  onkeydown: function(element, event, keyCode) {
    this.base(element, event, keyCode);
    if (shim.element == element) shim.layout();
  },

  onkeyup: function(element, event, keyCode) {
    if (!Popup.current && keyCode == 35) { // END key
      element.scrollLeft = 9999;
    } else {
      this.base(element, event, keyCode);
    }
    if (shim.element == element) shim.layout();
  },
  
  layout: function(element, state) {
    this.base(element, state);
    if (element == shim.element) {
      shim.layout();
    }
  }
};

var shim = behavior.extend({
  onmousedown: _shimMouse,
  onmousemove: _shimMouse,

  onmouseover: _shimMouseOverOut2,
  onmouseout: _shimMouseOverOut2,

  layout: function() {
    if (this.element) {
      this.control.runtimeStyle.backgroundPositionY = this.element.currentStyle.backgroundPositionY;
    }
  }
});

function _shimMouse(element, event, x, y, screenX, screenY) {
  if (event.type == "mousedown") {
    event.preventDefault();
  }
  event.stopPropagation();
  if (this.element) {
    var offset = ElementView.getOffsetXY(this.element, event.clientX, event.clientY);
    this.behavior["on" + event.type](this.element, event, offset.x, offset.y, screenX, screenY);
  }
  this.layout();
};

function _shimMouseOverOut(element, event) {
  if (!(element == shim.element && event.relatedTarget == shim.control)) {
    this.base(element, event);
  }
  if (shim.element == element) shim.layout();
};

function _shimMouseOverOut2(element, event) {
  if (this.element && event.relatedTarget != this.element) {
    this.behavior["on" + event.type](this.element, event);
  }
  this.layout();
};

// =========================================================================
// chrome/Popup.js
// =========================================================================

var Popup = Base.extend({
  constructor: function() {
    var body = this.body = this.createBody();
    body.className = "jsb-popup";
    var appearance = this.appearance;
    if (appearance && appearance != "popup") {
      body.className += " jsb-" + appearance;
    }
    var popup = this;
    for (var i in popup) {
      if (_EVENT.test(i)) {
        EventTarget.addEventListener(body, i.slice(2), this, /onblur|onfocus/.test(i));
      }
    }
  },

  // properties

  appearance: "popup",
  width: "auto",
  height: "auto",
  element: null,
  body: null,
  position: "below",

  scrollX: false,
  scrollY: false,
  
  // events

  handleEvent: function(event) {
    switch (event.type) {
      case "mouseover":
      case "mouseout":
        if (event.target == this.body) return;
    }
    this["on" + event.type](event);
  },
  
  // methods

  createBody: function() {
    return document.createElement("div");
  },

  getRect: function() {
    var documentElement = document.documentElement,
        self = this,
        body = self.body,
        element = self.element,
        rect = ElementView.getBoundingClientRect(element),
        left = 0,
        top = self.position == "below" ? element.offsetHeight - 1 : - 1 - element.offsetHeight,
        width = self.width,
        height = self.height;

    if (width == "base") {
      width = element.offsetWidth;
    }

    // resize
    if (width == "auto" || height == "auto") {
      if (height == "auto") {
        height = body.scrollHeight + 2;
        var unitHeight = self.getUnitHeight();
        if (self.scrollY) {
          height = Math.min(height, Math.max(documentElement.clientHeight - rect.bottom - 2, rect.top - 2));
        }
        if (unitHeight > 1) height = 2 + Math.floor(height / unitHeight) * unitHeight;
      }
      if (width == "auto") {
        width = body.scrollWidth + 2;
        if (height < body.scrollHeight + 2) width += 22; // scrollbars
        if (self.scrollX) {
          width = Math.min(width, Math.max(documentElement.clientWidth - rect.left - 2, rect.right - 2));
        }
        width =  Math.max(width, element.offsetWidth);
      }
    }
    if (height > documentElement.clientHeight - rect.bottom && height < rect.bottom) {
      top = -height;
    }
    if (width > documentElement.clientWidth - rect.right && width < rect.right) {
      left = element.offsetWidth - width;
    }
    return new Rect(left, top, width, height);
  },
  
  getUnitHeight: K(1),

  hide: function() {
    var parent = this.body.parentNode;
    if (parent) parent.removeChild(this.body);
    delete this.element;
  },

  isOpen: function() {
    return !!this.body.parentNode;
  },

  layout: Undefined,

  movesize: function() {
    document.body.appendChild(this.body);
    var style = this.body.style,
        rect = this.getRect(),
        offset = ElementView.getBoundingClientRect(this.element);
    style.left = (rect.left + offset.left + _CLIENT[_SCROLL_LEFT]) + PX;
    style.top = (offset.top + rect.top + _CLIENT[_SCROLL_TOP]) + PX;
    style.width = (rect.width - 2) + PX;
    style.height = (rect.height - 2) + PX;
  },

  querySelector: function(selector) {
    return NodeSelector.querySelector(this.body, selector);
  },

  querySelectorAll: function(selector) {
    return NodeSelector.querySelectorAll(this.body, selector);
  },

  render: function(html) {
    this.body.innerHTML = html || "";
  },

  setUnselectable: function(element) {
    //element.onselect =
    //element.onselectstart = False;
    element.unselectable = "on";
    element.style.userSelect = "none";
    element.style[ViewCSS.VENDOR + "UserSelect"] = "none";
  },

  show: function(element) {
    this.element = element;
    this.render();
    this.style();
    this.movesize();
    this.layout();
    this.body.style.visibility = "visible";
  },

  style: function() {
    var style = this.body.style;
    style.cssText = "left:-999px;top:-999px;";
    var computedStyle = behavior.getComputedStyle(this.element);
    forEach.csv("backgroundColor,color,fontFamily,fontWeight,fontStyle", function(propertyName) {
      style[propertyName] = computedStyle[propertyName];
    });
    style.fontSize = parseInt(computedStyle.fontSize) + PX;
    if (style.backgroundColor == "transparent") {
      style.backgroundColor = "white";
    }
  },
  
  "@MSIE[56]": { // prevent <select> boxes from bleeding through
    hide: function() {
      this.base();
      if (this._iframe.parentNode) {
        document.body.removeChild(this._iframe);
      }
    },
    
    show: function(element) {
      this.base(element);
      if (!this._iframe) {
        var iframe = this._iframe = document.createElement("iframe"),
            style = iframe.style,
            body = this.body,
            bodyStyle = body.style;

        style.cssText = "position:absolute;z-index:999998!important";
        iframe.frameBorder = "0";
        style.left = bodyStyle.left;
        style.top = bodyStyle.top;
        style.pixelWidth = body.offsetWidth;
        style.pixelHeight = body.offsetHeight;
      }
      document.body.appendChild(this._iframe);
    }
  }
});

// =========================================================================
// chrome/PopupWindow.js
// =========================================================================

var PopupWindow = Popup.extend({
  constructor: function(owner) {
    this.base();
    this.owner = owner;
  },
  
  // properties

  controls: null,
  owner: null,
  scrollX: true,
  scrollY: true,
  
  // events

  onkeydown: function(event) {
    switch (event.keyCode) {
      case 27: // escape
        this.hide();
        break;
      case 9: // tab
        if (!this.tab(event.shiftKey ? -1 : 1)) event.preventDefault();
        break;
    }
  },
  
  // methods
  
  isActive: function() {
    return this._active || Element.matchesSelector(this.body, ":hover");
  },

  hide: function() {
    PopupWindow.current = null;
    forEach (this.controls, function(control) {
      if (control.blur) control.blur();
    });
    this.base();
  },

  show: function(element) {
    this.base(element);
    PopupWindow.current = this;
  },

  tab: function(direction) {
    if (!this.controls) return true;
    var popup = this,
        controls = this.controls.map(I),
        current = popup.querySelector(":focus");
    popup._active = false;
    controls.unshift(null);
    try {
      forEach (controls, function(control, i) {
        if (control == current) {
          var next = controls[i + direction];
          if (next) {
            popup._active = true;
            next.focus();
            if (next.select) next.select();
            throw StopIteration;
          } else {
            popup.element.focus();
          }
        }
      });
    } catch (ex) {}
    return !popup._active;
  }
}, {
  current: null,
  
  init: function() {
    EventTarget.addEventListener(window, "blur", hidePopup, false);
    EventTarget.addEventListener(document, "mousedown", hidePopup, false);
    function hidePopup(event) {
      var popup = PopupWindow.current,
          target = event.target;
      if (popup && target != document && target != popup.element && target != shim.control && !Traversal.contains(popup.body, target)) {
        popup.hide();
      }
    };
  }
});

// =========================================================================
// chrome/MenuList.js
// =========================================================================

var MenuList = PopupWindow.extend({
  constructor: function(owner) {
    this.base(owner);
    this.data = {};
  },

  // properties

  appearance: "menulist",

  // events

  onmouseup: function() {
    this.select(this.currentItem);
  },

  onkeydown: function(event) {
    switch (event.keyCode) {
      case 13: // return
        this.select(this.currentItem);
        event.preventDefault();
        break;
      case 38: // up
        if (this.currentItem) {
          this.highlight(Traversal.getPreviousElementSibling(this.currentItem));
        } else {
          this.highlight(Traversal.getFirstElementChild(this.body));
        }
        break;
      case 40: // down
        if (this.currentItem) {
          this.highlight(Traversal.getNextElementSibling(this.currentItem));
        } else {
          this.highlight(Traversal.getFirstElementChild(this.body));
        }
        break;
      default:
        this.base(event);
    }
  },

  onmouseover: function(event) {
    this.highlight(event.target);
  },

  // methods
  
  getUnitHeight: function() {
    var item = Traversal.getFirstElementChild(this.body);
    return item ? item.offsetHeight : 1;
  },

  highlight: function(item) {
    if (item) {
      this.reset(this.currentItem);
      this.currentItem = item;
      with (item.style) {
        backgroundColor = _HIGHLIGHT;
        color = _HIGHLIGHT_TEXT;
      }
    }
  },

  layout: function() {
    this.currentItem = null;
    var data = this.data[this.element.uniqueID];
    if (data) this.highlight(this.body.childNodes[data.index]);
    else this.highlight(Traversal.getFirstElementChild(this.body));
  },

  render: function() {
    var list = this.owner.get(this.element, "list"),
        html = "";
    if (list) {
      if (list.nodeType == 1) {
        html = match(list.innerHTML, /<option[^>]*>[^<]+/gi).join("").replace(/<option/gi, '<p unselectable="on"');
      } else {
        if (Array2.like(list)) {
          list = Array2.combine(list);
        }
        html = reduce(list, function(html, text, value) {
          return html += '<p unselectable="on" value"' + value + '">' + text + '</p>';
        });
      }
    }
    this.base(html);
  },

  reset: function(item) {
    if (item) with (item.style) {
      backgroundColor = "";
      color = "";
    }
  },

  select: function(item) {
    var value = Element.getAttribute(item, "value") || trim(item[Traversal.TEXT]),
        element = this.element;
    this.data[element.uniqueID] = {
      index: Traversal.getNodeIndex(item),
      value: value
    };
    this.owner.setValue(element, value);
    element.focus();
    this.hide();
  }
});

// =========================================================================
// chrome/ToolTip.js
// =========================================================================

var ToolTip = Popup.extend({ // helper text
  appearance: "tooltip",
  //position: "above",
  text: "",

  hide: function() {
    this.base();
    ToolTip.current = null;
    clearTimeout(this._timeout);
  },

  render: function() {
    this.base('<div style="padding:2px">' + this.text + '</div>');
  },
  
  show: function(element, text) {
    // show the tooltip for 3 secs. If the user hovers over the tooltip (or the
    // original control itself) then pause for another 1 sec. After that, hide
    // the tootip.
    var tooltip = this;
    if (ToolTip.current) ToolTip.current.hide();
    tooltip.text = text;
    clearTimeout(tooltip._timeout);
    tooltip._timeout = setTimeout(function() {
      if (Element.matchesSelector(element, ":hover") || Element.matchesSelector(tooltip.body, ":hover")) {
        tooltip._timeout = setTimeout(arguments.callee, ToolTip.TIMEOUT / 3); // user is hovering over the control
      } else {
        delete tooltip._timeout;
        tooltip.hide();
      }
    }, ToolTip.TIMEOUT);
    this.base(element); // default behaviour
    ToolTip.current = tooltip;
  }
}, {
  TIMEOUT: 3000,
  
  current: null
});

// =========================================================================
// chrome/control.js
// =========================================================================

var control = behavior.extend({
  // constants
  
  HORIZONTAL: 0,
  VERTICAL: 1,
  IMAGE_WIDTH: 17,

  states: {
    normal:   0,
    hover:    1,
    active:   2,
    disabled: 3,
    length:   4
  },
  
  // properties

  allowVertical: false,
  appearance: "none",
  
  // events
  
  onattach: function(element) {
    if (this.isNativeControl != False && this.isNativeControl(element)) {
      this.detach(element);
    } else {
      if (this.allowVertical && element[_HEIGHT] > element[_WIDTH]) {
        this.setOrientation(element, this.VERTICAL);
      }
      this.layout(element, this.states[element.disabled ? "disabled" : "normal"]); // initial state
    }
  },

  onmousedown: function(element, event, x, y) {
    control._active = element;

    if (!this.isEditable(element)) return;

    control._activeThumb = this.hitTest(element, x, y);
    if (control._activeThumb) {
      this.captureMouse(element);
    }
    this.layout(element);
  },

  onmouseup: function(element, event) {
    delete control._active;
    if (control._activeThumb) {
      delete control._activeThumb;
      this.layout(element);
    }
    this.releaseMouse();
  },

  onmousemove: function(element, event, x, y) {
    var thumb = this.hitTest(element, x, y);
    if (thumb != control._hoverThumb) {
      control._hoverThumb = thumb;
      this.layout(element);
    }
  },

  onmouseover: function(element, event, x, y) {
    control._hover = element;
    control._hoverThumb = this.hitTest(element, x, y);
    this.layout(element);
  },

  onmouseout: function(element) {
    delete control._activeThumb;
    delete control._hoverThumb;
    delete control._hover;
    this.layout(element);
  },

  onfocus: function(element) {
    control._focus = element;
    this.layout(element);
  },

  onblur: function(element) {
    delete control._focus;
    this.removeClass(element, this.appearance + _FOCUS);
    this.layout(element);
    if (control.tooltip) {
      control.tooltip.hide();
    }
  },
  
  // methods

  getValue: function(element) {
    return element.value;
  },

  setValue: function(element, value) {
    if (value != element.value) {
      element.value = value;
      this.dispatchEvent(element, "change");
      this.layout(element);
    }
  },

  isActive: function(element) {
    return control._activeThumb && (control._activeThumb == control._hoverThumb);
  },

  isEditable: function(element) {
    return !element.disabled && !element.readOnly;
  },

  isNativeControl: False,

  getCursor: function(element) {
    return (control._activeThumb || control._hoverThumb || element != control._hover) ? "default" : "";
  },

  syncCursor: function(element) {
    var cursor = this.getCursor(element),
        style = element.style;
    if (style.cursor != cursor) {
      style.cursor = cursor;
    }
  },

  getState: K(0),

  hitTest: function(element, x) {
    //var rtl = element.currentStyle.direction == "rtl";
    var rtl = false;
    return rtl ? x <= this.IMAGE_WIDTH : x >= element[_WIDTH] - this.IMAGE_WIDTH;
  },

  setOrientation: function(element, orientation) {
    if (orientation == this.VERTICAL) {
      var backgroundImage = "background-image";
      this.setStyle(element, backgroundImage, this.getComputedStyle(element, backgroundImage).replace(/\.png/, "-vertical.png"), true);
    } else if (element.style.backgroundImage) {
      element.style.backgroundImage = "";
    }
  },

  showToolTip: function(element, text) {
    var tooltip = control.tooltip;
    if (!tooltip) {
      tooltip = control.tooltip = new ToolTip;
    }
    setTimeout(function() {
      tooltip.show(element, text);
    }, 1);
  },

  hasTimer: function(element, id) {
    id = element.uniqueID + (id || _TIMER);
    return !!_timers[id];
  },

  startTimer: function(element, id, interval) {
    id = element.uniqueID + (id || _TIMER);
    if (!_timers[id]) {
      _timers[id] = this.setInterval(this.tick, 100, element);
    }
  },

  stopTimer: function(element, id) {
    id = element.uniqueID + (id || _TIMER);
    if (_timers[id]) {
      clearInterval(_timers[id]);
      delete _timers[id];
    }
  },

  tick: Undefined,

  layout: function(element, state) {
    if (state == null) state = this.getState(element);
    var clientHeight = element[_HEIGHT],
        top = - this.states.length * (clientHeight / 2 * (clientHeight - 1)),
        style = element.style;
    top -= clientHeight * state;
    var backgroundPosition = "right " + top + PX;
    if (style.backgroundPosition != backgroundPosition) {
      style.backgroundPosition = backgroundPosition;
    }
    this.syncCursor(element);
  },

  "@Opera": {
    syncCursor: Undefined
  }
});

// =========================================================================
// chrome/dropdown.js
// =========================================================================

var dropdown = control.extend({
  extend: function(_interface) {
    var dropdown = this.base(_interface);
    if (!PopupWindow.ancestorOf(dropdown.Popup)) {
      dropdown.Popup = this.Popup.extend(dropdown.Popup);
    }
    return dropdown;
  },

  "@MSIE.+win": _MSIEShim,
  
  // properties

  appearance: "dropdown",

  Popup: PopupWindow, // popup class
  
  // events

  onblur: function(element, event) {
    if (this.isOpen(element) && !this.popup.isActive()) this.hidePopup();
    this.base(element, event);
  },
  
  "@Opera(8|9.[0-4])": {
    onblur: function(element, event) {
      if (this.isOpen(element) && this.popup.isActive()) {
        event.preventDefault();
      } else {
        this.base(element, event);
      }
    }
  },

  onkeydown: function(element, event, keyCode) {
    if (this.isEditable(element)) {
      if (keyCode == 40 && !this.isOpen(element)) {
        this.showPopup(element);
      } else if (this.isOpen(element)) {
        this.popup.onkeydown(event);
      }
    }
  },

  onmousedown: function(element, event, x) {
    this.base.apply(this, arguments);
    if (this.isEditable(element)) {
      if (this.hitTest(element, x)) {
        if (this.isOpen(element)) {
          this.hidePopup();
        } else {
          this.showPopup(element);
        }
      } else {
        this.hidePopup();
      }
    }
  },

  // methods

  getState: function(element) {
    if (element.disabled) {
      var state = "disabled";
    } else if (element.readOnly) {
      state = "normal";
    } else if (element == control._active && control._activeThumb) {
      state = "active";
    } else if (element == control._hover && control._hoverThumb) {
      state = "hover";
    } else {
      state = "normal";
    }
    return this.states[state];
  },

  hidePopup: function(element) {
    if (this.popup) this.popup.hide();
  },

  isOpen: function(element) {
    var popup = this.popup;
    return popup && popup.isOpen() && popup.element == element;
  },

  showPopup: function(element) {
    if (!this.popup) this.popup = new this.Popup(this);
    this.popup.show(element);
  },

  "@theme=aqua": {
    "@borderImage": {
      hitTest: function(element, x) {
        return x >= element.clientWidth;
      }
    },

    layout: function(element) {
      this.syncCursor(element);
    }
  }
});

// =========================================================================
// chrome/combobox.js
// =========================================================================

var combobox = dropdown.extend({
  // properties

  appearance: "combobox",
  list: "",
  
  // methods

  get: function(element, propertyName) {
    var value = this.base(element, propertyName);
    if (value && propertyName == "list" && typeof value == "string") {
      return this.querySelector("#" + value);
    }
    return null;
  },

  "@Opera[91]": {
    isNativeControl: function(element) {
      return element.nodeName == "INPUT" && element.list;
    }
  },

  Popup: MenuList
});

// =========================================================================
// chrome/number.js
// =========================================================================

// For numeric controls

var number = {
  // properties
  
  min:  "",
  max:  "",
  step: 1,
  value: 0,
  stepScale: 1,

  "@Opera": {
    get: function(element, propertyName) {
      var value = this.base(element, propertyName);
      switch (propertyName) {
        case "min":
        case "max":
        case "step":
          if (value === "") return this[propertyName];
      }
      return value;
    }
  },

  // events

  onmousewheel: function(element, event, delta) {
    if (this.isEditable(element) && control._focus == element && element.value != "") {
      this.increment(element, parseInt(delta / 120));
      event.preventDefault();
    }
  },

  // methods

  convertValueToNumber: parseFloat,
  convertNumberToValue: String,

  getValueAsNumber: function(element) {
    return this.convertValueToNumber(element.value);
  },

  setValueAsNumber: function(element, value) {
    if (isNaN(value)) value = this.value;
    var properties = this.getProperties(element),
        min = this.convertValueToNumber(properties.min),
        max = this.convertValueToNumber(properties.max),
        step = parseFloat(properties.step) || 1,
        scale = step * this.stepScale;
    // check min/max
    value = value > max ? max : value < min ? min : value;
    value = Math.round(value / scale) * scale;
    if (scale < 1) value = value.toFixed(String(step).replace(/^.*\.|^\d+$/, "").length);
    // round to step
    this.setValue(element, this.convertNumberToValue(value));
  },

  getValueAsDate: function(element) {
    var number = this.convertValueToNumber(element.value);
    return isNaN(number) ? null : new Date(number);
  },

  setValueAsDate: function(element, date) {
    this.setValueAsNumber(element, date.valueOf());
  },

  getProperties: function(element) {
    if (element == number._element) {
      var properties = number._properties;
    } else {
      number._element = element;
      properties = number._properties = {min: 0, max: 0, step: 0};
      for (var attr in properties) {
        properties[attr] = this.get(element, attr);
      }
    }
    return properties;
  },

  increment: function(element, amount, block) {
    var type = block ? "Block" : "Unit";
    amount *= this["get" + type + "Increment"](element);
    this.setValueAsNumber(element, this.getValueAsNumber(element) + amount);
  },

  getBlockIncrement: function(element) {
    return this.getUnitIncrement(element) * 10;
  },

  getUnitIncrement: function(element) {
    return (this.get(element, "step") || 1) * this.stepScale;
  }
};

// =========================================================================
// chrome/range.js
// =========================================================================

var range = control.extend({
  implements: [number],
  
  // properties
  
  min:  0,
  max:  100,
  allowVertical: true,

  // events

  onminchange: _layout,
  onmaxchange: _layout,
  onstepchange: _layout,
  onvaluechange: _layout,

  "@!Opera(8|9.[0-4])": {
    // The text is hidden for all but Opera < 9.5.
    // So disallow the default number behavior.
    onchange: null
  },

  "@MSIE": _preventScroll,

  "@!theme=aqua": {
    onfocus: function(element) {
      if (element != control._active) {
        this.addClass(element, this.appearance + _FOCUS);
      }
      this.base(element);
    }
  },

  onkeydown: function(element, event, keyCode) {
    if (!this.isEditable(element) || keyCode < 33 || keyCode > 40) return;

    event.preventDefault();

    var amount = 1;

    switch (keyCode) {
      case 35: // end
        var value = 1;
      case 36: // home
        this.setRelativeValue(element, value || 0);
        return;
      case 33: // page up
        var block = true;
        break;
      case 34: // page down
        block = true;
      case 37: // left
      case 40: // down
        amount = -1;
    }
    this.increment(element, amount, block);
  },

  // methods

  getProperties: function(element) {
    var properties = this.base(element);
    properties.relativeValue = ((properties.value = parseFloat(element.value) || 0) - properties.min) / (properties.max - properties.min);
    return properties;
  },

  getRelativeValue: function(element) {
    return this.getProperties(element).relativeValue;
  },

  setRelativeValue: function(element, relativeValue) {
    var properties = this.getProperties(element);
    this.setValueAsNumber(element, (properties.max - properties.min) * relativeValue);
  },

  increment: function(element, amount, block) {
    var type = block ? "Block" : "Unit";
    amount *= this["get" + type + "Increment"](element);
    this.setRelativeValue(element, this.getRelativeValue(element) + amount);
  },

  getBlockIncrement: function(element) {
    // try to get as close as possible to 10% while still being a multiple
    // of the step and make sure that the block increment is not smaller than
    // twice the size of the unit increment
    var ui = this.getUnitIncrement(element);
    return Math.max(2 * ui, Math.round(0.1 / ui) * ui);
  },

  getUnitIncrement: function(element) {
    var properties = this.getProperties(element);
    return properties.step / (properties.max - properties.min) || this.base(element);
  },

  getCursor: K("")
});

// =========================================================================
// chrome/progressbar.js
// =========================================================================

var progressbar = range.extend({
  // constants
  
  HEIGHT: 3000,
  WIDTH: 3000,
  CHUNK_WIDTH: 1,
  CHUNK_HEIGHT: 1,
  
  "@theme=luna": {
    CHUNK_WIDTH: 10,
    CHUNK_HEIGHT: 10
  },

  // properties

  appearance: "progressbar",

  // events

  onmouseover: null,
  onmousemove: null,
  onmouseout: null,

  // methods

  hitTest: False,

  layout: function(element) {
    var clientWidth = element[_WIDTH] - 2,
        clientHeight = element[_HEIGHT] - 2,
        relativeValue = this.getProperties(element).relativeValue;

    if (clientHeight > clientWidth) {
      var left = (-clientWidth / 2) * (clientWidth + 3) - 2;
      var top = Math.floor(clientHeight * relativeValue);
      top = clientHeight - Math.round(top / this.CHUNK_HEIGHT) * this.CHUNK_HEIGHT;
    } else {
      left = Math.floor(clientWidth * relativeValue) - this.WIDTH;
      left = Math.round(left / this.CHUNK_WIDTH) * this.CHUNK_WIDTH;
      top = (-clientHeight / 2) * (clientHeight + 3) - 2;
    }
    
    element.style.backgroundPosition = ++left + PX + " " + ++top + PX;
  }
});

// =========================================================================
// chrome/slider.js
// =========================================================================

var slider = range.extend({
  // constants
  
  HORIZONTAL_WIDTH: 3000,
  HORIZONTAL_HEIGHT: 21,
  VERTICAL_WIDTH: 22,
  VERTICAL_HEIGHT: 3000,
  THUMB_WIDTH: 11,
  THUMB_HEIGHT: 11,

  // properties

  appearance: "slider",

  // events

  onmousedown: function(element, event, x, y, screenX, screenY) {
    this.base.apply(this, arguments);
    
    if (element.disabled) return;
    
    element.focus();
    event.preventDefault();
    
    if (element.readOnly) return;

    // This is the behavior for Windows and Linux
    
    if (control._activeThumb) {
      var thumb = this.getThumbRect(element);
      slider._dragInfo = {
        dx: screenX - thumb.left,
        dy: screenY - thumb.top
      };
      slider._firedOnce = true;
    } else {
      this.startTimer(element);
      slider._value = this.getValueByPosition(element, x - this.THUMB_WIDTH / 2, y - this.THUMB_HEIGHT / 2);
      slider._direction = slider._value < this.getValue(element) ? -1 : 1;
    }
  },

  onmouseup: function(element, event) {
    this.base(element, event);
    if (!this.isEditable(element)) return;
    delete slider._dragInfo;
    if (!slider._firedOnce) this.tick(element);
    this.stopTimer(element);
    delete slider._value;
    delete slider._direction;
    delete slider._firedOnce;
  },

  onmousemove: function(element, event, x, y, screenX, screenY) {
    if (slider._dragInfo) {
      this.setValueByPosition(element, screenX - slider._dragInfo.dx, screenY - slider._dragInfo.dy);
    } else {
      this.base.apply(this, arguments);
    }
  },

  "@Opera(8|9.[0-4])": {
    onmousemove: function(element) {
      if (slider._dragInfo) {
        getSelection().collapse(element.ownerDocument.body, 0); // prevent text selection
      }
      this.base.apply(this, arguments);
    }
  },

  // methods

  layout: function(element, state) {
    if (state == null) state = this.getState(element);
    
    var thumb = this.getThumbRect(element),
        style = element.style;

    if (element[_HEIGHT] > element[_WIDTH]) {
      var left = thumb.left,
          top = thumb.top - Math.ceil((this.VERTICAL_HEIGHT - this.THUMB_HEIGHT) / 2) - state * this.VERTICAL_HEIGHT;
    } else {
      left = thumb.left - Math.ceil((this.HORIZONTAL_WIDTH - this.THUMB_WIDTH) / 2) - state * this.HORIZONTAL_WIDTH;
      top = thumb.top;
    }
    
    var backgroundPosition = left + PX + " " + top + PX;
    if (style.backgroundPosition != backgroundPosition) {
      style.backgroundPosition = backgroundPosition;
    }
  },

  getThumbRect: function(element) {
    var clientWidth = element[_WIDTH],
        clientHeight = element[_HEIGHT],
        relativeValue = this.getProperties(element).relativeValue;
    if (clientHeight > clientWidth) {
      return new Rect(
        (clientWidth - this.VERTICAL_WIDTH) / 2,
        (clientHeight -= this.THUMB_HEIGHT) - Math.floor(clientHeight * relativeValue),
        this.VERTICAL_WIDTH,
        this.THUMB_HEIGHT
      );
    } else {
      return new Rect(
        Math.floor((clientWidth - this.THUMB_WIDTH) * relativeValue),
        Math.floor((clientHeight - this.HORIZONTAL_HEIGHT) / 2),
        this.THUMB_WIDTH,
        this.HORIZONTAL_HEIGHT
      );
    }
  },

  hitTest: function(element, x, y) {
    if (element.disabled || this.isNativeControl(element)) return null;
    return this.getThumbRect(element).contains(x, y);
  },

  getValueByPosition: function(element, x, y) {
    var clientWidth = element[_WIDTH],
        clientHeight = element[_HEIGHT],
        properties = this.getProperties(element);
    if (clientWidth >= clientHeight) {
      var size = clientWidth - this.THUMB_WIDTH;
      var pos = x;
    } else {
      size = clientHeight - this.THUMB_HEIGHT;
      pos = size - y;
    }
    return (properties.max - properties.min) * (pos / size);
  },

  setValueByPosition: function(element, x, y) {
    this.setValueAsNumber(element, this.getValueByPosition(element, x, y));
  },

  getState: function(element) {
    if (element.disabled) {
      var state = "disabled";
    } else if (element == control._active && control._activeThumb) {
      state = "active";
    } else if (element == control._focus || (element == control._hover && control._hoverThumb)) {
      state = "hover";
    } else {
      state = "normal";
    }
    return this.states[state];
  },

  tick: function(element) {
    var properties = this.getProperties(element);
    var amount = this.getBlockIncrement(element) * (properties.max - properties.min);
    if (Math.abs(slider._value - this.getValue(element)) < amount) {
      this.setValueAsNumber(element, slider._value);
      this.stopTimer(element);
    } else {
      this.increment(element, slider._direction, true);
    }
    slider._firedOnce = true;
  },

  "@KHTML|Opera[91]": {
    isNativeControl: function(element) {
      return element.nodeName == "INPUT" && element.type == "range";
    }
  },

  "@theme=aqua": {
    onblur: function(element, event) {
      if (element == slider._activeElement) {
        delete slider._activeElement;
      }
      this.base(element, event);
    },
    
    // the aqua slider jumps immediatley to wherever you click

    onmousedown: function(element, event, x, y) {
      slider._activeElement = element;
      this.base.apply(this, arguments);
      if (!this.isEditable(element)) return;
      if (!control._activeThumb) {
        this.setValueByPosition(element, x - this.THUMB_WIDTH / 2, y - this.THUMB_HEIGHT / 2);
      }
      this.base.apply(this, arguments); // why am I doing this twice?
    },

    getState: function(element) {
      if (element.disabled) {
        var state = "disabled";
      } else if (element == control._active && control._activeThumb) {
        state = "active";
      } else if (element == control._focus && element != slider._activeElement) {
        state = "hover";
      } else {
        state = "normal";
      }
      return this.states[state];
    },

    startTimer: Undefined
  }
});

// =========================================================================
// chrome/spinner.js
// =========================================================================

var spinner = control.extend({
  implements: [number],

  "@MSIE.+win": _MSIEShim,

  // constants

  states: {
    normal:      0,
    up_hover:    1,
    up_active:   2,
    down_hover:  3,
    down_active: 4,
    disabled:    5,
    length:      6
  },

  // properties
  
  appearance: "spinner",

  // events
  
  onkeydown: function(element, event, keyCode) {
    if (!this.isEditable(element)) return;
    
    if (!/^(3[348]|40)$/.test(keyCode)) return; // valid key codes

    event.preventDefault();

    switch (keyCode) {
      case 34: // page-down
        var block = true;
        break;
      case 33: // page-up
        block = true;
      case 38: // up-arrow
        var direction = "up";
    }
    this.activate(element, direction || "down", block);
  },

  onkeyup: function(element, event, keyCode) {
    if (!this.isEditable(element)) return;
    
    if (!/^(3[348]|40)$/.test(keyCode)) return; // valid key codes
    
    this.stopTimer(element);

    this.deactivate(element);
  },

  onmousedown: function(element) {
    this.base.apply(this, arguments);
    if (control._activeThumb) {
      this.startTimer(element);
    }
  },

  onmouseup: function(element, event) {
    this.stopTimer(element);
    // call afterward because we don't want to clear the state yet
    this.base(element, event);
  },

  // methods

  activate: function(element, direction, block) {
    control._activeThumb = control._hoverThumb = direction;
    this.layout(element);
    spinner._block = block;
    this.startTimer(element, _ACTIVE);
  },

  deactivate: function(element) {
    this.stopTimer(element, _ACTIVE);
    delete control._activeThumb;
    delete control._hoverThumb;
    delete spinner._block;
    this.layout(element);
  },

  getState: function(element) {
    if (element.disabled) {
      var state = "disabled";
    } else if (element.readOnly) {
      state = "normal";
    } else if ((element == control._hover || element == control._focus) && control._activeThumb) {
      state = control._activeThumb + _ACTIVE;
    } else if (element == control._hover && control._hoverThumb) {
      state = control._hoverThumb + _HOVER;
    } else {
      state = "normal";
    }
    return this.states[state];
  },

  hitTest: function(element, x, y) {
    if (!this.base(element, x)) return null;
    return y <= (element[_HEIGHT] / 2) ? "up" : "down";
  },

  startTimer: function(element) {
    if (!_timers[element.uniqueID + _TIMER]) {
      spinner._direction = (control._activeThumb == "up") ? 1 : -1;
      spinner._steps = 1;
      this.base(element);
    }
  },

  stopTimer: function(element) {
    if (_timers[element.uniqueID + _TIMER]) {
      this.base(element);
      if (!spinner._firedOnce) this.tick(element);
      delete spinner._firedOnce;
      element.select();
    }
  },

  tick: function(element) {
    this.increment(element, Math.floor(spinner._steps * spinner._direction), spinner._block);
    spinner._steps *= 1.05; // accelerate
    spinner._firedOnce = true;
  },

  increment: function(element, amount, block) {
    this.base(element, amount, block);
  },

  "@Opera[91]": {
    isNativeControl: function(element) {
      return element.nodeName == "INPUT" && element.type == "number";
    }
  }
});


// =========================================================================
// chrome/timepicker.js
// =========================================================================

var timepicker = spinner.extend({
  appearance: "timepicker",
  step: 60,
  stepScale: 1000,

  // events

  onchange: _date_onchange,

  /*"@(Date.prototype.toLocaleTimeString)": {
    onchange: function(element) {
      this.base(element);
      if (!this.hasClass(element, "jsb-error")) {
        this.showToolTip(element, this.getValueAsDate(element).toLocaleTimeString());
      }
    }
  },*/

  // methods

  getBlockIncrement: function(element) {
    return this.getUnitIncrement(element) * 60;
  },

  convertValueToNumber: function(value) {
    return value == "" ? NaN : Date2.parse("T" + value) + 500;
  },

  convertNumberToValue: function(number) {
    if (isNaN(number)) return "";
    var value = Date2.toISOString(new Date(number)).slice(11).replace(/\.\d{3}Z$/, "");
    return value.replace(/:00$/, ""); // fix me: this should be dependant on an element's step attribute
  }
});

// =========================================================================
// chrome/datepicker.js
// =========================================================================

var datepicker = dropdown.extend({
  implements: [number],

  appearance: "datepicker",
  stepScale: 86400000,
  
  // events

  onchange: _date_onchange,
  
  "@(Date.prototype.toLocaleDateString)": {
    onchange: function(element) {
      this.base(element);
      if (!this.hasClass(element, "jsb-error")) {
        this.showToolTip(element, this.getValueAsDate(element).toLocaleDateString());
      }
    }
  },
  
  // methods

  convertValueToNumber: function(value) {
    return value == "" ? NaN : Date2.parse(value + "T");
  },
  
  convertNumberToValue: function(number) {
    return isNaN(number) ? "" : Date2.toISOString(new Date(number)).slice(0, 10);
  },
  
  // properties
  
  Popup: {
    appearance: "datepicker-popup",

    scrollX: false,
    scrollY: false,

    currentDate: 0,
  
    render: function() {
      this.base(
'<div style="padding:4px"><table style="margin:0" cellspacing="0">\
<tr>\
<td><select>' +
wrap(chrome.locale.months, "option") +
'</select></td>\
<td align="right"><input type="text" class="jsb-spinner" size="4"></td>\
</tr>\
<tr>\
<td colspan="2">\
<table style="width:100%;margin:2px 0 0 0;padding:2px" class="jsb-datepicker-days" cellspacing="0" tabindex="1">\
<tr unselectable="on">' + wrap(chrome.locale.days, "th", 'unselectable="on"') + '</tr>' +
Array(7).join('<tr unselectable="on">' + Array(8).join('<td unselectable="on">0</td>') + '</tr>') +
'</table>\
</td>\
</tr>\
</table></div>'
);
      
      this.year = this.querySelector("input");
      this.month = this.querySelector("select");
      this.days = this.querySelector("table.jsb-datepicker-days");
      
      this.controls = new Array2(this.month, this.year, this.days);
      
      this.year.onscroll = _resetScroll;
      spinner.attach(this.year);
      
      this.setUnselectable(this.days);
      
      this.render = Undefined; // do once
      
      function wrap(items, tagName, attributes) {
        return reduce(items, function(html, text) {
          return html += "<" + tagName + " " + attributes + ">" + text + "</" + tagName + ">";
        }, "");
      };
    },

    onchange: function(event) {
      this.fill();
    },

    onkeydown: function(event) {
      var keyCode = event.keyCode,
          target = event.target;
      
      if (keyCode == 13) { // enter
        this.select(this.currentItem);
        event.preventDefault();
        return;
      }
          
      if (target != this.year && target != this.month && /^(3[3467809]|40)$/.test(keyCode)) {
        var startDate = this.getUTCDate(),
            date = new Date(startDate);
            
        event.preventDefault();
        
        switch (keyCode) {
          case 36: // home
            date = this.owner.getValueAsDate(this.element) || new Date;
            break;
          case 37: // left
            date.setUTCDate(date.getUTCDate() - 1);
            break;
          case 39: // right
            date.setUTCDate(date.getUTCDate() + 1);
            break;
          case 38: // up
            date.setUTCDate(date.getUTCDate() - 7);
            break;
          case 40: // down
            date.setUTCDate(date.getUTCDate() + 7);
            break;
          case 34: // page up
            if (event.ctrlKey) { // increment by year if the ctrl key is down
              date.setUTCFullYear(date.getUTCFullYear() - 1);
            } else { // by month
              date.setUTCDate(date.getUTCDate() - 28);
              if (date.getUTCMonth() == startDate.getUTCMonth()) {
                date.setUTCDate(date.getUTCDate() - 7);
              }
            }
            break;
          case 33: // page down
            if (event.ctrlKey) {
              date.setUTCFullYear(date.getUTCFullYear() + 1);
            } else {
              date.setUTCDate(date.getUTCDate() + 28);
              if (date.getUTCMonth() == startDate.getUTCMonth()) {
                date.setUTCDate(date.getUTCDate() + 7);
              }
            }
            break;
        }
        this.currentDate = date.getUTCDate();
        if (date.getUTCMonth() == startDate.getUTCMonth() && date.getUTCFullYear() == startDate.getUTCFullYear()) {
          this.highlightByDate();
        } else {
          this.year.value = date.getUTCFullYear();
          this.month.selectedIndex = date.getUTCMonth();
          this.fill();
        }
      } else {
        this.base(event);
      }
    },

    onmouseup: function(event) {
      var day = event.target;
      if (!Traversal.contains(this.days, day)) return;
      if (day.className == "disabled") return;
      this.select(this.currentItem);
    },

    onmouseover: function(event) {
      var target = event.target;
      if (target.nodeName == "TD" && target.className != "disabled" && Traversal.contains(this.days, target)) {
        this.highlight(target);
        this.currentDate = parseInt(target[_TEXT]);
      }
    },

    // methods

    getUTCDate: function() {
      return new Date(Date.UTC(this.year.value, this.month.selectedIndex, this.currentDate, 0));
    },

    fill: function() {
      var month = this.month.selectedIndex,
          d = new Date(this.year.value, month, 1, 12),
          d2 = new Date(d);
          
      d.setUTCDate(d.getUTCDate() - d.getUTCDay() + chrome.locale.firstDay);
      // ensure that we do not start after the first of the month
      if (d > d2) {
        d.setUTCDate(d.getUTCDate() - 7);
      }

      var rows = this.days.rows, row,
          currentCell, lastCell;
      for (var i = 1; row = rows[i]; i++) {
        var cells = row.cells, cell,
            hasDays = false;
        for (var j = 0; cell = cells[j]; j++) {
          var date = d.getUTCDate(),
              isSameMonth = month == d.getUTCMonth();
          cell.innerHTML = date;
          cell.className = isSameMonth ? "" : "disabled";
          if (isSameMonth) {
            lastCell = cell;
            if (this.currentDate == date) currentCell = cell;
          }
          hasDays |= isSameMonth;
          d.setUTCDate(date + 1);
        }
        row.style.visibility = hasDays ? "" : "hidden";
      }
      this.highlight(currentCell || lastCell);
    },

    highlight: function(item) {
      if (item) {
        this.reset(this.currentItem);
        this.currentItem = item;
        ClassList.add(item, "selected");
      }
    },

    highlightByDate: function() {
      var rows = this.days.rows, row;
      for (var i = 1; row = rows[i]; i++) {
        var cells = row.cells, cell;
        for (var j = 0; cell = cells[j]; j++) {
          if (cell[_TEXT] == this.currentDate && cell.className != "disabled") {
            this.highlight(cell);
            return;
          }
        }
      }
    },

    layout: function() {
      var date = this.owner.getValueAsDate(this.element) || new Date;
      this.year.value = date.getUTCFullYear();
      this.month.selectedIndex = date.getUTCMonth();
      this.currentDate = date.getUTCDate();
      this.fill();
      spinner.layout(this.year);
    },

    reset: function(item) {
      if (item) ClassList.remove(item, "selected");
    },

    select: function() {
      var element = this.element;
      this.owner.setValueAsDate(element, this.getUTCDate());
      this.hide();
      element.focus();
    },

    style: function(element) {
      this.base(element);
      var bodyStyle = this.body.style,
          monthStyle = this.month.style,
          yearStyle = this.year.style,
          daysStyle = this.days.style,
          days = this.body.getElementsByTagName("td");
      forEach.csv("fontFamily,fontSize,fontWeight,fontStyle,color", function(propertyName) {
        daysStyle[propertyName] =
        monthStyle[propertyName] =
        yearStyle[propertyName] = bodyStyle[propertyName];
      });
      daysStyle.backgroundColor =
      yearStyle.backgroundColor = bodyStyle.backgroundColor;
      this.highlight(days[14 - days[14][_TEXT] + this.currentDate]);
    }
  }
});

// =========================================================================
// chrome/weekpicker.js
// =========================================================================

var weekpicker = datepicker.extend({
  PATTERN: /^\d{4}-W([0-4]\d|5[0-3])$/,

  appearance: "weekpicker",
  stepScale: 604800000, // milliseconds in a week

  showToolTip: Undefined,

  convertValueToNumber: function(value) {
    if (!this.PATTERN.test(value)) return NaN;
    var parts = String(value).split("-W"),
        date = new Date(parts[0], 0, 1);
    while (date.getDay() != chrome.locale.firstDay) date.setDate(date.getDate() + 1);
    date = new Date(date.valueOf() + (parts[1] - 1) * this.stepScale);
    return (date.getFullYear() == parts[0]) ? date.valueOf() : NaN;
  },

  convertNumberToValue: function(number) {
    var date = new Date(number),
        jan1 = new Date(date.getFullYear(), 0, 1),
        week = Math.floor((date - jan1) / this.stepScale) + 1;
    return pad(date.getFullYear(), 4) + "-W" + pad(week);
  },
  
  Popup: {
    onkeydown: function(event) {
      if (!/^(37|39)$/.test(event.keyCode)) { // ignore datepicker behavior for left/right arrows
        this.base(event);
      }
    },
    
    onmouseover: function(event) {
      var target = event.target;
      if (target.nodeName == "TD" && Traversal.contains(this.days, target)) {
        this.highlight(target.parentNode);
        this.currentDate = parseInt(NodeSelector.querySelector(target.parentNode, "td:not(.disabled)")[_TEXT]);
      }
    },

    onmouseup: function(event) {
      if (Traversal.contains(this.days, event.target)) {
        this.select(this.currentItem);
      }
    },
    
    highlight: function(item) {
      if (item.nodeName == "TD") {
        item = item.parentNode;
      }
      this.base(item);
    }
  }
});

// =========================================================================
// chrome/monthpicker.js
// =========================================================================

var monthpicker = spinner.extend({
  appearance: "monthpicker",

  // events

  onchange: _date_onchange,

  // methods

  getBlockIncrement: function(element) {
    return this.getUnitIncrement(element) * 12;
  },

  convertValueToNumber: function(value) {
    return value == "" ? NaN : Date2.parse(value + "-12T");
  },

  convertNumberToValue: function(number) {
    return isNaN(number) ? "" : Date2.toISOString(new Date(number)).slice(0, 7);
  },

  increment: function(element, amount, block) {
    var date = this.getValueAsDate(element) || new Date;
    if (block) {
      date.setUTCFullYear(date.getUTCFullYear() + amount);
    } else {
      date.setUTCMonth(date.getUTCMonth() + amount);
    }
    this.setValueAsDate(element, date);
  }
});

// =========================================================================
// chrome/colorpicker.js
// =========================================================================

var colorpicker = dropdown.extend({
  appearance: "colorpicker",

  "@MSIE": _preventScroll,

  "@!theme=aqua": {
    onfocus: function(element) {
      if (element != control._active) {
        this.addClass(element, this.appearance + _FOCUS);
      }
      this.base(element);
    }
  },
  
  getState: function(element) {
    if (this.hasClass(element, this.appearance + _FOCUS)) {
      return this.states.hover;
    } else {
      return this.base(element);
    }
  },

  layout: function(element) {
    this.base(element);
    with (element) {
      style.color =
      style.backgroundColor = value;
    }
  },

  hitTest: True, // click wherever you want...

  Popup: {
    appearance: "colorpicker-popup", // popup style class

    onchange: function() {
      var rgb = map(pluck(this.controls, "value"), Number); // array of rgb values
      var value = reduce(rgb, function(value, channel) {    // convert to: #string
        return value += pad(channel.toString(16));
      }, "#");
      this.owner.setValue(this.element, value);
    },

    layout: function() {
      var rgb = map(this.element.value.slice(1).match(/(\w\w)/g), partial(parseInt, undefined, 16)); // array of rgb values
      this.controls.forEach(function(input, i) {
        input.value = rgb[i];
        slider.layout(input); // redraw
      });
    },

    render: function() {
      var SLIDER = ': <input class="jsb-slider" min="0" max="255">';
      this.base([
        "R" + SLIDER,
        "G" + SLIDER,
        "B" + SLIDER
      ].join("<br>"));

      this.controls = this.querySelectorAll("input.jsb-slider");

      this.controls.forEach(slider.attach); // 3 sliders

      this.render = Undefined; // render once
    }
  }
});

// =========================================================================
// chrome/Rect.js
// =========================================================================

var Rect = Base.extend({
  constructor: function(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
    this.right = left + width;
    this.bottom = top + height;
  },
  
  contains: function(x, y) {
    with (this) return x >= left && x <= right && y >= top && y <= bottom;
  },
  
  toString: function() {
    with (this) return [left, top, width, height].join(",");
  }
});

// =========================================================================
// chrome/styleSheet.js
// =========================================================================

var _WINDOW =         "Window",
    _HIGHLIGHT =      "Highlight",
    _HIGHLIGHT_TEXT = "HighlightText";

if (detect("win.+(Webkit([1-4]|5[01]|52[^89])|theme=aqua)")) { // webkit pre 528 uses the same colours, no matter the theme
    _WINDOW =         "#fff";
    _HIGHLIGHT =      "#427cd9";
    _HIGHLIGHT_TEXT = "#fff";
}

jsb.theme.cssText = jsb.createStyleSheet({
  "*": {
    backgroundPosition:        "9999px 9999px",
    backgroundAttachment:      "scroll!",
    backgroundRepeat:          "no-repeat!",
    padding:                   "2px",
    border:                    "1px solid #a7a6aa",

    "@theme=classic": {
      padding:                 "1px 2px 2px 1px",
      borderWidth:             "2px 1px 1px 2px",
      borderColor:             "#444 #ddd #ddd #444",

      "@MSIE": {
        padding:               "1px",
        border:                "2px inset ButtonHighlight",
        borderLeftColor:       "ButtonShadow",
        borderLeftStyle:       "outset",
        borderTopColor:        "ButtonShadow",
        borderTopStyle:        "outset"
      },

      "@Gecko": {
        padding:               "1px",
        borderWidth:           "2px",
        MozBorderTopColors:    "ThreeDShadow ThreeDDarkShadow",
        MozBorderRightColors:  "ThreeDHighlight ThreeDLightShadow",
        MozBorderLeftColors:   "ThreeDShadow ThreeDDarkShadow",
        MozBorderBottomColors: "ThreeDHighlight ThreeDLightShadow"
      }
    },

    "@theme=aqua": {
      padding:                 "1px 2px 2px 2px",
      borderWidth:             "2px 1px 1px 1px",
      borderColor:             "#9e9e9e #b4b4b4 #dadada #b4b4b4"
    },

    "@theme=luna\\/blue": {
      borderColor:             "#7f9db9"
    },
    
    "@theme=luna\\/olive": {
      borderColor:             "#a4b97f"
    },
    
    "@theme=luna\\/silver": {
      borderColor:             "#a5acb2"
    },
    
    "@theme=aero": {
      borderColor:             "#abadb3 #dbdfe6 #e3e9ef #e2e3ea"
    },
    
    "@theme=zune": {
      borderColor:             "#969696"
    }
  },

  ".jsb-dropdown,.jsb-combobox,.jsb-colorpicker,.jsb-datepicker,.jsb-weekpicker": {
    "@theme=aqua": { // aqua
      width:              "10em",
      BorderRadius:       "5px",
      BoxShadow:          "0 1px 4px rgba(160, 160, 160, 0.5)",
      
      "@!borderImage": {
        backgroundImage:        "url(%theme%/bg-dropdown.png)!",
        backgroundPosition:     "right center!",
        padding:                "1px 22px 1px 4px!",
        borderWidth:            "1x!",
        border:                 "1px solid #545454!"
      },

      "@borderImage": {
        BorderImage:        "url(%theme%/dropdown.png) 1 18 1 4",
        borderStyle:        "none",
        borderWidth:        "1px 18px 1px 4px!",
        padding:            "1px"
      }
    },

    "@!theme=aqua": { // not aqua
      width:              "8em",
      paddingRight:       "19px!",
      backgroundImage:    "url(%theme%/dropdown.png)!"
    }
  },

  ".jsb-progressbar,.jsb-slider,.jsb-colorpicker": {
    textIndent:           "-10em", // hide text for purely visual controls (Safari & Gecko)
    cursor:               "default",
    UserModify:           "read-only",
    UserSelect:           "none",

    "@MSIE": {
      verticalAlign:      "top",
      textIndent:         0,
      lineHeight:         "80em" // hide text for purely visual controls (MSIE)
    }
  },

  ".jsb-progressbar": {
    _height:               "10px",
    minHeight:             "10px",
    padding:               "2px",
    borderColor:           "ThreeDDarkShadow",
    borderWidth:           "1px",
    BorderRadius:          "5px",
    backgroundImage:       "url(%theme%/progressbar.png)!",
    width:                 "164px"
  },

  ".jsb-slider": {
    _height:              "22px",
    minHeight:            "22px",
    padding:              0,
    border:               "none!",
    backgroundColor:      "transparent",
    backgroundImage:      "url(%theme%/slider.png)!",

    "@Gecko": {
      MozBorder:     "initial"
    },

    "@Gecko1\\.[0-3]": {
      backgroundColor: "#f2f2f2"
    }
  },

  ".jsb-popup": {
    visibility:        "hidden",
    backgroundColor:   _WINDOW,
    borderWidth:       "1px",
    position:          "absolute!",
    zIndex:            "999999!",
    cursor:            "default",
    padding:           "0",
    margin:            "0!",

    "@Gecko|Opera|theme=aqua|Webkit": {
      MozBorder:        "initial",
      borderColor:      "ThreeDShadow!",
      borderStyle:      "outset!",

      "@Opera": {
        borderStyle:    "solid!"
      }
    },

    "@theme=classic": {
      borderColor:      "ThreeDShadow!",
      borderStyle:      "solid!"
    }
  },

  ".jsb-spinner": {
    textAlign:        "right",
    width:            "5em",
    paddingRight:     "19px!",
    backgroundImage:  "url(%theme%/spinner.png)!"
  },

  ".jsb-timepicker,.jsb-monthpicker": {
    width:            "4em",
    paddingRight:     "19px!",
    backgroundImage:  "url(%theme%/spinner.png)!"
  },

  ".jsb-datepicker-days": {
    UserSelect:      "none!"
  }
});

jsb.theme.cssText += jsb.createStyleSheet({
  ".jsb-error": {
    borderColor:      "#ff5e5e",
    outlineColor:     "#ff5e5e"
  },

  ".jsb-colorpicker": {
    width:         "4em"
  },

  ".jsb-datepicker": {
    width:         "12ex"
  },

  ".jsb-weekpicker": {
    width:         "11ex"
  },

  "@!Webkit": {
    ".progressbar_focus,.slider_focus,.colorpicker_focus": {
      Outline:        "1px dotted"
    }
  },

  "@Webkit": {
    ".jsb-slider:focus:not(.slider_focus)": {
      Outline:        "none!"
    }
  },

  ".jsb-datalist": {
    display:         "none!"
  },

  ".jsb-menulist": {
    "@!MSIE": {
      overflow:      "auto!"
    },

    "@MSIE": {
      overflowY:      "auto!"
    }
  },

  ".jsb-menulist p": {
    margin:          "0!",
    padding:         "1px 2px!",
    overflow:        "hidden!",
    whiteSpace:      "nowrap!"
  },

  ".jsb-colorpicker-popup": {
    backgroundColor: "ButtonFace!",
    color:           "ButtonText!",
    fontSize:        "11px!",
    padding:         "4px!",
    overflow:        "hidden!",
    whiteSpace:      "nowrap!",

    "@Webkit([1-4]|5[01]|52[^89])": {
      backgroundColor: "#ece9d8!"
    }
  },

  ".jsb-colorpicker-popup input": {
    fontSize:        "11px",
    margin:          "4px 2px",
    verticalAlign:   "middle",
    width:           "127px"
  },

  ".jsb-datepicker-popup": {
    backgroundColor: "#fcfcfd!",
    overflow:        "hidden!"
  },

  /*".jsb-datepicker-days:focus": {
    Outline:         "none",
    borderColor:     _HIGHLIGHT + "!"
  },*/

  ".jsb-datepicker-popup input": {
    width:             "5ex",

    "@!MSIE[567]|Opera": {
      padding:         "1px 19px 1px 2px!"
    }
  },

  ".jsb-datepicker-popup th": {
    backgroundColor: "InfoBackground!",
    color:           "InfoText!",
    fontWeight:      "normal!"
  },

  ".jsb-datepicker-popup th,.jsb-datepicker-days td": {
    padding:         "2px 0!",
    textAlign:       "center!",
    width:           "14%!"
  },

  ".jsb-datepicker-days td.disabled": {
    color:           "GrayText!",
    Opacity:         0.4
  },

  ".jsb-datepicker-days td.selected,.jsb-datepicker-days tr.selected td": {
    backgroundColor: _HIGHLIGHT,
    color:           _HIGHLIGHT_TEXT,
    Opacity:         1
  },

  "@theme=luna\\/blue": {
    ".jsb-datepicker-popup th": {
      backgroundColor: "#ffffe1!"
    }
  },

  "@theme=aqua": {
    ".jsb-menulist": {
      Opacity:            0.95
    },

    ".jsb-spinner,.jsb-timepicker,.jsb-monthpicker": {
      borderTopWidth: "1px",
      paddingTop: "2px",
      borderRightColor:                "transparent",
      WebkitBorderTopRightRadius:      "5px",
      WebkitBorderBottomRightRadius:   "5px",
      "MozBorderRadius-topright":      "5px",
      "MozBorderRadius-bottomright":   "5px"
    },

    ".jsb-spinner[disabled],.jsb-spinner[readonly],.jsb-timepicker[disabled],.jsb-timepicker[readonly],.jsb-monthpicker[disabled],.jsb-monthpicker[readonly]": {
      borderColor:      "#d6d6d6 #e0e0e0 #f0f0f0 #e0e0e0"
    },

    ".jsb-combobox[readonly],.jsb-combobox[disabled],.jsb-datepicker[readonly],.jsb-datepicker[disabled],.jsb-weekpicker[readonly],.jsb-weekpicker[disabled]": {
      "@borderImage": {
        BorderImage:   "url(%theme%/dropdown-disabled.png) 1 18 1 4!"
      },

      "@!borderImage": {
        backgroundImage:   "url(%theme%/bg-dropdown-disabled.png)!"
      }
    },

    "@borderImage": {
      ".jsb-colorpicker": {
        BorderImage:        "url(%theme%/colorpicker.png) 1 18 1 4!"
      },

      ".jsb-colorpicker[readonly],.jsb-colorpicker[disabled]": {
        BorderImage:        "url(%theme%/colorpicker-disabled.png) 1 18 1 4!"
      }
    },

    "@!borderImage": {
      ".jsb-colorpicker": {
        backgroundImage:   "url(%theme%/bg-colorpicker.png)!"
      },

      ".jsb-colorpicker[readonly],.jsb-colorpicker[disabled]": {
        backgroundImage:   "url(%theme%/bg-colorpicker-disabled.png)!"
      }
    },

    ".jsb-combobox[disabled],.jsb-datepicker[disabled],.jsb-weekpicker[disabled],.jsb-colorpicker[disabled],.jsb-progressbar[disabled]": {
      color:         "WindowText",
      Opacity:       0.5
    },

    ".jsb-colorpicker-popup,.jsb-datepicker-popup": {
      backgroundColor: _WINDOW + "!",
      backgroundImage: "url(%theme%/metal.png)!",
      backgroundRepeat: "repeat!"
    },

    ".jsb-datepicker": {
      width:         "7em"
    },

    ".jsb-weekpicker": {
      width:         "6em"
    },

    ".jsb-datepicker-days": {
      backgroundColor:       _WINDOW + "!"
    },

    ".jsb-datepicker-days:active": {
      Outline:       "none!"
    },

    ".jsb-datepicker-popup th": {
      backgroundColor: "#89acd5!",
      color:           "white!"
    }
  },
  
  ".jsb-tooltip": {
    borderColor:        "InfoText!",
    backgroundColor:    "InfoBackground!",
    color:              "InfoText!",
    fontSize:           "small!",
    BoxShadow:          "2px 4px 4px rgba(160, 160, 160, 0.5)"
  },

  "@Opera[91]": {
    "input[list],input[type=number],input[type=date],input[type=time],input[type=month],input[type=week],input[type=range]": {
      border: "initial",
      borderWidth:             "initial",
      borderColor:             "initial",
      backgroundImage: "none!"
    }
  }
});
//;;;console2.log(jsb.theme.cssText);
// =========================================================================
// chrome/locale.js
// =========================================================================

var locales = {
  en: {
    days: "S,M,T,W,T,F,S",
    months: "January,February,March,April,May,June,July,August,September,October,November,December",
    firstDay: 1 // Sunday = 0, Monday = 1, etc
  },
  
  de: {
    days: "S,M,D,M,D,F,S",
    months: "Januar,Februar,März,April,Mai,Juni,Juli,August,September,Oktober,November,Dezember"
  },
  
  es: {
    days: "D,L,M,M,J,V,S",
    months: "Enero,Febrero,Marzo,Abril,Mayo,Junio,Julio,Agosto,Septiembre,Octubre,Noviembre,Diciembre",
    firstDay: 0
  },
  
  fr: {
    days: "D,L,M,M,J,V,S",
    months: "Janvier,Février,Mars,Avril,Mai,Juin,Juillet,Août,Septembre,Octobre,Novembre,Décembre"
  },
  
  it: {
    days: "D,L,M,M,G,V,S",
    months: "Gennaio,Febbraio,Marzo,Aprile,Maggio,Giugno,Luglio,Agosto,Settembre,Ottobre,Novembre,Dicembre"
  },
  
  nl: {
    days: "zo,ma,di,wo,do,vr,za",
    months: "januari,februari,maart,april,mei,juni,juli,augustus,september,oktober,november,december"
  },
  
  ru: {
    days: "Вс,Пн,Вт,Ср,Чт,Пт,Сб",
    months: "Январь,Февраль,Март,Апрель,Май,Июнь,Июль,Август,Сентябрь,Октябрь,Ноябрь,Декабрь"
  }
};

var Locale = Base.extend({
  constructor: function(lang) {
    this.lang = lang.slice(0, 2);
    extend(this, locales[this.lang]);
    this.days = this.days.split(",");
    for (var i = 0; i < this.firstDay; i++) this.days.push(this.days.shift());
    this.months = this.months.split(",");
  }
});
extend(Locale.prototype, locales.en);

chrome.locale = new Locale(navigator.language || navigator.systemLanguage);

// =========================================================================
// chrome/rules.js
// =========================================================================

chrome.rules = new RuleList({
  "input.jsb-combobox": combobox,
  "input.jsb-progressbar": progressbar,
  "input.jsb-slider": slider,
  "input.jsb-spinner": spinner,
  "input.jsb-timepicker": timepicker,
  "input.jsb-datepicker": datepicker,
  "input.jsb-weekpicker": weekpicker,
  "input.jsb-monthpicker": monthpicker,
  "input.jsb-colorpicker": colorpicker
});

eval(this.exports);

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
