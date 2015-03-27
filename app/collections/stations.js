var Backbone = require('backbone');
var Station = require('models/station');
var Stations = Backbone.Collection.extend({
	model: Station
});
module.exports = Stations;