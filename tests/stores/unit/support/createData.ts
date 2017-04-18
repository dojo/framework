import Patch, { diff } from '../../../src/patch/Patch';

export interface ItemType {
	id: string;
	value: number;
	nestedProperty: { value: number };
}

export function createData(): ItemType[] {
	return [
		{
			id: 'item-1',
			value: 1,
			nestedProperty: { value: 3 }
		},
		{
			id: 'item-2',
			value: 2,
			nestedProperty: { value: 2 }
		},
		{
			id: 'item-3',
			value: 3,
			nestedProperty: { value: 1 }
		}
	];
}

export function createUpdates(): ItemType[][] {
	return [
		createData().map(({ id, value, nestedProperty: { value: nestedValue } }) => ({
			id: id,
			value: value + 1,
			nestedProperty: {
				value: nestedValue
			}
		})),
		createData().map(({ id, value, nestedProperty: { value: nestedValue } }) => ({
			id: id,
			value: value + 1,
			nestedProperty: {
				value: nestedValue + 1
			}
		}))
	];
}
export const patches: { id: string; patch: Patch<ItemType, ItemType> }[] =
	createData().map(({ id, value, nestedProperty: { value: nestedValue } }, index) => ({
		id: id,
		patch: diff<ItemType, ItemType>({
			id: id,
			value: value + 2,
			nestedProperty: {
				value: nestedValue + 2
			}
		}, createData()[index])
	}));

export const patchedItems: ItemType[] = createData().map(({ id, value, nestedProperty: { value: nestedValue } }) => ({
	id,
	value: value + 2,
	nestedProperty: {
		value: nestedValue + 2
	}
}));
