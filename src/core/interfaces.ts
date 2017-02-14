/* DEPRECATED: These interfaces are deprecated and have been moved to @dojo/interfaces/core.d.ts
 * They are only provided here to make the transistion to @dojo/interfaces easier */

/**
 * A general interface that can be used to renference a general index map of values of a particular type
 */
export interface Hash<T> {
	[ id: string ]: T;
}

/**
 * A base map of styles where each key is the name of the style attribute and the value is a string
 * which represents the style
 */
export interface StylesMap {
	[style: string]: string;
}
