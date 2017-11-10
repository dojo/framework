import global from './global';
import * as tslib from 'tslib';

/**
 * Provide any overrides and then load the TypeScript helpers.
 */
(<any> tslib).__values = global.__values = function (o: any) {
	let m = typeof Symbol === 'function' && o[ Symbol.iterator ], i = 0;
	if (m) {
		return m.call(o);
	}

	if (typeof o === 'string') {
		const l = o.length;

		return {
			next: function () {
				if (i >= l) {
					return { done: true };
				}

				let char = o[ i++ ];
				if (i < l) {
					let code = char.charCodeAt(0);
					if ((code >= 0xD800) && (code <= 0xDBFF)) {
						char += o[ i++ ];
					}
				}

				return { value: char, done: false };
			}
		};
	}

	return {
		next: function () {
			if (o && i >= o.length) {
				o = void 0;
			}
			return { value: o && o[ i++ ], done: !o };
		}
	};
};

// load typescript helpers
import 'tslib';
