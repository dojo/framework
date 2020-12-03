import global from '../shim/global';
import Evented from '../core/Evented';
import {
	RouteConfig,
	History,
	RouteContext,
	Params,
	RouterInterface,
	Route,
	RouterOptions,
	MatchType
} from './interfaces';
import { HashHistory } from './history/HashHistory';
import { EventObject } from '../core/Evented';

const PARAM = '__PARAM__';
const WILDCARD = '__WILDCARD__';

const paramRegExp = new RegExp(/^{.+}$/);
const wildCardRegExp = new RegExp(/^\*$/);

interface RouteWrapper {
	route: Route;
	segments: string[];
	parent: RouteWrapper | undefined;
	type: MatchType;
	params: Params;
}

export interface NavEvent extends EventObject<string> {
	outlet?: string;
	context?: RouteContext;
}

export interface RouteEvent extends EventObject<string> {
	route: RouteContext;
	action: 'enter' | 'exit';
}

export interface OutletEvent extends EventObject<string> {
	outlet: RouteContext;
	action: 'enter' | 'exit';
}

const ROUTE_SEGMENT_SCORE = 7;
const DYNAMIC_SEGMENT_PENALTY = 2;
const WILDCARD_SEGMENT_PENALTY = 3;

function matchingParams({ params: previousParams }: RouteContext, { params }: RouteContext) {
	const matching = Object.keys(previousParams).every((key) => previousParams[key] === params[key]);
	if (!matching) {
		return false;
	}
	return Object.keys(params).every((key) => previousParams[key] === params[key]);
}

function matchingSegments({ wildcardSegments: previousSegments }: RouteContext, { wildcardSegments }: RouteContext) {
	return wildcardSegments.join('') === previousSegments.join('');
}

export class Router extends Evented<{ nav: NavEvent; route: RouteEvent; outlet: OutletEvent }>
	implements RouterInterface {
	private _routes: Route[] = [];
	private _routeMap: { [index: string]: Route } = Object.create(null);
	private _matchedRoutes: { [index: string]: RouteContext } = Object.create(null);
	private _matchedOutletMap = new Map<string, Map<string, RouteContext>>();
	private _currentParams: Params = {};
	private _currentQueryParams: Params = {};
	private _defaultRoute: string | undefined;
	private _history!: History;
	private _options: RouterOptions;
	private _currentMatchedRoute: RouteContext | undefined;

	constructor(config: RouteConfig[], options: RouterOptions = {}) {
		super();
		this._options = options;
		this._register(config);
		const autostart = options.autostart === undefined ? true : options.autostart;
		if (autostart) {
			this.start();
		}
	}

	/**
	 * Sets the path against the registered history manager
	 *
	 * @param path The path to set on the history manager
	 */
	public setPath(path: string): void {
		this._history.set(path);
	}

	/**
	 * Replaces the path against the registered history manager
	 *
	 * @param path The path to set on the history manager
	 */
	public replacePath(path: string): void {
		this._history.replace(path);
	}

	public start() {
		const { HistoryManager = HashHistory, base, window } = this._options;
		this._history = new HistoryManager({ onChange: this._onChange, base, window });
		this._history.start();
		if (this._matchedRoutes.errorRoute && this._defaultRoute) {
			const path = this.link(this._defaultRoute);
			if (path) {
				this.setPath(path);
			}
		}
	}

	/**
	 * Generate a link for a given outlet identifier and optional params.
	 *
	 * @param outlet The outlet to generate a link for
	 * @param params Optional Params for the generated link
	 */
	public link(outlet: string, params: Params = {}): string | undefined {
		let route = this._routeMap[outlet];
		if (route === undefined) {
			return;
		}

		let linkPath: string | undefined = route.fullPath;
		if (route.fullQueryParams.length > 0) {
			let queryString = route.fullQueryParams.reduce((queryParamString, param, index) => {
				if (index > 0) {
					return `${queryParamString}&${param}={${param}}`;
				}
				return `?${param}={${param}}`;
			}, '');
			linkPath = `${linkPath}${queryString}`;
		}
		params = { ...route.defaultParams, ...this._currentQueryParams, ...this._currentParams, ...params };

		if (Object.keys(params).length === 0 && route.fullParams.length > 0) {
			return undefined;
		}

		const fullParams = [...route.fullParams, ...route.fullQueryParams];
		for (let i = 0; i < fullParams.length; i++) {
			const param = fullParams[i];
			if (params[param]) {
				linkPath = linkPath.replace(`{${param}}`, params[param]);
			} else {
				return undefined;
			}
		}
		return this._history.prefix(linkPath);
	}

	/**
	 * Returns the route context for the route identifier if one has been matched
	 *
	 * @param routeId The route identifer
	 */
	public getRoute(routeId: string): RouteContext | undefined {
		return this._matchedRoutes[routeId];
	}

	public getOutlet(outletId: string): undefined | Map<string, RouteContext> {
		return this._matchedOutletMap.get(outletId);
	}

	public getMatchedRoute(): RouteContext | undefined {
		return this._currentMatchedRoute;
	}

	/**
	 * Returns all the params for the current matched outlets
	 */
	public get currentParams() {
		return this._currentParams;
	}

	/**
	 * Strips the leading slash on a path if one exists
	 *
	 * @param path The path to strip a leading slash
	 */
	private _stripLeadingSlash(path: string): string {
		if (path[0] === '/') {
			return path.slice(1);
		}
		return path;
	}

	/**
	 * Registers the routing configuration
	 *
	 * @param config The configuration
	 * @param routes The routes
	 * @param parentRoute The parent route
	 */
	private _register(config: RouteConfig[], routes?: Route[], parentRoute?: Route): void {
		routes = routes ? routes : this._routes;
		for (let i = 0; i < config.length; i++) {
			let { path, outlet, children, defaultRoute = false, defaultParams = {}, id, title, redirect } = config[i];
			let [parsedPath, queryParamString] = path.split('?');
			let queryParams: string[] = [];
			parsedPath = this._stripLeadingSlash(parsedPath);

			const segments: string[] = parsedPath.split('/');
			const route: Route = {
				params: [],
				id,
				outlet,
				title,
				path: parsedPath,
				segments,
				redirect,
				defaultParams: parentRoute ? { ...parentRoute.defaultParams, ...defaultParams } : defaultParams,
				children: [],
				fullPath: parentRoute ? `${parentRoute.fullPath}/${parsedPath}` : parsedPath,
				fullParams: [],
				fullQueryParams: [],
				score: parentRoute ? parentRoute.score : 0
			};
			if (defaultRoute) {
				this._defaultRoute = id;
			}
			for (let i = 0; i < segments.length; i++) {
				const segment = segments[i];
				route.score += ROUTE_SEGMENT_SCORE;
				if (paramRegExp.test(segment)) {
					route.score -= DYNAMIC_SEGMENT_PENALTY;
					route.params.push(segment.replace('{', '').replace('}', ''));
					segments[i] = PARAM;
				}

				if (wildCardRegExp.test(segment)) {
					route.score -= WILDCARD_SEGMENT_PENALTY;
					segments[i] = WILDCARD;
					segments.splice(i + 1);
					break;
				}
			}
			if (queryParamString) {
				queryParams = queryParamString.split('&').map((queryParam) => {
					return queryParam.replace('{', '').replace('}', '');
				});
			}
			route.fullQueryParams = parentRoute ? [...parentRoute.fullQueryParams, ...queryParams] : queryParams;

			route.fullParams = parentRoute ? [...parentRoute.fullParams, ...route.params] : route.params;

			if (children && children.length > 0) {
				this._register(children, route.children, route);
			}
			this._routeMap[id] = route;
			routes.push(route);
		}
	}

	/**
	 * Returns an object of query params
	 *
	 * @param queryParamString The string of query params, e.g `paramOne=one&paramTwo=two`
	 */
	private _getQueryParams(queryParamString?: string): { [index: string]: string } {
		const queryParams: { [index: string]: string } = {};
		if (queryParamString) {
			const queryParameters = queryParamString.split('&');
			for (let i = 0; i < queryParameters.length; i++) {
				const [key, value] = queryParameters[i].split('=');
				queryParams[key] = value;
			}
		}
		return queryParams;
	}

	/**
	 * Called on change of the route by the the registered history manager. Matches the path against
	 * the registered outlets.
	 *
	 * @param requestedPath The path of the requested route
	 */
	private _onChange = (requestedPath: string): void => {
		requestedPath = this._stripLeadingSlash(requestedPath);
		const previousMatchedRoutes = this._matchedRoutes;
		this._matchedRoutes = Object.create(null);
		this._matchedOutletMap.clear();
		const [path, queryParamString] = requestedPath.split('?');
		this._currentQueryParams = this._getQueryParams(queryParamString);
		const segments = path.split('/');
		let routeConfigs: RouteWrapper[] = this._routes.map((route) => ({
			route,
			segments: [...segments],
			parent: undefined,
			params: {},
			type: 'index'
		}));
		let routeConfig: RouteWrapper | undefined;
		let matchedRoutes: RouteWrapper[] = [];
		while ((routeConfig = routeConfigs.pop())) {
			const { route, parent, segments, params } = routeConfig;
			let segmentIndex = 0;
			let type: MatchType = 'index';
			let paramIndex = 0;
			let routeMatch = true;
			if (segments.length < route.segments.length) {
				routeMatch = false;
			} else {
				while (segments.length > 0) {
					if (route.segments[segmentIndex] === undefined) {
						type = 'partial';
						break;
					}
					const segment = segments.shift()!;
					if (route.segments[segmentIndex] === PARAM) {
						params[route.params[paramIndex++]] = segment;
						this._currentParams = { ...this._currentParams, ...params };
					} else if (route.segments[segmentIndex] === WILDCARD) {
						type = 'wildcard';
						segments.unshift(segment);
						break;
					} else if (route.segments[segmentIndex] !== segment) {
						routeMatch = false;
						break;
					}
					segmentIndex++;
				}
			}

			if (routeMatch) {
				routeConfig.type = type;
				matchedRoutes.push({
					route,
					parent,
					type,
					params,
					segments: type === 'wildcard' ? segments.splice(0) : []
				});
				if (segments.length) {
					routeConfigs = [
						...routeConfigs,
						...route.children.map((childRoute) => ({
							route: childRoute,
							segments: [...segments],
							parent: routeConfig,
							type,
							params: { ...params }
						}))
					];
				}
			}
		}

		let matchedRouteId: string | undefined = undefined;

		let matchedRoute = matchedRoutes.shift();
		while (matchedRoute && matchedRoutes.length) {
			let currentMatch = matchedRoutes.shift();
			if (currentMatch && currentMatch.route.score > matchedRoute.route.score) {
				matchedRoute = currentMatch;
			}
		}

		if (matchedRoute) {
			if (matchedRoute.route.redirect && matchedRoute.type === 'index') {
				let { redirect } = matchedRoute.route;
				const params = { ...matchedRoute.params };
				Object.keys(params).forEach((paramKey) => {
					redirect = redirect.replace(`{${paramKey}}`, params[paramKey]);
				});
				this.setPath(redirect);
				return;
			}
			if (matchedRoute.type === 'partial') {
				matchedRoute.type = 'error';
			}
			matchedRouteId = matchedRoute.route.id;
			const title = this._options.setDocumentTitle
				? this._options.setDocumentTitle({
						id: matchedRouteId,
						title: matchedRoute.route.title,
						params: matchedRoute.params,
						queryParams: this._currentQueryParams
				  })
				: matchedRoute.route.title;
			if (title) {
				global.document.title = title;
			}
			while (matchedRoute) {
				let { type, params, route, segments } = matchedRoute;
				let parent: RouteWrapper | undefined = matchedRoute.parent;
				const matchedRouteContext: RouteContext = {
					id: route.id,
					outlet: route.outlet,
					queryParams: this._currentQueryParams,
					params,
					wildcardSegments: type === 'wildcard' ? segments : [],
					type,
					isError: () => type === 'error',
					isExact: () => type === 'index'
				};
				const previousMatchedOutlet = previousMatchedRoutes[route.id];
				const routeMap = this._matchedOutletMap.get(route.outlet) || new Map();
				routeMap.set(route.id, matchedRouteContext);
				this._matchedOutletMap.set(route.outlet, routeMap);
				this._matchedRoutes[route.id] = matchedRouteContext;
				if (
					!previousMatchedOutlet ||
					!matchingParams(previousMatchedOutlet, matchedRouteContext) ||
					(type === 'wildcard' && !matchingSegments(previousMatchedOutlet, matchedRouteContext))
				) {
					this.emit({ type: 'route', route: matchedRouteContext, action: 'enter' });
					this.emit({ type: 'outlet', outlet: matchedRouteContext, action: 'enter' });
				}
				matchedRoute = parent;
			}
		} else {
			this._matchedRoutes.errorRoute = {
				id: 'errorRoute',
				outlet: 'errorRoute',
				queryParams: {},
				params: {},
				wildcardSegments: [],
				isError: () => true,
				isExact: () => false,
				type: 'error'
			};
		}

		const previousMatchedOutletKeys = Object.keys(previousMatchedRoutes);
		for (let i = 0; i < previousMatchedOutletKeys.length; i++) {
			const key = previousMatchedOutletKeys[i];
			const matchedRoute = this._matchedRoutes[key];
			if (
				!matchedRoute ||
				!matchingParams(previousMatchedRoutes[key], matchedRoute) ||
				(matchedRoute.type === 'wildcard' && !matchingSegments(previousMatchedRoutes[key], matchedRoute))
			) {
				this.emit({ type: 'route', route: previousMatchedRoutes[key], action: 'exit' });
				this.emit({ type: 'outlet', outlet: previousMatchedRoutes[key], action: 'exit' });
			}
		}
		this._currentMatchedRoute = matchedRouteId ? this._matchedRoutes[matchedRouteId] : undefined;
		this.emit({
			type: 'nav',
			outlet: matchedRouteId,
			context: this._currentMatchedRoute
		});
		if (this._options.resetScroll) {
			const { window = global.window } = this._options;
			try {
				window.scroll(0, 0);
			} catch (e) {
				// Catch errors if we're in an environment without window.scroll
			}
		}
	};
}

export default Router;
