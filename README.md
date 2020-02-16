# node-markov-generator

This simple generator emits short sentences based on the given
text corpus using a [Markov chain](https://en.wikipedia.org/wiki/Markov_chain). 

### Using a what?
To put it simply - it works kinda like word suggestions that you
have while typing messages in your smartphone. It analyzes 
which word is followed by which in the given corpus and how 
often. And then, for any given word it tries to predict what the
next one might be.

## Usage

### Basic usage
```typescript
import * as path from 'path';
import {TextGenerator} from 'simple-text-generator';

// specify path to the text file to be used to "train" the generator
const corpusPath = path.join(__dirname, '../corpus.txt');
const generator = new TextGenerator(corpusPath);

const result = generator.generate();

// result is a string[]
if (result) {
    console.log(result.join(' '));
} else {
    console.log('Oops!');
}
```

Here you have the `TextGenerator.generate()` method which returns a `string[]`
as a result or `null` in case it was unable to generate a sentence. 

You might want to `join` elements of the resulting array or use any
transformation you need.

### Options
`TextGenerator.generate()` accepts `options` parameter that you might use
to control the process.
You can use the following optional parameters:

1. `tokenToStart` - which word should be used to start the generation process.
If unspecified, a random word is used; 
2. `minWordCount` - minimum number of words that is supposed to be in 
the generated sentence. Default is `7`;
3. `maxWordCount` - maximum number of words that is supposed to be in
the generated sentence. Default is `20`;
4. `retryCount` - since the generation process is rather probabilistic,
sometimes the generator might not be able to get a result on the first try,
so it may need some more attempts. Default is `100`;
5. `contextUsageDegree` - a number from `0` to `1` To avoid diving into details, this
parameter defines the degree of similarity between the generated sentences and
the sentences in the source text corpus. The less the number is, the more nonsence
sentences you get. Default is `0.5`.

In case you want to specify any of these parameters, do it like this:
```typescript
const result = generator.generate({
    tokenToStart: 'word',
    minWordCount: 5,
    contextUsageDegree: 0.75
});
```
