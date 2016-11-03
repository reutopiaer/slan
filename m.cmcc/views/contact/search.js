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

        var model = this.model = new Model(this.$el, {
        });

        model.back = function () {
            self.back(self.swipeRightBackAction)
        }

        var search = contact.createSearchLoader(model.refs.main, function (res) {
            model.set({
                isSearch: true,
                searchResult: res.data
            })

        }, function (res) {
            model.getModel('searchResult').append(res.data)
        });

        model.refs.searchform.onsubmit = function () {
            if (model.data.search) {
                var keywords = model.data.search;

                var params = {};
                if (/^d{11}$/.test(keywords)) {
                    params.account = keywords;
                } else if (/^\d+$/.test(keywords)) {
                    params.user_id = keywords;
                } else {
                    params.user_name = keywords;
                }

                search.clearParams()
                    .setParam(params).reload().catch(function (e) {
                        Toast.showToast(e.message);
                    });
            }
            return false;
        }

        var loader = this.loader = new Loader(this.$el);

        self.bindScrollTo(model.refs.main);
    },

    onShow: function () {
        var self = this;
        this.model.refs.search.focus();
    },

    onDestory: function () {
        this.model.destroy();
    }
});
