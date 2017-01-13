import { Hash } from '@dojo/interfaces/core';

export interface KwArgs {
	dayOfMonth?: number;
	hours?: number;
	milliseconds?: number;
	minutes?: number;
	month: number;
	seconds?: number;
	year: number;
}

export interface OperationKwArgs {
	days?: number;
	hours?: number;
	milliseconds?: number;
	minutes?: number;
	months?: number;
	seconds?: number;
	years?: number;
}

/**
 * The properties of a complete date
 */
export interface DateProperties {
	dayOfMonth: number;
	readonly dayOfWeek: number;
	readonly daysInMonth: number;
	hours: number;
	readonly isLeapYear: boolean;
	milliseconds: number;
	minutes: number;
	month: number;
	seconds: number;
	year: number;
}

const days = [ NaN, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

const isLeapYear = (function () {
	const date = new Date();
	function isLeapYear(year: number): boolean {
		date.setFullYear(year, 1, 29);
		return date.getDate() === 29;
	}
	return isLeapYear;
})();

const operationOrder = [ 'years', 'months', 'days', 'hours', 'minutes', 'seconds', 'milliseconds' ];
const operationHash: Hash<string> = Object.create(null, {
	days: { value: 'Date' },
	hours: { value: 'UTCHours' },
	milliseconds: { value: 'UTCMilliseconds' },
	minutes: { value: 'UTCMinutes' },
	months: { value: 'Month' },
	seconds: { value: 'UTCSeconds' },
	years: { value: 'FullYear' }
});

export default class DateObject implements DateProperties {
	static parse(str: string): DateObject {
		return new DateObject(Date.parse(str));
	}

	static now(): DateObject {
		return new DateObject(Date.now());
	}

	private readonly _date: Date;
	readonly utc: DateProperties;

	constructor(value: number);
	constructor(value: string);
	constructor(value: Date);
	constructor(value: KwArgs);
	constructor();
	constructor(value?: any) {
		let _date: Date;
		if (!arguments.length) {
			_date = new Date();
		}
		else if (value instanceof Date) {
			_date = new Date(+value);
		}
		else if (typeof value === 'number' || typeof value === 'string') {
			_date = new Date(<any> value);
		}
		else {
			_date = new Date(
				value.year,
				value.month - 1,
				value.dayOfMonth || 1,
				value.hours || 0,
				value.minutes || 0,
				value.seconds || 0,
				value.milliseconds || 0
			);
		}

		Object.defineProperty(this, '_date', {
			configurable: true,
			enumerable: false,
			value: _date,
			writable: true
		});

		const self = this;
		Object.defineProperty(this, 'utc', {
			value: {
				get isLeapYear(this: DateObject): boolean {
					return isLeapYear(this.year);
				},
				get daysInMonth(this: DateObject): number {
					const month = this.month;

					if (month === 2 && this.isLeapYear) {
						return 29;
					}
					return days[month];
				},

				get year(): number {
					return self._date.getUTCFullYear();
				},
				set year(year: number) {
					self._date.setUTCFullYear(year);
				},

				get month(): number {
					return self._date.getUTCMonth() + 1;
				},
				set month(month: number) {
					self._date.setUTCMonth(month - 1);
				},

				get dayOfMonth(): number {
					return self._date.getUTCDate();
				},
				set dayOfMonth(day: number) {
					self._date.setUTCDate(day);
				},

				get hours(): number {
					return self._date.getUTCHours();
				},
				set hours(hours: number) {
					self._date.setUTCHours(hours);
				},

				get minutes(): number {
					return self._date.getUTCMinutes();
				},
				set minutes(minutes: number) {
					self._date.setUTCMinutes(minutes);
				},

				get seconds(): number {
					return self._date.getUTCSeconds();
				},
				set seconds(seconds: number) {
					self._date.setUTCSeconds(seconds);
				},

				get milliseconds(): number {
					return self._date.getUTCMilliseconds();
				},
				set milliseconds(milliseconds: number) {
					self._date.setUTCMilliseconds(milliseconds);
				},

				get dayOfWeek(): number {
					return self._date.getUTCDay();
				},

				toString: function (): string {
					return self._date.toUTCString();
				}
			},
			enumerable: true
		});
	}

	get isLeapYear(): boolean {
		return isLeapYear(this.year);
	}

	get daysInMonth(): number {
		const month = this.month;

		if (month === 2 && this.isLeapYear) {
			return 29;
		}
		return days[month];
	}

	get year(): number {
		return this._date.getFullYear();
	}
	set year(year: number) {
		const dayOfMonth = this.dayOfMonth;

		this._date.setFullYear(year);

		if (this.dayOfMonth < dayOfMonth) {
			this.dayOfMonth = 0;
		}
	}

	get month(): number {
		return this._date.getMonth() + 1;
	}
	set month(month: number) {
		const dayOfMonth = this.dayOfMonth;

		this._date.setMonth(month - 1);

		if (this.dayOfMonth < dayOfMonth) {
			this.dayOfMonth = 0;
		}
	}

	get dayOfMonth(): number {
		return this._date.getDate();
	}
	set dayOfMonth(day: number) {
		this._date.setDate(day);
	}

	get hours(): number {
		return this._date.getHours();
	}
	set hours(hours: number) {
		this._date.setHours(hours);
	}

	get minutes(): number {
		return this._date.getMinutes();
	}
	set minutes(minutes: number) {
		this._date.setMinutes(minutes);
	}

	get seconds(): number {
		return this._date.getSeconds();
	}
	set seconds(seconds: number) {
		this._date.setSeconds(seconds);
	}

	get milliseconds(): number {
		return this._date.getMilliseconds();
	}
	set milliseconds(milliseconds: number) {
		this._date.setMilliseconds(milliseconds);
	}

	get time(): number {
		return this._date.getTime();
	}
	set time(time: number) {
		this._date.setTime(time);
	}

	get dayOfWeek(): number {
		return this._date.getDay();
	}
	get timezoneOffset(): number {
		return this._date.getTimezoneOffset();
	}

	add(value: number): DateObject;
	add(value: OperationKwArgs): DateObject;
	add(value: any): DateObject {
		const result = new DateObject(this.time);

		if (typeof value === 'number') {
			result.time += value;
		}
		else {
			// Properties have to be added in a particular order to properly handle
			// date overshoots in month and year calculations
			operationOrder.forEach((property: string): void => {
				if (!(property in value)) {
					return;
				}

				const dateMethod = operationHash[property];
				(<any> result._date)[`set${dateMethod}`](
					(<any> this._date)[`get${dateMethod}`]() + value[property]
				);

				if ((property === 'years' || property === 'months') &&
					result.dayOfMonth < this.dayOfMonth) {
					// Set the day of the month to 0 to move the date to the first day of the previous
					// month to fix overshoots when adding a month and the date is the 31st or adding
					// a year and the date is the 29th
					result.dayOfMonth = 0;
				}
			});
		}

		return result;
	}

	compare(value: DateObject): number {
		const result = this.time - value.time;
		if (result > 0) {
			return 1;
		}
		if (result < 0) {
			return -1;
		}
		return 0;
	}

	compareDate(value: KwArgs): number {
		const left = new DateObject(this);
		const right = new DateObject(value);

		left._date.setHours(0, 0, 0, 0);
		right._date.setHours(0, 0, 0, 0);

		return left.compare(right);
	}

	compareTime(value: KwArgs): number {
		const left = new DateObject(this);
		const right = new DateObject(value);

		left._date.setFullYear(0, 0, 0);
		right._date.setFullYear(0, 0, 0);

		return left.compare(right);
	}

	toString(): string {
		return this._date.toString();
	}
	toDateString(): string {
		return this._date.toDateString();
	}
	toTimeString(): string {
		return this._date.toTimeString();
	}
	toLocaleString(): string {
		return this._date.toLocaleString();
	}
	toLocaleDateString(): string {
		return this._date.toLocaleDateString();
	}
	toLocaleTimeString(): string {
		return this._date.toLocaleTimeString();
	}
	toISOString(): string {
		return this._date.toISOString();
	}
	toJSON(key?: any): string {
		return this._date.toJSON(key);
	}
	valueOf(): number {
		return this._date.valueOf();
	}
}
