import { Constructor, RegistryLabel, WidgetBaseInterface } from '@dojo/widget-core/interfaces';
import { Router } from './Router';
import { MatchType } from './Route';

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
	router: Router<any>;
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
