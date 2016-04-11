interface Symbol {
	toString(): string;
	valueOf(): Object;
	[Symbol.toStringTag]: string;
	[Symbol.toPrimitive]: symbol;
	[s: string]: any;
}

interface SymbolConstructor {
	prototype: Symbol;
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

declare var Symbol: SymbolConstructor;
