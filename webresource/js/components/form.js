﻿var $ = require('$');
var form = require('./form.html');
var util = require('util');
var Validator = require('./validator');
var vm = require('core/model2');
var Async = require('core/async');
var Http = require('core/http');
var TimePicker = require('./timepicker');
var Base = require('core/base');

var valid_keys = ['emptyAble', 'emptyText', 'regex', 'regexText', 'compare', 'compareText', 'validate', 'validateText', 'success', 'msg'];
var guid = 0;
var FormComponentKeys = ["buttons", "useIFrame", "contentType", "xhrFields", "method", 'enctype'];

/*

var form = new FormComponent({
    url: '',
    fields: [{
        label: '时间选择',
        field: 'time',
        type: "TimePicker"
    }, {
        label: '文本框',
        field: 'name',
        type: "text",
        value: "aaa",
        emptyAble: false
    }, {
        label: '文本框',
        field: 'xxx',
        type: "textarea",
        value: "aaa"
    }, {
        label: '下拉框',
        field: 'categoryId',
        type: 'select',

        //@options = array || { url: 'xxx', params: { parentId: 'parentId'=>this.model.get('parentId') }, data:{}, text: 'key of data'||'text', value: 'key of data'||'value' }
        options: [{
            text: '选项1',
            value: 1
        }]
    }],
    buttons: [{
        value: '确认',
        click: function(){
            this.submit();
        }
    }]
});

form.$el.appendTo(this.$el);
*/

var FormComponent = function(options) {

    var self = this;
    var fields;
    var items = {};
    var data = {};

    this.hiddens = [];
    this.fields = [];
    this.plugins = [];
    this.compo = {};

    var validator = {};
    var fieldsOption = options.fields;
    var selectsOptions = [];

    for (var i = 0, len = fieldsOption.length; i < len; i++) {
        fields = fieldsOption[i];
        if (fields.type === 'hidden') {
            items[fields.field] = fields;
            data[fields.field] = fields.value;

            this.hiddens.push(fields);
        } else {
            if (!fields.length) fields = [fields];

            this.fields.push(fields);

            for (var j = 0, length = fields.length; j < length; j++) {
                var field = fields[j];
                var valid = util.pick(field, valid_keys);

                items[field.field] = field;
                data[field.field] = field.value;

                if (!util.isEmptyObject(valid)) {
                    validator[field.field] = valid;
                }

                if (field.type == 'select' && field.options && !Array.isArray(field.options)) {

                    //@options = { url: 'xxx', params: { parentId: 'parentId'=>this.model.get('parentId') }, data:[{}], text: 'key of data'||'text', value: 'key of data'||'value' }
                    var fieldOptions = field.options;

                    if (fieldOptions.url) {
                        fieldOptions.field = field.field;
                        selectsOptions.push(fieldOptions);
                    }

                    if (!fieldOptions.text) fieldOptions.text = 'text';
                    if (!fieldOptions.value) fieldOptions.value = 'value';
                    if (!fieldOptions.data) {
                        var sd = {};
                        sd[fieldOptions.text] = '请选择';
                        sd[fieldOptions.value] = '';
                        fieldOptions.data = [sd];
                    }

                    field.options = fieldOptions.data.map(function(item) {
                        return {
                            text: item[fieldOptions.text],
                            value: item[fieldOptions.value]
                        }
                    });
                }
            }
        }
    }

    this.buttons = options.buttons || null;

    this.url = Http.url(options.url);

    Object.assign(this, util.pick(options, FormComponentKeys))

    var template = this.template.html(this);

    this.$el = $(template);

    this.el = this.$el[0];

    var model = this.model = new vm.Model(this.$el, {
        fields: items,
        data: data
    });

    if (selectsOptions.length)
        model.on('datachanged', function(e) {
            selectsOptions.forEach(function(selectOptions) {
                var params = {};
                var willReturn = false;

                selectOptions.params && Object.keys(selectOptions.params).forEach(function(key) {
                    var field = selectOptions.params[key];
                    var value = model.get("data." + field);
                    params[key] = value;

                    if (value === '') {
                        willReturn = true;
                    }
                });

                if (willReturn) return;
                var paramsId = JSON.stringify(params);

                if (selectOptions.paramsId == paramsId) return;
                selectOptions.paramsId = paramsId;

                Http.post(selectOptions.url, params).then(function(res) {
                    console.log(model.getModel('fields.' + selectOptions.field + ".options"))

                    model.set('fields.' + selectOptions.field + ".options", selectOptions.data.concat(res.data).map(function(item) {
                        return {
                            text: item[selectOptions.text],
                            value: item[selectOptions.value]
                        }
                    }));

                    console.log(selectOptions.field);


                });
            });
        });

    var buttons = this.buttons;
    if (buttons) {
        for (var i = 0; i < buttons.length; i++) {
            model['button' + i + "Click"] = buttons[i].click.bind(this);
        }
    }

    this.valid = new Validator(validator, model.data.data);

    this.$el.on('blur', '[name]', $.proxy(this._validInput, this))
        .on('focus', '[name]', function(e) {
            var $target = $(e.currentTarget);
            var name = $target.attr('name');
            var valid = validator[name];

            valid && valid.msg && model.set('result.' + name, {
                success: -1,
                msg: valid.msg
            });

        });

    for (var i = 0, len = this.plugins.length; i < len; i++) {
        var plugin = this.plugins[i];
        var $hidden = this.$el.find('[name="' + plugin.field + '"]');

        var compo = this.compo[plugin.field] = plugin.render ? plugin.render.call(this, $hidden, plugin) : new(FormComponent.require(plugin.type))($hidden, plugin);

        var value = model.data.data[plugin.field];

        if (value !== undefined && value !== null)
            compo.val(value);

        model.on('change:data.' + plugin.field, (function(compo, plugin) {

            return function(e, value) {

                compo.val(value);
            }
        })(compo, plugin))
    }
};

FormComponent.prototype = {
    template: form,
    method: 'post',
    url: null,
    enctype: null,
    buttons: null,

    useIFrame: false,

    set: function(arg0, arg1, arg2) {

        this.model.getModel('data').set(arg0, arg1, arg2);

        return this;
    },

    get: function(key) {
        return this.model.getModel('data').get(key);
    },

    data: function() {
        return $.extend({}, this.model.data.data);
    },

    reset: function() {
        for (var key in this.compo) {
            this.compo[key].val('');
        }
        this.model.getModel("data").reset();

        return this;
    },

    submit: function(success, error) {
        var self = this;

        this.$el.find('select').each(function() {
            if (this.selectedIndex == -1) {
                this.selectedIndex = 0;
            }
            self.set(this.name, this.value);
        });

        var res = this.validate();

        if (res.success) {

            if (this.useIFrame || this.$el.has('[type="file"]').length) {
                guid++;
                var target = "_submit_iframe" + guid;
                var resultText;
                var $iframe = $('<iframe style="top:-999px;left:-999px;position:absolute;display:none;" frameborder="0" width="0" height="0" name="' + target + '"></iframe>')
                    .appendTo(document.body)
                    .on('load', function() {
                        var result = this.contentWindow.document.body.innerHTML;
                        var match = /\<[^\>]+\>\s*\{/m.exec(result);
                        if (match && match[0].length) {
                            result = result.substr(match[0].length - 1);
                        }
                        match = /\}\s*\<[^\>]+\>/m.exec(result);
                        if (match && match[0].length) {
                            result = result.substr(0, match.index + 1);
                        }
                        result = $.trim(result);
                        if (!resultText || result != resultText) {
                            resultText = result;
                            try {
                                var res = JSON.parse(resultText);
                                if (res.success)
                                    success.call(self, res);
                                else
                                    error && error.call(self, res, resultText);

                            } catch (e) {
                                error && error.call(self, e, resultText);
                            }
                        }
                    });

                this.$el.attr("target", target).submit();

            } else {
                $.ajax({
                    url: this.url,
                    type: 'POST',
                    dataType: 'json',
                    xhrFields: this.xhrFields,
                    contentType: this.contentType ? this.contentType : undefined,
                    data: this.contentType == "application/json" ? JSON.stringify(this.model.data.data) : this.$el.serialize(),
                    success: function(res) {
                        if (res.success) {
                            success.call(self, res);
                        } else {
                            error && error.call(self, res);
                        }
                    },
                    error: error && $.proxy(error, this)
                });
            }
        } else {
            sl.tip("请检查填写是否有误");
        }
    },

    validate: function() {
        var res = this.valid.validate();
        this.model.set(res);

        return res;
    },

    _validInput: function(e) {
        var $target = $(e.currentTarget);
        var name = $target.attr('name');
        var res = this.valid.validate(name);

        if (!this.model.data.result) this.model.set({
            result: {}
        });

        this.model.set('result.' + name, res);
    },

    destory: function() {
        this.$el.on('off', '[name]', this._validInput);
    }
};

var plugins = {};
FormComponent.define = function(id, Func) {
    plugins[id.toLowerCase()] = Func;
};

FormComponent.require = function(id) {
    return plugins[id.toLowerCase()];
};

var RichTextBox = function($input, options) {
    var self = this;
    self.$input = $input;
    self.id = 'UMEditor' + (RichTextBox.guid++);

    window.UMEDITOR_HOME_URL = seajs.resolve('components/umeditor/');

    self.async = new Async(function(done) {
        window.jQuery ? done(window.jQuery) : seajs.use(['components/umeditor/third-party/jquery.min'], done);

    }).then(function(res, err, done) {
        seajs.use(['components/umeditor/umeditor.config', 'components/umeditor/umeditor', 'components/umeditor/themes/default/css/umeditor.css'], function(a) {
            var editorOptions = {};
            if (options.toolbar) editorOptions.toolbar = options.toolbar;
            else if (options.simple) editorOptions.toolbar = ['source | undo redo | bold italic underline strikethrough | removeformat | justifyleft justifycenter justifyright justifyjustify | link unlink | image'];

            editorOptions.$id = $('<script type="text/plain" id="' + self.id + '" style="width:' + (options.width || 640) + 'px;height:300px;"></script>').insertBefore($input)[0];
            editorOptions.initialFrameHeight = 300;

            editorOptions.imagePath = options.imagePath || Base.UMEditorImagePath;
            editorOptions.imageUrl = options.imageUrl || Base.UMEditorImageUrl;

            var editor = UM.getEditor(self.id, editorOptions);

            editor.addListener('blur', function() {
                var content = editor.getContent();
                var original = $input[0].value;

                $input.val(content);
                if (original !== content) $input.trigger('change');
                $input.trigger('blur');
            });

            self.editor = editor;
            editor.ready(function() {
                done();
            });
        });
        return this;
    });

};

RichTextBox.prototype = {
    val: function(val) {
        var self = this;
        self.async.await(function() {

            self.editor.setContent(val, false);
        });
        self.$input.val(val).trigger('change');
    }
}

RichTextBox.guid = 0;

FormComponent.define('RichTextBox', RichTextBox);
FormComponent.define('TimePicker', TimePicker);

var CheckBoxList = function($input, options) {
    var self = this;
    self.$input = $input;
    self.options = options;

    options.options.forEach(function(item) {
        $('<input pname="' + options.field + '" type="checkbox" value="' + item.value + '" /><span style="margin-right: 10px">' + item.text + '</span>').insertBefore($input);
    })

    self.$checkBoxList = self.$input.siblings('[pname="' + self.options.field + '"]');

    self.$checkBoxList.on('click', function() {
        var res = [];
        self.$checkBoxList.each(function() {
            if (this.checked) {
                res.push(this.value);
            }
        });
        var original = $input[0].value;
        var content = res.join('|');

        $input.val(content);
        if (original !== content) $input.trigger('change');
        $input.trigger('blur');
    });
}
CheckBoxList.prototype = {
    val: function(val) {
        var self = this;

        self.$input.siblings('[pname="' + self.options.field + '"]').removeAttr('checked').each(function() {
            this.checked = false;

        }).filter((val || 'null').split('|').map(function(item) {
            return '[value="' + item + '"]';

        }).join(',')).attr('checked', 'checked').each(function() {
            this.checked = true;
        });

        self.$input.val(val).trigger('change');
    }
}

FormComponent.define('CheckBoxList', CheckBoxList);

module.exports = FormComponent;