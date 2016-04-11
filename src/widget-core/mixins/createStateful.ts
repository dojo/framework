import { Observable, Subscription } from 'rxjs/Rx';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import Promise from 'dojo-core/Promise';
import WeakMap from 'dojo-core/WeakMap';
import { deepAssign } from 'dojo-core/lang';
import { EventObject, Handle } from 'dojo-core/interfaces';
import createEvented, { Evented, EventedOptions, EventedListener } from './createEvented';

const stateWeakMap = new WeakMap<Stateful<any>, any>();

export interface State {
	[id: string]: any;
}

export interface ObservableState<S> {
	observe(id: string): Observable<S>;
	patch(partial: any, options?: { id?: string }): Promise<S>;
}

export interface StatefulOptions<S extends State> extends EventedOptions {
	state?: S;
	id?: string;
	stateFrom?: ObservableState<S>;
}

export interface StateChangeEvent<S extends State> extends EventObject {
	type: string;
	state: S;
	target: Stateful<S>;
}

export interface Stateful<S extends State> extends Evented {
	/**
	 * A readonly version of the state
	 */
	state: S;

	/**
	 * Set the state on the instance.
	 * Set state takes partial values, therefore if a key is omitted, it will not get set.
	 * If you wish to "clear" a value, you should pass it as undefined.
	 * @param value The partial state to be set
	 */
	setState(value: S): void;

	/**
	 * Observe the state from an object that allows the observation
	 * @param id         The ID in the target obserable to observe
	 * @param observable The taget that returns an obserable inteface when observing an ID
	 */
	observeState(id: string, observable: ObservableState<S>): Handle;

	/**
	 * Add a listener for the event
	 * @param type     The event to listener for
	 * @param listener The event listener
	 */
	on(type: 'statechange', listener: EventedListener<StateChangeEvent<S>>): Handle;
	on(type: string, listener: EventedListener<EventObject>): Handle;
}

export interface StatefulFactory extends ComposeFactory<Stateful<State>, StatefulOptions<State>> {
	<S extends State>(options?: StatefulOptions<S>): Stateful<S>;
}

function setStatefulState(stateful: Stateful<State>, value: State) {
	const state = deepAssign(stateWeakMap.get(stateful), value);
	stateful.emit({
		type: 'statechange',
		state,
		target: stateful
	});
	return state;
}

interface ObservedState {
	id: string;
	observable: ObservableState<State>;
	subscription: Subscription;
	handle: Handle;
}

const observedStateMap = new WeakMap<Stateful<State>, ObservedState>();

function unobserve(stateful: Stateful<State>) {
	const observedState = observedStateMap.get(stateful);
	if (observedState) {
		observedState.handle.destroy();
	}
}

const createStateful: StatefulFactory = compose({
		get state(): any {
			return stateWeakMap.get(this);
		},

		setState(value: State): void {
			const stateful: Stateful<any> = this;
			const observedState = observedStateMap.get(stateful);
			if (observedState) {
				observedState.observable.patch(value, { id: observedState.id });
			}
			else {
				setStatefulState(stateful, value);
			}
		},

		observeState(id: string, observable: ObservableState<State>): Handle {
			const stateful: Stateful<any> = this;
			let observedState = observedStateMap.get(stateful);
			if (observedState) {
				if (observedState.id === id && observedState.observable === observable) {
					return observedState.handle;
				}
				throw new Error('Already observing state.');
			}
			observedState = {
				id,
				observable,
				subscription: observable.observe(id).subscribe((item: State) => {
					setStatefulState(stateful, item);
				}, (err) => { /* error handler */
					stateful.emit({
						type: 'error',
						target: stateful,
						error: err
					});
					unobserve(stateful);
				}, () => { /* completed handler */
					unobserve(stateful);
				}),
				handle: {
					destroy() {
						const observedState = observedStateMap.get(stateful);
						if (observedState) {
							observedState.subscription.unsubscribe();
							observedStateMap.delete(stateful);
						}
					}
				}
			};
			observedStateMap.set(stateful, observedState);
			return observedState.handle;
		}
	}, (instance: Stateful<State>, options: StatefulOptions<State>) => {
		const state = {};
		stateWeakMap.set(instance, state);
		if (options) {
			if (options.state) {
				instance.setState(options.state);
			}
			if (options.id && options.stateFrom) {
				instance.own(instance.observeState(options.id, options.stateFrom));
			}
			else if (options.id || options.stateFrom) {
				throw new TypeError('Factory requires options "id" and "stateFrom" to be supplied together.');
			}
		}
	})
	.mixin(createEvented);

export default createStateful;
