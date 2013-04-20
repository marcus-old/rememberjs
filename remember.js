var remember = {
    /**
     * Change the version number if you've significantly edited the controls on your page
     * This will then ignore any previously saved values and start fresh
     * The values will not be forgotten though, you can rollback to an old version number at any time to restore them
     */
    version: 1,

    controls : [],
    /**
     * Control objects contain the element to save/load as well as the methods used to access it
     * @param element
     * @optional @param {Object} options An object containing the following optional attributes
     *          -get Function to return the value of the element (access element with this.element)
     *          -set Function to set the value of the element
     *          -reset Function to reset the value to the default (access default value with this.def)
     *          -def Default value of the element
     * @constructor
     */
    Control : function(element, options){
        var def = remember._defaultFunctions(element),
            index;

        options = options || {};
        element.setAttribute("data-remember", "true");
        element.setAttribute("data-remember-initiated", "true");

        this.element = element;
        this.get = options.get || def.get;
        this.set = options.set || def.set;
        this.reset = options.reset || def.reset;
        this.def = options.def || this.get();

        // Get unique element id based on data-remember-id/id/name/input-type/tag, whichever is provided
        // todo map indexes on DOM change, but don't actually edit storage because they will likely change back on reload
        if(element.getAttribute("data-remember-id")){
            this.id = element.getAttribute("data-remember-id");
        } else if(element.id){  // identify by id
            this.id = "id-"+ element.id;
        } else if(element.name){ // identify by name
            index = remember._getIndex(element, function(el){
                return el.name == element.name && !el.id
            });
            this.id = "name-"+ element.name +"-"+ index;
        } else if(element.tagName.toLowerCase() == "input" && element.type){
            // identify by index in list of same-typed inputs without id or name
            index = remember._getIndex(element, function(el){
                return el.tagName.toLowerCase() == "input" && el.type == element.type && !el.id && !el.name
            });
            this.id = "input-"+ element.type +"-"+ index;
        } else {  // identify by index in list of items with same tag + no id or name
            index = remember._getIndex(element, function(el){
                return el.tagName == element.tagName && !el.id && !el.name
            });
            this.id = "tag-"+ element.tagName +"-"+ index;
        }

        remember.controls.push(this);

        if(typeof remember.initiated != "undefined") remember.load();
    },

    Error : function(message){
        this.name = "rememberError";
        this.message = message || "Unknown error";
    },

    /**
     * Register a function to call when any element has been changed. Also works with elements that don't support onchange.
     * Can be used to show Save/Cancel buttons when required or enable autosaving
     * @param {Function} fn
     */
    change : function(fn){
        for(var i = 0, ctrl, el, tag; i < remember.controls.length; i++){
            ctrl = remember.controls[i];
            el = ctrl.element;
            tag = el.tagName.toLowerCase();
            if(tag == "input" || tag == "select" || tag == "textarea"){
                if(el.addEventListener){
                    el.addEventListener("change", fn);
                } else {
                    el.attachEvent("onchange", fn);
                }
            } else {
                (function(ctrl, oldVal){
                    var curVal = ctrl.get();
                    if(curVal != oldVal){
                        oldVal = curVal;
                        fn();   // no event object sorry!
                    }
                    var self = arguments.callee;
                    setTimeout(function(){ self(ctrl, oldVal) }, 2000);
                })(ctrl, ctrl.get());
            }
        }
    },

    /**
     * Initiate all data-remember elements
     */
    init : function(){
        var els = remember._getElements();
        for(var i = 0; i < els.length; i++){
            if(!els[i].getAttribute("data-remember-initiated")) new remember.Control(els[i]);
        }
        remember.load();
        remember.initiated = true;
    },

    /**
     * Save the current options to storage
     *
     * @return {boolean} true on success, false otherwise
     */
    save : function(){
        var ctrl, options = {};
        for(var i = 0, l = remember.controls.length; i < l; i++){
            ctrl = remember.controls[i];
            options[ctrl.id] = ctrl.get()
        }
        remember._storage(JSON.stringify(options));
        if(!remember._storage()){ throw(new remember.Error("Failed to save options")) }

        return remember.load();
    },

    /**
     * Load the values from storage into the designated elements and cancel any changes made
     *
     * @return {boolean} true on success, false otherwise
     */
    load : function(){
        var options;

        if(remember._storage()){
            options = JSON.parse(remember._storage());
        } else {    // never saved before
            if(remember.reset() && remember._storage()){   // try again
                options = JSON.parse(remember._storage());
            } else {
                throw(new remember.Error("Error setting up data for first-run"));
            }
        }

        for(var id in options){
            if(!options.hasOwnProperty(id)) continue;
            for(var i = 0, ctrl = {}; i < remember.controls.length; i++){
                if(remember.controls[i].id == id){
                    ctrl = remember.controls[i];
                    break;
                }
            }
            if(ctrl.set) ctrl.set(options[id]);
        }
        return true;
    },

    /**
     * Get value of given element
     * @param {HTMLElement} element
     * @return {*}
     */
    get : function(element){
        for(var ctrls = remember.controls, i = 0, l = ctrls.length; i < l; i++){
            if(ctrls[i].element = element){ return ctrls[i].get() }
        }
        return null;
    },
    /**
     * Set value of given element
     * @param {HTMLElement} element
     * @param value
     * @return {*}
     */
    set : function(element, value){
        for(var ctrls = remember.controls, i = 0, l = ctrls.length; i < l; i++){
            if(ctrls[i].element = element){ return ctrls[i].set(value) }
        }
        return null;
    },
    /**
     * Reset all elements to default values
     * @optional @param {HTMLElement} element Reset only this particular element
     * @return {Boolean}
     */
    reset : function(element){
        var ctrls = remember.controls, i, l;
        if(typeof element == "undefined" || element == null || element.nodeType != 1){
            for(i = 0, l = ctrls.length; i < l; i++){
                ctrls[i].reset()
            }
        } else {
            for(i = 0, l = ctrls.length; i < l; i++){
                if(ctrls[i].element = element){ ctrls[i].reset(); break }
            }
        }
        return remember.save();
    },

    /**
     * Get the default get, set and reset methods
     * @param {HTMLElement} element The element to get the defaults for
     * @return {Object} An object with the keys get, set and reset corresponding to the default values
     * @private
     */
    _defaultFunctions : function(element){
        // todo fix range elements in ie10 (..i think it's fine actually)
        var type, get, set, reset;
        if(element.tagName.toLowerCase() == "input"){ type = element.type.toLowerCase() || "text" }

        get         = function(){ return this.element.value };
        set         = function(val){ return this.element.value = val };
        reset       = function(){ return this.element.value = this.def };
        if(type == "checkbox" || type == "radio"){
            get     = function(){ return this.element.checked };
            set     = function(val){ return this.element.checked = (val? true: false) };
            reset   = function(){ return this.element.checked = this.def };
        }
        if(element.tagName.toLowerCase() == "select"){
            get     = function(){ return this.element.selectedIndex };
            set     = function(val){ return this.element.selectedIndex = val };
            reset     = function(){ return this.element.selectedIndex = this.def };
        }
        return {get: get, set: set, reset: reset};
    },
    /**
     * Get an array of all elements on the page with the data-remember attribute
     * @return {Array}
     * @private
     */
    _getElements : function(){
        for(var els = document.all, i=0, c=[], l=els.length; i < l; i++){
            if(els[i].getAttribute("data-remember") != null) c.push(els[i]);
        }
        return c
    },
    /**
     * Calculates the index of the given element in the list of elements that satisfy the function
     * @param {HTMLElement} element
     * @param {Function} satisfies Reduce the list to elements that satisfy this function
     * @return {Number}
     * @private
     */
    _getIndex : function(element, satisfies){
        var els = document.all, index = 0;
        satisfies = satisfies || function(){return true};
        for(var i = 0, l = els.length; i < l; i++){
            if(els[i] == element) break;
            if(satisfies(els[i])) index++;
        }
        return index;
    },
    /**
     * Get/set/empty storage using localStorage with cookie fallback
     * @param {String} value Value to save in storage, leave blank to get storage, set as null to empty storage
     * @return {*}
     * @private
     */
    _storage : function(value) {
        var hasLocalStorage = localStorage?true:false,
            key = "remember-options-"+remember.ver;

        // If value is detected, set new or modify store
        if(typeof value !== "undefined" && value !== null){
            if(hasLocalStorage){ // Native support
                localStorage.setItem(key, value);
            } else { // Use Cookie
                createCookie(key, value, 365);
            }
        }

        // No value supplied, return value
        if(typeof value === "undefined"){
            if(hasLocalStorage){ // Native support
                return localStorage.getItem(key);
            } else { // Use cookie
                return readCookie(key);
            }
        }

        // Null specified, remove store
        if(value === null){
            if(hasLocalStorage){ // Native support
                return localStorage.removeItem(key);
            } else { // Use cookie
                createCookie(key, '', -1);
            }
        }

        return false;

        /**
         * Creates new cookie or removes cookie with negative expiration
         * @param  key       The key or identifier for the store
         * @param  value     Contents of the store
         * @param  exp       Expiration - creation defaults to 1 year
         */
        function createCookie(key, value, exp) {
            var date = new Date();
            date.setTime(date.getTime() + ((exp||365) * 24 * 60 * 60 * 1000));
            var expires = "; expires=" + date.toGMTString();
            document.cookie = key + "=" + value + expires + "; path=/";
        }
        /**
         * Returns contents of cookie
         * @param  key       The key or identifier for the store
         */
        function readCookie(key) {
            var nameEQ = key + "=";
            var ca = document.cookie.split(';');
            for (var i = 0, max = ca.length; i < max; i++) {
                var c = ca[i];
                while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
            }
            return null;
        }
    }
};
remember.Error.prototype = new Error();
remember.Error.prototype.constructor = remember.Error;
if(document.addEventListener){
    document.addEventListener("DOMContentLoaded", remember.init);
} else {
    document.attachEvent("onreadystatechange", remember.init);
}