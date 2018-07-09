import Promise from '../../../../src/shim/Promise';

export function load(resourceId: string) {
	return Promise.resolve(resourceId);
}
