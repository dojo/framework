import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';

import { Outlet } from './../src/Outlet';
import { Link } from './../src/Link';
import { MapParamsOptions } from './../src/interfaces';

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
					w(Link, { key: 'rendering', to: 'topic', params: { topic: 'rendering' } }, [
						'Rendering with Dojo 2'
					])
				]),
				v('li', [w(Link, { key: 'widgets', to: 'topic', params: { topic: 'widgets' } }, ['Widgets'])]),
				v('li', [w(Link, { key: 'props', to: 'topic', params: { topic: 'props-v-state' } }, ['Props v State'])])
			]),
			showHeading ? v('h3', ['Please select a topic.']) : null,
			w(TopicOutlet, {})
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

export const AboutOutlet = Outlet(About, 'about');
export const HomeOutlet = Outlet({ index: Home }, 'home');
export const TopicsOutlet = Outlet(Topics, 'topics', {
	mapParams: ({ type }: MapParamsOptions) => {
		return { showHeading: type === 'index' };
	}
});
export const TopicOutlet = Outlet({ main: Topic, error: ErrorWidget }, 'topic', {
	mapParams: ({ params }) => {
		return { topic: params.topic };
	}
});

export class App extends WidgetBase {
	protected render() {
		return v('div', [
			v('ul', [
				v('li', [w(Link, { key: 'home', to: 'home' }, ['Home'])]),
				v('li', [w(Link, { key: 'about', to: 'about' }, ['About'])]),
				v('li', [w(Link, { key: 'topics', to: 'topics' }, ['Topics'])])
			]),
			w(AboutOutlet, {}),
			w(HomeOutlet, {}),
			w(TopicsOutlet, {})
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

export const BasicAppOutlet = Outlet(App, 'basic');
