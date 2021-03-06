var util = require('util');
var model2 = require('core/model2');


var messagesList = model2.createModel({
    defaultData: util.store('messagesList') || {
        list: []
    },

    getFriendLastMessage: function (friend_id) {

        var records = this._('list');
        var record = records.find('user_id', friend_id);

        return record;
    }
});

messagesList.on('datachanged', function () {
    util.store('messagesList', this.data);
});


module.exports = messagesList;