var Backbone = require('backbone');
var _ = require('underscore');

// data
var Stations = require('collections/stations');
var data = require('../../../static/divvy_stations.json');
var stationModel = new Stations(data);

// views
var StationList = require('views/stationList');

var StationsRouter = Backbone.Router.extend({
	routes: {
		'stations/:id': 'selectStation',
		'': 'showMain'
	},
	selectStation: function(id) {
		this.stations.resetSelected();
		this.stations.selectByID(id);
	},
	showMain: function() {
		this.stations.resetSelected();
	},
	initialize: function(options) {
		this.stations = stationModel;
		this.stationList = new StationList({
			el: options.el,
			collection: stationModel
		});
		_.extend(this.stationList, {router: this});
		this.stationList.render();
	}
});
module.exports = StationsRouter;