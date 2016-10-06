import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented, { Evented, EventedOptions, EventedListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import { Handle } from 'dojo-core/interfaces';
import { pausable, PausableHandle } from 'dojo-core/on';
import Task from 'dojo-core/async/Task';
import Promise from 'dojo-shim/Promise';
import WeakMap from 'dojo-shim/WeakMap';

import { Route, Handler } from './createRoute';
import { Context, Parameters, Request } from './interfaces';
import { History, HistoryChangeEvent } from './history/interfaces';
import { parse as parsePath } from './_path';

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
 * A router mixin.
 */
export interface RouterMixin {
	/**
	 * Holds top-level routes.
	 * @private
	 */
	routes: Route<Parameters>[];

	/**
	 * Append one or more routes.
	 * @param routes A single route or an array containing 0 or more routes.
	 */
	append(routes: Route<Parameters> | Route<Parameters>[]): void;

	/**
	 * Observe History, auto-wires the History change event to dispatch
	 * @param history A History manager.
	 * @param context A context object that is provided when executing selected routes.
	 * @param dispatchInitial Whether to immediately dispatch with the History's current value.
	 */
	observeHistory(history: History, context: Context, dispatchInitial?: boolean): PausableHandle;

	/**
	 * Select and execute routes for a given path.
	 * @param context A context object that is provided when executing selected routes.
	 * @param path The path.
	 * @return A task, allowing dispatching to be canceled. The task will be resolved with a boolean depending
	 *   on whether dispatching succeeded.
	 */
	dispatch(context: Context, path: string): Task<boolean>;

	/**
	 * Optional fallback handler used when no routes matched the dispatch path.
	 * @param request An object whose `context` property contains the dispatch context. No extracted parameters
	 *   are available.
	 * @private
	 */
	fallback?(request: Request<any>): void;
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
	 * A handler called when no routes match the dispatch path.
	 * @param request An object whose `context` property contains the dispatch context. No extracted parameters
	 *   are available.
	 */
	fallback?(request: Request<any>): void;
}

interface HistoryManager {
	history: History;

	context: Context;

	listener: PausableHandle;
}

export interface RouterFactory extends ComposeFactory<Router, RouterOptions> {
	/**
	 * Create a new instance of a Router.
	 * @param options Options to use during creation.
	 */
	(options?: RouterOptions): Router;
}

const historyMap = new WeakMap<Router, HistoryManager>();

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

const createRouter: RouterFactory = compose<RouterMixin, RouterOptions>({
	// N.B. Set per instance in the initializer
	routes: [],

	append (this: Router, routes: Route<Parameters> | Route<Parameters>[]) {
		if (Array.isArray(routes)) {
			for (const route of routes) {
				this.routes.push(route);
			}
		}
		else {
			this.routes.push(routes);
		}
	},

	observeHistory(this: Router, history: History, context: Context, dispatchInitial: boolean = false): PausableHandle {
		if (historyMap.has(this)) {
			throw new Error('observeHistory can only be called once');
		}
		const listener = pausable(history, 'change', (event: HistoryChangeEvent) => {
			this.dispatch(context, event.value);
		});
		historyMap.set(this, { history, listener, context });
		if (dispatchInitial) {
			this.dispatch(context, history.current);
		}
		this.own(listener);
		this.own(history);
		return listener;
	},

	dispatch (this: Router, context: Context, path: string): Task<boolean> {
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
			return Task.resolve(false);
		}

		const { searchParams, segments, trailingSlash } = parsePath(path);
		return new Task((resolve, reject) => {
			// *Always* start dispatching in a future turn, even if there were no deferrals.
			Promise.all(deferrals).then(
				() => {
					// The cancel() function used in the NavigationStartEvent is reused as the Task canceler.
					// Strictly speaking any navstart listener can cancel the dispatch asynchronously, as long as it
					// manages to do so before this turn.
					if (canceled) {
						return false;
					}

					const dispatched = this.routes.some((route: Route<Parameters>) => {
						const hierarchy = route.select(context, segments, trailingSlash, searchParams);
						if (hierarchy.length === 0) {
							return false;
						}

						for (const { handler, route, params } of hierarchy) {
							switch (handler) {
								case Handler.Exec:
									route.exec({ context, params });
									break;
								case Handler.Fallback:
									// istanbul ignore else
									if (route.fallback) {
										route.fallback({ context, params });
									}
									break;
								case Handler.Index:
									// istanbul ignore else
									if (route.index) {
										route.index({ context, params });
									}
									break;
							}
						}

						return true;
					});

					if (!dispatched && this.fallback) {
						this.fallback({ context, params: {} });
						return true;
					}

					return dispatched;
				},
				// When deferrals are canceled their corresponding promise is rejected. Ensure the task resolves
				// with `false` instead of being rejected too.
				() => false
			).then(resolve, reject);
		}, cancel);
	}
}).mixin({
	mixin: createEvented,
	initialize(instance: Router, { fallback }: RouterOptions = {}) {
		instance.routes = [];

		if (fallback) {
			instance.fallback = fallback;
		}
	}
});

export default createRouter;
