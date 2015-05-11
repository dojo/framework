import core = require('../interfaces');

export interface Observer extends core.Handle {
	observeProperty(...property: string[]): void;
	removeProperty(...property: string[]): void;
    nextTurn?: boolean;
    onlyReportObserved?: boolean;
}

export interface PropertyEvent {
	target: {};
	name: string;
}
