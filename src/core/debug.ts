import has from '../has/has';
import global from '../shim/global';
import { RouteConfig } from '../routing/interfaces';
import { RegistryLabel } from '../widget-core/interfaces';

export interface DojoDebug {
	widgets: string[];
	routingConfiguration: any;
}

function init() {
	if (has('dojo-debug') && !global.dojoDebug) {
		global.dojoDebug = {
			widgets: []
		};
	}
}

export function routingConfiguration(config: RouteConfig[]): void {
	init();
	if (has('dojo-debug')) {
		global.dojoDebug.routingConfiguration = config;
	}
}

export function registerWidget(widgetName: RegistryLabel): void {
	init();
	if (has('dojo-debug') && global.dojoDebug.widgets.indexOf(widgetName) === -1) {
		global.dojoDebug.widgets.push(widgetName);
	}
}

export function warn(...args: string[]): void {
	has('dojo-debug') && console.warn(...args);
}

export function error(...args: string[]): void {
	console.error(...args);
}

init();
