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
}

/**
 * Describes the result of a dispatch.
 */
export interface DispatchResult {
	/**
	 * False if dispatch was canceled (via the navstart event) or if no routes could be selected. True otherwise.
	 */
	success: boolean;
}

/**
 * A router mixin.
 */
export interface RouterMixin {
	/**
	 * Append one or more routes.
	 * @param routes A single route or an array containing 0 or more routes.
	 */
	append(add: Route<Parameters> | Route<Parameters>[]): void;

	/**
	 * Select and execute routes for a given path.
	 * @param context A context object that is provided when executing selected routes.
	 * @param path The path.
	 */
	dispatch(context: Context, path: string): Task<DispatchResult>;

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

export interface RouterOverrides {
	/**
	 * Event emitted when dispatch is called, but before routes are selected.
	 */
	on(type: 'navstart', listener: EventedListener<NavigationStartEvent>): Handle;

	on(type: string, listener: EventedListener<TargettedEventObject>): Handle;
}

export type Router = Evented & RouterMixin & RouterOverrides;

/**
 * The options for the router.
 */
export interface RouterOptions extends EventedOptions {
	/**
	 * A Context object to be used for all requests, or a function that provides such an object, called for each
	 * dispatch.
	 */
	context?: Context | (() => Context);

	/**
	 * A handler called when no routes match the dispatch path.
	 * @param request An object whose `context` property contains the dispatch context. No extracted parameters
	 *   are available.
	 */
	fallback?: (request: Request<any>) => void;

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

export interface RouterFactory extends ComposeFactory<Router, RouterOptions> {
	/**
	 * Create a new instance of a Router.
	 * @param options Options to use during creation.
	 */
	(options?: RouterOptions): Router;
}

interface PrivateState {
	contextFactory: () => Context;
	fallback?: (request: Request<any>) => void;
	history?: History;
	routes: Route<Parameters>[];
	started?: boolean;
}

const privateStateMap = new WeakMap<Router, PrivateState>();

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

const createRouter: RouterFactory = compose.mixin(createEvented, {
	mixin: {
		append(this: Router, add: Route<Parameters> | Route<Parameters>[]) {
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

		dispatch(this: Router, context: Context, path: string): Task<DispatchResult> {
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
				target: null,
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
						const dispatched = routes.some((route: Route<Parameters>) => {
							const hierarchy = route.select(context, segments, trailingSlash, searchParams);
							if (hierarchy.length === 0) {
								return false;
							}

							for (const { handler, params } of hierarchy) {
								handler({ context, params });
							}

							return true;
						});

						if (!dispatched && fallback) {
							fallback({ context, params: {} });
							return { success: true };
						}

						return { success: dispatched };
					},
					// When deferrals are canceled their corresponding promise is rejected. Ensure the task resolves
					// with `false` instead of being rejected too.
					() => {
						return { success: false };
					}
				).then(resolve, reject);
			}, cancel);
		},

		start(this: Router, { dispatchCurrent }: StartOptions = { dispatchCurrent: true }): PausableHandle {
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

			let lastDispatch: Task<DispatchResult>;
			const listener = pausable(history, 'change', (event: HistoryChangeEvent) => {
				if (lastDispatch) {
					lastDispatch.cancel();
				}
				lastDispatch = this.dispatch(contextFactory(), event.value);
			});
			this.own(listener);

			if (dispatchCurrent) {
				lastDispatch = this.dispatch(contextFactory(), history.current);
			}

			return listener;
		}
	},
	initialize(instance: Router, { context, fallback, history }: RouterOptions = {}) {
		let contextFactory: () => Context;
		if (typeof context === 'function') {
			contextFactory = context;
		}
		else if (typeof context === 'undefined') {
			contextFactory = () => {
				return {};
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
