import {
	Constructor,
	RegistryLabel,
	VNodeProperties,
	WidgetBaseInterface,
	WidgetProperties,
	DNode
} from '../widget-core/interfaces';
import { WidgetBase } from '../widget-core/WidgetBase';
import { Router } from './Router';

/**
 * Description of a registered route
 */
export interface Route {
	path: string;
	outlet: string;
	params: string[];
	segments: (symbol | string)[];
	children: Route[];
	fullPath: string;
	fullParams: string[];
	fullQueryParams: string[];
	defaultParams: Params;
	onEnter?: OnEnter;
	onExit?: OnExit;
}

/**
 * Route configuration
 */
export interface RouteConfig {
	path: string;
	outlet: string;
	children?: RouteConfig[];
	defaultParams?: Params;
	defaultRoute?: boolean;
	onEnter?: OnEnter;
	onExit?: OnExit;
}

/**
 * Route Params
 */
export interface Params {
	[index: string]: string;
}

/**
 * Type of outlet matches
 */
export type MatchType = 'error' | 'index' | 'partial';

/**
 * Context stored for matched outlets
 */
export interface OutletContext {
	/**
	 * The type of match for the outlet
	 */
	type: MatchType;

	/**
	 * The params for the specific outlet
	 */
	params: Params;

	/**
	 * The query params for the route
	 */
	queryParams: Params;

	/**
	 * Returns `true` when the route is an error match
	 */
	isError(): boolean;

	/**
	 * Returns `true` when the route is an exact match
	 */
	isExact(): boolean;

	/**
	 * On enter for the route
	 */
	onEnter?: OnEnter;

	/**
	 * On exit for the route
	 */
	onExit?: OnExit;
}

export interface OnEnter {
	(params: Params, type: MatchType): void;
}

export interface OnExit {
	(): void;
}

export interface MatchDetails {
	/**
	 * Query params from the matching route for the outlet
	 */
	queryParams: Params;

	/**
	 * Params from the matching route for the outlet
	 */
	params: Params;

	/**
	 * Match type of the route for the outlet, either `index`, `partial` or `error`
	 */
	type: MatchType;

	/**
	 * The router instance
	 */
	router: Router;

	/**
	 * Function returns true if the outlet match was an `error` type
	 */
	isError(): boolean;

	/**
	 * Function returns true if the outlet match was an `index` type
	 */
	isExact(): boolean;
}

/**
 * Properties for the Link widget
 */
export interface LinkProperties extends VNodeProperties {
	key?: string;
	routerKey?: string;
	isOutlet?: boolean;
	params?: Params;
	onClick?: (event: MouseEvent) => void;
	to: string;
}

/**
 * The `onChange` function signature
 */
export interface OnChangeFunction {
	(path: string): void;
}

/**
 * Options for a history provider
 */
export interface HistoryOptions {
	onChange: OnChangeFunction;
	window?: Window;
	base?: string;
}

/**
 * History Constructor
 */
export interface HistoryConstructor {
	new (options: HistoryOptions): History;
}

/**
 * History interface
 */
export interface History {
	/**
	 * Sets the path on the history manager
	 */
	set(path: string): void;

	/**
	 * Adds a prefix to the path if the history manager requires
	 */
	prefix(path: string): string;

	/**
	 *
	 */
	replace(path: string): void;

	/**
	 * Returns the current path
	 */
	readonly current: string;

	readonly previous: string;
}

export interface RouterOptions {
	window?: Window;
	base?: string;
	HistoryManager?: HistoryConstructor;
}
