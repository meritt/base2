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
// chrome/package.js
// =========================================================================

// Browser chrome.

// Credits: some code written by Erik Arvidsson.

base2.global.chrome = new base2.Package(this, {
  name:    "chrome",
  version: "0.9",
  imports: "Enumerable,Function2,dom,jsb",
  exports: // public components
           "combobox,progressbar,slider,spinner,colorpicker," +
           "datepicker,weekpicker,monthpicker,timepicker," +
           // these are for extensibility
           "Popup,PopupWindow,MenuList,ToolTip,dropdown",
           
  parent:  base2.jsb,
  
  getBehavior: function(element) {
    return _attachments[element.uniqueID] || null;
  }
});

eval(this.imports);

// =========================================================================
// chrome/header.js
// =========================================================================

var PX = "px";

var _ACTIVE = "\x5factive",
    _HOVER  = "\x5fhover",
    _FOCUS  = "\x5ffocus",
    _TIMER  = "\x5ftimer";

var _EVENT          = /^on(DOM\w+|[a-z]+)$/,
    _TEXT_CONTENT   = Traversal.TEXT_CONTENT;

var _DAY = 86400000;

var _PARENT = detect("(element.parentElement)") ? "parentElement" : "parentNode";

var _attachments   = {},
    _timers        = {};

var  _preventScroll = {
  onfocus: function(element, event) {
    if (!element.onscroll) {
      element.scrollTop = 0;
      element.onscroll = _resetScroll;
    }
    this.base(element, event);
  }
};

var _resetScroll = function() {
  this.scrollTop = 0;
};

function pad(number, length) {
  return "0000".slice(0, (length || 2) - String(number).length) + number;
};

function wrap(items, tagName, attributes) {
  return reduce(items, function(html, text) {
    return html += "<" + tagName + " " + attributes + ">" + text + "</" + tagName + ">";
  }, "");
};

// =========================================================================
// dimensions.js
// =========================================================================

// This is because IE8 is incredibly slow to calculate clientWidth/Height.

// http://stackoverflow.com/questions/800693/clientwidth-performance-in-ie8

// The fix is pretty horrible.
// I use an HTC file (dimensions.htc) that grabs the clientWidth and
// clientHeight properties and caches them.

var _WIDTH = "clientWidth",
    _HEIGHT = "clientHeight";

if (8 == document.documentMode) {

  jsb.clientWidth2 = {};
  Object.defineProperty(global.Element.prototype, "clientWidth2", {
    get: function() {
      return jsb.clientWidth2[this.uniqueID] || this.clientWidth;
    }
  });

  jsb.clientHeight2 = {};
  Object.defineProperty(global.Element.prototype, "clientHeight2", {
    get: function() {
      return jsb.clientHeight2[this.uniqueID] || this.clientHeight;
    }
  });

  _WIDTH = "clientWidth2";
  _HEIGHT = "clientHeight2";
  
  //document.write('<script src="' + jsb.host + 'dimensions.htc"></script>');
}

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
    this.days = String2.csv(this.days);
    for (var i = 0; i < this.firstDay; i++) {
      this.days.push(this.days.shift());
    }
    this.months = String2.csv(this.months);
  }
});
extend(Locale.prototype, locales.en);

chrome.locale = new Locale(navigator.language || navigator.systemLanguage);

// =========================================================================
// chrome/theme.js
// =========================================================================

jsb.theme = new Base({
  detect: K("default"),

  "@Windows": {
    defaultTheme: "classic",

    "@NT5\\.1": { // XP
      defaultTheme: "luna/blue"
    },

    "@NT[6-9]": { // Vista
      defaultTheme: "aero"
    },

    detect: function() {
      var colors = _getColors();
      return _WIN_DETECT_COLLISION[colors.join("")] || _WIN_DETECT_ACTIVECAPTION[colors[0]] || _WIN_DETECT_GRAYTEXT[colors[1]] || this.defaultTheme;
    },

    "@NT(6\\.1|[7-9])": { // Windows 7
      detect: K("aero/7")
    },

    "@Chrome|Arora": {
      detect: function() {
        var theme = this.base();
        return !theme || theme == "classic" ? this.defaultTheme : theme;
      }
    }
  },
  
  "@Linux": {
    detect: function() {
      return _LINUX_DETECT_ACTIVECAPTION[_getColors()[0]];
    }
  },

  "@Webkit([1-4]|5[01]|52[^89])|Camino|Mac": {
    detect: K("aqua"),

    "@(Chrome|Arora).+win": {
      detect: K("luna/blue")
    }
  }
});

var _WIN_DETECT_ACTIVECAPTION = {
  "#0054e3": "luna/blue",
  "#8ba169": "luna/olive",
  "#c0c0c0": "luna/silver",
  "#335ea8": "royale",
  "#5e81bc": "royale",
  "#99b4d1": "aero",
  "#c4cbde": "aero",
  "#343434": "zune",
  "#c09f79": "human",
  "#83a67f": "smooth"
}, _WIN_DETECT_GRAYTEXT = {
  "#808080": "classic",
  "#8d8961": "classic/brick",
  "#a28d68": "classic/desert",
  "#588078": "classic/eggplant",
  "#5a4eb1": "classic/lilac",
  "#489088": "classic/marine",
  "#c6a646": "classic/maple",
  "#786058": "classic/plum",
  "#d7a52f": "classic/pumpkin",
  "#4f657d": "classic/rainyday",
  "#9f6070": "classic/rose",
  "#558097": "classic/slate",
  "#559764": "classic/spruce",
  "#bcbc41": "classic/wheat"
}, _WIN_DETECT_COLLISION = {
  "#0a246a#808080": "classic/standard",
  "#0000ff#00ff00": "classic/contrast/high1",
  "#00ffff#00ff00": "classic/contrast/high2",
  "#800080#00ff00": "classic/contrast/black",
  "#000000#00ff00": "classic/contrast/white"
}, _LINUX_DETECT_ACTIVECAPTION = {
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

function _getColors() {
  var element = document.createElement("input"),
      style = element.style,
      head = behavior.querySelector("body,head"),
      getColor = function(color) {
        style.color = color;
        if (color.toLowerCase() == style.color.toLowerCase()) {
          color = ViewCSS.getComputedPropertyValue(document.defaultView, element, "color");
        } else {
          color = style.color;
        }
        if (/rgb/.test(color)) color = eval(color);
        return color;
      };
  head.appendChild(element);
  // detect OS theme by inspecting the ActiveCaption colour
  var colors = [getColor("ActiveCaption"), getColor("GrayText")];
  head.removeChild(element);
  return colors;
};

var _WINDOW =         "window",
    _HIGHLIGHT =      "highlight",
    _HIGHLIGHT_TEXT = "highlighttext";

if (detect("(Webkit([1-4]|5[01]|52[^89])|theme=aqua).+win")) { // webkit pre 528 uses the same colours, no matter the theme
    _WINDOW =         "#ffffff";
    _HIGHLIGHT =      "#427cd9";
    _HIGHLIGHT_TEXT = "#ffffff";
}

// =========================================================================
// chrome/_MSIEShim.js
// =========================================================================

// Damn. This is way too big. :-(
// All this because MSIE does not respect padding in <input> elements.

// Basically, this code places a little widget over the current <input> element.
// The little widget looks exactly like the chrome control and forwards its
// events.

// This code nearly works for Opera8. Opera8 suffers the same bug in not respecting
// the padding in the client area of an <input> box. However, we can't rescroll
// the element so it actually makes things worse.

var _MSIEShim = {
  onfocus: function(element) {
    this.base.apply(this, arguments);
    var behavior = this, timer;
    if (!shim.control) {
      shim.control = document.createElement(detect.MSIE5 ? "span" : "x");
      document.body.insertBefore(shim.control, document.body.firstChild);
      shim.attach(shim.control);
    }
    shim.element = element;
    shim.behavior = behavior;
    var style = shim.control.style;
    style.display = "none";
    style.position = "absolute";
    style.fontSize = "0";
    style.border = "0";
    style.height = element.clientHeight + PX;
    style.width = behavior._IMAGE_WIDTH + PX;
    style.backgroundImage = this.getComputedStyle(element, "backgroundImage");
    //style.background = "red";
    shim.layout();
    var blurType = detect.MSIE && !detect.MSIE5 ? "onfocusout" : "onblur",
        inputType = detect.MSIE ? "onpropertychange" : "onkeydown",
        oninput = detect.MSIE ? change : resetScroll;
    _private.attachEvent(element, inputType, oninput);
    _private.attachEvent(element, blurType, onblur);
    
    function change(event) {
      if (event.propertyName == "value") resetScroll();
    };
    function resetScroll() {
      element.scrollLeft = 9999;
    };
    function position() {
      var offset = ElementView.getOffsetFromBody(element),
          rect = ElementView.getBoundingClientRect(element),
          adjustRight = detect.MSIE ? rect.right - rect.left - element.offsetWidth : 0;
      style.left = (offset.left + adjustRight + element[_WIDTH] - behavior._IMAGE_WIDTH + element.clientLeft) + PX;
      style.top = (offset.top + element.clientTop) + PX;
      timer = null;
    };
    function onblur() {
      if (document.activeElement == null) {
        if (event.preventDefault) event.preventDefault();
      } else {
        _private.detachEvent(element, inputType, oninput, true);
        _private.detachEvent(element, blurType, onblur, true);
        _private.detachEvent(window, "onresize", resize, true);
        style.display = "none";
        resetScroll();
        delete shim.element;
      }
    };
    function resize() {
      if (!timer) timer = setTimeout(position, 50);
    };
    _private.attachEvent(window, "onresize", resize);
    position();
    setTimeout(function() {
      style.display = "block";
    }, 1);
  },
  
  onmouseover: _shimMouseOverOut,
  onmouseout: _shimMouseOverOut,

  onmousedown: _shimLayout,
  onmouseup: _shimLayout,
  onkeydown: _shimLayout,

  onkeyup: function(element, event, keyCode) {
    if (!PopupWindow.current && keyCode == 35) { // END key
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
  },
  
  matchesSelector: function(element, selector) {
    return this.base(element, selector) ||
      (/^:(hover|active)$/.test(selector) && element == shim.element && this.base(shim.control, selector));
  }
};

var shim = behavior.extend({
  jsbExtendedMouse: true,
  
  onclick: _shimMouse,
  ondblclick: _shimMouse,
  onmousedown: _shimMouse,
  onmouseup: _shimMouse,
  onmousemove: _shimMouse,

  onmouseover: _shimMouseOverOut2,
  onmouseout: _shimMouseOverOut2,

  layout: function() {
    if (this.element) {
      this.control.style.backgroundPosition = this.element.style.backgroundPosition;
    }
  }
});

function _shimLayout(element, event) {
  this.base.apply(this, arguments);
  if (element == shim.element) shim.layout();
};

function _shimMouse(element, event) {
  event.stopPropagation();
  if (event.type == "mousedown") event.preventDefault();
  this.dispatchEvent(this.element, event.type, event); // event forwarding only works in MSIE
  /*var method = "on" + event.type; // use this for event forwarding in other browsers
  if (this.element && this.behavior[method]) {
    var offset = ElementView.getOffsetXY(this.element, event.clientX, event.clientY);
    this.behavior[method](this.element, event, offset.x, offset.y);
  }*/
  this.layout();
};

function _shimMouseOverOut(element, event, x, y) {
  if (element != shim.element || !event.relatedTarget || event.relatedTarget != shim.control) {
    this.base(element, event, x, y);
  }
  if (shim.element == element) shim.layout();
};

function _shimMouseOverOut2(element, event, x, y) {
  event.stopPropagation();
  if (this.element && event.relatedTarget != this.element) {
    event.target = this.element;
    this.behavior["on" + event.type](this.element, event, x, y);
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
        EventTarget.addEventListener(body, i.slice(2), this, true);
      }
    }
  },

  // properties

  appearance: "popup",
  element: null,
  body: null,
  
  // the following properties describe how the popup should be positioned/
  
  width: "auto", // "auto" or length
  height: "auto",
  
  position: "below", // show above or below the control?

  scrollX: false, // allow scrolling?
  scrollY: false,

  offsetX: 0, // offset distance from the control
  offsetY: 0,
  
  // events

  "@Gecko1\\.[^9]": {
    onmousedown: function(event) {
      event.preventDefault();
    }
  },

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

  removeBody: function() {
    var parent = this.body[_PARENT];
    if (parent) parent.removeChild(this.body);
  },

  getRect: function() {
    var viewport = detect("QuirksMode|Gecko1\\.[0-3]") ? document.body : document.documentElement,
        popup    = this.body,
        element  = this.element,
        rect     = ElementView.getBoundingClientRect(element),
        left     = 0,
        top      = this.position == "below" ? element.offsetHeight - 1 : - 1 - element.offsetHeight,
        width    = this.width,
        height   = this.height,
        offsetX  = this.offsetX,
        offsetY  = this.offsetY;

    if (width == "base") {
      width = element.offsetWidth;
    }

    // resize
    if (width == "auto" || height == "auto") {
      if (height == "auto") {
        height = popup.scrollHeight + 2;
        var unitHeight = this.getUnitHeight();
        if (this.scrollY) {
          height = Math.min(height, Math.max(viewport[_HEIGHT] - rect.bottom - 2, rect.top - 2));
        }
        if (unitHeight > 1) height = 2 + ~~(height / unitHeight) * unitHeight;
      }
      if (width == "auto") {
        width = popup.scrollWidth + 2;
        if (height < popup.scrollHeight + 2) width += 22; // scrollbars
        if (this.scrollX) {
          width = Math.min(width, Math.max(viewport[_WIDTH] - rect.left - 2, rect.right - 2));
        }
        width =  Math.max(width, element.offsetWidth);
      }
    }
    if (height > viewport[_HEIGHT] - rect.bottom && height < rect.bottom) {
      top = -height;
      offsetY *= -1;
    }
    if (width > viewport[_WIDTH] - rect.right && width < rect.right) {
      left = element.offsetWidth - width;
      offsetX *= -1;
    }
    return new Rect(left + offsetX, top + offsetY, width, height);
  },
  
  getUnitHeight: K(1),

  hide: function() {
    this.removeBody();
  },

  isOpen: function() {
    return !!this.body[_PARENT];;// && this.body.style.visibility == "visible";
  },

  layout: Undefined,

  movesize: function() {
    document.body.appendChild(this.body);
    var rect    = this.getRect(),
        offset  = ElementView.getOffsetFromBody(this.element);
    behavior.setStyle(this.body, {
      left: offset.left,
      top: offset.top + rect.top,
      width: Math.max(rect.width - 2, 100),
      height: Math.max(rect.height - 2, 22)
    });
  },

  querySelector: function(selector) {
    return NodeSelector.querySelector(this.body, selector);
  },

  querySelectorAll: function(selector) {
    return NodeSelector.querySelectorAll(this.body, selector);
  },

  render: function(html) {
    this.body.innerHTML = trim(html) || "";
  },

  setUnselectable: function(element) {
    element.unselectable = "on";
    behavior.setStyle(element, "userSelect", "none");
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
    style.left = "-999px";
    style.top = "-999px";
    style.width = "";
    style.height = "";
    var computedStyle = behavior.getComputedStyle(this.element);
    forEach.csv("backgroundColor,color,fontFamily,fontWeight,fontStyle", function(propertyName) {
      style[propertyName] = computedStyle[propertyName];
    });
    if (style.fontFamily == "MS She") { // old versions of gecko truncate this font for some reason
      style.fontFamily = "MS Shell Dlg"
    }
    style.fontSize = parseInt(computedStyle.fontSize) + PX;
    if (style.backgroundColor == "transparent") {
      style.backgroundColor = "white";
    }
  },

  "@MSIE(5.5|6)": { // prevent <select> boxes from bleeding through (doesn't work in MSIE5.0)
    removeBody: function() {
      var iframe = Popup._iframe;
      if (iframe[_PARENT]) {
        document.body.removeChild(iframe);
      }
      this.base();
    },

    createBody: function() {
      var iframe = Popup._iframe;
      if (!iframe) {
        iframe = Popup._iframe = document.createElement("iframe"),
        iframe.style.cssText = "position:absolute;z-index:999998!important";
        iframe.frameBorder = "0";
        iframe.scrolling = "no";
      }
      return this.base();
    },

    show: function(element) {
      this.base(element);
      var iframe = Popup._iframe,
          //style = iframe.style,
          body = this.body,
          bodyStyle = body.currentStyle;
      behavior.setStyle(iframe, {
        left: bodyStyle.left,
        top: bodyStyle.top,
        width: body.offsetWidth,
        height: body.offsetHeight,
        backgroundColor: bodyStyle.backgroundColor
      });
      /*style.left = bodyStyle.left;
      style.top = bodyStyle.top;
      style.width = body.offsetWidth + PX;
      style.height = body.offsetHeight + PX;
      style.backgroundColor = bodyStyle.backgroundColor;*/
      document.body.appendChild(iframe);
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
        //this.element.value = this.originalValue;
        this.element.focus();
        //event.preventDefault();
        break;
      case 9: // tab
        if (this.tab(event.shiftKey ? -1 : 1)) event.preventDefault();
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
    ClassList.remove(document.body, "jsb-popupshowing");
  },

  render: function(html) {
    this.base(html);
    this.controls = this.querySelectorAll("button,input,select,textarea");
  },

  show: function(element) {
    ClassList.add(document.body, "jsb-popupshowing");
    this.base(element);
    //this.originalValue = this.element.value;
    PopupWindow.current = this;
  },

  tab: function(direction) {
    if (!this.controls.length) return false;
    var popup = this,
        element = popup.element,
        controls = this.controls.map(I),
        current = popup.querySelector(":focus") || element;
    popup._active = false;
    controls.unshift(element);
    controls.push(element);
    try {
      forEach (controls, function(control, i) {
        if (control == current) {
          var next = controls[i + direction];
          popup._active = next != element;
          next.focus();
          if (next.select) next.select();
          throw StopIteration;
        }
      });
    } catch (error) {
      ;;; if (error != StopIteration) throw error;
    }
    return true;
  }
}, {
  current: null,
  
  init: function() {
    var mousedown = true;
    EventTarget.addEventListener(window, "blur", hidePopup, true);
    EventTarget.addEventListener(document, "mousedown", hidePopup, true);
    EventTarget.addEventListener(document, "mouseup", function() {
      mousedown = false;
    }, true);
    function hidePopup(event) {
      var popup = PopupWindow.current,
          target = event.target;
          
      if (event.type == "blur" && mousedown) return;
      mousedown = event.type == "mousedown";
      
      if (popup && target != document && target != popup.element && target != shim.control && !Traversal.includes(popup.body, target)) {
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

  onmouseup: function(event) {
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
      case 36: // home
        this.highlight(Traversal.getFirstElementChild(this.body));
        break;
      case 35: // end
        this.highlight(Traversal.getLastElementChild(this.body));
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
      //var attributes = 'role="listitem" unselectable="on" tabindex="-1"';
      var attributes = 'role="listitem" unselectable="on"';
      if (list.nodeType == 1) {
        if (list.nodeName != "SELECT") {
          list = NodeSelector.querySelector(list, "select");
        }
        if (list) {
          var options = list.innerHTML.split(/<\/option>/i).join("");
          html = trim(options).replace(/<option/gi, '</div><div ' + attributes).slice(6) + '</div>';
        }
      } else {
        if (Array2.like(list)) {
          html = wrap(list, "div", attributes);
        } else {
          html = reduce(list, function(html, text, value) {
            return html += '<div ' + attributes + ' value="' + value + '">' + text + '</div>';
          });
        }
      }
    }
    this.base(html);
    this.body.setAttribute("role", "list");
  },

  reset: function(item) {
    if (item) with (item.style) {
      backgroundColor = "";
      color = "";
    }
  },

  select: function(item) {
    var value = Element.getAttribute(item, "value") || trim(item[_TEXT_CONTENT]),
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

var ToolTip = Popup.extend({
  appearance: "tooltip",
  text: "",

  offsetX: 2,
  offsetY: 4,
  
  "@Safari": { // focus ring
    offsetY: 6
  },

  ontransitionend: function(event) {
    if (event.propertyName == "opacity" && event.target.style.opacity == "0") {
      this.removeBody();
    }
  },

  createBody: function() {
    var body = document.createElement("div");
    if (this.fadeIn != Undefined) {
      behavior.setStyle(body, "opacity", 0);
    }
    return body;
  },

  fadeIn: function() {
    behavior.animate(this.body, {opacity: 1});
  },

  fadeOut: function() {
    behavior.animate(this.body, {opacity: 0});
  },

  "@MSIE[56]": {
    // Popups are layered on top of an iframe for MSIE5/6. This is to
    // prevent select boxes from bleeding through.
    // It's too complicated to animate the iframe as well. So we'll turn off
    // the animation.
    
    fadeIn: Undefined,
    
    fadeOut: function() {
      this.removeBody();
    }
  },

  hide: function() {
    if (this.isOpen()) this.fadeOut();
    delete this.element;
    ToolTip.current = null;
    clearTimeout(this._timeout);
  },

  render: function() {
    this.base('<div role="tooltip">' + this.text + '</div>');
  },
  
  show: function(element, text, duration) {
    // show the tooltip for 5 seconds.
    // If the user hovers over the tooltip (or the original control itself)
    // then don't hide the tooltip.
    duration = duration ? duration * 1000 : ToolTip.TIMEOUT;
    var tooltip = ToolTip.current = this;
    tooltip.text = text;
    if (tooltip._timeout) clearTimeout(tooltip._timeout);
    tooltip._timeout = setTimeout(function checkHoverState() {
      if (Element.matchesSelector(element, ":hover") || Element.matchesSelector(tooltip.body, ":hover")) {
        tooltip._timeout = setTimeout(checkHoverState, ToolTip.TIMEOUT / 3); // user is hovering over the control
      } else {
        delete tooltip._timeout;
        tooltip.hide();
      }
      duration = ToolTip.TIMEOUT;
    }, duration);
    this.base(element); // default behaviour
    this.fadeIn();
  }
}, {
  TIMEOUT: 5000,
  
  current: null
});

// =========================================================================
// chrome/control.js
// =========================================================================

var control = behavior.extend({
  // constants

  _CURSOR: "",
  _HORIZONTAL: 0,
  _VERTICAL: 1,
  _IMAGE_WIDTH: 17,
  
  "@Gecko1\\.[0-3]": {
    _CURSOR: "text"
  },

  states: {
    normal:   0,
    hover:    1,
    active:   2,
    disabled: 3,
    length:   4
  },
  
  // properties

  type: "text", // web forms 2.0 type
  appearance: "none",
  allowVertical: false,
  //autocomplete: "off",

  onattach: function(element) {
    if (this.isNativeControl != False && this.isNativeControl(element)) {
      this.detach(element, true);
    } else {
      _attachments[element.uniqueID] = this;
      
      if (this.allowVertical && element[_HEIGHT] > element[_WIDTH]) {
        this.setOrientation(element, this._VERTICAL);
      }
      
      // prevent autocomplete popups
      if (element.name && element.form) {
        // setting this attribute does not seem to cause a reflow
        element.setAttribute("autocomplete", "off");
      }
      
      this.layout(element, this.states[element.disabled ? "disabled" : "normal"]); // initial state
    }
  },

  "@MSIE[567]": {
    onattach: function(element) {
      if (this.appearance != "none") {
        ClassList.add(element, "jsb-" + this.appearance);
      }
      this.base(element);
    }
  },

  onlosecapture: function(element) {
    delete control._active;
    delete control._dragging;
    delete control._activeThumb;
    this.setUnselectable(element, false);
    this.layout(element);
  },

  onmousedown: function(element, event, x, y) {
    control._active = element;

    if (!this.isEditable(element)) return;

    control._activeThumb = this.hitTest(element, x, y);
    if (control._activeThumb) {
      this.setCapture(element);
      control._dragging = true;
      this.setTimeout("setUnselectable", 1, element, true);
    }
    this.layout(element);
  },

  onmouseup: function(element, event) {
    this.releaseCapture();
  },

  onmousemove: function(element, event, x, y) {
    var thumb = this.hitTest(element, x, y);
    if (thumb != control._hoverThumb) {
      control._hoverThumb = thumb;
      this.layout(element);
    }
    if (control._dragging) {
      event.preventDefault();
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
    if (control.tooltip && control.tooltip.isOpen()) {
      control.tooltip.hide();
    }
  },

  onpropertyset: function(element, event, propertyName) {
    if (/^(disabled|readOnly)$/.test(propertyName)) {
      this.layout(element);
    }
  },
  
  // methods

  getCursor: function(element) {
    return (control._activeThumb || control._hoverThumb || element != control._hover || control._dragging) ? "default" : this._CURSOR;
  },

  getState: K(0),

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

  hitTest: function(element, x) {
    //var rtl = element.currentStyle.direction == "rtl";
    var rtl = false;
    return rtl ? x <= this._IMAGE_WIDTH : x >= element[_WIDTH] - this._IMAGE_WIDTH;
  },

  isActive: function(element) {
    return control._activeThumb && (control._activeThumb == control._hoverThumb);
  },

  isEditable: function(element) {
    return (!element.disabled && !element.readOnly) || element == control._readOnlyTemp;
  },

  isNativeControl: False,

  "@(hasFeature('WebForms','2.0'))": {
    isNativeControl: function(element) {
      return element.nodeName == "INPUT" && element.type == this.type;
    }
  },

  layout: function(element, state) {
    if (state == null) {
      state = this.getState(element);
      this.syncCursor(element);
    }
    var clientHeight = element[_HEIGHT],
        top = - this.states.length * (clientHeight / 2 * (clientHeight - 1)),
        style = element.style;
    top -= clientHeight * state;

    var backgroundPosition = "100% " + top + PX;
    if (style.backgroundPosition != backgroundPosition) {
      style.backgroundPosition = backgroundPosition;
    }
  },

  setOrientation: function(element, orientation) {
    if (orientation == this._VERTICAL) {
      var backgroundImage = this.getComputedStyle(element, "backgroundImage");
      this.setStyle(element, "backgroundImage", backgroundImage.replace(/\.png/i, "-vertical.png"), true);
    } else if (element.style.backgroundImage) {
      element.style.backgroundImage = "";
    }
  },

  setUnselectable: Undefined,

  "@!Webkit": {
    setUnselectable: function(element, unselectable) {
      this.setStyle(element, "userSelect", unselectable ? "none" : "");
    }
  },

  "@MSIE": {
    setUnselectable: function(element, unselectable) {
      if (unselectable) {
        element.unselectable = "on";
      } else {
        element.removeAttribute("unselectable");
      }
    }
  },

  showToolTip: function(element, text, duration) {
    var tooltip = control.tooltip;
    if (!tooltip) {
      tooltip = control.tooltip = new ToolTip;
    }
    setTimeout(function() {
      tooltip.show(element, text, duration);
    }, 1);
  },

  syncCursor: function(element) {
    var cursor = this.getCursor(element),
        style = element.style;
    if (style.cursor != cursor) {
      style.cursor = cursor;
    }
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

  "@Opera": {
    syncCursor: Undefined
  }
});

// =========================================================================
// chrome/number.js
// =========================================================================

// For numeric controls

var number = {
  // properties

  baseValue: 0,
  block: 10,
  max:  "",
  min:  "",
  step: "1",
  stepScale: 1,

  "@(hasFeature('WebForms','2.0'))": {
    get: function(element, propertyName) {
      // if the control is bound to a <input type=text> we need to ignore
      // the default min/max/step properties (empty string)
      var value = this.base(element, propertyName);
      if (element.type == "text" && /^(max|min|step)$/.test(propertyName)) {
          if (value === "") return this[propertyName];
      }
      return value;
    }
  },

  // events

  onchange: function(element) {
    this.setAttribute(element, "aria-valuenow", element.value);
    if (element.value == "" || this.isValid(element)) {
      this.removeClass(element, "jsb-error");
      this.removeAttribute(element, "aria-invalid");
    } else {
      this.addClass(element, "jsb-error");
      this.setAttribute(element, "aria-invalid", true);
    }
  },

  onmousewheel: function(element, event, wheelDelta) {
    if (this.isEditable(element) && control._focus == element) {
      this.increment(element, ~~(wheelDelta / 120));
      event.preventDefault();
    }
  },

  // methods

  convertValueToNumber: parseFloat,
  convertNumberToValue: String,

  getDefaultValue: K(0),

  getValueAsNumber: function(element) {
    return this.convertValueToNumber(element.value);
  },

  setValueAsNumber: function(element, value) {
    this.setValue(element, this.convertNumberToValue(this.getValidValue(element, value)));
  },

  getValidValue: function(element, value, round) {
    if (isNaN(value)) value = this.getDefaultValue();
    var properties = this.getProperties(element),
        min = properties.min,
        max = properties.max,
        scale = properties.scale,
        baseValue = min || this.baseValue;
    // check min/max
    value = value > max ? max : value < min ? min : value;
    // round to step
    value = baseValue + Math[round || "floor"]((value - baseValue) / scale) * scale;
    if (scale < 1) value = value.toFixed(String(properties.step).replace(/^.*\.|^\d+$/, "").length);
    return value;
  },

  getValueAsDate: function(element) {
    var number = this.getValueAsNumber(element, true);
    return isNaN(number) ? null : new Date(number);
  },

  setValueAsDate: function(element, date) {
    this.setValueAsNumber(element, date.valueOf(), true);
  },

  isValid: function(element) {
    var value = this.convertValueToNumber(element.value);
    return !isNaN(value) && value == this.getValidValue(element, value);
  },

  getProperties: function(element) {
    if (element == number._element) {
      var properties = number._properties;
    } else {
      number._element = element;
      properties = number._properties = {};
      properties.min = this.convertValueToNumber(this.get(element, "min")),
      properties.max = this.convertValueToNumber(this.get(element, "max")),
      properties.step = parseFloat(this.get(element, "step")) || 1,
      properties.scale = properties.step * this.stepScale;
    }
    return properties;
  },

  increment: function(element, amount, block) {
    var type = block ? "Block" : "Unit";
    amount *= this["get" + type + "Increment"](element);
    this.setValueAsNumber(element, this.getValueAsNumber(element) + amount);
  },

  getBlockIncrement: function(element) {
    return this.getUnitIncrement(element) * this.block;
  },

  getUnitIncrement: function(element) {
    return (this.get(element, "step") || 1) * this.stepScale;
  }
};


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

  "@MSIE.+win": _MSIEShim, // prevent typing over the background image
  
  _KEYCODE_ACTIVATE: /^(38|40)$/,
  
  // properties

  appearance: "dropdown",
  //role: "combobox",

  Popup: PopupWindow, // popup class
  
  // events

  onblur: function(element, event) {
    if (this.isOpen(element) && !this.popup.isActive()) {
      this.hidePopup();
    }
    this.base(element, event);
  },
  
  "@Opera(8|9.[0-4])": {
    onblur: function(element, event) {
      // Early Opera: mousedown doesn't cancel but blur does. I should fix this in base2.dom. -@DRE
      if (this.isOpen(element) && this.popup.isActive()) {
        event.preventDefault();
      } else {
        this.base(element, event);
      }
    }
  },

  onkeydown: function(element, event, keyCode) {
    if (this.isEditable(element)) {
      if (this._KEYCODE_ACTIVATE.test(keyCode) && !this.isOpen(element)) {
        this.showPopup(element);
        event.preventDefault();
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
    } else if (element.readOnly && element != control._readOnlyTemp) {
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
    return popup && popup == PopupWindow.current && popup.element == element && popup.isOpen();
  },

  showPopup: function(element) {
    if (!this.popup) this.popup = new this.Popup(this);
    this.popup.show(element);
  },

  "@theme=aqua": {
    "@!(style.borderImage)": {
      hitTest: function(element, x) {
        return x >= element[_WIDTH];
      }
    },

    layout: function(element, state) {
      if (state != null) this.syncCursor(element);
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
    if (propertyName == "list" && value && typeof value == "string") {
      return this.querySelector("#" + value);
    }
    return value;
  },

  "@(hasFeature('WebForms','2.0'))": {
    isNativeControl: function(element) {
      return element.nodeName == "INPUT" && element.list;
    }
  },

  Popup: MenuList
});

// =========================================================================
// chrome/range.js
// =========================================================================

var range = control.extend({
  "implements": [number],

  // constants

  _IMAGE_SIZE: 3000,

  "@Opera8": {
    _IMAGE_SIZE: 2000
  },
  
  // properties
  
  min:  "0",
  max:  "100",
  
  allowVertical: true,
  type: "range", // web forms 2.0 type

  // events

  "@MSIE(5.5|[^5])": _preventScroll,

  onpropertyset: function(element, event, propertyName) {
    if (/^(max|min|step|value)$/.test(propertyName)) {
      this.layout(element);
    } else {
      this.base(element, event, propertyName);
    }
  },

  "@!theme=aqua": {
    onfocus: function(element, event) {
      if (element != control._active) {
        this.addClass(element, this.appearance + _FOCUS);
      }
      this.base(element, event);
    }
  },

  onkeydown: function(element, event, keyCode, shiftKey, ctrlKey, altKey, metaKey) {
    if (!this.isEditable(element) || keyCode < 33 || shiftKey || ctrlKey || altKey || metaKey) return;

    event.preventDefault();
    
    if (keyCode > 40) return;

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

  getValidValue: function(element, value, round) {
    return this.base(element, value, round || "round");
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
  
  _CHUNK_SIZE: 1,

  "@theme=luna": {
    _CHUNK_SIZE: 10
  },

  // properties

  appearance: "progressbar",
  //role: "progressbar",

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
      var left = (-clientWidth / 2) * (clientWidth + 3) - 2,
          top = ~~(clientHeight * relativeValue);
      top = clientHeight - Math.round(top / this._CHUNK_SIZE) * this._CHUNK_SIZE;
    } else {
      left = ~~(clientWidth * relativeValue) - this._IMAGE_SIZE;
      left = Math.round(left / this._CHUNK_SIZE) * this._CHUNK_SIZE;
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

  _HORIZONTAL_HEIGHT: 21,
  _VERTICAL_WIDTH: 22,
  _THUMB_SIZE: 11,
  _IMAGE_SIZE: 3000,

  "@Opera8": {
    _IMAGE_SIZE: 500
  },

  // properties

  appearance: "slider",
  //role: "slider",

  // events

  onmousedown: function(element, event, x, y, screenX, screenY) {
    this.base.apply(this, arguments);

    if (element.disabled) return;

    if (element.type == this.type) {
      event.preventDefault();
      if (element.readOnly) element.focus();
    }
    
    if (element.readOnly) return;

    // This is the behavior for Windows and Linux
    
    if (control._activeThumb) {
      var thumb = this.getThumbRect(element);
      slider._dragInfo = {
        dx: screenX - thumb.left,
        dy: screenY - thumb.top
      };
      slider._firedOnce = true;
      event.preventDefault();
    } else {
      this.startTimer(element);
      slider._value = this.getValueByPosition(element, x - this._THUMB_SIZE / 2, y - this._THUMB_SIZE / 2);
      slider._direction = slider._value < parseFloat(element.value) ? -1 : 1;
      if (element.type == this.type) {
        element.focus();
      }
      slider._firedOnce = false;
    }
  },

  onlosecapture: function(element) {
    delete slider._dragInfo;
    this.base(element);
  },

  onmouseup: function(element) {
    this.base.apply(this, arguments);
    if (!this.isEditable(element)) return;
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

  /*"@Opera(8|9.[0-4])": { // prevent text selection for early versions of Opera
    onmousemove: function(element) {
      if (slider._dragInfo) {
        document.getSelection().collapse(element.ownerDocument.body, 0);
      }
      this.base.apply(this, arguments);
    }
  },*/

  // methods

  getState: function(element) {
    if (element.disabled) {
      var state = "disabled";
    } else if (element == control._active && control._activeThumb) {
      state = "active";
    } else if (element == control._focus || (!element.readOnly && element == control._hover && control._hoverThumb)) {
      state = "hover";
    } else {
      state = "normal";
    }
    return this.states[state];
  },

  getThumbRect: function(element) {
    var clientWidth = element[_WIDTH],
        clientHeight = element[_HEIGHT],
        relativeValue = this.getProperties(element).relativeValue;
    if (clientHeight > clientWidth) {
      return new Rect(
        (clientWidth - this._VERTICAL_WIDTH) / 2,
        (clientHeight -= this._THUMB_SIZE) - ~~(clientHeight * relativeValue),
        this._VERTICAL_WIDTH,
        this._THUMB_SIZE
      );
    } else {
      return new Rect(
        ~~((clientWidth - this._THUMB_SIZE) * relativeValue),
        ~~((clientHeight - this._HORIZONTAL_HEIGHT) / 2),
        this._THUMB_SIZE,
        this._HORIZONTAL_HEIGHT
      );
    }
  },

  getValueByPosition: function(element, x, y) {
    var clientWidth = element[_WIDTH],
        clientHeight = element[_HEIGHT],
        properties = this.getProperties(element);
    if (clientWidth >= clientHeight) {
      var size = clientWidth - this._THUMB_SIZE;
      var pos = x;
    } else {
      size = clientHeight - this._THUMB_SIZE;
      pos = size - y;
    }
    return (properties.max - properties.min) * (pos / size);
  },

  hitTest: function(element, x, y) {
    if (element.disabled || this.isNativeControl(element)) return null;
    return this.getThumbRect(element).contains(x, y);
  },

  layout: function(element, state) {
    if (state == null) state = this.getState(element);

    var thumb = this.getThumbRect(element),
        style = element.style,
        thumbOffset = Math.ceil((this._IMAGE_SIZE - this._THUMB_SIZE) / 2) + state * this._IMAGE_SIZE;

    if (element[_HEIGHT] > element[_WIDTH]) {
      var left = thumb.left,
          top = thumb.top - thumbOffset;
    } else {
      left = thumb.left - thumbOffset;
      top = thumb.top;
    }

    var backgroundPosition = left + PX + " " + top + PX;
    if (style.backgroundPosition != backgroundPosition) {
      style.backgroundPosition = backgroundPosition;
    }
  },

  setValueByPosition: function(element, x, y) {
    this.setValueAsNumber(element, this.getValueByPosition(element, x, y));
  },

  tick: function(element) {
    var properties = this.getProperties(element),
        amount = this.getBlockIncrement(element) * (properties.max - properties.min);
    if (Math.abs(slider._value - element.value) < amount) {
      this.setValueAsNumber(element, slider._value);
      this.stopTimer(element);
    } else {
      this.increment(element, slider._direction, true);
    }
    slider._firedOnce = true;
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
        this.setValueByPosition(element, x - this._THUMB_SIZE / 2, y - this._THUMB_SIZE / 2);
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
  "implements": [number],

  "@MSIE.+win": _MSIEShim, // prevent typing over the background image

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

  type: "number", // web forms 2.0 type
  appearance: "spinner",
  //role: "spinbutton",

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

    this.deactivate(element);
  },

  onmousedown: function(element) {
    this.base.apply(this, arguments);
    if (control._activeThumb) {
      this.startTimer(element);
    }
  },

  onlosecapture: function(element, event) {
    this.base(element, event);
    this.deactivate(element);
  },

  // methods

  activate: function(element, direction, block) {
    control._activeThumb = control._hoverThumb = direction;
    this.layout(element);
    spinner._block = block;
    this.startTimer(element);
  },

  deactivate: function(element) {
    this.stopTimer(element);
    delete control._activeThumb;
    //delete control._hoverThumb;
    delete spinner._block;
    this.layout(element);
  },

  getState: function(element) {
    if (element.disabled) {
      var state = "disabled";
    } else if (element.readOnly && element != control._readOnlyTemp) {
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
      if (element.select) element.select();
      this.syncCursor(element)
    }
  },

  tick: function(element) {
    this.increment(element, ~~(spinner._steps * spinner._direction), !!spinner._block);
    spinner._steps *= 1.05; // accelerate
    spinner._firedOnce = true;
  }
});

// =========================================================================
// chrome/timepicker.js
// =========================================================================

var timepicker = spinner.extend({
  // constants

  FORMAT: "hh:mm:ss",

  // properties

  appearance: "timepicker",
  block: 60,
  step: "60",
  stepScale: 1000,
  type: "time", // web forms 2.0 type

  /*"@(Date.prototype.toLocaleTimeString)": {
    onchange: function(element) {
      this.base(element);
      if (!this.hasClass(element, "jsb-error") && element.value) {
        this.showToolTip(element, new Date(Date2.parse("T" + element.value + "Z")).toLocaleTimeString());
      }
    }
  },*/

  // methods

  getDefaultValue: function() {
    var date = new Date;
    return Date.UTC(1970, 0, 1, date.getHours(), date.getMinutes(), 0, 0);
  },

  convertValueToNumber: function(value) {
    return value == "" ? NaN : Date2.parse("1970-01-01T" + value + "Z");
  },

  convertNumberToValue: function(number) {
    return isNaN(number) ? "" : Date2.toISOString(new Date(number)).slice(11, 16);
    //var value = Date2.toISOString(new Date(number)).slice(11).replace(/\.\d{3}Z$/, "");
    //return value.replace(/:00$/, ""); // fix me: this should be dependant on an element's step attribute
  }
});

// =========================================================================
// chrome/datepicker.js
// =========================================================================
var datepicker = dropdown.extend({
  "implements": [number],

  // constants
  
  FORMAT: "yyyy-mm-dd",

  // properties
  
  type: "date", // web forms 2.0 type
  appearance: "datepicker",
  stepScale: _DAY,
  
  // events

  showLocaleString: Undefined,
  
  "@(Date.prototype.toLocaleDateString)": {
    onchange: function(element) {
      this.base(element);
      if (!this.hasClass(element, "jsb-error") && element.value) {
        this.showLocaleString(element);
      }
    },

    "@!Opera|Linux": { // Opera's local date strings aren't very helpful
      showLocaleString: function(element) {
        this.showToolTip(element, new Date(Date2.parse(element.value + "T")).toLocaleDateString());
      }
    }
  },
  
  // methods

  getDefaultValue: Date2.now,

  convertValueToNumber: function(value) {
    return value == "" ? NaN : Date2.parse(value + "T00:00Z");
  },

  convertNumberToValue: function(number) {
    return isNaN(number) ? "" : Date2.toISOString(new Date(number)).slice(0, 10);
  },

  normalise: I,
  
  // properties
  
  Popup: {
    appearance: "datepicker-popup",

    scrollX: false,
    scrollY: false,

    currentDate: 0,
    state: {},
  
    render: function() {
      this.base(
format('<div style="padding:4px!important"><table cellspacing="0">\
<tr>\
<td><select>' +
wrap(chrome.locale.months, "option") +
'</select></td>\
<td align="right"><input type="text" class="jsb-spinner" size="4"></td>\
</tr>\
<tr>\
<td colspan="2">\
<table role="grid" class="jsb-datepicker-days" cellspacing="0">\
<tr>' + wrap(chrome.locale.days, "th", '%1') + '</tr>' +
Array(7).join('<tr>' + Array(8).join('<td %1>0</td>') + '</tr>') +
'</table>\
</td>\
</tr>\
</table></div>', 'role="gridcell" unselectable="on"')
);
      
      this.year = this.querySelector("input");
      this.month = this.querySelector("select");
      this.days = this.querySelector("table.jsb-datepicker-days");
      
      this.year.onscroll = _resetScroll;
      spinner.attach(this.year);

      this.month.selectedIndex = 8; // september is the longest month (in terms of text)
      
      this.setUnselectable(this.days);
      
      this.render = Undefined; // do once
    },

    onblur: function(event) {
      ClassList.add(this.days, "jsb-datepicker-days_focus");
    },

    onchange: function(event) {
      if (this.currentMonth != this.month.selectedIndex) {
        this.increment("Month", this.month.selectedIndex - this.currentMonth);
      } else {
        this.increment("FullYear", this.year.value - this.currentYear);
      }
      event.stopPropagation();
    },

    onfocus: function(event) {
      if (event.target != this.days) {
        ClassList.remove(this.days, "jsb-datepicker-days_focus");
      }
    },

    onkeydown: function(event) {
      var keyCode = event.keyCode,
          target = event.target,
          step = parseFloat(this.owner.get(this.element, "step")) || 1;
          
      if (keyCode == 13) { // enter
        this.select(this.currentItem);
        event.preventDefault();
      } else if (/^(3[346789]|40)$/.test(keyCode)) { // navigation keys (arrows etc)
        if (target == this.month) {
          setTimeout(bind(function() {
            if (this.currentMonth != this.month.selectedIndex) {
              this.increment("Month", this.currentMonth - this.month.selectedIndex);
            }
          }, this), 1);
        } else if (target != this.year) {
          event.preventDefault();
          switch (keyCode) {
            case 36: // home
              this.highlighByDate(this.owner.getValueAsDate(this.element) || this.getDefaultDate());
              break;
            case 37: // left
              this.increment("Date", -step);
              break;
            case 39: // right
              this.increment("Date", step);
              break;
            case 38: // up
              this.increment("Date", -step * 7);
              break;
            case 40: // down
              this.increment("Date", step * 7);
              break;
            case 33: // page up
              if (event.ctrlKey) { // increment by year if the ctrl key is down
                this.increment("FullYear", -1);
              } else { // by month
                this.increment("Month", -1);
              }
              break;
            case 34: // page down
              if (event.ctrlKey) {
                this.increment("FullYear", 1);
              } else {
                this.increment("Month", 1);
              }
              break;
          }
        }
      } else {
        this.base(event);
      }
    },

    onmouseup: function(event) {
      var day = event.target;
      if (day.className == "disabled" || !Traversal.contains(this.days, day)) return;
      this.select(this.currentItem);
    },

    onmouseover: function(event) {
      var target = event.target;
      if (target.currentItem != target && target.nodeName == "TD" && target.className != "disabled" && Traversal.contains(this.days, target)) {
        this.highlight(target);
        this.currentDate = ~~target[_TEXT_CONTENT];
      }
    },

    onmousemove: function(event) {
      this.onmouseover(event);
    },

    onmousewheel: function(event) {
      event.preventDefault();
      this.increment("Month", ~~(event.wheelDelta / 120));
    },

    // methods

    fill: function() {
      this.currentYear = this.year.value;
      this.currentMonth = this.month.selectedIndex;
      var month = this.currentMonth,
          d = new Date(Date.UTC(this.currentYear, month, 1)),
          d2 = new Date(d),
          owner = this.owner,
          properties = owner.getProperties(this.element),
          baseValue = properties.min || owner.baseValue,
          step = properties.step,
          scale = properties.scale,
          min = properties.min,
          max = properties.max,
          minMonth = 0,
          maxMonth = 11,
          option;
          
      if (isNaN(min)) {
        min = -Infinity;
      } else {
        var minDate = new Date(min);
        if (this.currentYear == minDate.getUTCFullYear()) {
          minMonth = minDate.getUTCMonth();
        }
      }

      if (isNaN(max)) {
        max = Infinity;
      } else {
        var maxDate = new Date(max);
        if (this.currentYear == maxDate.getUTCFullYear()) {
          maxMonth = maxDate.getUTCMonth();
        }
      }
      
      for (var i = 0; option = this.month.options[i]; i++) {
        var disabled = i < minMonth || i > maxMonth;
        option.disabled = disabled;
        option.style.color = disabled ? "graytext" : "";
      }
          
      d.setUTCDate(d.getUTCDate() - d.getUTCDay() + chrome.locale.firstDay);
      // ensure that we do not start after the first of the month
      if (d > d2) {
        d.setUTCDate(d.getUTCDate() - 7);
      }

      var rows = this.days.rows, row,
          currentCell, lastCell;
      for (var i = 1; row = rows[i]; i++) {
        var cells = row.cells, cell, hasDays = false;
        row.className = "";
        if (owner == weekpicker && ((step != 1 && (d - baseValue) % scale != 0) || d < min || d > max)) {
          row.className = "disabled";
        }
        for (var j = 0; cell = cells[j]; j++) {
          var date = d.getUTCDate(),
              isSameMonth = month == d.getUTCMonth();
          cell.innerHTML = date;
          cell.className = "";
          cell.style.fontStyle = isSameMonth ? "" : "italic";
          if (isSameMonth && d >= min && d <= max) {
            lastCell = cell;
            if (this.currentDate == date) currentCell = cell;
            if (owner == datepicker && step != 1 && (d - baseValue) % scale != 0) {
              cell.className = "disabled";
            }
          } else {
            cell.className = "disabled";
          }
          hasDays |= isSameMonth;
          d.setUTCDate(date + 1);
        }
        row.style.visibility = hasDays ? "" : "hidden";
      }
      this.highlight(currentCell || lastCell);
    },

    getDefaultDate: function() {
      var state = this.state[this.element.uniqueID];
      return new Date(this.owner.getValidValue(this.element, this.owner.getValueAsDate(this.element) || (state ? new Date(state) : new Date()), "round"));
    },

    getUTCDate: function() {
      return new Date(Date.UTC(this.year.value, this.month.selectedIndex, this.currentDate));
    },

    hide: function() {
      if (this.element) {
        this.state[this.element.uniqueID] = this.getUTCDate();
      }
      this.base();
    },

    highlight: function(item) {
      if (item) {
        this.reset(this.currentItem);
        this.currentItem = item;
        ClassList.add(item, "selected");
        Element.setAttribute(item, "aria-selected", true);
        //item.tabIndex = -1;
        //if (this.isOpen()) item.focus();
      }
    },

    highlighByDate: function(date) {
      date = this.owner.normalise(date);
      this.year.value = date.getUTCFullYear();
      this.month.selectedIndex = date.getUTCMonth();
      this.currentDate = date.getUTCDate();
      if (this.currentYear == this.year.value && this.currentMonth == this.month.selectedIndex) {
        var days = this.body.getElementsByTagName("td");
        this.highlight(days[14 - days[14].innerHTML + this.currentDate]);
      } else {
        this.fill();
      }
    },

    increment: function(type, amount) {
      var date = new Date(Date.UTC(this.currentYear, this.currentMonth, this.currentDate));
      date["setUTC" + type](date["getUTC" + type]() + amount);
      date = new Date(this.owner.getValidValue(this.element, date, "round"));
      this.highlighByDate(date);
      //this.element.value = this.owner.convertNumberToValue(date.valueOf());
    },

    layout: function() {
      var date = this.owner.normalise(this.getDefaultDate());
      this.year.value = date.getUTCFullYear();
      this.month.selectedIndex = date.getUTCMonth();
      this.currentDate = date.getUTCDate();
      this.fill();
      spinner.layout(this.year);
    },

    movesize: function() {
      this.base();
      this.days.style.width = (parseInt(this.body.style.width) - 10) + "px";
    },

    reset: function(item) {
      if (item) {
        //item.tabIndex = 0;
        Element.removeAttribute(item, "aria-selected");
        ClassList.remove(item, "selected");
      }
    },

    select: function() {
      var element = this.element;
      this.owner.setValueAsDate(element, this.getUTCDate());
      this.hide();
      element.focus();
    },

    show: function(element) {
      this.base(element);
      //if (this.currentItem) this.currentItem.focus();
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
      this.highlight(days[14 - days[14].innerHTML + this.currentDate]);
      ClassList.add(this.days, "jsb-datepicker-days_focus");
    }
  }
});

// =========================================================================
// chrome/weekpicker.js
// =========================================================================

var weekpicker = datepicker.extend({
  // constants
  
  FORMAT: "yyyy-Www",
  PATTERN: /^\d{4}-W([0-4]\d|5[0-3])$/,
  
  // properties

  baseValue: Date.UTC(1969, 11, 29),
  type: "week", // web forms 2.0 type
  appearance: "weekpicker",
  stepScale: 7 * _DAY,
  
  onfocus: function(element, event) {
    this.base(element, event);
    element.setAttribute("spellcheck", "false");
  },

  showLocaleString: Undefined,

  convertValueToNumber: function(value) {
    if (!this.PATTERN.test(value)) return NaN;
    var parts = String(value).split("-W"),
        year = parts[0],
        week1 = this.getFirstWeek(year),
        week = parts[1],
        date = new Date(week1.valueOf() + (week - 1) * this.stepScale);
    return (week == 53 && new Date(Date.UTC(year, 0, 1)).getUTCDay() != chrome.locale.firstDay + 3) ? NaN : date.valueOf();
  },

  convertNumberToValue: function(number) {
    var date = this.normalise(number),
        year = date.getUTCFullYear(),
        week1 = this.getFirstWeek(year),
        week = ~~((date - week1) / this.stepScale) + 1;
    return pad(year, 4) + "-W" + pad(week);
  },
  
  getFirstWeek: function(year) {
    var date = new Date(Date.UTC(year, 0, 1)),
  	    day = date.getUTCDay() - chrome.locale.firstDay;
    if (day > 3) day -= 7;
    date.setUTCDate(date.getUTCDate() - day);
    return date;
  },

  normalise: function(value) {
    return new Date(this.baseValue + ~~((value - this.baseValue) / this.stepScale) * this.stepScale + 3 * _DAY);
  },

  Popup: {
    onkeydown: function(event) {
      if (!/^(37|39)$/.test(event.keyCode)) { // ignore datepicker behavior for left/right arrows
        this.base(event);
      }
    },
    
    onmouseover: function(event) {
      var target = event.target;
      if (target.nodeName == "TD") {
        target = target.parentNode;
      }
      if (target.nodeName == "TR" && Traversal.contains(this.days, target) && !ClassList.has(target, "disabled")) {
        var cell = NodeSelector.querySelector(target, "td:not(.disabled)");
        if (cell) {
          this.highlight(target);
          this.currentDate = ~~cell[_TEXT_CONTENT];
        }
      }
    },

    onmouseup: function(event) {
      var target = event.target;
      if (target.nodeName == "TD") {
        target = target.parentNode;
      }
      if (target.nodeName == "TR" && Traversal.contains(this.days, target) && !ClassList.has(target, "disabled")) {
        this.select();
      }
    },
    
    highlight: function(item) {
      if (item && item.nodeName == "TD") {
        item = item.parentNode;
      }
      if (!ClassList.has(item, "disabled")) {
        this.base(item);
      }
    }
  }
});

// =========================================================================
// chrome/monthpicker.js
// =========================================================================

var monthpicker = spinner.extend({
  // constants

  FORMAT: "yyyy-mm",
  
  // properties
  
  type: "month", // web forms 2.0 type
  block: 12,
  appearance: "monthpicker",

  /*onchange: function(element) {
    this.base(element);
    if (!this.hasClass(element, "jsb-error") && element.value) {
      var date = this.getValueAsDate(element, true);
      this.showToolTip(element, chrome.locale.months[date.getUTCMonth()] + " " + date.getUTCFullYear());
    }
  },*/

  // methods

  convertValueToNumber: function(value) {
    if (value == "" || isNaN(Date2.parse(value + "-01T"))) return NaN;
    value = value.split("-");
    return (value[0] * 12) + parseInt(value[1], 10) - 1;
  },

  convertNumberToValue: function(number) {
    return isNaN(number) ? "" : Date2.toISOString(new Date(~~(number / 12), number % 12, 12)).slice(0, 7);
  },

  getDefaultValue: function() {
    var date = new Date;
    return date.getFullYear() * 12 + date.getMonth();
  },

  getValueAsNumber: function(element, external) {
    return external ? Date2.parse(element.value + "-01T00:00Z") : this.base(element);
  },

  setValueAsNumber: function(element, value, external) {
    if (external) {
      value = this.convertValueToNumber(Date2.toISOString(new Date(value)).slice(0, 7));
    }
    this.base(element, value);
  }
});

// =========================================================================
// chrome/colorpicker.js
// =========================================================================

var colorpicker = dropdown.extend({
  PATTERN: /^#[\da-f]{6}$/,
  
  type: "color", // web forms 2.0 type
  appearance: "colorpicker",

  // events

  "@MSIE(5.5|[^5])": _preventScroll,

  "@Opera": {
    onattach: function(element) {
      ClassList.add(element, "jsb-" + this.appearance);
      this.base(element);
    }
  },

  onkeydown: function(element, event, keyCode, shiftKey, ctrlKey, altKey, metaKey) {
    this.base(element, event, keyCode);
    
    if (keyCode < 33 || shiftKey || ctrlKey || altKey || metaKey) return;

    event.preventDefault();
  },

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
    var color = element.value;
    if (!this.PATTERN.test(color)) color = "black";
    element.style.color =
    element.style.backgroundColor = color;
  },

  hitTest: True, // click wherever you want...

  Popup: {
    appearance: "colorpicker-popup", // popup style class

    onchange: function(event) {
      var rgb = map(pluck(this.controls, "value"), Number); // array of rgb values
      var value = reduce(rgb, function(value, channel) {    // convert to: #string
        return value += pad(channel.toString(16));
      }, "#");
      this.owner.setValue(this.element, value);
      event.stopPropagation();
    },

    layout: function() {
      var rgb = map(this.element.value.slice(1).match(/(\w\w)/g), partial(parseInt, undefined, 16)); // array of rgb values
      this.controls.forEach(function(channel, i) {
        channel.value = rgb[i];
        slider.layout(channel); // redraw
      });
    },

    render: function() {
      var SLIDER = ': <input class="jsb-slider" min="0" max="255">';
      this.base(wrap([
        "R" + SLIDER,
        "G" + SLIDER,
        "B" + SLIDER
      ], "div", 'nowrap unselectable="on"'));
      
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
  }
});

// =========================================================================
// chrome/styleSheet.js
// =========================================================================

var _border = extend({}, {
  color:               "threedface",

  "@theme=luna\\/blue": {
    color:             "#7f9db9"
  },

  "@theme=luna\\/olive": {
    color:             "#a4b97f"
  },

  "@theme=luna\\/silver": {
    color:             "#a5acb2"
  },

  "@theme=royale": {
    color:             "#a7a6aa"
  },

  "@theme=aero": {
    color:             "#abadb3 #dbdfe6 #e3e9ef #e2e3ea"
  },

  "@theme=zune": {
    color:             "#969696"
  }
});

jsb.theme.cssText = jsb.createStyleSheet({
  "*": {
    backgroundPosition:        "9999px 9999px",
    backgroundAttachment:      "scroll!",
    backgroundRepeat:          "no-repeat!",

    "@!theme=classic": {
      padding:                 "2px",
      border:                  "1px solid",
      borderColor:             _border.color
    },

    "@theme=aqua": {
      padding:                 "1px 2px 2px 2px",
      borderWidth:             "2px 1px 1px 1px",
      borderColor:             "#9e9e9e #b4b4b4 #dadada #b4b4b4"
    }
  },

  ".jsb-dropdown,.jsb-combobox,.jsb-colorpicker,.jsb-datepicker,.jsb-weekpicker": {
    "@theme=aqua": {
      width:                  "10em",
      borderRadius:           "5px",
      boxShadow:              "0 1px 4px rgba(160, 160, 160, 0.5)",

      "@(style.borderImage)": {
        borderImage:          "url(%theme%/dropdown.png) 1 18 1 4!",
        borderStyle:          "none!",
        borderWidth:          "1px 18px 1px 4px!",
        padding:              "1px"
      },

      "@!(style.borderImage)": {
        backgroundImage:      "url(%theme%/bg-dropdown.png)!",
        backgroundPosition:   "right center!",
        padding:              "1px 22px 1px 4px!",
        border:               "1px solid #545454!"
      }
    },

    "@!theme=aqua": {
      paddingRight:           "19px!",
      backgroundImage:        "url(%theme%/dropdown.png)!"
    }
  },

  ".jsb-colorpicker,.jsb-datepicker,.jsb-weekpicker": {
    width:                    "8em"
  },

  ".jsb-progressbar,.jsb-slider,.jsb-colorpicker": {
    cursor:                   "default",
    textIndent:               "-10em!", // hide text for purely visual controls (Gecko, Webkit and Opera)
    userModify:               "read-only!",
    MozUserSelect:            "none!", // still buggy in webkit

    "@MSIE": { // hide text for purely visual controls (MSIE)
      textIndent:         0,

      "@MSIE(5.5|6|7)": {
        lineHeight:       999
      },

      "@MSIE[^567]": {
        lineHeight:       999,
        verticalAlign:    "middle" // Argh! This is bad. It means that the normal vertical alignment doesn't work. :(
      }
    }
  },

  ".jsb-progressbar,.jsb-slider": {
    verticalAlign:        "middle" // not sure about this
  },

  ".jsb-progressbar": {
    minHeight:             "8px",
    borderColor:           "threeddarkshadow",
    borderWidth:           "1px",
    borderRadius:          "5px",
    backgroundImage:       "url(%theme%/progressbar.png)!",

    "@Opera8": {
      backgroundImage:     "url(themes/s/progressbar.png)!"
    }
  },

  ".jsb-slider": {
    height:               "21px",
    minHeight:            "21px",
    padding:              0,
    border:               "none",
    backgroundColor:      "transparent",
    backgroundImage:      "url(%theme%/slider.png)!",

    "@Opera8": {
      backgroundImage:    "url(themes/s/slider.png)!"
    },

    "@Gecko1\\.[0-3]": {
      backgroundColor:    "#f2f2f2"
    }
  },

  ".jsb-popup": {
    visibility:         "hidden",
    backgroundColor:    _WINDOW,
    borderWidth:        "1px!",
    position:           "absolute!",
    zIndex:             "999999!",
    cursor:             "default",
    padding:            "0!",
    margin:             "0!",

    "@Gecko|Opera|theme=aqua|Webkit": {
      borderColor:      "threedshadow!",
      borderStyle:      "outset!",

      "@Opera": {
        borderStyle:    "solid!"
      }
    },

    "@theme=classic": {
      borderColor:      "threedshadow!",
      borderStyle:      "solid!"
    }
  },

  ".jsb-spinner": {
    "@!Opera[78]": {
      textAlign:        "right"
    },
    width:              "5em",
    paddingRight:       "19px!",
    backgroundImage:    "url(%theme%/spinner.png)!"
  },

  ".jsb-timepicker,.jsb-monthpicker": {
    width:              "8ex",
    paddingRight:       "19px!",
    backgroundImage:    "url(%theme%/spinner.png)!",

    "@QuirksMode|Gecko1\\.[0-3]|Opera8": {
      width:            "6em"
    }
  },

  ".jsb-popup .jsb-datepicker-days": {
    userSelect:         "none!",
    width:              "100%!",
    margin:             "2px 0 0 0!",
    padding:            "2px!",
    backgroundColor:    _WINDOW + "!",
    color:              "windowtext!"
  }
});

jsb.theme.cssText += "\n" + jsb.createStyleSheet({
  ".jsb-popup *": {
    margin: "0!",
    padding: "0!"
  },
  
  ".jsb-popup option": {
    padding: "0 3px!"
  },

  ".jsb-colorpicker": {
    width:         "4em",

    "@QuirksMode|Gecko1\\.[0-3]|Opera8": {
      width:       "6em"
    }
  },

  ".jsb-datepicker": {
    width:         "12ex",

    "@QuirksMode|Gecko1\\.[0-3]|Opera8": {
      width:       "15ex"
    }
  },

  ".jsb-weekpicker": {
    width:         "11ex",

    "@QuirksMode|Gecko1\\.[0-3]|Opera8": {
      width:       "14ex"
    }
  },

  "@Webkit": {
    ".jsb-slider:focus:not(.slider_focus)": {
      outline:        "none!"
    }
  },

  "@!Webkit": {
    ".progressbar_focus,.slider_focus,.colorpicker_focus": {
      outline:        "1px dotted"
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
      overflowY:     "auto!"
    }
  },

  ".jsb-menulist div": {
    margin:          "0!",
    padding:         "1px 2px!",
    overflow:        "hidden!",
    whiteSpace:      "nowrap!"
  },

  ".jsb-colorpicker-popup": {
    backgroundColor:      "buttonface!",
    color:                "buttontext!",
    fontSize:             "11px!",
    padding:              "4px!",
    overflow:             "hidden!",
    whiteSpace:           "nowrap!",
    userSelect:           "none!",

    "@Webkit([1-4]|5[01]|52[^89])|Chrome": {
      backgroundColor: "#ece9d8!"
    }
  },

  ".jsb-colorpicker-popup input": {
    fontSize:        "11px",
    margin:          "4px 2px!",
    verticalAlign:   "middle",
    width:           "127px"
  },

  ".jsb-datepicker-popup": {
    backgroundColor:      "#fcfcfd!",
    overflow:             "hidden!",

    "@theme=classic": {
      backgroundColor:      "threedface!"
    }
  },

  ".jsb-datepicker-popup input": {
    width:             "5ex!",
    marginLeft:        "2px!",
    padding:           "2px 19px 2px 2px!",

    "@QuirksMode|Gecko1\\.[0-3]|Opera8": {
      width:           "9ex!"
    },

    "@!MSIE[567]|Opera": {
      padding:         "1px 19px 1px 2px!"
    }
  },

  ".jsb-datepicker-popup th": {
    backgroundColor: "infobackground!",
    color:           "infotext!",
    fontWeight:      "normal!"
  },

  ".jsb-datepicker-popup th,.jsb-datepicker-days td": {
    padding:         "2px 0!",
    textAlign:       "center!",
    width:           "14%!"
  },

  ".jsb-datepicker-days td.disabled,.jsb-datepicker-days tr.disabled td": {
    color:            "graytext!"
  },

  ".jsb-datepicker-days td.selected,.jsb-datepicker-days tr.selected td": {
    backgroundColor: "inactivecaptiontext!",
    color:           "inactivecaption!",
    opacity:         0.5
  },

  ".jsb-datepicker-days_focus td.selected,.jsb-datepicker-days_focus tr.selected td": {
    backgroundColor: _HIGHLIGHT + "!",
    color:           _HIGHLIGHT_TEXT + "!",
    opacity:         1
  },

  "@theme=luna\\/blue": {
    ".jsb-datepicker-popup th": {
      backgroundColor: "#ffffe1!"
    }
  },

  "@theme=(human|clearlooks)": {
    ".jsb-combobox,.jsb-datepicker,.jsb-weekpicker,.jsb-colorpicker": {
      "borderTopRightRadius":          "5px",
      "borderBottomRightRadius":       "5px"
    }
  },

  "@theme=aqua": {
    ".jsb-menulist": {
      opacity:            0.95
    },

    ".jsb-spinner,.jsb-timepicker,.jsb-monthpicker": {
      borderTopWidth:                  "1px",
      paddingTop:                      "2px",
      borderRightColor:                "transparent",
      borderTopRightRadius:            "5px",
      borderBottomRightRadius:         "5px"
    },

    ".jsb-spinner[disabled],.jsb-spinner[readonly],.jsb-timepicker[disabled],.jsb-timepicker[readonly],.jsb-monthpicker[disabled],.jsb-monthpicker[readonly]": {
      borderColor:      "#d6d6d6 #e0e0e0 #f0f0f0 #e0e0e0"
    },

    ".jsb-combobox[readonly],.jsb-combobox[disabled],.jsb-datepicker[readonly],.jsb-datepicker[disabled],.jsb-weekpicker[readonly],.jsb-weekpicker[disabled]": {
      "@(style.borderImage)": {
        borderImage:   "url(%theme%/dropdown-disabled.png) 1 18 1 4!"
      },

      "@!(style.borderImage)": {
        backgroundImage:   "url(%theme%/bg-dropdown-disabled.png)!"
      }
    },

    "@(style.borderImage)": {
      ".jsb-colorpicker": {
        borderImage:       "url(%theme%/colorpicker.png) 1 18 1 4!"
      },

      ".jsb-colorpicker[readonly],.jsb-colorpicker[disabled]": {
        borderImage:       "url(%theme%/colorpicker-disabled.png) 1 18 1 4!"
      }
    },

    "@!(style.borderImage)": {
      ".jsb-colorpicker": {
        backgroundImage:   "url(%theme%/bg-colorpicker.png)!"
      },

      ".jsb-colorpicker[readonly],.jsb-colorpicker[disabled]": {
        backgroundImage:   "url(%theme%/bg-colorpicker-disabled.png)!"
      }
    },

    ".jsb-combobox[disabled],.jsb-datepicker[disabled],.jsb-weekpicker[disabled],.jsb-colorpicker[disabled],.jsb-progressbar[disabled]": {
      color:         "windowtext",
      opacity:       0.5
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

    ".jsb-monthpicker": {
      width:         "5em"
    },

    ".jsb-datepicker-popup th": {
      backgroundColor: "#89acd5!",
      color:           "white!"
    }
  },

  ".jsb-tooltip": {
    borderColor:        "graytext!",
    backgroundColor:    "infobackground!",
    color:              "infotext!",
    fontSize:           "small!",
    boxShadow:          "2px 4px 4px rgba(160, 160, 160, 0.5)",

    "@MSIE.+QuirksMode": {
      fontSize:         "x-small!"
    }
  },

  ".jsb-tooltip div": {
    padding:            "2px 3px 0 3px!"
  },

  "@(hasFeature('WebForms','2.0'))": {
    "input[list],input[type=number],input[type=date],input[type=time],input[type=month],input[type=week],input[type=range]": {
      backgroundImage:  "none!"
    }
  },

  ".jsb-error": {
    borderColor:      "#ff5e5e",
    outlineColor:     "#ff5e5e"
  },

  "@Safari.+win" : {
    "@!theme=aqua": {
      "input,select": {
        outlineColor:  _border.color,

        "@theme=classic": {
          outlineColor:  "threedface"
        }
      }
    }
  }
});

// =========================================================================
// chrome/init.js
// =========================================================================

// text resize

new Rule("html", {
  ondocumentready: function() {
    var dummy = document.createElement("span"), height;
    dummy.style.cssText = "position:absolute;left:0;top:-9999px;";
    dummy.innerHTML = "&nbsp;";
    document.body.appendChild(dummy);
    setTimeout(function checkSize() {
      var resized = height != null && height != dummy.clientHeight;
      height = dummy.clientHeight;
      if (resized) {
        Array2.batch(document.getElementsByTagName("input"), function(element) {
          var behavior = _attachments[element.uniqueID];
          if (behavior) behavior.layout(element);
        }, 100, checkSize);
      } else {
        setTimeout(checkSize, 200);
      }
    }, 200);
  }
});

if (detect("MSIE6")) {
  document.execCommand("BackgroundImageCache", false, true);
}

// =========================================================================
// chrome/rules.js
// =========================================================================

chrome.rules = new RuleList({
  "input.jsb-colorpicker": colorpicker,
  "input.jsb-slider": slider,
  "input.jsb-progressbar": progressbar,
  "input.jsb-combobox": combobox,
  "input.jsb-spinner": spinner,
  "input.jsb-timepicker": timepicker,
  "input.jsb-datepicker": datepicker,
  "input.jsb-weekpicker": weekpicker,
  "input.jsb-monthpicker": monthpicker
});

if (jsb.clientWidth2) jsb.createStyleSheet("input[class*=jsb-]{behavior:url(dimensions.htc)}");

eval(this.exports);

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
