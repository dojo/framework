import { Handle } from '@dojo/interfaces/core';
import { Store } from '../interfaces';
import { StoreDelta } from './ObservableStore';
import { MappedQueryResultInterface, QueryResultInterface, TrackableStoreDelta } from './QueryResult';

export interface Materialization<I, S extends QueryResultInterface<I, any>, T extends Store<I, any, any>> {
	source: S;
	target: T;
	apply?(target: T, update: StoreDelta<I>, source: S): void;
}

export interface MappedMaterialization<
	I, S extends MappedQueryResultInterface<I, any>, T extends Store<I, any, any>
> extends Materialization<I, S, T> {
	apply?(target: T, update: TrackableStoreDelta<I>, source: S): void;
}

export default function materialize<I, S extends QueryResultInterface<I, any>, T extends Store<I, any, any>>(
	{ source, target, apply }: Materialization<I, S, T>
): Handle {
	let initialUpdate = true;
	const subscription = source.observe()
		.subscribe((update: StoreDelta<I>) => {
			if (apply) {
				apply(target, update, source);
			}
			else if (initialUpdate) {
				initialUpdate = false;
				if (update.afterAll.length) {
					target.add(update.afterAll);
				}
			}
			else {
				const { adds, updates, deletes } = update;
				if (adds.length) {
					target.add(adds);
				}
				if (updates.length) {
					target.put(updates);
				}
				if (deletes.length) {
					target.delete(deletes);
				}
			}
		});

	return {
		destroy() {
			subscription.unsubscribe();
		}
	};
}
