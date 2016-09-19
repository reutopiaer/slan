﻿var $ = require('$');
var util = require('util');
var Activity = require('activity');
var bridge = require('bridge');
var Loading = require('../widget/loading');
var Slider = require('../widget/slider');
var Model = require('core/model2');
var Scroll = require('../widget/scroll');
var barcode = require('../util/barcode');
var animation = require('animation');
var Confirm = require("components/confirm");
var api = require("models/api");
var userModel = require("models/user");
var Category = require("models/category");
var CpCategory = require("components/category");
var ViewModel = Model.ViewModel;

var Discovery = require('./discovery/discovery_index');

var trimHash = require('core/route').trimHash;

Model.Global.set({
    cartQty: 0
});

var cartQtyApi = new api.CartQtyAPI({
    checkData: false,
    success: function (res) {
        Model.Global.set({
            cartQty: res.data
        });
    },
    error: function () { }
});

var recordVersion = util.store('recordVersionTime');

if (!recordVersion || Date.now() - recordVersion > 24 * 60 * 60 * 1000) {
    util.store('recordVersionTime', Date.now());

    var historyRecord = new api.HistoryRecord({
        success: function (res) {
            console.log(res);
        },
        error: function () { }
    });
    var user = userModel.get();

    bridge.system.info(function (res) {

        historyRecord.setParam({
            pspid: user ? user.ID : 0,
            appversion: sl.appVersion,
            device: res.deviceName,
            deviceversion: (util.ios ? "IOS" : "Android") + util.osVersion,
            uuid: res.uuid

        }).load();
    });
}

module.exports = Activity.extend({
    events: {
        'tap .home_tip_mask': function (e) {
            util.store('showTipStep', 2);
            this.model.set({
                showTipStep: 2
            });
        },

        'tap .open_msg': function (e) {
            if ($(e.target).hasClass('open_msg')) {
                $(e.target).removeClass('show');
            }
        },

        'tap .js_offline .btn': function () {
            this.requestUser();
        },

        'tap .footer li': function (e) {
            var self = this;
            var $target = $(e.currentTarget);
            var index = $target.index();

            return;

            if (!$target.hasClass('curr')) {

                if (index == 0) {

                } else if (index == 1) {


                } else {

                    if (!this.model.data.isLogin) {
                        this.forward('/login');
                        return;
                    }

                    if (index == 2) {


                    } else if (index == 3) {

                        if (!self.recDiscovery) {
                            self.recDiscovery = new api.RecDiscoveryAPI({
                                $el: self.model.refs.messages,
                                success: function (res) {
                                    console.log(res);

                                    self.model.set({
                                        rec: res.data
                                    })
                                },

                                error: function () { }
                            });

                            self.recDiscovery.load();
                        }
                    }
                }

                $target.addClass('curr').siblings('.curr').removeClass('curr');

            }
        },
        'tap .guide1': function () {
            this.model.set({
                showGuide: false
            })
        }
    },

    className: 'home',

    showDiscovery: function () {
        if (!this.model.get('isLogin')) {
            this.forward('/login');
            return;
        }

        if (this.model.get('bottomTab') != 2) {

            if (!this.discovery) {
                this.discovery = new Discovery();
                this.discovery.$el.appendTo(this.model.refs.discovery)
            }

            this.model.set({
                bottomTab: 2
            });
        }
    },

    showMap: function () {
        var self = this;

        if (!this.model.data.baiduMap) {
            this.model.set('baiduMap', '<iframe class="js_baidu_map" src="' + bridge.url("/baiduMap.html?v4") + '" frameborder="0" ></iframe>')
                .one('viewDidUpdate', function () {
                    self.$baiduMap = self.$('.js_baidu_map').css({
                        width: window.innerWidth,
                        height: window.innerHeight - 47 - 44 - (util.isInApp ? 20 : 0)
                    });
                    bridge.getLocation(function (res) {
                        self.$baiduMap[0].src = bridge.url("/baiduMap.html?v3#longitude=" + res.longitude + "&latitude=" + res.latitude);
                    });
                });

        } else {
            bridge.getLocation(function (res) {
                self.$baiduMap[0].src = bridge.url("/baiduMap.html?v3#longitude=" + res.longitude + "&latitude=" + res.latitude);
            });
        }
    },

    startMakeLog: function () {
        var self = this;

        var makeLog = function () {
            var hash = trimHash(location.hash);

            bridge.system.info(function (res) {
                var image = new Image();
                var deviceversion = (util.ios ? "IOS" : "Android") + util.osVersion;

                image.src = api.ShopAPI.prototype.baseUri + "/api/system/addpagests?pspcode=" + (self.user ? self.user.PSP_CODE : '') + "&pageurl=" + encodeURIComponent(hash) + "&appversion=" + sl.appVersion + "&uuid=" + res.uuid + "&deviceversion=" + deviceversion;
            });
        }
        makeLog();
        $(window).on('hashchange', makeLog)

        $('.viewport').on('touchstart', function (e) {
            var hash = trimHash(location.hash);

            bridge.system.info(function (res) {
                var image = new Image();
                var deviceversion = (util.ios ? "IOS" : "Android") + util.osVersion;

                image.src = api.ShopAPI.prototype.baseUri + "/api/system/addpagests?pspcode=" + (self.user ? self.user.PSP_CODE : '') + "&pageurl=" + encodeURIComponent(hash) + "&appversion=" + sl.appVersion + "&uuid=" + res.uuid + "&deviceversion=" + deviceversion + "&coordx=" + e.touches[0].pageX + "&coordy=" + e.touches[0].pageY;
            });
        });
    },

    onCreate: function () {
        var self = this;
        self.user = userModel.get();
        self.$tabs = self.$('.hm_tab_con');

        sl.activity = self;

        this.startMakeLog();

        var model = this.model = new ViewModel(this.$el, {
            menu: 'head_menu',
            titleClass: 'head_title',
            isOffline: false,
            isLogin: !!self.user,
            isStart: self.query.start == 1,
            msg: 0,
            tab: 0,
            msg_count: 0,
            bottomTab: 0,
            chartType: 0,
            open: function () {
                bridge.openInApp(self.user.OpenUrl || 'http://m.abs.cn');
            },
            openUrl: function (e, url) {
                bridge.openInApp(url || 'http://m.abs.cn');
            },
            searchHistory: util.store("searchHistory")
        });

        this.model.showDiscovery = this.showDiscovery.bind(this);
        this.model.showMap = this.showMap.bind(this);

        model.showSearch = function (e) {
            this.set({
                isShowSearch: true
            });
            $(this.refs.searchwrap).show();

            this.refs.searchText.focus();

            e.preventDefault();
            e.stopPropagation();
        }

        model.clearSearch = function () {
            util.store("searchHistory", null);

            this.set({
                searchHistory: null
            });
        }

        model.hideSearch = function () {
            this.set({
                isShowSearch: false
            });
            this.refs.searchText.blur();

            $(this.refs.searchwrap).hide();
        }

        self.hotSearchAPI = new api.HotSearchAPI({
            checkData: false,
            success: function (res) {

                self.model.set({
                    hotSearch: res.data
                });
            }
        });

        self.hotSearchAPI.load();

        var update = new api.UpdateAPI({
            checkData: false,
            params: {
                version: sl.appVersion,
                platform: util.ios ? 1 : 2
            },
            success: function (res) {

                if (res.success && res.data.AVS_UPDATE_URL) {
                    var confirm = new Confirm({
                        content: res.data.AVS_UPDATE_MSG,
                        alwaysOpen: res.data.AVS_FORCE_FLAG,
                        confirm: function () {
                            bridge.update(res.data.AVS_UPDATE_URL, res.data.AVS_VERSION);
                        }
                    });
                    confirm.$el.appendTo($('body'));
                    confirm.show();
                }
            },
            error: function () { }
        });
        update.load();

        this.stewardQtyApi = new api.StewardQtyAPI({
            checkData: false,
            success: function (res) {
                self.user.StewardNum = res.data;
                userModel.set(self.user);
                model.set('user.StewardNum', res.data);
            }
        });

        this.launchLoading = new Loading({
            url: '/api/settings/ad_list?name=launch&type=base64',
            check: false,
            checkData: false,
            success: function (res) {
                if (res && res.data && res.data.length) {
                    localStorage.setItem('LAUNCH_IMAGE', res.data[0].Src);
                }
            }
        });
        this.launchLoading.load();

        self.shopApi = new api.ActivityAPI({
            $el: self.$('.hm_shop'),
            success: function (res) {

                model.set({
                    activity: res.data,
                    topbanner: res.topbanner
                });

                if (self.slider)
                    self.slider.set(res.topbanner.data);
                else
                    self.slider = new Slider({
                        loop: true,
                        container: model.refs.topbanner,
                        autoLoop: 3000,
                        data: res.topbanner.data || [],
                        dots: true,
                        itemTemplate: '<img data-src="<%=src%>" data-forward="<%=url%>?from=%2f" />'
                    });

                model.one('viewDidUpdate', function () {
                    Scroll.bind(self.$('.js_shop_scroll:not(.s_binded)').addClass('s_binded'), {
                        vScroll: false,
                        hScroll: true,
                        useScroll: true
                    });
                    self.scroll && self.scroll.get('.js_shop').imageLazyLoad();
                });


                this.showMoreMsg('别拉了，就这些<i class="ico_no_more"></i>');
            }
        });

        self.shopApi.load();

        new api.ShopAPI({
            url: '/api/prod/newproductlist',
            checkData: false,
            check: false,
            success: function (res) {
                if (res.success) {
                    model.set({
                        newproducts: res.data
                    });
                }

            },
            error: function () {

            }
        }).load();

        Scroll.bind(model.refs.cates, {
            useScroll: true,
            vScroll: false,
            hScroll: true
        });

        model.showCategories = function () {
            self.cpCategory.show();
        }

        Category.request(function () {

            Category.list(function (res, navs) {

                res = util.find(res, function (item) {
                    return item.children;
                })

                model.set({
                    navs: navs,
                    categories: res
                });

                var cpCategory = new CpCategory({
                    data: res,
                    isHome: true,
                    goto: function (e, id) {
                        cpCategory.hide();
                        self.forward("/all?id=" + id);
                    }
                });

                cpCategory.$el.appendTo('body');

                self.cpCategory = cpCategory;
            });
        });

        if (!util.store('IS_SHOW_GUIDE')) {

            util.store('IS_SHOW_GUIDE', 1);

            model.set('showGuide', true);

            this.guideSlider = new Slider({
                container: self.$('.hm_guide'),
                itemTemplate: '<img class="guide<%=id%>" src="http://appuser.abs.cn/dest1.2.0/images/guide<%=id%>.jpg" />',
                data: [{
                    id: 0
                }, {
                        id: 1
                    }],
                onChange: function (index) { }
            });
        }

        Scroll.bind(this.$('.main:not(.js_shop)'));

        this.scroll = Scroll.bind(this.$('.js_shop'), {
            refresh: function (resolve, reject) {
                self.shopApi.load(function () {
                    resolve();
                });
            }
        });

        self.$open_msg = this.$('.open_msg').on($.fx.transitionEnd, function (e) {
            if (!self.$open_msg.hasClass('show')) {
                self.$open_msg.hide();
            }
        });
        Scroll.bind(self.$open_msg.find('.msg_bd'));

        var $launchImgs = this.$('.launch img');
        var $mask = this.$('.home_mask').on($.fx.transitionEnd, function (e) {
            if ($mask.hasClass('toggle')) {
                $mask.removeClass('toggle');

                var $el = $launchImgs.filter(':not(.launch_hide)').addClass('launch_hide');

                $launchImgs.eq($el.index() + 1 == $launchImgs.length ? 0 : ($el.index() + 1)).removeClass('launch_hide');
            }
        });

        setTimeout(function () {
            $mask.addClass('toggle');

            setTimeout(arguments.callee, 3200)
        }, 3200);

        self.onResult("Login", function () {
            var user = self.user = userModel.get();

            self.model.set({
                isLogin: true,
                isOffline: false,
                user: user
            });

            self.doWhenLogin();

        }).onResult("UserChange", function () {
            self.requestUser();

        }).onResult("Logout", function () {
            self.user = null;
            userModel.set(null);
            model.set({
                isLogin: false,
                user: null
            });
            self.$('.footer li:nth-child(1)').trigger('tap');

        }).onResult('CartChange', function () {

            self.getCartQty();
        });

        setInterval(function () {
            self.getUnreadMsg();

        }, 30000);

        this.listenTo($(this.model.refs.search), 'keydown', function (e) {
            if (e.keyCode == 13) {
                self.forward('/discovery/list?s=' + encodeURIComponent(e.target.value) + '&from=/');
                e.preventDefault();
                return false;
            }
        });

        this.listenTo($(this.model.refs.searchText), 'keydown', function (e) {
            if (e.keyCode == 13) {

                model.search(e, e.target.value);
                e.preventDefault();
                return false;
            }
        });

        model.search = function (e, item) {
            var searchHistory = util.store('searchHistory') || [];
            var index = searchHistory.indexOf(item);

            if (index != -1) {
                searchHistory.splice(index, 1);
            }
            searchHistory.unshift(item);

            self.model.set({
                searchHistory: searchHistory
            });
            util.store('searchHistory', searchHistory);

            self.forward('/list?s=' + encodeURIComponent(item) + '&from=/');
        }

    },

    getCartQty: function () {
        if (this.user.PSP_CODE) {
            cartQtyApi.setParam({
                pspcode: this.user.PSP_CODE

            }).load();
        }
    },

    requestUser: function () {
        var self = this;

        userModel.request(function (err, res) {

            if (err) {
                if (err.error_code == 503) {
                    userModel.set(null);
                    self.model.set('isLogin', false);
                }
                self.model.set('isOffline', true);
                return;
            }
            res.data.ID = res.data.UserID;

            userModel.set(res.data);

            var user = self.user = userModel.get();

            self.model.set({
                barcode: barcode.code93(user.Mobile).replace(/0/g, '<em></em>').replace(/1/g, '<i></i>'),
                isLogin: true,
                isOffline: false,
                user: self.user
            });

            self.getCartQty();

            self.showEnergy();
            self.stewardQtyApi.setParam({
                pspcode: self.user.PSP_CODE
            }).load();

            if (res.vdpMessage) {
                self.showMessageDialog(res.vdpMessage);
                //util.store('ivcode', null);
            }


            util.isInApp && bridge.getDeviceToken(function (token) {

                if (token) {
                    new api.API({
                        params: {
                            UserID: user.ID,
                            Auth: user.Auth,
                            IMEI: !token ? 'CAN_NOT_GET' : (typeof token == 'string' ? token : token.token)
                        },
                        url: '/api/user/deviceToken',
                        success: function () { },
                        error: function () { }

                    }).load();
                }
            });

        }, util.store('ivcode') || '0000');
    },

    showMessageDialog: function (message) {
        var self = this;
        self.model.set('showTipStep', 1);
        self.$open_msg.show();
        self.$open_msg[0].clientHeight;
        self.$open_msg.addClass('show');

        self.model.set({
            message: message
        });
    },

    showEnergy: function () {
        if (!this.user) return;

        var self = this;
        var total = Math.round(this.user.Amount);
        var percent = 1;
        var level;
        var nextLevel;
        var currentLevel;
        var levelAmounts;
        var levels = ['银卡会员', '金卡会员', '钻石会员', 'VIP会员', 'SVIP会员', '无敌会员'];

        self.model.set('vip', total < (levelAmounts = 1000) ? (level = 0, currentLevel = 0, nextLevel = 1000, levels[1]) : total < (levelAmounts = 5000) ? (level = 1, currentLevel = 1000, nextLevel = 5000, levels[2]) : total < (levelAmounts = 10000) ? (level = 2, currentLevel = 5000, nextLevel = 10000, levels[3]) : total < (levelAmounts = 50000) ? (level = 3, currentLevel = 10000, nextLevel = 50000, levels[4]) : (level = 4, nextLevel = '0', levels[5]));

        percent = Math.min(1, total / levelAmounts);

        self.model.set({
            nextLevel: nextLevel,
            currentLevel: currentLevel,
            vipName: levels[level],
            levelAmounts: levelAmounts,
            energyPercent: percent * 100 + '%',
            ucCardAmounts: util.formatMoney(total) + (total > 50000 ? '' : ('/' + util.formatMoney(levelAmounts)))
        });

        if (total != self.model.data.energy) {
            self.model.set({
                energy: total
            });
        }
    },

    getUnreadMsg: function () {
        var self = this;

        if (self.user && self.user.Auth) {
            $.post(bridge.url('/api/user/get_unread_msg_count'), {
                UserID: self.user.ID,
                Auth: self.user.Auth

            }, function (res) {
                if (res.success) {
                    self.model.set('msg_count', res.count);
                }

            }, 'json');
        }
    },

    doWhenLogin: function () {
        var self = this;

        userModel.setParam({
            IMEI: ""
        });
        self.requestUser();
    },

    onLoad: function () {

        if (this.user) {
            this.showEnergy();
            this.doWhenLogin();
        }
    },

    onShow: function () {
        var self = this;

        this.setResult('ResetCart');

        setTimeout(function () {
            self.guideSlider && self.guideSlider._adjustWidth();

        }, 0)

    },

    onEnter: function () {
        var self = this;

        if (self.model.data.tab == 0) {
            self.slider && setTimeout(function () {
                self.slider._adjustWidth();
            }, 400);

            self.scroll && self.scroll.get('.js_shop').imageLazyLoad();
        }
    },

    onPause: function () { },

    onQueryChange: function () {

        if (this.query.tab) {
            this.$('.footer li:nth-child(1)').trigger('tap');
            this.model.set({
                tab: 0
            });
        }
        this.model.set({
            isStart: this.query.start == 1
        });
    },

    onDestory: function () { }
});