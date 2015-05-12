import { Handle } from './interfaces';
import { queueAnimationTask, QueueItem, queueMicroTask, queueTask } from './queue';

const typeMap: { [key: string]: (callback: (...args: any[]) => any) => Handle; } = {
	animation: queueAnimationTask,
	macro: queueTask,
	micro: queueMicroTask
};

function getQueueHandle(item: QueueItem): Handle {
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

export default class Scheduler {
	protected _boundDispatch: () => void;
	protected _deferred: QueueItem[];
	protected _isProcessing: boolean;
	protected _queue: QueueItem[];
	protected _task: Handle;

	/**
	 * Determines whether any callbacks registered during should be added to the current batch (`false`)
	 * or deferred until the next batch (`true`, default).
	 */
	deferWhileProcessing: boolean;

	/**
	 * Allows users to specify the type of task that should be scheduled.
	 * Accepted values are 'macro' (default), 'micro', and 'animation'.
	 */
	type: string;

	protected _defer(callback: (...args: any[]) => void): Handle {
		const item: QueueItem = {
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

		const queue = this._queue;
		let item: QueueItem;

		while (item = queue.shift()) {
			if (item.isActive) {
				item.callback();
			}
		}

		this._isProcessing = false;

		let deferred: QueueItem[] = this._deferred;
		if (deferred && deferred.length) {
			this._deferred = null;

			let item: QueueItem;
			while (item = deferred.shift()) {
				this._schedule(item);
			}
		}
	}

	protected _schedule(item: QueueItem): void {
		if (!this._task) {
			this._task = typeMap[this.type](this._boundDispatch);
		}

		this._queue.push(item);
	}

	constructor(kwArgs?: Scheduler.KwArgs) {
		this.deferWhileProcessing = (kwArgs && 'deferWhileProcessing' in kwArgs) ? kwArgs.deferWhileProcessing : true;
		this.type = (kwArgs && kwArgs.type && kwArgs.type in typeMap) ? kwArgs.type : 'macro';

		this._boundDispatch = this._dispatch.bind(this);
		this._isProcessing = false;
		this._queue = [];
	}

	schedule(callback: (...args: any[]) => void): Handle {
		if (this._isProcessing && this.deferWhileProcessing) {
			return this._defer(callback);
		}

		const item: QueueItem = {
			isActive: true,
			callback: callback
		};

		this._schedule(item);

		return getQueueHandle(item);
	}
}

module Scheduler {
	export interface KwArgs {
		deferWhileProcessing?: boolean;
		type?: string;
	}
}
