import { Handle } from './interfaces';
import { QueueItem, queueTask } from './queue';

function getQueueHandle(item: QueueItem): Handle {
	return {
		destroy: function(this: Handle) {
			this.destroy = function() {};
			item.isActive = false;
			item.callback = null;
		}
	};
}

export interface KwArgs {
	deferWhileProcessing?: boolean;
	queueFunction?: (callback: (...args: any[]) => any) => Handle;
}

export default class Scheduler {
	protected readonly _boundDispatch: () => void;
	protected _deferred: QueueItem[] | null;
	protected _isProcessing: boolean;
	protected readonly _queue: QueueItem[];
	protected _task: Handle | null;

	/**
	 * Determines whether any callbacks registered during should be added to the current batch (`false`)
	 * or deferred until the next batch (`true`, default).
	 */
	deferWhileProcessing: boolean | undefined;

	/**
	 * Allows users to specify the function that should be used to schedule callbacks.
	 * If no function is provided, then `queueTask` will be used.
	 */
	queueFunction: (callback: (...args: any[]) => any) => Handle;

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
		if (this._task) {
			this._task.destroy();
			this._task = null;
		}

		const queue = this._queue;
		let item: QueueItem | undefined;

		while ((item = queue.shift())) {
			if (item.isActive && item.callback) {
				item.callback();
			}
		}

		this._isProcessing = false;

		let deferred: QueueItem[] | null = this._deferred;
		if (deferred && deferred.length) {
			this._deferred = null;

			let item: QueueItem | undefined;
			while ((item = deferred.shift())) {
				this._schedule(item);
			}
		}
	}

	protected _schedule(item: QueueItem): void {
		if (!this._task) {
			this._task = this.queueFunction(this._boundDispatch);
		}

		this._queue.push(item);
	}

	constructor(kwArgs?: KwArgs) {
		this.deferWhileProcessing = kwArgs && 'deferWhileProcessing' in kwArgs ? kwArgs.deferWhileProcessing : true;
		this.queueFunction = kwArgs && kwArgs.queueFunction ? kwArgs.queueFunction : queueTask;

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
