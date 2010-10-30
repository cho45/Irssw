document.createElement('time'); // bad hack

/* constant */
MSGLEVEL_CRAP         = 0x0000001;
MSGLEVEL_MSGS         = 0x0000002;
MSGLEVEL_PUBLIC       = 0x0000004;
MSGLEVEL_NOTICES      = 0x0000008;
MSGLEVEL_SNOTES       = 0x0000010;
MSGLEVEL_CTCPS        = 0x0000020;
MSGLEVEL_ACTIONS      = 0x0000040;
MSGLEVEL_JOINS        = 0x0000080;
MSGLEVEL_PARTS        = 0x0000100;
MSGLEVEL_QUITS        = 0x0000200;
MSGLEVEL_KICKS        = 0x0000400;
MSGLEVEL_MODES        = 0x0000800;
MSGLEVEL_TOPICS       = 0x0001000;
MSGLEVEL_WALLOPS      = 0x0002000;
MSGLEVEL_INVITES      = 0x0004000;
MSGLEVEL_NICKS        = 0x0008000;
MSGLEVEL_DCC          = 0x0010000;
MSGLEVEL_DCCMSGS      = 0x0020000;
MSGLEVEL_CLIENTNOTICE = 0x0040000;
MSGLEVEL_CLIENTCRAP   = 0x0080000;
MSGLEVEL_CLIENTERROR  = 0x0100000;
MSGLEVEL_HILIGHT      = 0x0200000;

MSGLEVEL_ALL          = 0x03fffff;

MSGLEVEL_NOHILIGHT    = 0x1000000; /* Don't highlight this message */
MSGLEVEL_NO_ACT       = 0x2000000; /* Don't trigger channel activity */
MSGLEVEL_NEVER        = 0x4000000; /* never ignore / never log */
MSGLEVEL_LASTLOG      = 0x8000000; /* never ignore / never log */

function parseText (text) {
	var fg = 0;
	var bg = 0;
	var fl = 0;
	var ss = text.split(parseText.re);
	var ret = [];
	var state = {};
	for (var i = 0, len = ss.length; i < len; i++) {
		var text = ss[i];
		if (!text) continue;
		var type = text.charCodeAt(0);
		switch (type) {
			case 0x02:
				state.bold = !state.bold; break;
			case 0x03:
				if (text.charCodeAt(1)) state.fg = text.charCodeAt(1);
				if (text.charCodeAt(2)) state.bg = text.charCodeAt(2);
				break;
			case 0x04:
				switch (text.charCodeAt(1)) {
					case 0x61: state.blink = !state.blink; break;
					case 0x62: state.underline = !state.underline; break;
					case 0x63: state.bold = !state.bold; break;
					case 0x64: state.reverse = !state.reverse; break;
					case 0x65: state.indent = !state.indent; break;
					case 0x67: state = {}; break;
					case 0x68: state.clrtoeol = !state.clrtoeol; break;
					case 0x69: state.monospace = !state.monospace; break;
					case 0x29: break;
					default:
						if (text.charCodeAt(2)) state.fg = text.charCodeAt(2);
						if (text.charCodeAt(3)) state.bg = text.charCodeAt(3);
				}
				break;
			case 0x06:
				state.blink = !state.blink; break;
			case 0x0f:
				state = {}; break
			case 0x16:
				state.reverse = !state.reverse; break;
			case 0x1b:
				// TODO ansi
				break;
			case 0x1f:
				state.underline = !state.underline; break;
			default:
				var attr = {};
				for (var key in state) if (state.hasOwnProperty(key)) {
					attr[key] = state[key];
				}
				ret.push({ attr : attr, text : text });
		}
	}

	return ret;
}
parseText.types = [
	'\u0002',
	'\u0003[0-9][0-9]?',
	'\u0004(?:[\u0060-\u0069\u0029]|..)',
	'\u0006',
	'\u000f', // remove all
	'\u0016', // reverse
	'\u001b', // ansi
	'\u001f'  // underline
];
parseText.re = new RegExp('(' + parseText.types.join('|') + ')', 'g');

function link (text) {
	var re    = /(h?ttps?:\/\/\S+)/;
	var texts = text.split(re);
	var ret   = document.createDocumentFragment();
	for (var i = 0, len = texts.length; i < len; i++) {
		var t = texts[i];
		if (re.test(t)) {
			var a = document.createElement('a');
			if (/^ttp/.test(t)) t = 'h' + t;
			if (/^http/.test(t)) {
				a.href = 'http://www.google.com/url?sa=D&q=' + encodeURIComponent(t);
			} else {
				a.href = t;
			}
			a.target = '_blank';
			a.appendChild(document.createTextNode(texts[i]));
			ret.appendChild(a);
		} else {
			ret.appendChild(document.createTextNode(t));
		}
	}
	return ret;
}

function format (text) {
	var parsed = parseText(text);
	var ret    = document.createDocumentFragment();
	for (var i = 0, len = parsed.length; i < len; i++) {
		var t = parsed[i];
		var s = document.createElement('span');
		var a = t.attr;
		for (var key in a) if (a.hasOwnProperty(key)) {
			var val = a[key];
			if (typeof val == 'boolean') {
				if (val) s.className += ' ' + key;
			} else {
				s.className += ' ' + key + val;
			}
		}

		s.appendChild(link(t.text));
		ret.appendChild(s);
	}
	return ret;
}

function DateRelative () { this.init.apply(this, arguments) };
DateRelative.prototype = {
	init : function (value) {
		this.value = value + 0;
	},
	update : function () {
		var diff   = Math.floor((new Date().getTime() - this.value) / 1000);
		var future = diff < 0;
		if (future) diff = -diff;
		if (diff < 60) {
			this.number   = diff;
			this.unit     = 'second';
			this.isFuture = future;
			return this;
		}
		diff = Math.floor(diff / 60);
		if (diff < 60) {
			this.number   = diff;
			this.unit     = 'minute';
			this.isFuture = future;
			return this;
		}
		diff = Math.floor(diff / 60);
		if (diff < 24) {
			this.number   = diff;
			this.unit     = 'hour';
			this.isFuture = future;
			return this;
		}
		diff = Math.floor(diff / 24);
		if (diff < 365) {
			this.number   = diff;
			this.unit     = 'date';
			this.isFuture = future;
			return this;
		}
		diff = Math.floor(diff / 365);
		this.number   = diff;
		this.unit     = 'year';
		this.isFuture = future;
		return this;
	},
	valueOf : function () { return this.value }
};
DateRelative.update = function (target) {
	var dtrl = target._dtrl;
	if (!dtrl) {
		var dtf = target.getAttribute('datetime').match(/(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)(?:\.(\d+))?Z/);
		target._dtrl = dtrl = new DateRelative(Date.UTC(+dtf[1], +dtf[2] - 1, +dtf[3], +dtf[4], +dtf[5], +dtf[6]));
	}
	dtrl.update();

	var locale = navigator.userAgent.split(/[();]\s*/)[4];
	var format;
	if (/ja/.test(locale)) {
		format = dtrl.number + {
			'second' : '秒',
			'minute' : '分',
			'hour' : '時',
			'date' : '日',
			'year' : '年'
		}[dtrl.unit] + (dtrl.isFuture ? '後' : '前')
	} else {
		format = dtrl.number + ' ' +
				 dtrl.unit + (dtrl.number == 0 || dtrl.number > 1 ? 's ' : ' ') +
				 (dtrl.isFuture ? 'after' : 'ago');
	}
	target.innerHTML = format;
};
DateRelative.setupAutoUpdate = function (parent) {
	return setInterval(function () {
		parent = parent || document;
		var targets = parent.getElementsByTagName('time');
		for (var i = 0, len = targets.length; i < len; i++) {
			DateRelative.update(targets[i]);
		}
	}, 60 * 1000);
};


Irssw = {};
Irssw.channels = {};
Irssw.currentChannel = null;
Irssw.updateChannelList = function () {
	var channelList = $('#channels ul');
	$.getJSON('/api/channels', function (data) {
		var channels = data.channels;
		channelList.empty();
		for (var i = 0, len = channels.length; i < len; i++) (function (channel) {
			var li = $('<li></li>').text(channel.name);
			li.click(function () {
				Irssw.selectChannel(channel.name);
			});
			channelList.append(li);
		})(channels[i]);
	});
};
Irssw.updateChannelLog = function (name) {
	var streamBody  = $('#log');
	$.getJSON('/api/channel', { c : name, t : new Date().getTime() }, function (data) {
		var messages = data.messages;
		streamBody.empty();
		for (var i = 0, len = messages.length; i < len; i++) {
			var message = messages[i];
			var date    = new Date(+message.time * 1000);
			var line = $("<div class='message'></div>");
			var meta = $('<span class="meta"></span>').appendTo(line);
			var time = $('<time></time>').attr('datetime', 
				String(10000 + date.getUTCFullYear()).substring(1) + "-" +
				String(101 + date.getUTCMonth()).substring(1) + "-" +
				String(100 + date.getUTCDate()).substring(1) + "T" +
				String(100 + date.getUTCHours()).substring(1) + ":" +
				String(100 + date.getUTCMinutes()).substring(1) + ":" +
				String(100 + date.getUTCSeconds()).substring(1) + "." +
				String(1000 + date.getUTCMilliseconds()).substring(1) + 'Z'
			).text(date.toLocaleString()).appendTo(meta);
			$('<span class="nick"></span>').text(message.nick).appendTo(line);
			$('<div class="body"></div>').append(format(message.text)).appendTo(line);
			DateRelative.update(time[0]);
			streamBody.append(line);
		}
	});
};
Irssw.selectChannel = function (name) {
	Irssw.updateChannelLog(name);
};

$(function () {
	DateRelative.setupAutoUpdate();

	Irssw.updateChannelList();
	Irssw.selectChannel({ name : '#twitter@twitter' });
	setInterval(function () {
		Irssw.updateChannelList();
	}, 30 * 1000);
});

