var Backbone = require('backbone');

var StationView = require('views/station');
var StationsList = Backbone.View.extend({
	tagName: 'section',

	initialize: function(options) {
		this.router = options.router;
	},

	render: function() {
		var self = this;
		var stationsView = this.collection.map(function(station) {
			return (new StationView({model: station, router: self.router})).render().el;
		});
		this.$el.html(stationsView);
		return this;
	}
});
module.exports = StationsList;