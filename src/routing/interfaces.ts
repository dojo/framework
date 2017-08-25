import Task from '@dojo/core/async/Task';
import Evented, { BaseEventedEvents } from '@dojo/core/Evented';
import { PausableHandle } from '@dojo/core/on';
import UrlSearchParams from '@dojo/core/UrlSearchParams';
import { EventedListener, EventedOptions } from '@dojo/interfaces/bases';
import { EventErrorObject, EventTargettedObject, Handle, Hash } from '@dojo/interfaces/core';
import { Thenable } from '@dojo/interfaces/shim';
import { Constructor, RegistryLabel, WidgetBaseInterface } from '@dojo/widget-core/interfaces';
import { History } from './history/interfaces';
import { DeconstructedPath } from './lib/path';

/**
 * Routes created without a `params()` function will receive a `params` object of this type.
 */
export interface DefaultParameters extends Parameters {
	[param: string]: string;
}

/**
 * Describes the context object used when dispatching. Extend this interface for custom contexts.
 */
export interface Context {
	// TODO: Does specifiying an indexer make sense here?
}

/**
 * Describes extracted parameters.
 */
export interface Parameters {
	[param: string]: any;
}

/**
 * Describes the object passed to various route handlers.
 */
export interface Request<C extends Context, P extends Parameters> {
	/**
	 * The dispatch context.
	 */
	context: C;

	/**
	 * The extracted parameters.
	 */
	params: P;
}

/**
 * Component type
 */
export type Component<W extends WidgetBaseInterface = WidgetBaseInterface> = Constructor<W> | RegistryLabel;

/**
 * Outlet component options
 */
export interface OutletComponents<W extends WidgetBaseInterface, I extends WidgetBaseInterface, E extends WidgetBaseInterface> {
	main?: Component<W>;
	index?: Component<I>;
	error?: Component<E>;
}

/**
 * Options for map params callback
 */
export interface MapParamsOptions {
	params: any;
	type: MatchType;
	location: string;
	router: RouterInterface<any>;
}

/**
 * Interface for the map params callback
 */
export interface MapParams {
	(options: MapParamsOptions): any;
}

/**
 * Outlet properties
 */
export interface OutletProperties<W extends WidgetBaseInterface = WidgetBaseInterface, I extends WidgetBaseInterface = WidgetBaseInterface, E extends WidgetBaseInterface = WidgetBaseInterface> {
	outlet: string;
	mainComponent?: Component<W>;
	indexComponent?: Component<I>;
	errorComponent?: Component<E>;
	mapParams?: MapParams;
}

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
export interface NavigationStartEvent extends EventTargettedObject<RouterInterface<Context>> {
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
 * Event object that is emitted for the 'error' event.
 */
export interface ErrorEvent<C extends Context> extends EventErrorObject<RouterInterface<C>> {
	/**
	 * The context that was being dispatched when the error occurred.
	 */
	context: C;

	/**
	 * The path that was being dispatched when the error occurred.
	 */
	path: string;
}

export interface RouterEvents<C extends Context> extends BaseEventedEvents {
	/**
	 * Event emitted when dispatch is called, but before routes are selected.
	 */
	(type: 'navstart', listener: EventedListener<RouterInterface<C>, NavigationStartEvent>): Handle;

	/**
	 * Event emitted when errors occur during dispatch.
	 *
	 * Certain errors may reject the task returned when dispatching, but this task is not always accessible and may
	 * hide errors if it's canceled.
	 */
	(type: 'error', listener: EventedListener<RouterInterface<C>, ErrorEvent<C>>): Handle;
}

/**
 * Config for registering routes
 */
export interface RouteConfig {
	/**
	 * The path of the route
	 */
	path: string;

	/**
	 * The optional outlet associated to the path
	 */
	outlet?: string;

	/**
	 * Optional child route configuration
	 */
	children?: RouteConfig[];

	/**
	 * Default params used to generate a link
	 */
	defaultParams?: any;

	/**
	 * To be used as the default route on router start up
	 * if the current route doesn't match
	 */
	defaultRoute?: boolean;
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

export type LinkParams = Hash<string | string[] | undefined>;

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

	/**
	 * Routing configuration to set up on router creation
	 */
	config?: RouteConfig[];
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

/**
 * The outlet context
 */
export interface OutletContext {
	/**
	 * The type of match for the outlet
	 */
	type: MatchType;

	/**
	 * The location of the route (link)
	 */
	location: string;

	/**
	 * The params for the specific outlet
	 */
	params: any;
}

export interface RouterInterface<C extends Context> extends Evented {
	on: RouterEvents<C>;

	register(config: RouteConfig[], from: string | RouterInterface<any> | RouteInterface<any, any>): void;

	append(add: RouteInterface<Context, Parameters> | RouteInterface<Context, Parameters>[]): void;

	dispatch(context: Context, path: string): Task<DispatchResult>;

	link(routeOrOutlet: RouteInterface<Context, Parameters> | string, params?: LinkParams): string;

	replacePath(path: string): void;

	setPath(path: string): void;

	hasOutlet(outletId: string): boolean;

	getOutlet(outletId: string): OutletContext | undefined;

	getCurrentParams(): Parameters;

	start(startOptions: StartOptions): PausableHandle;
}

/**
 * Hash object where keys are parameter names and keys are arrays of one or more
 * parameter values.
 */
export type SearchParams = Hash<string[]>;

/**
 * Describes whether a route matched.
 */
export interface MatchResult<P> {
	/**
	 * Whether there are path segments that weren't matched by this route.
	 */
	hasRemaining: boolean;

	/**
	 * Position in the segments array that the remaining unmatched segments start.
	 */
	offset: number;

	/**
	 * Any extracted parameters. Only available if the route matched.
	 */
	params: P;

	/**
	 * Values for named segments in the path, in order of occurrence.
	 */
	rawPathValues: string[];

	/**
	 * Values for known named query parameters that were actually present in the
	 * path.
	 */
	rawSearchParams: SearchParams;
}

/**
 * The type of match for a route
 */
export enum MatchType {
	INDEX = 0,
	PARTIAL,
	ERROR
}

/**
 * A request handler.
 */
export type Handler = (request: Request<Context, Parameters>) => void | Thenable<any>;

/**
 * Describes the selection of a particular route.
 */
export interface Selection {
	/**
	 * Which handler should be called when the route is executed.
	 */
	handler: Handler;

	/**
	 * The selected path.
	 */
	path: DeconstructedPath;

	/**
	 * The selected outlet
	 */
	outlet: string | undefined;

	/**
	 * The extracted parameters.
	 */
	params: Parameters;

	/**
	 * Values for named segments in the path, in order of occurrence.
	 */
	rawPathValues: string[];

	/**
	 * Values for known named query parameters that were actually present in the
	 * path.
	 */
	rawSearchParams: SearchParams;

	/**
	 * The selected route.
	 */
	route: RouteInterface<Context, Parameters>;

	/**
	 * The selection type
	 */
	type: MatchType;
}

export interface RouteInterface<C extends Context, P extends Parameters> {
	readonly parent: RouteInterface<Context, Parameters> | undefined;
	readonly path: DeconstructedPath;
	readonly outlet: string | undefined;
	readonly defaultParams: P;

	append(add: RouteInterface<Context, Parameters> | RouteInterface<Context, Parameters>[]): void;
	link(params?: LinkParams): string;
	match(segments: string[], hasTrailingSlash: boolean, searchParams: UrlSearchParams): null | MatchResult<DefaultParameters | P>;
	select(context: C, segments: string[], hasTrailingSlash: boolean, searchParams: UrlSearchParams): string | Selection[];
}
