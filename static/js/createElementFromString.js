function createElementFromString (str, opts) {
	if (!opts) opts = { data: {} };
	if (!opts.data) opts.data = { };

	var t, cur = opts.parent || document.createDocumentFragment(), root, stack = [cur];
	while (str.length) {
		if (str.indexOf("<") == 0) {
			if ((t = str.match(/^\s*<(\/?[^\s>\/]+)([^>]+?)?(\/)?>/))) {
				var tag = t[1], attrs = t[2], isempty = !!t[3];
				if (tag.indexOf("/") == -1) {
					child = document.createElement(tag);
					if (attrs) attrs.replace(/([a-z]+)=(?:'([^']+)'|"([^"]+)")/gi,
						function (m, name, v1, v2) {
							var v = text(v1 || v2);
							if (name == "class") root && (root[v] = child), child.className = v;
							child.setAttribute(name, v);
						}
					);
					cur.appendChild(root ? child : (root = child));
					if (!isempty) {
						stack.push(cur);
						cur = child;
					}
				} else cur = stack.pop();
			} else throw("Parse Error: " + str);
		} else {
			if ((t = str.match(/^([^<]+)/))) cur.appendChild(document.createTextNode(text(t[0])));
		}
		str = str.substring(t[0].length);
	}

	function text (str) {
		return str
			.replace(/&(#(x)?)?([^;]+);/g, function (_, isNumRef, isHex, ref) {
				return isNumRef ? String.fromCharCode(parseInt(ref, isHex ? 16 : 10)):
				                  {"lt":"<","gt":"<","amp":"&"}[ref];
			})
			.replace(/#\{([^}]+)\}/g, function (_, name) {
				return (typeof(opts.data[name]) == "undefined") ? _ : opts.data[name];
			});
	}

	return root;
}
