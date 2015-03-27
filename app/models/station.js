var Backbone = require('backbone');
var Station = Backbone.Model.extend({
	defaults: {
		name: 'default',
		address: 'default',
		address2: '',
		bikesAvailable: 0,
		docksAvailable: 0,
		selected: false
	}
})

module.exports = Station;