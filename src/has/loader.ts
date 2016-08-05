export interface Config {
	baseUrl?: string;
	map?: ModuleMap;
	packages?: Package[];
	paths?: { [ path: string ]: string; };
	pkgs?: { [ path: string ]: Package; };
}

export interface ModuleMap extends ModuleMapItem {
	[ sourceMid: string ]: ModuleMapReplacement;
}

export interface ModuleMapItem {
	[ mid: string ]: any;
}

export interface ModuleMapReplacement extends ModuleMapItem {
	[ findMid: string ]: string;
}

export interface Package {
	location?: string;
	main?: string;
	name?: string;
}

export interface Require {
	(dependencies: string[], callback: RequireCallback): void;
	<ModuleType>(moduleId: string): ModuleType;

	toAbsMid(moduleId: string): string;
	toUrl(path: string): string;
}

export interface Has {
	(name: string): any;
	add(name: string, value: (global: Window, document?: HTMLDocument, element?: HTMLDivElement) => any,
		now?: boolean, force?: boolean): void;
	add(name: string, value: any, now?: boolean, force?: boolean): void;
}

export type SignalType = 'error';

export interface RootRequire extends Require {
	has: Has;
	on(type: SignalType, listener: any): { remove: () => void };
	config(config: Config): void;
	inspect?(name: string): any;
	nodeRequire?(id: string): any;
	undef(moduleId: string): void;
}

export interface RequireCallback {
	(...modules: any[]): void;
}
