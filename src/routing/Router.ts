import Task from '@dojo/core/async/Task';
import Evented from '@dojo/core/Evented';
import { assign } from '@dojo/shim/object';
import { pausable, PausableHandle } from '@dojo/core/on';
import UrlSearchParams from '@dojo/core/UrlSearchParams';
import { includes } from '@dojo/shim/array';
import { Thenable } from '@dojo/shim/interfaces';
import Map from '@dojo/shim/Map';
import Promise from '@dojo/shim/Promise';
import { History, HistoryChangeEvent } from './history/interfaces';
import {
	Context,
	DispatchResult,
	ErrorEvent,
	LinkParams,
	MatchType,
	NavigationStartEvent,
	OutletContext,
	Parameters,
	Request,
	RouteConfig,
	RouteInterface,
	RouterEvents,
	RouterInterface,
	RouterOptions,
	SearchParams,
	Selection,
	StartOptions
} from './interfaces';
import { isNamedSegment, parse as parsePath } from './lib/path';
import { hasBeenAppended, parentMap } from './lib/router';
import { Route } from './Route';

export const errorOutlet = 'errorOutlet';

// istanbul ignore next
const noop = () => {
};

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

export class Router<C extends Context> extends Evented implements RouterInterface<C> {
	private _contextFactory: () => Context;
	private _currentSelection: Selection[];
	private _dispatchFromStart: boolean;
	private _fallback?: (request: Request<Context, Parameters>) => void | Thenable<any>;
	private _history?: History;
	private _routes: RouteInterface<Context, Parameters>[];
	private _started?: boolean;
	private _outletContextMap: Map<string, OutletContext> = new Map<string, OutletContext>();
	private _outletRouteMap: Map<string, RouteInterface<any, any>> = new Map<string, RouteInterface<any, any>>();
	private _currentParams: any = {};
	private _defaultParams: any = {};
	private _defaultRoute: RouteInterface<any, any>;

	on: RouterEvents<C>;

	constructor(options: RouterOptions<C> = { }) {
		super({});
		const { context, fallback, history, config } = options;

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
			this.own(history);
		}

		this._contextFactory = contextFactory;
		this._currentSelection = [];
		this._dispatchFromStart = false;
		this._fallback = fallback;
		this._history = history;
		this._routes = [];
		this._started = false;

		if (config) {
			this.register(config);
		}
	}

	register(config: RouteConfig[], from: string | RouterInterface<any> | RouteInterface<any, any> = this) {
		let parent: RouterInterface<any> | RouteInterface<any, any>;
		if (typeof from === 'string') {
			parent = this._outletRouteMap.get(from) || this;
		}
		else {
			parent = from;
		}

		config.forEach(({ defaultRoute, path, outlet = path, defaultParams = {}, children }) => {
			const route = new Route({
				path,
				outlet,
				defaultParams
			});
			if (defaultRoute) {
				if (!this._defaultRoute) {
					this._defaultRoute = route;
				}
				else {
					throw new Error(`Default outlet has already been configured. Unable to register outlet ${outlet} as the default.`);
				}
			}
			assign(this._defaultParams, defaultParams);
			this._outletRouteMap.set(outlet, route);
			parent.append(route);
			if (children) {
				this.register(children, route);
			}
		});
	}

	append(add: RouteInterface<Context, Parameters> | RouteInterface<Context, Parameters>[]) {
		const append = (route: RouteInterface<Context, Parameters>) => {
			if (hasBeenAppended(route)) {
				throw new Error('Cannot append route that has already been appended');
			}

			this._routes.push(route);
			parentMap.set(route, this);
		};

		if (Array.isArray(add)) {
			for (const route of add) {
				append(route);
			}
		}
		else {
			append(add);
		}
	}

	private _dispatch(context: Context, path: string, canceled: boolean = false, emit: boolean = true) {
		if (canceled) {
			return { success: false };
		}

		this._currentParams = {};
		this._outletContextMap.clear();

		if (emit) {
			this.emit<NavigationStartEvent>({
				context,
				path,
				target: this,
				type: 'navstart'
			});
		}

		const { searchParams, segments, trailingSlash } = parsePath(path);
		const dispatchFromStart = this._dispatchFromStart;
		this._dispatchFromStart = false;

		let redirect: undefined | string;
		const dispatched = this._routes.some((route) => {
			const result = route.select(context, segments, trailingSlash, searchParams);

			if (typeof result === 'string') {
				redirect = result;
				return true;
			}
			if (result.length === 0) {
				return false;
			}

			// Update the selected routes after selecting new routes, but before invoking the handlers.
			// This means the original value is available to guard() and params() functions, and the
			// new value when the newly selected routes are executed.
			//
			// Reset selected routes if not dispatched from start().
			this._currentSelection = dispatchFromStart ? result : [];

			for (const { handler, params, outlet, type, route } of result) {
				if (outlet) {
					assign(this._currentParams, params);
					const location = this.link(route, this._currentParams);
					this._outletContextMap.set(outlet, { type, params, location });
					if (type === MatchType.ERROR) {
						this._outletContextMap.set(errorOutlet, { type: MatchType.PARTIAL, params, location });
					}
				}
				catchRejection(this, context, path, handler({ context, params }));
			}

			return true;
		});

		// Reset the selected routes if the dispatch was unsuccessful, or if a redirect was requested.
		if (!dispatched || redirect !== undefined) {
			this._currentSelection = [];
		}

		if (!dispatched) {
			this._outletContextMap.set(errorOutlet, {
				type: MatchType.PARTIAL,
				params: {},
				location: this._history ? this._history.current : ''
			});
			if (this._fallback) {
				catchRejection(this, context, path, this._fallback({ context, params: {} }));
				return { success: false };
			}
		}

		const result: DispatchResult = { success: dispatched };
		if (redirect !== undefined) {
			result.redirect = redirect;
		}
		return result;

	}

	dispatch(context: Context, path: string): Task<DispatchResult> {
		let canceled = false;
		const cancel = () => {
			canceled = true;
		};

		const deferrals: Promise<void>[] = [];

		this._currentParams = {};
		this._outletContextMap.clear();
		this.emit<NavigationStartEvent>({
			context,
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

		// Synchronous cancellation.
		if (canceled) {
			return Task.resolve({ success: false });
		}

		return new Task<DispatchResult>((resolve, reject) => {
			// *Always* start dispatching in a future turn, even if there were no deferrals.
			Promise.all(deferrals).then<DispatchResult, DispatchResult>(
				() => {
					return this._dispatch(context, path, canceled, false);
				},
				() => {
					return { success: false };
				}
			).then(resolve, (error) => {
				reportError(this, context, path, error);
				reject(error);
			});
		}, cancel);
	}

	link(routeOrOutlet: RouteInterface<Context, Parameters> | string, params: LinkParams = {}): string {
		let route: RouteInterface<Context, Parameters>;
		if (typeof routeOrOutlet === 'string') {
			const item = this._outletRouteMap.get(routeOrOutlet);
			if (item) {
				route = item;
			}
			else {
				throw new Error(`No outlet ${routeOrOutlet} has been registered`);
			}
		}
		else {
			route = routeOrOutlet;
		}
		const hierarchy = [ route ];
		for (let parent = route.parent; parent !== undefined; parent = parent.parent) {
			hierarchy.unshift(parent);
		}

		if (!includes(this._routes, hierarchy[ 0 ])) {
			throw new Error('Cannot generate link for route that is not in the hierarchy');
		}

		const { leadingSlash: addLeadingSlash } = hierarchy[ 0 ].path;
		let addTrailingSlash = false;
		const segments: string[] = [];
		const searchParams = new UrlSearchParams();

		hierarchy
			.map((route, index) => {
				const { path } = route;
				let currentPathValues: string[] | undefined;
				let currentSearchParams: SearchParams | undefined;

				const selection = this._currentSelection[ index ];
				if (selection && selection.route === route) {
					currentPathValues = selection.rawPathValues;
					currentSearchParams = selection.rawSearchParams;
				}

				return { currentPathValues, currentSearchParams, path, route };
			})
			.forEach(({ currentPathValues, currentSearchParams, path, route }) => {
				const { expectedSegments, searchParameters, trailingSlash } = path;
				addTrailingSlash = trailingSlash;

				let namedOffset = 0;
				for (const segment of expectedSegments) {
					if (isNamedSegment(segment)) {
						const value = params[ segment.name ];
						if (typeof value === 'string') {
							segments.push(value);
						}
						else if (Array.isArray(value)) {
							if (value.length === 1) {
								segments.push(value[ 0 ]);
							}
							else {
								throw new TypeError(`Cannot generate link, multiple values for parameter '${segment.name}'`);
							}
						}
						else if (currentPathValues) {
							segments.push(currentPathValues[ namedOffset ]);
						}
						else if (route.defaultParams[ segment.name ]) {
							segments.push(route.defaultParams[ segment.name ]);

						}
						else {
							throw new Error(`Cannot generate link, missing parameter '${segment.name}'`);
						}
						namedOffset++;
					}
					else {
						segments.push(segment.literal);
					}
				}

				for (const key of searchParameters) {
					// Don't repeat the search parameter if a previous route in the hierarchy has already appended
					// it.
					if (searchParams.has(key)) {
						continue;
					}

					const value = params[ key ] || this._defaultParams[ key ] ;
					if (typeof value === 'string') {
						searchParams.append(key, value);
					}
					else if (Array.isArray(value)) {
						for (const item of value) {
							searchParams.append(key, item);
						}
					}
					else if (currentSearchParams) {
						for (const item of currentSearchParams[ key ]) {
							searchParams.append(key, item);
						}
					}
					else {
						throw new Error(`Cannot generate link, missing search parameter '${key}'`);
					}
				}
			});

		let pathname = segments.join('/');
		if (addLeadingSlash) {
			pathname = '/' + pathname;
		}
		if (addTrailingSlash) {
			pathname += '/';
		}

		if (this._history) {
			pathname = this._history.prefix(pathname);
		}

		const search = searchParams.toString();
		const path = search ? `${pathname}?${search}` : pathname;

		return path;
	}

	replacePath(path: string) {
		if (!this._history) {
			throw new Error('Cannot replace path, router was created without a history manager');
		}

		this._history.replace(path);
	}

	setPath(path: string) {
		if (!this._history) {
			throw new Error('Cannot set path, router was created without a history manager');
		}

		this._history.set(path);
	}

	hasOutlet(outletId: string): boolean {
		return this._outletContextMap.has(outletId);
	}

	getOutlet(outletId: string): OutletContext | undefined {
		return this._outletContextMap.get(outletId);
	}

	getCurrentParams(): Parameters {
		return this._currentParams;
	}

	start(startOptions: StartOptions = { dispatchCurrent : true }): PausableHandle {
		const { dispatchCurrent } = startOptions;

		if (this._started) {
			throw new Error('start can only be called once');
		}

		this._started = true;

		if (!this._history) {
			return {
				pause() {
				},
				resume() {
				},
				destroy() {
				}
			};
		}

		let lastDispatch: Task<DispatchResult>;
		let redirectCount = 0;
		let redirecting = false;

		const dispatch = (path: string) => {
			if (lastDispatch) {
				lastDispatch.cancel();
			}

			// Reset redirect count if the dispatch was triggered by a non-redirect history change. This allows
			// a route's exec / fallback / index handler to change the history, setting off a new flurry of
			// redirects, without being encumbered by the number of redirects that led to that route being selected.
			if (!redirecting) {
				redirectCount = 0;
			}

			// Signal to dispatch() that it was called from here.
			this._dispatchFromStart = true;

			const context = this._contextFactory();
			lastDispatch = this.dispatch(context, path).then((dispatchResult) => {
				const { success, redirect = undefined } = dispatchResult || { success: false };
				if (success && redirect !== undefined) {
					redirectCount++;
					if (redirectCount > 20) {
						const error = new Error('More than 20 redirects, giving up');
						reportError(this, context, path, error);
						throw error;
					}

					redirecting = true;
					// The history manager MUST emit the change event synchronously.
					this._history!.replace(redirect);
					redirecting = false;
				}
				return dispatchResult;
			});
			return lastDispatch;
		};

		const listener = pausable(this._history, 'change', (event: HistoryChangeEvent) => {
			dispatch(event.value);
		});
		this.own(listener);

		if (dispatchCurrent) {
			const context = this._contextFactory();
			const { success, redirect = undefined } = this._dispatch(context, this._history.current);
			if (success && redirect) {
				redirecting = true;
				this._history!.replace(redirect);
				redirecting = false;
			}
			else if (!success && this._defaultRoute) {
				const normalizedPath = this._history.normalizePath(this.link(this._defaultRoute));
				this._dispatch(context, normalizedPath);
			}
		}

		return listener;
	}
}

export default Router;
