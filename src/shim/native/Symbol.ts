import global from '../support/global';
import { getValueDescriptor } from '../support/util';

/* tslint:disable-next-line:variable-name */
const SymbolShim: SymbolConstructor = global.Symbol;

/**
 * Fill any missing well known symbols if the native Symbol is missing them
 */
[ 'hasInstance', 'isConcatSpreadable', 'iterator', 'species', 'replace', 'search', 'split', 'match', 'toPrimitive',
	'toStringTag', 'unscopables' ].forEach((wellKnown) => {
		if (!(<any> Symbol)[wellKnown]) {
			Object.defineProperty(Symbol, wellKnown, getValueDescriptor(Symbol.for(wellKnown), false, false));
		}
	});

export function isSymbol(value: any): value is symbol {
	return typeof value === 'symbol';
};

export default SymbolShim;
