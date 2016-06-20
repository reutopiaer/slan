
var $ = require('$');
var util = require('util');
var Activity = require('activity');
var Loading = require('widget/loading');
var model = require('core/model');
var Scroll = require('widget/scroll');
var Share = require('components/share');
var Size = require('components/size');
var animation = require('animation');
var api = require('models/api');
var Slider = require('widget/slider');
var userModel = require('models/user');

module.exports = Activity.extend({
    events: {
        'tap .js_buy:not(.disabled)': function () {
            var self = this;

            if (self.model.data.colorSpec.length == 1) {
                if (self.user) {
                    this.size.confirm();

                } else {
                    self.forward('/login');
                }

            } else {
                this.size.show();
            }

        },
        'tap .js_share': function () {
            this.share.show();
        },
        'tap .js_select_size': function () {
            this.size.show();
        }
    },

    className: 'pd_item_bg',

    requestData: function () {
        this.groupApi.setParam({
            pspcode: this.user.PSP_CODE

        }).load();
    },

    onCreate: function () {
        var self = this;

        self.swipeRightBackAction = self.route.query.from || self.route.referrer || self.defBackUrl;

        self.user = userModel.get();

        self.model = new model.ViewModel(self.$el, {
            back: self.swipeRightBackAction,
            id: self.route.data.id,
            user: self.user,
            url: encodeURIComponent(self.route.url),
            qty: 1
        });

        Scroll.bind(self.model.refs.main);

        self.onResult("Login", function () {
            self.user = userModel.get();

            self.model.set({
                user: self.user
            });

            self.requestData();
        });

        self.size = new Size({
            type: 'group',
            confirm: function (item, prdId, qty) {
                self.groupAddToCartAPI.setParam({
                    pspcode: self.user.PSP_CODE,
                    prdid: prdId,
                    lppid: self.model.data.LPP_ID,
                    qty: qty || 1

                }).load();

                self.size.hide();
            }
        });

        self.size.$el.appendTo(self.$el);

        self.size.on('SizeChange', function (e, item) {

            var data = {
                PRD_NUM: item.PRD_NUM
            }

            item.WPP_LIST_PIC && (data.WPP_LIST_PIC = item.WPP_LIST_PIC);

            self.model.set({
                data: data
            })
        });


        self.groupShareAPI = new api.GroupShareAPI({
            $el: self.$el,
            params: {
                gppid: self.route.data.id
            },
            checkData: false,
            success: function (res) {
            }
        });

        self.groupApi = new api.GroupAPI({
            $el: self.$el,

            params: {
                gppid: self.route.data.id
            },

            checkData: false,

            success: function (res) {
                var data = res.data;

                self.model.set({
                    GPP_Obj: data.GPP_Obj,
                    Share_Flag: data.Share_Flag,
                    PRD_ID_LIST: data.PRD_ID_LIST
                });

                product.setParam({
                    id: res.data.PRD_ID_LIST[0]

                }).load();

                packageRelativeAPI.setParam({
                    prdId: res.data.PRD_ID_LIST[0]

                }).load();

                self.groupShareAPI.setParam({
                    pspcode: self.user.PSP_CODE,
                    gppid: self.route.data.id

                }).load(function (err, res) {
                    console.log(res);

                    self.model.set({
                        LPP_ID: res.data.LPP_ID
                    });

                    self.share = new Share({
                        head: '分享拼团至',
                        title: self.model.data.GPP_Obj.GPP_NAME,
                        linkURL: res.data.LPP_SHARE_URL,
                        description: self.model.data.GPP_Obj.GPP_NAME,
                        image: res.data.LPP_SHARE_PIC
                    });
                    self.share.$el.appendTo(self.$el);
                });
            }
        });

        self.user && self.requestData();

        var product = new api.ProductAPI({
            $el: self.$el,

            checkData: false,
            success: function (res) {
                res.data.PSV_QTY = res.psvqty;
                self.model.set({
                    data: res.data
                });

                self.size.set({
                    qty: 1,
                    data: res.data
                });

                if (!res.prhpic) {
                    res.prhpic = [];
                }
                res.prhpic.unshift({
                    PHP_PIC_M: res.data.WPP_M_PIC
                });

                self.slider = new Slider({
                    container: self.model.refs.image,
                    loop: true,
                    autoLoop: 3000,
                    data: res.prhpic,
                    dots: res.prhpic.length >= 1,
                    itemTemplate: '<img width="100%" height="100%" src="<%=PHP_PIC_M%>" />'
                });

                colorAndSpec.setParam({
                    id: res.data.PRD_PRH_ID
                }).load();
            }
        });

        var colorAndSpec = new api.ProductColorAndSpec({
            $el: self.$el,
            checkData: false,
            success: function (res) {
                var color = [];
                var spec = [];
                for (var i = 0, len = res.data.length; i < len; i++) {
                    var item = res.data[i];

                    if (self.model.data.PRD_ID_LIST.indexOf(item.PRD_ID) != -1) {

                        if (color.indexOf(item.PRD_COLOR) == -1) {
                            color.push(item.PRD_COLOR);
                        }
                        if (spec.indexOf(item.PRD_SPEC) == -1) {
                            spec.push(item.PRD_SPEC);
                        }
                    }
                }

                self.model.set({
                    color: color,
                    spec: spec,
                    colorSpec: res.data
                });

                self.size.set({
                    color: color,
                    spec: spec,
                    colorSpec: res.data
                });
            }
        });

        var packageRelativeAPI = new api.PackageRelativeAPI({
            $el: self.$el,
            checkData: false,
            success: function (res) {

                self.model.set({
                    Package: res.data
                })
            }
        });


        self.groupAddToCartAPI = new api.GroupAddToCartAPI({
            $el: self.$el,
            checkData: false,
            success: function (res) {
                if (res.success) {
                    self.setResult('CartChange');

                    sl.tip('加入购物车成功！');

                } else {
                    sl.tip(res.msg);
                }
            },
            error: function (res) {
                sl.tip(res.msg);
            }
        });
    },

    onShow: function () {
        var self = this;
    },

    onDestory: function () {
    }
});