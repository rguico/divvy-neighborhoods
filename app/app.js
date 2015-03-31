var Backbone = require('backbone');
var $ = require('jquery-untouched');
Backbone.$ = $;
var StationsRouter = require('routers/stations');

$(document).ready(function () {
	console.log("Divvy Neighborhoods v.0.0.1!");

	var router = new StationsRouter({el: $('#stations') });
	Backbone.history.start({
		pushState: false,
		root: '/'
	});
});