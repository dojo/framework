import Patch from './patch/Patch';
import { Subscribable } from '@dojo/core/Observable';
import Map from '@dojo/shim/Map';
import Promise from '@dojo/shim/Promise';

export interface Query<T> {
	apply(data: T[]): T[];
	toString(querySerializer?: (query: Query<T>) => string): string;
	incremental?: boolean;
	queryType?: QueryType;
}

export type Constructor<T> = new (...args: any[]) => T;

export const enum QueryType {
	Filter,
	Sort,
	Range,
	Compound
}

export interface CrudOptions {
	rejectOverwrite?: boolean;
	id?: string;
}

export interface UpdateResults<T> {
	currentItems?: T[];
	failedData?: CrudArgument<T>[];
	successfulData: T[] | string[];
	type: StoreOperation;
}

/**
 * Adds a then method to the observable for those consumers of the store API who
 * only want to know about the end result of an operation, and don't want to deal with
 * any recoverable failures.
 */
export type StoreObservable<T, U> = Subscribable<U> & Promise<T[]>

export interface Storage<T, O extends CrudOptions> {
	identify(items: T[]|T): string[];
	createId(): Promise<string>;
	fetch(query?: Query<T>): FetchResult<T>;
	get(ids: string[]): Promise<T[]>;
	put(items: T[], options?: O): Promise<UpdateResults<T>>;
	add(items: T[], options?: O): Promise<UpdateResults<T>>;
	delete(ids: string[]): Promise<UpdateResults<T>>;
	patch(updates: { id: string; patch: Patch<T, T> }[], options?: O): Promise<UpdateResults<T>>;
}

export interface Store<T, O extends CrudOptions, U extends UpdateResults<T>> {
	get(ids: string[]): Promise<T[]>;
	get(id: string): Promise<T | undefined>;
	get(ids: string | string[]): Promise<T | undefined | T[]>;
	identify(items: T[]): string[];
	identify(items: T): string;
	identify(items: T | T[]): string | string[];
	createId(): Promise<string>;
	add(items: T[] | T, options?: O): StoreObservable<T, U>;
	put(items: T[] | T, options?: O): StoreObservable<T, U>;
	patch(updates: PatchArgument<T>, options?: O): StoreObservable<T, U>;
	delete(ids: string[] | string): StoreObservable<string, U>;
	fetch(query?: Query<T>): FetchResult<T>;
}

export const enum StoreOperation {
	Add,
	Put,
	Patch,
	Delete
}

export interface StoreOptions<T, O extends CrudOptions> {
	data?: T[];
	idProperty?: keyof T;
	idFunction?: (item: T) => string;
	storage?: Storage<T, O>;
}

export type CrudArgument<T> = T | string | PatchMapEntry<T, T>;

export type BasicPatch<T> = { id: string } & {
	[P in keyof T]?: T[P] | BasicPatch<T[P]>;
	};

export type PatchArgument<T> = Map<string, Patch<T, T>> |
	{ id: string; patch: Patch<T, T> } |
	{ id: string; patch: Patch<T, T> }[] |
	BasicPatch<T> |
	BasicPatch<T>[];

export interface FetchResult<T> extends Promise<T[]> {
	/**
	 * A Promise that resolves to the total number of items in the underlying storage.
	 */
	totalLength: Promise<number>;
	/**
	 * For a store, this is identical to totalLength. For a QueryTransformResultInterface, this resolves to the number of items
	 * that match the QueryTransformResultInterface's queries
	 */
	dataLength: Promise<number>;
}

export type PatchMapEntry<T, U> = { id: string; patch: Patch<T, U> };
