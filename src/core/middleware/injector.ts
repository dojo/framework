import { create, getRegistry, invalidator } from '../vdom';
import { RegistryLabel } from '../interfaces';

const injectorFactory = create({ getRegistry, invalidator });

export const injector = injectorFactory(({ middleware: { getRegistry, invalidator } }) => {
	const registry = getRegistry();
	return {
		subscribe(label: RegistryLabel, callback: Function = invalidator) {
			if (registry) {
				const item = registry.getInjector(label);
				if (item) {
					item.invalidator.on('invalidate', () => {
						callback();
					});
				}
			}
		},
		get<T>(label: RegistryLabel): T | null {
			if (registry) {
				const item = registry.getInjector<T>(label);
				if (item) {
					return item.injector();
				}
			}
			return null;
		}
	};
});

export default injector;
