'use strict';

var Backbone = require('backbone');

var StationsList = require('views/stationList');

var Layout = Backbone.View.extend({

	render: function () {
		this.$el.append(this.stationsList.render().el);
		return this;
	},

	initialize: function (options) {
		this.stationsList = new StationsList({
			el: options.el,
			collection: options.collection,
			router: options.router
		});
	}
});

var instance;
Layout.getInstance = function (options) {
	if (!instance) {
		instance = new Layout({
			el: options.el,
			collection: options.collection,
			router: options.router
		});
	}
	return instance;
};

module.exports = Layout;