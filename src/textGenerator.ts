import * as fs from "fs";
import * as os from "os";
import {TokenCollection} from './tokenCollection';
import {GeneratorOptions} from './generatorOptions';

export class TextGenerator {
	private readonly isDebug = process.argv.includes('--node-markov-generator-debug');
	private readonly wordsToStart = new TokenCollection();
	private readonly wordsToFinish = new Set<string>();
	private readonly wordStorage = new Map<string, TokenCollection>();

	constructor(corpusPath: string) {
		const corpusContents = fs.readFileSync(corpusPath).toString();
		const corpus = corpusContents.split(os.EOL);

		const allowedSymbolsRegex = /^[\p{L}\d'\- ]+$/u; // TODO: this will only work with nodejs v10
		const sentenceSplitRegex = /:|\?|!|\.|;|,|\(|\)| - | — |"|$/;

		const minLastWordLength = 4;

		for (const line of corpus) {
			const sentences = line.trim().toLowerCase().split(sentenceSplitRegex).map(s => s.trim())
				.filter(t => allowedSymbolsRegex.test(t));

			for (const sentence of sentences) {
				const words = sentence.split(' ');

				if (!words.length) {
					continue;
				}

				this.wordsToStart.add(words[0]);

				const lastWord = words[words.length - 1];
				// won't consider words that are too short as terminal words
				if (lastWord.length >= minLastWordLength) {
					this.wordsToFinish.add(lastWord);
				}

				for (let i = 0; i < words.length - 1; i++) {
					const currentWord = words[i];
					const nextWord = words[i + 1];

					this.processWords(null, currentWord, nextWord);

					if (i > 0) {
						const previousWord = words[i - 1];
						this.processWords(previousWord, currentWord, nextWord);
					}
				}
			}
		}
	}

	private processWords(prevWord: string, currentWord: string, nextWord: string) {
		const key = prevWord ? TextGenerator.getKeyForMultipleWords(prevWord, currentWord) : currentWord;

		if (this.wordStorage.has(key)) {
			this.wordStorage.get(key).add(nextWord);
		} else {
			this.wordStorage.set(key, new TokenCollection([nextWord]));
		}
	}

	private static getKeyForMultipleWords(...words: string[]): string {
		return words.reduce((cur, next) => cur ? `${cur}|${next}` : next, '');
	}

	public generate(options?: GeneratorOptions): string[] {
		const minWordCount = options?.minWordCount ?? 7;
		const maxWordCount = options?.maxWordCount ?? 20;
		const contextUsageDegree = options?.contextUsageDegree ?? 0.5;
		let retryCount = options?.retryCount ?? 100;

		do {
			const wordToStart = options?.wordToStart?.toLowerCase() ?? this.wordsToStart.getRandom();

			const result = this.generateInternal(wordToStart, minWordCount, maxWordCount, contextUsageDegree);

			retryCount--;
			if (result){
				if (this.isDebug) {
					console.log(result.join(' '));
				} else {
					return result;
				}
			}
		}
		while (retryCount);

		return null;
	}

	private generateInternal(wordToStart: string, minWordCount: number, maxWordCount: number, contextAwarenessDegree: number): string[] {
		const resultWords: string[] = [wordToStart];
		let preLastGeneratedWord: string = null; // TODO: yeah, bad naming :(
		let lastGeneratedWord = wordToStart;

		while (true) {
			const possibleNextWordAwareOfContext = preLastGeneratedWord ? this.wordStorage.get(TextGenerator.getKeyForMultipleWords(preLastGeneratedWord, lastGeneratedWord)) : null;
			const possibleSimpleNextWords = this.wordStorage.get(lastGeneratedWord);

			// if we have a more contextual chain, let's flip a coin to decide whether to use it or not
			const possibleNextWords = possibleNextWordAwareOfContext && (Math.random() < contextAwarenessDegree) ? possibleNextWordAwareOfContext : possibleSimpleNextWords;

			if (!possibleNextWords) {
				if (resultWords.length >= minWordCount) {
					// finished!
					return resultWords;
				} else {
					// could not build a chain which is long enough
					return null;
				}
			}

			const nextWord = possibleNextWords.getRandom();
			// TODO: what is no nextWord is generated? gotta think about it
			if (nextWord) {
				resultWords.push(nextWord);
			}

			if (resultWords.length > minWordCount && this.wordsToFinish.has(nextWord)) {
				return resultWords;
			}

			if (resultWords.length === maxWordCount) {
				return null;
			}

			preLastGeneratedWord = lastGeneratedWord;
			lastGeneratedWord = nextWord;
		}
	}
}
