declare namespace DojoLoader {
	export interface Config {
		baseUrl?: string;
		map?: ModuleMap;
		packages?: Package[];
		paths?: { [ path: string ]: string; };
		pkgs?: { [ path: string ]: Package; };
	}

	interface Define {
		(moduleId: string, dependencies: string[], factory: Factory): void;
		(dependencies: string[], factory: Factory): void;
		(factory: Factory): void;
		(value: any): void;
	}

	interface Factory {
		(...modules: any[]): any;
	}

	interface Has {
		(name: string): any;
		add(name: string, value: (global: Window, document?: HTMLDocument, element?: HTMLDivElement) => any,
			now?: boolean, force?: boolean): void;
		add(name: string, value: any, now?: boolean, force?: boolean): void;
	}

	interface LoaderError extends Error {
		src: string;
		info: { module: Module, url: string, parentMid: string };
	}

	interface LoaderPlugin {
		load?: (resourceId: string, require: Require, load: (value?: any) => void, config?: Object) => void;
		normalize?: (moduleId: string, normalize: (moduleId: string) => string) => string;
	}

	interface MapItem extends Array<any> {
		/* prefix */      0: string;
		/* replacement */ 1: any;
		/* regExp */      2: RegExp;
		/* length */      3: number;
	}

	interface MapReplacement extends MapItem {
		/* replacement */ 1: string;
	}

	interface MapRoot extends Array<MapSource> {
		star?: MapSource;
	}

	interface MapSource extends MapItem {
		/* replacement */ 1: MapReplacement[];
	}

	// TODO are we still abbreviating these properties?
	interface Module extends LoaderPlugin {
		cjs: {
			exports: any;
			id: string;
			setExports: (exports: any) => void;
			uri: string;
		};
		def: Factory;
		deps: Module[];
		executed: any; // TODO: enum
		injected: boolean;
		fix?: (module: Module) => void;
		gc: boolean;
		mid: string;
		pack: Package;
		req: Require;
		require?: Require; // TODO: WTF?
		result: any;
		url: string;

		// plugin interface
		loadQ?: Module[];
		plugin?: Module;
		prid: string;
	}

	interface ModuleDefinitionArguments extends Array<any> {
		0: string[];
		1: Factory;
	}

	interface ModuleMap extends ModuleMapItem {
		[ sourceMid: string ]: ModuleMapReplacement;
	}

	interface ModuleMapItem {
		[ mid: string ]: /* ModuleMapReplacement | ModuleMap */ any;
	}

	interface ModuleMapReplacement extends ModuleMapItem {
		[ findMid: string ]: /* replaceMid */ string;
	}

	interface ObjectMap { [ key: string ]: any; }

	interface Package {
		location?: string;
		main?: string;
		name?: string;
	}

	interface PackageMap {
		[ packageId: string ]: Package;
	}

	interface PathMap extends MapReplacement {}

	interface Require {
		(dependencies: string[], callback: RequireCallback): void;
		<ModuleType>(moduleId: string): ModuleType;

		toAbsMid(moduleId: string): string;
		toUrl(path: string): string;
	}

	interface RequireCallback {
		(...modules: any[]): void;
	}

	interface RootRequire extends Require {
		has: Has;
		on(type: SignalType, listener: any): { remove: () => void };
		config(config: Config): void;
		inspect?(name: string): any;
		nodeRequire?(id: string): any;
		undef(moduleId: string): void;
	}

	type SignalType = 'error';
}

declare const define: DojoLoader.Define;
declare const require: DojoLoader.Require;
