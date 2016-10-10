import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented, {
	Evented,
	EventedOptions,
	EventedListener,
	TargettedEventObject
} from 'dojo-compose/mixins/createEvented';
import { Handle } from 'dojo-core/interfaces';
import { pausable, PausableHandle } from 'dojo-core/on';
import Task from 'dojo-core/async/Task';
import { Thenable } from 'dojo-shim/interfaces';
import Promise from 'dojo-shim/Promise';
import WeakMap from 'dojo-shim/WeakMap';

import { Route } from './createRoute';
import { Context, Parameters, Request } from './interfaces';
import { History, HistoryChangeEvent } from './history/interfaces';
import { parse as parsePath } from './lib/path';

/**
 * An object to resume or cancel router dispatch.
 */
export interface DispatchDeferral {
	/**
	 * Call to prevent a path from being dispatched.
	 */
	cancel(): void;

	/**
	 * Call to resume a path being dispatched.
	 */
	resume(): void;
}

/**
 * Event object that is emitted for the 'navstart' event.
 */
export interface NavigationStartEvent extends TargettedEventObject {
	/**
	 * The path that has been navigated to.
	 */
	path: string;

	/**
	 * Call to prevent the path to be dispatched.
	 */
	cancel(): void;

	/**
	 * Call to defer dispatching of the path
	 * @return an object which allows the caller to resume or cancel dispatch.
	 */
	defer(): DispatchDeferral;

	/**
	 * The router that emitted this event.
	 */
	target: Router;
}

/**
 * Event object that is emitted for the 'error' event.
 */
export interface ErrorEvent<C extends Context> extends TargettedEventObject {
	/**
	 * The context that was being dispatched when the error occurred.
	 */
	context: C;

	/**
	 * The error.
	 */
	error: any;

	/**
	 * The path that was being dispatched when the error occurred.
	 */
	path: string;

	/**
	 * The router that emitted this event.
	 */
	target: Router<C>;
}

/**
 * Describes the result of a dispatch.
 */
export interface DispatchResult {
	/**
	 * Whether a route requested a redirect to a different path.
	 */
	redirect?: string;

	/**
	 * False if dispatch was canceled (via the navstart event) or if no routes could be selected. True otherwise.
	 */
	success: boolean;
}

/**
 * A router mixin.
 */
export interface RouterMixin<C extends Context> {
	/**
	 * Append one or more routes.
	 * @param routes A single route or an array containing 0 or more routes.
	 */
	append(add: Route<Context, Parameters> | Route<Context, Parameters>[]): void;

	/**
	 * Select and execute routes for a given path.
	 * @param context A context object that is provided when executing selected routes.
	 * @param path The path.
	 */
	dispatch(context: C, path: string): Task<DispatchResult>;

	/**
	 * Start the router.
	 *
	 * Observes the history manager provided when the router was created for change events and dispatches routes in
	 * response. Noop if no history manager was provided.
	 *
	 * @param options An optional options object, can be used to prevent the router from immediately dispatching.
	 */
	start(options?: StartOptions): PausableHandle;
}

export interface RouterOverrides<C extends Context> {
	/**
	 * Event emitted when dispatch is called, but before routes are selected.
	 */
	on(type: 'navstart', listener: EventedListener<NavigationStartEvent>): Handle;

	/**
	 * Event emitted when errors occur during dispatch.
	 *
	 * Certain errors may reject the task returned when dispatching, but this task is not always accessible and may
	 * hide errors if it's canceled.
	 */
	on(type: 'error', listener: EventedListener<ErrorEvent<C>>): Handle;

	on(type: string, listener: EventedListener<TargettedEventObject>): Handle;
}

export type Router<C extends Context> = Evented & RouterMixin<C> & RouterOverrides<C>;

/**
 * The options for the router.
 */
export interface RouterOptions<C extends Context> extends EventedOptions {
	/**
	 * A Context object to be used for all requests, or a function that provides such an object, called for each
	 * dispatch.
	 */
	context?: C | (() => C);

	/**
	 * A handler called when no routes match the dispatch path.
	 * @param request An object whose `context` property contains the dispatch context. No extracted parameters
	 *   are available.
	 */
	fallback?: (request: Request<C, Parameters>) => void | Thenable<any>;

	/**
	 * The history manager. Routes will be dispatched in response to change events emitted by the manager.
	 */
	history?: History;
}

/**
 * The options for the router's start() method.
 */
export interface StartOptions {
	/**
	 * Whether to immediately dispatch with the history's current value.
	 */
	dispatchCurrent: boolean;
}

export interface RouterFactory<C extends Context> extends ComposeFactory<Router<C>, RouterOptions<C>> {
	/**
	 * Create a new instance of a Router.
	 * @param options Options to use during creation.
	 */
	(options?: RouterOptions<Context>): Router<Context>;
	<C>(options?: RouterOptions<C>): Router<C>;
}

interface PrivateState {
	contextFactory: () => Context;
	fallback?: (request: Request<Context, Parameters>) => void | Thenable<any>;
	history?: History;
	routes: Route<Context, Parameters>[];
	started?: boolean;
}

const privateStateMap = new WeakMap<Router<Context>, PrivateState>();

// istanbul ignore next
const noop = () => {};

function createDeferral() {
	// Use noop since TypeScript doesn't know we're assigning cancel and resume in the promise executor.
	let cancel: () => void = noop;
	let resume: () => void = noop;
	const promise = new Promise<void>((resolve, reject) => {
		cancel = reject;
		// Wrap resolve to avoid resume being called with a thenable if type checking is not used.
		resume = () => resolve();
	});
	return { cancel, promise, resume };
}

function reportError(router: Router<Context>, context: Context, path: string, error: any) {
	router.emit<ErrorEvent<Context>>({
		context,
		error,
		path,
		target: router,
		type: 'error'
	});
}

function catchRejection(router: Router<Context>, context: Context, path: string, thenable: void | Thenable<any>) {
	if (thenable) {
		Promise.resolve(thenable).catch((error) => {
			reportError(router, context, path, error);
		});
	}
}

const createRouter: RouterFactory<Context> = compose.mixin(createEvented, {
	mixin: {
		append(this: Router<Context>, add: Route<Context, Parameters> | Route<Context, Parameters>[]) {
			const { routes } = privateStateMap.get(this);
			if (Array.isArray(add)) {
				for (const route of add) {
					routes.push(route);
				}
			}
			else {
				routes.push(add);
			}
		},

		dispatch(this: Router<Context>, context: Context, path: string): Task<DispatchResult> {
			let canceled = false;
			const cancel = () => {
				canceled = true;
			};

			const deferrals: Promise<void>[] = [];

			this.emit<NavigationStartEvent>({
				cancel,
				defer () {
					const { cancel, promise, resume } = createDeferral();
					deferrals.push(promise);
					return { cancel, resume };
				},
				path,
				target: this,
				type: 'navstart'
			});

			// Synchronous cancelation.
			if (canceled) {
				return Task.resolve({ success: false });
			}

			const { searchParams, segments, trailingSlash } = parsePath(path);
			return new Task<DispatchResult>((resolve, reject) => {
				// *Always* start dispatching in a future turn, even if there were no deferrals.
				Promise.all(deferrals).then<DispatchResult>(
					() => {
						// The cancel() function used in the NavigationStartEvent is reused as the Task canceler.
						// Strictly speaking any navstart listener can cancel the dispatch asynchronously, as long as it
						// manages to do so before this turn.
						if (canceled) {
							return { success: false };
						}

						const { fallback, routes } = privateStateMap.get(this);
						let redirect: undefined | string;
						const dispatched = routes.some((route: Route<Context, Parameters>) => {
							const result = route.select(context, segments, trailingSlash, searchParams);
							if (typeof result === 'string') {
								redirect = result;
								return true;
							}
							if (result.length === 0) {
								return false;
							}

							for (const { handler, params } of result) {
								catchRejection(this, context, path, handler({ context, params }));
							}

							return true;
						});

						if (!dispatched && fallback) {
							catchRejection(this, context, path, fallback({ context, params: {} }));
							return { success: true };
						}

						const result: DispatchResult = { success: dispatched };
						if (redirect !== undefined) {
							result.redirect = redirect;
						}
						return result;
					},
					// When deferrals are canceled their corresponding promise is rejected. Ensure the task resolves
					// with `false` instead of being rejected too.
					() => {
						return { success: false };
					}
				).then(resolve, (error) => {
					reportError(this, context, path, error);
					reject(error);
				});
			}, cancel);
		},

		start(this: Router<Context>, { dispatchCurrent }: StartOptions = { dispatchCurrent: true }): PausableHandle {
			const state = privateStateMap.get(this);
			if (state.started) {
				throw new Error('start can only be called once');
			}
			state.started = true;

			const { contextFactory, history } = state;
			if (!history) {
				return {
					pause() {},
					resume() {},
					destroy() {}
				};
			}

			let lastDispatch: Task<void>;
			const dispatch = (path: string) => {
				if (lastDispatch) {
					lastDispatch.cancel();
				}
				lastDispatch = this.dispatch(contextFactory(), path).then(({ redirect, success }) => {
					if (success && redirect !== undefined) {
						history.replace(redirect);
					}
				});
			};

			const listener = pausable(history, 'change', (event: HistoryChangeEvent) => {
				dispatch(event.value);
			});
			this.own(listener);

			if (dispatchCurrent) {
				dispatch(history.current);
			}

			return listener;
		}
	},
	initialize<C extends Context>(instance: Router<C>, { context, fallback, history }: RouterOptions<C> = {}) {
		let contextFactory: () => C;
		if (typeof context === 'function') {
			contextFactory = context;
		}
		else if (typeof context === 'undefined') {
			contextFactory = () => {
				return {} as C;
			};
		}
		else {
			// Assign to a constant since the context variable may be changed after the function is defined,
			// which would violate its typing.
			const sharedContext = context;
			contextFactory = () => sharedContext;
		}

		if (history) {
			instance.own(history);
		}

		privateStateMap.set(instance, {
			contextFactory,
			fallback,
			history,
			routes: []
		});
	}
});

export default createRouter;
