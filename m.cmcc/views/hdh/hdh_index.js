var $ = require('$');
var util = require('util');
var Activity = require('activity');
var Loader = require('widget/loader');
var Model = require('core/model2').Model;
var Promise = require('promise');
var Toast = require('widget/toast');
var popup = require('widget/popup');

var hdh = require('logical/hdh');


module.exports = Activity.extend({

    onCreate: function() {
        var self = this;
        var loader = this.loader = new Loader(this.$el);

        var model = this.model = new Model(this.$el, {
            title: '和多号',
            selected: 0
        });

        model.back = function() {
            self.back(self.swipeRightBackAction)
        }

        model.sendSms = function() {
            if (this.data.smsTime > 0) return;

            var phoneNo = this.data.poollist[this.get('selected')];

            if (!phoneNo) {
                Toast.showToast('请选择副号！');
                return;
            }
            hdh.bindEntitySms(phoneNo).catch(function(e) {
                Toast.showToast(e.message);
            });

            this.leftTime = Date.now() + 60 * 1000;

            this.timer = setInterval(function() {

                var left = Math.round((model.leftTime - Date.now()) / 1000);

                if (left <= 0) {
                    clearInterval(model.timer)
                    model.set({
                        smsTime: 0
                    })
                } else {
                    model.set({
                        smsTime: left
                    })
                }

            }, 1000)

            this.set({
                smsTime: 59
            })
        }

        model.bindEntityConfirm = function() {
            if (loader.isLoading) return;

            if (!this.data.poollist) return;

            var phoneNo = this.data.poollist[this.get('selected')];

            if (!phoneNo) {
                Toast.showToast('请选择副号！');
                return;
            }
            var smscode = this.get('sms');
            if (!smscode) {
                Toast.showToast('请输入验证码！');
                return;
            }

            loader.showLoading();

            hdh.bindEntityConfirm().then(function(res) {

            }).catch(function(e) {
                Toast.showToast(e.message);

            }).then(function() {
                loader.hideLoading();
            });
        }


        loader.showLoading();

        Promise.all([hdh.getPoolsub(), this.waitLoad()]).then(function(results) {
            var result = results[0];

            model.set(result.data);

            self.bindScrollTo(model.refs.main);

        }).catch(function(e) {
            Toast.showToast(e.message);

        }).then(function() {
            loader.hideLoading();
        });
    },

    onShow: function() {
        var self = this;
    },

    onDestory: function() {
        this.model.destroy();
    }
});