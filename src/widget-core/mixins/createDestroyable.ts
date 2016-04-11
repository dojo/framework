import compose, { ComposeFactory } from 'dojo-compose/compose';
import Promise from 'dojo-core/Promise';
import { Handle } from 'dojo-core/interfaces';
import WeakMap from 'dojo-core/WeakMap';

const handlesWeakMap = new WeakMap<Destroyable, Handle[]>();

const noop = function() { return Promise.resolve(false); };
const destroyed = function() {
	throw new Error('Call made to destroyed method');
};

export interface Destroyable {
	/**
	 * Take a handle and "own" it, which ensures that its destroy
	 * method is called when the owning object's destroy method is
	 * called.
	 * @param handle The handle to own
	 */
	own(handle: Handle): Handle;

	/**
	 * Invoke destroy() on any owned handles
	 */
	destroy(): Promise<boolean>;
}

export function isDestroyable(value: any): value is Destroyable {
	return value && 'destroy' in value && typeof value.destroy === 'function';
}

const createDestroyable: ComposeFactory<Destroyable, any> = compose({
	own(handle: Handle): Handle {
		const handles = handlesWeakMap.get(this);
		handles.push(handle);
		return {
			destroy() {
				handles.splice(handles.indexOf(handle));
				handle.destroy();
			}
		};
	},
	destroy() {
		return new Promise((resolve) => {
			handlesWeakMap.get(this).forEach((handle) => {
				handle && handle.destroy && handle.destroy();
			});
			handlesWeakMap.delete(this);
			this.destroy = noop;
			this.own = destroyed;
			resolve(true);
		});
	}
}, (instance) => {
	handlesWeakMap.set(instance, []);
});

export default createDestroyable;
