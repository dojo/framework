import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';
import { WidgetProperties, DNode } from '@dojo/widget-core/interfaces';
import { MapParamsOptions } from './../interfaces';

import { Link } from './../Link';
import { Outlet } from './../Outlet';

export interface ChildProperties extends WidgetProperties {
	name: string;
}

export class About extends WidgetBase {
	render(): DNode {
		return v('h2', [ 'About' ]);
	}
}

export class Company extends WidgetBase {
	render(): DNode {
		return v('h2', [ 'Company' ]);
	}
}

export interface UserProperties extends WidgetProperties {
	name: string;
}

export class User extends WidgetBase<UserProperties> {
	render(): DNode {
		return v('div', [
			v('h2', [ `User: ${this.properties.name}`])
		]);
	}
}

export const AboutOutlet = Outlet(About, 'about');
export const CompanyOutlet = Outlet(Company, 'company');
export const UserOutlet = Outlet(User, 'user', ({ params }: MapParamsOptions) => { return { name: params.user }; });

export class App extends WidgetBase {
	render(): DNode {
		return v('div', [
			v('ul', [
				v('li', [
					w(Link, { key: '1', to: 'about-us' }, [ 'About Us (Static)' ])
				]),
				v('li', [
					w(Link, { key: '2', to: 'company' }, [ 'Company (Static)' ])
				]),
				v('li', [
					w(Link, { key: '3', to: 'user', params: { user: 'kim' } }, [ 'Kim (dynamic)' ])
				]),
				v('li', [
					w(Link, { key: '4', to: 'user', params: { user: 'chris' } }, [ 'Chris (dynamic)' ])
				])
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
