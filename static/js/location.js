// immutable object, should not assign a value to properties
function Location () { this.init.apply(this, arguments) }
Location.prototype = {
	init : function (protocol, host, hostname, port, pathname, search, hash) {
		this.protocol  = protocol;
		this.host      = host;
		this.hostname  = hostname;
		this.port      = port || "";
		this.pathname  = pathname || "";
		this.search    = search || "";
		this.hash      = hash || "";
		this.href      = Array.prototype.join.call(arguments, "");
	},

	params : function (name) {
		if (!this._params) {
			var params = {};

			var pairs = this.search.substring(1).split(/[;&]/);
			for (var i = 0, len = pairs.length; i < len; i++) {
				var pair = pairs[i].split(/=/);
				var key  = decodeURIComponent(pair[0]);
				var val  = decodeURIComponent(pair[1]);

				if (!params[key]) params[key] = [];
				params[key].push(val);
			}

			this._params = params;
		}

		switch (typeof name) {
			case "undefined": return this._params;
			case "object"   : return this.build(this._params = name);
		}
		return this._params[name] ? this._params[name][0] : null;
	},

	build : function () {
		var ret = new Location();
		var _search = this.search;
		if (this._params) {
			var params = this._params;
			var search = [];
			for (var key in params) if (params.hasOwnProperty(key)) {
				var val = params[key];
				switch (typeof val) {
					case "object":
						for (var i = 0, len = val.length; i < len; i++) {
							search.push(encodeURIComponent(key) + '=' + encodeURIComponent(val[i]));
						}
						break;
					default:
						search.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
				}
			}
			_search = search.join('&');
		}

		with (this) ret.init.apply(ret, [
			protocol,
			host,
			hostname,
			port,
			pathname,
			_search,
			hash
		]);
		return ret;
	}
};
Location.regexp = new RegExp('^(https?:)//(([^:/]+)(:[^/]+)?)([^#?]*)(\\?[^#]*)?(#.*)?$');
Location.parse = function (string) {
	var matched = string.match(this.regexp);
	var ret = new Location();
	ret.init.apply(ret, matched.slice(1));
	return ret;
}
