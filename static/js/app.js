document.createElement('time'); // bad hack
Deferred.define();

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

function link (text) {
	var re    = /(h?ttps?:\/\/\S+)/;
	var texts = text.split(re);
	var ret   = document.createDocumentFragment();
	for (var i = 0, len = texts.length; i < len; i++) {
		var t = texts[i];
		if (re.test(t)) {
			var link = t, text = t;
			var a = document.createElement('a');
			a.target = '_blank';
			a.className = 'external';
			if (/^ttp/.test(link)) link = 'h' + link;
			if (/^http/.test(link)) {
				if (/\.(png|gif|jpe?g)$/.test(link)){
					var img = document.createElement('img');
					img.src = '/image?l=' + encodeURIComponent(t) + '&w=' + window.innerWidth + '&h=' + window.innerHeight;
					a.href  = link;
					a.appendChild(img);
				} else
				if (/https?:\/\/maps.google.(?:co.jp|com)\/maps?.*q=([-+\d.]+),([-+\d.]+)/.test(t)) {
					var lat = RegExp.$1, lon = RegExp.$2;
					var staticmap = 'http://maps.google.com/maps/api/staticmap?';
					staticmap += '&size=140x140';
					staticmap += '&zoom=13';
					staticmap += '&mobile=true';
					staticmap += '&sensor=false';
					staticmap += '&markers=' + lat + ',' + lon;
					var img = document.createElement('img');
					img.src = staticmap;
					img.width = 140;
					img.height = 140;
					a.href  = link;
					a.appendChild(img);
				} else {
					var loc  = Location.parse(link);
					var text = loc.host;
					a.setAttribute('data-uri', link);
					a.href = '/redirect?l=' + encodeURIComponent(link);
					a.appendChild(document.createTextNode(text));
				}
			} else {
				a.href = link;
				a.appendChild(document.createTextNode(text));
			}
			ret.appendChild(a);
		} else {
			ret.appendChild(document.createTextNode(t));
		}
	}
	return ret;
}

function format (text) {
	var parsed = parseIRCMessage(text);
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
			this.unit     = 'day';
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
			'hour'   : '時',
			'day'    : '日',
			'year'   : '年'
		}[dtrl.unit] + (dtrl.isFuture ? '後' : '前')
	} else {
		format = dtrl.number + ' ' +
				 dtrl.unit + (dtrl.number == 0 || dtrl.number > 1 ? 's ' : ' ') +
				 (dtrl.isFuture ? 'after' : 'ago');
	}
	target.innerHTML = format;
};
DateRelative.updateAll = function (parent) {
	parent = parent || document;
	var targets = parent.getElementsByTagName('time');
	for (var i = 0, len = targets.length; i < len; i++) {
		DateRelative.update(targets[i]);
	}
};
DateRelative.setupAutoUpdate = function (parent) {
	return setInterval(function () {
		DateRelative.updateAll(parent);
	}, 60 * 1000);
};


Irssw = {};
Irssw.channels = {};
Irssw.currentChannel = null;
Irssw.Channel = function () { this.init.apply(this, arguments) };
Irssw.Channel.prototype = {
	init : function (name) {
		var self = this;
		self.name     = name;
		self.pointer  = null;
		self.maximum  = 50;
		self.messages = [];
	},

	/** retrive new log
	 */
	update : function () {
		var self = this;

		var after = self.messages[0] ? self.messages[0].time : 0;
		return $.ajax({
			url : '/api/channel',
			dataType : 'json',
			timeout: 30 * 1000,
			data : {
				c      : self.name,
				after  : after,
			    limit  : 20,
				t      : new Date().getTime()
			}
		}).
		next(function (data) {
			self.messages = data.messages.concat(self.messages);
			// squeeze to suppress memory usage
			while (self.messages.length > 50) self.messages.pop();
			if (self.unread) {
				var messages = self.messages.slice(0, self.unread);
				self.pointer = messages[messages.length - 1];
				return messages;
			} else {
				var messages = data.messages;
				if (!self.pointer) {
					self.pointer = messages[messages.length - 1];
				}	
				return messages;
			}
		});
	},

	/* get n logs from current pointer
	 */
	get : function (n, lock) {
		var self = this;
		var ret = [];
		var messages = self.messages;
		var before   = self.pointer ? self.pointer.time : Infinity;
		for (var i = 0, len = messages.length; i < len && ret.length < n; i++) {
			var message = messages[i];
			if (message.time < before) {
				ret.push(message);
			}
		}
		self.pointer = ret[ret.length-1] || self.pointer;

		if (ret.length < n && !lock) {
			return $.ajax({
				url : '/api/channel',
				dataType : 'json',
				timeout: 30 * 1000,
				data : {
					c      : self.name,
					limit  : n - ret.length,
					before : self.pointer ? self.pointer.time : 0,
					t      : new Date().getTime()
				}
			}).
			next(function (data) {
				if (data.messages.length) {
					self.messages = data.messages.concat(self.messages);
					return self.get(n - ret.length, true).next(function (rest) {
						return ret.concat(rest);
					});
				} else {
					return ret;
				}
			});
		} else {
			return next(function () {
				return ret;
			});
		}
	}
};
Irssw.error = function (e) {
	return $.ajax({
		url : '/api/error',
		dataType : 'json',
		timeout: 30 * 1000,
		data : {
			e : e,
			t : new Date().getTime()
		}
	});
};
Irssw.createLine = function (message) {
	var date    = new Date(+message.time * 1000);
	var types   = [];
	if (message.level & MSGLEVEL_PUBLIC) types.push('public');
	if (message.level & MSGLEVEL_NOTICES) types.push('notice');

	var datetime = 
		String(10000 + date.getUTCFullYear()).substring(1)     + "-" + 
		String(101   + date.getUTCMonth()).substring(1)        + "-" + 
		String(100   + date.getUTCDate()).substring(1)         + "T" + 
		String(100   + date.getUTCHours()).substring(1)        + ":" + 
		String(100   + date.getUTCMinutes()).substring(1)      + ":" + 
		String(100   + date.getUTCSeconds()).substring(1)      + "." + 
		String(1000  + date.getUTCMilliseconds()).substring(1) + 'Z';

	var line = createElementFromString(
		"<div class='message'>" +
			"<span class='meta'><time datetime='#{datetime}' class='time'></time></span>" +
			"<span class='nick'>#{nick}</span>" +
			"<div class='body'></div>" +
		"</div>", {
		data: {
			datetime: datetime,
			nick: message.nick
		}
	});

	if (message.uri) {
		$(line.time).wrap($('<a></a>').attr('href', message.uri));
	}

	line.body.appendChild(format(message.text));

	line.className += ' ' + types.join(' ');

	DateRelative.update(line.time);

	return $(line);
};
Irssw.updateChannelList = function (callback) {
	return $.ajax({
		url : '/api/channels',
		dataType : 'json',
	    timeout: 30 * 1000,
		data : {
			t : new Date().getTime()
		}
	}).
	next(function (data) {
		var channels = data.channels;

		var names = {};
		for (var i = 0, len = channels.length; i < len; i++) {
			var channel = channels[i];
			if (!Irssw.channels[channel.name]) Irssw.channels[channel.name] = new Irssw.Channel(channel.name);
			for (var key in channel) if (channel.hasOwnProperty(key)) {
				Irssw.channels[channel.name][key] = channel[key];
			}
			names[channel.name] = true;
		}

		// delete parted channels
		for (var key in Irssw.channels) if (Irssw.channels.hasOwnProperty(key)) {
			var val = Irssw.channels[key];
			if (!names[key]) {
				delete Irssw.channels[key];
			}
		}

		return channels;
	});
};
Irssw.command = function (text) {
	var name = Irssw.currentChannel;
	var channel = Irssw.channels[name] || { messages : [] };
	var command;
	if (text.match(/^\//)) {
		command = text.substring(1);
	} else{
		command = 'msg ' + name + ' ' + text;
	}

	return $.ajax({
		url : '/api/command',
		type: 'post',
		dataType: 'json',
		timeout: 30 * 1000,
		data : {
			refnum : channel.refnum,
			command : command,
			rks : User.rks
		}
	});
};

(function ($) {
	var last = location.hash;

	$.fn.hashchange = function (fun) {
		if (fun) {
			arguments.callee.setup.apply(this);
			return this.bind('hashchange', fun);
		} else {
			return this.trigger('hashchange');
		}
	};

	$.fn.hashchange.setup = function () {
		var self = this;
		(function () {
			if (location.hash != last) {
				self.trigger('hashchange');
			}
			setTimeout(arguments.callee, 500);
		})();
	};

	$(window).hashchange(function () {
		last = location.hash;
	});
})(jQuery);

$(function () {
	DateRelative.setupAutoUpdate();

//	isTouch = (
//		navigator.userAgent.indexOf('Android') != -1 ||
//		navigator.userAgent.indexOf('iPhone') != -1
//	);
	isTouch = User.isTouch;

	var streamBody  = $('#log');
	var channelList = $('#channels ul');
	var input       = $('#input');
	var loading     = $('#loading');
	var nextpage    = $('#nextpage');

	if (isTouch) {
		streamBody.hide();
		input.hide();
		nextpage.hide();
	}

	function updateChannelLog (name) {
		if (updateChannelLog.loading) return;
		updateChannelLog.loading = true;

		document.title =  name;
		location.hash = encodeURI(name);
		$('#input-title').text(name);

		var channel = Irssw.channels[name] || new Irssw.Channel(name);
		if (Irssw.currentChannel != name) {
			Irssw.channels = {};
			streamBody.empty();
		}
		Irssw.channels[name] = channel;
		Irssw.currentChannel = name;

		loading.prependTo(streamBody);
		loading.show();

		channel.update().
		next(function (messages) {
			var div = $('<div></div>');
			for (var i = 0, len = messages.length; i < len; i++) {
				var message = messages[i];
				var line = Irssw.createLine(message);
				line.appendTo(div);
			}
			div.prependTo(streamBody);
		}).
		next(function () {
			loading.hide();
			DateRelative.updateAll();
			updateChannelLog.loading = false;
			updateChannelList();

			var nextpageClick = new Deferred();
			nextpage.appendTo(streamBody).unbind('click').bind('click', function () {
				nextpageClick.call();
			}).show();

			var loadingNextPage;
			return nextpageClick.loop(50, function (n) {
				if (loadingNextPage) return nextpageClick;
				loadingNextPage = true;

				loading.appendTo(streamBody);
				nextpage.hide();
				loading.show();

				return channel.get(10).next(function (messages) {
					loadingNextPage = false;
					for (var i = 0, len = messages.length; i < len; i++) {
						var message = messages[i];
						var line = Irssw.createLine(message);
						line.appendTo(streamBody);
					}
					loading.hide();
					if (messages.length)
						nextpage.appendTo(streamBody).show();

					return nextpageClick;
				});
			});
		}).
		error(function (e) {
			Irssw.error(e);
			updateChannelLog.loading = false;
		});
	}

	function updateChannelList () {
		if (updateChannelList.loading) return;
		updateChannelList.loading = true;

		return Irssw.updateChannelList().
		next(function (channels) {
			channelList.empty();
			for (var i = 0, len = channels.length; i < len; i++) (function (channel) {
				var channel = channels[i];	
				var li = $('<li></li>');
				$('<span class="channel-name"></span>').text(channel.name).appendTo(li).click(function () {
					location.hash = encodeURI(channel.name);
					$(window).hashchange();
				});
				if (channel.unread) {
					$('<span class="unread"></span>').text(channel.unread).appendTo(li);
				}
				channelList.append(li);
			})(channels[i]);
		}).
		next(function () {
			updateChannelList.loading = false;
		}).
		error(function (e) {
			updateChannelList.loading = false;
			Irssw.error('updateChannelList: ' + e);
		});
	}

	$('#input form').submit(function () {
		try {
		var text = $('#input-text').val();
		if (text) {
			Irssw.command(text).
			next(function () {
				updateChannelLog(Irssw.currentChannel);
				updateChannelList();
			});
			$('#input-text').val('');
		} else {
			updateChannelLog(Irssw.currentChannel);
		}
		} catch (e) { alert(e) }
		return false;
	});

	$('#input select.post').change(function () {
		var handler = {
			post : function () {
				$('#input form').submit()
			},
			location : function  () {
				getCurrentLocation(function (pos) {
					var lat = pos.coords.latitude;
					var lon = pos.coords.longitude;
					var q   = lat + ',+' + lon + (
						''
					);
					var uri = 'http://maps.google.co.jp/maps?q=' + q + '&iwloc=A&hl=ja';
					$('#input-text').val($('#input-text').val() + ' ' + uri);
					$('#input form').submit();
				});
			}
		}[this.value];
		if (handler) {
			try {
				handler();
			} catch (e) { alert(e) }
		}
		this.selectedIndex = 0;
	});

//	$('#input-text').change(function () {
//		if ($(this).val()) {
//			$('#input select.post option[value="post"]').text('Post');
//		} else {
//			$('#input select.post option[value="post"]').text('Reload');
//		}
//	});

	$(window).scroll(function () {
		var height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
		var remain = height - window.innerHeight - window.scrollY;
		if (remain < 100 + window.innerHeight) {
			if (nextpage.is(':visible')) nextpage.click();
		}
	});

	$.fn.hashchange.delay = 1000;
	$(window).hashchange(function () {
		if (location.hash) {
			updateChannelLog(decodeURI(location.hash));
			if (isTouch) {
				input.show();
				streamBody.show();
				channelList.hide();
			}
		} else {
			document.title = "Irssw";
			updateChannelList();
			if (isTouch) {
				input.hide();
				streamBody.hide();
				channelList.show();
			}
		}
	}).hashchange();

	updateChannelList();

	setInterval(function () {
		updateChannelList();
	}, 30 * 1000);
});

