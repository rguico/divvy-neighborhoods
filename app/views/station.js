var $ = require('jquery-untouched');
var Backbone = require('backbone');
var _ = require('underscore');
var StationView = Backbone.View.extend({
    tagName: 'article',
    className: 'station',
    template: '<h1><a href="/#stations/<%= id %>"><%= stationName %><hr/></h1>',
    initialize: function (options) {
        this.listenTo(this.model, 'change:selected', this.render);
        this.router = options.router;
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
        if (!this.model.get('selected')) {
            this.model.collection.resetSelected();
            this.model.collection.selectByID(this.model.id);
            this.router.navigate('stations/' + this.model.id, {trigger: true, replace: true});
        }
    }
});
module.exports = StationView;