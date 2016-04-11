import has from './has';
import global from './global';
import { getValueDescriptor } from './util';

export namespace Shim {
	let Symbol: SymbolShimConstructor;
	let InternalSymbol: SymbolShimConstructor;

	export interface SymbolShim {
		toString(): string;
		valueOf(): Object;
		[Symbol.toStringTag]: string;
		[Symbol.toPrimitive]: symbol;
		[s: string]: any;
	}

	export interface SymbolShimConstructor {
		prototype: SymbolShim;
		(description?: string|number): symbol;
		for(key: string): symbol;
		keyFor(sym: symbol): string;
		hasInstance: symbol;
		isConcatSpreadable: symbol;
		iterator: symbol;
		match: symbol;
		replace: symbol;
		search: symbol;
		species: symbol;
		split: symbol;
		toPrimitive: symbol;
		toStringTag: symbol;
		unscopables: symbol;
	}

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
			defineProperty(objPrototype, name, {
				set: function (value: any) {
					defineProperty(this, name, getValueDescriptor(value));
				}
			});
			return name;
		};
	}());

	InternalSymbol = <any> function Symbol(description?: string|number): symbol {
		if (this instanceof InternalSymbol) {
			throw new TypeError('TypeError: Symbol is not a constructor');
		}
		return Symbol(description);
	};

	Symbol = <any> function Symbol(description?: string|number): symbol {
		if (this instanceof Symbol) {
			throw new TypeError('TypeError: Symbol is not a constructor');
		}
		const sym = Object.create(InternalSymbol.prototype);
		description = (description === undefined ? '' : String(description));
		return defineProperties(sym, {
			__description__: getValueDescriptor(description),
			__name__: getValueDescriptor(getSymbolName(description))
		});
	};

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
	defineProperties(Symbol, {
		for: getValueDescriptor(function (key: string): symbol {
			if (globalSymbols[key]) {
				return globalSymbols[key];
			}
			return (globalSymbols[key] = Symbol(String(key)));
		}),
		keyFor: getValueDescriptor(function (sym: symbol): string {
			let key: string;
			validateSymbol(sym);
			for (key in globalSymbols) {
				if (globalSymbols[key] === sym) {
					return key;
				}
			}
		}),
		hasInstance: getValueDescriptor(Symbol('hasInstance'), false, false),
		isConcatSpreadable: getValueDescriptor(Symbol('isConcatSpreadable'), false, false),
		iterator: getValueDescriptor(Symbol('iterator'), false, false),
		match: getValueDescriptor(Symbol('match'), false, false),
		replace: getValueDescriptor(Symbol('replace'), false, false),
		search: getValueDescriptor(Symbol('search'), false, false),
		species: getValueDescriptor(Symbol('species'), false, false),
		split: getValueDescriptor(Symbol('split'), false, false),
		toPrimitive: getValueDescriptor(Symbol('toPrimitive'), false, false),
		toStringTag: getValueDescriptor(Symbol('toStringTag'), false, false),
		unscopables: getValueDescriptor(Symbol('unscopables'), false, false)
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

	export const Exposed = Symbol;
}

const SymbolShim: Shim.SymbolShimConstructor = has('es6-symbol') ? global.Symbol : Shim.Exposed;

/**
 * Fill any missing well known symbols if the native Symbol is missing the well known
 */
[ 'hasInstance', 'isConcatSpreadable', 'iterator', 'species', 'replace', 'search', 'split', 'match', 'toPrimitive',
	'toStringTag', 'unscopables' ].forEach((wellKnown) => {
		if (!(<any> SymbolShim)[wellKnown]) {
			Object.defineProperty(SymbolShim, wellKnown, getValueDescriptor(SymbolShim(wellKnown), false, false));
		}
	});

export const isSymbol = Shim.isSymbol;

export default SymbolShim;
