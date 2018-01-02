import { Handle } from './interfaces';

/**
 * An entry in a MatchRegistry. Each Entry contains a test to determine whether the Entry is applicable, and a value for
 * the entry.
 */
interface Entry<T> {
	readonly test: Test | null;
	readonly value: T | null;
}

/**
 * A registry of values tagged with matchers.
 */
export default class MatchRegistry<T> {
	protected _defaultValue: T | undefined;
	private readonly _entries: Entry<T>[] | null;

	/**
	 * Construct a new MatchRegistry, optionally containing a given default value.
	 */
	constructor(defaultValue?: T) {
		this._defaultValue = defaultValue;
		this._entries = [];
	}

	/**
	 * Return the first entry in this registry that matches the given arguments. If no entry matches and the registry
	 * was created with a default value, that value will be returned. Otherwise, an exception is thrown.
	 *
	 * @param ...args Arguments that will be used to select a matching value.
	 * @returns the matching value, or a default value if one exists.
	 */
	match(...args: any[]): T {
		const entries = this._entries ? this._entries.slice(0) : [];
		let entry: Entry<T>;

		for (let i = 0; (entry = entries[i]); ++i) {
			if (entry.value && entry.test && entry.test.apply(null, args)) {
				return entry.value;
			}
		}

		if (this._defaultValue !== undefined) {
			return this._defaultValue;
		}

		throw new Error('No match found');
	}

	/**
	 * Register a test + value pair with this registry.
	 *
	 * @param test The test that will be used to determine if the registered value matches a set of arguments.
	 * @param value A value being registered.
	 * @param first If true, the newly registered test and value will be the first entry in the registry.
	 */
	register(test: Test | null, value: T | null, first?: boolean): Handle {
		let entries = this._entries;
		let entry: Entry<T> | null = {
			test: test,
			value: value
		};

		(<any>entries)[first ? 'unshift' : 'push'](entry);

		return {
			destroy: function(this: Handle) {
				this.destroy = function(): void {};
				let i = 0;
				if (entries && entry) {
					while ((i = entries.indexOf(entry, i)) > -1) {
						entries.splice(i, 1);
					}
				}
				test = value = entries = entry = null;
			}
		};
	}
}

/**
 * The interface that a test function must implement.
 */
export interface Test {
	(...args: any[]): boolean | null;
}
