import has from './support/has';
import global from './global';
import { getValueDescriptor } from './support/util';

declare global {
	interface SymbolConstructor {
		observable: symbol;
	}
}

export let Symbol: SymbolConstructor = global.Symbol;

if (!has('es6-symbol')) {
	/**
	 * Throws if the value is not a symbol, used internally within the Shim
	 * @param  {any}    value The value to check
	 * @return {symbol}       Returns the symbol or throws
	 */
	const validateSymbol = function validateSymbol(value: any): symbol {
		if (!isSymbol(value)) {
			throw new TypeError(value + ' is not a symbol');
		}
		return value;
	};

	const defineProperties = Object.defineProperties;
	const defineProperty: (o: any, p: string | symbol, attributes: PropertyDescriptor & ThisType<any>) => any = Object.defineProperty;
	const create = Object.create;

	const objPrototype = Object.prototype;

	const globalSymbols: { [key: string]: symbol } = {};

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
					set: function (this: Symbol, value: any) {
						defineProperty(this, name, getValueDescriptor(value));
					}
				});
			}

			return name;
		};
	}());

	const InternalSymbol = function Symbol(this: any, description?: string|number): symbol {
		if (this instanceof InternalSymbol) {
			throw new TypeError('TypeError: Symbol is not a constructor');
		}
		return Symbol(description);
	};

	Symbol = global.Symbol = function Symbol(this: Symbol, description?: string|number): symbol {
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

	/* Decorate the Symbol function with the appropriate properties */
	defineProperty(Symbol, 'for', getValueDescriptor(function (key: string): symbol {
		if (globalSymbols[key]) {
			return globalSymbols[key];
		}
		return (globalSymbols[key] = Symbol(String(key)));
	}));
	defineProperties(Symbol, {
		keyFor: getValueDescriptor(function (sym: symbol): string | undefined {
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
		observable: getValueDescriptor(Symbol.for('observable'), false, false),
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
		toString: getValueDescriptor(function (this: { __name__: string }) { return this.__name__; }, false, false)
	});

	/* Decorate the Symbol.prototype */
	defineProperties(Symbol.prototype, {
		toString: getValueDescriptor(function (this: Symbol) { return 'Symbol (' + (<any> validateSymbol(this)).__description__ + ')'; }),
		valueOf: getValueDescriptor(function (this: Symbol) { return validateSymbol(this); })
	});

	defineProperty(Symbol.prototype, Symbol.toPrimitive, getValueDescriptor(function (this: Symbol) { return validateSymbol(this); }));
	defineProperty(Symbol.prototype, Symbol.toStringTag, getValueDescriptor('Symbol', false, false, true));

	defineProperty(InternalSymbol.prototype, Symbol.toPrimitive, getValueDescriptor((<any> Symbol).prototype[Symbol.toPrimitive], false, false, true));
	defineProperty(InternalSymbol.prototype, Symbol.toStringTag, getValueDescriptor((<any> Symbol).prototype[Symbol.toStringTag], false, false, true));
}

/**
 * A custom guard function that determines if an object is a symbol or not
 * @param  {any}       value The value to check to see if it is a symbol or not
 * @return {is symbol}       Returns true if a symbol or not (and narrows the type guard)
 */
export function isSymbol(value: any): value is symbol {
	return (value && ((typeof value === 'symbol') || (value['@@toStringTag'] === 'Symbol'))) || false;
}

/**
 * Fill any missing well known symbols if the native Symbol is missing them
 */
[ 'hasInstance', 'isConcatSpreadable', 'iterator', 'species', 'replace', 'search', 'split', 'match', 'toPrimitive',
	'toStringTag', 'unscopables', 'observable' ].forEach((wellKnown) => {
		if (!(Symbol as any)[wellKnown]) {
			Object.defineProperty(Symbol, wellKnown, getValueDescriptor(Symbol.for(wellKnown), false, false));
		}
	});

export default Symbol;
