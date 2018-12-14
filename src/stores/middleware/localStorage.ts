import global from '../../shim/global';
import { ProcessError, ProcessResult, ProcessCallback, processExecutor } from '../process';
import { Store } from '../Store';
import { GetPaths } from '../StoreProvider';
import { add } from '../state/operations';

export function collector<T = any>(id: string, getPaths: GetPaths<T>): ProcessCallback {
	return () => ({
		after: (error: ProcessError | null, result: ProcessResult): void => {
			const paths = getPaths(result.store.path);
			const data = paths.map((path) => {
				const state = result.get(path);
				return { meta: { path: path.path }, state };
			});
			global.localStorage.setItem(id, JSON.stringify(data));
		}
	});
}

export function load<T>(id: string, store: Store<T>) {
	let data = global.localStorage.getItem(id);
	if (data) {
		try {
			const parsedData: any[] = JSON.parse(data);
			const operations = parsedData.map((item) => {
				return add(store.path(item.meta.path), item.state);
			});
			processExecutor('local-storage-load', [() => operations], store, undefined, undefined, undefined)({});
		} catch {
			// do nothing?
		}
	}
}
