# Map

An implementation analogous to the Map specification in ES2015,
with the exception of iterators.  The entries, keys, and values methods
are omitted, since forEach essentially provides the same functionality.

## Creation

### Empty Map

```ts
import { Map } from 'src/Map';

var map = new Map();

```

### With Initial Values

```ts
import { Map } from 'src/Map';

var map = new Map([
	['age', 2],
	['height', 1.5]
]);

```

## Adding a key/value pair

```ts
import { Map } from 'src/Map';

var map = new Map([
	['age', 2],
	['height', 1.5]
]);

var key = 'weight';
var value = 14;

map.set(key, value);

```

## Getting the amount of key/value pairs

```ts
import { Map } from 'src/Map';

var map = new Map([
	['age', 2],
	['height', 1.5]
]);

map.size() === 2; // true

```

## Clearing the key/value pairs

```ts
import { Map } from 'src/Map';

var map = new Map([
	['age', 2],
	['height', 1.5]
]);

map.clear();

map.size() === 0; // true

```

## Deleting a pair

```ts
import { Map } from 'src/Map';

var map = new Map([
	['age', 2],
	['height', 1.5]
]);

var key = 'age';

map.delete(key);

map.size() === 1; // true

```

## Loop over the key/value pairs

```ts
import { Map } from 'src/Map';

var map = new Map([
	['age', 2],
	['height', 1.5]
]);

map.forEach((value, key, map) -> {
	console.log('key: ' + key + ' value: ' + value);
});
```

## Retrieving a value

```ts
import { Map } from 'src/Map';

var map = new Map([
	['age', 2],
	['height', 1.5]
]);

var key = 'age';

map.get(key) === 2; // true

```

## Determine whether the map has a key

```ts
import { Map } from 'src/Map';

var map = new Map([
	['age', 2],
	['height', 1.5]
]);

map.has('age'); // true
map.has('weight'); // false

```
