var Backbone = require('backbone');

var StationView = require('views/station');
var StationsList = Backbone.View.extend({
	tagName: 'section',

	render: function() {
		var stationsView = this.collection.map(function(station) {
			return (new StationView({model: station})).render().el;
		});
		this.$el.html(stationsView);
		return this;
	}
});
module.exports = StationsList;