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
import {TextGenerator} from 'node-markov-generator';

/* array of your strings which will be used to "train" the generator */
const corpus = ['This is my text.', 'Markov chains are great', 'Yet another string! This is just awesome.'];
const generator = new TextGenerator(corpus);

const result = generator.generateSentence();
console.log(result);
```

Here you create an instance of `TextGenerator` passing an array of strings to it - 
it represents your text corpus which will be used to "train" the generator. The more strings/sentences
you pass, the more diverse results you get, so you would better pass like hundreds of them - or even more!

`TextGenerator.generateSentence()` returns a `string` or `null` in case it was unable to generate a sentence.

### Reading the text corpus from an external file
If you have your texts in an external file, you can pass the path to it as an argument for
 `TextGenerator`'s constructor like this:
```typescript
import * as path from 'path';
import {TextGenerator} from 'node-markov-generator';

// in this example my texts are located in corpus.txt
const corpusPath = path.join(__dirname, 'corpus.txt');
const generator = new TextGenerator(corpusPath);
```

### Getting result as a raw array of strings
If you do not need your result to look like a sentence (i.e. a string starting with a capital and ending with a '.'),
consider using `TextGenerator.generate()` method instead of `generateSentence()`. It returns
the result sentence as an array of words - or `null` if the generation process failed.

Then you might want to `join` the items or apply any other transformation you like. 

### Options
Both `TextGenerator.generateSentence()` and `TextGenerator.generate()` methods accept `options`
parameter that you might use to control the generation process.
You can use the following optional parameters:

1. `wordToStart` - which word should be used to start the Markov chain - and therefore 
the result sentence. If unspecified, a random word is used; 
2. `minWordCount` - minimum number of words that are supposed to be in 
the generated sentence. Default is `7`;
3. `maxWordCount` - maximum number of words that are supposed to be in
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
const result = generator.generateSentence({
    wordToStart: 'word',
    minWordCount: 5,
    contextUsageDegree: 0.75
});
```

## Credits
[regexpu](https://github.com/mathiasbynens/regexpu) is used for transpiling 
regular expressions with [unicode property escapes](https://github.com/tc39/proposal-regexp-unicode-property-escapes) 
into good old and nodejs8-compatible ES5 format.