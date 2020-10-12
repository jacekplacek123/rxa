// ==UserScript==
// @name           roksahidden_loader
// @namespace      roksahdn
// @description    filtr ukrywający nie interesujące nas ogłoszenia z listy ulubionych
// @version        0.0.1
// @include        http://*.roksa.pl/*/logowanie*
// @include        https://*.roksa.pl/*/logowanie*
// @include        http://*.roksa.pl/*/panel2/*
// @include        https://*.roksa.pl/*/panel2/*
// @include        http://*.roksa.pl/pl/szukaj/*
// @include        https://*.roksa.pl/pl/szukaj/*
// @include        http://*.roksa.pl/en/search/*
// @include        https://*.roksa.pl/en/search/*
// @include        http://*.roksa.pl/pl/anonse/pokaz/*
// @include        https://*.roksa.pl/pl/anonse/pokaz/*
// @include        http://*.roksa.pl/en/advertisements/show/*
// @include        https://*.roksa.pl/en/advertisements/show/*
// @include        http://*.roksa.pl/fr/annonces/montrer/*
// @include        https://*.roksa.pl/fr/annonces/montrer/*
// @include        http://*.roksa.pl/de/annoncen/anzeigen/*
// @include        https://*.roksa.pl/de/annoncen/anzeigen/*
// @include        http://*.roksa.pl/es/anuncios/*
// @include        https://*.roksa.pl/es/anuncios/*
// @include        http://*.roksa.pl/it/annunci/mostrare/*
// @include        https://*.roksa.pl/it/annunci/mostrare/*
/// resource       dexie https://unpkg.com/dexie@3.0.2/dist/dexie.js
/// require        https://unpkg.com/dexie@3.0.2/dist/dexie.js
//  grant          GM.getResourceUrl
// @grant          none
// @run-at         document-start
// ==/UserScript==


(function (){
'use strict';

// ----------------------------------- TOOLS -----------------------------------
var dom = new function(){
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
}


// ----------------------------------- MAIN -----------------------------------

/**
 * Ładuje zasoby z URL
 * @param urls - lista adresów dokumentów do załadowania. dokument jest ładowany w kontekście głównego okna
 */
function loadDependency(urls) {
    const timer = window.setInterval(() => {
        const headElem = document.getElementsByTagName('head')[0]
        if (!headElem) {
            return 
        }
        for (let url of urls){
            const script = dom.createElem('script', {
                type: 'text/javascript',
                src: url,
                defer: 'defer',
                async: 'async',
                referrerpolicy: 'no-referrer'
            })
            headElem.appendChild(script)
        }
        
        window.clearInterval(timer)
        
    }, 50)
}

loadDependency([
    '//unpkg.com/dexie@3.0.2/dist/dexie.js',
    'https://jacekplacek123.github.io/rxa/rxa-hdn.js'
]);

})();
