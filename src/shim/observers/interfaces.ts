import core = require('../interfaces');

export interface ObjectObserver extends core.Handle {
	observeProperty(...property: string[]): void;
    nextTurn?: boolean;
    onlyReportObserved: boolean;
}

export interface PropertyEvent {
	target: {};
	name: string;
}
