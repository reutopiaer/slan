var $ = require('$');
var util = require('util');
var Activity = require('activity');
var Loader = require('widget/loader');
var Model = require('core/model2').Model;
var Promise = require('promise');
var Toast = require('widget/toast');
var popup = require('widget/popup');

var contact = require('logical/contact');


module.exports = Activity.extend({

    onCreate: function () {
        var self = this;
        var type = this.route.query.type;
        var personId = this.route.params.id;

        var model = this.model = new Model(this.$el, {
            title: '详细资料'
        });

        model.back = function () {
            self.back(self.swipeRightBackAction)
        }

        var loader = this.loader = new Loader(this.$el);

        loader.showLoading();

        Promise.all([contact.person(personId), this.waitLoad()]).then(function (results) {

            model.set({
                person: results[0].data
            })

            self.bindScrollTo(model.refs.main);

        }).catch(function (e) {
            Toast.showToast(e.message);

        }).then(function () {
            loader.hideLoading();
        });
    },

    onShow: function () {
        var self = this;
    },

    onDestory: function () {
        this.model.destroy();
    }
});
