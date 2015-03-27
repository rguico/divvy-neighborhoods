var Backbone = require('backbone');
var Stations = require('collections/stations');
var data = require('../sampledata/divvy_stations.json');

var stations = new Stations(data);

module.exports = stations;