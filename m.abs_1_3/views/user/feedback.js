var $ = require('$');
var util = require('util');
var Activity = require('activity');
var Loader = require('widget/loader');
var popup = require('widget/popup');
var Model = require('core/model2').Model;

var api = require('models/api');

var imagePicker = require('components/imagePicker');
var userModel = require('models/user');

var bridge = require('bridge');

module.exports = Activity.extend({

    onCreate: function () {
        var self = this;

        var model = this.model = new Model(this.$el, {
            title: '意见与反馈',
            imgs: []
        });

        var user = userModel.get();

        model.back = function () {
            self.back(self.swipeRightBackAction);
        }

        model.selectImage = function () {

            if (this.get('imgs').length >= 4) {
                return;
            }

            imagePicker.show(false, function (res) {

                model.getModel('imgs').add({
                    id: res.id,
                    thumbnail: res.thumbnail
                })
            });
        }

        model.submit = function () {

            var content = this.data.content;
            if (!content) {
                Toast.showToast('请输入帖子正文');
                return;
            }

            var images = this.data.imgs;
            var postImages = null;

            if (images) {
                postImages = {};
                images.forEach(function (img, i) {
                    postImages["img" + i] = img.id;
                })
            }

            bridge.image.upload(api.ShopAPI.url('/api/user/AddSuggestion'), {
                pspcode: user.PSP_CODE,
                content: content

            }, images, function (res) {
                Toast.showToast(res.msg);

                if (res.success) {
                    userModel.set({
                        Avatars: self.model.data.src
                    });
                }

                loader.hideLoading();
            });
        }

        this.bindScrollTo(model.refs.main);
    },

    onShow: function () {
        var self = this;
    },

    onDestory: function () {
    }
});
