var Backbone = require('backbone');
var $ = require('jquery-untouched');
Backbone.$ = $;
var Stations = require('collections/stations');
var data = require('../sampledata/divvy_stations.json');

var StationView = require('views/station');
var stations = new Stations(data);

var StationsList = require('views/stationList');


module.exports = {
	stations: stations,
	StationView: StationView,
	StationsList: StationsList
};