define(function (require, exports, module) {

    var $ = require('$');
    var util = require('util');
    var Activity = require('activity');
    var Loader = require('../widget/loader');
    var Tab = require('../widget/tab');
    var model = require('core/model2');
    var Scroll = require('../widget/scroll');
    var animation = require('animation');
    var bridge = require('bridge');
    var api = require('models/api');
    var popup = require('widget/popup');

    return Activity.extend({
        events: {
            'tap .open_msg': function (e) {
                if ($(e.target).hasClass('open_msg')) {
                    $(e.target).removeClass('show');
                }
            },
            'tap .btn_go': function () {
                this.back('/?tab=0');
            }
        },

        swipeRightBackAction: '/',

        onCreate: function () {
            var self = this;

            self.user = util.store('user');

            var state = self.route.query.state || 0;

            this.model = new model.ViewModel(this.$el, {
                back: '/',
                url: encodeURIComponent(this.route.url),
                title: '我买到的',
                currentType: 0,
                isLoading: true,
                isShowShare: true

            }).next(function () {
                var tab = self.tab = this.refs.tab;

                var inits = {};

                var createLoader = function (index) {
                    if (inits[index]) return;
                    inits[index] = true;

                    var key = 'data' + (index || '');

                    var loader = new Loader({
                        url: "/api/order/getListByType",
                        $el: self.$el,
                        $refreshing: $(tab.refs.items[index]).find('.refreshing'),
                        $scroll: $(tab.refs.items[index]),
                        checkData: false,
                        success: function (res) {
                            var data = {
                                isLoading: false
                            }
                            data[key] = res.data;
                            self.model.set(data);
                        },
                        append: function (res) {
                            self.model.getModel(key).add(res.data);
                        }
                    });

                    loader.setParam({
                        UserID: self.user.ID,
                        Auth: self.user.Auth,
                        type: index

                    }).load();
                }

                tab.on('tabChange', function (e, index) {
                    createLoader(index)

                }).next(function () {
                    createLoader(0);
                    tab.tab(state);
                });

            });

            this.wxPayApi = new api.WxPayAPI({
                $el: self.$el,
                success: function (res) {
                    console.log(res);
                    bridge.open(res.url);
                }
            });

            var expressApi = new api.ExpressAPI({
                $el: self.$el,
                success: function (res) {
                },
                error: function () {
                }
            });

            var orderShareAPI = new api.OrderShareAPI({
                $el: this.$el,
                checkData: false,
                success: function (res) {
                },
                error: function (res) {
                    self.model.set({
                        isShowShare: false
                    });
                }
            });

            orderShareAPI.load();

            $.extend(this.model, {

                showExpress: function (item, itemModel, e) {
                    itemModel.set('showExpress', !item.showExpress);
                    e.stopPropagation();

                    if (!item.express) {
                        itemModel.set('express', []);

                        expressApi.setParam({
                            pur_code: item.PUR_CODE,
                            pspcode: self.user.PSP_CODE

                        }).load(function (res) {
                            if (res && res.success) {
                                itemModel.set('express', res.data);
                            }
                        });
                    }


                },
                openOrder: function (order, e) {
                    if ($(e.target).hasClass('btn_sml') && $(e.target).html() != '立即付款') return;

                    self.forward('/order/' + order.PUR_ID);

                    //bridge.openInApp(api.API.prototype.baseUri + '/AlipayDirect/Pay/' + order.PUR_ID + "?UserID=" + self.user.ID + "&Auth=" + self.user.Auth);
                    //if (order.PUS_DESC == '待付款') {
                    //}
                    e.stopPropagation();
                },
                cancelOrder: function (order, e) {

                    popup.confirm({
                        title: '温馨提示',
                        content: '你确定取消订单吗？',
                        cancelText: '不取消',
                        cancelAction: function () { },
                        confirmText: '确定取消',
                        confirmAction: function () {
                            this.hide();
                            
                            self.cancelOrderApi.setParam({
                                purcode: order.PUR_CODE

                            }).load();
                        }
                    });

                    e.stopPropagation();
                    e.preventDefault();
                },
                openPrd: function (prd, order, e) {
                    e.stopPropagation();
                    if (order.PUS_DESC != '待付款' || e.target.tagName == "IMG") {
                        if (prd.PRD_DISCONTINUED_FLAG) {
                            self.$open_msg.show();
                            self.$open_msg[0].clientHeight;
                            self.$open_msg.addClass('show');

                        } else if (prd.Url) {
                            self.forward('/item/' + prd.PRD_ID + "?from=" + encodeURIComponent(self.route.url));
                        }
                    } else {
                        this.openOrder(e, order);
                    }
                }
            })

            self.$open_msg = this.$('.open_msg').on($.fx.transitionEnd, function (e) {
                if (!self.$open_msg.hasClass('show')) {
                    self.$open_msg.hide();
                }
            });

            self.onResult("OrderChange", function () {
                self.loading.reload();
            });

            self.cancelOrderApi = new api.CancelOrderAPI({
                $el: this.$el,
                checkData: false,
                params: {
                    pspcode: self.user.PSP_CODE
                },
                success: function (res) {
                    if (res.success) {
                        sl.tip('订单已成功取消');
                        self.loading.reload();

                        //通知更新优惠券数量
                        self.setResult("UserChange");
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
            var self = this;
            self.timer && clearTimeout(self.timer);
        }
    });
});
