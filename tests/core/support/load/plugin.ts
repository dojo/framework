import Promise from '@dojo/shim/Promise';

export function load(resourceId: string) {
	return Promise.resolve(resourceId);
}
