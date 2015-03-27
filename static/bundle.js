require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
//     Backbone.js 1.1.2

//     (c) 2010-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(root, factory) {

  // Set up Backbone appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'jquery', 'exports'], function(_, $, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backbone.
      root.Backbone = factory(root, exports, _, $);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore');
    factory(root, exports, _);

  // Finally, as a browser global.
  } else {
    root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
  }

}(this, function(root, Backbone, _, $) {

  // Initial Setup
  // -------------

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.1.2';

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  Backbone.$ = $;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PATCH"`, `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = void 0;
        return this;
      }
      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeningTo = this._listeningTo;
      if (!listeningTo) return this;
      var remove = !name && !callback;
      if (!callback && typeof name === 'object') callback = this;
      if (obj) (listeningTo = {})[obj._listenId] = obj;
      for (var id in listeningTo) {
        obj = listeningTo[id];
        obj.off(name, callback, this);
        if (remove || _.isEmpty(obj._events)) delete this._listeningTo[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeningTo = this._listeningTo || (this._listeningTo = {});
      var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
      listeningTo[id] = obj;
      if (!callback && typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    if (options.collection) this.collection = options.collection;
    if (options.parse) attrs = this.parse(attrs, options) || {};
    attrs = _.defaults({}, attrs, _.result(this, 'defaults'));
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = options;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          options = this._pending;
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options = _.extend({validate: true}, options);

      // If we're not waiting and attributes exist, save acts as
      // `set(attr).save(null, opts)` with validation. Otherwise, check if
      // the model will be valid when the attributes, if any, are set.
      if (attrs && !options.wait) {
        if (!this.set(attrs, options)) return false;
      } else {
        if (!this._validate(attrs, options)) return false;
      }

      // Set temporary attributes if `{wait: true}`.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base =
        _.result(this, 'urlRoot') ||
        _.result(this.collection, 'url') ||
        urlError();
      if (this.isNew()) return base;
      return base.replace(/([^\/])$/, '$1/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return !this.has(this.idAttribute);
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, remove: false};

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.extend({merge: false}, options, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      var singular = !_.isArray(models);
      models = singular ? [models] : _.clone(models);
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
        model = models[i] = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model, options);
      }
      return singular ? models[0] : models;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      options = _.defaults({}, options, setOptions);
      if (options.parse) models = this.parse(models, options);
      var singular = !_.isArray(models);
      models = singular ? (models ? [models] : []) : _.clone(models);
      var i, l, id, model, attrs, existing, sort;
      var at = options.at;
      var targetModel = this.model;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};
      var add = options.add, merge = options.merge, remove = options.remove;
      var order = !sortable && add && remove ? [] : false;

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = 0, l = models.length; i < l; i++) {
        attrs = models[i] || {};
        if (attrs instanceof Model) {
          id = model = attrs;
        } else {
          id = attrs[targetModel.prototype.idAttribute || 'id'];
        }

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing = this.get(id)) {
          if (remove) modelMap[existing.cid] = true;
          if (merge) {
            attrs = attrs === model ? model.attributes : attrs;
            if (options.parse) attrs = existing.parse(attrs, options);
            existing.set(attrs, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }
          models[i] = existing;

        // If this is a new, valid model, push it to the `toAdd` list.
        } else if (add) {
          model = models[i] = this._prepareModel(attrs, options);
          if (!model) continue;
          toAdd.push(model);
          this._addReference(model, options);
        }

        // Do not add multiple models with the same `id`.
        model = existing || model;
        if (order && (model.isNew() || !modelMap[model.id])) order.push(model);
        modelMap[model.id] = true;
      }

      // Remove nonexistent models if appropriate.
      if (remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length || (order && order.length)) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          for (i = 0, l = toAdd.length; i < l; i++) {
            this.models.splice(at + i, 0, toAdd[i]);
          }
        } else {
          if (order) this.models.length = 0;
          var orderedModels = order || toAdd;
          for (i = 0, l = orderedModels.length; i < l; i++) {
            this.models.push(orderedModels[i]);
          }
        }
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      // Unless silenced, it's time to fire all appropriate add/sort events.
      if (!options.silent) {
        for (i = 0, l = toAdd.length; i < l; i++) {
          (model = toAdd[i]).trigger('add', model, this, options);
        }
        if (sort || (order && order.length)) this.trigger('sort', this, options);
      }

      // Return the added (or merged) model (or models).
      return singular ? models[0] : models;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i], options);
      }
      options.previousModels = this.models;
      this._reset();
      models = this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return models;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      return this.add(model, _.extend({at: this.length}, options));
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      return this.add(model, _.extend({at: 0}, options));
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function() {
      return slice.apply(this.models, arguments);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj] || this._byId[obj.id] || this._byId[obj.cid];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(model, resp) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) return attrs;
      options = options ? _.clone(options) : {};
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model.validationError) return model;
      this.trigger('invalid', this, model.validationError, options);
      return false;
    },

    // Internal method to create a model's ties to a collection.
    _addReference: function(model, options) {
      this._byId[model.cid] = model;
      if (model.id != null) this._byId[model.id] = model;
      if (!model.collection) model.collection = this;
      model.on('all', this._onModelEvent, this);
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model, options) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'difference', 'indexOf', 'shuffle',
    'lastIndexOf', 'isEmpty', 'chain', 'sample'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy', 'indexBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    options || (options = {});
    _.extend(this, _.pick(options, viewOptions));
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be preferred to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save',
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;

        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
        this.setElement($el, false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    if (params.type === 'PATCH' && noXhrPatch) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  var noXhrPatch =
    typeof window !== 'undefined' && !!window.ActiveXObject &&
      !(window.XMLHttpRequest && (new XMLHttpRequest).dispatchEvent);

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        router.execute(callback, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Execute a route handler with the provided parameters.  This is an
    // excellent place to do pre-route setup or post-route cleanup.
    execute: function(callback, args) {
      if (callback) callback.apply(this, args);
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional) {
                     return optional ? match : '([^/?]+)';
                   })
                   .replace(splatParam, '([^?]*?)');
      return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param, i) {
        // Don't decode the search params.
        if (i === params.length - 1) return param || null;
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Cached regex for stripping urls of hash.
  var pathStripper = /#.*$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Are we at the app root?
    atRoot: function() {
      return this.location.pathname.replace(/[^\/]$/, '$&/') === this.root;
    },

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = decodeURI(this.location.pathname + this.location.search);
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.slice(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        var frame = Backbone.$('<iframe src="javascript:0" tabindex="-1">');
        this.iframe = frame.hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;

      // Transition from hashChange to pushState or vice versa if both are
      // requested.
      if (this._wantsHashChange && this._wantsPushState) {

        // If we've started off with a route from a `pushState`-enabled
        // browser, but we're currently in a browser that doesn't support it...
        if (!this._hasPushState && !this.atRoot()) {
          this.fragment = this.getFragment(null, true);
          this.location.replace(this.root + '#' + this.fragment);
          // Return immediately as browser will do redirect to new url
          return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
        } else if (this._hasPushState && this.atRoot() && loc.hash) {
          this.fragment = this.getHash().replace(routeStripper, '');
          this.history.replaceState({}, document.title, this.root + this.fragment);
        }

      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl();
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragment) {
      fragment = this.fragment = this.getFragment(fragment);
      return _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: !!options};

      var url = this.root + (fragment = this.getFragment(fragment || ''));

      // Strip the hash for matching.
      fragment = fragment.replace(pathStripper, '');

      if (this.fragment === fragment) return;
      this.fragment = fragment;

      // Don't include a trailing slash on the root.
      if (fragment === '' && url !== '/') url = url.slice(0, -1);

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) return this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function(model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  return Backbone;

}));

},{"underscore":2}],2:[function(require,module,exports){
//     Underscore.js 1.8.2
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.2';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var isArrayLike = function(collection) {
    var length = collection && collection.length;
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, target, fromIndex) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    return _.indexOf(obj, target, typeof fromIndex == 'number' && fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = input && input.length; i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (array == null) return [];
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = array.length; i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    if (array == null) return [];
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = array.length; i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, 'length').length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = list && list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    var i = 0, length = array && array.length;
    if (typeof isSorted == 'number') {
      i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
    } else if (isSorted && length) {
      i = _.sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
    if (item !== item) {
      return _.findIndex(slice.call(array, i), _.isNaN);
    }
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  _.lastIndexOf = function(array, item, from) {
    var idx = array ? array.length : 0;
    if (typeof from == 'number') {
      idx = from < 0 ? idx + from + 1 : Math.min(idx, from + 1);
    }
    if (item !== item) {
      return _.findLastIndex(slice.call(array, 0, idx), _.isNaN);
    }
    while (--idx >= 0) if (array[idx] === item) return idx;
    return -1;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = array != null && array.length;
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createIndexFinder(1);

  _.findLastIndex = createIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    
    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of 
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;
  
  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}],3:[function(require,module,exports){
var Backbone = require('backbone');
var Station = require('models/station');
var Stations = Backbone.Collection.extend({
	model: Station
});
module.exports = Stations;
},{"backbone":1,"models/station":4}],4:[function(require,module,exports){
var Backbone = require('backbone');
var Station = Backbone.Model.extend({
	defaults: {
		id: 0,
		stationName: 'default',
		stAddress1: 'default',
		stAddress2: '',
		availableBikes: 0,
		availableDocks: 0,
		selected: false
	}
})

module.exports = Station;
},{"backbone":1}],5:[function(require,module,exports){
module.exports=[
    {
      "id": 5,
      "stationName": "State St & Harrison St",
      "availableDocks": 5,
      "totalDocks": 19,
      "latitude": 41.874053,
      "longitude": -87.627716,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 14,
      "stAddress1": "State St & Harrison St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "620 S. State St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "030"
    },
    {
      "id": 13,
      "stationName": "Wilton Ave & Diversey Pkwy",
      "availableDocks": 13,
      "totalDocks": 19,
      "latitude": 41.93250008,
      "longitude": -87.65268082,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Wilton Ave & Diversey Pkwy",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "2790 N.Wilton Ave",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "066"
    },
    {
      "id": 14,
      "stationName": "Morgan St & 18th St",
      "availableDocks": 5,
      "totalDocks": 15,
      "latitude": 41.858086,
      "longitude": -87.651073,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Morgan St & 18th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "962 W. 18th St",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "163"
    },
    {
      "id": 15,
      "stationName": "Racine Ave & 19th St",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.856453,
      "longitude": -87.656471,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Racine Ave & 19th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "1722 S Racine Ave",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "164"
    },
    {
      "id": 16,
      "stationName": "Wood St & North Ave",
      "availableDocks": 6,
      "totalDocks": 11,
      "latitude": 41.910329,
      "longitude": -87.672516,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Wood St & North Ave",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "1553 N Wood St",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "223"
    },
    {
      "id": 17,
      "stationName": "Wood St & Division St",
      "availableDocks": 2,
      "totalDocks": 15,
      "latitude": 41.90332,
      "longitude": -87.67273,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 13,
      "stAddress1": "Wood St & Division St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "1802 W. Divison St",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "246"
    },
    {
      "id": 19,
      "stationName": "Loomis St & Taylor St",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.869417,
      "longitude": -87.660996,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Loomis St & Taylor St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "139"
    },
    {
      "id": 20,
      "stationName": "Sheffield Ave & Kingsbury St",
      "availableDocks": 6,
      "totalDocks": 15,
      "latitude": 41.90959193,
      "longitude": -87.65349723,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Sheffield Ave & Kingsbury St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "1009 W. Weed st",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "154"
    },
    {
      "id": 21,
      "stationName": "Aberdeen St & Jackson Blvd",
      "availableDocks": 6,
      "totalDocks": 15,
      "latitude": 41.87772613,
      "longitude": -87.65478743,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Aberdeen St & Jackson Blvd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "1103 W.Jackson Blvd",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "157"
    },
    {
      "id": 22,
      "stationName": "May St & Taylor St",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.8694821,
      "longitude": -87.6554864,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "May St & Taylor St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "1134 W. Taylor St",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "160"
    },
    {
      "id": 23,
      "stationName": "Orleans St & Elm St",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.902924,
      "longitude": -87.637715,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Orleans St & Elm St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "350 W. Elm st",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "172"
    },
    {
      "id": 24,
      "stationName": "Fairbanks Ct & Grand Ave",
      "availableDocks": 13,
      "totalDocks": 14,
      "latitude": 41.89186,
      "longitude": -87.62062,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 1,
      "stAddress1": "Fairbanks Ct & Grand Ave",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "240 E.Grand Ave.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "262"
    },
    {
      "id": 25,
      "stationName": "Michigan Ave & Pearson St",
      "availableDocks": 5,
      "totalDocks": 23,
      "latitude": 41.89766,
      "longitude": -87.62351,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 18,
      "stAddress1": "Michigan Ave & Pearson st",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "150 E.Pearson st",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "034"
    },
    {
      "id": 26,
      "stationName": "McClurg Ct & Illinois St",
      "availableDocks": 21,
      "totalDocks": 31,
      "latitude": 41.89102,
      "longitude": -87.6173,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "McClurg Ct & Illinois St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "051"
    },
    {
      "id": 27,
      "stationName": "Larrabee St & North Ave",
      "availableDocks": 10,
      "totalDocks": 19,
      "latitude": 41.91021,
      "longitude": -87.6435,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Larrabee St & North Ave",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "1530 N.Larrabee st",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "174"
    },
    {
      "id": 28,
      "stationName": "Larrabee St & Menomonee St",
      "availableDocks": 6,
      "totalDocks": 15,
      "latitude": 41.91468,
      "longitude": -87.64332,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Larrabee St & Menomonee St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "590 W. Menomonee",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "282"
    },
    {
      "id": 29,
      "stationName": "Noble St & Milwaukee Ave",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.90068,
      "longitude": -87.6626,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Noble St & Milwaukee Ave",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "1016 N. Noble st",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "290"
    },
    {
      "id": 30,
      "stationName": "Ashland Ave & Augusta Blvd",
      "availableDocks": 5,
      "totalDocks": 15,
      "latitude": 41.899643,
      "longitude": -87.6677,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Ashland Ave & Augusta Blvd",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "1611 W. Augusta Blvd",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "248"
    },
    {
      "id": 31,
      "stationName": "Franklin St & Chicago Ave",
      "availableDocks": 12,
      "totalDocks": 23,
      "latitude": 41.89680204,
      "longitude": -87.63563839,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Franklin St & Chicago Ave",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "805 N. Franklin St",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "017"
    },
    {
      "id": 32,
      "stationName": "Racine Ave & Congress Pkwy",
      "availableDocks": 9,
      "totalDocks": 19,
      "latitude": 41.87464,
      "longitude": -87.65703,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Racine Ave & Congress Pkwy",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "550 S. Racine",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "076"
    },
    {
      "id": 33,
      "stationName": "State St & Van Buren St",
      "availableDocks": 20,
      "totalDocks": 27,
      "latitude": 41.877181,
      "longitude": -87.627844,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "State St & Van Buren St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "360 S State St",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "003"
    },
    {
      "id": 34,
      "stationName": "Cannon Dr & Fullerton Ave",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.9267559875,
      "longitude": -87.6344287848,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Cannon Dr & Fullerton Ave",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "2432 N. Cannon Dr.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "124"
    },
    {
      "id": 35,
      "stationName": "Streeter Dr & Illinois St",
      "availableDocks": 24,
      "totalDocks": 39,
      "latitude": 41.891071,
      "longitude": -87.6122,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 14,
      "stAddress1": "Streeter Dr & Illinois St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "585 E. Illinois st",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "022"
    },
    {
      "id": 36,
      "stationName": "Franklin St & Jackson Blvd",
      "availableDocks": 26,
      "totalDocks": 31,
      "latitude": 41.8777079559,
      "longitude": -87.6353211408,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Franklin St & Jackson Blvd",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "340 S. Franklin St",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "019"
    },
    {
      "id": 37,
      "stationName": "Dearborn St & Adams St",
      "availableDocks": 12,
      "totalDocks": 19,
      "latitude": 41.8793563587,
      "longitude": -87.6297910363,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Dearborn St & Adams St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "59 W. Adams St ",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "020"
    },
    {
      "id": 42,
      "stationName": "Wabash Ave & Cermak Rd",
      "availableDocks": 4,
      "totalDocks": 11,
      "latitude": 41.852619,
      "longitude": -87.626488,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Wabash Ave & Cermak Rd",
      "stAddress2": "CTA Green Line - Cermak Stop",
      "city": "",
      "postalCode": "",
      "location": "13 E Cermak Rd",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "170"
    },
    {
      "id": 43,
      "stationName": "Michigan Ave & Washington St",
      "availableDocks": 6,
      "totalDocks": 43,
      "latitude": 41.8838927658,
      "longitude": -87.6246491409,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 36,
      "stAddress1": "Michigan Ave & Washington St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "120 N Michigan",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "001"
    },
    {
      "id": 44,
      "stationName": "State St & Randolph St",
      "availableDocks": 16,
      "totalDocks": 27,
      "latitude": 41.8847302006,
      "longitude": -87.6277335692,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "State St & Randolph St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "002"
    },
    {
      "id": 45,
      "stationName": "Michigan Ave & Congress Pkwy",
      "availableDocks": 13,
      "totalDocks": 15,
      "latitude": 41.876065599,
      "longitude": -87.6244333636,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 2,
      "stAddress1": "Michigan Ave & Congress Pkwy",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "420 w. Michigan",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "040"
    },
    {
      "id": 46,
      "stationName": "Wells St & Walton St",
      "availableDocks": 14,
      "totalDocks": 19,
      "latitude": 41.89993001,
      "longitude": -87.63443007,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Wells St & Walton St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "932 N. Wells St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "046"
    },
    {
      "id": 47,
      "stationName": "State St & Kinzie St",
      "availableDocks": 14,
      "totalDocks": 23,
      "latitude": 41.88918,
      "longitude": -87.6277,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "State St & Kinzie St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "5 E. Kinzie St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "050"
    },
    {
      "id": 48,
      "stationName": "Larrabee St & Kingsbury St",
      "availableDocks": 23,
      "totalDocks": 27,
      "latitude": 41.897764,
      "longitude": -87.642884,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 2,
      "stAddress1": "Larrabee St & Kingsbury St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "840 N. Larrabee St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "012"
    },
    {
      "id": 49,
      "stationName": "Dearborn St & Monroe St",
      "availableDocks": 19,
      "totalDocks": 27,
      "latitude": 41.881319815,
      "longitude": -87.6295209193,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Dearborn St & Monroe St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "80 S. Dearborn St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "049"
    },
    {
      "id": 50,
      "stationName": "Clark St & Congress Pkwy",
      "availableDocks": 11,
      "totalDocks": 27,
      "latitude": 41.8759326655,
      "longitude": -87.6305845355,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 15,
      "stAddress1": "Clark St & Congress Pkwy",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "009"
    },
    {
      "id": 51,
      "stationName": "Clark St & Randolph St",
      "availableDocks": 27,
      "totalDocks": 31,
      "latitude": 41.884576228,
      "longitude": -87.63188991,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Clark St & Randolph St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "120 W. Randolph St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "005"
    },
    {
      "id": 52,
      "stationName": "Michigan Ave & Lake St",
      "availableDocks": 19,
      "totalDocks": 31,
      "latitude": 41.886024,
      "longitude": -87.624117,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Michigan Ave & Lake St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "203 N. Michigan Ave.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "043"
    },
    {
      "id": 53,
      "stationName": "Wells St & Erie St",
      "availableDocks": 18,
      "totalDocks": 19,
      "latitude": 41.893832,
      "longitude": -87.634195,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 1,
      "stAddress1": "Wells St & Erie St",
      "stAddress2": "Formerly Wells/Huron",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "064"
    },
    {
      "id": 54,
      "stationName": "Ogden Ave & Chicago Ave",
      "availableDocks": 5,
      "totalDocks": 19,
      "latitude": 41.896362458,
      "longitude": -87.6540612729,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 14,
      "stAddress1": "Ogden Ave & Chicago Ave",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "1040 W. Chicago Ave.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "044"
    },
    {
      "id": 55,
      "stationName": "Halsted St & James M Rochford St",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.865861,
      "longitude": -87.646611,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Halsted St & James M Rochford St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "791 W. James M. Rochford St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "166"
    },
    {
      "id": 56,
      "stationName": "Desplaines St & Kinzie St",
      "availableDocks": 7,
      "totalDocks": 19,
      "latitude": 41.888716036,
      "longitude": -87.6444478533,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 12,
      "stAddress1": "Desplaines St & Kinzie St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "368 N. Desplaines St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "039"
    },
    {
      "id": 57,
      "stationName": "Clinton St & Roosevelt Rd",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.8671177825,
      "longitude": -87.6410879593,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Clinton St & Roosevelt Rd",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "559 W. Roosevelt Rd.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "327"
    },
    {
      "id": 58,
      "stationName": "Marshfield Ave & Cortland St",
      "availableDocks": 11,
      "totalDocks": 19,
      "latitude": 41.916017,
      "longitude": -87.668879,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Marshfield Ave & Cortland St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "025"
    },
    {
      "id": 59,
      "stationName": "Wabash Ave & Roosevelt Rd",
      "availableDocks": 7,
      "totalDocks": 19,
      "latitude": 41.867227,
      "longitude": -87.625961,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 12,
      "stAddress1": "Wabash Ave & Roosevelt Rd",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "1210 S. Wabash Ave.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "031"
    },
    {
      "id": 60,
      "stationName": "Dayton St & North Ave",
      "availableDocks": 10,
      "totalDocks": 19,
      "latitude": 41.9105780349,
      "longitude": -87.6494219288,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Dayton St & North Ave",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "1575 N. Dayton St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "058"
    },
    {
      "id": 61,
      "stationName": "Wood St & Milwaukee Ave",
      "availableDocks": 4,
      "totalDocks": 15,
      "latitude": 41.907655,
      "longitude": -87.672552,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Wood St & Milwaukee Ave",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "1416 N. Wood",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "221"
    },
    {
      "id": 62,
      "stationName": "McCormick Place",
      "availableDocks": 16,
      "totalDocks": 27,
      "latitude": 41.8513751729,
      "longitude": -87.6188346489,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "McCormick Place",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "2253 S. Dr. Martin Luther King Jr Dr.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "106"
    },
    {
      "id": 66,
      "stationName": "Clinton St & Lake St",
      "availableDocks": 9,
      "totalDocks": 19,
      "latitude": 41.8858327415,
      "longitude": -87.6413823149,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Clinton St & Lake St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "202 N. Clinton St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "021"
    },
    {
      "id": 67,
      "stationName": "Sheffield Ave & Fullerton Ave",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.9256018819,
      "longitude": -87.6537080423,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Sheffield Ave & Fullerton Ave",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "2410 N. Sheffield Ave.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "060"
    },
    {
      "id": 68,
      "stationName": "Clinton St & Tilden St",
      "availableDocks": 5,
      "totalDocks": 23,
      "latitude": 41.875885,
      "longitude": -87.640795,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 17,
      "stAddress1": "Clinton St & Tilden St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "520 W. Tilden",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "037"
    },
    {
      "id": 69,
      "stationName": "Damen Ave & Pierce Ave",
      "availableDocks": 6,
      "totalDocks": 19,
      "latitude": 41.9093960065,
      "longitude": -87.6776919292,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 13,
      "stAddress1": "Damen Ave & Pierce Ave",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "2002 W. Pierce Ave.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "065"
    },
    {
      "id": 71,
      "stationName": "Morgan St & Lake St",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.8854833079,
      "longitude": -87.6523048564,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Morgan St & Lake St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "1003 W. Lake St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "072"
    },
    {
      "id": 72,
      "stationName": "State St & 16th St",
      "availableDocks": 0,
      "totalDocks": 15,
      "latitude": 41.8601213774,
      "longitude": -87.6277291853,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 15,
      "stAddress1": "State St & 16th St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "1 W. 16th St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "148"
    },
    {
      "id": 73,
      "stationName": "Jefferson St & Monroe St",
      "availableDocks": 13,
      "totalDocks": 19,
      "latitude": 41.880422,
      "longitude": -87.642746,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Jefferson St & Monroe St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "207 S. Jefferson St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "038"
    },
    {
      "id": 74,
      "stationName": "Kingsbury St & Erie St",
      "availableDocks": 10,
      "totalDocks": 23,
      "latitude": 41.89384315,
      "longitude": -87.64185116,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 12,
      "stAddress1": "Kingsbury St & Erie St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "511 W Erie",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "265"
    },
    {
      "id": 75,
      "stationName": "Canal St & Jackson Blvd",
      "availableDocks": 3,
      "totalDocks": 35,
      "latitude": 41.878149,
      "longitude": -87.640001,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 32,
      "stAddress1": "Canal St & Jackson Blvd",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "510 W. Jackson Blvd.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "138"
    },
    {
      "id": 76,
      "stationName": "Lake Shore Dr & Monroe St",
      "availableDocks": 27,
      "totalDocks": 39,
      "latitude": 41.880958,
      "longitude": -87.616743,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 12,
      "stAddress1": "Lake Shore Dr & Monroe St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "402 E. Monroe St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "300"
    },
    {
      "id": 77,
      "stationName": "Clinton St & Madison St",
      "availableDocks": 8,
      "totalDocks": 23,
      "latitude": 41.8815824,
      "longitude": -87.64127743,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 15,
      "stAddress1": "Clinton St & Madison St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "8 S. Clinton St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "301"
    },
    {
      "id": 80,
      "stationName": "Aberdeen St & Madison St",
      "availableDocks": 4,
      "totalDocks": 19,
      "latitude": 41.881487,
      "longitude": -87.654752,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 14,
      "stAddress1": "Aberdeen St & Madison St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "1059 W. Madison St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "156"
    },
    {
      "id": 81,
      "stationName": "Daley Center Plaza",
      "availableDocks": 29,
      "totalDocks": 36,
      "latitude": 41.884451,
      "longitude": -87.629892,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Daley Center Plaza",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "48 W. Washington St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "023"
    },
    {
      "id": 84,
      "stationName": "Union Ave & Grand Ave",
      "availableDocks": 9,
      "totalDocks": 19,
      "latitude": 41.891,
      "longitude": -87.645925,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Union Ave & Grand Ave",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "820 W. Grand Ave.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "033"
    },
    {
      "id": 85,
      "stationName": "Michigan Ave & Oak St",
      "availableDocks": 16,
      "totalDocks": 23,
      "latitude": 41.90096039,
      "longitude": -87.62377664,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Michigan Ave & Oak St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "140 E. Oak St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "042"
    },
    {
      "id": 86,
      "stationName": "Eckhart Park",
      "availableDocks": 4,
      "totalDocks": 15,
      "latitude": 41.89637337,
      "longitude": -87.66098386,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Eckhart Park",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "811 N. Noble St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "289"
    },
    {
      "id": 87,
      "stationName": "Racine Ave & Fullerton Ave",
      "availableDocks": 12,
      "totalDocks": 19,
      "latitude": 41.92556258,
      "longitude": -87.65840426,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Racine Ave & Fullerton Ave",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "2411 N. Racine",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "189"
    },
    {
      "id": 88,
      "stationName": "May St & Randolph St",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.88397,
      "longitude": -87.655688,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "May St & Randolph St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "1213 W. Washington St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "155"
    },
    {
      "id": 90,
      "stationName": "Millennium Park",
      "availableDocks": 15,
      "totalDocks": 35,
      "latitude": 41.8810317,
      "longitude": -87.62408432,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 20,
      "stAddress1": "Millennium Park",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "33 S. Michigan Ave.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "008"
    },
    {
      "id": 91,
      "stationName": "Clinton St & Washington Blvd",
      "availableDocks": 2,
      "totalDocks": 31,
      "latitude": 41.88338,
      "longitude": -87.64117,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 28,
      "stAddress1": "Clinton St & Washington Blvd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "109 N. Clinton St.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "010"
    },
    {
      "id": 92,
      "stationName": "Carpenter St & Huron St",
      "availableDocks": 12,
      "totalDocks": 19,
      "latitude": 41.894556,
      "longitude": -87.653449,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Carpenter St & Huron St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "196"
    },
    {
      "id": 93,
      "stationName": "Sheffield Ave & Willow St",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.913688,
      "longitude": -87.652855,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Sheffield Ave & Willow St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "1740 N. Sheffield Ave.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "190"
    },
    {
      "id": 94,
      "stationName": "Clark St & Armitage Ave",
      "availableDocks": 6,
      "totalDocks": 19,
      "latitude": 41.918306,
      "longitude": -87.636282,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 13,
      "stAddress1": "Clark St & Armitage Ave (Lincoln Ave & Armitage Ave)",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "1963 N. Lincoln Ave.",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "146"
    },
    {
      "id": 97,
      "stationName": "Museum Campus",
      "availableDocks": 29,
      "totalDocks": 35,
      "latitude": 41.865212,
      "longitude": -87.617759,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Museum Campus",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "Off Street",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "029"
    },
    {
      "id": 98,
      "stationName": "LaSalle St & Washington St",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.882664,
      "longitude": -87.63253,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "LaSalle St & Washington St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "006"
    },
    {
      "id": 99,
      "stationName": "Lake Shore Dr & Ohio St",
      "availableDocks": 4,
      "totalDocks": 19,
      "latitude": 41.89257,
      "longitude": -87.614492,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 14,
      "stAddress1": "Lake Shore Dr & Ohio St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "337"
    },
    {
      "id": 100,
      "stationName": "Orleans St & Merchandise Mart Plaza",
      "availableDocks": 20,
      "totalDocks": 23,
      "latitude": 41.888243,
      "longitude": -87.63639,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 3,
      "stAddress1": "Orleans St & Merchandise Mart Plaza",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "333 N Orleans st ",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "013"
    },
    {
      "id": 106,
      "stationName": "State St & Pearson St",
      "availableDocks": 19,
      "totalDocks": 27,
      "latitude": 41.897448,
      "longitude": -87.628722,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "State St & Pearson St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "014"
    },
    {
      "id": 108,
      "stationName": "Halsted St & Polk St",
      "availableDocks": 10,
      "totalDocks": 19,
      "latitude": 41.87184,
      "longitude": -87.64664,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Halsted St & Polk St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "027"
    },
    {
      "id": 109,
      "stationName": "900 W Harrison St",
      "availableDocks": 8,
      "totalDocks": 19,
      "latitude": 41.874675,
      "longitude": -87.650019,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "900 W Harrison St",
      "stAddress2": "Peoria Blue Line",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "028"
    },
    {
      "id": 110,
      "stationName": "Dearborn St & Erie St",
      "availableDocks": 11,
      "totalDocks": 20,
      "latitude": 41.893992,
      "longitude": -87.629318,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Dearborn St & Erie St",
      "stAddress2": "\n",
      "city": "Chicago",
      "postalCode": "",
      "location": "Dearborn St & Erie St",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "045"
    },
    {
      "id": 111,
      "stationName": "Sedgwick St & Huron St",
      "availableDocks": 13,
      "totalDocks": 19,
      "latitude": 41.894666,
      "longitude": -87.638437,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Sedgwick St & Huron St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "052"
    },
    {
      "id": 112,
      "stationName": "Green St & Randolph St",
      "availableDocks": 12,
      "totalDocks": 15,
      "latitude": 41.884078,
      "longitude": -87.648684,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 3,
      "stAddress1": "Green St & Randolph St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "053"
    },
    {
      "id": 113,
      "stationName": "Bissell St & Armitage Ave",
      "availableDocks": 5,
      "totalDocks": 15,
      "latitude": 41.91844,
      "longitude": -87.65222,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Bissell St & Armitage Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "059"
    },
    {
      "id": 114,
      "stationName": "Sheffield Ave & Addison St",
      "availableDocks": 13,
      "totalDocks": 27,
      "latitude": 41.94688,
      "longitude": -87.65445,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 14,
      "stAddress1": "Sheffield Ave & Addison St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "062"
    },
    {
      "id": 115,
      "stationName": "Sheffield Ave & Wellington Ave",
      "availableDocks": 18,
      "totalDocks": 23,
      "latitude": 41.936253,
      "longitude": -87.653566,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Sheffield Ave & Wellington Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "067"
    },
    {
      "id": 116,
      "stationName": "Western Ave & Winnebago Ave",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.915533,
      "longitude": -87.687051,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Western Ave & Winnebago Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "068"
    },
    {
      "id": 117,
      "stationName": "Wilton Ave & Belmont Ave",
      "availableDocks": 21,
      "totalDocks": 23,
      "latitude": 41.94018,
      "longitude": -87.65304,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 2,
      "stAddress1": "Wilton Ave & Belmont Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "069"
    },
    {
      "id": 118,
      "stationName": "Sedgwick St & North Ave",
      "availableDocks": 15,
      "totalDocks": 19,
      "latitude": 41.910579,
      "longitude": -87.638618,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Sedgwick St & North Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "070"
    },
    {
      "id": 119,
      "stationName": "Ashland Ave & Lake St",
      "availableDocks": 7,
      "totalDocks": 19,
      "latitude": 41.88541,
      "longitude": -87.66732,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 12,
      "stAddress1": "Ashland Ave & Lake St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "073"
    },
    {
      "id": 120,
      "stationName": "Wentworth Ave & Archer Ave",
      "availableDocks": 0,
      "totalDocks": 15,
      "latitude": 41.854564,
      "longitude": -87.631937,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 15,
      "stAddress1": "Wentworth Ave & Archer Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "075"
    },
    {
      "id": 121,
      "stationName": "Blackstone Ave & Hyde Park Blvd",
      "availableDocks": 13,
      "totalDocks": 15,
      "latitude": 41.802562,
      "longitude": -87.590368,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 2,
      "stAddress1": "Blackstone Ave & Hyde Park Blvd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "Hyde Park",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "398"
    },
    {
      "id": 122,
      "stationName": "Ogden Ave & Congress Pkwy",
      "availableDocks": 12,
      "totalDocks": 15,
      "latitude": 41.87501,
      "longitude": -87.67328,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 3,
      "stAddress1": "Ogden Ave & Congress Pkwy",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "081"
    },
    {
      "id": 123,
      "stationName": "California Ave & Milwaukee Ave",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.922695,
      "longitude": -87.697153,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "California Ave & Milwaukee Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "084"
    },
    {
      "id": 124,
      "stationName": "Damen Ave & Cullerton St",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.855048,
      "longitude": -87.675726,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Damen Ave & Cullerton St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "089"
    },
    {
      "id": 126,
      "stationName": "Clark St & North Ave",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.911974,
      "longitude": -87.631942,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Clark St & North Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "128"
    },
    {
      "id": 127,
      "stationName": "Lincoln Ave & Fullerton Ave",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.925905,
      "longitude": -87.64926,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Lincoln Ave & Fullerton Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "131"
    },
    {
      "id": 128,
      "stationName": "Damen Ave & Chicago Ave",
      "availableDocks": 2,
      "totalDocks": 15,
      "latitude": 41.895769,
      "longitude": -87.67722,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 13,
      "stAddress1": "Damen Ave & Chicago Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "132"
    },
    {
      "id": 129,
      "stationName": "Blue Island Ave & 18th St",
      "availableDocks": 6,
      "totalDocks": 15,
      "latitude": 41.857556,
      "longitude": -87.661535,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Blue Island Ave & 18th St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "135"
    },
    {
      "id": 130,
      "stationName": "Damen Ave & Division St",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.90331,
      "longitude": -87.67695,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Damen Ave & Division St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "136"
    },
    {
      "id": 131,
      "stationName": "Lincoln Ave & Belmont Ave",
      "availableDocks": 5,
      "totalDocks": 15,
      "latitude": 41.939365,
      "longitude": -87.668385,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Lincoln Ave & Belmont Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "140"
    },
    {
      "id": 132,
      "stationName": "Wentworth Ave & 24th St",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.849237,
      "longitude": -87.631715,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Wentworth Ave & 24th St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "149"
    },
    {
      "id": 134,
      "stationName": "Peoria St & Jackson Blvd",
      "availableDocks": 12,
      "totalDocks": 19,
      "latitude": 41.877749,
      "longitude": -87.649633,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Peoria St & Jackson Blvd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "158"
    },
    {
      "id": 135,
      "stationName": "Halsted St & 21st St",
      "availableDocks": 2,
      "totalDocks": 11,
      "latitude": 41.85378,
      "longitude": -87.64665,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Halsted St & 21st St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "162"
    },
    {
      "id": 136,
      "stationName": "Racine Ave & 13th St",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.865054,
      "longitude": -87.656959,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Racine Ave & 13th St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "165"
    },
    {
      "id": 137,
      "stationName": "Morgan Ave & 14th Pl",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.862378,
      "longitude": -87.651062,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Morgan Ave & 14th Pl",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "169"
    },
    {
      "id": 138,
      "stationName": "Clybourn Ave & Division St",
      "availableDocks": 3,
      "totalDocks": 15,
      "latitude": 41.904509,
      "longitude": -87.6405,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Clybourn Ave & Division St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "171"
    },
    {
      "id": 140,
      "stationName": "Dearborn Pkwy & Delaware Pl",
      "availableDocks": 7,
      "totalDocks": 19,
      "latitude": 41.899007,
      "longitude": -87.629928,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Dearborn Pkwy & Delaware Pl",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "173"
    },
    {
      "id": 141,
      "stationName": "Clark St & Lincoln Ave",
      "availableDocks": 19,
      "totalDocks": 23,
      "latitude": 41.915689,
      "longitude": -87.6346,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Clark St & Lincoln Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "179"
    },
    {
      "id": 143,
      "stationName": "Sedgwick St & Webster Ave",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.922167,
      "longitude": -87.638888,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Sedgwick St & Webster Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "191"
    },
    {
      "id": 144,
      "stationName": "Larrabee St & Webster Ave",
      "availableDocks": 2,
      "totalDocks": 15,
      "latitude": 41.92175,
      "longitude": -87.64401,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 13,
      "stAddress1": "Larrabee St & Webster Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "193"
    },
    {
      "id": 146,
      "stationName": "Loomis St & Jackson Blvd",
      "availableDocks": 7,
      "totalDocks": 11,
      "latitude": 41.877945,
      "longitude": -87.662007,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Loomis St & Jackson Blvd",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "206"
    },
    {
      "id": 147,
      "stationName": "Indiana Ave & 26th St",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.8457,
      "longitude": -87.62248,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Indiana Ave & 26th St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "212"
    },
    {
      "id": 148,
      "stationName": "State St & 33rd St",
      "availableDocks": 3,
      "totalDocks": 11,
      "latitude": 41.834734,
      "longitude": -87.625813,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "State St & 33rd St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "216"
    },
    {
      "id": 149,
      "stationName": "Calumet Ave & 33rd St",
      "availableDocks": 5,
      "totalDocks": 11,
      "latitude": 41.8349,
      "longitude": -87.61793,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Calumet Ave & 33rd St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "217"
    },
    {
      "id": 150,
      "stationName": "Fort Dearborn Dr & 31st St",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.838556,
      "longitude": -87.608218,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Fort Dearborn Dr & 31st St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "220"
    },
    {
      "id": 152,
      "stationName": "Lincoln Ave & Diversey Pkwy",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.932225,
      "longitude": -87.658617,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Lincoln Ave & Diversey Pkwy",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "226"
    },
    {
      "id": 153,
      "stationName": "Southport Ave & Wellington Ave",
      "availableDocks": 7,
      "totalDocks": 19,
      "latitude": 41.935733,
      "longitude": -87.663576,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 12,
      "stAddress1": "Southport Ave & Wellington Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "228"
    },
    {
      "id": 154,
      "stationName": "Southport Ave & Belmont Ave",
      "availableDocks": 4,
      "totalDocks": 15,
      "latitude": 41.93949,
      "longitude": -87.66378,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Southport Ave & Belmont Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "229"
    },
    {
      "id": 156,
      "stationName": "Clark St & Wellington Ave",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.9364968219,
      "longitude": -87.6475386582,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Clark St & Wellington Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "232"
    },
    {
      "id": 157,
      "stationName": "Lake Shore Dr & Wellington Ave",
      "availableDocks": 4,
      "totalDocks": 15,
      "latitude": 41.936669,
      "longitude": -87.636794,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Lake Shore Dr & Wellington Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "234"
    },
    {
      "id": 158,
      "stationName": "Milwaukee Ave & Wabansia Ave",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.912616,
      "longitude": -87.681391,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Milwaukee Ave & Wabansia Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "243"
    },
    {
      "id": 159,
      "stationName": "Claremont Ave & Hirsch St",
      "availableDocks": 3,
      "totalDocks": 11,
      "latitude": 41.907781,
      "longitude": -87.685854,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "1451 N Claremont Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "245"
    },
    {
      "id": 160,
      "stationName": "Campbell Ave & North Ave",
      "availableDocks": 6,
      "totalDocks": 15,
      "latitude": 41.910535,
      "longitude": -87.689556,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Campbell Ave & North Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "257"
    },
    {
      "id": 162,
      "stationName": "Damen Ave & Wellington Ave",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.93588,
      "longitude": -87.67842,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Damen Ave & Wellington Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "268"
    },
    {
      "id": 163,
      "stationName": "Damen Ave & Clybourn Ave",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.931931,
      "longitude": -87.677856,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Damen Ave & Clybourn Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "271"
    },
    {
      "id": 164,
      "stationName": "Franklin St & Lake St",
      "availableDocks": 13,
      "totalDocks": 22,
      "latitude": 41.885837,
      "longitude": -87.6355,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Franklin St & Lake St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "272"
    },
    {
      "id": 165,
      "stationName": "Clark St & Grace St",
      "availableDocks": 14,
      "totalDocks": 19,
      "latitude": 41.95078,
      "longitude": -87.659172,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Clark St & Grace St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "275"
    },
    {
      "id": 166,
      "stationName": "Ashland Ave & Wrightwood Ave",
      "availableDocks": 5,
      "totalDocks": 15,
      "latitude": 41.92883,
      "longitude": -87.668507,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Ashland Ave & Wrightwood Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "296"
    },
    {
      "id": 167,
      "stationName": "Damen Ave & Coulter St",
      "availableDocks": 8,
      "totalDocks": 11,
      "latitude": 41.8492,
      "longitude": -87.67564,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 3,
      "stAddress1": "Damen Ave & Coulter St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "306"
    },
    {
      "id": 168,
      "stationName": "Michigan Ave & 14th St",
      "availableDocks": 4,
      "totalDocks": 19,
      "latitude": 41.864059,
      "longitude": -87.623727,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 15,
      "stAddress1": "Michigan Ave & 14th St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "310"
    },
    {
      "id": 169,
      "stationName": "Canal St & Harrison St",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.874337,
      "longitude": -87.639566,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Canal St & Harrison St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "326"
    },
    {
      "id": 170,
      "stationName": "Clinton St & 18th St",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.85795,
      "longitude": -87.640826,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Clinton St & 18th St",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "329"
    },
    {
      "id": 171,
      "stationName": "May St & Cullerton St",
      "availableDocks": 3,
      "totalDocks": 11,
      "latitude": 41.855136,
      "longitude": -87.654127,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "May St & Cullerton St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "331"
    },
    {
      "id": 173,
      "stationName": "Mies van der Rohe Way & Chicago Ave",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.89691,
      "longitude": -87.621743,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Mies van der Rohe Way & Chicago Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "338"
    },
    {
      "id": 174,
      "stationName": "Canal St & Madison St",
      "availableDocks": 8,
      "totalDocks": 23,
      "latitude": 41.882091,
      "longitude": -87.639833,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 13,
      "stAddress1": "Canal St & Madison St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "341"
    },
    {
      "id": 175,
      "stationName": "Wells St & Polk St",
      "availableDocks": 11,
      "totalDocks": 19,
      "latitude": 41.872373,
      "longitude": -87.633523,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Wells St & Polk St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "344"
    },
    {
      "id": 176,
      "stationName": "Clark St & Elm St",
      "availableDocks": 7,
      "totalDocks": 18,
      "latitude": 41.903233,
      "longitude": -87.631253,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Clark St & Elm St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "349"
    },
    {
      "id": 177,
      "stationName": "Theater on the Lake",
      "availableDocks": 17,
      "totalDocks": 23,
      "latitude": 41.926277,
      "longitude": -87.630834,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Theater on the Lake",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "350 "
    },
    {
      "id": 178,
      "stationName": "State St & 19th St",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.856594,
      "longitude": -87.627542,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "State St & 19th St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "408"
    },
    {
      "id": 179,
      "stationName": "MLK Jr Dr & Oakwood Blvd",
      "availableDocks": 12,
      "totalDocks": 15,
      "latitude": 41.82256,
      "longitude": -87.61615,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 3,
      "stAddress1": "MLK Jr Dr & Oakwood Blvd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "Off Steet",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "420"
    },
    {
      "id": 181,
      "stationName": "LaSalle St & Illinois St",
      "availableDocks": 23,
      "totalDocks": 31,
      "latitude": 41.890749,
      "longitude": -87.63206,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "LaSalle St & Illinois St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "On Street",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "430"
    },
    {
      "id": 183,
      "stationName": "Damen Ave & Augusta Blvd",
      "availableDocks": 4,
      "totalDocks": 15,
      "latitude": 41.899714,
      "longitude": -87.677234,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Damen Ave & Augusta Blvd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "142"
    },
    {
      "id": 184,
      "stationName": "State St & 35th St",
      "availableDocks": 6,
      "totalDocks": 19,
      "latitude": 41.83104,
      "longitude": -87.62688,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 13,
      "stAddress1": "State St & 35th St",
      "stAddress2": "W. 35th St",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "082"
    },
    {
      "id": 185,
      "stationName": "Stave St & Armitage Ave",
      "availableDocks": 4,
      "totalDocks": 11,
      "latitude": 41.917741,
      "longitude": -87.691392,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Stave St & Armitage Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "266"
    },
    {
      "id": 186,
      "stationName": "Ogden Ave & Race Ave",
      "availableDocks": 4,
      "totalDocks": 15,
      "latitude": 41.891795,
      "longitude": -87.658751,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Ogden Ave & Race Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "194"
    },
    {
      "id": 188,
      "stationName": "Greenview Ave & Fullerton Ave",
      "availableDocks": 5,
      "totalDocks": 15,
      "latitude": 41.92533,
      "longitude": -87.6658,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Greenview Ave & Fullerton Ave",
      "stAddress2": "",
      "city": "",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "295"
    },
    {
      "id": 190,
      "stationName": "Southport Ave & Wrightwood Ave",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.92888,
      "longitude": -87.66317,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Southport Ave & Wrightwood Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "298"
    },
    {
      "id": 191,
      "stationName": "Canal St & Monroe St",
      "availableDocks": 12,
      "totalDocks": 23,
      "latitude": 41.8807,
      "longitude": -87.63947,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Canal St & Monroe St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "056"
    },
    {
      "id": 192,
      "stationName": "Canal St & Adams St",
      "availableDocks": 10,
      "totalDocks": 35,
      "latitude": 41.879255,
      "longitude": -87.639904,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 24,
      "stAddress1": "Canal St & Adams St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "011"
    },
    {
      "id": 193,
      "stationName": "State St & 29th St",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.841707,
      "longitude": -87.626938,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "State St & 29th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "213"
    },
    {
      "id": 194,
      "stationName": "Wabash Ave & Wacker Pl",
      "availableDocks": 14,
      "totalDocks": 19,
      "latitude": 41.886875,
      "longitude": -87.62603,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Wabash Ave & Wacker Pl",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "339"
    },
    {
      "id": 195,
      "stationName": "Columbus Dr & Randolph St",
      "availableDocks": 27,
      "totalDocks": 31,
      "latitude": 41.884728,
      "longitude": -87.619521,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Columbus Dr & Randolph St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "263"
    },
    {
      "id": 196,
      "stationName": "Cityfront Plaza Dr & Pioneer Ct",
      "availableDocks": 15,
      "totalDocks": 19,
      "latitude": 41.890252,
      "longitude": -87.622105,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Cityfront Plaza Dr & Pioneer Ct",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "Off Street",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "427"
    },
    {
      "id": 197,
      "stationName": "Michigan Ave & Madison St",
      "availableDocks": 17,
      "totalDocks": 19,
      "latitude": 41.882134,
      "longitude": -87.625125,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 2,
      "stAddress1": "Michigan Ave & Madison St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "036"
    },
    {
      "id": 198,
      "stationName": "Halsted St & Madison St",
      "availableDocks": 8,
      "totalDocks": 19,
      "latitude": 41.88175,
      "longitude": -87.6478,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Halsted St & Madison St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "159"
    },
    {
      "id": 199,
      "stationName": "Wabash Ave & Grand Ave",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.891738,
      "longitude": -87.626937,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Wabash Ave & Grand Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "004"
    },
    {
      "id": 200,
      "stationName": "MLK Jr Dr & 47th St",
      "availableDocks": 7,
      "totalDocks": 11,
      "latitude": 41.809851,
      "longitude": -87.616279,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "MLK Jr Dr & 47th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "090"
    },
    {
      "id": 201,
      "stationName": "Indiana Ave & 40th St",
      "availableDocks": 8,
      "totalDocks": 11,
      "latitude": 41.82168,
      "longitude": -87.6216,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 3,
      "stAddress1": "Indiana Ave & 40th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "083"
    },
    {
      "id": 202,
      "stationName": "Halsted St & 18th St",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.857499,
      "longitude": -87.646277,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Halsted St & 18th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "099"
    },
    {
      "id": 203,
      "stationName": "Western Ave & 21st St",
      "availableDocks": 4,
      "totalDocks": 15,
      "latitude": 41.85394,
      "longitude": -87.685243,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Western Ave & 21st St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "091"
    },
    {
      "id": 204,
      "stationName": "Prairie Ave & Garfield Blvd",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.794853,
      "longitude": -87.618691,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Prairie Ave & Garfield Blvd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "101"
    },
    {
      "id": 205,
      "stationName": "Paulina St & 18th St",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.857901,
      "longitude": -87.668745,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Paulina St & 18th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "088"
    },
    {
      "id": 206,
      "stationName": "Halsted St & Archer Ave",
      "availableDocks": 6,
      "totalDocks": 15,
      "latitude": 41.847203,
      "longitude": -87.646795,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Halsted St & Archer Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "098"
    },
    {
      "id": 207,
      "stationName": "Emerald Ave & 28th St",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.84358,
      "longitude": -87.645368,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Emerald Ave & 28th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "399"
    },
    {
      "id": 208,
      "stationName": "Ashland Ave & 21st St",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.85381,
      "longitude": -87.665897,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Ashland Ave & 21st St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "307"
    },
    {
      "id": 209,
      "stationName": "Normal Ave & Archer Ave",
      "availableDocks": 6,
      "totalDocks": 11,
      "latitude": 41.849527,
      "longitude": -87.640591,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Normal Ave & Archer Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "308"
    },
    {
      "id": 210,
      "stationName": "Ashland Ave & Division St",
      "availableDocks": 14,
      "totalDocks": 19,
      "latitude": 41.90345,
      "longitude": -87.667747,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Ashland Ave & Division St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "061"
    },
    {
      "id": 211,
      "stationName": "St Clair St & Erie St",
      "availableDocks": 15,
      "totalDocks": 19,
      "latitude": 41.894448,
      "longitude": -87.622663,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "St Clair St & Erie St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "016"
    },
    {
      "id": 212,
      "stationName": "Wells St & Hubbard St",
      "availableDocks": 25,
      "totalDocks": 30,
      "latitude": 41.889933,
      "longitude": -87.634262,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Wells St & Hubbard St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "264"
    },
    {
      "id": 213,
      "stationName": "Leavitt St & North Ave",
      "availableDocks": 14,
      "totalDocks": 15,
      "latitude": 41.910153,
      "longitude": -87.68229,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 1,
      "stAddress1": "Leavitt St & North Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "244"
    },
    {
      "id": 214,
      "stationName": "Damen Ave & Grand Ave",
      "availableDocks": 4,
      "totalDocks": 15,
      "latitude": 41.89122,
      "longitude": -87.67686,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Damen Ave & Grand Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "141"
    },
    {
      "id": 215,
      "stationName": "Damen Ave & Madison St",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.88137,
      "longitude": -87.67493,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Damen Ave & Madison St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "134"
    },
    {
      "id": 216,
      "stationName": "California Ave & Division St",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.903029,
      "longitude": -87.697474,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "California Ave & Division St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "256"
    },
    {
      "id": 217,
      "stationName": "May St & Fulton St",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.886773,
      "longitude": -87.656001,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "May St & Fulton St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "197"
    },
    {
      "id": 218,
      "stationName": "Wells St & 19th St",
      "availableDocks": 6,
      "totalDocks": 11,
      "latitude": 41.856802,
      "longitude": -87.633879,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Wells St & 19th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "180"
    },
    {
      "id": 219,
      "stationName": "Damen Ave & Cortland St",
      "availableDocks": 6,
      "totalDocks": 11,
      "latitude": 41.916027,
      "longitude": -87.677411,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Damen Ave & Cortland St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "133"
    },
    {
      "id": 220,
      "stationName": "Hampden Ct & Diversey Pkwy",
      "availableDocks": 9,
      "totalDocks": 19,
      "latitude": 41.93262,
      "longitude": -87.642385,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Hampden Ct & Diversey Pkwy",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "123"
    },
    {
      "id": 222,
      "stationName": "Milwaukee Ave & Rockwell St",
      "availableDocks": 13,
      "totalDocks": 19,
      "latitude": 41.920195,
      "longitude": -87.693033,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Milwaukee Ave & Rockwell St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "242"
    },
    {
      "id": 223,
      "stationName": "Clifton Ave & Armitage Ave",
      "availableDocks": 3,
      "totalDocks": 15,
      "latitude": 41.918216,
      "longitude": -87.656936,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Clifton Ave & Armitage Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "185"
    },
    {
      "id": 224,
      "stationName": "Halsted St & Willow St",
      "availableDocks": 14,
      "totalDocks": 19,
      "latitude": 41.913778,
      "longitude": -87.64884,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Halsted St & Willow St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "181"
    },
    {
      "id": 225,
      "stationName": "Halsted St & Dickens Ave",
      "availableDocks": 5,
      "totalDocks": 15,
      "latitude": 41.919936,
      "longitude": -87.64883,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Halsted St & Dickens Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "192"
    },
    {
      "id": 226,
      "stationName": "Racine Ave & Belmont Ave",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.939743,
      "longitude": -87.658865,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Racine Ave & Belmont Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "230"
    },
    {
      "id": 227,
      "stationName": "Southport Ave & Waveland Ave",
      "availableDocks": 1,
      "totalDocks": 15,
      "latitude": 41.94815,
      "longitude": -87.66394,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 13,
      "stAddress1": "Southport Ave & Waveland Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "235"
    },
    {
      "id": 228,
      "stationName": "Damen Ave & Melrose Ave",
      "availableDocks": 0,
      "totalDocks": 11,
      "latitude": 41.9406,
      "longitude": -87.6785,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Damen Ave & Melrose Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "143"
    },
    {
      "id": 229,
      "stationName": "Southport Ave & Roscoe St",
      "availableDocks": 12,
      "totalDocks": 19,
      "latitude": 41.943739,
      "longitude": -87.66402,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Southport Ave & Roscoe St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "071"
    },
    {
      "id": 230,
      "stationName": "Lincoln Ave & Roscoe St",
      "availableDocks": 8,
      "totalDocks": 19,
      "latitude": 41.94334,
      "longitude": -87.67097,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Lincoln Ave & Roscoe St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "078"
    },
    {
      "id": 231,
      "stationName": "Sheridan Rd & Montrose Ave",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.96167,
      "longitude": -87.65464,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Sheridan Rd & Montrose Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "130"
    },
    {
      "id": 232,
      "stationName": "Pine Grove Ave & Waveland Ave",
      "availableDocks": 16,
      "totalDocks": 23,
      "latitude": 41.949275,
      "longitude": -87.646303,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Pine Grove Ave & Waveland Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "273"
    },
    {
      "id": 233,
      "stationName": "Sangamon St & Washington Blvd",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.883004,
      "longitude": -87.651148,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Sangamon St & Washington Blvd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "409"
    },
    {
      "id": 234,
      "stationName": "Clark St & Montrose Ave",
      "availableDocks": 11,
      "totalDocks": 19,
      "latitude": 41.961588,
      "longitude": -87.666036,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Clark St & Montrose Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "316"
    },
    {
      "id": 236,
      "stationName": "Sedgwick St & Schiller St",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.907576,
      "longitude": -87.638517,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Sedgwick St & Schiller St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "410"
    },
    {
      "id": 237,
      "stationName": "MLK Jr Dr & 29th St",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.842052,
      "longitude": -87.617,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "MLK Jr Dr & 29th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "214"
    },
    {
      "id": 238,
      "stationName": "Ravenswood Ave & Montrose Ave",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.961615,
      "longitude": -87.674365,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Ravenswood Ave & Montrose Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "092"
    },
    {
      "id": 239,
      "stationName": "Western Ave & Leland Ave",
      "availableDocks": 2,
      "totalDocks": 19,
      "latitude": 41.966555,
      "longitude": -87.688487,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 17,
      "stAddress1": "Western Ave & Leland Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "112"
    },
    {
      "id": 240,
      "stationName": "Sheridan Rd & Irving Park Rd",
      "availableDocks": 22,
      "totalDocks": 23,
      "latitude": 41.954245,
      "longitude": -87.654406,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 1,
      "stAddress1": "Sheridan Rd & Irving Park Rd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "063"
    },
    {
      "id": 241,
      "stationName": "Morgan St & Polk St",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.871737,
      "longitude": -87.65103,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Morgan St & Polk St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "168"
    },
    {
      "id": 242,
      "stationName": "Damen Ave & Leland Ave",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.967094,
      "longitude": -87.679028,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 2,
      "stAddress1": "Damen Ave & Leland Ave",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "093"
    },
    {
      "id": 243,
      "stationName": "Lincoln Ave & Leavitt St",
      "availableDocks": 6,
      "totalDocks": 15,
      "latitude": 41.962391,
      "longitude": -87.684146,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Lincoln Ave & Leavitt St",
      "stAddress2": "",
      "city": "Chicago ",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "126"
    },
    {
      "id": 244,
      "stationName": "Ravenswood Ave & Irving Park Rd",
      "availableDocks": 13,
      "totalDocks": 19,
      "latitude": 41.95469,
      "longitude": -87.67393,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Ravenswood Ave & Irving Park Rd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "087"
    },
    {
      "id": 245,
      "stationName": "Clarendon Ave & Junior Ter",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.961004,
      "longitude": -87.649603,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Clarendon Ave & Junior Ter",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "389"
    },
    {
      "id": 246,
      "stationName": "Ashland Ave & Belle Plaine Ave",
      "availableDocks": 5,
      "totalDocks": 11,
      "latitude": 41.956061,
      "longitude": -87.668869,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Ashland Ave & Belle Plaine Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "249"
    },
    {
      "id": 247,
      "stationName": "Shore Drive & 55th St",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.795212,
      "longitude": -87.580715,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Shore Drive & 55th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "361"
    },
    {
      "id": 248,
      "stationName": "Woodlawn Ave & 55th St",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.795264,
      "longitude": -87.596471,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Woodlawn Ave & 55th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "362"
    },
    {
      "id": 249,
      "stationName": "Montrose Harbor",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.963982,
      "longitude": -87.638181,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Montrose Harbor",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "388"
    },
    {
      "id": 250,
      "stationName": "Ashland Ave & Wellington Ave",
      "availableDocks": 12,
      "totalDocks": 19,
      "latitude": 41.936083,
      "longitude": -87.669807,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Ashland Ave & Wellington Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "269"
    },
    {
      "id": 251,
      "stationName": "Clarendon Ave & Leland Ave",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.967968,
      "longitude": -87.650001,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Clarendon Ave & Leland Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "385"
    },
    {
      "id": 252,
      "stationName": "Greenwood Ave & 47th St",
      "availableDocks": 12,
      "totalDocks": 15,
      "latitude": 41.809835,
      "longitude": -87.599383,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 3,
      "stAddress1": "Greenwood Ave & 47th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "396"
    },
    {
      "id": 253,
      "stationName": "Clifton Ave & Lawrence Ave",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.968873,
      "longitude": -87.658857,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Clifton Ave & Lawrence Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "104"
    },
    {
      "id": 254,
      "stationName": "Pine Grove Ave & Irving Park Rd",
      "availableDocks": 3,
      "totalDocks": 15,
      "latitude": 41.954383,
      "longitude": -87.648043,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 12,
      "stAddress1": "Pine Grove Ave & Irving Park Rd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "324"
    },
    {
      "id": 255,
      "stationName": "Indiana Ave & Roosevelt Rd",
      "availableDocks": 15,
      "totalDocks": 31,
      "latitude": 41.867888,
      "longitude": -87.623041,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 16,
      "stAddress1": "Indiana Ave & Roosevelt Rd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "309"
    },
    {
      "id": 256,
      "stationName": "Broadway & Sheridan Rd",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.952833,
      "longitude": -87.649993,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Broadway & Sheridan Rd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "323"
    },
    {
      "id": 257,
      "stationName": "Lincoln Ave & Waveland Ave",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.94911,
      "longitude": -87.675112,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Lincoln Ave & Waveland Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "253"
    },
    {
      "id": 258,
      "stationName": "Logan Blvd & Elston Ave",
      "availableDocks": 10,
      "totalDocks": 19,
      "latitude": 41.930584,
      "longitude": -87.685126,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Logan Blvd & Elston Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "145"
    },
    {
      "id": 259,
      "stationName": "California Ave & Francis Pl",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.91855,
      "longitude": -87.69723,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "California Ave & Francis Pl",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "259"
    },
    {
      "id": 260,
      "stationName": "Kedzie Ave & Milwaukee Ave",
      "availableDocks": 12,
      "totalDocks": 19,
      "latitude": 41.929567,
      "longitude": -87.707857,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Kedzie Ave & Milwaukee Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "085"
    },
    {
      "id": 261,
      "stationName": "Hermitage Ave & Polk St",
      "availableDocks": 13,
      "totalDocks": 15,
      "latitude": 41.871514,
      "longitude": -87.669886,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 2,
      "stAddress1": "Hermitage Ave & Polk St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "080"
    },
    {
      "id": 262,
      "stationName": "Halsted St & 37th St",
      "availableDocks": 6,
      "totalDocks": 11,
      "latitude": 41.827071,
      "longitude": -87.645801,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Halsted St & 37th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "On Street",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "414"
    },
    {
      "id": 263,
      "stationName": "Rhodes Ave & 32nd St",
      "availableDocks": 7,
      "totalDocks": 11,
      "latitude": 41.836208,
      "longitude": -87.613533,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Rhodes Ave & 32nd St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "215"
    },
    {
      "id": 264,
      "stationName": "Stetson Ave & South Water St",
      "availableDocks": 2,
      "totalDocks": 19,
      "latitude": 41.886835,
      "longitude": -87.62232,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 17,
      "stAddress1": "Stetson Ave & South Water St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "048"
    },
    {
      "id": 265,
      "stationName": "Cottage Grove Ave & Oakwood Blvd",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.822985,
      "longitude": -87.6071,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Cottage Grove Ave & Oakwood Blvd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "346"
    },
    {
      "id": 267,
      "stationName": "Lake Park Ave & 47th St",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.809443,
      "longitude": -87.591875,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Lake Park Ave & 47th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "117"
    },
    {
      "id": 268,
      "stationName": "Lake Shore Dr & North Blvd",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.911722,
      "longitude": -87.626804,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Lake Shore Dr & North Blvd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "328"
    },
    {
      "id": 271,
      "stationName": "Cottage Grove Ave & 43rd St",
      "availableDocks": 9,
      "totalDocks": 11,
      "latitude": 41.816499,
      "longitude": -87.606582,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 2,
      "stAddress1": "Cottage Grove Ave & 43rd St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "086"
    },
    {
      "id": 272,
      "stationName": "Indiana Ave & 31st St",
      "availableDocks": 1,
      "totalDocks": 11,
      "latitude": 41.838842,
      "longitude": -87.621857,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Indiana Ave & 31st St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "219"
    },
    {
      "id": 273,
      "stationName": "Michigan Ave & 18th St",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.857937,
      "longitude": -87.623633,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Michigan Ave & 18th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "150"
    },
    {
      "id": 274,
      "stationName": "Racine Ave & 15th St",
      "availableDocks": 4,
      "totalDocks": 15,
      "latitude": 41.861267,
      "longitude": -87.656625,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Racine Ave & 15th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "304"
    },
    {
      "id": 275,
      "stationName": "Ashland Ave & 13th St",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.865234,
      "longitude": -87.666507,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Ashland Ave & 13th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "354"
    },
    {
      "id": 276,
      "stationName": "California Ave & North Ave",
      "availableDocks": 5,
      "totalDocks": 11,
      "latitude": 41.91044,
      "longitude": -87.6972,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "California Ave & North Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "258"
    },
    {
      "id": 277,
      "stationName": "Ashland Ave & Grand Ave",
      "availableDocks": 5,
      "totalDocks": 15,
      "latitude": 41.891072,
      "longitude": -87.666611,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Ashland Ave & Grand Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "Off Street",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "434"
    },
    {
      "id": 278,
      "stationName": "Wallace St & 35th St",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.830629,
      "longitude": -87.64129,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Wallace St & 35th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "On Street",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "417"
    },
    {
      "id": 279,
      "stationName": "Halsted St & 35th St",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.830661,
      "longitude": -87.647172,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Halsted St & 35th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "413"
    },
    {
      "id": 280,
      "stationName": "Morgan St & 31st St",
      "availableDocks": 5,
      "totalDocks": 11,
      "latitude": 41.8378,
      "longitude": -87.65114,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Morgan St & 31st St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "097"
    },
    {
      "id": 281,
      "stationName": "Western Ave & 24th St",
      "availableDocks": 8,
      "totalDocks": 11,
      "latitude": 41.84847,
      "longitude": -87.685109,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 3,
      "stAddress1": "Western Ave & 24th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "393"
    },
    {
      "id": 282,
      "stationName": "Halsted St & Maxwell St",
      "availableDocks": 6,
      "totalDocks": 15,
      "latitude": 41.86458,
      "longitude": -87.64693,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Halsted St & Maxwell St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "161"
    },
    {
      "id": 283,
      "stationName": "LaSalle St & Jackson Blvd",
      "availableDocks": 26,
      "totalDocks": 31,
      "latitude": 41.87817,
      "longitude": -87.631985,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "LaSalle St & Jackson Blvd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "032"
    },
    {
      "id": 284,
      "stationName": "Michigan Ave & Jackson Blvd",
      "availableDocks": 14,
      "totalDocks": 23,
      "latitude": 41.87785,
      "longitude": -87.62408,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Michigan Ave & Jackson Blvd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "340"
    },
    {
      "id": 285,
      "stationName": "Wood St & Grand Ave",
      "availableDocks": 11,
      "totalDocks": 15,
      "latitude": 41.89113,
      "longitude": -87.67203,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Wood St & Grand Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "On Street",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "432"
    },
    {
      "id": 286,
      "stationName": "Franklin St & Quincy St",
      "availableDocks": 20,
      "totalDocks": 23,
      "latitude": 41.878724,
      "longitude": -87.634793,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 2,
      "stAddress1": "Franklin St & Quincy St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "007"
    },
    {
      "id": 287,
      "stationName": "Franklin St & Arcade Pl",
      "availableDocks": 22,
      "totalDocks": 27,
      "latitude": 41.881469,
      "longitude": -87.635177,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Franklin St & Arcade Pl",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "057"
    },
    {
      "id": 288,
      "stationName": "Larrabee St & Armitage Ave",
      "availableDocks": 4,
      "totalDocks": 11,
      "latitude": 41.91797,
      "longitude": -87.64368,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Larrabee St & Armitage Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "184"
    },
    {
      "id": 289,
      "stationName": "Wells St & Concord Ln",
      "availableDocks": 7,
      "totalDocks": 19,
      "latitude": 41.912202,
      "longitude": -87.634664,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 12,
      "stAddress1": "Wells St & Concord Ln",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "182"
    },
    {
      "id": 290,
      "stationName": "Kedzie Ave & Palmer Ct",
      "availableDocks": 3,
      "totalDocks": 15,
      "latitude": 41.921525,
      "longitude": -87.707322,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 12,
      "stAddress1": "Kedzie Ave & Palmer Ct",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "292"
    },
    {
      "id": 291,
      "stationName": "Wells St & Evergreen Ave",
      "availableDocks": 7,
      "totalDocks": 19,
      "latitude": 41.906724,
      "longitude": -87.63483,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 12,
      "stAddress1": "Wells St & Evergreen Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "302"
    },
    {
      "id": 292,
      "stationName": "Southport Ave & Clark St",
      "availableDocks": 8,
      "totalDocks": 11,
      "latitude": 41.957081,
      "longitude": -87.664199,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 3,
      "stAddress1": "Southport Ave & Clark St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "317"
    },
    {
      "id": 293,
      "stationName": "Broadway & Wilson Ave",
      "availableDocks": 10,
      "totalDocks": 19,
      "latitude": 41.965485,
      "longitude": -87.657238,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Broadway & Wilson Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "074"
    },
    {
      "id": 294,
      "stationName": "Broadway & Berwyn Ave",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.978353,
      "longitude": -87.659753,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Broadway & Berwyn Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "109"
    },
    {
      "id": 295,
      "stationName": "Broadway & Argyle St",
      "availableDocks": 3,
      "totalDocks": 15,
      "latitude": 41.972972,
      "longitude": -87.659637,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 12,
      "stAddress1": "Broadway & Argyle St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "108"
    },
    {
      "id": 296,
      "stationName": "Broadway & Belmont Ave",
      "availableDocks": 12,
      "totalDocks": 15,
      "latitude": 41.940106,
      "longitude": -87.645451,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 2,
      "stAddress1": "Broadway & Belmont Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "277"
    },
    {
      "id": 297,
      "stationName": "Paulina St & Montrose Ave",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.961507,
      "longitude": -87.671387,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Paulina St & Montrose Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "250"
    },
    {
      "id": 298,
      "stationName": "Lincoln Ave & Belle Plaine Ave",
      "availableDocks": 3,
      "totalDocks": 15,
      "latitude": 41.955927,
      "longitude": -87.679259,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 12,
      "stAddress1": "Lincoln Ave & Belle Plaine Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "252"
    },
    {
      "id": 299,
      "stationName": "Halsted St & Roscoe St",
      "availableDocks": 3,
      "totalDocks": 15,
      "latitude": 41.94367,
      "longitude": -87.64895,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 12,
      "stAddress1": "Halsted St & Roscoe St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "127"
    },
    {
      "id": 300,
      "stationName": "Broadway & Barry Ave",
      "availableDocks": 14,
      "totalDocks": 19,
      "latitude": 41.937725,
      "longitude": -87.644095,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Broadway & Barry Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "137"
    },
    {
      "id": 301,
      "stationName": "Clark St & Schiller St",
      "availableDocks": 4,
      "totalDocks": 19,
      "latitude": 41.907993,
      "longitude": -87.631501,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 15,
      "stAddress1": "Clark St & Schiller St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "200"
    },
    {
      "id": 302,
      "stationName": "Sheffield Ave & Wrightwood Ave",
      "availableDocks": 14,
      "totalDocks": 19,
      "latitude": 41.928712,
      "longitude": -87.653833,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Sheffield Ave & Wrightwood Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "211"
    },
    {
      "id": 303,
      "stationName": "Broadway & Cornelia Ave",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.945512,
      "longitude": -87.64598,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Broadway & Cornelia Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "278"
    },
    {
      "id": 304,
      "stationName": "Halsted St & Waveland Ave",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.949375,
      "longitude": -87.649626,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Halsted St & Waveland Ave",
      "stAddress2": "Halsted St & Waveland Ave",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "325"
    },
    {
      "id": 305,
      "stationName": "Western Ave & Division St",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.902893,
      "longitude": -87.687275,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Western Ave & Division St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "241"
    },
    {
      "id": 306,
      "stationName": "Sheridan Rd & Buena Ave",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.9584,
      "longitude": -87.65423,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Sheridan Rd & Buena Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "374"
    },
    {
      "id": 307,
      "stationName": "Southport Ave & Clybourn Ave",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.920445,
      "longitude": -87.663095,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Southport Ave & Clybourn Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "186"
    },
    {
      "id": 308,
      "stationName": "Seeley Ave & Roscoe St",
      "availableDocks": 1,
      "totalDocks": 11,
      "latitude": 41.943403,
      "longitude": -87.679618,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Seeley Ave & Roscoe St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "144"
    },
    {
      "id": 309,
      "stationName": "Leavitt St & Armitage Ave",
      "availableDocks": 7,
      "totalDocks": 11,
      "latitude": 41.917805,
      "longitude": -87.682437,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Leavitt St & Armitage Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "286"
    },
    {
      "id": 310,
      "stationName": "Damen Ave & Charleston St",
      "availableDocks": 6,
      "totalDocks": 11,
      "latitude": 41.920082,
      "longitude": -87.677855,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Damen Ave & Charleston St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "288"
    },
    {
      "id": 311,
      "stationName": "Leavitt St & Lawrence Ave",
      "availableDocks": 8,
      "totalDocks": 19,
      "latitude": 41.968885,
      "longitude": -87.684001,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Leavitt St & Lawrence Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "237"
    },
    {
      "id": 312,
      "stationName": "Clarendon Ave & Gordon Ter",
      "availableDocks": 6,
      "totalDocks": 15,
      "latitude": 41.957879,
      "longitude": -87.649519,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Clarendon Ave & Gordon Ter",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "379"
    },
    {
      "id": 313,
      "stationName": "Lakeview Ave & Fullerton Pkwy",
      "availableDocks": 9,
      "totalDocks": 19,
      "latitude": 41.925858,
      "longitude": -87.638973,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Lakeview Ave & Fullerton Pkwy",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "147"
    },
    {
      "id": 314,
      "stationName": "Ravenswood Ave & Berteau Ave",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.957921,
      "longitude": -87.673567,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Ravenswood Ave & Berteau Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "251"
    },
    {
      "id": 315,
      "stationName": "Leavitt St & Hirsch St",
      "availableDocks": 3,
      "totalDocks": 11,
      "latitude": 41.906717,
      "longitude": -87.682779,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Leavitt St & Hirsch St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "255"
    },
    {
      "id": 316,
      "stationName": "Damen Ave & Sunnyside Ave",
      "availableDocks": 19,
      "totalDocks": 19,
      "latitude": 41.96325,
      "longitude": -87.679258,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 0,
      "stAddress1": "Damen Ave & Sunnyside Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "315"
    },
    {
      "id": 317,
      "stationName": "Wood St & Taylor St",
      "availableDocks": 12,
      "totalDocks": 15,
      "latitude": 41.869154,
      "longitude": -87.671045,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 3,
      "stAddress1": "Wood St & Taylor St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "285"
    },
    {
      "id": 318,
      "stationName": "Southport Ave & Irving Park Rd",
      "availableDocks": 4,
      "totalDocks": 15,
      "latitude": 41.954177,
      "longitude": -87.664358,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Southport Ave & Irving Park Rd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "321"
    },
    {
      "id": 319,
      "stationName": "Greenview Ave & Diversey Pkwy",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.932595,
      "longitude": -87.665939,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Greenview Ave & Diversey Pkwy",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "294"
    },
    {
      "id": 320,
      "stationName": "Loomis St & Lexington St",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.872187,
      "longitude": -87.661501,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Loomis St & Lexington St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "332"
    },
    {
      "id": 321,
      "stationName": "Wabash Ave & 8th St",
      "availableDocks": 11,
      "totalDocks": 19,
      "latitude": 41.871962,
      "longitude": -87.626106,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Wabash Ave & 8th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "054"
    },
    {
      "id": 322,
      "stationName": "Kimbark Ave & 53rd St",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.799568,
      "longitude": -87.594747,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Kimbark Ave & 53rd St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "397"
    },
    {
      "id": 323,
      "stationName": "Sheridan Rd & Lawrence Ave",
      "availableDocks": 4,
      "totalDocks": 15,
      "latitude": 41.969517,
      "longitude": -87.654691,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 11,
      "stAddress1": "Sheridan Rd & Lawrence Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "384"
    },
    {
      "id": 324,
      "stationName": "Stockton Dr & Wrightwood Ave",
      "availableDocks": 5,
      "totalDocks": 15,
      "latitude": 41.93132,
      "longitude": -87.638742,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Stockton Dr & Wrightwood Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "276"
    },
    {
      "id": 325,
      "stationName": "Clark St & Winnemac Ave",
      "availableDocks": 6,
      "totalDocks": 15,
      "latitude": 41.973385,
      "longitude": -87.668365,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Clark St & Winnemac Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "392"
    },
    {
      "id": 326,
      "stationName": "Clark St & Leland Ave",
      "availableDocks": 8,
      "totalDocks": 11,
      "latitude": 41.967096,
      "longitude": -87.667429,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 3,
      "stAddress1": "Clark St & Leland Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "239"
    },
    {
      "id": 327,
      "stationName": "Sheffield Ave & Webster Ave",
      "availableDocks": 13,
      "totalDocks": 19,
      "latitude": 41.921687,
      "longitude": -87.653714,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Sheffield Ave & Webster Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "188"
    },
    {
      "id": 328,
      "stationName": "Ellis Ave & 58th St",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.788746,
      "longitude": -87.601334,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Ellis Ave & 58th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "365"
    },
    {
      "id": 329,
      "stationName": "Lake Shore Dr & Diversey Pkwy",
      "availableDocks": 6,
      "totalDocks": 15,
      "latitude": 41.932684,
      "longitude": -87.63625,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 9,
      "stAddress1": "Lake Shore Dr & Diversey Pkwy",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "347"
    },
    {
      "id": 330,
      "stationName": "Lincoln Ave & Addison St",
      "availableDocks": 8,
      "totalDocks": 19,
      "latitude": 41.946176,
      "longitude": -87.673308,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Lincoln Ave & Addison St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "077"
    },
    {
      "id": 331,
      "stationName": "Halsted St & Blackhawk St",
      "availableDocks": 9,
      "totalDocks": 19,
      "latitude": 41.90854,
      "longitude": -87.648568,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Halsted St & Blackhawk St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "176"
    },
    {
      "id": 332,
      "stationName": "Halsted St & Diversey Pkwy",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.933341,
      "longitude": -87.648747,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Halsted St & Diversey Pkwy",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "208"
    },
    {
      "id": 333,
      "stationName": "Ashland Ave & Blackhawk St",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.907066,
      "longitude": -87.667252,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Ashland Ave & Blackhawk St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "224"
    },
    {
      "id": 334,
      "stationName": "Lake Shore Dr & Belmont Ave",
      "availableDocks": 8,
      "totalDocks": 19,
      "latitude": 41.940775,
      "longitude": -87.639192,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 10,
      "stAddress1": "Lake Shore Dr & Belmont Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "233"
    },
    {
      "id": 335,
      "stationName": "Calumet Ave & 35th St",
      "availableDocks": 10,
      "totalDocks": 15,
      "latitude": 41.831379,
      "longitude": -87.618034,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Calumet Ave & 35th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "345"
    },
    {
      "id": 336,
      "stationName": "Cottage Grove Ave & 47th St",
      "availableDocks": 10,
      "totalDocks": 11,
      "latitude": 41.809855,
      "longitude": -87.606755,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 1,
      "stAddress1": "Cottage Grove Ave & 47th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "Off Street",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "422"
    },
    {
      "id": 337,
      "stationName": "Clark St & Chicago Ave",
      "availableDocks": 3,
      "totalDocks": 19,
      "latitude": 41.896544,
      "longitude": -87.630931,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 16,
      "stAddress1": "Clark St & Chicago Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "303"
    },
    {
      "id": 338,
      "stationName": "Calumet Ave & 18th St",
      "availableDocks": 2,
      "totalDocks": 15,
      "latitude": 41.857611,
      "longitude": -87.619407,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 13,
      "stAddress1": "Calumet Ave & 18th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "102"
    },
    {
      "id": 339,
      "stationName": "Emerald Ave & 31st St",
      "availableDocks": 4,
      "totalDocks": 11,
      "latitude": 41.838198,
      "longitude": -87.645143,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Emerald Ave & 31st St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "404"
    },
    {
      "id": 340,
      "stationName": "Clark St & Wrightwood Ave",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.929546,
      "longitude": -87.643118,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Clark St & Wrightwood Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "209"
    },
    {
      "id": 341,
      "stationName": "Adler Planetarium",
      "availableDocks": 15,
      "totalDocks": 19,
      "latitude": 41.866095,
      "longitude": -87.607267,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 4,
      "stAddress1": "Adler Planetarium",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "Off Street",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "431"
    },
    {
      "id": 342,
      "stationName": "Wolcott Ave & Polk St",
      "availableDocks": 14,
      "totalDocks": 15,
      "latitude": 41.871262,
      "longitude": -87.673688,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 1,
      "stAddress1": "Wolcott Ave & Polk St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "284"
    },
    {
      "id": 343,
      "stationName": "Racine Ave & Wrightwood Ave",
      "availableDocks": 5,
      "totalDocks": 15,
      "latitude": 41.928887,
      "longitude": -87.658971,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Racine Ave & Wrightwood Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "297"
    },
    {
      "id": 344,
      "stationName": "Ravenswood Ave & Lawrence Ave",
      "availableDocks": 17,
      "totalDocks": 19,
      "latitude": 41.96909,
      "longitude": -87.674237,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 1,
      "stAddress1": "Ravenswood Ave & Lawrence Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "026"
    },
    {
      "id": 345,
      "stationName": "Lake Park Ave & 56th St",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.793242,
      "longitude": -87.587782,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Lake Park Ave & 56th St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "119"
    },
    {
      "id": 346,
      "stationName": "Ada St & Washington Blvd",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.88283,
      "longitude": -87.661206,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 6,
      "stAddress1": "Ada St & Washington Blvd",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "353"
    },
    {
      "id": 347,
      "stationName": "Ashland Ave & Grace St",
      "availableDocks": 7,
      "totalDocks": 15,
      "latitude": 41.950687,
      "longitude": -87.6687,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 8,
      "stAddress1": "Ashland Ave & Grace St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "319"
    },
    {
      "id": 348,
      "stationName": "California Ave & 21st St",
      "availableDocks": 2,
      "totalDocks": 15,
      "latitude": 41.854016,
      "longitude": -87.695445,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 13,
      "stAddress1": "California Ave & 21st St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "096"
    },
    {
      "id": 349,
      "stationName": "Halsted St & Wrightwood Ave",
      "availableDocks": 9,
      "totalDocks": 15,
      "latitude": 41.929143,
      "longitude": -87.649077,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 5,
      "stAddress1": "Halsted St & Wrightwood Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "210"
    },
    {
      "id": 350,
      "stationName": "Ashland Ave & Chicago Ave",
      "availableDocks": 3,
      "totalDocks": 15,
      "latitude": 41.895966,
      "longitude": -87.667747,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 12,
      "stAddress1": "Ashland Ave & Chicago Ave",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "247"
    },
    {
      "id": 351,
      "stationName": "Cottage Grove Ave & 51st St",
      "availableDocks": 8,
      "totalDocks": 15,
      "latitude": 41.803038,
      "longitude": -87.606615,
      "statusValue": "In Service",
      "statusKey": 1,
      "availableBikes": 7,
      "stAddress1": "Cottage Grove Ave & 51st St",
      "stAddress2": "",
      "city": "Chicago",
      "postalCode": "",
      "location": "Off Street",
      "altitude": "",
      "testStation": false,
      "lastCommunicationTime": null,
      "landMark": "440"
    }
]
},{}],"app":[function(require,module,exports){
var Backbone = require('backbone');
var Stations = require('collections/stations');

var data = require('../sampledata/divvy_stations.json');
console.log(data);
var stations = new Stations(data);
module.exports = stations;
},{"../sampledata/divvy_stations.json":5,"backbone":1,"collections/stations":3}]},{},[]);
