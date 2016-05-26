import compose, { ComposeFactory } from 'dojo-compose/compose';
import UrlSearchParams from 'dojo-core/UrlSearchParams';
import { Hash } from 'dojo-core/interfaces';

import { DefaultParameters, Context, Parameters, Request } from './_interfaces';
import {
	deconstruct as deconstructPath,
	match as matchPath,
	DeconstructedPath
} from './_path';

/**
 * Describes whether a route matched.
 */
export interface MatchResult<PP> {
	/**
	 * Whether there are path segments that weren't matched by this route.
	 */
	hasRemaining: boolean;

	/**
	 * Whether the route matched.
	 */
	isMatch: boolean;

	/**
	 * Position in the segments array that the remaining unmatched segments start.
	 */
	offset?: number;

	/**
	 * Any extracted parameters. Only available if the route matched.
	 */
	params?: PP;
}

/**
 * Indicates which handler should be called when the route is executed.
 */
export const enum Handler { Exec, Fallback, Index }

/**
 * Describes the selection of a particular route.
 */
export interface Selection {
	/**
	 * Which handler should be called when the route is executed.
	 */
	handler: Handler;

	/**
	 * The extracted parameters.
	 */
	params: Parameters;

	/**
	 * The selected route.
	 */
	route: Route<Parameters>;
}

/**
 * A route.
 * The generic should be specified if parameter access is required.
 */
export interface Route<PP extends Parameters> {
	/**
	 * A deconstructed form of the path the route was created for. Used for matching.
	 * @private
	 */
	path?: DeconstructedPath;

	/**
	 * Holds the next level of the route hierarchy.
	 * @private
	 */
	routes?: Route<Parameters>[];

	/**
	 * Whether trailing slashes in the matching path must match trailing slashes in this route's path.
	 * @private
	 */
	trailingSlashMustMatch?: boolean;

	/**
	 * Append one or more routes.
	 * @param routes A single route or an array containing 0 or more routes.
	 */
	append(routes: Route<Parameters> | Route<Parameters>[]): void;

	/**
	 * Callback used to execute the route if it's been selected.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 * @protected
	 */
	exec(request: Request<PP>): void;

	/**
	 * If specified, causes the route to be selected if there are no nested routes that match the remainder of
	 * the dispatched path. When the route is executed, this handler is called rather than `exec()`.
	 * @param request An object whose `context` property contains the dispatch context. No extracted parameters
	 *   are available.
	 * @protected
	 */
	fallback?(request: Request<PP>): void;

	/**
	 * Callback used to determine whether the route should be selected after it's been matched.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 * @private
	 */
	guard(request: Request<PP>): boolean;

	/**
	 * If specified, and the route is the final route in the hierarchy, when the route is executed, this handler is
	 * called rather than `exec()`.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 * @protected
	 */
	index?(request: Request<PP>): void;

	/**
	 * Determine whether the route matches.
	 * @param segments Segments of the pathname (excluding slashes).
	 * @param hasTrailingSlash Whether the pathname that's being matched ended with a slashes.
	 * @param searchParams Parameters extracted from the search component.
	 * @return Whether and how the route matched.
	 * @private
	 */
	match(segments: string[], hasTrailingSlash: boolean, searchParams: UrlSearchParams): MatchResult<PP>;

	/**
	 * Callback used for constructing the `params` object from extracted parameters, and validating the parameters.
	 * @param fromPathname Array of parameter values extracted from the pathname.
	 * @param searchParams Parameters extracted from the search component.
	 * @return If `null` prevents the route from being selected, else the value for the `params` object.
	 * @private
	 */
	params(fromPathname: string[], searchParams: UrlSearchParams): void | PP;

	/**
	 * Attempt to select this and any nested routes.
	 * @param context The dispatch context.
	 * @param segments Segments of the pathname (excluding slashes).
	 * @param hasTrailingSlash Whether the pathname that's being matched ended with a slashes.
	 * @param searchParams Parameters extracted from the search component.
	 * @return An empty array if this (and any nested routes) could not be selected, else the selected routes and
	 *   accompanying `params` objects.
	 */
	select(context: Context, segments: string[], hasTrailingSlash: boolean, searchParams: UrlSearchParams): Selection[];
}

/**
 * The options for the route.
 */
export interface RouteOptions<PP> {
	/**
	 * Path the route matches against. Pathname segments may be named, same for query parameters. Leading slashes are
	 * ignored. Defaults to `/`.
	 */
	path?: string;

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
	exec?(request: Request<PP>): void;

	/**
	 * If specified, causes the route to be selected if there are no nested routes that match the remainder of
	 * the dispatched path. When the route is executed, this handler is called rather than `exec()`.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 */
	fallback?(request: Request<PP>): void;

	/**
	 * Callback used to determine whether the route should be selected after it's been matched.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 * @return Returning `true` causes the route to be selected.
	 */
	guard?(request: Request<PP>): boolean;

	/**
	 * If specified, and the route is the final route in the hierarchy, when the route is executed, this handler is
	 * called rather than `exec()`.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 */
	index?(request: Request<PP>): void;

	/**
	 * Callback used for constructing the `params` object from extracted parameters, and validating the parameters.
	 * @param fromPathname Array of parameter values extracted from the pathname.
	 * @param searchParams Parameters extracted from the search component.
	 * @return If `null` prevents the route from being selected, else the value for the `params` object.
	 */
	params?(fromPathname: string[], searchParams: UrlSearchParams): void | PP;
}

export interface RouteFactory extends ComposeFactory<Route<Parameters>, RouteOptions<Parameters>> {
	/**
	 * Create a new instance of a route.
	 * @param options Options to use during creation.
	 */
	<PP extends Parameters>(options?: RouteOptions<PP>): Route<PP>;
}

const createRoute: RouteFactory = compose<Route<Parameters>, RouteOptions<Parameters>>({
	append (routes: Route<Parameters> | Route<Parameters>[]) {
		if (Array.isArray(routes)) {
			for (const route of routes) {
				this.routes.push(route);
			}
		}
		else {
			this.routes.push(routes);
		}
	},

	exec (request: Request<Parameters>) {},

	guard (request: Request<Parameters>) {
		return true;
	},

	match (segments: string[], hasTrailingSlash: boolean, searchParams: UrlSearchParams): MatchResult<Parameters> {
		const { hasRemaining, isMatch, offset, values } = matchPath(this.path, segments);
		if (!isMatch) {
			return { hasRemaining: false, isMatch: false };
		}

		if (!hasRemaining && this.trailingSlashMustMatch && this.path.trailingSlash !== hasTrailingSlash) {
			return { hasRemaining: false, isMatch: false };
		}

		// Only extract the search params defined in the route's path.
		const knownSearchParams = (<DeconstructedPath> this.path).searchParameters.reduce((list, name) => {
			const value = searchParams.getAll(name);
			if (value !== null) {
				list[name] = value;
			}
			return list;
		}, {} as Hash<string[]>);

		const params = this.params(values, new UrlSearchParams(knownSearchParams));
		if (params === null) {
			return { hasRemaining: false, isMatch: false };
		}

		return { hasRemaining, isMatch: true, offset, params };
	},

	params (fromPathname: string[], searchParams: UrlSearchParams): DefaultParameters {
		const params: DefaultParameters = {};

		const { parameters, searchParameters } = <DeconstructedPath> this.path;
		parameters.forEach((name, index) => {
			params[name] = fromPathname[index];
		});
		searchParameters.forEach(name => {
			const value = searchParams.get(name);
			if (value !== null) {
				params[name] = value;
			}
		});

		return params;
	},

	select (context: Context, segments: string[], hasTrailingSlash: boolean, searchParams: UrlSearchParams): Selection[] {
		const { isMatch, hasRemaining, offset, params } = this.match(segments, hasTrailingSlash, searchParams);

		// Return early if possible.
		if (!isMatch || hasRemaining && this.routes.length === 0 && !this.fallback) {
			return [];
		}

		// Always guard.
		if (!this.guard({ context, params })) {
			return [];
		}

		// Select this route, configure the index handler if specified.
		if (!hasRemaining) {
			const handler = this.index ? Handler.Index : Handler.Exec;
			return [{ handler, params, route: this }];
		}

		// Match the remaining segments. Return a hierarchy if nested routes were selected.
		const remainingSegments = segments.slice(offset);
		for (const nested of this.routes) {
			const hierarchy = nested.select(context, remainingSegments, hasTrailingSlash, searchParams);
			if (hierarchy.length > 0) {
				return [{ handler: Handler.Exec, params, route: this }, ...hierarchy];
			}
		}

		// No remaining segments matched, only select this route if a fallback handler was specified.
		if (this.fallback) {
			return [{ handler: Handler.Fallback, params, route: this }];
		}

		return [];
	}
}, (instance, { exec, fallback, guard, index, params, path, trailingSlashMustMatch = true } = {}) => {
	if (path && /#/.test(path)) {
		throw new TypeError('Path must not contain \'#\'');
	}

	instance.path = deconstructPath(path || '/');
	instance.routes = [];
	instance.trailingSlashMustMatch = trailingSlashMustMatch;

	if (exec) {
		instance.exec = exec;
	}
	if (fallback) {
		instance.fallback = fallback;
	}
	if (guard) {
		instance.guard = guard;
	}
	if (index) {
		instance.index = index;
	}
	if (params) {
		const { parameters, searchParameters } = instance.path;
		if (parameters.length === 0 && searchParameters.length === 0) {
			throw new TypeError('Can\'t specify params() if path doesn\'t contain any');
		}

		instance.params = params;
	}
});

export default createRoute;
