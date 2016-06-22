/**
 * Determines whether two values are the same value.
 *
 * @param value1 The first value to compare
 * @param value2 The second value to compare
 * @return true if the values are the same; false otherwise
 */
export const is: (value1: any, value2: any) => boolean = (<any> Object).is;

/**
 * Returns an array of own properties who key is a symbol
 *
 * @param o The object to return the properties for
 */
export const getOwnPropertySymbols: (o: any) => symbol[] = (<any> Object).getOwnPropertySymbols;

/**
 * Returns an array of own properties who key is a string
 *
 * @param o The object to return the properties for
 */
/* intentionally detecting `getOwnPropertySymbols` because we should should provide the shim
 * when there is no support for symbols */
export const getOwnPropertyNames: (o: any) => string[] = Object.getOwnPropertyNames;
