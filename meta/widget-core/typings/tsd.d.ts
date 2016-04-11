/// <reference path="../node_modules/dojo-actions/typings/dojo-actions/dojo-actions-2.0.0-pre.d.ts" />
/// <reference path="../node_modules/dojo-core/typings/dojo-core/dojo-core-2.0.0-pre.d.ts" />
/// <reference path="../node_modules/dojo-core/typings/symbol-shim/symbol-shim.d.ts" />
/// <reference path="../node_modules/dojo-compose/typings/dojo-compose/dojo-compose-2.0.0-pre.d.ts" />
/// <reference path="../node_modules/dojo-loader/typings/dojo-loader/dojo-loader-2.0.0-beta.2.d.ts" />
/// <reference path="../node_modules/@reactivex/rxjs/typings/main/ambient/es6-shim/index.d.ts" />
/// <reference path="../tests/typings/node/node.d.ts" />
/// <reference path="../node_modules/immutable/dist/immutable.d.ts" />

declare module 'immutable/immutable' {
	export = Immutable;
}

declare module 'maquette/maquette' {
	export * from 'node_modules/maquette/dist/maquette';
}

declare module 'rxjs/Rx' {
	export * from 'node_modules/@reactivex/rxjs/dist/cjs/Rx';
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
