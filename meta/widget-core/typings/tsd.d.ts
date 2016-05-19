/// <reference path="../node_modules/dojo-core/typings/dojo-core/dojo-core.d.ts" />
/// <reference path="../node_modules/dojo-compose/typings/dojo-compose/dojo-compose.d.ts" />
/// <reference path="../node_modules/dojo-core/typings/symbol-shim/symbol-shim.d.ts" />

declare module 'immutable/immutable' {
	export * from 'immutable';
}

declare module 'maquette/maquette' {
	export * from 'maquette';
}

declare module 'rxjs/Rx' {
	export * from 'node_modules/@reactivex/rxjs/dist/cjs/Rx';
}

declare module 'rxjs/Observable' {
	export * from 'node_modules/@reactivex/rxjs/dist/cjs/Observable';
}

declare module 'rxjs/Observer' {
	export * from 'node_modules/@reactivex/rxjs/dist/cjs/Observer';
}

/* For some reasons reactivex/rxjs is missing these */
interface Iterator<T> {
	next(value?: any): IteratorResult<T>;
	return?(value?: any): IteratorResult<T>;
	throw?(e?: any): IteratorResult<T>;
}

interface Iterable<T> {
	[Symbol.iterator](): Iterator<T>;
}
