import alwaysRender from './decorators/alwaysRender';
import WidgetBase from './WidgetBase';
import { DNode } from './interfaces';
import diffProperty from './decorators/diffProperty';
import has from '../has/has';

export interface ProviderProperties<I> {
	registryLabel: string;
	renderer(injector: I): DNode | DNode[];
}

@alwaysRender()
export class Provider<I = any> extends WidgetBase<ProviderProperties<I>> {
	private _injector: I | undefined;
	private _injectorHandle: any;

	@diffProperty('registryLabel')
	diffLabelChange(oldProps: ProviderProperties<I>, newProps: ProviderProperties<I>) {
		const { registryLabel } = newProps;
		const item = this.registry.getInjector<I>(registryLabel);
		if (item) {
			const { injector, invalidator } = item;
			if (this._injectorHandle) {
				this._injectorHandle.destroy();
			}
			this._injectorHandle = invalidator.on('invalidate', () => {
				this.invalidate();
			});
			this.own(this._injectorHandle);
			this._injector = injector();
		}
	}

	protected render(): DNode | DNode[] {
		const { renderer, registryLabel } = this.properties;
		if (this._injector) {
			return renderer(this._injector);
		}
		has('dojo-debug') && console.warn(`Injector has not been registered with label: '${registryLabel}'`);
		return null;
	}
}

export default Provider;
