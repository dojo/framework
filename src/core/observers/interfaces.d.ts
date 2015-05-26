import { Handle } from '../interfaces';

export interface Observer extends Handle {
	observeProperty(...property: string[]): void;
	removeProperty(...property: string[]): void;
    nextTurn?: boolean;
    onlyReportObserved?: boolean;
}

export interface PropertyEvent {
	target: {};
	name: string;
}
