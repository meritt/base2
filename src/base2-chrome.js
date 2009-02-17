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
// chrome/package.js
// =========================================================================

// Browser chrome.

// Credits: large parts of this code were written by Erik Arvidsson.

var chrome = new base2.Package(this, {
  parent:  base2.JSB,
  name:    "chrome",
  version: "0.2",
  imports: "Enumerable,Function2,DOM,JSB",
  exports: "Chrome,ComboBox,Range,ProgressBar,Slider,Spinner,Rect",

  //host:    ""
  host:    "http://base2.googlecode.com/svn/trunk/src/base2/JSB/chrome/"
});

eval(this.imports);

if (detect("MSIE6")) {
  try {
    document.execCommand("BackgroundImageCache", false, true);
  } catch (ex) {}
}

// =========================================================================
// chrome/header.js
// =========================================================================

var _MSIE  = detect("MSIE");

var PX = "px";

var _ACTIVE = "\x5factive",
    _HOVER  = "\x5fhover",
    _FOCUS  = "\x5ffocus",
    _TIMER  = "\x5ftimer";

var _timers   = {}, // store for timeouts
    _values   = {}, // store for computed values
    _vertical = {}; // vertical controls

function _resetScroll() {
  this.scrollTop = 0;
};

var _WIDTH = "clientWidth";
var _HEIGHT = "clientHeight";

// =========================================================================
// chrome/Theme.js
// =========================================================================

var Theme = Base.extend({
  constructor: function(name) {
    this.load(name);
  },

  name: "default",

  createStyleSheet: function(cssText) {
    if (document.body) {
      var style = document.createElement("style");
      style.type = "text/css";
      style.textContent = cssText;
      new Selector("head").exec(document, 1).appendChild(style);
    } else {
      document.write(format('<style type="text/css">%1<\/style>', cssText));
    }
  },

  load: function(name) {
    //return;
    if (name) this.name = name;
    this.createStyleSheet(format(css, this));
  },

  toString: function() {
    return chrome.host + this.name + "/";
  },

  "@MSIE": {
    createStyleSheet: function(cssText) {
      document.createStyleSheet().cssText = cssText;
    }
  }
}, {
  detect: K("default"),

  "@Windows": {
    detect: function() {
      var element = document.createElement("input");
      var head = NodeSelector.querySelector(document, "body,head");
      head.appendChild(element);
      // detect XP theme by inspecting the ActiveCaption colour
      element.style.color = "ActiveCaption";
      var color = element.style.color;
      if (!_XP_DETECT[color]) {
        color = ViewCSS.getComputedPropertyValue(document.defaultView, element, "color");
        if (/rgb/.test(color)) color = eval(color);
      }
      head.removeChild(element);
      return _XP_DETECT[color];
    },

    "@MSIE6": {
      detect: function() {
        return this.base() || {
      	"#ece9d8": "luna/blue",
      	"#e0dfe3": "luna/silver",
      	"#ebe9ed": "royale"
        }[document.documentElement.currentStyle.scrollbarFaceColor] || "classic";
      }
    },

    "@MSIE5": {
      detect: K("classic")
    }
  },

  "@Safari|Camino": {
    detect: K("aqua")
  }
});

var _XP_DETECT = {
  "#0a246a": "classic",
  "#0054e3": "luna/blue",
  "#8ba169": "luna/olive",
  "#c0c0c0": "luna/silver",
  "#335ea8": "royale"
};

chrome.theme = Theme.detect();

base2.userAgent += ";theme=" + chrome.theme;

var rgba = rgb;
function rgb(r, g, b) {
  function toHex(value) {
    return (value < 16 ? "0" : "") + value.toString(16);
  };
  return "#" + toHex(r) + toHex(g) + toHex(b);
};


// =========================================================================
// chrome/styleSheet.js
// =========================================================================

var _baseRule = extend({}, {
  padding:                 "1px 2px 2px 1px",
  borderWidth:             "2px 1px 1px 2px",
  borderStyle:             "solid",
  borderColor:             "#444 #ddd #ddd #444",
  backgroundPosition:      "9999px 9999px",
  backgroundAttachment:    "scroll!important",
  backgroundRepeat:        "no-repeat!important",

  "@MSIE.+theme=classic": {
    padding:               "1px",
    borderWidth:           "2px",
    borderStyle:           "inset",
    borderColor:           "#fff"
  },

  "@Gecko.+theme=classic": {
    padding:               "1px",
    borderWidth:           "2px",
    MozBorderTopColors:    "ThreeDShadow ThreeDDarkShadow",
    MozBorderRightColors:  "ThreeDHighlight ThreeDLightShadow",
    MozBorderLeftColors:   "ThreeDShadow ThreeDDarkShadow",
    MozBorderBottomColors: "ThreeDHighlight ThreeDLightShadow"
  },

  "@theme=aqua": {
    padding:               "1px 2px 2px 2px",
    borderWidth:           "2px 1px 1px 1px",
    borderColor:           "#9e9e9e #b4b4b4 #dadada #b4b4b4"
  },

  "@theme=(luna|royale)": {
    padding:               "2px",
    borderWidth:           "1px",
    borderStyle:           "solid",
    borderColor:           "#a7a6aa",

    "@luna\\/blue": {
      borderColor:         "#7f9db9"
    },
    "@luna\\/olive": {
      borderColor:         "#a4b97f"
    },
    "@luna\\/silver": {
      borderColor:         "#a5acb2"
    }
  }
});

function _baseRule_toString() {
  return " {\n" +
    map(this, function(value, propertyName) {
      if (typeof value == "function") value = "none";
      return "  " + propertyName.replace(/[A-Z]/g, function(captialLetter) {
        return "-" + captialLetter.toLowerCase();
      }) + ": " + value;
    }).join(";\n") +
  "\n}";
};

var css = {
  toString: function() {
    return map(this, function(properties, selector) {
      return selector + properties;
    }).join("\n");
  }
};

var styleSheet = {
  combobox: {
    paddingRight:    "19px!important",
    backgroundImage: "url(%1menulist.png)!important",
    width:           "8em",

    "@Safari.+theme=aqua": {
        WebkitAppearance: "menulist!important",
        background:       "initial",
        border:           "initial"
    }
  },
  
  "progressbar,slider": {
    textIndent:        "-10em", // hide text for purely visual controls (Safari & Gecko)
    cursor:            "default",
    WebkitUserSelect:  "none",

    "@MSIE": {
      textIndent: 0,
      lineHeight: "80em" // hide text for purely visual controls (MSIE)
    }
  },
  
  progressbar: {
    padding:               "1px",
    border:                "2px solid ThreeDDarkShadow",
    WebkitBorderRadius:    "2px",
    MozBorderRadius:       "2px",
    MozBorderTopColors:    "ThreeDDarkShadow ThreeDHighlight",
    MozBorderRightColors:  "ThreeDDarkShadow ThreeDHighlight",
    MozBorderLeftColors:   "ThreeDDarkShadow ThreeDHighlight",
    MozBorderBottomColors: "ThreeDDarkShadow ThreeDHighlight",
    backgroundImage:       "url(%1progressbar.png)!important"
  },

  slider: {
    minHeight:       "16px",
    padding:         "3px",
    border:          0,
    backgroundColor: "transparent",
    backgroundImage: "url(%1slider.png)!important",

    "@Safari.+theme=aqua": {
      outline:       "none!important"
    },

    "@Gecko": {
      MozBorder:     "initial"
    },

    "@Gecko(1|200[0-2])": {
      backgroundColor: "#f2f2f2"
    }
  },

  "progressbar_focus,slider_focus": {
    background: "initial",
    padding:    "initial",
    border:     "initial",
    outline:    "1px dotted",
    MozOutline: "1px dotted"
  },

  datalist: {
    display: "none!important"
  },

  popup: {
    display:     "none",
    borderWidth: "1px",
    position:    "absolute!important",
    zIndex:      "999999!important",
    cursor:      "default!important",
    padding:     "0!important",
    margin:      "0!important",

    "!@theme=(luna|royale)": {
      borderColor: "red"
    },

    "@Gecko|opera|theme=aqua": {
      MozBorder:   "initial",
      borderColor: "black",
      borderStyle: "outset!important"
    }
  },
  
  spinner: {
    textAlign:        "right",
    width:            "5em",
    paddingRight:     "19px!important",
    backgroundImage:  "url(%1spinner.png)!important"
  },
  
  "@WebKit|opera": {
    "input[type=range]": {
      background: "initial",
      height:     "initial",
      padding:    "initial",
      border:     "initial"
    }
  }
};

forEach.detect (styleSheet, function(properties, selector) {
  if (/,/.test(selector)) {
    forEach.csv(selector, partial(arguments.callee, properties));
  } else {
    if (/^[\w-]+$/.test(selector)) {
      selector = "." + selector;
    }
    var rule = css[selector];
    if (!rule) rule = css[selector] = extend({toString: _baseRule_toString}, _baseRule);
    forEach.detect (properties, function(value, propertyName) {
      if (value == "initial") {
        forEach (rule, function(initialPropertyValue, initialPropertyName) {
          if (initialPropertyName.indexOf(propertyName) == 0) {
            delete rule[initialPropertyName];
          }
        });
        delete rule[propertyName];
      } else {
        rule[propertyName] = value;
      }
    })
  }
});

new Theme(chrome.theme);

// =========================================================================
// chrome/Chrome.js
// =========================================================================

var Chrome = Behavior.modify({
  HORIZONTAL: 0,
  VERTICAL: 1,

  states: {
    normal:   0,
    hover:    1,
    active:   2,
    disabled: 3,
    length:   4
  },

  appearance: "",

  imageWidth: 17,
  
  oncontentready: function(element) {
    if (element[_HEIGHT] > element[_WIDTH]) {
      this.setOrientation(element, this.VERTICAL);
    }
    this.layout(element, this.states[element.disabled ? "disabled" : "normal"]);
  },

  onclick: function(element, event, x, y) {
    //;;; console2.log("onclick(" + event.eventPhase + "): " + event.button);
  },

  ondblclick: function(element, event, x, y) {
    //;;; console2.log("ondblclick(" + event.eventPhase + "): " + event.button);
  },

  onmousedown: function(element, event, x, y) {
    //;;; console2.log("onmousedown(" + event.eventPhase + "): " + event.button);
    Chrome._active = element;

    if (!this.isEditable(element)) return;

    Chrome._activeThumb = this.hitTest(element, x, y);
    if (Chrome._activeThumb) {
      this.setCapture(element);
    }
    this.layout(element);
  },

  onmouseup: function(element, event) {
    //;;; console2.log("onmouseup(" + event.eventPhase + "): " + event.button);
    delete Chrome._active;
    if (Chrome._activeThumb) {
      delete Chrome._activeThumb;
      this.layout(element);
    }
    this.releaseCapture(element);
  },

  onmousemove: function(element, event, x, y) {
    //;;; console2.log("onmousemove: "+[x,y]);
    var thumb = this.hitTest(element, x, y);
    if (thumb != Chrome._hoverThumb) {
      Chrome._hoverThumb = thumb;
      this.layout(element);
    }
  },

  onmouseover: function(element, event, x, y) {
    Chrome._hover = element;
    Chrome._hoverThumb = this.hitTest(element, x, y);
    this.layout(element);
  },

  onmouseout: function(element) {
    //;;; console2.log("onmouseout");
    delete Chrome._activeThumb;
    delete Chrome._hoverThumb;
    delete Chrome._hover;
    this.layout(element);
  },

  onfocus: function(element) {
    Chrome._focus = element;
    this.layout(element);
  },

  onblur: function(element) {
    delete Chrome._focus;
    this.removeClass(element, this.appearance + _FOCUS);
    this.layout(element);
  },

  isActive: function(element) {
    return Chrome._activeThumb && (Chrome._activeThumb == Chrome._hoverThumb);
  },

  isEditable: function(element) {
    return !element.disabled && !element.readOnly;
  },

  isNativeControl: False,

  getCursor: function(element) {
    return (Chrome._activeThumb || Chrome._hoverThumb || element != Chrome._hover) ? "default" : "";
  },

  syncCursor: function(element) {
    element.style.cursor = this.getCursor(element);
  },

  getState: K(0),

  hitTest: function(element, x) {
    //var rtl = element.currentStyle.direction == "rtl";
    var rtl = false;
    return rtl ? x <= this.imageWidth : x >= element[_WIDTH] - this.imageWidth;
  },

  setOrientation: function(element, orientation) {
    if (orientation == this.VERTICAL) {
      _vertical[element.base2ID] = true;
      this.setCSSProperty(element, "background-image", "url(" + chrome.host + chrome.theme + "/" + this.appearance + "-vertical.png)", true);
    } else {
      delete _vertical[element.base2ID];
      element.style.backgroundImage = "";
    }
  },

  hasTimer: function(element, id) {
    id = element.base2ID + (id || _TIMER);
    return !!_timers[id];
  },

  startTimer: function(element, id, interval) {
    id = element.base2ID + (id || _TIMER);
    if (!_timers[id]) {
      _timers[id] = this.setInterval(this.tick, 100, element);
    }
  },

  stopTimer: function(element, id) {
    id = element.base2ID + (id || _TIMER);
    if (_timers[id]) {
      clearInterval(_timers[id]);
      delete _timers[id];
    }
  },

  tick: Undefined,

  layout: function(element, state) {
    if (state == null) state = this.getState(element);
    var clientWidth = element[_WIDTH],
        clientHeight = element[_HEIGHT];
    var top = - this.states.length * (clientHeight / 2 * (clientHeight - 1));
    top -= clientHeight * state;
    element.style.backgroundPosition = (clientWidth - this.imageWidth) + PX + " " + top + PX;
    this.syncCursor(element);
  }
});

// =========================================================================
// chrome/ComboBox.js
// =========================================================================

var ComboBox = Chrome.modify({
  appearance: "menulist",
  
  onmousedown: function(element, event, x) {
    base(this, arguments);
    if (this.isEditable(element)) {
      if (!Chrome._popup) {
        Chrome._popup = this.createPopup();
      }
      if (Chrome._popup) {
        if (this.hitTest(element, x)) {
          if (Chrome._popup.isOpen) {
            Chrome._popup.hide();
          } else {
            Chrome._popup.show(element);
          }
        }
      }
    }
  },

  onkeydown: function(element, event, keyCode) {
    // up/down-arrows
    if (this.isEditable(element)) {
      var UP_DOWN = keyCode == 38 || keyCode == 40;
      if (!Chrome._popup && UP_DOWN) {
        Chrome._popup = this.createPopup();
      }
      if (Chrome._popup) {
        if (keyCode == 27) {  // escape
          Chrome._popup.hide();
        } else if (UP_DOWN && !Chrome._popup.isOpen) {
          Chrome._popup.show(element);
          event.preventDefault();
        } else if (Chrome._popup.isOpen) {
          Chrome._popup.onkeydown();
          event.preventDefault();
        }
        return;
      }
    }
  },

  onkeyup: function(element) {
    if (this.isActive(element)) Chrome._popup.onkeyup();
  },
  
  "@MSIE": {
    onfocus: function(element) {
      base(this, arguments);
      element.attachEvent("onpropertychange", change);
      element.attachEvent("onblur", function() {
        element.detachEvent("onpropertychange", change);
        element.detachEvent("onblur", arguments.callee);
      });
      function change(event) {
        if (event.propertyName == "value") {
          element.scrollLeft = 9999;
        }
      };
    }
  },
  
  "@Safari.+theme=aqua": {
    layout: function(element) {
      this.syncCursor(element);
    }
  },
  
  createPopup: function() {
    return new Popup(this);
  },

  isActive: function(element) {
    return Chrome._popup && Chrome._popup.isOpen;
  },

  getState: function(element) {
    if (element.disabled) {
      var state = "disabled";
    } else if (element.readOnly) {
      state = "normal";
    } else if (element == Chrome._active && Chrome._activeThumb) {
      state = "active";
    } else if (element == Chrome._hover && Chrome._hoverThumb) {
      state = "hover";
    } else {
      state = "normal";
    }
    return this.states[state];
  }
});

// =========================================================================
// chrome/Range.js
// =========================================================================

// For numeric controls

var Range = Chrome.modify({
  min:  "",
  max:  "",
  step: 1,

/*MASK: /-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/,*/

  onattach: function(element) {
    var properties = this.getProperties(element);
    // the following only applies to Slider/ProgressBar but we'll leave it here
    var value = element.value, min = properties.min;
    if (!value || isNaN(value)) value = min;
    //else if (_numberAttributes.step != 1) this.setValue(element, value);
    _values[element.base2ID] = (value - min) / (properties.max - min);
    element.onscroll = _resetScroll;
  },

  onmousewheel: function(element, event, delta) {
    if (this.isEditable(element) && Chrome._focus == element) {
      this.increment(element, -parseInt(delta / 40));
      event.preventDefault();
    }
  },

  getProperties: function(element) {
    // initialise min/max/step
    var properties = {min: this.min, max: this.max, step: this.step};
    for (var attr in properties) {
      var value = element[attr];
      if (value == null && element.hasAttribute && element.hasAttribute(attr)) {
        value = element.getAttribute(attr);
      }
      if (value && !isNaN(value)) {
        properties[attr] = value;
      }
    }
    return properties;
  },

  increment: function(element, amount, block) {
    var type = block ? "Block" : "Unit";
    amount *= this["get" + type + "Increment"](element);
    this.setValue(element, this.getValue(element) + amount);
  },

  getBlockIncrement: function(element) {
    return this.getUnitIncrement(element) * 10;
  },

  getUnitIncrement: function(element) {
    return this.getProperty(element, "step") || 1;
  },

  getValue: function(element) {
    return parseFloat(element.value);
  },

  setValue: function(element, value) {
    var properties = this.getProperties(element);
    if (isNaN(value)) value = 0;
    var min = parseFloat(properties.min), max = parseFloat(properties.max), step = parseFloat(properties.step) || 1;
    // check min/max
    value = value > max ? max : value < min ? min : value;
    // round to step
    value = Math.round(value / step) * step;
    value = value.toFixed(String(step).replace(/^.*\.|^\d+$/, "").length);
    if (value != element.value) {
      element.value = value;
      this.dispatchEvent(element, "change");
    }
  }
});

// =========================================================================
// chrome/ProgressBar.js
// =========================================================================

// The progress bar uses a value between 0 and 1 and it is up to the consumer to
// map this to a valid value range

// TODO: Right to left should invert horizontal

var ProgressBar = Range.modify({
  HEIGHT: 3000,
  WIDTH: 3000,
  CHUNK_WIDTH: 10,
  CHUNK_HEIGHT: 10,
  
  min:  0,
  max:  100,
  step: 1,

  appearance: "progressbar",

  "@!theme=aqua": {
    onfocus: function(element) {
      if (element != Chrome._active) {
        this.addClass(element, this.appearance + _FOCUS);
      }
      this.base(element);
    }
  },
  
  onkeydown: function(element, event, keyCode) {
    //;;; console2.log("onkeydown: "+keyCode);
    if (!this.isEditable(element)) return;

    //event.preventDefault();

    if (keyCode < 33 || keyCode > 40) return;

    var amount = 1;

    switch (keyCode) {
      case 35: // end
        var value = 1;
      case 36: // home
        this.setValue(element, value || 0);
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

  hitTest: False,

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

  layout: function(element) {
    var clientWidth = element[_WIDTH],
        clientHeight = element[_HEIGHT],
        base2ID = element.base2ID;

    if (_vertical[base2ID]) {
      var left = (-clientWidth / 2) * (clientWidth + 3) - 2;
      //var left = (-clientWidth / 2) * (clientWidth - 1);
      var top = Math.floor(clientHeight * _values[base2ID]);
      top = clientHeight - Math.round(top / this.CHUNK_HEIGHT) * this.CHUNK_HEIGHT;
    } else {
      var chunk = /luna/.test(chrome.theme) ? this.CHUNK_WIDTH : 1;
      left = Math.floor(clientWidth * _values[base2ID]) - this.WIDTH;
      left = Math.round(++left / chunk) * chunk;
      top = (-clientHeight / 2) * (clientHeight + 3) - 2;
      //top = (-clientHeight / 2) * (clientHeight - 1);
    }
    element.style.backgroundPosition = left + PX + " " + top + PX;
  },

  getCursor: K(""),

  getValue: function(element) {
    return _values[element.base2ID];
  },

  setValue: function(element, value) {
    var properties = this.getProperties(element);
    var min = Number(properties.min), max = Number(properties.max);
    this.base(element, min + (max - min) * value);
    _values[element.base2ID] = (element.value - min) / (max - min);
    this.layout(element);
  }
});

// =========================================================================
// chrome/Slider.js
// =========================================================================

var Slider = ProgressBar.modify({
  HORIZONTAL_WIDTH: 3000,
  HORIZONTAL_HEIGHT: 21,
  VERTICAL_WIDTH: 22,
  VERTICAL_HEIGHT: 3000,
  THUMB_WIDTH: 11,
  THUMB_HEIGHT: 11,

  appearance: "slider",

  onmousedown: function(element, event, x, y, screenX, screenY) {
    base(this, arguments);
    event.preventDefault();
    if (!this.isEditable(element)) return;
    if (Chrome._activeThumb) {
      var thumb = this.getThumbRect(element);
      Chrome._dragInfo = {
        dx: screenX - thumb.left,
        dy: screenY - thumb.top
      };
      Chrome._firedOnce = true;
    } else {
      this.startTimer(element);
      Chrome._eventX = x;
      Chrome._eventY = y;
    }
    element.focus();
  },

  onmouseup: function(element, event) {
    this.base(element, event);
    delete Chrome._dragInfo;
    if (!Chrome._firedOnce) this.tick(element);
    this.stopTimer(element);
    delete Chrome._eventX;
    delete Chrome._eventY;
    delete Chrome._increasing;
    delete Chrome._firedOnce;
  },

  onmousemove: function(element, event, x, y, screenX, screenY) {
    if (Chrome._dragInfo) {
      var clientWidth = element[_WIDTH];
      var clientHeight = element[_HEIGHT];
      if (clientWidth >= clientHeight) {
        var size = clientWidth - this.THUMB_WIDTH;
        var pos = screenX - Chrome._dragInfo.dx;
      } else {
        size = clientHeight - this.THUMB_HEIGHT;
        pos = size - screenY + Chrome._dragInfo.dy;
      }
      this.setValue(element, pos / size);
    } else {
      base(this, arguments);
    }
  },

  layout: function(element, state) {
    // TODO: Right to left should invert horizontal
    if (state == null) state = this.getState(element);
    
    var thumb = this.getThumbRect(element);

    if (_vertical[element.base2ID]) {
      var left = thumb.left;
      var top = thumb.top - Math.ceil((this.VERTICAL_HEIGHT - this.THUMB_HEIGHT) / 2) - state * this.VERTICAL_HEIGHT;
    } else {
      left = thumb.left - Math.ceil((this.HORIZONTAL_WIDTH - this.THUMB_WIDTH) / 2) - state * this.HORIZONTAL_WIDTH;
      top = thumb.top;
    }
    element.style.backgroundPosition = left + PX + " " + top + PX;
    //;;;console2.log("layout: "+element.style.backgroundPosition);
  },

  getThumbRect: function(element) {
    var clientWidth = element[_WIDTH],
        clientHeight = element[_HEIGHT],
        value = _values[element.base2ID];
        
    if (_vertical[element.base2ID]) {
      return new Rect(
        (clientWidth - this.VERTICAL_WIDTH) / 2,
        (clientHeight -= this.THUMB_HEIGHT) - Math.floor(clientHeight * value),
        this.VERTICAL_WIDTH,
        this.THUMB_HEIGHT
      );
    } else {
      return new Rect(
        Math.floor((clientWidth - this.THUMB_WIDTH) * value),
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

  getState: function(element) {
    if (element.disabled) {
      var state = "disabled";
    } else if (element == Chrome._active && Chrome._activeThumb) {
      state = "active";
    } else if (element == Chrome._focus || (element == Chrome._hover && Chrome._hoverThumb)) {
      state = "hover";
    } else {
      state = "normal";
    }
    return this.states[state];
  },

  tick: function(element) {
    var thumb = this.getThumbRect(element);
    if (_vertical[element.base2ID]) {
      var my = Chrome._eventY;
      if (my < thumb.top && false != Chrome._increasing) {
        this.increment(element, 1, true);
        Chrome._increasing = true;
      } else if (my > thumb.top + this.THUMB_HEIGHT && true != Chrome._increasing) {
        this.increment(element, -1, true);
        Chrome._increasing = false;
      }
    } else {
      var mx = Chrome._eventX;
      // _increasing is true, false or null
      if (mx < thumb.left && true != Chrome._increasing) {
        this.increment(element, -1, true);
        Chrome._increasing = false;
      } else if (mx > thumb.left + this.THUMB_WIDTH && false != Chrome._increasing) {
        this.increment(element, 1, true);
        Chrome._increasing = true;
      }
    }
    Chrome._firedOnce = true;
  },

  "@KHTML|opera[91]": {
    isNativeControl: function(element) {
      return element.nodeName == "INPUT" && element.type == "range";
    }
  },

  "@theme=aqua": {
    onblur: function(element) {
      if (element == Slider._activeElement) {
        delete Slider._activeElement;
      }
      base(this, arguments);
    },

    onmousedown: function(element) {
      Slider._activeElement = element;
      base(this, arguments);
    },

    getState: function(element) {
      if (element.disabled) {
        var state = "disabled";
      } else if (element == Chrome._active && Chrome._activeThumb) {
        state = "active";
      } else if (element == Chrome._focus && element != Slider._activeElement) {
        state = "hover";
      } else {
        state = "normal";
      }
      return this.states[state];
    },

    startTimer: function(element) {
      // the aqua slider jumps immediatley to wherever you click
    }
  }
});

// =========================================================================
// chrome/Spinner.js
// =========================================================================

var Spinner = Range.modify({
  appearance: "spinner",

  states: {
    normal:      0,
    up_hover:    1,
    up_active:   2,
    down_hover:  3,
    down_active: 4,
    disabled:    5,
    length:      6
  },
  
  onkeydown: function(element, event, keyCode) {
    //;;; console2.log("onkeydown(" + event.eventPhase + "): " + keyCode);
    if (!this.isEditable(element)) return;
    if (!/^(3[34568]|40)$/.test(keyCode)) return;

    event.preventDefault();

    switch (keyCode) {
      case 35: // end
        if (element.max) this.setValue(element, element.max);
        return;
      case 36: // home
        if (element.min) this.setValue(element, element.min);
        return;
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
    //;;; console2.log("onkeyup(" + event.eventPhase + "): " + keyCode);
    if (!this.isEditable(element)) return;
    
    this.stopTimer(element);

    switch (keyCode) {
      case 33: // page-up
      case 34: // page-down
      case 38: // up-arrow
      case 40: // down-arrow
        event.preventDefault(); // is this required?
        this.deactivate(element);
        break;
    }
  },

  onmousedown: function(element) {
    base(this, arguments);
    if (Chrome._activeThumb) {
      this.startTimer(element);
    }
  },

  onmouseup: function(element, event) {
    this.stopTimer(element);
    // call afterward because we don't want to clear the state yet
    this.base(element, event);
  },

  "@opera[91]": {
    isNativeControl: function(element) {
      return element.nodeName == "INPUT" && element.type == "number";
    }
  },

  activate: function(element, direction, block) {
    Chrome._activeThumb = Chrome._hoverThumb = direction;
    this.layout(element);
    Chrome._block = block;
    this.startTimer(element, _ACTIVE);
  },

  deactivate: function(element) {
    this.stopTimer(element, _ACTIVE);
    delete Chrome._activeThumb;
    delete Chrome._hoverThumb;
    delete Chrome._block;
    this.layout(element);
  },

  getState: function(element) {
    if (element.disabled) {
      var state = "disabled";
    } else if (element.readOnly) {
      state = "normal";
    } else if ((element == Chrome._hover || element == Chrome._focus) && Chrome._activeThumb) {
      state = Chrome._activeThumb + _ACTIVE;
    } else if (element == Chrome._hover && Chrome._hoverThumb) {
      state = Chrome._hoverThumb + _HOVER;
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
    if (!_timers[element.base2ID + _TIMER]) {
      Chrome._direction = (Chrome._activeThumb == "up") ? 1 : -1;
      Chrome._steps = 1;
      this.base(element);
    }
  },

  stopTimer: function(element) {
    if (_timers[element.base2ID + _TIMER]) {
      this.base(element);
      if (!Chrome._firedOnce) this.increment(element);
      delete Chrome._firedOnce;
      try {
        element.select();
      } catch (ex) {}
    }
  },

  tick: function(element) {
    this.increment(element);
    Chrome._steps *= 1.1; // accelerate
  },

  increment: function(element, amount, block) {
    if (amount == undefined) {
      amount = parseInt(Chrome._steps * Chrome._direction);
      block = !!Chrome._block;
    }
    this.base(element, amount, block);
    Chrome._firedOnce = true;
  }
});

// =========================================================================
// chrome/Popup.js
// =========================================================================

var _POPUP_METRICS = "left:%1px!important;top:%2px!important;width:%3px!important;";

var Popup = Base.extend({
  constructor: function(owner) {
    this.owner = owner;
    var popup = this.popup = document.createElement("div");
    popup.className = this.appearance;
    popup.innerHTML = this.html;
  },

  appearance: "popup",
  isOpen: false,

  inherit: String2.csv("backgroundColor,color,fontFamily,fontSize,fontWeight,fontStyle"),
  html: "<div>1 thousand</div><div>2 thousand</div><div>3 thousand</div><div>4 thousand</div><div>5 thousand</div>",

  onkeydown: Undefined,
  onkeyup: Undefined,
  
  hide: function() {
    this.popup.parentNode.removeChild(this.popup);
    //MenuList.detach(popup);
    this.isOpen = false;
  },

  movesize: function(element) {
    this.popup.style.cssText = format(_POPUP_METRICS, element.offsetLeft, element.offsetTop + element.offsetHeight, element.offsetWidth - 2);
    element.offsetParent.appendChild(this.popup);
  },

  show: function(element) {
    this.isOpen = true;
    //MenuList.attach(popup);
    this.movesize(element);
    var style = this.popup.style;
    var computedStyle = Behavior.getComputedStyle(element);
    forEach (this.inherit, function(propertyName) {
      style[propertyName] = computedStyle[propertyName];
    });
    if (style.backgroundColor == "transparent") {
      style.backgroundColor = "Window";
    }
    style.display = "block";
  },
  
  "@MSIE": {
    movesize: function(element) {
      var scrollParent = document.compatMode != "CSS1Compat" ? document.body: document.documentElement;
      var rect = element.getBoundingClientRect();
      this.popup.style.cssText = format(_POPUP_METRICS, scrollParent.scrollLeft + rect.left - 2, scrollParent.scrollTop + rect.bottom - 2, element.offsetWidth - 2);
      document.body.appendChild(this.popup);
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
// chrome/rules.js
// =========================================================================

chrome.rules = new RuleList({
  "input.combobox": ComboBox,
  "input.progressbar": ProgressBar,
  "input.slider": Slider,
  "input.spinner": Spinner
});

eval(this.exports);

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
