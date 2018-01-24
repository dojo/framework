import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';
import { MapParamsOptions } from './../src/interfaces';

import { Link } from './../src/Link';
import { Outlet } from './../src/Outlet';

export interface ChildProperties {
	name: string;
}

export class Child extends WidgetBase<ChildProperties> {
	protected render() {
		return v('div', [v('h3', [`ID: ${this.properties.name || 'this must be about'}`])]);
	}
}

export const ChildOutlet = Outlet(Child, 'child', {
	mapParams: ({ params }: MapParamsOptions) => {
		return { name: params.id };
	}
});

export class App extends WidgetBase {
	protected render() {
		return v('div', [
			v('h2', ['Accounts']),
			v('ul', [
				v('li', [w(Link, { key: '1', to: 'child', params: { id: 'netflix' } }, ['Netflix'])]),
				v('li', [w(Link, { key: '2', to: 'child', params: { id: 'zillow-group' } }, ['Zillow Group'])]),
				v('li', [w(Link, { key: '3', to: 'child', params: { id: 'yahoo' } }, ['Yahoo'])]),
				v('li', [w(Link, { key: '4', to: 'child', params: { id: 'modus-create' } }, ['Modus Create'])])
			]),
			w(ChildOutlet, {})
		]);
	}
}

export const UrlParametersRouteConfig = {
	path: 'url-parameters',
	outlet: 'url-parameters',
	children: [
		{
			path: '{id}',
			outlet: 'child'
		}
	]
};

export const UrlParametersAppOutlet = Outlet(App, 'url-parameters');
