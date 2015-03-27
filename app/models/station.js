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