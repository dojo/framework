import UrlSearchParams from '@dojo/core/UrlSearchParams';
import { Thenable } from '@dojo/shim/interfaces';
import WeakMap from '@dojo/shim/WeakMap';
import {
	Context,
	DefaultParameters,
	Handler,
	LinkParams,
	MatchResult,
	MatchType,
	Parameters,
	Request,
	RouteInterface,
	SearchParams,
	Selection
} from './interfaces';
import { deconstruct as deconstructPath, DeconstructedPath, match as matchPath } from './lib/path';
import { findRouter, hasBeenAppended } from './lib/router';

/**
 * The options for the route.
 */
export interface RouteOptions<C, P extends Parameters> {
	/**
	 * Path the route matches against. Pathname segments may be named, same for query parameters. Leading slashes are
	 * ignored. Defaults to `/`.
	 */
	path?: string;

	/**
	 * The outlet associated with the path
	 */
	outlet?: string;

	/**
	 * If the `path` option contains a trailing slash (in the pathname component), the route will only match against
	 * another pathname that contains a trailing slash, and vice-versa if the path does not contain a trailing slash.
	 * Defaults to `true`, change to `false` to allow routes to match regardless of trailing slashes.
	 */
	trailingSlashMustMatch?: boolean;

	/**
	 * A handler called when the route is executed.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 */
	exec?(request: Request<C, P>): void | Thenable<any>;

	/**
	 * If specified, causes the route to be selected if there are no nested routes that match the remainder of
	 * the dispatched path. When the route is executed, this handler is called rather than `exec()`.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 */
	fallback?(request: Request<C, P>): void | Thenable<any>;

	/**
	 * Callback used to determine whether the route should be selected after it's been matched.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 * @return Returning `true` causes the route to be selected. Returning a string indicates that a redirect is
	 *   required; the string should be the path to redirect to.
	 */
	guard?(request: Request<C, P>): string | boolean;

	/**
	 * If specified, and the route is the final route in the hierarchy, when the route is executed, this handler is
	 * called rather than `exec()`.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 */
	index?(request: Request<C, P>): void | Thenable<any>;

	/**
	 * Callback used for constructing the `params` object from extracted parameters, and validating the parameters.
	 * @param fromPathname Array of parameter values extracted from the pathname.
	 * @param searchParams Parameters extracted from the search component.
	 * @return If `null` prevents the route from being selected, else the value for the `params` object.
	 */
	params?(fromPathname: string[], searchParams: UrlSearchParams): null | P;

	/**
	 * Default params to use when generating a link.
	 */
	defaultParams?: null | P;
}

// Store parent relationships in a separate map, since it's the parent that adds entries to this map. Parents shouldn't
// change the private state of their children.
const parentMap = new WeakMap<Route<Context, Parameters>, Route<Context, Parameters>>();

const noop = () => {
};

function computeDefaultParams(parameters: string[], searchParameters: string[], fromPathname: string[], searchParams: UrlSearchParams): null | DefaultParameters {
	const params: DefaultParameters = {};
	parameters.forEach((name, index) => {
		params[ name ] = fromPathname[ index ];
	});
	searchParameters.forEach(name => {
		const value = searchParams.get(name);
		if (value !== undefined) {
			params[ name ] = value;
		}
	});

	return params;
}

export class Route<C extends Context, P extends Parameters> implements RouteInterface<C, P> {
	private _path: DeconstructedPath;
	private _outlet: string | undefined;
	private _routes: Route<Context, Parameters>[];
	private _trailingSlashMustMatch: boolean;
	private _computeParams: (fromPathname: string[], searchParams: UrlSearchParams) => null | P | DefaultParameters;
	private _exec?: Handler;
	private _fallback?: Handler;
	private _guard: ((request: Request<C, P | DefaultParameters>) => string | boolean) | undefined;
	private _index?: Handler;
	private _defaultParams: P;

	get parent() {
		return parentMap.get(this);
	}

	get path(this: Route<C, P>) {
		return this._path;
	}

	get outlet() {
		return this._outlet;
	}

	get defaultParams(): P {
		return this._defaultParams;
	}

	constructor(options: RouteOptions<C, P> = {}) {
		const { exec, fallback, guard, index, params: computeParams, path, outlet, trailingSlashMustMatch = true, defaultParams = {} } = options;

		if (path && /#/.test(path)) {
			throw new TypeError('Path must not contain \'#\'');
		}

		const deconstructedPath = deconstructPath(path || '/');
		const { parameters, searchParameters } = deconstructedPath;

		if (computeParams) {
			if (parameters.length === 0 && searchParameters.length === 0) {
				throw new TypeError('Can\'t specify params() if path doesn\'t contain any');
			}

			this._computeParams = computeParams;
		}
		else {
			this._computeParams = (fromPathname: string[], searchParams: UrlSearchParams) => {
				return computeDefaultParams(parameters, searchParameters, fromPathname, searchParams);
			};
		}

		this._exec = exec;
		this._fallback = fallback;
		this._guard = guard;
		this._index = index;
		this._path = deconstructedPath;
		this._outlet = outlet;
		this._routes = [];
		this._defaultParams = <P> defaultParams;
		this._trailingSlashMustMatch = trailingSlashMustMatch;
	}

	append(add: Route<Context, Parameters> | Route<Context, Parameters>[]) {
		const append = (route: Route<Context, Parameters>) => {
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

	link(params?: LinkParams): string {
		return findRouter(this).link(this, params);
	}

	match(segments: string[], hasTrailingSlash: boolean, searchParams: UrlSearchParams): null | MatchResult<DefaultParameters | P> {
		const result = matchPath(this._path, segments);
		if (result === null) {
			return null;
		}

		if (!result.hasRemaining && this._trailingSlashMustMatch && this._path.trailingSlash !== hasTrailingSlash) {
			return null;
		}

		// Only extract the search params defined in the route's path.
		const knownSearchParams = this._path.searchParameters.reduce<SearchParams>((list, name) => {
			const value = searchParams.getAll(name);
			if (value !== undefined) {
				list[ name ] = value;
			}
			return list;
		}, {});

		const params = this._computeParams(result.values, new UrlSearchParams(knownSearchParams));
		if (params === null) {
			return null;
		}

		return {
			hasRemaining: result.hasRemaining,
			offset: result.offset,
			params,
			rawPathValues: result.values,
			rawSearchParams: knownSearchParams
		};
	}

	select(context: C, segments: string[], hasTrailingSlash: boolean, searchParams: UrlSearchParams): string | Selection[] {
		const matchResult = this.match(segments, hasTrailingSlash, searchParams);

		// Return early if possible.
		if (!matchResult || matchResult.hasRemaining && this._routes.length === 0 && !this._fallback && !this._outlet) {
			return [];
		}

		const { params } = matchResult;
		if (this._guard) {
			const guardResult = this._guard({ context, params });
			if (typeof guardResult === 'string') {
				return guardResult;
			}
			if (!guardResult) {
				return [];
			}
		}

		let handler = this._exec;
		let type: MatchType = MatchType.PARTIAL;
		let redirect: string | undefined;
		let remainingSelection: Selection[] | undefined;
		let selected = false;

		if (matchResult.hasRemaining) {
			// Match the remaining segments. Return a hierarchy if nested routes were selected.
			const remainingSegments = segments.slice(matchResult.offset);
			selected = this._routes.some((nested) => {
				const nestedResult = nested.select(context, remainingSegments, hasTrailingSlash, searchParams);
				if (typeof nestedResult === 'string') {
					redirect = nestedResult;
					return true;
				}
				if (nestedResult.length > 0) {
					remainingSelection = nestedResult;
					return true;
				}
				return false;
			});

			// No remaining segments matched, only select this route if a fallback handler was specified.
			if (!selected && (this._outlet || this._fallback)) {
				type = MatchType.ERROR;
				selected = true;
				handler = this._fallback || noop;
			}
		}
		// Select this route, configure the index handler if specified.
		else {
			selected = true;
			type = MatchType.INDEX;
			if (this._index) {
				handler = this._index;
			}
		}

		if (!selected) {
			return [];
		}

		if (redirect !== undefined) {
			return redirect;
		}

		const { rawPathValues, rawSearchParams } = matchResult;
		const selection = {
			// Use a noop handler if exec was not provided. Something needs to be returned otherwise the router may
			// think no routes were selected.
			handler: handler || noop,
			path: this.path,
			outlet: this.outlet,
			params,
			rawPathValues,
			rawSearchParams,
			route: this,
			type
		};
		return remainingSelection ? [ selection, ...remainingSelection ] : [ selection ];
	}
}

export default Route;
