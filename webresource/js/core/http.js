define(function (require, exports, module) {
    var $ = require('$'),
        _ = require('util');

    var extend = ['url', 'method', 'headers', 'dataType', 'xhrFields', 'beforeSend', 'success', 'error', 'complete'];

    //@options={url:'', params: {}, method:"POST", dataType:"json", headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, xhrFields: { withCredentials: true }}
    var Http = function (options) {
        $.extend(this, _.pick(options, extend));

        this.params = $.extend({}, this.params, options.params);

        this.setUrl(this.url);
    }

    Http.url = function (url) {
        return /^http\:\/\//.test(url) ? url : (this.prototype.baseUri.replace(/\/$/, '') + '/' + url.replace(/^\//, ''));
    }

    Http.post = function (url, params) {

        return new Http({
            url: url,
            params: params

        }).request();
    }

    Http.get = function (url, params) {

        return new Http({
            url: url,
            method: 'GET',
            params: params

        }).request();
    }

    Http.prototype = {

        baseUri: $('meta[name="api-base-url"]').attr('content'),
        method: "POST",
        dataType: 'json',

        complete: _.noop,
        error: _.noop,
        success: _.noop,

        check: function (res) {
            var flag = !!(res && res.success);
            return flag;
        },

        createError: function (errorCode, errorMsg) {
            return {
                success: false,
                code: errorCode,
                message: errorMsg
            }
        },

        setHeaders: function (key, val) {
            var attrs;
            if (!val)
                attrs = key
            else
                (attrs = {})[key] = val;

            if (this.headers === undefined) this.headers = {};

            for (var attr in attrs) {
                this.headers[attr] = attrs[attr];
            }
            return this;
        },

        setParam: function (key, val) {
            var attrs;
            if (!val)
                attrs = key
            else
                (attrs = {})[key] = val;

            for (var attr in attrs) {
                val = attrs[attr];

                this.params[attr] = val;
            }
            return this;
        },

        getParam: function (key) {
            if (key) return this.params[key];
            return this.params;
        },

        clearParams: function () {
            this.params = {};
            return this;
        },

        setUrl: function (url) {
            this.url = /^http\:\/\//.test(url) ? url : (this.baseUri.replace(/\/$/, '') + '/' + url.replace(/^\//, ''));
            return this;
        },

        request: function (resolve, reject) {
            var self = this;

            if (typeof resolve === 'function') {
                self._request(resolve, reject);

            } else
                return new Promise(function (resolve, reject) {

                    self._request(resolve, reject);
                });
        },

        _request: function (resolve, reject) {
            var that = this;

            if (that.beforeSend && that.beforeSend() === false) return;

            if (that.isLoading) return;
            that.isLoading = true;

            that._xhr = $.ajax({
                url: that.url,
                headers: that.headers,
                xhrFields: that.xhrFields,
                data: that.params,
                type: that.method,
                dataType: that.dataType,
                cache: false,
                error: function (xhr) {
                    var err = that.createError(10001, '网络错误');
                    that.error(err, xhr);

                    reject && reject(err, xhr);
                },
                success: function (res, status, xhr) {

                    if (!that.check || that.check(res)) {
                        that.success(res, status, xhr);

                        resolve && resolve(res, status, xhr);

                    } else {
                        if (!res.message && res.msg) res.message = res.msg;
                        that.error(res, xhr);
                        reject && reject(res, xhr);
                    }
                },

                complete: function () {
                    that._xhr = null;
                    that.isLoading = false;
                    that.complete();
                }
            });
            return this;
        },

        abort: function () {
            if (this._xhr) {
                this._xhr.abort();
                this._xhr = null;
            }
            return this;
        }
    };

    Http.extend = _.extend;

    module.exports = Http;
});
