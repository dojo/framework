import { Evented } from '@dojo/core/Evented';
import { HistoryEventMap } from './interfaces';

export class HistoryBase extends Evented<HistoryEventMap> {
	public normalizePath(path: string): string {
		return path;
	}
}

export default HistoryBase;
