var $ = require('$');
var util = require('util');
var Activity = require('activity');
var bridge = require('bridge');
var Loader = require('../widget/loader');
var Model = require('core/model2').Model;
var Http = require('core/http');
var Scroll = require('../widget/scroll');
var Slider = require('../widget/slider');
var Tab = require('../widget/tab');
var Toast = require('../widget/toast');
var popup = require('../widget/popup');
var PhotoViewer = require('widget/photoViewer');
var animation = require('animation');
var Promise = require('promise');

var Menu = require('../components/menu');
var yunMiRules = require('../components/yunMiRules');
var publicquan = require('../logical/publicquan');
var quan = require('../logical/quan');
var messagesList = require('../models/messagesList');
var user = require('../models/user');

var userLogical = require('../logical/user');
var ym = require('logical/yunmi');
var auth = require('../logical/auth');
var contact = require('../logical/contact');
var business = require('../logical/business');

var businessModel = require('models/business');

module.exports = Activity.extend({

    onCreate: function() {
        var self = this;

        var photoViewer = this.photoViewer = new PhotoViewer();

        photoViewer.$el.hide().appendTo('body')
            .addClass('gl_beforeshow')
            .on($.fx.transitionEnd, function() {
                if (!photoViewer.$el.hasClass('gl_show')) {
                    photoViewer.$el.hide();
                }
            })
            .on('tap', function() {
                photoViewer.$el.removeClass('gl_show');
            });

        this.exitMenu = this.exitMenu.bind(this);

        var loader = this.loader = new Loader(this.$el);

        var model = self.model = new Model(this.$el, {
            title: '',
            messagesList: messagesList,
            user: user,
            tab: 1,
            recommendIndex: 0
        });

        model.openEnt = function() {
            bridge.openInApp("娱乐", 'http://movie.miguvideo.com/mobile/app/index.jsp#/level1?channelId=100800140000013');
        };

        model.showQuanMenu = function() {
            $(this.refs.quanMenuMask).show();
            $(this.refs.quanMenu).show();
        }

        model.hideQuanMenu = function(url, e) {
            $(this.refs.quanMenuMask).hide();
            $(this.refs.quanMenu).hide();

            if (typeof url == 'string') {
                self.forward(url);
            }
        }
        model.scan = this.scan.bind(this);
        model.menu = this.menu.bind(this);
        model.exitMenu = function(e) {
            if ($(e.target).hasClass('hm_home'))
                self.exitMenu();
        }
        model.backup = function() {
            self.forward('/contact/backup');
            return false;
        }

        model.onceTrue('change:tab', this.initAllQuan.bind(this));

        model.changeTab = function(tab) {
            this.set({
                tab: tab
            });
        }

        model.phoneCall = function() {
            bridge.system.openPhoneCall('');
        }

        model.showYunMi = function() {
            popup.alert({
                className: 'ym_rules__popup',
                title: '云米规则',
                content: yunMiRules.rule2,
                btn: '关闭',
                action: function() {}
            })
        }

        model.toContact = function() {

            this.set({
                tab: 3

            }).next(function() {
                model._('quanTab').tab(2);
            });
        }

        model.showImages = function(imgs, index) {

            photoViewer.setImages(imgs.map(function(src) {
                return {
                    src: sl.resource(src)
                }
            }));
            photoViewer.index(index);

            photoViewer.$el.show()[0].clientHeight;
            photoViewer.$el.addClass('gl_show');
        }

        model.enterShop = function() {
            bridge.openInApp('http://wap.fj.10086.cn/servicecb/touch/index.jsp');
        }

        model.hideTimeout = function() {
            $(model.refs.timeout).hide();
            $(model.refs.timeoutMask).hide();
        }
        model.receiveYunmi = function() {
            var data = this.get('currentYunmi');

            if (!data) {
                if (this.get('next')) {
                    $(model.refs.timeout).show();
                    $(model.refs.timeoutMask).show();

                } else {
                    Toast.showToast('暂无云米可以领取！');
                }
                return;
            }

            loader.showLoading();

            ym.receiveYunmi(data.yunmi_id).then(function(res) {
                Toast.showToast("恭喜你领取" + data.amount + "云米");
                model.set({
                    currentYunmi: null
                });

            }).catch(function(e) {
                Toast.showToast(e.message);

            }).then(function() {
                loader.hideLoading();
            });
        }

        this.bindScrollTo(model.refs.life);

        $(model.refs.life).on('scroll', function() {
            var top = this.scroll.scrollTop();

            if (top >= 116 * window.innerWidth / 320) {
                model.set({
                    headBg: true
                });
            } else {
                model.set({
                    headBg: false
                });
            }
        });

        var handleBusiness = function() {
            var data = {};
            for (var i = 1; i <= 4; i++) {
                data['type' + i + 'data'] = {
                    unread: 0,
                    list: []
                };
            }
            var notifications = businessModel.get('notifications');
            businessModel._('list').each(function(busiModel) {
                var busi = busiModel.get();

                var item = data['type' + busi.type + 'data'];
                item.title = busi.title;
                item.content = busi.content;
                item.send_date = busi.send_date ? util.formatDate(busi.send_date, 'short') : '';
                item.list.push(busi);

                var unread = 0;

                for (var i = 0, len = notifications.length; i < len; i++) {
                    if (notifications[i] && !notifications[i].isRead && notifications[i].business_id == busi.business_id) {
                        unread++;
                    }
                }

                item.unread += unread;

                if (busi.unread != unread) {
                    busiModel.set('unread', unread);
                }
            });

            model.set(data);
        }
        businessModel.on('datachanged', handleBusiness);

        this.onceTrue('Show', function() {
            if (auth.getAuthToken() && userLogical.getMe()) {

                business.getAllBusinessAndUnread().then(handleBusiness);

                this.getYunmi();

                bridge.getDeviceToken(function(token) {
                    var storedToken = util.store('device_token');
                    if (token != 'get_token_failure' && token != storedToken) {
                        userLogical.updateDeviceToken(token).then(function() {
                            util.store('device_token', token);
                        });
                    }
                });
                return true;
            }
            return false;
        });
    },

    getYunmi: function() {
        var model = this.model;
        var self = this;

        ym.getYunmi().then(function(res) {
            var current = res.data;
            var next = res.next;

            if (next) {
                var serverNow = next.create_date;
                var now = Date.now();

                next.timeFix = now - serverNow;
                next.timeLeft = util.timeLeft(next.start_date - serverNow);

                self.timer = setInterval(function() {
                    if (location.hash != '#/') return;

                    var next = model.get('next');
                    var timeLeft = next.start_date - (Date.now() - next.timeFix);

                    if (timeLeft == 0) {
                        if (self.timer) {
                            clearInterval(self.timer);
                            self.timer = null;
                        }
                        self.getYunmi();
                    }

                    timeLeft = util.timeLeft(timeLeft);

                    model.set('next.timeLeft', timeLeft);

                }, 1000);
            }

            model.set({
                currentYunmi: current,
                next: next
            });
        });
    },

    menu: function() {

        var self = this;

        if (!this._menu) {
            this._menu = new Menu();
            this._menu.$el.prependTo(this.$el)[0].clientHeight;
        }

        requestAnimationFrame(function() {

            $(self.model.refs.home).addClass('menu_aexit');
            self._menu.$el.addClass('menu_enter');
        });

        Application.addBackAction(this.exitMenu);
    },

    exitMenu: function() {
        this._menu && this._menu.$el.removeClass('menu_enter');
        $(this.model.refs.home).removeClass('menu_aexit');
        Application.removeBackAction(this.exitMenu);
    },

    scan: function() {
        var self = this;

        bridge.qrcode.scan(function(res) {
            var code = res.code;

            if (code) {
                var m = code.match(/cmccfj\:\/\/user\/(\d+)/);
                if (m && m[1]) {
                    var user_id = parseInt(m[1]);
                    contact.isFriend(user_id).then(function(res) {
                        if (res.data)
                            self.forward('/contact/friend/' + user_id);
                        else
                            self.forward('/contact/person/' + user_id);
                    });

                } else if (code.indexOf('http://') == 0) {
                    bridge.openInApp(code);
                }
            }

        });
    },

    loadPublicQuan: function() {

        var loader = this.loader;
        var model = this.model;
        var self = this;

        loader.showLoading();

        //publicquan.recommend(),
        //publicquan.myrecommend(),
        Promise.all([publicquan.recommend(), publicquan.myfollow()])
            .then(function(results) {
                results.forEach(function(res, i) {

                    res.data.forEach(function(item) {

                        if (item.pub_quan_msg && item.pub_quan_msg.imgs) {
                            item.pub_quan_msg.imgs = item.pub_quan_msg.imgs.split(',')
                        }
                    });

                    model.set(i == 0 ? "recommendPubQuan" : "myfollowPublicQuan", res.data);
                });

            })
            .catch(function(e) {

                if (e.message == '无权限') {
                    self.forward('/login');
                } else
                    Toast.showToast(e.message);
            })
            .then(function() {
                loader.hideLoading();
            });
    },

    initQuan: function(tab) {
        var self = this;
        var model = this.model;

        quan.on('sendComment', function(e, data) {

            var msg = model.getModel('quanData').find('msg_id', data.msg_id);

            var comments = msg.getModel('comments');

            data = $.extend(data, user.data);

            if (comments) {
                comments.add([data]);

            } else {
                comments.set([data]);
            }
        });

        quan.on('publish', function(e, data) {
            var quanData = model.getModel('quanData');

            quanData.unshift(data);
        });

        model.commentQuanMsg = function(msg_id, user_id, user_name) {
            self.forward('/quan/comment?msg_id=' + msg_id, user_name && user_id != user.data.user_id ? {
                user_id: user_id,
                user_name: user_name

            } : undefined);
        }

        model.blackQuanMsg = function(msg_id) {
            var quanData = model.getModel('quanData');

            quan.black(msg_id).then(function() {
                Toast.showToast('屏蔽成功');

                quanData.remove('msg_id', msg_id);

            }).catch(function(e) {
                Toast.showToast(e.message);
            });
        };

        model.likeQuanMsg = function(msg_id) {
            var msg = model.getModel('quanData').find('msg_id', msg_id);
            var likes = msg.getModel('quan_likes');

            if (likes && likes.find('user_id', user.data.user_id)) {
                Toast.showToast('你已点赞！');
                return;
            }

            quan.like(msg_id).then(function() {

                var res = {
                    user_id: user.get("user_id"),
                    user_name: user.get("user_name")
                }

                if (!likes) {
                    msg.set({
                        quan_likes: [res]
                    });

                } else {
                    likes.add(res);
                }

                Toast.showToast('点赞成功');

            }).catch(function(e) {
                Toast.showToast(e.message);
            });
        }
        self.loadQuan(tab.refs.items[1]);
    },

    loadQuan: function($scroll) {

        var self = this;
        var model = this.model;
        var quanLoader = self.quanLoader;

        switch (quanLoader) {
            case 1:
                break;

            case undefined:
                self.quanLoader = 1;
                quan.getAll().then(function(results) {
                    self.quanLoader = results[0];

                    self.quanLoader.autoLoadMore(function(res) {
                        res.data.forEach(function(item) {
                            if (item.imgs) {
                                item.imgs = item.imgs.split(',');

                            }
                        });
                        model.get("quanData").add(res.data);
                    });

                    results[1].data.forEach(function(item) {
                        if (item.imgs) {
                            item.imgs = item.imgs.split(',')
                        }
                    });

                    model.set({
                        quanData: results[1].data
                    })

                    console.log(model.data.quanData[0]);
                });
                break;

            default:
                quanLoader.reload().then(function(res) {
                    res.data.forEach(function(item) {
                        if (item.imgs) {
                            item.imgs = item.imgs.split(',')
                        }
                    });
                    model.set({
                        quanData: res.data
                    })
                });
                break;
        }
    },

    loadContacts: function() {

    },

    initAllQuan: function() {
        var self = this;
        var model = this.model;

        if (model.get('tab') == 3 && !self.tab) {

            model.next(function() {

                var tab = self.tab = this.refs.tab;
                var records = {};
                var count = 1;
                records[0] = true;

                model.set({
                    quanTab: tab
                });
                self.loadPublicQuan();

                tab.onceTrue('tabChange', function(e, index) {

                    if (records[index]) return;
                    records[index] = true;

                    count++;

                    switch (index) {
                        case 0:
                            break;

                        case 1:
                            self.initQuan(tab);
                            break;

                        case 2:
                            self.loadContacts();
                            break;
                    }

                    return count == 3;
                });
            });

            return true;
        }
    },


    onLoad: function() {

    },

    onShow: function() {
        var self = this;

        if (!auth.getAuthToken()) {
            self.forward('/login');

        } else {
            seajs.use(['logical/chat']);

            if (self.tab) {
                self.loadPublicQuan();
                self.quanLoader && self.loadQuan();
            }
        }
    },

    onHide: function() {
        this.exitMenu();
    },

    onDestory: function() {
        this.model.destory();
    }
});