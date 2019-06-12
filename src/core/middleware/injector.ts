import { create, getRegistry, invalidator, destroy } from '../vdom';
import { RegistryLabel } from '../interfaces';
import { Handle } from '../Destroyable';

const injectorFactory = create({ getRegistry, invalidator, destroy });

export const injector = injectorFactory(({ middleware: { getRegistry, invalidator, destroy } }) => {
	const handles: Handle[] = [];
	destroy(() => {
		let handle: Handle | undefined;
		while ((handle = handles.pop())) {
			handle.destroy();
		}
	});
	const registry = getRegistry();
	return {
		subscribe(label: RegistryLabel, callback: Function = invalidator) {
			if (registry) {
				const item = registry.getInjector(label);
				if (item) {
					const handle = item.invalidator.on('invalidate', () => {
						callback();
					});
					handles.push(handle);
					return () => {
						const index = handles.indexOf(handle);
						if (index !== -1) {
							handles.splice(index, 1);
							handle.destroy();
						}
					};
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
