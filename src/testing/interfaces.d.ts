import {
	WNodeFactory,
	WidgetBaseInterface,
	Constructor,
	OptionalWNodeFactory,
	DefaultChildrenWNodeFactory
} from '../core/interfaces';

export type WidgetFactory = WNodeFactory<any> | OptionalWNodeFactory<any> | DefaultChildrenWNodeFactory<any>;

export type Wrapped<T extends Constructor<WidgetBaseInterface> | WidgetFactory> = T & {
	id: string;
};

export type Ignore<T extends Constructor<WidgetBaseInterface> | WidgetFactory> = T & {
	isIgnore: boolean;
};

export interface CompareFunc<T> {
	(actual: T): boolean;
	type: 'compare';
}

export type Comparable<T> = { [P in keyof T]: T[P] | CompareFunc<T[P]> };

export type NonComparable<T> = { [P in keyof T]: Exclude<T[P], CompareFunc<any>> };
