import has from './support/has';
import global from './support/global';
import { getValueDescriptor } from './support/util';

export namespace Shim {
	/* tslint:disable-next-line:variable-name */
	let Symbol: SymbolConstructor;
	/* tslint:disable-next-line:variable-name */
	let InternalSymbol: SymbolConstructor;

	const defineProperties = Object.defineProperties;
	const defineProperty = Object.defineProperty;
	const create = Object.create;

	const objPrototype = Object.prototype;

	interface GlobalSymbols {
		[key: string]: symbol;
	}

	const globalSymbols: GlobalSymbols = {};

	interface TypedPropertyDescriptor<T> extends PropertyDescriptor {
		value?: T;
		get? (): T;
		set? (v: T): void;
	}

	const getSymbolName = (function () {
		const created = create(null);
		return function (desc: string|number): string {
			let postfix = 0;
			let name: string;
			while (created[String(desc) + (postfix || '')]) {
				++postfix;
			}
			desc += String(postfix || '');
			created[desc] = true;
			name = '@@' + desc;

			// FIXME: Temporary guard until the duplicate execution when testing can be
			// pinned down.
			if (!Object.getOwnPropertyDescriptor(objPrototype, name)) {
				defineProperty(objPrototype, name, {
					set: function (value: any) {
						defineProperty(this, name, getValueDescriptor(value));
					}
				});
			}

			return name;
		};
	}());

	InternalSymbol = function Symbol(description?: string|number): symbol {
		if (this instanceof InternalSymbol) {
			throw new TypeError('TypeError: Symbol is not a constructor');
		}
		return Symbol(description);
	} as SymbolConstructor;

	Symbol = function Symbol(description?: string|number): symbol {
		if (this instanceof Symbol) {
			throw new TypeError('TypeError: Symbol is not a constructor');
		}
		const sym = Object.create(InternalSymbol.prototype);
		description = (description === undefined ? '' : String(description));
		return defineProperties(sym, {
			__description__: getValueDescriptor(description),
			__name__: getValueDescriptor(getSymbolName(description))
		});
	} as SymbolConstructor;

	/**
	 * A custom guard function that determines if an object is a symbol or not
	 * @param  {any}       value The value to check to see if it is a symbol or not
	 * @return {is symbol}       Returns true if a symbol or not (and narrows the type guard)
	 */
	export function isSymbol(value: any): value is symbol {
		return (value && ((typeof value === 'symbol') || (value['@@toStringTag'] === 'Symbol'))) || false;
	}

	/**
	 * Throws if the value is not a symbol, used internally within the Shim
	 * @param  {any}    value The value to check
	 * @return {symbol}       Returns the symbol or throws
	 */
	function validateSymbol(value: any): symbol {
		if (!isSymbol(value)) {
			throw new TypeError(value + ' is not a symbol');
		}
		return value;
	}

	/* Decorate the Symbol function with the appropriate properties */
	defineProperty(Symbol, 'for', getValueDescriptor(function (key: string): symbol {
		if (globalSymbols[key]) {
			return globalSymbols[key];
		}
		return (globalSymbols[key] = Symbol(String(key)));
	}));
	defineProperties(Symbol, {
		keyFor: getValueDescriptor(function (sym: symbol): string {
			let key: string;
			validateSymbol(sym);
			for (key in globalSymbols) {
				if (globalSymbols[key] === sym) {
					return key;
				}
			}
		}),
		hasInstance: getValueDescriptor(Symbol.for('hasInstance'), false, false),
		isConcatSpreadable: getValueDescriptor(Symbol.for('isConcatSpreadable'), false, false),
		iterator: getValueDescriptor(Symbol.for('iterator'), false, false),
		match: getValueDescriptor(Symbol.for('match'), false, false),
		replace: getValueDescriptor(Symbol.for('replace'), false, false),
		search: getValueDescriptor(Symbol.for('search'), false, false),
		species: getValueDescriptor(Symbol.for('species'), false, false),
		split: getValueDescriptor(Symbol.for('split'), false, false),
		toPrimitive: getValueDescriptor(Symbol.for('toPrimitive'), false, false),
		toStringTag: getValueDescriptor(Symbol.for('toStringTag'), false, false),
		unscopables: getValueDescriptor(Symbol.for('unscopables'), false, false)
	});

	/* Decorate the InternalSymbol object */
	defineProperties(InternalSymbol.prototype, {
		constructor: getValueDescriptor(Symbol),
		toString: getValueDescriptor(function () { return this.__name__; }, false, false)
	});

	/* Decorate the Symbol.prototype */
	defineProperties(Symbol.prototype, {
		toString: getValueDescriptor(function () { return 'Symbol (' + (<any> validateSymbol(this)).__description__ + ')'; }),
		valueOf: getValueDescriptor(function () { return validateSymbol(this); })
	});

	defineProperty(Symbol.prototype, <any> Symbol.toPrimitive, getValueDescriptor(function () { return validateSymbol(this); }));
	defineProperty(Symbol.prototype, <any> Symbol.toStringTag, getValueDescriptor('Symbol', false, false, true));

	defineProperty(InternalSymbol.prototype, <any> Symbol.toPrimitive, getValueDescriptor(Symbol.prototype[Symbol.toPrimitive], false, false, true));
	defineProperty(InternalSymbol.prototype, <any> Symbol.toStringTag, getValueDescriptor(Symbol.prototype[Symbol.toStringTag], false, false, true));

	/* tslint:disable-next-line:variable-name */
	export const Exposed = Symbol;
}

/* tslint:disable-next-line:variable-name */
const SymbolShim: SymbolConstructor = has('es6-symbol') ? global.Symbol : global.Symbol = Shim.Exposed;

/**
 * Fill any missing well known symbols if the native Symbol is missing them
 */
[ 'hasInstance', 'isConcatSpreadable', 'iterator', 'species', 'replace', 'search', 'split', 'match', 'toPrimitive',
	'toStringTag', 'unscopables' ].forEach((wellKnown) => {
		if (!(<any> Symbol)[wellKnown]) {
			Object.defineProperty(Symbol, wellKnown, getValueDescriptor(Symbol.for(wellKnown), false, false));
		}
	});

export const isSymbol = Shim.isSymbol;

export default SymbolShim;
