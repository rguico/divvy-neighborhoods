var Backbone = require('backbone');

// data
var Stations = require('collections/stations');
var data = require('../../../static/divvy_stations.json');
var stationModel = new Stations(data);

// views
var StationList = require('views/stationList');

var Layout = require('views/layout');

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
		this.layout = Layout.getInstance({
			el: '#stations',
			collection: this.stations,
			router: this
		})
		this.layout.render();
	}
});
module.exports = StationsRouter;