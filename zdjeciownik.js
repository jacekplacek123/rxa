// ==UserScript==
// @name           zdjeciownik
// @namespace      zdjeciownik
// @description    Szybkie ściąganie zdjęć
// @version        0.2.0
// @include        https://www.freexcafe.com/*
// @grant          none
// @run-at         document-end
// ==/UserScript==

(function (){
'use strict';

// 0 - bardzo mało, 1 - trochę, 2 - dużo, 3 - bardzo dużo
const doDebug = 2;

const css = `
#content {
    padding-top: 0.4375em;
}
.thumbs_v_new {
    padding-top: 1.875em;
}
.zdjeciownik_pokaz {
    color: #A77A7A;
    background-color: #331A25;
    text-decoration: none;
    border: #A77A7A 1px solid;
    padding: 0.427em 1.125em;
    font-size: 2em;
    font-size: calc(16px + 0.5vw);
    text-shadow: 0.125em 0.125em 0.1875em black;
    border-radius: 6px;
    display: inline-block;
    cursor: pointer;
}
.zdjeciownik_lista img {
    max-width: 100%;
}
.zdjeciownik_lista {
    list-style: none;
}
`;

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

    this.createElem = function(tag, attr, chlid) {
        const el = document.createElement(tag);
        if (typeof chlid === 'string' || chlid instanceof String){
            el.textContent = chlid;
        } else
        if (chlid instanceof HTMLElement){
            el.appendChild(chlid);
        }
        if (typeof attr !== 'undefined')
            for (let [k, v] of Object.entries(attr))
                el.setAttribute(k, v);
        return el;
    }

    this.loadCss = function(cssText){
        const head = document.getElementsByTagName('head')[0];
        const elem = this.createElem('style', { 'type':'text/css' }, cssText);
        head.appendChild(elem);
    }
}

// ----------------------------------- TOOLS END -------------------------------

class Main {

    prepare()
    {
        debug.info('Prepare: {}', window.location.href);

        const links = this.getImageLinks();
        debug.debug('Found {} image links', links.length);
        if (links.length === 0){
            return ;
        }

        dom.loadCss(css);

        const a = dom.createElem('a', {'class': 'zdjeciownik_pokaz' }, 'Pokaż wszystkie');
        a.addEventListener('click', debug.wrap(this.loadImagesWithXHR.bind(this, links)));
        let content = dom.getNodeByCss('#content');
        if (content !== null){
            content.insertBefore(a, content.firstChild);
            return;
        }
        content = dom.getNodeByCss('.thumbs_v_new');
        if (content !== null){
            const div = dom.createElem('div', undefined, a);
            content.parentNode.insertBefore(div, content);
        }
    }

    getImageLinks()
    {
        const items = dom.getNodesByCss('#content .thumbs a, #content_v_new .thumbs_v_new a');
        return items.map(a => a.href);
    }

    loadImagesWithXHR(items)
    {
        const wrappers = [];

        this.replaceContent((wrapperList) => {
            const cnt = items.length;
            for (let i=0; i<cnt; i++){ 
                wrappers.push({
                    href: items[i],
                    wrapper: this.createImageWrapper(wrapperList)
                });
            }
        });

        const processImage = (index) => {
            if (index >= wrappers.length) {
                return ;
            }
            const w0 = wrappers[index];
            const url = w0.href;
            const wrapper = w0.wrapper;
            debug.debug('Processing image at index {} from {}', index, url);
            const promise = this.extractImageUrl(url);
            promise
                .then((imgUrl) => {
                    debug.debug('Resolved image at index {} to {}', index, imgUrl);
                    this.createImage(imgUrl, wrapper)
                })
                .catch((err) => {
                    wrapper.appendChild(dom.createElem('span', {}, err))
                })
                .finally(() => {
                    processImage(index+1);
                });
        }
        processImage(0);
    }

    extractImageUrl(url)
    {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = debug.wrap(() => {
                debug.trace('XHR {} state: {}, status: {}', url, xhr.readyState, xhr.status);
                if (xhr.readyState != 4) {
                    return ;
                }
                if (xhr.status != 200){
                    reject(`Load of ${url} failed: ${xhr.status}`);
                    return ;
                }
                const respHtml = xhr.responseText;
                const imgUrl = this.extractImageUrlFromHTML(respHtml); // this.extractImageUrlFromDocument(resp);
                if (imgUrl === null){
                    reject(`Can not find image in ${url}`);
                } else {
                    resolve(imgUrl);
                }
            });
            xhr.send(null);
        });
    }

    extractImageUrlFromHTML(html)
    {
        const div = dom.createElem('div');
        div.innerHTML = html;
        return this.extractImageUrlFromDocument(div);
    }

    extractImageUrlFromDocument(doc)
    {
        const img = dom.getNodeByCss('#imagelink img', doc);
        if (img === null){
            return null;
        }
        return img.src;
    }

    createImageWrapper(listWrapper)
    {
        const li2 = dom.createElem('li');
        listWrapper.appendChild(li2);
        return li2;
    }
    
    createImage(src, imageWrapper)
    {
        const img2 = dom.createElem('img', {src: src });
        const a2 = dom.createElem('a', {href: src }, img2);
        imageWrapper.appendChild(a2);
    }        

    replaceContent(cb)
    {
        debug.debug('Performing operation');
        let root = dom.getNodeByCss('.zdjeciownik_lista');
        if (root === null){
            root = dom.createElem('div', {'class':'zdjeciownik_lista'});
            dom.getNodeByCss('body').appendChild(root);
        }

        const oldWrapper = dom.getNodeByCss('.zdjeciownik_lista ol');

        const wrapper = dom.createElem('ol');
        cb(wrapper);
        if (oldWrapper !== null){
            oldWrapper.parentNode.removeChild(oldWrapper);
        }
        root.appendChild(wrapper);

        const origin = dom.getNodesByCss('#wrapper, #wrapper-v-new');
        for (let e of origin){
            e.parentNode.removeChild(e);
        }
    }

}

let main = new Main();
debug.wrap(main.prepare.bind(main))();
})();
