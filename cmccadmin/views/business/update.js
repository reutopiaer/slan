var $ = require('$');
                        var util = require('util');
                        var Model = require('core/model2').Model;
                        var Page = require('core/page');
                        var Http = require('core/http');

                        var Form = require('components/form');
                        var Grid = require('components/grid');

                        var Toast = require('widget/toast');
                        var popup = require('widget/popup')

module.exports = Page.extend({

    
    onCreate: function () {
        var self = this;

        var model = this.model = new Model(this.$el, {
            title: '第三方业务修改'
        });

var form = this.form = new Form({
                            url: '/business/update',
                            fields: [{
                                    label: "业务ID",
                                    field: "business_id",
                                    type:"hidden",
                                    value: this.route.params.id,
emptyAble:false,
                                        emptyText: "业务ID不可为空"
}, {
                                    label: "业务名称",
                                    field: "business_name",
                                    type:"text",
emptyAble:false,
                                        emptyText: "业务名称不可为空"
}, {
                                    label: "业务图片",
                                    field: "business_pic_file",
                                    type:"file"}, {
                                    label: "业务密码",
                                    field: "secret_key",
                                    type:"text",
emptyAble:false,
                                        emptyText: "业务密码不可为空"
}, {
                                    label: "业务类型",
                                    field: "type",
                                    type:"number",
                                        regex: /^\d+$/,
                                        regexText: "格式错误",
options: {"1":"移动业务","2":"生活","3":"娱乐","4":"社交"},
emptyAble:false,
                                        emptyText: "业务类型不可为空"
}, {
                                    label: "跳转链接",
                                    field: "linkurl",
                                    type:"text",
emptyAble:false,
                                        emptyText: "跳转链接不可为空"
}],
                        buttons: [{
                            value:'修改',
                            click: function(){
                                this.submit(function(){
                                    Toast.showToast('修改成功');
                                    history.back();
                                    self.setResult('businesschange');
                                },function(e){ Toast.showToast(e.message); });
                            }
                        },{
                            value:'取消',
                            click: function(){
                                history.back();
                            }
                        }]});
                        Http.post('/business/getById',{
                            business_id: this.route.params.id
                        }).then(function(res) { form.set(res.data); });
                        form.$el.appendTo(model.refs.main);

},
    onShow: function () {
    }
});