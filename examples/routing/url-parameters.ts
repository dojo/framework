import { WidgetBase } from '@dojo/framework/widget-core/WidgetBase';
import { v, w } from '@dojo/framework/widget-core/d';

import { Link } from '@dojo/framework/routing/Link';
import { Outlet } from '@dojo/framework/routing/Outlet';
import { MatchDetails } from '@dojo/framework/routing/interfaces';

export interface ChildProperties {
	name: string;
}

export class Child extends WidgetBase<ChildProperties> {
	protected render() {
		return v('div', [v('h3', [`ID: ${this.properties.name || 'this must be about'}`])]);
	}
}

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
			w(Outlet, {
				outlet: 'child',
				renderer: (details: MatchDetails) => {
					return w(Child, { name: details.params.id });
				}
			})
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
