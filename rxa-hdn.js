// ==UserScript==
// @name           roksahidden
// @namespace      roksahdn
// @description    filtr ukrywający nie interesujące nas ogłoszenia z listy ulubionych
// @version        8.10.1
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
// @grant          none
// @run-at         document-start
// ==/UserScript==


(function (){
'use strict';

// TODO:
// Nawet jeżeli ogłoszenie wyłączone, to wyświetlenie notatek + ew. edycja
// Zestawienie danych w ogłoszeniu -> tel, wiek, wzrost, itp
// Zestawienie danych w wynikach wyszukiwania -> tel, wiek, wzrost, itd
// Wyświetlanie ile ogłoszeń jest na stronie
// jeżeli jesteśmy na liście wszystkich anonsów, to tryb pokaż wsztstkie/wyszarz

// ukrywa ogłoszenia, gdy znajdzie jedną z poniższych fraz w prywatnym komentarzu
var frazyDoUkrycia = [
    'nie, nie, nie',
    'nie!',
    'omijać',
    'leniwa',
    'naciągara',
    'nie polecana',
    'szału ni ma',
    'dupy nie urywa',
    'roksahidden'
];

// ukrywa ogłoszenia spoza wybranych miast
var tylkoWybraneMiasta = [
];
//-----------------------------------------------------------

// 0 - bardzo mało, 1 - trochę, 2 - dużo, 3 - bardzo dużo
var doDebug = 1;

// flaga, czy w wynikach wyszukiwania pokazywać notatki z ogłoszeń
var showNotesInSearch = true;

// czy linki w notatkach ogłoszeń mają być klikalne?
var linkifyNotes = true;
// czy nr telefonów w ogłoszeniach mają być linkami? działa tylko, jeżeli linkifyNotes = true
// var linkifyNotesTel = false; // nie, 
// var linkifyNotesTel = ['roksa', 'garso', 'google']; // wstawia dodatkowe trzy odnośniki,
// var linkifyNotesTel = 'garso'; // zmiania na bezpośredni link do garso
var linkifyNotesTel = ['roksa', 'google', 'garso'];

// czy dodać linki pod numerem telefonu
// dodatkowe providery:
// - google_id - google na id anonsu
// - garso_plus - garsoniera na numer telefonu lub id anonsu
var linkifyAnonsTel = ['roksa', 'google', 'google_id', 'garso_plus'];


// czy na formatce wyszukiwania pokazywać przełącznik ukrywania anonsów?
var showSearchSwitchBox = true;

// czy wyświetlać informację w anonsie, że nr telefonu uległ zmianie (brak zapisanego bieżącego nr w notatkach)?
var validatePhoneNoInAnons = true;

// czy wyświetlać informację na liście ulubionych, że nr telefonu uległ zmianie?
var validatePhoneNoInFavorities = true;

//-----------------------------------------------------------
// czy przeładować strony http na https?
var forceHttps = true;
// flagę należy ustawić w zależności od tego, czy jest to UserJS wywoływany przez przeglądarkę po załadowaniu treści (true),
// bądź zwykły skrypt ładowany w trakcie parsowania strony (false) - wtedy skrypt czeka na załadowanie DOMa
var isUserJs = false;
//-----------------------------------------------------------

// CSSy do zaaplikowania
var cssForFavorities = [
    'a.roksahiddencss {cursor:pointer;} ',
    'a.roksahiddencss div {background-color: #4D0465; color: #DECEE0;} ',
    'a.roksahiddencss div:hover {background-color: #3E0351; color: white;} ',
    'a.roksahidden_active div, a.roksahidden_active div:hover {background-color: #FA8C0B; color: white;} ',
    '.roksahidden_hide {display: none !important;} ',
    '.roksahidden_dim div, ',
    '.roksahidden_dim textarea, ',
    '.roksahidden_dim.favourites_box a {color:#999;} ',
    '.roksahidden_dim img {opacity:0.5; filter:alpha(opacity=50);} ',
    '.roksahidden_dim.favourites_box .button_red { background: #999; border-color: black; } ',
    'a.garso4gm img {width: 16px; height: 16px; padding: 0 5px; vertical-align: baseline; } ',
    '.favourites_content_list .roksahidden_wrapper { margin-left: 36px; margin-top: 5px; }',
    '',
].join('\n');

var cssForSearch = [
    '.roksahidden_search_switchbox {width: 95%; margin: 15px auto;} ',
    'a.roksahiddencss {cursor:pointer;} ',
    'a.roksahiddencss div {background-color: #4D0465; color: #DECEE0;} ',
    'a.roksahiddencss div:hover {background-color: #3E0351; color: white;} ',
    'a.roksahidden_active div, a.roksahidden_active div:hover {background-color: #FA8C0B; color: white;} ',
    '.roksahidden_search_dim img {opacity:0.5; filter:alpha(opacity=50);} ',
    '.roksahidden_search_dim .random_item {color:#C5ACD9;} ',
    '.roksahidden_search_hide {display: none !important;} ',
    'div.roksahidden_anonse_links { padding-right: 5px; padding-left: 5px; } '+
    'div.roksahidden_anonse_links span { color: #4C0365; font-size: 16px; line-height: normal; } ',
    'div.roksahidden_anonse_links textarea { height:5em; width:100%; border: 1px solid #AC81AD; } ',
    '',
].join('\n');
    
var cssForNotesInSearch = [
    '.roksahidden_tooltip {white-space: pre; max-height: 15em; max-width: 600px; font-size: 1em; line-height: 110%; overflow: hidden; border: 1px dotted #CE4AE6; display: block !important; margin-top: 3px; padding: 1px; padding-right: 2px; }',
    '.anonshint-tooltip.ui-tooltip {max-width: 620px !important; }',
    ''
].join('\n');

var cssForAnons = [
    'div#notatka_content a {color: black !important;} ',
    'div#notatka_content a.roksahidden_clicked { background-color: antiquewhite; }',
    'div#notatka_content a.roksahidden_self { background-color: mistyrose !important;}',
    '#dane_anonsu_wrap a.garso4gm { float: right; position: relative; /*top: 1.5em;*/ } ',
    '#dane_anonsu_wrap span.dane_anonsu_tel a:first-of-type {margin-right: 2em;} ',
    '#dane_anonsu_wrap *.garso4gm img {width: 16px; height: 16px;} ',
    ''
].join('\n');

//-----------------------------------------------------------

var favoritiesListEngine = new function(){
    this.mySwitchers = [];
    this.myElements = [];

    this.switchClass = function(mode)
    {
        if (typeof mode === 'undefined'){
            mode = commonUtils.getCssMode();
        } else {
            mode = parseInt(mode);
        }
        debug.info('switch class, mode: {}', mode); 
        var targetClass = '';
        switch(mode){
            case 0:
                targetClass = ' roksahidden_hide';
                break;
            case 1:
                targetClass = ' roksahidden_dim';
                break;
        }

        this.myElements.forEach(function(e2){
            dom.applyTargetClass(e2, targetClass);
        });
        this.mySwitchers.forEach(function(e2, idx){
            dom.applyTargetClass(e2, idx === mode ? 'roksahidden_active' : '');
        });
        commonUtils.setCssMode(mode);
        debug.info('css class switch done, total {} elements in switch list', this.myElements.length);
        return false;
    }

    this.createSwitcher2 = function()
    {
        var elem = document.getElementById('roksahiddenswitcher');
        if (elem !== null)
            return ;
        var xp = dom.getNode("//div[@id='user_content']/div[@class='top_blueC']");
        if (xp === null){
            debug.warn('Can not find node to attach switcher');
            return ;
        }

        elem = dom.createElem('span', { 'style' : 'padding-left: 1em;'} );
        xp.appendChild(elem);

        elem = dom.createElem('a', { 'class':'roksahiddencss' } );
        elem.addEventListener('click', this.switchClass.bind(this, 2));
        xp.appendChild(elem);
        elem2 = dom.createElem('div', { 'class':'top_path2' }, 'Pokaż wszystkie');
        elem.appendChild(elem2);
        this.mySwitchers.unshift(elem);

        elem = dom.createElem('a', { 'class':'roksahiddencss' } );
        elem.addEventListener('click', this.switchClass.bind(this, 1));
        xp.appendChild(elem);
        elem2 = dom.createElem('div', { 'class':'top_path2' }, 'Wyszarz niechciane');
        elem.appendChild(elem2);
        this.mySwitchers.unshift(elem);

        elem = dom.createElem('a', { 'class':'roksahiddencss' } );
        elem.addEventListener('click', this.switchClass.bind(this, 0));
        xp.appendChild(elem);
        var elem2 = dom.createElem('div', { 'class':'top_path2' }, 'Ukryj niechciane');
        elem.appendChild(elem2);
        this.mySwitchers.unshift(elem);

        var mode = commonUtils.getCssMode();
        elem = this.mySwitchers[mode];
        elem.className = elem.className + ' roksahidden_active';
    }

    this.processFavorities = function(){
        favoritiesEngine.init();

        var xp = dom.getNodes("//div[@id='user_content']/div[contains(@class, 'user_anonse_mini_cont')]/div[contains(@id, 'an_nr_')]");
        var favoritiesSize = xp.snapshotLength;
        debug.info('process favorities, start with {} elements', favoritiesSize); 

        var myIdsToHide = {}; 
        var idToElem = {};
        var idToNotatka = {};
        var ids = [];
        
        var log = '{} --> hide = {}, {}';
        if (debug.isTraceEnabled()) log += '; {}; {}';

        for (let i=0; i<favoritiesSize; i++){
            let elem = xp.snapshotItem(i);
            var id = elem.getAttribute('id').replace(/[^0-9]/g, '');
            debug.debug('------------------------------------------------');
            debug.debug('processing {} {}', 
                function(){return elem.getAttribute('id');},
                function(){return dom.getElemText(".//div[@class='favourites_name']", elem);}
            );
            if (typeof myIdsToHide[id] !== 'undefined'){ 
                debug.warn('Duplicate anons id: {}, skipping', id);
                continue;
            }
            ids.push(id);
            idToElem[id] = elem;
            var itemResult = {'doHide': false, 'reason': ''};
            var form = dom.getNode(".//form[contains(@class, 'user_note_form')]", elem);
            var city = dom.getElemText(".//div[@class='favourites_content_list'][1]", elem);
            var txt = '';
            favoritiesEngine.isAnonsCityOkImpl(city, itemResult);
            if (form !== null){
                txt = dom.getElemText(".//textarea[contains(@class, 'user_note_tresc')]", form);
                commonUtils.saveNote(id, txt);
                favoritiesEngine.isNotatkaTextOkImpl(txt, itemResult);
                var submitListener = new function(){ 
                    this.id = id;
                    this.city = city;
                    this.form = form;
                    this.elem = elem;
                    this.handleEvent = function(evt){
                        var txt2 = dom.getElemText(".//textarea[contains(@class, 'user_note_tresc')]", this.form);
                        favoritiesEngine.updateIdToHide(this.id, this.city, txt2);
                        commonUtils.saveNote(this.id, txt2);
                        favoritiesListEngine.validatePhoneNo(this.elem, txt2);
                    }
                };
                idToNotatka[id] = txt;
                form.addEventListener('submit', submitListener, false);
            } else {
                debug.warn('Can not find form with custom note, id: {}', id);
            }
            debug.debug(log, id, itemResult.doHide, itemResult.reason, city, txt);
            if (itemResult.doHide){
                this.myElements.push(elem);
                myIdsToHide[id] = 1;
            } else {
                myIdsToHide[id] = 0;
            }
        }
        
        commonUtils.saveIdsToHide(myIdsToHide);
        commonUtils.registerNoteChangeEvent(function(id, newNote){
            var elem = idToElem[id];
            if (!elem){
                return ;
            }
            this.validatePhoneNo(elem, newNote);
            var textarea = dom.getNode(".//textarea[contains(@class, 'user_note_tresc')]", elem);
            textarea.value = newNote;
        }.bind(favoritiesListEngine));
        
        // apply UI changes
        debug.info("Applying UI changes on {} elements", ids.length);
        var targetClass = null;
        switch(commonUtils.getCssMode()){
            case 0:
                targetClass = ' roksahidden_hide';
                break;
            case 1:
                targetClass = ' roksahidden_dim';
                break;
        }
        
        for (var i=0; i<ids.length; i++){
            var id = ids[i];
            var doHide = myIdsToHide[id] === 1;
            var elem = idToElem[id];
            if (targetClass !== null && doHide){
                dom.applyTargetClass(elem, targetClass);
            }
            this.linkifyTelNo(elem, id);
            var txt = idToNotatka[id];
            if (typeof txt === 'string'){
                this.validatePhoneNo(elem, txt, id);
            }
        }
        
        const blokowane = dom.getNodes("//div[@id='blokowane']//div[contains(@class, 'blokowane_box')]");
        const blokowaneSize = blokowane.snapshotLength;
        debug.info('process blokowane, start with {} elements', blokowaneSize); 
        for (let i=0; i<blokowaneSize; i++){
            const div = blokowane.snapshotItem(i);
            let img = dom.getNodes(".//img[contains(@src, 'mini')]", div);
            if (img.snapshotLength === 0){
                continue;
            }
            img = img.snapshotItem(0);

            let nr = dom.getNodeByCss("*[data-nr]", div);
            if (nr === null){
                continue;
            }
            nr = nr.dataset.nr;
            
            const a = dom.createElem('a', {'href':'/pl/anonse/pokaz/' + nr} );
            img.parentElement.insertBefore(a, img);
            img.parentElement.removeChild(img);
            a.appendChild(img);
        }
        
        debug.info("UI changes done");
    }

    this.validatePhoneNo = function(context, notatka, id){
        if (!validatePhoneNoInFavorities){
            return ;
        }
        commonUtils.validatePhoneNo2(context, commonUtils.extractPhoneNumbers(notatka), id);
    }
    
    this.linkifyTelNo = function(elem, id){
        var telNode = dom.getNode(".//span[contains(@class, 'dane_anonsu_tel')]", elem);
        if (telNode === null){
            return ;
        }
        const wrapper = dom.createElem('div', {'class':'roksahidden_wrapper'});
        telNode.parentNode.insertBefore(wrapper, telNode.nextSibling);
        commonUtils.processPhoneNumber(telNode, linkifyAnonsTel, id, wrapper);
    }
    
    this.processFavoritiesListPage = function() {
        dom.loadCss(cssForFavorities);
        debug.info('roksa process favorities start');
        this.processFavorities();
        debug.info('roksa loading favorities ui');
        this.createSwitcher2();
        debug.info('roksa process favorities end');
    }
}

var favoritiesEngine = new function(){

    this.myPhrasesToHide = [];
    this.myChoosenCities = [];
    this.init = function(){
        this.myPhrasesToHide = [];
        this.myChoosenCities = [];
        for (var k=0; k<tylkoWybraneMiasta.length; k++){
            var phrase = tylkoWybraneMiasta[k].toLowerCase().trim();
            if (phrase.length > 0)
                this.myChoosenCities.push(phrase);
        }
        for (var k=0; k<frazyDoUkrycia.length; k++){
            var city = frazyDoUkrycia[k].toLowerCase().trim();
            if (city.length > 0)
                this.myPhrasesToHide.push(city);
        }
    }
    
    this.isAnonsCityOkImpl = function(txt, result)
    {
        if (this.myChoosenCities.length === 0){
            return ;
        }
        result.doHide = true;
        if (typeof txt !== 'undefined' && txt !== null && txt.length > 0){
            var txt = txt.toLowerCase();
            result.reason = 'city-unmatched ' + txt;
            for (var k=0; k<this.myChoosenCities.length; k++){
                if (txt.indexOf(this.myChoosenCities[k]) > -1){
                    result.doHide = false;
                    result.reason = 'city-matched ' + this.myChoosenCities[k];
                    break;
                }
            }
        } else {
            result.doHide = false;
            result.reason = 'city-unknown';
        }
    }
    
    this.isNotatkaTextOkImpl = function(txt, result)
    {
        if (result.doHide || this.myPhrasesToHide.length === 0 || 
            txt === null || typeof txt === 'undefined' || txt.length === 0){
            return ;
        }
        txt = txt.toLowerCase();
        for (var k=0; k<this.myPhrasesToHide.length; k++){
            if (txt.indexOf(this.myPhrasesToHide[k]) > -1){
                result.doHide = true;
                result.reason = 'phase-matched ' + this.myPhrasesToHide[k];
                break;
            }
        }
    }
    
    this.updateIdToHide = function(id, city, txt){
        var itemResult = {'doHide': false, 'reason': ''};
        this.isAnonsCityOkImpl(city, itemResult);
        this.isNotatkaTextOkImpl(txt, itemResult);

        var log = 'Item {} updated --> hide = {}, {}';
        if (debug.isTraceEnabled()) log += '; {}; {}';
        debug.info(log, id, itemResult.doHide, itemResult.reason, city, txt);
        var myIdsToHide = {}; 
        myIdsToHide[id] = itemResult.doHide ? 1 : 0;
        commonUtils.saveIdsToHide(myIdsToHide);
    }
}

var searchListEngine = new function() {
    this.mode = 2;
    this.processSearchPage = function()
    {
        debug.info('------------------------------------------------'); 
        this.loadCss2();
        this.loadAnonseData();
        var isByPhoneSearch = window.location.href.match(/nr_tel=[0-9]{3,}/) !== null;
        var mode = commonUtils.getCssModeForSearch(); 
        if (isByPhoneSearch && (mode === 0 || mode >= 3)) 
            mode = 1;
        var withNotesOnly = !isByPhoneSearch && commonUtils.getWithNotesOnly();    
        if (withNotesOnly && mode === 3){ 
            mode = commonUtils.getPrevCssMode();
        }
        this.processSearchResults(mode, withNotesOnly);
        if (isByPhoneSearch && this.allAnonseUrls.length > 1)
            this.addParsedLinks();
        if (showSearchSwitchBox)
            this.createSearchSwitchBox(mode, isByPhoneSearch, withNotesOnly);
        this.mode = mode;
    }

    /**
       @param mode 0 - ukryj ukryte
                   1 - wyszarz
                   2 - pokaż wszystkie
                   3 - pokaż tylko bez notatek (potencjalnie nowe)
       @param withNotesOnly ukrywa te bez notatek             
     */
    this.processSearchResults = function(mode, withNotesOnly)
    {
        debug.info('process search, mode: {}, withNotesOnly: {}', mode, withNotesOnly); 
        var idsToHide = commonUtils.getIdsToHide() || {};
        var allIds = Object.keys(this.idToElem);
        debug.info('search filter, start: {}', allIds.length);
        var count = 0;
        allIds.forEach(function(id){
            debug.debug('processing anons id {}', id);
            var elem = this.idToElem[id];
            var cssClass = this.getTargetCssClass(mode, id, idsToHide, withNotesOnly);
            dom.applyTargetClass(elem, cssClass);
            if (cssClass){
                count++;
            }
            debug.debug('{} --> cssClass: {}', id, cssClass);
        }, this);
        debug.info('process search hide {} out of {} items', count, allIds.length); 
    }
    this.idToElem = {};
    this.loadAnonseData = function(){
        var xp = dom.getNodes("//div[@id='anons_group']/a");
        debug.info('search list, start: {}', xp.snapshotLength);
        var count = 0;
        var extractIdPattern = /\/([0-9]+)$/g;
        this.idToElem = {};
        var idToHref = {};
        var allIds = [];
        for (var i=0; i<xp.snapshotLength; i++){
            var elem = xp.snapshotItem(i);
            var href = elem.getAttribute('href');
            debug.debug('found anons {}', href);
            extractIdPattern.lastIndex = 0;
            var id = extractIdPattern.exec(href);
            if (id !== null){
                id = id[1];
                searchListEngine.idToElem[id] = elem;
                idToHref[id] = href;
                allIds.push(id);
                this.updateNotes(elem, id); 
            } else {
                debug.warn('Can not extract id from href: {}', href);
            }
        }
        commonUtils.registerNoteChangeEvent(function(id,newNote){
            var elem = searchListEngine.idToElem[id];
            if (elem){
                debug.debug('Updating note id {} callback', id);
                if (showNotesInSearch){
                    searchListEngine.updateNotes(elem, id, newNote);
                }
                var withNotesOnly = commonUtils.getWithNotesOnly();
                var idsToHide = commonUtils.getIdsToHide() || {};
                var cssClass = searchListEngine.getTargetCssClass(searchListEngine.mode, id, idsToHide, withNotesOnly);
                dom.applyTargetClass(elem, cssClass);
            }
        });
        commonUtils.registerNotesHideChanges(function(idsToHide){
            debug.debug('Updating ids to hide from callback');
            var withNotesOnly = commonUtils.getWithNotesOnly();
            for (var id in searchListEngine.idToElem){
                var cssClass = searchListEngine.getTargetCssClass(searchListEngine.mode, id, idsToHide, withNotesOnly);
                var elem = searchListEngine.idToElem[id];
                dom.applyTargetClass(elem, cssClass);
            }
        });
        commonUtils.sortNum(allIds);
        allIds.forEach(function(id){
            this.allAnonseUrls.push(this.resolveRelative(idToHref[id]));
        }, this);
    }
    /** Czy dany anons powinien zostać ukryty */
    this.getTargetCssClass = function(mode, id, idsToHide, withNotesOnly){
        if (mode === 3){
            // tylko-bez-notatek
            return commonUtils.hasNote(id) ? 'roksahidden_search_hide' : '';
        }
        // TODO: to jest nieładnie tu wywoływana funkcja...
        if (withNotesOnly && !commonUtils.hasNote(id)){
            return 'roksahidden_search_hide';
        }
        
        if (idsToHide[id] === 1){
            switch(mode){
                case 0: 
                    return 'roksahidden_search_hide'; 
                case 1: 
                    return 'roksahidden_search_dim';
            }
        }
        return '';
    }
    this.switchClass = function(mode){
        var withNotesOnly = commonUtils.getWithNotesOnly();
        if (mode === 3 && withNotesOnly){
            // wyłączam tryb tylko-z-notatkami
            withNotesOnly = false;
            dom.applyTargetClass(this.myOnlyWithNotesSwitch, '');
        }
        this.processSearchResults(mode, withNotesOnly);
        this.mySwitchers.forEach(function(e2, idx){
            dom.applyTargetClass(e2, idx === mode ? 'roksahidden_active' : '');
        });
        commonUtils.setCssModeForSearch(mode); 
        commonUtils.setWithNotesOnly(withNotesOnly);
        this.mode = mode;
        return false;
    }
    this.switchWithNotesOnly = function(){
        var mode = commonUtils.getCssModeForSearch(); 
        var newWithNotesOnly = this.myOnlyWithNotesSwitch.className.indexOf('roksahidden_active') === -1;
        if (newWithNotesOnly && mode === 3){
            // włączam tylko z notatkami, wyłączam tylko-bez-notatek
            mode = commonUtils.getPrevCssMode();
        }
        this.processSearchResults(mode, newWithNotesOnly);
        dom.applyTargetClass(this.myOnlyWithNotesSwitch, newWithNotesOnly ? 'roksahidden_active' : '');
        this.mySwitchers.forEach(function(e2, idx){
            dom.applyTargetClass(e2, idx === mode ? 'roksahidden_active' : '');
        });
        commonUtils.setWithNotesOnly(newWithNotesOnly);
        return false;
    }
    /** Zmienia link relatywny na absolutny */
    this.resolveRelative = function(link){
        if (link.startsWith('http://') || link.startsWith('https://'))
            return link;
        if (link.startsWith('//'))
            return document.location.protocol + link;
        if (link.startsWith('/'))
            return document.location.protocol + '//' + document.location.hostname + link;
        return link;
    }
    
    /** Dodaje notatkę do tooltipa anonsu */
    this.updateNotes = function(elem, id, itemNotes){
        if (!showNotesInSearch){
            return ;
        }
        itemNotes = itemNotes || commonUtils.getNote(id);
        var tooltipNotes = dom.getNode(".//div[@class='tooltip_content']/div[@class='roksahidden_tooltip']", elem);
        if (itemNotes !== null){
            if (tooltipNotes === null){
                var tooltipElem = dom.getNode(".//div[@class='tooltip_content']", elem);
                tooltipNotes = dom.createElem('div', {'class':'roksahidden_tooltip'}, itemNotes);
                tooltipElem.appendChild(tooltipNotes);
            } else {
                tooltipNotes.textContent = itemNotes;
            }
        } else {
            if (tooltipNotes !== null){
                tooltipNotes.parentNode.removeChild(tooltipNotes);
            }
        }
    }
    
    this.loadCss2 = function(){
        var cssText = cssForSearch;
        if (showNotesInSearch){
            cssText += cssForNotesInSearch;
        }
        dom.loadCss(cssText);
    }
    
    this.allAnonseUrls = [];
    this.mySwitchers = [];
    this.myOnlyWithNotesSwitch = null;
    this.addParsedLinks = function()
    {
        var div = dom.createElem('div', {'class':'roksahidden_anonse_links'});

        var span = dom.createElem('span', {}, 'Linki do ogłoszeń (' + this.allAnonseUrls.length + ')');
        div.appendChild(span);
        var textArea = dom.createElem('textarea', {'readonly':'readonly'}, this.allAnonseUrls.join('\n'));
        div.appendChild(textArea);
        
        var parent = dom.getNode("//div[@class='search_result']/div[@class='stronnicowanie'][2]");
        parent.parentNode.insertBefore(div, parent.nextSibling);
    }
    this.createSearchSwitchBox = function(mode, limited, onlyWithNotes){
        var xp = dom.createElem('div', {'class':'roksahidden_search_switchbox'});

        // TODO: uwspólnić te trzy pierwsze elementy

        var elem = null;
        elem = dom.createElem('a', { 'class':'roksahiddencss' } );
        elem.addEventListener('click', this.switchClass.bind(this, 2));
        xp.appendChild(elem);
        elem2 = dom.createElem('div', { 'class':'top_path2' }, 'Pokaż wszystkie');
        elem.appendChild(elem2);
        this.mySwitchers.unshift(elem);

        elem = dom.createElem('a', { 'class':'roksahiddencss' } );
        elem.addEventListener('click', this.switchClass.bind(this, 1));
        xp.appendChild(elem);
        elem2 = dom.createElem('div', { 'class':'top_path2' }, 'Wyszarz niechciane');
        elem.appendChild(elem2);
        this.mySwitchers.unshift(elem);

        if (!limited){
            elem = dom.createElem('a', { 'class':'roksahiddencss' } );
            elem.addEventListener('click', this.switchClass.bind(this, 0));
            xp.appendChild(elem);
            var elem2 = dom.createElem('div', { 'class':'top_path2' }, 'Ukryj niechciane');
            elem.appendChild(elem2);
        } else {
            elem = dom.createElem('span'); // dummy
        }
        this.mySwitchers.unshift(elem);

        if (!limited){
            elem = dom.createElem('a', { 'class':'roksahiddencss' } );
            elem.addEventListener('click', this.switchClass.bind(this, 3));
            xp.appendChild(elem);
            elem2 = dom.createElem('div', { 'class':'top_path2' }, 'Tylko bez notatek');
            elem.appendChild(elem2);
            this.mySwitchers.push(elem);

            xp.appendChild(dom.createElem('span', { 'style':'padding-left:1em'} ));
            
            elem = dom.createElem('a', { 'class':'roksahiddencss'} );
            if (onlyWithNotes){
                elem.className = elem.className + ' roksahidden_active';
            }
            elem.addEventListener('click', this.switchWithNotesOnly.bind(this));
            xp.appendChild(elem);
            elem2 = dom.createElem('div', { 'class':'top_path2' }, 'Tylko z notatkami');
            elem.appendChild(elem2);
            this.myOnlyWithNotesSwitch = elem;
        }
        
        elem = this.mySwitchers[mode];
        elem.className = elem.className + ' roksahidden_active';
        
        var parent = dom.getNode("//div[@class='search_result']");
        parent.insertBefore(xp, parent.firstChild);
    }
}

var anonsEngine = new function() {
    this.processAnonsPage = function(){
        dom.loadCss(cssForAnons);
        this.processMainPhoneNumber();
        var notatka = document.getElementById('notatka_content');
        if (notatka === null){
            debug.warn('No element with id notatka_content');
            return ;
        }
        favoritiesEngine.init();
        var txt = notatka.textContent.trim();
        if (txt !== ''){
            this.updateStoredNote(notatka);
            this.validatePhoneNo(notatka);
            this.linkifyNotes(notatka);
        }
        this.hookNotatkaChanged(notatka);
        const processLinkClicked = function(href){
            let sel = 'a[href="' + href + '"]';
            if (href.includes('.roksa.pl/')) {
                const extractIdPattern = /[\/=]([0-9]+)$/g;
                const id = extractIdPattern.exec(href);
                if (id !== null){
                    sel = sel + ', a[href$="' + id[1] + '"][href*=".roksa.pl/"]';
                }
            }
            
            const aas = notatka.querySelectorAll(sel);
            for (const aa of aas){
                if (!aa.className.includes('roksahidden_clicked')){
                    aa.className = aa.className + ' roksahidden_clicked';
                }
            }
        }
        const lcc = new BroadcastChannel('LinkClikcChannel');
        notatka.addEventListener('click', function(e){
            const tgt = e.target;
            if (tgt.nodeName !== 'A'){
                return ;
            }
            if (tgt.className.includes('roksahidden_clicked')){
                return ;
            }
            tgt.className = (tgt.className + ' roksahidden_clicked').trim();
            const href = tgt.href;
            lcc.postMessage(href);
            processLinkClicked(href);
        });
        lcc.onmessage = function (ev) { processLinkClicked(ev.data); }
    }
    this.hookNotatkaChanged = function(notatka){
        // Options for the observer (which mutations to observe)
        const config = { attributes: false, childList: true, subtree: false };
        // Callback function to execute when mutations are observed
        const callback = function(mutationsList, observer) {
            // Use traditional 'for loops' for IE 11
            for(let mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.target === notatka){
                    this.updateStoredNote(notatka);
                    this.validatePhoneNo(notatka);
                    this.linkifyNotes(notatka); // todo: obsługa innych funkcjonalności
                    break;
                }
            }
            observer.takeRecords();
        }.bind(this);

        // Create an observer instance linked to the callback function
        const observer = new MutationObserver(callback);

        // Start observing the target node for configured mutations
        observer.observe(notatka, config);    
    }
    this.validatePhoneNo = function(notatka){
        if (!validatePhoneNoInAnons){
            return ;
        }
        var notesTelNumbers = new Array();
        dom.traverseChildNodes(notatka, function(node){
            commonUtils.extractPhoneNumbers(node.textContent, notesTelNumbers);
        });
        commonUtils.validatePhoneNo2(null, notesTelNumbers, this.extractId());
    }
    
    this.linkifyNotes = function(notatka){
        if (!linkifyNotes){
            return ;
        }
        var exprHttp = /https?:\/\/[^ <\n\r\t(]+/g; // fucking bad expression :/
        var exprTel = /[0-9]{3}[ -][0-9]{3}[ -][0-9]{3}/g;
        var expr = /(https?:\/\/[^ <\n\r\t]+)|([0-9]{3}[ -][0-9]{3}[ -][0-9]{3})/g;
        var processor = function(linkValue){
            exprHttp.lastIndex = 0;
            if (exprHttp.exec(linkValue) !== null){
                const className = linkValue == document.location.href ? 'roksahidden_self' : '';
                return dom.createElem('a', {'href':linkValue, 'target':'_blank', 'class':className},linkValue);
            }
            exprTel.lastIndex = 0;
            if (exprTel.exec(linkValue) !== null){
                return this.linkifyTel(linkValue);
            }
            return linkValue;
        }.bind(this);
        dom.traverseChildNodes(notatka, function(node){
            dom.splitNode(node, expr, processor);
        });
    }
    
    this.linkifyTel = function(tel)
    {
        if (linkifyNotesTel === false){
            return tel;
        }
        if (typeof linkifyNotesTel === 'string'){
            var cfg = commonUtils['getLinkCfgFor_' + linkifyNotesTel](tel);
            if (cfg == null){
                return tel;
            }
            return dom.createElem('a', {'href':cfg.url, 'title':cfg.hint, 'target':'_blank'},tel);
        }
        if (Array.isArray(linkifyNotesTel)){
            var span = dom.createElem('span', {}, tel);
            for (var i=0; i<linkifyNotesTel.length; i++){
                var cfg = commonUtils['getLinkCfgFor_' + linkifyNotesTel[i]](tel);
                if (cfg != null){
                    var node = dom.createElem('a', {'href':cfg.url, 'title':cfg.hint, 'target':'_blank', 'style':'margin-left:3px'});
                    node.appendChild(dom.createElem('img', {'src':cfg.favicon, 'style':'vertical-align:baseline'}));
                    span.appendChild(node);
                }
            }
            return span;
        }
        return tel;
    }
    
    this.processMainPhoneNumber = function()
    {
        var telNode = dom.getNode("//span[contains(@class, 'dane_anonsu_tel')]");
        if (telNode === null){
            debug.warn('Can not find phone number node');
            return ;
        }
        let providers = linkifyAnonsTel.slice(0);
        providers.reverse(); 
        commonUtils.processPhoneNumber(telNode, providers, this.extractId());
    }
    
    this.updateStoredNote = function(notatka)
    {
        var txt = notatka.textContent.trim();
        if (txt !== '' && txt.indexOf('\n') < 0){
            var html = notatka.innerHTML.trim();
            html = html.replace(/<br[ \/]?>/g, '\r\n');
            html = html.replace(/<\/?[a-z]+[^<]*>/g,'');
            html = html.replace(/&gt;/g,'>');
            html = html.replace(/&lt;/g,'<');
            html = html.replace(/&amp;/g,'&');
            html = html.replace(/&apos;/g,'\'');
            html = html.replace(/&quot;/g,'"');
            txt = html;
        }
        var id = this.extractId();
        commonUtils.saveNote(id, txt);
        favoritiesEngine.updateIdToHide(id, this.extractCity(), txt);
    }
    this.citi = '';
    this.extractCity = function()
    {
        if (this.citi.length > 0)
            return this.citi;
        var res = '';
        var xp = dom.getNodes("//div[@id='anons_details']//div[contains(@class, 'dane_anonsu_sbox')]");
        for (var i=0; i<xp.snapshotLength; i++){
            if (res.length !== 0)
                res += ' /';
            res += xp.snapshotItem(i).textContent.trim();
        }
        res = res.trim();
        this.citi = res;
        return res;
    }
    this.id = '';
    this.extractId = function()
    {
        if (this.id.length > 0)
            return this.id;
        var extractIdPattern = /\/([0-9]+)$/g;
        var id = extractIdPattern.exec(document.location.pathname);
        if (id !== null){
            id = id[1];
            this.id = id;
            return id;
        }
        debug.warn('Can not extract id from URL, href: {}', document.location.href);
        return null;
    }
}

// ----------------------------------- UTILS -----------------------------------

var commonUtils = new function(){
    
    this.storage = window.localStorage;
    
    this.getCssMode = function() {
        var mode = parseInt(this.storage.getItem('mode'));
        if (mode === null || isNaN(mode)) {
            mode = 1;
        }
        return mode;
    }
    this.getPrevCssMode = function() {
        // TODO: uwspólnić z getCssMode
        var mode = parseInt(this.storage.getItem('prev_search_mode'));
        if (mode === null || isNaN(mode)) {
            mode = 1;
        }
        return mode;
    }
    this.getCssModeForSearch = function() {
        var mode = null;
        if (showSearchSwitchBox) {
            mode = parseInt(this.storage.getItem('search_mode'));
        }
        if (mode === null || isNaN(mode)) {
            mode = this.getCssMode();
        }
        return mode;
    }
    this.getWithNotesOnly = function(){
        return this.storage.getItem('with_notes_only') === 'true';
    }


    this.setCssMode = function(mode){
        if (this.getCssMode() !== mode){
            this.storage.setItem('mode', mode);
            debug.info('save mode: {}', mode);
        }
    }

    this.setCssModeForSearch = function(mode){
        if (mode === null){
            this.storage.removeItem('search_mode');
            return;
        }
        var prev = this.getCssModeForSearch();
        if (prev !== mode){
            this.storage.setItem('search_mode', mode);
            this.storage.setItem('prev_search_mode', prev);
            debug.info('save search mode: {}', mode);
        }
    }

    this.setWithNotesOnly = function(value){
        if (value === null || value === false){
            this.storage.removeItem('with_notes_only');
        } else 
        if (this.getCssModeForSearch() !== value){
            this.storage.setItem('with_notes_only', value);
            debug.info('save with notes only: {}', value);
        }
    }
    
    this.getIdsToHide = function(idsText)
    {
        var ids = idsText || this.storage.getItem('items');
        if (ids === null){
            return null;
        }
        var ids2 = {};
        ids.split(',').forEach(function(id){
            ids2[id] = 1
        });
        return ids2;
    }

    this.saveIdsToHide = function(idsToHide)
    {
        var oldIdsToHide = this.getIdsToHide();
        if (oldIdsToHide !== null){
            for (var k in idsToHide){
                oldIdsToHide[k] = idsToHide[k];
            }
            idsToHide = oldIdsToHide;
        }
        var idsToHide2 = [];
        for (var k in idsToHide){
            if (idsToHide[k]) idsToHide2.push(k);
        }
        this.sortNum(idsToHide2);
        var idsToHide3 = idsToHide2.join();
        var ids = this.storage.getItem('items');
        if (ids === null || idsToHide3 !== ids){
            debug.info('Saving ad ids to hide, count {}', idsToHide2.length);
            debug.debug('items: {}', idsToHide3); 
            this.storage.setItem('items', idsToHide3);
        } else {
            debug.info('No ad ids changed'); 
        }
    }
    
    this.saveNote = function(id, note){
        if (showNotesInSearch === false) return ;
        if (note === null || note.length === 0){
            this.storage.removeItem('an_' + id);
            debug.debug('Note for id {} has been deleted', id);
            return ;
        }
        note = note.replace(/[\r\n]+/g,'\n');
        const oldNote = this.storage.getItem('an_' + id);
        if (oldNote === null || note !== LZString.decompressFromUTF16(oldNote)){
            const noteCompressed = LZString.compressToUTF16(note);
            this.storage.setItem('an_' + id, noteCompressed);
            debug.debug('Note for id {} has been updated', id);
        }
    }
    
    this.getNote = function(id){
        var note = this.storage.getItem('an_' + id);
        if (note !== null){
            note = LZString.decompressFromUTF16(note);
        }
        return note;
    }

    this.hasNote = function(id){
        var note = this.storage.getItem('an_' + id);
        return note !== null;
    }
    
    /** @param callback(anonsId, newNote) */
    this.registerNoteChangeEvent = function(callback){
        window.addEventListener('storage', function(e) { 
            var key = e.key;
            if (!key.startsWith('an_')){
                return ;
            }
            key = key.substring(3);
            var note = LZString.decompressFromUTF16(e.newValue);
            callback.call(this, key, note);
        });
    }
    
    this.registerNotesHideChanges = function(callback){
        window.addEventListener('storage', function(e) { 
            if (e.key !== 'items'){
                return ;
            }
            var ids = commonUtils.getIdsToHide(e.newValue);
            callback.call(this, ids);
        });
    }
    
    this.sortNum = function(array){
        array.sort(function(a, b){return parseInt(a)-parseInt(b);});
    }
    
    this.getLinkCfgFor_google = function(tel){
        var telGarso = tel.replace(/[ -]/g, '-');
        var url = 'https://www.google.pl/search?q=%22' + telGarso + '%22';
        var favicon = 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_16dp.png';
        var hint = 'szukaj \'' + telGarso + '\' w google';
        return {'url':url,'favicon':favicon,'hint':hint};
    }
    this.getLinkCfgFor_google_id = function(tel,id){
        if (typeof id === 'undefined'){
            return null;
        }
        var url = 'https://www.google.pl/search?q=roksa+%22' + id + '%22';
        var favicon = 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_16dp.png';
        var hint = 'szukaj \'roksa ' + id + '\' w google';
        return {'url':url,'favicon':favicon,'hint':hint};
    }
    this.getLinkCfgFor_roksa = function(tel){
        var telRoxa = tel.replace(/[ -]/g, '');
        var url = '/pl/szukaj/?anons_type=0&anons_state=0&anons_city_part=&cenaod=0&cenado=0&cenapoldo=0' +
            '&cena15do=0&cenanocdo=0&wiekod=0&wiekdo=0&wagaod=0&wagado=0&wzrostod=0&wzrostdo=0&biustod=0&biustdo=0' + 
            '&jezyk=&dzien=0&hod=&hdo=&wyjazdy=0&name=&nr_tel=' + telRoxa + '&key_word=#show';
        var favicon = 'https://img.roksa.pl/favicon-16x16.png';
        var hint = 'szukaj \'' + telRoxa + '\' na roksa';
        return {'url':url,'favicon':favicon,'hint':hint};
    }
    this.getLinkCfgFor_garso = function(tel){
        var telGarso = tel.replace(/[ -]/g, '-');
        var url = 'http://www.garsoniera.com.pl/forum/index.php?app=core&module=search' + 
            '&do=quick_search&search_filter_app%5Bforums%5D=1&addon=2&search_term=%22' + telGarso + '%22';
        ;
        var hint = 'szukaj \'' + telGarso + '\' na garsonierze';
        return {'url':url,'favicon':this.garsoFavicon,'hint':hint};
    }
    this.getLinkCfgFor_garso_plus = function(tel,id){
        if (typeof id === 'undefined'){
            return null;
        }
        var telGarso = tel.replace(/[ -]/g, '-');
//        http://www.garsoniera.com.pl/forum/index.php?app=core&module=search&section=search&do=search&fromsearch=1
//        search_term
//        search_app=forums
//        andor_type=or
//        search_content=both
//        search_app_filters[forums][noPreview]=1
//        search_app_filters[forums][sortKey]=date
//        search_app_filters[forums][sortDir]=0
        var url = 'http://www.garsoniera.com.pl/forum/index.php?app=core&module=search&section=search&do=search&fromsearch=1' + 
            '&search_app=forums&andor_type=or&search_content=both' + 
            '&search_app_filters%5Bforums%5D%5BnoPreview%5D=1' + 
            '&search_app_filters%5Bforums%5D%5BsortKey%5D=date' + 
            '&search_app_filters%5Bforums%5D%5BsortDir%5D=0' + 
            '&search_term=%22' + telGarso + '%22+' + id;
        ;
        var hint = 'szukaj \'' + telGarso + '\' ' + id + ' na garsonierze';
        return {'url':url,'favicon':this.garsoFavicon,'hint':hint};
    }
    this.garsoFavicon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAEGSURBVDhPtVEhDIMwEJxETmInkZNYZOUktnJyEotETs4ikUgsEomsRVZW/u5a2CALYll2%2BZBP/%2B7//jnIl/hdMI7StuIc43qV202aZi55bAVdJ0oxLhdSlZrS1KYpc2sDZSUYhsAGAzyTJMPp1B2P%2BPJdaw5/C6ZJ8txmGRhdHAeeOZ9dXdPh/R56gbYIyhLlNopGvGIUvCGCjZdPv4wXoD2caG1RWwPKspzZOICHF1QVLWJuUbCAyPOZ1/d8DInHaofHwylF31lGBnhFgQNge15pwSLwwIp9HDdRxI2TBDm2Qgu2W7AREMY4rUeww5UwClda4UMQgJNjY2P4v7fYEezj3wKRJ%2B6igQJdrkgvAAAAAElFTkSuQmCC';
    this.validatePhoneNo2 = function(contextNode, noteTelNumbers, id){
        var expr = /[0-9]{3}[ -][0-9]{3}[ -][0-9]{3}/g;
        var telNode = dom.getNode(".//span[contains(@class, 'dane_anonsu_tel')]", contextNode);
        if (telNode === null){
            return ;
        }
        var match;
        if ((match = expr.exec(telNode.textContent)) === null){
            debug.info('Can not find phone number in node: {}, id: {}', telNode.textContent, id);
            return ;
        }
        var anonsTelNo = match[0].replace(/[ -]/g, '');
        var mark = '';
        var hint = '';
        if (noteTelNumbers.length === 0){
            mark = '!';
            hint = 'Brak nr telefonu w notatkach';
        } else {
            var idx = noteTelNumbers.lastIndexOf(anonsTelNo);
            if (idx === -1){
                mark = '!!!';
                hint = 'Nowy nr telefonu';
            }
        }
        var telNodeAlert = dom.getNode(".//span[contains(@class, 'rokshidden_tel_alert')]", telNode);
        if (telNodeAlert !== null){
            telNodeAlert.textContent = ' ' + mark + ' ';
            telNodeAlert.setAttribute('title', hint);
        } else {
            if (mark !== ''){
                dom.traverseChildNodes(telNode, function(node){
                    expr.lastIndex = 0;
                    if (node.nodeType === 3 && expr.exec(node.textContent) !== null){
                        var infoNode = dom.createElem('span', {'class': 'rokshidden_tel_alert', 'title': hint}, ' ' + mark + ' ');
                        node.parentNode.insertBefore(infoNode, node.nextSibling);
                    }
                });
            }
        }
    }
    
    this.extractPhoneNumbers = function(txt, arr){
        arr = arr || new Array();
        var expr = /(?:^|[^0-9])([0-9]{3}[ -][0-9]{3}[ -][0-9]{3})/g;
        var start = 0;
        var match;
        if ((match = expr.exec(txt)) !== null){
            do{
                arr.push(match[1].replace(/[ -]/g, ''));
                start = expr.lastIndex;
            }while((match = expr.exec(txt)) !== null);
        }
        return arr;
    }    

    this.processPhoneNumber = function(telNode, providers, id, wrapper)
    {
        if (telNode === null){
            return ;
        }
        var expr = /([0-9]{3})[ -]([0-9]{3})[ -]([0-9]{3})/g;
        var telElements;
        if ((telElements = expr.exec(telNode.textContent)) === null){
            debug.info('Can not find phone number, id: {}', id);
            return ;
        }
        var tel = telElements.splice(1).join('-');
        for (var i=0; i<providers.length; i++){
            var cfg = this['getLinkCfgFor_' + providers[i]](tel, id);
            if (cfg != null){
                var node = dom.createElem('a', {'href':cfg.url, 'title':cfg.hint, 'target':'_blank', 'class':'garso4gm garso4gm_'+providers[i]});
                node.appendChild(dom.createElem('img', {'src':cfg.favicon}));
                (wrapper || telNode).appendChild(node);
            }
        }
        dom.traverseChildNodes(telNode, function(node){
            expr.lastIndex = 0;
            if (node.nodeType === 3 && expr.exec(node.textContent) !== null){
                expr.lastIndex = 0;
                node.textContent = node.textContent.replace(expr, "$`$1-$2-$3$'");
            }
        });
   }
}


// ----------------------------------- TOOLS -----------------------------------

var debug = new function() {
    this.isInfoEnabled = () => doDebug > 0;
    this.isDebugEnabled = function() { return doDebug > 1; }
    this.isTraceEnabled = function() { return doDebug > 2; }
    this.warn = function(message) {
        this.renderMessage('W', arguments);
    }
    this.info = function(message) {
        if (doDebug > 0)
            this.renderMessage('I', arguments);
    }
    this.debug = function(message) {
        if (doDebug > 1)
            this.renderMessage('D', arguments);
    }
    this.trace = function(message) {
        if (doDebug > 2)
            this.renderMessage('T', arguments);
    }
    this.always = function(message) {
        this.renderMessage('A', arguments);
    }
    this.renderMessage = function(level, args) {
        if (args.length == 0) return;
        var now = new Date();
        var dateText = '[' + (now.getHours() < 10 ? ' ' + now.getHours() : now.getHours());
        dateText += ':';
        dateText += now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
        dateText += ':';
        dateText += now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds();
        dateText += '.';
        dateText += now.getMilliseconds() < 10 ? '00' + now.getMilliseconds() : now.getMilliseconds() < 100 ? '0' + now.getMilliseconds() : now.getMilliseconds();
        dateText += '][' + level + '] ';
        var msg = args[0].toString();
        if (args.length == 1){
            console.log(dateText + msg);
            return;
        }
        var logData = [];
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
        for (var i=1; i<args.length; i++){
            var idx = msg.indexOf('{}');
            if (idx < 0) {
                break;
            }    
            var replacement = args[i];
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
}

var dom = new function(){

    this.getNode = function(path, rootNode)
    {
        var xp2 = document.evaluate(path, rootNode || document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return xp2.singleNodeValue;
    }

    this.getNodes = function(path, rootNode)
    {
        var xp = document.evaluate(path, rootNode || document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        return xp;
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
    
    this.getElemText = function(path, elem, trim){
        var elem2 = this.getNode(path, elem);
        var val = null;
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

    this.traverseChildNodes = function(node, fun) {
        var next;
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
        var parent = node.parentNode;
        var text = node.data;
        var start = 0;
        var match;
        expr.lastIndex = 0;
        if ((match = expr.exec(text)) !== null){
            do{
                var matchedValue = match[0];
                var prevText = text.substr(start, expr.lastIndex - matchedValue.length - start);
                if (prevText.length > 0){
                    parent.insertBefore(document.createTextNode(prevText), node);
                }
                var newNode = fun(matchedValue);
                if (typeof newNode === 'string'){
                    newNode = document.createTextNode(newNode);
                }
                parent.insertBefore(newNode, node);
                start = expr.lastIndex;
            }while((match = expr.exec(text)) !== null);
            if (start < text.length){
                var lastText = text.substr(start);
                parent.insertBefore(document.createTextNode(lastText), node);
            }
            parent.removeChild(node);
        }
    }

    this.loadCss = function(cssText){
        var head = document.getElementsByTagName('head')[0];
        var elem = this.createElem('style', { 'type':'text/css' }, cssText);
        head.appendChild(elem);
    }
    
    this.applyTargetClass = function(elem, targetClass, expr)
    {
        var v0 = elem.className.trim();
        var cls = v0.replace(expr || /roksahidden_[a-z0-9_]+/, '').trim();
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

// ----------------------------------- MAIN -----------------------------------
var main = new function(){
    this.init = function(){
        if (!String.prototype.trim) {
            String.prototype.trim = function () {
                return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
            };
        }
        if (!String.prototype.startsWith) {
            String.prototype.startsWith = function(searchString, position){
                position = position || 0;
                return this.substr(position, searchString.length) === searchString;
            };
        }        
        if (!Array.isArray) {
            Array.isArray = function(arg) {
                return Object.prototype.toString.call(arg) === '[object Array]';
            };
        }
    }

    this.inSearchPage = function(){
        return window.location.pathname.match(/szukaj|search/) !== null;
    }

    this.inFavoritiesListPage = function(){
        return window.location.pathname.match(/logowanie|panel2/) !== null;
    }

    this.inAnonsPage = function(){
        return window.location.pathname.match(/anonse\/pokaz\/|advertisements\/show\/|annonces\/montrer\/|annoncen\/anzeigen\/|anuncios|annunci\/mostrare\//) !== null;
    }

    // main loader
    this.loadAndDispatch = function(){
        try {
            this.init();
            if (this.inSearchPage())
                // wyszukiwanie
                searchListEngine.processSearchPage();
            else
            if (this.inFavoritiesListPage()){
                // lista anonsów
                // setTimeout(favoritiesListEngine.processFavoritiesListPage.bind(favoritiesListEngine), 500);
                favoritiesListEngine.processFavoritiesListPage();
            } else 
            if (this.inAnonsPage())
                anonsEngine.processAnonsPage();
            else
                debug.warn('Unmatched url: {}', window.location.href);
        } catch (e) {
            debug.always('Failed to process something: {}', e);
            throw e;
        }
    }
}

// main function
debug.info('rxa-hdn: {}', window.location);
if (forceHttps && window.location.protocol === 'http:'){
    window.location.replace(window.location.href.replace('http://', 'https://'));
    return ;
}
if (isUserJs){
    main.loadAndDispatch();
} else {
    document.addEventListener('DOMContentLoaded', main.loadAndDispatch.bind(main), false);
}

// http://pieroxy.net/blog/pages/lz-string/index.html
// https://github.com/pieroxy/lz-string/tree/master/libs

// Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
// This work is free. You can redistribute it and/or modify it
// under the terms of the WTFPL, Version 2
// For more information see LICENSE.txt or http://www.wtfpl.net/
//
// For more information, the home page:
// http://pieroxy.net/blog/pages/lz-string/testing.html
//
// LZ-based compression algorithm, version 1.4.4
var LZString = (function() {

// private property
var f = String.fromCharCode;
var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
var baseReverseDic = {};

function getBaseValue(alphabet, character) {
  if (!baseReverseDic[alphabet]) {
    baseReverseDic[alphabet] = {};
    for (var i=0 ; i<alphabet.length ; i++) {
      baseReverseDic[alphabet][alphabet.charAt(i)] = i;
    }
  }
  return baseReverseDic[alphabet][character];
}

var LZString = {
  compressToBase64 : function (input) {
    if (input == null) return "";
    var res = LZString._compress(input, 6, function(a){return keyStrBase64.charAt(a);});
    switch (res.length % 4) { // To produce valid Base64
    default: // When could this happen ?
    case 0 : return res;
    case 1 : return res+"===";
    case 2 : return res+"==";
    case 3 : return res+"=";
    }
  },

  decompressFromBase64 : function (input) {
    if (input == null) return "";
    if (input == "") return null;
    return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrBase64, input.charAt(index)); });
  },

  compressToUTF16 : function (input) {
    if (input == null) return "";
    return LZString._compress(input, 15, function(a){return f(a+32);}) + " ";
  },

  decompressFromUTF16: function (compressed) {
    if (compressed == null) return "";
    if (compressed == "") return null;
    return LZString._decompress(compressed.length, 16384, function(index) { return compressed.charCodeAt(index) - 32; });
  },

  //compress into uint8array (UCS-2 big endian format)
  compressToUint8Array: function (uncompressed) {
    var compressed = LZString.compress(uncompressed);
    var buf=new Uint8Array(compressed.length*2); // 2 bytes per character

    for (var i=0, TotalLen=compressed.length; i<TotalLen; i++) {
      var current_value = compressed.charCodeAt(i);
      buf[i*2] = current_value >>> 8;
      buf[i*2+1] = current_value % 256;
    }
    return buf;
  },

  //decompress from uint8array (UCS-2 big endian format)
  decompressFromUint8Array:function (compressed) {
    if (compressed===null || compressed===undefined){
        return LZString.decompress(compressed);
    } else {
        var buf=new Array(compressed.length/2); // 2 bytes per character
        for (var i=0, TotalLen=buf.length; i<TotalLen; i++) {
          buf[i]=compressed[i*2]*256+compressed[i*2+1];
        }

        var result = [];
        buf.forEach(function (c) {
          result.push(f(c));
        });
        return LZString.decompress(result.join(''));

    }

  },


  //compress into a string that is already URI encoded
  compressToEncodedURIComponent: function (input) {
    if (input == null) return "";
    return LZString._compress(input, 6, function(a){return keyStrUriSafe.charAt(a);});
  },

  //decompress from an output of compressToEncodedURIComponent
  decompressFromEncodedURIComponent:function (input) {
    if (input == null) return "";
    if (input == "") return null;
    input = input.replace(/ /g, "+");
    return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrUriSafe, input.charAt(index)); });
  },

  compress: function (uncompressed) {
    return LZString._compress(uncompressed, 16, function(a){return f(a);});
  },
  _compress: function (uncompressed, bitsPerChar, getCharFromInt) {
    if (uncompressed == null) return "";
    var i, value,
        context_dictionary= {},
        context_dictionaryToCreate= {},
        context_c="",
        context_wc="",
        context_w="",
        context_enlargeIn= 2, // Compensate for the first entry which should not count
        context_dictSize= 3,
        context_numBits= 2,
        context_data=[],
        context_data_val=0,
        context_data_position=0,
        ii;

    for (ii = 0; ii < uncompressed.length; ii += 1) {
      context_c = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)) {
        context_dictionary[context_c] = context_dictSize++;
        context_dictionaryToCreate[context_c] = true;
      }

      context_wc = context_w + context_c;
      if (Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)) {
        context_w = context_wc;
      } else {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
          if (context_w.charCodeAt(0)<256) {
            for (i=0 ; i<context_numBits ; i++) {
              context_data_val = (context_data_val << 1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
            }
            value = context_w.charCodeAt(0);
            for (i=0 ; i<8 ; i++) {
              context_data_val = (context_data_val << 1) | (value&1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          } else {
            value = 1;
            for (i=0 ; i<context_numBits ; i++) {
              context_data_val = (context_data_val << 1) | value;
              if (context_data_position ==bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = 0;
            }
            value = context_w.charCodeAt(0);
            for (i=0 ; i<16 ; i++) {
              context_data_val = (context_data_val << 1) | (value&1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i=0 ; i<context_numBits ; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }


        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        // Add wc to the dictionary.
        context_dictionary[context_wc] = context_dictSize++;
        context_w = String(context_c);
      }
    }

    // Output the code for w.
    if (context_w !== "") {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
        if (context_w.charCodeAt(0)<256) {
          for (i=0 ; i<context_numBits ; i++) {
            context_data_val = (context_data_val << 1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
          }
          value = context_w.charCodeAt(0);
          for (i=0 ; i<8 ; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        } else {
          value = 1;
          for (i=0 ; i<context_numBits ; i++) {
            context_data_val = (context_data_val << 1) | value;
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = 0;
          }
          value = context_w.charCodeAt(0);
          for (i=0 ; i<16 ; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (i=0 ; i<context_numBits ; i++) {
          context_data_val = (context_data_val << 1) | (value&1);
          if (context_data_position == bitsPerChar-1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }


      }
      context_enlargeIn--;
      if (context_enlargeIn == 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits++;
      }
    }

    // Mark the end of the stream
    value = 2;
    for (i=0 ; i<context_numBits ; i++) {
      context_data_val = (context_data_val << 1) | (value&1);
      if (context_data_position == bitsPerChar-1) {
        context_data_position = 0;
        context_data.push(getCharFromInt(context_data_val));
        context_data_val = 0;
      } else {
        context_data_position++;
      }
      value = value >> 1;
    }

    // Flush the last char
    while (true) {
      context_data_val = (context_data_val << 1);
      if (context_data_position == bitsPerChar-1) {
        context_data.push(getCharFromInt(context_data_val));
        break;
      }
      else context_data_position++;
    }
    return context_data.join('');
  },

  decompress: function (compressed) {
    if (compressed == null) return "";
    if (compressed == "") return null;
    return LZString._decompress(compressed.length, 32768, function(index) { return compressed.charCodeAt(index); });
  },

  _decompress: function (length, resetValue, getNextValue) {
    var dictionary = [],
        next,
        enlargeIn = 4,
        dictSize = 4,
        numBits = 3,
        entry = "",
        result = [],
        i,
        w,
        bits, resb, maxpower, power,
        c,
        data = {val:getNextValue(0), position:resetValue, index:1};

    for (i = 0; i < 3; i += 1) {
      dictionary[i] = i;
    }

    bits = 0;
    maxpower = Math.pow(2,2);
    power=1;
    while (power!=maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position == 0) {
        data.position = resetValue;
        data.val = getNextValue(data.index++);
      }
      bits |= (resb>0 ? 1 : 0) * power;
      power <<= 1;
    }

    switch (next = bits) {
      case 0:
          bits = 0;
          maxpower = Math.pow(2,8);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
        c = f(bits);
        break;
      case 1:
          bits = 0;
          maxpower = Math.pow(2,16);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
        c = f(bits);
        break;
      case 2:
        return "";
    }
    dictionary[3] = c;
    w = c;
    result.push(c);
    while (true) {
      if (data.index > length) {
        return "";
      }

      bits = 0;
      maxpower = Math.pow(2,numBits);
      power=1;
      while (power!=maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position == 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb>0 ? 1 : 0) * power;
        power <<= 1;
      }

      switch (c = bits) {
        case 0:
          bits = 0;
          maxpower = Math.pow(2,8);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }

          dictionary[dictSize++] = f(bits);
          c = dictSize-1;
          enlargeIn--;
          break;
        case 1:
          bits = 0;
          maxpower = Math.pow(2,16);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = f(bits);
          c = dictSize-1;
          enlargeIn--;
          break;
        case 2:
          return result.join('');
      }

      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

      if (dictionary[c]) {
        entry = dictionary[c];
      } else {
        if (c === dictSize) {
          entry = w + w.charAt(0);
        } else {
          return null;
        }
      }
      result.push(entry);

      // Add w+entry[0] to the dictionary.
      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn--;

      w = entry;

      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

    }
  }
};
  return LZString;
})();

})();