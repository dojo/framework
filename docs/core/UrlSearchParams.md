# UrlSearchParams

## Creating a Url Search Params Object

### With search params string

```
import { UrlSearchParams } from 'src/UrlSearchParams';

const searchParams = new UrlSearchParams('a=b&b=c&c=a');
```

### With object of search params

```
import { UrlSearchParams } from 'src/UrlSearchParams';

const searchParams = new UrlSearchParams({
	a: 'b',
	b: 'c',
	c: 'a'
});
```

## Instance methods

### append - Adds the value to the values that are associated with the key

```
import { UrlSearchParams } from 'src/UrlSearchParams';

const searchParams = new UrlSearchParams('a=b&b=c&c=a');

const key = 'a';
const value = 'e';

searchParams.append(key, value);
```

### delete - removes the key from the search params

```
import { UrlSearchParams } from 'src/UrlSearchParams';

const searchParams = new UrlSearchParams('a=b&b=c&c=a');

const key = 'a';

searchParams.delete(key);
```

### get - retrieves the first value for the key provided

```
import { UrlSearchParams } from 'src/UrlSearchParams';

const searchParams = new UrlSearchParams('a=first&a=second');

const key = 'a';

const result = searchParams.get(key);

result === 'first'; // true
```

### getAll - retrieves all the values for the key provided

```
import { UrlSearchParams } from 'src/UrlSearchParams';

const searchParams = new UrlSearchParams('a=first&a=second');

const key = 'a';

const result = searchParams.getAll(key);

result[0] === 'first'; // true
result[1] === 'second'; // true
```

### has - returns true if the key exists within the search params and false if it is not

```
import { UrlSearchParams } from 'src/UrlSearchParams';

const searchParams = new UrlSearchParams('a=b&b=c&c=a');

const key = 'd';

const result = searchParams.has(key);

result === false; // true
```

### keys - returns an array of the keys of the search params

```
import { UrlSearchParams } from 'src/UrlSearchParams';

const searchParams = new UrlSearchParams('a=b&b=c&c=a');

const result = searchParams.keys();

result instanceof Array; // true
result[0] === 'a'; // true
result[1] === 'b'; // true
result[2] === 'b'; // true
```

### set - sets the value of a key (clears previous values)

```
import { UrlSearchParams } from 'src/UrlSearchParams';

const searchParams = new UrlSearchParams('a=b&b=c&c=a');

const key = 'a';
const value = 'e';

searchParams.set(key, value);
```

### toString - return a string of the search params

```
import { UrlSearchParams } from 'src/UrlSearchParams';

const searchParams = new UrlSearchParams('a=b&b=c&c=a');

const result = searchParams.toString();

result === 'a=b&b=c&c=a'; // true
```
