// ==UserScript==
// @name           roksahidden_zwei
// @namespace      roksahdn
// @description    filtr ukrywający nie interesujące nas ogłoszenia z listy ulubionych
// @version        10.1.3
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
// @resource       dexie https://unpkg.com/dexie@3.0.2/dist/dexie.js
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

// jeżeli true, i wyszukiwanie po nr telefonu, to zwraca także historyczne ogłoszenia dla tego numeru
var enableExtendedSearchByPhone = true;

//-----------------------------------------------------------
// czy przeładować strony http na https?
var forceHttps = true;

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
    'div.roxahidden_extra_group > div { clear: both; }',
    'div.roksahidden_tooltip_2 { white-space: pre; height: 197px; line-height: 110%; overflow-x: hidden; border: 2px solid #bfa7d1; padding: 4px; }',
    'div.roksahidden_tooltip_2 a { color: black; }',
    'div.roksahidden_tooltip_wrapper { padding-top: 1px; }',
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

        this.myElements.forEach((e2) => {
            dom.applyTargetClass(e2, targetClass);
        });
        this.mySwitchers.forEach((e2, idx) => {
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
        var idToElem = new Map();
        var idToNotatka = new Map();
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
            idToElem.set(id, elem);
            var itemResult = {'doHide': false, 'reason': ''};
            var form = dom.getNode(".//form[contains(@class, 'user_note_form')]", elem);
            var city = dom.getElemText(".//div[@class='favourites_content_list'][1]", elem);

            var txt = '';
            favoritiesEngine.isAnonsCityOkImpl(city, itemResult);
            if (form !== null){
                txt = dom.getElemText(".//textarea[contains(@class, 'user_note_tresc')]", form);
                favoritiesEngine.isNotatkaTextOkImpl(txt, itemResult);
                var submitListener = new function(){
                    this.id = id;
                    this.city = city;
                    this.form = form;
                    this.elem = elem;
                    this.handleEvent = async function(evt){
                        var txt2 = dom.getElemText(".//textarea[contains(@class, 'user_note_tresc')]", this.form);
                        favoritiesEngine.updateIdToHide(this.id, this.city, txt2); // async
                        commonUtils.saveNote(this.id, txt2); // async
                        favoritiesListEngine.validatePhoneNo(this.elem, txt2);
                    }
                };
                idToNotatka.set(id, txt);
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

            if (enableExtendedSearchByPhone && txt !== ''){

                const cache = {}

                const title = dom.getElemText(".//div[@class='favourites_name']", elem)
                cache.title = title

                const thumbImg = dom.getNodeByCss('div.favourites_box_image img', elem)
                if (thumbImg !== null) {
                    cache.thumb = [ thumbImg.getAttribute('src') ]
                    cache.thumbIdx = 0
                }

                let txt2 = txt
                const telNode = dom.getNodeByCss('.dane_anonsu_tel', elem)
                if (telNode != null) {
                    let telElements
                    if ((telElements = /([5678][0-9]{2})[ -]([0-9]{3})[ -]([0-9]{3})/g .exec(telNode.innerText)) !== null){
                        txt2 = txt2 + '\n' + telElements.splice(1).join('-')
                    }
                }

                // async
                indexEngine.indexPhoneNos(id, txt2, cache, (oldCache, newCache) => {
                    if (typeof oldCache.thumb === 'string' || typeof oldCache.thumb === 'undefined') {
                        // stary cache starego typu, lub brak informacji
                        return newCache
                    }
                    if (typeof newCache.thumb === 'undefined') {
                        // w nowym brak informacji, a w starym jest - skopiuj ze starego
                        if (typeof oldCache.thumb !== 'undefined') {
                            newCache.thumb = oldCache.thumb
                            newCache.thumbIdx = oldCache.thumbIdx
                        }
                        return newCache
                    }
                    const idx = oldCache.thumb.indexOf(newCache.thumb[0])
                    if (idx === -1) {
                        // w starym na liście brak tego obrazka - użyj nowego
                        return newCache
                    }

                    // w starym na liście jest ten obrazek, zaktualizuj tylko na której jest pozycji
                    newCache.thumbIdx = idx
                    newCache.thumb = oldCache.thumb
                    return newCache
                })
            }
        }

        commonUtils.saveIdsToHide(myIdsToHide); // async
        commonUtils.registerNoteChangeEvent((id, newNote) => {
            var elem = idToElem.get(id);
            if (!elem){
                return ;
            }
            this.validatePhoneNo(elem, newNote);
            var textarea = dom.getNode(".//textarea[contains(@class, 'user_note_tresc')]", elem);
            textarea.value = newNote;
        });

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
            var elem = idToElem.get(id);
            if (targetClass !== null && doHide){
                dom.applyTargetClass(elem, targetClass);
            }
            this.linkifyTelNo(elem, id);
            var txt = idToNotatka.get(id);
            if (typeof txt === 'string'){
                this.validatePhoneNo(elem, txt, id);
                commonUtils.saveNote(id, txt); // async
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

    this.processFavoritiesListPage = async function() {
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

    this.updateIdToHide = async function(id, city, txt){
        var itemResult = {'doHide': false, 'reason': ''};
        this.isAnonsCityOkImpl(city, itemResult);
        this.isNotatkaTextOkImpl(txt, itemResult);

        var log = 'Item {} updated --> hide = {}, {}';
        if (debug.isTraceEnabled()) log += '; {}; {}';
        debug.info(log, id, itemResult.doHide, itemResult.reason, city, txt);
        var myIdsToHide = {};
        myIdsToHide[id] = itemResult.doHide ? 1 : 0;
        await commonUtils.saveIdsToHide(myIdsToHide)
    }
}

var searchListEngine = new function() {
    this.mode = 2;
    this.isByPhoneSearch = false
    this.withNotesOnly = false
    this.processSearchPage = async function()
    {
        debug.info('------------------------------------------------');
        this.loadCss2();
        this.sortAnonseById();
        this.isByPhoneSearch = window.location.href.match(/nr_tel=[0-9]{3,}/) !== null;
        var mode = commonUtils.getCssModeForSearch();
        if (this.isByPhoneSearch && (mode === 0 || mode >= 3))
            mode = 1;
        this.withNotesOnly = !this.isByPhoneSearch && commonUtils.getWithNotesOnly();
        if (this.withNotesOnly && mode === 3){
            mode = commonUtils.getPrevCssMode();
        }
        this.mode = mode;
        this.loadAnonseData();
        await this.processSearchResults(mode, this.withNotesOnly);
        if (showSearchSwitchBox)
            this.createSearchSwitchBox(mode, this.isByPhoneSearch, this.withNotesOnly);
        if (this.isByPhoneSearch && this.allAnonseUrls.length > 1)
            this.addParsedLinks();

        if (enableExtendedSearchByPhone && this.isByPhoneSearch) {
            await this.loadExtendedSearchData();
        }
    }

    this.loadExtendedSearchData = async function() {
        const telNo = window.location.href.match(/nr_tel=([0-9]{3})[-+]?([0-9]{3})[-+]?([0-9]{3})/).slice(1).join('-')
        const anonse = await indexEngine.getAnonsDataByPhoneNo(telNo)
        if (anonse === null || anonse.length === 0) {
            return
        }
        const anonseMap = new Map()
        for (const anons of anonse) {
            anonseMap.set(anons.id, anons)
        }
        for (const id of this.idToElem.keys()) {
            anonseMap.delete(id)
        }
        if (anonseMap.size === 0) {
            return
        }
        debug.info('Found extra {} ids for tel no {}', anonseMap.size, telNo)

        const header = dom.createElem('h2', {}, 'Pozostałe ogłoszenia dla numeru ' + telNo)
        const oldGroup = dom.getNodeByCss('div.search_result') || dom.getNodeByCss('.main_error_text')
        const newGroup = dom.createElem('div', {'class':'roxahidden_extra_group'})
        for (let anons of anonseMap.values()) {
            const item = await this.createItemFromId(anons.id, anons.cache)
            newGroup.appendChild(item)
        }
        oldGroup.parentNode.appendChild(header)
        oldGroup.parentNode.appendChild(newGroup)

        // TODO: lista linków do skopiowania
    }

    this.createItemFromId = async function(id, cache) {
        const title = cache.title
        const imgSrc = typeof cache.thumbIdx !== 'undefined' ? (cache.thumb[cache.thumbIdx] || cache.thumb) : cache.thumb
        const note = await commonUtils.getNote(id)

        const template =
            '<div><a><div class="random_item"><img><div class="podpis nowrap nazwa"></div><div class="podpis nowrap id"></div></div></a>' +
            '<div class="roksahidden_tooltip_wrapper"><div class="roksahidden_tooltip_2"></div></div></div>'
        let doc = new DOMParser().parseFromString(template, 'text/html')
        dom.getNodeByCss('a', doc).setAttribute('href', '/pl/anonse/pokaz/' + id)
        if (imgSrc){
            const imgElem = dom.getNodeByCss('img', doc)
            imgElem.setAttribute('src', imgSrc.replace('/mini/', '/mini2/'))
            const imgErrListener = function(){
                imgElem.removeEventListener('error', imgErrListener, false)
                imgElem.setAttribute('src', imgSrc)
            }
            imgElem.addEventListener('error', imgErrListener, false)
        }
        const nazwaElem = dom.getNodeByCss('.nazwa', doc)
        nazwaElem.innerText = title
        nazwaElem.setAttribute('title', title)
        dom.getNodeByCss('.id', doc).innerText = id
        const noteElem = dom.getNodeByCss('.roksahidden_tooltip_2', doc)
        noteElem.innerText = note
        anonsEngine.linkifyNotes(noteElem)

        return doc.querySelector('body *')
    }

    /** Sortuje anonse po id na liście wyników wyszukiwania */
    this.sortAnonseById = function(){
        let xp = dom.getNodes("//div[@id='anons_group']/a");
        let extractIdPattern = /\/([0-9]+)$/g;
        let itemsArr = [];
        let itemsMap = new Map();
        debug.debug('Sorting anonse by id');
        for (let i=0; i<xp.snapshotLength; i++){
            let elem = xp.snapshotItem(i);
            let href = elem.getAttribute('href');
            debug.debug('found anons {}', href);
            extractIdPattern.lastIndex = 0;
            let id = extractIdPattern.exec(href);
            if (id !== null){
                id = id[1]
                itemsMap.set(id, elem);
                itemsArr.push(id);
            }
        }
        commonUtils.sortNum(itemsArr);
        itemsArr.reverse();
        for (const id of itemsArr){
            let elem = itemsMap.get(id);
            let par = elem.parentNode;
            par.insertBefore(elem, par.firstChild);
        }
    }

    /**
       @param mode 0 - ukryj ukryte
                   1 - wyszarz
                   2 - pokaż wszystkie
                   3 - pokaż tylko bez notatek (potencjalnie nowe)
       @param withNotesOnly ukrywa te bez notatek
     */
    this.processSearchResults = async function(mode, withNotesOnly) {
        debug.info('process search, mode: {}, withNotesOnly: {}', mode, withNotesOnly);
        const idsToHide = await commonUtils.getIdsToHide() || {};
        const allIds = this.idToElem.keys();
        debug.info('search filter, start: {}', this.idToElem.size);
        let count = 0;
        const withNotesCache = new Set()
        for (const id of allIds) {
            const elem = this.idToElem.get(id);
            debug.debug('processing anons id {}', id);
            const cssClass = await this.getTargetCssClass(mode, id, idsToHide, withNotesOnly, withNotesCache);
            dom.applyTargetClass(elem, cssClass);
            if (cssClass){
                count++;
            }
            debug.debug('{} --> cssClass: {}', id, cssClass);
        }
        debug.info('process search hide {} out of {} items', count, this.idToElem.size);
    }
    this.idToElem = null;

    this.loadAnonseData = function(){
        // TODO: informacja o tym, czy jakieś ogłoszenia zostały wycięte przez filtr "ukryte ogłoszenia" roksy
        var xp = dom.getNodes("//div[@id='anons_group']/a");
        debug.info('search list, start: {}', xp.snapshotLength);
        var count = 0;
        var extractIdPattern = /\/([0-9]+)$/g;
        this.idToElem = new Map();
        var idToHref = new Map();
        var allIds = [];
        for (var i=0; i<xp.snapshotLength; i++){
            var elem = xp.snapshotItem(i);
            var href = elem.getAttribute('href');
            debug.debug('found anons {}', href);
            extractIdPattern.lastIndex = 0;
            var id = extractIdPattern.exec(href);
            if (id !== null){
                id = id[1];
                this.idToElem.set(id, elem);
                idToHref[id] = href;
                allIds.push(id);
                this.updateNotes(elem, id); // asynch
            } else {
                debug.warn('Can not extract id from href: {}', href);
            }
        }
        commonUtils.registerNoteChangeEvent(this._noteChangeEventSubscriber.bind(this));
        commonUtils.registerNotesHideChanges(this._noteHideEventSubscriber.bind(this));
        commonUtils.sortNum(allIds);
        for (const id of allIds) {
            this.allAnonseUrls.push(this.resolveRelative(idToHref[id]));
        }
    }

    this._noteChangeEventSubscriber = async function(id,newNote) {
        var elem = this.idToElem.get(id);
        if (elem){
            debug.debug('Updating note id {} callback', id);
            if (showNotesInSearch){
                this.updateNotes(elem, id, newNote);
            }
            var idsToHide = await commonUtils.getIdsToHide() || {};
            var cssClass = await this.getTargetCssClass(this.mode, id, idsToHide, this.withNotesOnly);
            dom.applyTargetClass(elem, cssClass);
        }
    }

    this._noteHideEventSubscriber = async function(idsToHide) {
        debug.debug('Updating ids to hide from callback');
        const withNotesCache = new Set()
        for (const id of this.idToElem.keys()){
            const cssClass = await this.getTargetCssClass(this.mode, id, idsToHide, this.withNotesOnly, withNotesCache);
            const elem = this.idToElem.get(id);
            dom.applyTargetClass(elem, cssClass);
        }
    }

    /** Czy dany anons powinien zostać ukryty */
    this.getTargetCssClass = async function(mode, id, idsToHide, withNotesOnly, withNotesCache){
        const hasNote = async function(id){
            if (!withNotesCache) {
                return await commonUtils.hasNote(id)
            }
            if (withNotesCache.size === 0) {
                const allWithNotes = await commonUtils.getAllWithNotes()
                for(const id2 of allWithNotes){
                    withNotesCache.add(id2)
                }
            }
            return withNotesCache.has(id)
        }
        if (mode === 3){
            // tylko-bez-notatek
            return await hasNote(id) ? 'roksahidden_search_hide' : '';
        }
        // TODO: to jest nieładnie tu wywoływana funkcja...
        if (withNotesOnly && !await hasNote(id)){
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
    this.switchClass = async function(mode){
        if (mode === 3 && this.withNotesOnly){
            // wyłączam tryb tylko-z-notatkami
            this.withNotesOnly = false;
            dom.applyTargetClass(this.myOnlyWithNotesSwitch, '');
        }
        await this.processSearchResults(mode, this.withNotesOnly && !this.isByPhoneSearch);
        this.mySwitchers.forEach((e2, idx) => {
            dom.applyTargetClass(e2, idx === mode ? 'roksahidden_active' : '');
        });
        commonUtils.setCssModeForSearch(mode);
        commonUtils.setWithNotesOnly(this.withNotesOnly);
        this.mode = mode;
        return false;
    }
    this.switchWithNotesOnly = async function(){
        var withNotesOnly = this.myOnlyWithNotesSwitch.className.indexOf('roksahidden_active') === -1;
        if (withNotesOnly && this.mode === 3){
            // włączam tylko z notatkami, wyłączam tylko-bez-notatek
            this.mode = commonUtils.getPrevCssMode();
        }
        await this.processSearchResults(this.mode, withNotesOnly);
        dom.applyTargetClass(this.myOnlyWithNotesSwitch, withNotesOnly ? 'roksahidden_active' : '');
        this.mySwitchers.forEach((e2, idx) => {
            dom.applyTargetClass(e2, idx === this.mode ? 'roksahidden_active' : '');
        });
        commonUtils.setCssModeForSearch(this.mode);
        commonUtils.setWithNotesOnly(withNotesOnly);
        this.withNotesOnly = withNotesOnly
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
    this.updateNotes = async function(elem, id, itemNotes){
        if (!showNotesInSearch){
            return ;
        }
        itemNotes = itemNotes || await commonUtils.getNote(id);
        var tooltipNotes = dom.getNode(".//div[@class='tooltip_content']/div[@class='roksahidden_tooltip']", elem);
        if (itemNotes !== null){
            if (tooltipNotes === null){
                var tooltipElem = dom.getNode(".//div[@class='tooltip_content']", elem);
                tooltipNotes = dom.createElem('div', {'class':'roksahidden_tooltip'}, itemNotes);
                tooltipElem.appendChild(tooltipNotes);
            } else {
                tooltipNotes.textContent = itemNotes;
            }
            let orgNotatka = dom.getNodeByCss('div.notatka_group_content', elem)
            if (orgNotatka) {
                orgNotatka = orgNotatka.parentNode
                orgNotatka.parentNode.removeChild(orgNotatka)
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
    this.addParsedLinks = function(){
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
        if (parent !== null){
            parent.insertBefore(xp, parent.firstChild)
        }
    }
}

var anonsEngine = new function() {
    this.processAnonsPage = async function(){
        dom.loadCss(cssForAnons);
        this.processMainPhoneNumber();
        var notatka = document.getElementById('notatka_content');
        if (notatka === null){
            debug.warn('No element with id notatka_content');
            return ;
        }
        favoritiesEngine.init();
        const txt = notatka.innerText.trim()
        if (txt !== ''){
            this.validatePhoneNo(notatka);
            this.linkifyNotes(notatka);
            this.updateStoredNote(notatka); // async
            this.updateNotatkaIndex(notatka) // async
        }
        this.hookNotatkaChanged(notatka);
        this.hookNotatkaLinkClick(notatka)
    }
    this.hookNotatkaChanged = function(notatka){
        // Callback function to execute when mutations are observed
        const callback = (mutationsList, observer) => {
            // Use traditional 'for loops' for IE 11
            for(let mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.target === notatka){
                    this.updateStoredNote(notatka);
                    this.validatePhoneNo(notatka);
                    this.linkifyNotes(notatka); // todo: obsługa innych funkcjonalności
                    this.updateNotatkaIndex(notatka)
                    break;
                }
            }
            observer.takeRecords();
        }

        // Create an observer instance linked to the callback function
        const observer = new MutationObserver(callback);

        // Options for the observer (which mutations to observe)
        const config = { attributes: false, childList: true, subtree: false };
        // Start observing the target node for configured mutations
        observer.observe(notatka, config);
    }
    this.hookNotatkaLinkClick = function(notatka){
        const processLinkClicked = function(href){
            let sel = 'a[href="' + href + '"]';
            if (href.includes('.roksa.pl/')) {
                const extractIdPattern = /[\/=]([0-9]+)$/g;
                const id = extractIdPattern.exec(href);
                if (id !== null){
                    sel = sel + ', a[href$="/' + id[1] + '"][href*=".roksa.pl/"]';
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
        lcc.onmessage = (ev) => processLinkClicked(ev.data);
    }
    this.updateNotatkaIndex = async function(notatka){
        if (!enableExtendedSearchByPhone) {
            return
        }
        const id = this.extractId()
        const phoneNo = this.extractMainPhoneNo()
        const txt = notatka.innerText.trim()

        const cache = {}

        const title = dom.getNodeByCss('#anons_header h2.next_header')
        if (title !== null) {
            cache.title = new DOMParser().parseFromString(title.innerHTML, 'text/html').documentElement.innerText.trim()
        }

        // TODO: pobrać listę
        const thumbs = dom.getNodesByCss('ul.galeria-thumb-list li a img')
        if (thumbs.length !== 0) {
            cache.thumb = thumbs.map(thumb => thumb.getAttribute('src'))
            cache.thumbIdx = 0
        }

        await indexEngine.indexPhoneNos(id, txt + '\n' + phoneNo, cache, (oldCache, newCache) => {
            if (typeof oldCache.thumb === 'string' || typeof oldCache.thumb === 'undefined' || typeof oldCache.thumbIdx === 'undefined') {
                // stary cache starego typu, lub brak informacji
                return newCache
            }
            if (typeof newCache.thumb === 'undefined') {
                // w nowym brak informacji, a w starym jest - skopiuj ze starego
                if (typeof oldCache.thumb !== 'undefined') {
                    newCache.thumb = oldCache.thumb
                    newCache.thumbIdx = oldCache.thumbIdx
                }
                return newCache
            }

            // na naszej liście szukamy obrazka, który jest obecnie miniaturką
            const oldThumbSrc = oldCache.thumb[oldCache.thumbIdx]
            const idx = newCache.thumb.indexOf(oldThumbSrc)
            if (idx !== -1) {
                // na obecnej liście jest ten obrazek, tylko aktualizuję id
                newCache.thumbIdx = idx
            }

            return newCache
        })
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
        var exprTel = /[5678][0-9]{2}[ -][0-9]{3}[ -][0-9]{3}/g;
        var expr = /(https?:\/\/[^ <\n\r\t]+)|([5678][0-9]{2}[ -][0-9]{3}[ -][0-9]{3})/g;
        var processor = (linkValue) => {
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
        }
        dom.traverseChildNodes(notatka, function(node){
            dom.splitNode(node, expr, processor);
        });
    }

    this.linkifyTel = function(tel){
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

    this.processMainPhoneNumber = function() {
        var telNode = dom.getNodeByCss("span.dane_anonsu_tel");
        if (telNode === null){
            debug.warn('Can not find phone number node');
            return ;
        }
        let providers = linkifyAnonsTel.slice(0);
        providers.reverse();
        commonUtils.processPhoneNumber(telNode, providers, this.extractId());
    }

    this.mainPhoneNo = ''
    this.extractMainPhoneNo = function() {
        if (this.mainPhoneNo.length > 0) {
            return this.mainPhoneNo
        }
        const telNode = dom.getNode("//span[contains(@class, 'dane_anonsu_tel')]")
        if (telNode === null){
            return
        }
        let telElements
        if ((telElements = /([5678][0-9]{2})[ -]([0-9]{3})[ -]([0-9]{3})/g .exec(telNode.innerText)) === null){
            return
        }
        return this.mainPhoneNo = telElements.splice(1).join('-')
    }

    this.updateStoredNote = function(notatka)
    {
        var txt = notatka.innerText.trim();
        var id = this.extractId();
        commonUtils.saveNote(id, txt); // asynch
        favoritiesEngine.updateIdToHide(id, this.extractCity(), txt); // asynch
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

var indexEngine = new function() {

    /**
     * Indeksuje numery telefony w podanym ogłoszeniu
     * @param id id ogłoszenia
     * @param text Treść do zaindeksowania - wyszukana numerów telefonów
     * @param cache Dodatkowe dane do zapisania wraz z ogłoszeniem
     * @param cacheMergeFunction(oldCache, newCache) Funkcja, która ma zwrócić nowy cache na podstawie starego
     */
    this.indexPhoneNos = async function(id, text, cache, cacheMergeFunction) {
        // TODO: tu by się przydało jeszcze coś takiego, że jeżeli to jest ekstra numer telefonu, i nie ma go w notatkach,
        // to zapisujemy go osobno, żeby nam nie uciekł -> przydatne z listy ulubionych, gdy DIVy zmieniają nr jak rękawiczki
        const expr = /[5678][0-9]{2}-[0-9]{3}-[0-9]{3}/g
        const byPhone = new Set()

        const textLines = text.match(/[^\n\r]+/g)
        for (const line of textLines) {
            expr.lastIndex = 0
            let match = expr.exec(line)
            while (match !== null){
                const phone = match[0].replace(/-/g, '')
                byPhone.add(phone)
                match = expr.exec(line)
            }
        }

        // posortowana tablica nr telefonów w tym ogłoszeniu
        const byPhone2 = [...byPhone.keys()]
        commonUtils.sortNum(byPhone2)

        // TODO: jakiś cache lepszy, bo np. miniaturki na liście wyszukiwania są inne, niż pierwsza w liście zdjęć
        // cache merge function
        // i teraz take
        // na liście anonsów mamy jeden
        // i jeżeli jest w liście w cache, to nic nie ruszamy
        // tylko ustawiamy ew indeks

        let prevHint = null
        if (!cache || !cacheMergeFunction || (prevHint = await database.getSearchHint(id)) === null){
            await database.saveSearchHint(id, byPhone2, cache || {})
            return
        }

        const mergedCache = cacheMergeFunction(prevHint.cache, cache)
        await database.saveSearchHint(id, byPhone2, mergedCache || {})
    }

    /**
     * Zwraca listę ogłoszeń, dla których zaindeksowano podany numer telefonu, lub null, jeżeli takich brak
     * @param phoneNo Nr telefonu
     * @return tablica obiektów, klucze obiektów: id, cache
     */
    this.getAnonsDataByPhoneNo = async function(phoneNo) {
        const keyByPhone = phoneNo.replace(/[^0-9]/g, '')
        const result = await database.querySearchHints(keyByPhone)
        return result && result.length > 0 ? result : null
    }
}
// ----------------------------------- UTILS -----------------------------------

var commonUtils = new function(){

    this.storage = window.localStorage;

    this.noteChangedChannel = new BroadcastChannel('NoteChangedChannel');
    this.idsToHideChangedChannel = new BroadcastChannel('idsToHideChangedChannel');

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

    /**
     * Pobiera id ogłoszeń do ukrycia
     * @return obiekt, w którym klucze to id, a wartości to zawsze 1
     */
    this.getIdsToHide = async function() {
        const idsToHide = await database.getIdsToHide()
        const result = {}
        for (const id of idsToHide) {
            result[id] = 1
        }
        return result
    }

    /**
     * Zapisuje id ogłoszeń do ukrycia
     * @param idsToHide obiekt, w którym klucze to id, a wartości to flaga, czy ukryć, czy nie
     */
    this.saveIdsToHide = async function(idsToHide) {
        const countIdsToHide1 = await database.countIdsToHide()
        const toHide = []
        const toShow = []
        Object.keys(idsToHide).forEach(id => (idsToHide[id] ? toHide : toShow).push(id))
        await database.setIdsToHide(toHide)
        await database.removeIdsToHide(toShow)
        const countIdsToHide2 = await database.countIdsToHide()
        if (countIdsToHide1 !== countIdsToHide2){
            debug.info('Saved ad ids to hide, count {}', countIdsToHide2)
            const idsToHide2 = await this.getIdsToHide()
            debug.debug('items: {}', () => Object.keys(idsToHide2).join());
            this.idsToHideChangedChannel.postMessage(idsToHide2)
        } else {
            debug.info('No ad ids changed');
        }
    }

    /** Zapisuje notatkę, i jeżeli się zmieniła, rozgłasza zdarzenie */
    this.saveNote = async function(id, note){
        if (showNotesInSearch === false) return ;
        if (note === null || note.length === 0){
            await database.removeNote(id)
            debug.debug('Note for id {} has been deleted', id);
            return ;
        }
        note = note.replace(/[\r\n]+/g,'\n');
        const oldNote = await this.getNote(id)
        if (oldNote === null || note !== oldNote){
            await database.saveNote(id, note)
            this.noteChangedChannel.postMessage({id: id, note: note})
            debug.debug('Note for id {} has been updated', id);
        }
    }

    /** Zwraca treść notatki, lub null */
    this.getNote = async function(id){
        const note = await database.getNote(id)
        return note
    }

    /** Zwraca informację, czy istnieje notatka dla tego anonsu */
    this.hasNote = async function(id){
        return await database.hasNote(id)
    }

    /** Zwraca listę wszystkich id ogłoszeń, które mają notatki */
    this.getAllWithNotes = async function(){
        return await database.getAllWithNotes()
    }

    /**
     * Rejestruje powiadomienie o zmianie treści notatki
     * @param callback(anonsId, newNote)
     */
    this.registerNoteChangeEvent = function(callback){
        this.noteChangedChannel.addEventListener('message', (event) => {
            // TODO: czy tutaj nie trzeba filtrować własnych eventów?
            callback.call(this, event.data.id, event.data.note)
        })
    }

    /**
     * Rejestruje powiadomienie o zmianie ukrywanych ogłoszeń
     * @param callback(obj), gdzie klucze w obiekcie to id ogłoszeń
     */
    this.registerNotesHideChanges = function(callback){
        this.idsToHideChangedChannel.addEventListener('message', (event) => {
            // TODO: czy tutaj nie trzeba filtrować własnych eventów?
            callback.call(this, event.data)
        })
    }

    this.sortNum = function(array){
        array.sort(function(a, b){return parseInt(a)-parseInt(b);});
    }

    this.deepEquals = function(x, y) {
        if (x === y) {
            return true
        }
        if (x !== null && y !== null && typeof x === "object" && typeof y === "object") {
            const xKeys = Object.keys(x)
            if (xKeys.length != Object.keys(y).length)
                return false

            for (let i = 0; i < xKeys.length; i++) {
                const prop = xKeys[i]
                if (!y.hasOwnProperty(prop) || !this.deepEquals(x[prop], y[prop])) {
                    return false
                }
            }
            return true
        }
        return false
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
        var expr = /[5678][0-9]{2}[ -][0-9]{3}[ -][0-9]{3}/g;
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
        var expr = /(?:^|[^0-9])([5678][0-9]{2}[ -][0-9]{3}[ -][0-9]{3})/g;
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

    this.processPhoneNumber = function(telNode, providers, id, wrapper) {
        if (telNode === null){
            return ;
        }
        var expr = /([5678][0-9]{2})[ -]([0-9]{3})[ -]([0-9]{3})/g;
        var telElements;
        if ((telElements = expr.exec(telNode.innerText)) === null){
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

var database = new function(){
    this.db = null
    this.init = function(){
        this.db = new Dexie("roxahidden");
        this.db.version(1).stores({
            searchHints: 'id, *telefony',
            notes: 'id',
            hiddenState: 'id'
        });
        return this.db.open().catch (function (err) {
            debug.always('Failed to open db: {}', err);
        })
    }

    /** Zwraca treść notatki lub null */
    this.getNote = async function(id){
        const note = await this.db.notes.get(id)
        return note ? note.note : null
    }
    this.hasNote = async function(id){
        const hasNote = await this.db.notes.where('id').equals(id).count()
        return hasNote > 0
    }
    /** Zwraca tablicę id ogłoszeń z notatkami */
    this.getAllWithNotes = async function(){
        return await this.db.notes.toCollection().keys()
    }
    this.saveNote = async function(id, note){
        await this.db.notes.put({id: id, note:note})
    }
    this.removeNote = async function(id){
        await this.db.notes.where('id').equals(id).delete()
    }

    /** Zwraca tablicę z id ogłoszeń do ukrycia */
    this.getIdsToHide = async function() {
        return await this.db.hiddenState.toCollection().keys()
    }

    this.countIdsToHide = async function() {
        return await this.db.hiddenState.count()
    }

    /**
     * Zaznacza wybrane ogłoszenia, że są do ukrycia
     * @param ids tablica id ogłoszeń
     */
    this.setIdsToHide = async function(ids) {
        if (ids.length === 0) {
            return
        }
        const idsAsObjects = ids.map(id => { return { id: id } })
        await this.db.hiddenState.bulkPut(idsAsObjects)
    }

    /**
     * Zaznacza wybrane ogłoszenia, że mają być pokazywane
     * @param ids tablica id ogłoszeń
     */
    this.removeIdsToHide = async function(ids) {
        if (ids.length === 0) {
            return
        }
        await this.db.hiddenState.bulkDelete(ids)
    }

    /**
     * Zwraca listę anonsów, które spełniają kryteria wyszukiwania po nr telefonu
     * @param phoneNo
     * @return
     */
    this.querySearchHints = async function(phoneNo) {
        return await this.db.searchHints
            .where('telefony')
            .equals(phoneNo)
            .toArray()
    }

    /**
     * Zwraca dane anonsu do kryteriów wyszukiwania
     * @param id
     * @return
     */
    this.getSearchHint = async function(id) {
        const obj = await this.db.searchHints.get(id)
        return obj ? obj : null
    }

    /**
     * Zapisuje dane anonsu do wyszukiwania
     * @param id identyfikator anonsu
     * @param telefony posortowana tablica z numerami telefonów skojarzonych z anonsem
     * @param cache inne dodatkowe dane do zapisania
     */
    this.saveSearchHint = async function(id, telefony, cache) {
        const obj = {
            id: id,
            telefony: telefony,
            cache: cache
        }
        const prev = await this.db.searchHints.get(id)
        if (!commonUtils.deepEquals(obj, prev)) {
            await this.db.searchHints.put(obj)
            if (typeof prev === 'undefined'){
                debug.debug('Added search hint for id {}', id)
            } else {
                debug.debug('Updated search hint for id {}', id)
            }
        }
    }

    /**
     * Usuwa dane anonsu z wyników wyszukiwania
     */
    this.removeSearchHint = async function(id) {
        await this.db.searchHints.where('id').equals(id).delete()
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
    this.loadAndDispatch = async function(){
        debug.info('loadAndDispatch - start')
        const startTime = performance.now()
        try {
            this.init();
            await database.init()
            if (this.inSearchPage())
                // wyszukiwanie
                await searchListEngine.processSearchPage();
            else
            if (this.inFavoritiesListPage()){
                // lista anonsów
                // setTimeout(favoritiesListEngine.processFavoritiesListPage.bind(favoritiesListEngine), 500);
                await favoritiesListEngine.processFavoritiesListPage();
            } else
            if (this.inAnonsPage())
                await anonsEngine.processAnonsPage();
            else
                debug.warn('Unmatched url: {}', window.location.href);
            debug.info('loadAndDispatch - end, took {} ms', (performance.now()-startTime))
        } catch (e) {
            debug.always('Failed to process something, took {} ms: {}', (performance.now()-startTime), e);
            // throw e;
        }
    }

    this.waitForDexie = function(){
        if (typeof Dexie !== 'undefined') {
            return Promise.resolve()
        }
        const start = performance.now()
        return new Promise( (resolve, reject) => {
            const timer = window.setInterval(() => {
                if (typeof Dexie !== 'undefined') {
                    window.clearInterval(timer)
                    resolve()
                } else
                if (performance.now() - start > 30000) {
                    window.clearInterval(timer)
                    reject('timeout while waiting for Dexie')
                }
            }, 50)
        })
    }
}

// main function
debug.info('rxa-hdn: {}, {}', window.location, document.readyState);

if (forceHttps && window.location.protocol === 'http:'){
    window.location.replace(window.location.href.replace('http://', 'https://'));
    return ;
}

window.addEventListener('error', function(event) { debug.always('Error in JS: {}', event) })

const start = () => main.waitForDexie().then(main.loadAndDispatch.bind(main)).catch(err => debug.always('{}', err))

if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start, false)
} else {
    start()
}

window.roxaHidden = {
    commonUtils: commonUtils,
    dom: dom,
    indexEngine: indexEngine,
    database: database,
    debug: debug,
    favoritiesListEngine: favoritiesListEngine,
    favoritiesEngine: favoritiesEngine,
    anonsEngine: anonsEngine,
}

})();
