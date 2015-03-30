var Backbone = require('backbone');
var Station = require('models/station');
var Stations = Backbone.Collection.extend({
	model: Station,

  	resetSelected: function () {
    	this.each(function(model) {
      		model.set({"selected": false});
		});
	},

	selectByID: function (id) {
		this.resetSelected();
		var station = this.get({id: id});
		station.set({ "selected": true });
		return station.id;
	}

});
module.exports = Stations;