import Promise from '@dojo/shim/Promise';
const plugin = {
	load(resourceId: string) {
		return Promise.resolve(resourceId);
	},
	normalize(moduleId: string) {
		return moduleId === 'normalize' ? 'path/to/normalized' : moduleId;
	}
};
export default plugin;
