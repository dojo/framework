import { WidgetBase } from '@dojo/framework/widget-core/WidgetBase';
import { v, w } from '@dojo/framework/widget-core/d';
import { ProjectorMixin } from '@dojo/framework/widget-core/mixins/Projector';
import { Registry } from '@dojo/framework/widget-core/Registry';

import { RouteConfig } from '@dojo/framework/routing/interfaces';
import { registerRouterInjector } from '@dojo/framework/routing/RouterInjector';
import { Link } from '@dojo/framework/routing/Link';
import { App as BasicApp, BasicAppRouteConfig } from './basic';
import { App as UrlParametersApp, UrlParametersRouteConfig } from './url-parameters';
import { App as AmbiguousMatchesApp, AmbiguousMatchesRouteConfig } from './ambigious-matches';
import { Outlet } from '@dojo/framework/routing/Outlet';

const applicationRoutes: RouteConfig[] = [BasicAppRouteConfig, UrlParametersRouteConfig, AmbiguousMatchesRouteConfig];

const registry = new Registry();

registerRouterInjector(applicationRoutes, registry);

const sideBarStyles = {
	fontSize: '13px',
	background: '#eee',
	overflow: 'auto',
	position: 'fixed',
	height: '100vh',
	left: '0px',
	top: '0px',
	bottom: '0px',
	width: '250px',
	display: 'block'
};

const linkStyles = {
	textDecoration: 'none',
	position: 'relative',
	display: 'block',
	lineHeight: '1.8',
	cursor: 'pointer',
	color: 'inherit'
};

const contentStyles = {
	marginLeft: '250px',
	display: 'block'
};

const menuStyles = {
	lineHeight: '1.8',
	padding: '10px',
	display: 'block'
};

const titleStyles = {
	textTransform: 'uppercase',
	fontWeight: 'bold',
	color: 'hsl(0, 0%, 32%)',
	marginTop: '20px',
	display: 'block'
};

const menuContainerStyles = {
	paddingLeft: '10px',
	display: 'block'
};

class App extends WidgetBase {
	protected render() {
		return v('div', [
			v('div', { styles: sideBarStyles }, [
				v('div', { styles: menuStyles }, [
					v('div', { styles: titleStyles }, ['Examples']),
					v('div', { styles: menuContainerStyles }, [
						w(Link, { key: 'basic', to: 'basic', styles: linkStyles }, ['Basic']),
						w(Link, { key: 'url', to: 'url-parameters', styles: linkStyles }, ['Url Parameters']),
						w(Link, { key: 'amb', to: 'ambiguous-matches', styles: linkStyles }, ['Ambiguous Matches'])
					])
				])
			]),
			v('div', { styles: contentStyles }, [
				w(Outlet, {
					outlet: 'ambiguous-matches',
					renderer() {
						return w(AmbiguousMatchesApp, {});
					}
				}),
				w(Outlet, {
					outlet: 'basic',
					renderer() {
						return w(BasicApp, {});
					}
				}),
				w(Outlet, {
					outlet: 'url-parameters',
					renderer() {
						return w(UrlParametersApp, {});
					}
				})
			])
		]);
	}
}

const Projector = ProjectorMixin(App);
const projector = new Projector();
projector.setProperties({ registry });
projector.append();
