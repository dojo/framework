export type EventType = string | symbol;

/**
 * The base event object, which provides a `type` property
 */
export interface EventObject<T = EventType> {
	/**
	 * The type of the event
	 */
	readonly type: T;
}

export interface EventErrorObject<T = EventType> extends EventObject<T> {
	/**
	 * The error that is the subject of this event
	 */
	readonly error: Error;
}

/**
 * An interface for an object which provides a cancelable event API.  By calling the
 * `.preventDefault()` method on the object, the event should be cancelled and not
 * proceed any further
 */
export interface EventCancelableObject<T = EventType> extends EventObject<T> {
	/**
	 * Can the event be canceled?
	 */
	readonly cancelable: boolean;

	/**
	 * Was the event canceled?
	 */
	readonly defaultPrevented: boolean;

	/**
	 * Cancel the event
	 */
	preventDefault(): void;
}

/**
 * Used through the toolkit as a consistent API to manage how callers can "cleanup"
 * when doing a function.
 */
export interface Handle {
	/**
	 * Perform the destruction/cleanup logic associated with this handle
	 */
	destroy(): void;
}

/**
 * A general interface that can be used to renference a general index map of values of a particular type
 */
export interface Hash<T> {
	[ id: string ]: T;
}

/**
 * A base map of styles where each key is the name of the style attribute and the value is a string
 * which represents the style
 */
export interface StylesMap {
	[style: string]: string;
}

/**
 * The interfaces to the `@dojo/loader` AMD loader
 */

export interface AmdConfig {
	/**
	 * The base URL that the loader will use to resolve modules
	 */
	baseUrl?: string;

	/**
	 * A map of module identifiers and their replacement meta data
	 */
	map?: AmdModuleMap;

	/**
	 * An array of packages that the loader should use when resolving a module ID
	 */
	packages?: AmdPackage[];

	/**
	 * A map of paths to use when resolving modules names
	 */
	paths?: { [path: string]: string };

	/**
	 * A map of packages that the loader should use when resolving a module ID
	 */
	pkgs?: { [path: string]: AmdPackage };
}

export interface AmdDefine {
	/**
	 * Define a module
	 *
	 * @param moduleId the MID to use for the module
	 * @param dependencies an array of MIDs this module depends upon
	 * @param factory the factory function that will return the module
	 */
	(moduleId: string, dependencies: string[], factory: AmdFactory): void;

	/**
	 * Define a module
	 *
	 * @param dependencies an array of MIDs this module depends upon
	 * @param factory the factory function that will return the module
	 */
	(dependencies: string[], factory: AmdFactory): void;

	/**
	 * Define a module
	 *
	 * @param factory the factory function that will return the module
	 */
	(factory: AmdFactory): void;

	/**
	 * Define a module
	 *
	 * @param value the value for the module
	 */
	(value: any): void;

	/**
	 * Meta data about this particular AMD loader
	 */
	amd: { [prop: string]: string | number | boolean };
}

export interface AmdFactory {
	/**
	 * The module factory
	 *
	 * @param modules The arguments that represent the resolved versions of the module dependencies
	 */
	(...modules: any[]): any;
}

export interface AmdHas {
	/**
	 * Determine if a feature is present
	 *
	 * @param name the feature name to check
	 */
	(name: string): any;

	/**
	 * Register a feature test
	 *
	 * @param name The name of the feature to register
	 * @param value The test for the feature
	 * @param now If `true` the test will be executed immediatly, if not, it will be lazily executed
	 * @param force If `true` the test value will be overwritten if already registered
	 */
	add(
		name: string,
		value: (global: Window, document?: HTMLDocument, element?: HTMLDivElement) => any,
		now?: boolean,
		force?: boolean
	): void;
	add(name: string, value: any, now?: boolean, force?: boolean): void;
}

export interface AmdModuleMap extends AmdModuleMapItem {
	[sourceMid: string]: AmdModuleMapReplacement;
}

export interface AmdModuleMapItem {
	[mid: string]: any;
}

export interface AmdModuleMapReplacement extends AmdModuleMapItem {
	[findMid: string]: string;
}

export interface NodeRequire {
	(moduleId: string): any;
	resolve(moduleId: string): string;
}

export interface AmdPackage {
	/**
	 * The path to the root of the package
	 */
	location?: string;

	/**
	 * The main module of the package (defaults to `main.js`)
	 */
	main?: string;

	/**
	 * The package name
	 */
	name?: string;
}

export interface AmdRequire {
	/**
	 * Resolve a list of module dependencies and pass them to the callback
	 *
	 * @param dependencies The array of MIDs to resolve
	 * @param callback The function to invoke with the resolved dependencies
	 */
	(dependencies: string[], callback: AmdRequireCallback): void;

	/**
	 * Resolve and return a single module (compatability with CommonJS `require`)
	 *
	 * @param moduleId The module ID to resolve and return
	 */
	<ModuleType>(moduleId: string): ModuleType;

	/**
	 * If running in the node environment, a reference to the original NodeJS `require`
	 */
	nodeRequire?: NodeRequire;

	/**
	 * Take a relative MID and return an absolute MID
	 *
	 * @param moduleId The relative module ID to resolve
	 */
	toAbsMid(moduleId: string): string;

	/**
	 * Take a path and resolve the full URL for the path
	 *
	 * @param path The path to resolve and return as a URL
	 */
	toUrl(path: string): string;
}

export interface AmdRequireCallback {
	/**
	 * The `require` callback
	 *
	 * @param modules The arguments that represent the resolved versions of dependencies
	 */
	(...modules: any[]): void;
}

export interface AmdRootRequire extends AmdRequire {
	/**
	 * The minimalist `has` API integrated with the `@dojo/loader`
	 */
	has: AmdHas;

	/**
	 * Register an event listener
	 *
	 * @param type The event type to listen for
	 * @param listener The listener to call when the event is emitted
	 */
	on(type: AmdRequireOnSignalType, listener: any): { remove: () => void };

	/**
	 * Configure the loader
	 *
	 * @param config The configuration to apply to the loader
	 */
	config(config: AmdConfig): void;

	/**
	 * Return internal values of loader for debug purposes
	 *
	 * @param name The name of the internal label
	 */
	inspect?(name: string): any;

	/**
	 * Undefine a module, based on absolute MID that should be removed from the loader cache
	 */
	undef(moduleId: string): void;
}

/**
 * The signal type for the `require.on` API
 */
export type AmdRequireOnSignalType = 'error';
