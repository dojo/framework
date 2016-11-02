import { Store, CrudOptions } from '../createStore';
import createStoreObservable, { StoreObservable } from '../createStoreObservable';
import Patch from '../../patch/Patch';
import Map from 'dojo-shim/Map';
import WeakMap from 'dojo-shim/WeakMap';
import { Observable } from 'rxjs/Rx';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import { UpdateResults } from '../../storage/createInMemoryStorage';

export interface TransactionMixin<T, O extends CrudOptions, U extends UpdateResults<T>, C extends Store<T, O, U>> {
	transaction(): Transaction<T, O, U, C>;
}

export type TransactionStore<T, O extends CrudOptions, U extends UpdateResults<T>, C extends Store<T, O, U>> = TransactionMixin<T, O, U, C> & C;

export interface Transaction<T, O extends CrudOptions, U extends UpdateResults<T>, C extends Store<T, O, U>> {
	abort(): TransactionStore<T, O, U, C>;
	commit(): StoreObservable<T | string, U[]>;
	add(items: T[] | T, options?: O): Transaction<T, O, U, C>;
	put(items: T[] | T, options?: O): Transaction<T, O, U, C>;
	patch(updates: Map<string, Patch<T, T>> | { id: string; patch: Patch<T, T> } | { id: string; patch: Patch<T, T> }[], options?: O): Transaction<T, O, U, C>;
	delete(ids: string[] | string): Transaction<T, O, U, C>;
}

interface TransactionOptions<T, O extends CrudOptions, U extends UpdateResults<T>, C extends Store<T, O, U>> {
	store?: C;
}

interface TransactionState<T, O extends CrudOptions, U extends UpdateResults<T>, C extends Store<T, O, U>> {
	store: C;
	actions: Array<() => StoreObservable<T | string, U>>;
}

const instanceStateMap = new WeakMap<Transaction<{}, {}, UpdateResults<{}>, Store<{}, {}, UpdateResults<{}>>>, TransactionState<{}, {}, UpdateResults<{}>, any>>();
function createTransactionMixin<T, O extends CrudOptions, U extends UpdateResults<T>, C extends Store<T, O, U>>() {
	const createTransaction: ComposeFactory<Transaction<T, O, U, C>, TransactionOptions<T, O, U, C>> =
		compose<Transaction<T, O, U, C>, TransactionOptions<T, O, U, C>>({
			put(this: Transaction<T, O, U, C>, items: T[] | T, options?: O) {
				const state = instanceStateMap.get(this);
				state.actions.push(() => {
					return state.store.put(items, options);
				});
				return this;
			},

			patch(this: Transaction<T, O, U, C>, updates: Map<string, Patch<T, T>>, options?: O) {
				const state = instanceStateMap.get(this);
				state.actions.push(() => {
					return state.store.patch(updates);
				});
				return this;
			},

			add(this: Transaction<T, O, U, C>, items: T[]| T, options?: O) {
				const state = instanceStateMap.get(this);
				state.actions.push(() => {
					return state.store.add(items, options);
				});
				return this;
			},

			delete(this: Transaction<T, O, U, C>, ids: string[] | string) {
				const state = instanceStateMap.get(this);
				state.actions.push(() => {
					return state.store.delete(ids);
				});
				return this;
			},

			commit(this: Transaction<T, O, U, C>) {
				const state = instanceStateMap.get(this);
				return createStoreObservable<T | string, U[]>(
					Observable.zip<U[]>(...state.actions.map(
						function(action: () => StoreObservable<T | string, U>) {
							return action();
						})),
					function(updateResultsList) {
						return updateResultsList.reduce(function(prev, next) {
							return next.successfulData ? prev.concat(next.successfulData) : prev;
						}, []);
					});
			},

			abort(this: Transaction<T, O, U, C>) {
				const state = instanceStateMap.get(this);
				state.actions = [];
				return state.store;
			}

	}, function (instance: Transaction<T, O, U, C>, options: TransactionOptions<T, O, U, C> = {}) {
		instanceStateMap.set(instance, {
			store: options.store,
			actions: []
		});
	});

	const transactionMixin = compose<TransactionMixin<T, O, U, C>, any>({
		transaction(this: TransactionStore<T, O, U, C>) {
			return createTransaction( {
				store: this
			} );
		}
	});

	return transactionMixin;
};

export default createTransactionMixin;
