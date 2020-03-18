import * as fs from "fs";
import {TokenCollection} from './tokenCollection';
import {GeneratorOptions} from './generatorOptions';
import {SentenceHelper} from './sentenceHelper';

export class TextGenerator {
	private readonly wordsToStart = new TokenCollection();
	private readonly wordsToFinish = new Set<string>();
	private readonly wordStorage = new Map<string, TokenCollection>();

	constructor(input: string|string[]) {
		let corpus: string[];

		if (Array.isArray(input)) {
			corpus = input; // if input is a string[], it is the corpus itself
		} else {
			// if input is a string, it is a path to the corpus
			const corpusContents = fs.readFileSync(input).toString();
			corpus = corpusContents.split(/\r?\n/); // platform independent split
		}

		const minLastWordLength = 4;

		for (const line of corpus) {
			const sentences = SentenceHelper.splitIntoSentences(line.trim().toLowerCase()).map(s => s.trim())
				.filter(SentenceHelper.areAllCharsValid);

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
			if (result) {
				return result;
			}
		}
		while (retryCount);

		return null;
	}

	public generateSentence(options?: GeneratorOptions): string {
		const generated = this.generate(options);

		if (generated?.length) {
			const [firstWord, ...rest] = generated;
			return [firstWord[0].toUpperCase() + firstWord.substr(1)].concat(rest).join(' ') + '.';
		} else {
			return null;
		}
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
			// TODO: what if no nextWord is generated? gotta think about it
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
