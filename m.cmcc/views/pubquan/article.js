var $ = require('$');
var util = require('util');
var Activity = require('activity');
var Loader = require('widget/loader');
var Model = require('core/model2').Model;
var Promise = require('promise');
var Toast = require('widget/toast');
var popup = require('widget/popup');

var publicquan = require('logical/publicquan');
var user = require('models/user');

module.exports = Activity.extend({

    onCreate: function () {
        var self = this;

        var articleId = this.route.params.id;

        var model = this.model = new Model(this.$el, {
            user: user
        });

        model.fav = function () {
            Toast.showToast('收藏成功！')
        }

        model.follow = function () {
            var follow = function () {
                publicquan.follow(model.get('data.quan.quan_id')).then(function (res) {

                    model.getModel('data.quan').set({
                        is_follow: res.is_follow
                    })

                }).catch(function (e) {
                    Toast.showToast(e.message);
                })
            }

            if (model.get('data.quan').is_follow)
                popup.confirm({
                    content: '确定不关注该圈了吗？',
                    confirmAction: function () {
                        follow()
                        this.hide();
                    }
                })
            else follow();
        }

        publicquan.on('sendComment:' + articleId, function (e, data) {
            var comments = model.getModel('comments');
            data = $.extend(data, user.data);

            if (!comments) {
                model.set({
                    comments: [data]
                })
            } else {
                comments.unshift(data);
            }
        })

        model.delComment = function (comment_id) {
            publicquan.delComment(comment_id).then(function (res) {
                Toast.showToast('删除成功');

                var comments = model.getModel('comments');

                console.log(comments);

                comments.remove('comment_id', comment_id);

            }).catch(function (e) {

                Toast.showToast(e.message);
            });
        }

        model.likePubQuanMsg = function () {
            publicquan.likePubQuanMsg(articleId).then(function (res) {
                Toast.showToast(res.message);

                model.getModel('data').set({
                    like: res.like
                })

            }).catch(function (e) {
                Toast.showToast(e.message);
            });
        }

        model.back = function () {
            self.back(self.swipeRightBackAction)
        }

        model.comment = function (user_id, user_name) {
            self.forward('/pubquan/comment?msg_id=' + articleId, user_name && user_id != user.data.user_id ? {
                user_id: user_id,
                user_name: user_name

            } : undefined);
        }

        var loader = this.loader = new Loader(this.$el);

        loader.showLoading();

        var commentsLoader = publicquan.createCommentsLoader({
            msg_id: articleId,
            $scroll: $(model.refs.main)

        }, function (res) {
            model.set({
                comments: res.data
            })

        }, function (res) {

            model.getModel('comments').add(res.data);
        });

        Promise.all([publicquan.article(articleId), commentsLoader.request().catch(function () { }), this.waitLoad()]).then(function (results) {
            model.set({
                data: results[0].data
            })

            self.bindScrollTo(model.refs.main);

            publicquan.seeArticle(articleId);


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
        publicquan.off('sendComment:' + this.route.params.id)

        this.model.destroy();
    }
});