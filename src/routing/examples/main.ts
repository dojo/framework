import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';
import { ProjectorMixin } from '@dojo/widget-core/mixins/Projector';
import { Registry } from '@dojo/widget-core/Registry';

import { RouteConfig } from './../interfaces';
import { registerRouterInjector } from './../RouterInjector';
import { Link } from './../Link';
import { BasicAppOutlet, BasicAppRouteConfig } from './basic';
import { UrlParametersAppOutlet, UrlParametersRouteConfig } from './url-parameters';
import { AmbiguousMatchesOutlet, AmbiguousMatchesRouteConfig } from './ambigious-matches';

const applicationRoutes: RouteConfig[] = [
	BasicAppRouteConfig,
	UrlParametersRouteConfig,
	AmbiguousMatchesRouteConfig
];

const registry = new Registry();
const router = registerRouterInjector(applicationRoutes, registry);

const styles = { 'text-decoration': 'none', position: 'relative', display: 'block', 'line-height': '1.8', cursor: 'auto', color: 'inherit' };

class App extends WidgetBase {
	render() {
		return v('div', [
			v('div', {
				styles: {
					'font-size': '13px',
					background: '#eee',
					overflow: 'auto',
					position: 'fixed',
					height: '100vh',
					left: '0px',
					top: '0px',
					bottom: '0px',
					width: '250px',
					display: 'block'
				}
			}, [
				v('div', {
					styles: {
						'line-height': '1.8',
						padding: '10px',
						display: 'block'
					}
				}, [
					v('div', {
						styles: {
							'text-transform': 'uppercase',
							'font-weight': 'bold',
							color: 'hsl(0, 0%, 32%)',
							'margin-top': '20px',
							display: 'block'
						}
					},  [ 'Examples' ]),
					v('div', {
						styles: {
							'padding-left': '10px',
							display: 'block'
						}
					}, [
						w(Link, { key: 'basic', to: 'basic', styles }, [ 'Basic ']),
						w(Link, { key: 'url', to: 'url-parameters', styles }, [ 'Url Parameters' ]),
						w(Link, { key: 'amb', to: 'ambiguous-matches', styles }, [ 'Ambiguous Matches' ])
					])
				])
			]),
			v('div', { styles: {
				'margin-left': '250px',
				display: 'block'
			} }, [
				w(BasicAppOutlet, {}),
				w(UrlParametersAppOutlet, {}),
				w(AmbiguousMatchesOutlet, {})
			])
		]);
	}
}

const Projector = ProjectorMixin(App);
const projector = new Projector();
projector.setProperties({ registry });
projector.append();
router.start();
