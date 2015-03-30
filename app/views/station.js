var $ = require('jquery-untouched');
var Backbone = require('backbone');
var _ = require('underscore');
var StationView = Backbone.View.extend({
    tagName: 'article',
    className: 'station',
    template: '<div><%= stationName %></div>',
    initialize: function () {
        this.listenTo(this.model, 'change:selected', this.render);
    },
    render: function () {
        var tmpl = _.template(this.template);
        this.$el.html(tmpl(this.model.toJSON()));
        this.$el.toggleClass('selected', this.model.get('selected'));
        return this;
    },
    events: {
        'click': '_selectStation'
    },
    _selectStation: function (ev) {
        ev.preventDefault();
        if (!this.model.get('selected')) {
            this.model.collection.resetSelected();
            this.model.collection.selectByID(this.model.id);
        }
    }
});
module.exports = StationView;