import { ComposeFactory } from 'dojo-compose/compose';
import Promise from 'dojo-shim/Promise';

interface MemoryStore<T> {
	get(id: string | number): StorePromise<T>;
	add(item: T): StorePromise<this>;
	put(item: T): StorePromise<this>;
	delete(id: string | number | T): StorePromise<this>;
	query(): Query<T>;
}

interface StorePromise<T> extends Promise<T>, MemoryStore<T> { }

export interface OrderedQuery<T> extends Query<T> {
	thenBy(name: string, ascending?: boolean): this;
}

export interface Query<T> extends Promise<T> {
	where(condition: Conditional): this;
	filter<U>(callback: (item: T, store: any) => boolean): this;

	select<U>(selection: string[] | ((item: T, store: any) => U)): Query<U>;
	map<U>(callback: (item: T, store: any) => U): Query<U>;

	take(): this;
	skip(): this;

	orderBy(name: string, ascending?: boolean): OrderedQuery<T>;
	reverse(): this;
	sort(callback: (a: T, b: T) => number): this;

	groupBy<U>(): Query<U>;

	distinct(): this;
	union(): this;
	intersect(): this;
	except(): this;

	toArray(): Promise<any[]>;
	toList(): Promise<any[]>;
	construct<T>(factory: ComposeFactory<T, any>): Promise<T[]>;

	first(): Promise<any>;
	firstOrDefault(): Promise<any>;
	elementAt(): Promise<any>;

	count(): Promise<number>;

	range(): this;
	repeat(): this;

	any(): this;
	all(): this;

	count(): Promise<number>;
	sum(): Promise<number>;
	min(): Promise<number>;
	max(): Promise<number>;
	average(): Promise<number>;
	aggregate(): Promise<number>;

	concat(): this;
	join(): this;
}

export interface ConditionalExpression extends Object { }

export interface Conditional {
	expression: ConditionalExpression;
}

export interface ConditionalOperator extends Conditional {
	and(): Condition;
	or(): Condition;
}

export interface ConditionComparison<T> {
	matches(condition: RegExp): ConditionalOperator;
	equals(condition: T): ConditionalOperator;
	contains(condition: T): ConditionalOperator;
	lessThan(condition: T): ConditionalOperator;
	greaterThan(condition: T): ConditionalOperator;
}

export interface Condition {
	property(property: string): ConditionComparison<string>;
}
