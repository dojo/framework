import { BaseEventedEvents, Evented } from '@dojo/core/Evented';
import { EventedListenerOrArray } from '@dojo/interfaces/bases';
import { Handle } from '@dojo/interfaces/core';
import { History, HistoryChangeEvent } from './interfaces';

export interface HistoryEvents extends BaseEventedEvents {
	(type: 'change', listener: EventedListenerOrArray<History, HistoryChangeEvent>): Handle;
}

export class HistoryBase extends Evented {
	on: HistoryEvents;

	public normalizePath(path: string): string {
		return path;
	}
}

export default HistoryBase;
