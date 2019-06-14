import { destroy, invalidator, create } from '../vdom';
import injector from '../middleware/injector';
import Store, { StatePaths, Path } from '../../stores/Store';
import { Process } from '../../stores/process';

const factory = create({ destroy, invalidator, injector });

export const createStoreMiddleware = <S = any>(initial?: (store: Store<S>) => void) => {
	let store = new Store<S>();
	let initialized = false;
	initial && initial(store);
	const storeMiddleware = factory(({ middleware: { destroy, invalidator, injector } }) => {
		const handles: any[] = [];
		destroy(() => {
			let handle: any;
			while ((handle = handles.pop())) {
				handle();
			}
		});
		if (!initialized) {
			const injectedStore = injector.get<Store<S>>('state');
			if (injectedStore) {
				store = injectedStore;
			}
			initialized = true;
		}
		const registeredPaths: string[] = [];
		const path: StatePaths<S> = (path: any, ...segments: any) => {
			return (store as any).path(path, ...segments);
		};
		return {
			get<U = any>(path: Path<S, U>): U {
				if (registeredPaths.indexOf(path.path) === -1) {
					const handle = store.onChange(path, () => {
						invalidator();
					});
					handles.push(() => handle.remove());
					registeredPaths.push(path.path);
				}
				return store.get(path);
			},
			path,
			at<U = any>(path: Path<S, U[]>, index: number) {
				return store.at(path, index);
			},
			executor<T extends Process<any, any>>(process: T): ReturnType<T> {
				return process(store) as any;
			}
		};
	});
	return storeMiddleware;
};

export default createStoreMiddleware;
