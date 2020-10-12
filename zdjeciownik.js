// ==UserScript==
// @name           zdjeciownik
// @namespace      zdjeciownik
// @description    Szybkie ściąganie zdjęć
// @version        0.1.0
// @include        https://www.freexcafe.com/*
// @grant          none
// @run-at         document-start
// ==/UserScript==

(function (){
'use strict';

// 0 - bardzo mało, 1 - trochę, 2 - dużo, 3 - bardzo dużo
const doDebug = 2;

const css = [
'.zdjeciownik_hidden{display: none;}',
'.zdjeciownik_pokaz {color: #A77A7A; background-color: #331A25; text-decoration: none; border: #A77A7A 1px solid; padding: 0.427em 1.125em; font-size: 2em; font-size: calc(16px + 0.5vw); text-shadow: 0.125em 0.125em 0.1875em black; border-radius: 6px; display: inline-block; cursor: pointer;',
''
].join('\n');

// ----------------------------------- TOOLS -----------------------------------

const debug = new function() {
    this.isInfoEnabled = () => doDebug > 0;
    this.isDebugEnabled = () => doDebug > 1;
    this.isTraceEnabled = () => doDebug > 2;
    this.warn = function() {
        this.renderMessage('W', arguments);
    }
    this.info = function() {
        if (doDebug > 0)
            this.renderMessage('I', arguments);
    }
    this.debug = function() {
        if (doDebug > 1)
            this.renderMessage('D', arguments);
    }
    this.trace = function() {
        if (doDebug > 2)
            this.renderMessage('T', arguments);
    }
    this.always = function() {
        this.renderMessage('A', arguments);
    }
    this.renderMessage = function(level, args) {
        if (args.length == 0) return;
        const now = new Date();
        let dateText = '[' + (now.getHours() < 10 ? ' ' + now.getHours() : now.getHours());
        dateText += ':';
        dateText += now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
        dateText += ':';
        dateText += now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds();
        dateText += '.';
        dateText += now.getMilliseconds() < 10 ? '00' + now.getMilliseconds() : now.getMilliseconds() < 100 ? '0' + now.getMilliseconds() : now.getMilliseconds();
        dateText += '][' + level + '] ';
        let msg = args[0].toString();
        if (args.length == 1){
            console.log(dateText + msg);
            return;
        }
        const logData = [];
        logData.push = function(){
            for (let arg of arguments){
                if (typeof arg === 'string'){
                    arg = arg.trim();
                    if (arg !== '') {
                        Array.prototype.push.call(this, arg);
                    }
                } else {
                    Array.prototype.push.call(this, arg);
                }
            }
        }
        logData.push(dateText);
        for (let i=1; i<args.length; i++){
            const idx = msg.indexOf('{}');
            if (idx < 0) {
                break;
            }    
            const replacement = args[i];
            logData.push(msg.substr(0, idx));
            if (replacement === null){
                logData.push('null');
            } else
            if (typeof replacement === 'function'){
                try{
                    const v = replacement.apply();
                    logData.push(v);
                }catch(e){
                    logData.push('//error while calling', replacement, ':', e, '//');
                }
            } else
            if (typeof replacement === 'undefined'){
                logData.push('undefined');
            } else {
                logData.push(replacement);
            }
            msg = msg.substr(idx+2);
        }
        logData.push(msg);
        console.log.apply(console, logData);
    }
    this.wrap = function(cb,msg){
        return () => {try{return cb();}catch(e){const m=msg||'Failed: {}';this.warn(m,e);}}
    }
}

const dom = new function(){

    this.getNode = function(path, rootNode)
    {
        const xp2 = document.evaluate(path, rootNode || document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return xp2.singleNodeValue;
    }

    this.getNodeByCss = function(cssSelector, rootNode)
    {
        if (rootNode === undefined){
            return document.querySelector(cssSelector);
        }
        const nodes = rootNode.querySelectorAll(cssSelector);
        if (nodes.length == 0){
            return null;
        }
        return nodes[0];
    }

    this.getNodesByCss = function(cssSelector, rootNode)
    {
        const nodes = (rootNode || document).querySelectorAll(cssSelector);
        return [...nodes];
    }


    this.getNodes = function(path, rootNode)
    {
        const xp = document.evaluate(path, rootNode || document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        return xp;
    }
    
    this.getElemText = function(path, elem, trim){
        const elem2 = this.getNode(path, elem);
        let val = null;
        if (elem2 !== null){
            if (elem2.nodeName === 'INPUT' || elem2.nodeName === 'TEXTAREA')
                val = elem2.value;
            else 
                val = elem2.textContent;
        }
        if (val !== null && (typeof trim === 'undefined' || trim === true)){
            val = val.trim();
        }
        return val;
    }
    
    this.createElem = function(tag, attr, text) {
        const el = document.createElement(tag);
        if (typeof text !== 'undefined'){
            el.textContent = text;
        }
        if (typeof attr !== 'undefined')
            for (var k in attr)
                el.setAttribute(k, attr[k]);
        return el;
    }

    this.traverseChildNodes = function(node, fun) {
        let next;
        if (node.nodeType === 1) {
            // (Element node)
            if ((node = node.firstChild) !== null) {
                do {
                    // Recursively call traverseChildNodes on each child node
                    next = node.nextSibling;
                    this.traverseChildNodes(node, fun);
                } while((node = next) !== null);
            }
        } else if (node.nodeType === 3) {
            // (Text node)
            fun(node);
        }
    }
    
    this.splitNode = function(node, expr, fun){
        const parent = node.parentNode;
        const text = node.data;
        let start = 0;
        let match;
        expr.lastIndex = 0;
        if ((match = expr.exec(text)) !== null){
            do{
                const matchedValue = match[0];
                const prevText = text.substr(start, expr.lastIndex - matchedValue.length - start);
                if (prevText.length > 0){
                    parent.insertBefore(document.createTextNode(prevText), node);
                }
                let newNode = fun(matchedValue);
                if (typeof newNode === 'string'){
                    newNode = document.createTextNode(newNode);
                }
                parent.insertBefore(newNode, node);
                start = expr.lastIndex;
            }while((match = expr.exec(text)) !== null);
            if (start < text.length){
                const lastText = text.substr(start);
                parent.insertBefore(document.createTextNode(lastText), node);
            }
            parent.removeChild(node);
        }
    }

    this.loadCss = function(cssText){
        const head = document.getElementsByTagName('head')[0];
        const elem = this.createElem('style', { 'type':'text/css' }, cssText);
        head.appendChild(elem);
    }
    
    this.applyTargetClass = function(elem, targetClass, expr)
    {
        if (elem === null){
            return 0;
        }
        const v0 = elem.className.trim();
        let cls = v0.replace(expr || /zdjeciownik_[a-z0-9_]+/, '').trim();
        cls += ' ' + targetClass;
        cls = cls.trim();
        if (cls !== v0){
            elem.className = cls;
            return 1;
        } else {
            return 0;
        }
    }
}

// ----------------------------------- TOOLS END -------------------------------

class Main {

    prepare()
    {
        debug.info('Prepare: {}', window.location.href);
        const cb = this.findOutCB();
        if (cb === null){
            debug.warn('Can not find method for {}', window.location.href);
            return ;
        }
        dom.loadCss(css);

        const perform1 = debug.wrap(this.perform.bind(this, cb.bind(this)));

        const a = dom.createElem('a', {'class': 'zdjeciownik_pokaz' }, 'Pokaż wszystkie');
        a.addEventListener('click', perform1);
        const content = dom.getNodeByCss('#content');
        content.insertBefore(a, content.firstChild);
    }

    findOutCB()
    {
        const url = window.location.href;
        if (url.includes('/2-metart/')){
            return this.cbHash;
        }
    }

    cbHash(wrapper)
    {
        const items = dom.getNodesByCss('#content .thumbs img');
        debug.debug('Working on {} images', items.length);
        items.forEach((img) => {
            const src2 = img.src.replace('/img/', '/pics/').replace(/-thumb[^.]+/, '');
            this.createImage(src2, wrapper);
        });
    }
    
    createImage(src, wrapper)
    {
        const li2 = dom.createElem('li');
        wrapper.appendChild(li2);
        const img2 = dom.createElem('img', {src: src });
        const a2 = dom.createElem('a', {href: src });
        a2.appendChild(img2);
        li2.appendChild(a2);
    }

    perform(cb)
    {
        debug.debug('Performing operation');
        let root = dom.getNodeByCss('.zdjeciownik_list');
        if (root === null){
            root = dom.createElem('div', {'class':'.zdjeciownik_list'});
            dom.getNodeByCss('body').appendChild(root);
        }

        const oldWrapper = dom.getNodeByCss('.zdjeciownik_list ol');

        const wrapper = dom.createElem('ol');
        cb(wrapper);
        if (oldWrapper !== null){
            oldWrapper.parentNode.removeChild(oldWrapper);
        }
        root.appendChild(wrapper);

        const origin = dom.getNodeByCss('#wrapper');
        if (origin !== null){
            origin.parentNode.removeChild(origin);
        }
    }

}

const main = new Main();
document.addEventListener('DOMContentLoaded', debug.wrap(main.prepare.bind(main)), false);
})();
