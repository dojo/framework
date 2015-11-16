# array

## `copyWithin` - Copies a sequence of elements to another position in the given array
```ts
import { copyWithin } from 'src/array';

var array = [ 0, 1, 2, 3 ];

var offSet = 1; // the index where it should begin copying to
var start = 0; // the index where it should begin copying from
var end = 3; // the index where it should end copying from

copyWithin(array, offSet, start, end);

array[0] === 0; // true
array[1] === 0; // true
array[2] === 1; // true
array[3] === 2; // true
```

## `from` - Creates an `Array` from an array-like object or a string. Array-like
object being an object that has a length property and is indexible through `[]`.

```ts
import { from } from 'src/array';

var nodeList = document.getElementsByTagName('a');

var array = from(nodeList);

array instanceof Array // true
```
## `fill` - Fills some or all elements of an array with a given value
```ts
import { fill } from 'src/array';

var array = [0, 1, 2, 3];

var start = 1; // the starting index to fill
var end = 4; // the ending index (exclusive) to stop filling

fill(array, 4, start, end);

array[0] === 0; // true
array[1] === 4; // true
array[2] === 4; // true
array[3] === 4; // true

```
## `find` - Returns the first value in the array satisfying a given function
```ts
import { find } from 'src/array';

var array = [5, 10, 8, 1];

var result = find(array, (elm, index, array) => {
	return elm % 2 === 0;
});

result === 10; // true

```
## `findIndex` - Returns the first index in the array whose value satisfies a given function
```ts
import { findIndex } from 'src/array';

var array = [5, 10, 8, 1];

var result = findIndex(array, (elm, index, array) => {
	return elm % 2 === 0;
});

result === 1; // true

```
## `of` - Creates an `Array` with the given arguments as its elements
```ts
import { of } from 'src/array';

var array = of(0, 1, 2, 3);

array instanceof Array; // true
array[0] === 0; // true
array[1] === 1; // true
array[2] === 2; // true
array[3] === 3; // true

```
