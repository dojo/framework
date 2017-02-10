import { Handle } from '@dojo/interfaces/core';
import Promise from '@dojo/shim/Promise';

/**
 * No operation function to replace own once instance is destoryed
 */
function noop(): Promise<boolean> {
	return Promise.resolve(false);
};

/**
 * No op function used to replace own, once instance has been destoryed
 */
function destroyed(): never {
	throw new Error('Call made to destroyed method');
};

export class Destroyable {
	/**
	 * register handles for the instance
	 */
	private handles: Handle[];

	/**
	 * @constructor
	 */
	constructor() {
		this.handles = [];
	}

	/**
	 * Register handles for the instance that will be destroyed when `this.destroy` is called
	 *
	 * @param {Handle} handle The handle to add for the instance
	 * @returns {Handle} a handle for the handle, removes the handle for the instance and calls destroy
	 */
	own(handle: Handle): Handle {
		const { handles } = this;
		handles.push(handle);
		return {
			destroy() {
				handles.splice(handles.indexOf(handle));
				handle.destroy();
			}
		};
	}

	/**
	 * Destrpys all handers registered for the instance
	 *
	 * @returns {Promise<any} a promise that resolves once all handles have been destroyed
	 */
	destroy(): Promise<any> {
		return new Promise((resolve) => {
			this.handles.forEach((handle) => {
				handle && handle.destroy && handle.destroy();
			});
			this.destroy = noop;
			this.own = destroyed;
			resolve(true);
		});
	}
}

export default Destroyable;
