import { WidgetBase } from '@dojo/framework/widget-core/WidgetBase';
import { v, w } from '@dojo/framework/widget-core/d';

import { Outlet } from '@dojo/framework/routing/Outlet';
import { Link } from '@dojo/framework/routing/Link';
import { MatchDetails } from '@dojo/framework/routing/interfaces';

export interface ChildProperties {
	name: string;
}

export class About extends WidgetBase {
	protected render() {
		return v('div', [v('h2', ['About'])]);
	}
}

export class Home extends WidgetBase {
	protected render() {
		return v('div', [v('h2', ['Home'])]);
	}
}

export interface TopicsProperties {
	showHeading: boolean;
}

export class Topics extends WidgetBase<TopicsProperties> {
	protected render() {
		const { showHeading } = this.properties;

		return v('div', [
			v('h2', ['Topics']),
			v('ul', [
				v('li', [
					w(Link, { key: 'rendering', to: 'topic', params: { topic: 'rendering' } }, ['Rendering with Dojo'])
				]),
				v('li', [w(Link, { key: 'widgets', to: 'topic', params: { topic: 'widgets' } }, ['Widgets'])]),
				v('li', [w(Link, { key: 'props', to: 'topic', params: { topic: 'props-v-state' } }, ['Props v State'])])
			]),
			showHeading ? v('h3', ['Please select a topic.']) : null,
			w(Outlet, {
				id: 'topic',
				renderer({ params, type }: MatchDetails) {
					if (type === 'error') {
						return w(ErrorWidget, {});
					}
					return w(Topic, { topic: params.topic });
				}
			})
		]);
	}
}

export interface TopicProperties {
	topic: string;
}

export class Topic extends WidgetBase<TopicProperties> {
	protected render() {
		return v('div', [v('h3', [this.properties.topic])]);
	}
}

class ErrorWidget extends WidgetBase {
	protected render() {
		return v('div', ['ERROR 2']);
	}
}

export class App extends WidgetBase {
	protected render() {
		return v('div', [
			v('ul', [
				v('li', [w(Link, { key: 'home', to: 'home' }, ['Home'])]),
				v('li', [w(Link, { key: 'about', to: 'about' }, ['About'])]),
				v('li', [w(Link, { key: 'topics', to: 'topics' }, ['Topics'])])
			]),
			w(Outlet, {
				id: 'about',
				renderer() {
					return w(About, {});
				}
			}),
			w(Outlet, {
				id: 'home',
				renderer() {
					return w(Home, {});
				}
			}),
			w(Outlet, {
				id: 'topics',
				renderer({ type }: MatchDetails) {
					return w(Topics, { showHeading: type === 'index' });
				}
			})
		]);
	}
}

export const BasicAppRouteConfig = {
	path: 'basic',
	outlet: 'basic',
	children: [
		{
			path: 'home',
			outlet: 'home'
		},
		{
			path: 'about',
			outlet: 'about'
		},
		{
			path: 'topics',
			outlet: 'topics',
			children: [
				{
					path: '{topic}',
					outlet: 'topic'
				}
			]
		}
	]
};
