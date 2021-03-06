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
        var routeData = this.route.data;
        var friend_id = this.route.params.id;

        var model = this.model = new Model(this.$el, {
            title: '备注',
            text: routeData.memo,
            origin: routeData.memo
        });

        model.save = function () {
            var memo = this.get('text');
            contact.setFriendMemo(friend_id, memo).then(function () {
                Toast.showToast("修改成功！");
                self.setResult("friendMemoChange:" + friend_id, memo);
                model.back();

            }).catch(function (e) {
                Toast.showToast(e.message);
            });
        }

        model.back = function () {
            self.back(self.swipeRightBackAction)
        }

        var loader = this.loader = new Loader(this.$el);

        loader.showLoading();

        Promise.all([this.waitLoad()]).then(function (results) {

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
