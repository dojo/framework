import global from '../shim/global';
import WidgetBase from '../widget-core/WidgetBase';
import { DNode } from '../widget-core/interfaces';
import { Router } from './Router';
import { Handle } from '../core/Destroyable';

export interface PromptProperties {
	shouldBlock: () => boolean;
	renderer: (options: { continue: Function; block: Function }) => DNode | DNode[];
	routerKey?: string;
}

export class Prompt extends WidgetBase<PromptProperties> {
	private _handle: Handle;

	private _onBeforeUnload = (event: Event) => {
		if (this.properties.shouldBlock()) {
			event.returnValue = true;
		}
	};

	protected render(): DNode | DNode[] {
		const item = this.registry.getInjector<Router>(this.properties.routerKey || 'router');
		if (item) {
			const router = item.injector();
			if (!this._handle) {
				this._handle = router.registerPrompt(this.properties.shouldBlock, () => {
					this.invalidate();
				});
				global.window.addEventListener('beforeunload', this._onBeforeUnload);
				this.own(this._handle);
				this.own({
					destroy: () => {
						global.window.removeEventListener('beforeunload', this._onBeforeUnload);
					}
				});
			}
			if (this.properties.shouldBlock() && router.hasBlockedRoute()) {
				return this.properties.renderer({
					continue: () => router.continueRoute(),
					block: () => router.preventRoute()
				});
			} else {
				router.continueRoute();
			}
		}
	}
}
