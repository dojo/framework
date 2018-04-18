import { Map } from '@dojo/shim/Map';
import { Evented } from '@dojo/core/Evented';
import { EventObject } from '@dojo/core/interfaces';
import { Constructor, InjectorFactory, InjectorItem, RegistryLabel, WidgetBaseInterface } from './interfaces';
import { Registry, RegistryEventObject, RegistryItem } from './Registry';

export type RegistryHandlerEventMap = {
	invalidate: EventObject<'invalidate'>;
};

export class RegistryHandler extends Evented<RegistryHandlerEventMap> {
	private _registry = new Registry();
	private _registryWidgetLabelMap: Map<Registry, RegistryLabel[]> = new Map();
	private _registryInjectorLabelMap: Map<Registry, RegistryLabel[]> = new Map();
	protected baseRegistry?: Registry;

	constructor() {
		super();
		this.own(this._registry);
		const destroy = () => {
			if (this.baseRegistry) {
				this._registryWidgetLabelMap.delete(this.baseRegistry);
				this._registryInjectorLabelMap.delete(this.baseRegistry);
				this.baseRegistry = undefined;
			}
		};
		this.own({ destroy });
	}

	public set base(baseRegistry: Registry) {
		if (this.baseRegistry) {
			this._registryWidgetLabelMap.delete(this.baseRegistry);
			this._registryInjectorLabelMap.delete(this.baseRegistry);
		}
		this.baseRegistry = baseRegistry;
	}

	public define(label: RegistryLabel, widget: RegistryItem): void {
		this._registry.define(label, widget);
	}

	public defineInjector(label: RegistryLabel, injector: InjectorFactory): void {
		this._registry.defineInjector(label, injector);
	}

	public has(label: RegistryLabel): boolean {
		return this._registry.has(label) || Boolean(this.baseRegistry && this.baseRegistry.has(label));
	}

	public hasInjector(label: RegistryLabel): boolean {
		return this._registry.hasInjector(label) || Boolean(this.baseRegistry && this.baseRegistry.hasInjector(label));
	}

	public get<T extends WidgetBaseInterface = WidgetBaseInterface>(
		label: RegistryLabel,
		globalPrecedence: boolean = false
	): Constructor<T> | null {
		return this._get(label, globalPrecedence, 'get', this._registryWidgetLabelMap);
	}

	public getInjector<T>(label: RegistryLabel, globalPrecedence: boolean = false): InjectorItem<T> | null {
		return this._get(label, globalPrecedence, 'getInjector', this._registryInjectorLabelMap);
	}

	private _get(
		label: RegistryLabel,
		globalPrecedence: boolean,
		getFunctionName: 'getInjector' | 'get',
		labelMap: Map<Registry, RegistryLabel[]>
	): any {
		const registries = globalPrecedence ? [this.baseRegistry, this._registry] : [this._registry, this.baseRegistry];
		for (let i = 0; i < registries.length; i++) {
			const registry: any = registries[i];
			if (!registry) {
				continue;
			}
			const item = registry[getFunctionName](label);
			const registeredLabels = labelMap.get(registry) || [];
			if (item) {
				return item;
			} else if (registeredLabels.indexOf(label) === -1) {
				const handle = registry.on(label, (event: RegistryEventObject) => {
					if (
						event.action === 'loaded' &&
						(this as any)[getFunctionName](label, globalPrecedence) === event.item
					) {
						this.emit({ type: 'invalidate' });
					}
				});
				this.own(handle);
				labelMap.set(registry, [...registeredLabels, label]);
			}
		}
		return null;
	}
}

export default RegistryHandler;
