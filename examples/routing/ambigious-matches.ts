import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';
import { MapParamsOptions } from './../src/interfaces';

import { Link } from './../src/Link';
import { Outlet } from './../src/Outlet';

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

export const AboutOutlet = Outlet(About, 'about-us');
export const CompanyOutlet = Outlet(Company, 'company');
export const UserOutlet = Outlet(User, 'user', {
	mapParams: ({ params }: MapParamsOptions) => {
		return { name: params.user };
	}
});

export class App extends WidgetBase {
	protected render() {
		return v('div', [
			v('ul', [
				v('li', [w(Link, { key: '1', to: 'about-us' }, ['About Us (Static)'])]),
				v('li', [w(Link, { key: '2', to: 'company' }, ['Company (Static)'])]),
				v('li', [w(Link, { key: '3', to: 'user', params: { user: 'kim' } }, ['Kim (dynamic)'])]),
				v('li', [w(Link, { key: '4', to: 'user', params: { user: 'chris' } }, ['Chris (dynamic)'])])
			]),
			w(AboutOutlet, {}),
			w(CompanyOutlet, {}),
			w(UserOutlet, {})
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

export const AmbiguousMatchesOutlet = Outlet(App, 'ambiguous-matches');
