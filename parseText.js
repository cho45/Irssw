#!/usr/bin/env node

util = require('util');

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

var count = 0;
function is_deepy (got, expected) {
	count++;
	got = util.inspect(got);
	expected = util.inspect(expected)
	if (got == expected) {
		console.log('ok');
	} else {
		console.log('ng');
		console.log('# got:');
		console.log(got.replace(/^/gm, '# '));
		console.log('# expected:');
		console.log(expected.replace(/^/gm, '# '));
	}
}

function done_testing () {
	console.log(count + '..' + count);
}

var text = "\u00048/<\u0004g \u0004gberttrand\u0004g\u00048/>\u0004g \u0004eAAAAA  \u0002*STRONG*\u0002 ...";
is_deepy(parseText("\u00048/<\u0004g \u0004gberttrand\u0004g\u00048/>\u0004g \u0004eAAAAA  \u0002*STRONG*\u0002 ..."),
	[ { attr: { fg: 47 }, text: '<' }
	, { attr: {}, text: ' ' }
	, { attr: {}, text: 'berttrand' }
	, { attr: { fg: 47 }, text: '>' }
	, { attr: {}, text: ' ' }
	, { attr: { indent: true }, text: 'AAAAA  ' }
	, { attr: { indent: true, bold: true }
	  , text: '*STRONG*'
	  }
	, { attr: { indent: true, bold: false }, text: ' ...' }
	]
);

is_deepy(parseText("\u00048/<\u0004g \u0004gfoobar\u0004g\u00048/>\u0004g \u0004eAAAAAA \u000310 [kyu]"),
	[ { attr: { fg: 47 }, text: '<' }
	, { attr: {}, text: ' ' }
	, { attr: {}, text: 'foobar' }
	, { attr: { fg: 47 }, text: '>' }
	, { attr: {}, text: ' ' }
	, { attr: { indent: true }, text: 'AAAAAA ' }
	, { attr: { indent: true, fg: 49, bg: 48 }
		  , text: ' [kyu]'
			    }
	]
);

done_testing();

