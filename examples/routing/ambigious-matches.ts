import { WidgetBase } from '@dojo/framework/widget-core/WidgetBase';
import { v, w } from '@dojo/framework/widget-core/d';

import { Link } from '@dojo/framework/routing/Link';
import { Outlet } from '@dojo/framework/routing/Outlet';
import { MatchDetails } from '@dojo/framework/routing/interfaces';

export interface ChildProperties {
	name: string;
}

export class About extends WidgetBase {
	protected render() {
		return v('h2', ['About']);
	}
}

export class Company extends WidgetBase {
	protected render() {
		return v('h2', ['Company']);
	}
}

export interface UserProperties {
	name: string;
}

export class User extends WidgetBase<UserProperties> {
	protected render() {
		return v('div', [v('h2', [`User: ${this.properties.name}`])]);
	}
}

export class App extends WidgetBase {
	protected render() {
		return v('div', [
			v('ul', [
				v('li', [w(Link, { key: '1', to: 'about-us' }, ['About Us (Static)'])]),
				v('li', [w(Link, { key: '2', to: 'company' }, ['Company (Static)'])]),
				v('li', [w(Link, { key: '3', to: 'user', params: { user: 'kim' } }, ['Kim (dynamic)'])]),
				v('li', [w(Link, { key: '4', to: 'user', params: { user: 'chris' } }, ['Chris (dynamic)'])])
			]),
			w(Outlet, {
				id: 'about-us',
				renderer: () => {
					return w(About, {});
				}
			}),
			w(Outlet, {
				id: 'company',
				renderer: () => {
					return w(Company, {});
				}
			}),
			w(Outlet, {
				id: 'user',
				renderer: ({ params }: MatchDetails) => {
					return w(User, { name: params.user });
				}
			})
		]);
	}
}

export const AmbiguousMatchesRouteConfig = {
	path: 'ambiguous-matches',
	outlet: 'ambiguous-matches',
	children: [
		{
			path: 'about',
			outlet: 'about-us'
		},
		{
			path: 'company',
			outlet: 'company'
		},
		{
			path: '{user}',
			outlet: 'user'
		}
	]
};
