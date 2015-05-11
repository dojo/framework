import { Handle } from './interfaces';
import { QueueItem, queueTask, queueDomTask, queueMicroTask } from './queue';

let typeMap: { [key: string]: (callback: (...args: any[]) => any) => Handle; } = {
	'macro': queueTask,
	'micro': queueMicroTask,
	'dom': queueDomTask
};

function getQueueHandle(item: Item): Handle {
	return {
		destroy: function () {
			this.destroy = function () {};
			item.isActive = false;
			item.callback = null;
		}
	};
}

export interface KwArgs {
	deferWhileProcessing?: boolean;
	type?: string;
}

export interface Item extends QueueItem {
	id?: string;
}

export default class Scheduler {
	/**
	 * Determines whether any callbacks registered during should be added to the current batch (`false`)
	 * or deferred until the next batch (`true`, default). If this is set to `false`, then any IDs passed
	 * to callbacks registered by other callbacks in the batch will be ignored.
	 */
	deferWhileProcessing: boolean;

	/**
	 * Allows users to specify the type of task that should be scheduled.
	 * Accepted values are 'macro' (default), 'micro', and 'dom'.
	 */
	type: string;

	protected _boundDispatch: () => void;
	protected _deferred: Item[];
	protected _idMap: { [key: string]: number };
	protected _isProcessing: boolean;
	protected _queue: Item[];
	protected _task: Handle;

	constructor(kwArgs?: KwArgs) {
		this.deferWhileProcessing = (kwArgs && 'deferWhileProcessing' in kwArgs) ? kwArgs.deferWhileProcessing : true;
		this.type = (kwArgs && kwArgs.type && kwArgs.type in typeMap) ? kwArgs.type : 'macro';

		this._boundDispatch = this._dispatch.bind(this);
		this._isProcessing = false;
		this._queue = [];
	}

	schedule(callback: (...args: any[]) => void, id?: string): Handle {
		if (this._isProcessing && this.deferWhileProcessing) {
			return this._defer(callback, id);
		}

		let item: Item = {
			id: id,
			isActive: true,
			callback: callback
		};

		this._schedule(item);

		return getQueueHandle(item);
	}

	protected _defer(callback: (...args: any[]) => void, id?: string): Handle {
		let item: Item = {
			id: id,
			isActive: true,
			callback: callback
		};

		if (!this._deferred) {
			this._deferred = [];
		}

		this._deferred.push(item);

		return getQueueHandle(item);
	}

	protected _dispatch(): void {
		this._isProcessing = true;
		this._task.destroy();
		this._task = null;
		this._idMap = null;

		let queue = this._queue;
		let item: Item;

		while (item = queue.shift()) {
			if (item.isActive) {
				item.callback();
			}
		}

		this._isProcessing = false;

		let deferred: Item[] = this._deferred;
		if (deferred && deferred.length) {
			this._deferred = null;

			let item: Item;
			while (item = deferred.shift()) {
				this._schedule(item);
			}
		}
	}

	protected _schedule(item: Item): void {
		let queue = this._queue;
		let idMap = this._idMap;
		let id: string = item.id;

		if (!this._task) {
			this._task = typeMap[this.type](this._boundDispatch);
		}

		// Specifying an ID only makes sense when the queue is still being built. Once the loop
		// has begun execution, anything that might normally be replaced will have already been executed.
		if (id && !this._isProcessing) {
			if (!idMap) {
				idMap = this._idMap = {};
			}

			if (id in idMap) {
				queue.splice(idMap[id], 1);
			}
		}

		queue.push(item);

		if (id && !this._isProcessing) {
			idMap[id] = queue.length - 1;
		}
	}
}
