/*
  base2 - copyright 2007-2008, Dean Edwards
  http://code.google.com/p/base2/
  http://www.opensource.org/licenses/mit-license.php

  Contributors:
    Doeke Zanstra
*/
new function(_f){var JSB=new base2.Package(this,{name:"JSB",version:"0.9.2",imports:"DOM",exports:"Behavior,Rule,RuleList,ExtendedMouse"});eval(this.imports);var _g=detect("MSIE"),_6=detect("opera9");var _3=200;var _7=200;var _8=0;var _9=/^on(DOM\w+|[a-z]+)$/,_4=/^mouse(up|down)|click$/,_a=/^(focus|blur)$/,_h=/click$/,_2=/^mouse|click$/,_b=/^(key|text)/;var _c=/^[^12]$/,_d=/^mouse(up|move)$/;var _e=/^(abort|error|load|scroll|readystatechange|propertychange|filterchange)$/;var Behavior=new Base({attach:Function2.I,detach:Function2.I,modify:function(d){var e=pcopy(this).extend(d);e.EventDelegator=this.EventDelegator||EventDelegator;if(d&&d.EventDelegator){e.EventDelegator=e.EventDelegator.extend(d.EventDelegator)}var f,h=[];var g={};var i=new EventListener(new e.EventDelegator(e,g));if(e.ondocumentready){e._1=[]}forEach(e,function(a,b){if(typeof a=="function"&&_9.test(b)){var c=b.slice(2);if(_e.test(c)){if(!f)f=[];f.push(c)}else{h.push(c)}}});e.attach=function(a){var b=a.base2ID||assignID(a);if(!g[b]){g[b]=true;if(h){forEach(h,i.delegate,i);h=null}if(f){forEach(f,bind(i.add,i,a))}if(e.onattach)e.onattach(a);if(e.oncontentready){if(DocumentState.isContentReady(a)){e.oncontentready(a)}else{DocumentState.contentReadyQueue.push({element:a,behavior:e})}}if(e._1){e._1.push(a)}if(a==document.activeElement&&e.onfocus){e.dispatchEvent(a,"focus")}}return a};e.detach=function(a){delete g[a.base2ID];return a};return e},EventDelegator:null,dispatchEvent:function(a,b,c){if(typeof b=="string"){var d=b;b=DocumentEvent.createEvent(document,"Events");Event.initEvent(b,d,true,false)}if(c)extend(b,c);EventTarget.dispatchEvent(a,b)},handleEvent:function(a,b,c){c=b.type;var d="on"+c;if(this[d]){if(_2.test(c)){if(!_4.test(c)||_c.test(b.button)){if(c=="mousewheel"){this[d](a,b,b.wheelDelta)}else{this[d](a,b,b.offsetX,b.offsetY,b.screenX,b.screenY)}}}else if(_b.test(c)){this[d](a,b,b.keyCode,b.shiftKey,b.ctrlKey,b.altKey,b.metaKey)}else{this[d](a,b)}}},getProperty:function(a,b){var c=this[b];var d=Element.getAttribute(a,b);if(d==null){d=c}else if(c!=null){d=c.constructor(d)}return d},getComputedStyle:function(a,b){var c=document.defaultView;if(b)return ViewCSS.getComputedPropertyValue(c,a,b);return ViewCSS.getComputedStyle(c,a,null)},getCSSProperty:function(a,b){CSSStyleDeclaration.getPropertyValue(a.style,b)},setCSSProperty:function(a,b,c,d){CSSStyleDeclaration.setProperty(a.style,b,c,d?"important":"")},setCapture:function(b){if(!Behavior._0){var c=this;Behavior._5=b;Behavior._0=function(a){if(_6)getSelection().collapse(document.body,0);if(a.type=="mousemove"||a.eventPhase==Event.BUBBLING_PHASE){c.handleEvent(b,a,a.type)}};this.addEventListener(document,"mouseup",Behavior._0,true);this.addEventListener(document,"mousemove",Behavior._0,true)}},releaseCapture:function(){if(Behavior._0){this.removeEventListener(document,"mouseup",Behavior._0,true);this.removeEventListener(document,"mousemove",Behavior._0,true);delete Behavior._0;delete Behavior._5}},"@MSIE":{setCapture:function(a){a.setCapture();behavior=this;a.attachEvent("onlosecapture",function(){if(Behavior._0){behavior.dispatchEvent(a,"mouseup")}a.detachEvent("onlosecapture",arguments.callee)});this.base(a)},releaseCapture:function(){this.base();document.releaseCapture()}}});forEach.csv("setInterval,setTimeout",function(e){Behavior[e]=function(a,b){if(typeof a=="string")a=this[a];var c=Array2.slice(arguments,2);var d=this;return global[e](function(){a.apply(d,c)},b||0)}});forEach([EventTarget,NodeSelector,Node,Element],function(c){c.forEach(function(a,b){if(!Behavior[b]){Behavior[b]=bind(a,c)}})});ClassList.forEach(function(a,b){Behavior[b+"Class"]=bind(a,ClassList)});var Rule=Base.extend({constructor:function(b,c){if(!instanceOf(b,Selector)){b=new Selector(b)}if(typeof c=="string"){c=new External(c,function(a){c=a})}else if(!c||Behavior.constructor!=c.constructor){c=Behavior.modify(c)}this.refresh=function(){if(c.attach)b.exec(document).forEach(c.attach)};this.toString=b.toString;DocumentState.addRule(b,c)},refresh:Undefined});var RuleList=Collection.extend({constructor:function(a){this.base(extend({},a))},refresh:function(){this.invoke("refresh")}},{Item:Rule});var EventListener=Base.extend({constructor:function(a){this.delegator=a},delegator:null,add:function(a,b){EventTarget.addEventListener(a,b,this,_a.test(b))},delegate:function(a){this.add(document,a)},handleEvent:function(a){this.delegator.handleEvent(a)},"@Opera":{handleEvent:function(a){var b=a.target;if(_2.test(a.type)){a=Event.cloneEvent(a);a.offsetX+=b.clientLeft;a.offsetY+=b.clientTop}this.delegator.handleEvent(a)}},"@MSIE":{handleEvent:function(a){var b=a.target;if(_2.test(a.type)){a=Event.cloneEvent(a);var c=b.currentStyle.hasLayout;if(c===false||!b.clientWidth){a.offsetX-=b.offsetLeft;a.offsetY-=b.offsetTop;if(c===undefined){a.offsetX-=2;a.offsetY-=2}}a.offsetX+=b.clientLeft;a.offsetY+=b.clientTop}this.delegator.handleEvent(a)}},"@Gecko":{handleEvent:function(a){if(_2.test(a.type)){var b=a.target;if(b.nodeType==3){b=b.parentNode}if(b.getBoundingClientRect){var c=b.getBoundingClientRect()}else{var d=document.getBoxObjectFor(b);var e=getComputedStyle(b,null);c={left:d.x-parseInt(e.borderLeftWidth),top:d.y-parseInt(e.borderTopWidth)};if(isNaN(c.left)){c.left=b.offsetLeft;c.top=b.offsetTop}}a.offsetX=a.pageX-c.left;a.offsetY=a.pageY-c.top}this.delegator.handleEvent(a)}}});var EventDelegator=Base.extend({constructor:function(a,b){this.behavior=a;this.attached=b},behavior:null,attached:null,handleEvent:function(a){var b=a.type;var c=this.behavior;if(b=="documentready"){if(c._1){forEach(c._1,c.ondocumentready,c);delete c._1}}else{var d=Behavior._0&&_d.test(b);var e=d?Behavior._5:a.target;var f=!a.bubbles||d;if(!f){extend(a,"stopPropagation",function(){this.base();f=true})}do{if(this.attached[e.base2ID]){c.handleEvent(e,a,b)}e=e.parentNode}while(e&&!f)}}});var ExtendedMouse=Behavior.modify({handleEvent:function(a,b,c){c=b.type;if(_4.test(c)){var d=this["on"+c];if(d){this[d](a,b,b.button,b.offsetX,b.offsetY,b.screenX,b.screenY)}}else{this.base(a,b)}}});var DocumentState=Behavior.modify({EventDelegator:{handleEvent:function(a){this.behavior["on"+a.type](a.target,a.offsetX,a.offsetY)}},active:false,busy:false,loaded:false,ready:false,contentReadyQueue:[],rules:new Array2,onDOMContentLoaded:function(){this.loaded=true;if(!this.ready&&!this.rules.length)this.fireReady(document)},onkeydown:function(){this.active=this.busy=true},onkeyup:function(){this.active=this.busy=false},onmousedown:function(a,b,c){this.active=this.busy=(b<a.offsetWidth&&c<a.offsetHeight)},onmouseup:function(){this.active=this.busy=false},onmousemove:function(){if(!this.busy)this.setBusyState(true)},addRule:function(a,b){assert(!this.loaded,"Cannot add JSB rules after the DOM has loaded.");assert(!/:/.test(a),format("Pseudo class selectors not allowed in JSB (selector='%2').",a));var c=Selector.parse(a);this.rules.push({query:c,behavior:b});if(this.rules.length==1)this.recalc()},fireReady:function(){if(!this.ready){this.ready=true;this.dispatchEvent(document,"documentready")}},isContentReady:function(a){if(this.loaded||!a.canHaveChildren)return true;while(a&&!a.nextSibling){a=a.parentNode}return!!a},recalc:function(a,b,c){var d=this.rules;if(!this.busy){var e=this.contentReadyQueue;var f=Date2.now(),h=f,g=0;while(e.length&&(f-h<_3)){var i=e[0];if(this.isContentReady(i.element)){i.behavior.oncontentready(i.element);e.shift()}if(g++<5||g%50==0)f=Date2.now()}var n=d.length;while(n&&d.length&&(f-h<_3)){if(a==null)a=b=0;var l=d[a];var j=l.behavior;var o=false;if(!c){var k=l.query;var p=k.state||[];p.unshift(document,j.constructor==External?2:_7);c=k.apply(null,p);o=!!k.complete}f=Date2.now();var m=c.length,g=0;if(m&&j.constructor==External){l.behavior=j.getObject()||j;delete k.state;c=null;a++}else{while(b<m&&(f-h<_3)){j.attach(c[b++]);if(g++<5||g%50==0)f=Date2.now()}if(b==m){b=0;c=null;if(this.loaded&&o){d.removeAt(a)}else a++}}if(a>=d.length)a=0;n--}}if(d.length){this.setTimeout(this.recalc,_8,a,b,c)}else{if(!this.ready)this.fireReady(document)}},setBusyState:function(a){this.busy=this.active||!!a;if(this.busy)this.setTimeout(this.setBusyState,250)}});DocumentState.attach(document);var External=Base.extend({constructor:function(a,b){a=a.split("#");this.src=a[0];this.id=a[1].split(".");this.callback=b},getObject:function(){if(!this.loaded)this.load();var a=window,b=0;while(a&&b<this.id.length){a=a[this.id[b++]]}if(a){this.callback(a);this.unload()}return a},load:function(){External.SCRIPT.src=this.src;if(!External.scripts[External.SCRIPT.src]){External.scripts[External.SCRIPT.src]=true;this.script=document.createElement("script");this.script.type="text/javascript";this.script.src=this.src;Document.querySelector(document,"head").appendChild(this.script)}this.loaded=true},unload:function(){if(this.script){this.script.parentNode.removeChild(this.script);this.script=null}}},{SCRIPT:document.createElement("script"),scripts:{}});eval(this.exports)};