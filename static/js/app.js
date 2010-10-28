
function encode_entities (str) {
	var t = document.createElement('div');
	t.appendChild(document.createTextNode(str));
	return t.innerHTML;
}

function format (text) {
	text = encode_entities(text);
	text = '<span>' + text.replace(/(\u0004)(([0-9>\?])\/|[eg])|(\u0003)(1\d)/g, function (_, is4, t1, n, is3, t2) {
		if (is4) {
			switch (t1) {
				case 'g' : return '</span><span class="nn">';
				case 'e' : return '</span><span class="ep">';
				default  : return '</span><span class="s' + n.charCodeAt(0) + '">';
			}
		} else {
			return '</span><span class="c' + t2 + '">';
		}
	}) + '</span>';
	return text;
}

$(function () {
	var channelList = $('#channels ul');
	var streamBody  = $('#log');

	$.getJSON('/api/channels', function (data) {
		var channels = data.channels;
		channelList.empty();
		for (var i = 0, len = channels.length; i < len; i++) (function (channel) {
			var li = $('<li></li>').text(channel.name);
			li.click(function () {
				$.getJSON('/api/channel', { c : channel.name }, function (data) {
					var messages = data.messages;
					try {
					streamBody.empty();
					for (var i = 0, len = messages.length; i < len; i++) {
						streamBody.append($('<div></div>').html(format(messages[i].text)));
					}
					} catch (e) { alert(e) }
					
				});
			});
			channelList.append(li);
		})(channels[i]);
	});
});

