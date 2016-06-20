var api = require('models/api');
var model = require('core/model');
var Event = require('core/event');
var util = require('util');
var $ = require('$');
var State = model.State;

var User = {
    get: function () {
        var user = State.get('user');
        if (!user) {
            user = util.store('user');
            if (user) {
                State.set('user', user);
            }
        }
        return user;
    },

    set: function (user) {
        if (user != null) {
            user = $.extend({}, User.get(), user);
        }
        util.store('user', user);
        State.set('user', user);
        return this;
    },

    setParam: function (params) {
        userApi.setParam(params);
        return this;
    },

    request: function (callback, ivcode) {
        var self = this;
        var user = this.get();
        var recordVersion = util.store('recordVersionTime');

        if (!recordVersion || Date.now() - recordVersion > 24 * 60 * 60 * 1000) {
            recordVersion = 1;
            util.store('recordVersionTime', Date.now());
        } else {
            recordVersion = 0;
        }

        userApi.setParam({
            UserID: user.ID,
            Auth: user.Auth,
            ivcode: ivcode ? ivcode : '',
            recordVersion: recordVersion

        }).load(callback);
        return this;
    }
};

var userApi = new api.API({
    url: '/api/user/get',
    checkData: false,

    success: function (res) {
        if (res.success) {
            User.set(res.data);
        }
    },

    error: function () {
    }
});

module.exports = User;