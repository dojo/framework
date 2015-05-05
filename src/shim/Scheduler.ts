import { Handle } from './interfaces';
import { QueueItem, queueTask } from './queue';

function getQueueHandle(item: Scheduler.Item): Handle {
	return {
		destroy: function () {
			this.destroy = function () {};
			item.isActive = false;
			item.callback = null;
		}
	};
}

export default class Scheduler {
	deferWhileProcessing: boolean;

	protected _boundDispatch: () => void;
	protected _deferred: Scheduler.Item[];
	protected _idMap: { [key: string]: number };
	protected _isProcessing: boolean;
	protected _queue: Scheduler.Item[];
	protected _task: Handle;

	constructor(kwArgs?: Scheduler.KwArgs) {
		this.deferWhileProcessing = (kwArgs && 'deferWhileProcessing' in kwArgs) ? kwArgs.deferWhileProcessing : true;

		this._boundDispatch = this._dispatch.bind(this);
		this._isProcessing = false;
		this._queue = [];
	}

	schedule(callback: (...args: any[]) => void, id?: string): Handle {
		if (this._isProcessing && this.deferWhileProcessing) {
			return this._defer(callback, id);
		}

		let item: Scheduler.Item = {
			id: id,
			isActive: true,
			callback: callback
		};

		this._schedule(item);

		return getQueueHandle(item);
	}

	protected _defer(callback: (...args: any[]) => void, id?: string): Handle {
		let item: Scheduler.Item = {
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
		let item: Scheduler.Item;

		while (item = queue.shift()) {
			if (item.isActive) {
				item.callback();
			}
		}

		this._isProcessing = false;

		let deferred: Scheduler.Item[] = this._deferred;
		if (deferred && deferred.length) {
			this._deferred = null;

			let item: Scheduler.Item;
			while (item = deferred.shift()) {
				this._schedule(item);
			}
		}
	}

	protected _schedule(item: Scheduler.Item): void {
		let queue = this._queue;
		let idMap = this._idMap;
		let id: string = item.id;

		if (!this._task) {
			this._task = queueTask(this._boundDispatch);
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

module Scheduler {
	export interface KwArgs {
		deferWhileProcessing: boolean;
	}

	export interface Item extends QueueItem {
		id?: string;
	}
}
