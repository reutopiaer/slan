var $ = require('$');
var sl = require('core/base');
var util = require('util');
var bridge = require('bridge');
var Loader = require('widget/loader');
var Promise = require('promise');
var Toast = require('widget/toast');
var popup = require('widget/popup');
var App = require('core/app');

util.cnNum = function (num) {
    if (num > 10000) {
        num = (num + '');
        return num.substr(0, num.length - 4) + "万";
    } else if (num > 1000) {

        num = (num + '');
        return num.substr(0, num.length - 4) + 'k';
    } else {
        return num;
    }
}

//cmccBridge
bridge.cmcc = {

    //@bizType="register"|"resetPwd"|"smsLogin"
    sendSms: function (phoneNo, bizType) {
        if (!bizType) throw new Error('require bizType!!');

        bridge.exec('cmcc', {
            type: 'sendSms',
            phoneNo: phoneNo,
            bizType: bizType
        });
    },

    registerUser: function (phoneNo, password, validCode, callback) {

        bridge.exec('cmcc', {
            type: 'registerUser',
            phoneNo: phoneNo,
            password: password,
            bizType: bizType

        }, callback);

    },

    //@loginType="sms"|"password"
    login: function (phoneNo, password, loginType, callback) {

        bridge.exec('cmcc', {
            type: 'login',
            phoneNo: phoneNo,
            password: password,
            loginType: loginType

        }, callback);
    }
};

function startApp(routes, resourceMapping, remoteRoutes, remoteMapping) {

    $.extend(routes, remoteRoutes || {});

    seajs.on('fetch', function (emitData) {

        var id = emitData.uri.replace(seajs.data.base, '').replace(/\.js(\?.*){0,1}/, '');

        if (remoteMapping && remoteMapping[id]) {
            emitData.requestUri = remoteMapping[id];

        } else if (resourceMapping) {

            for (var key in resourceMapping) {
                if (resourceMapping[key].indexOf(id) != -1) {
                    emitData.requestUri = remoteMapping && remoteMapping[key] ? remoteMapping[key] : seajs.resolve(key);
                    break;
                }
            }
        }
    });
    seajs.on("error", function (errorData) {
        errorData.pause = true;

        Offline.getInstance().show(function () {
            this.hide();
            seajs.request(errorData.uri, errorData.callback);
        });
    });

    new App().mapRoute(routes).start(sl.isInApp ? 2000 : 0);
}

module.exports = {
    startApp: startApp
};