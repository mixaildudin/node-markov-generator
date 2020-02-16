import * as fs from "fs";
import * as os from "os";
import {TokenCollection} from './tokenCollection';
import {GeneratorOptions} from './generatorOptions';

export class TextGenerator {
	private readonly isDebug = process.argv.includes('debug');
	private readonly tokensToStart = new TokenCollection();
	private readonly tokensToFinish = new Set<string>();
	private readonly tokenStorage = new Map<string, TokenCollection>();

	constructor(corpusPath: string) {
		const corpusContents = fs.readFileSync(corpusPath).toString();
		const corpus = corpusContents.split(os.EOL);

		const allowedSymbolsRegex = /^[0-9а-яА-ЯёЁ\- ]+$/;
		const sentenceSplitRegex = /:|\?|!|\.|;|,|\(|\)| - | — |$/;

		const minLastTokenLength = 4;

		for (const line of corpus) {
			const sentences = line.trim().toLowerCase().split(sentenceSplitRegex).map(s => s.trim())
				.filter(t => allowedSymbolsRegex.test(t));

			for (const sentence of sentences) {
				const tokens = sentence.split(' ');

				if (!tokens.length) {
					continue;
				}

				this.tokensToStart.add(tokens[0]);

				const lastToken = tokens[tokens.length - 1];
				// не будем делать терминальными совсем уж короткие токены
				if (lastToken.length >= minLastTokenLength) {
					this.tokensToFinish.add(lastToken);
				}

				for (let i = 0; i < tokens.length - 1; i++) {
					const currentToken = tokens[i];
					const nextToken = tokens[i + 1];

					this.processTokens(null, currentToken, nextToken);

					if (i > 0) {
						const previousToken = tokens[i - 1];
						this.processTokens(previousToken, currentToken, nextToken);
					}
				}
			}
		}
	}

	private processTokens(prevToken: string, currentToken: string, nextToken: string) {
		const key = prevToken ? TextGenerator.getKeyForMultipleTokens(prevToken, currentToken) : currentToken;

		if (this.tokenStorage.has(key)) {
			this.tokenStorage.get(key).add(nextToken);
		} else {
			this.tokenStorage.set(key, new TokenCollection([nextToken]));
		}
	}

	private static getKeyForMultipleTokens(...tokens: string[]): string {
		return tokens.reduce((cur, next) => cur ? `${cur}|${next}` : next, '');
	}

	public generate(options?: GeneratorOptions): string[] {
		const minWordCount = options?.minWordCount ?? 7;
		const maxWordCount = options?.maxWordCount ?? 20;
		const contextUsageDegree = options?.contextUsageDegree ?? 0.5;
		let retryCount = options?.retryCount ?? 100;

		do {
			const tokenToStart = options?.tokenToStart?.toLowerCase() ?? this.tokensToStart.getRandom();

			const result = this.generateInternal(tokenToStart, minWordCount, maxWordCount, contextUsageDegree);

			if (result == null){
				retryCount--;
			} else {
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

	private generateInternal(tokenToStart: string, minWordCount: number, maxWordCount: number, contextAwarenessDegree: number): string[] {
		const resultTokens: string[] = [tokenToStart];
		let preLastGeneratedToken: string = null; // TODO: нейминг ужасный. надо подумать. и вообще тут нужно как-то покрасивее сделать :(
		let lastGeneratedToken = tokenToStart;

		while (true) {
			const possibleNextTokenAwareOfContext = preLastGeneratedToken ? this.tokenStorage.get(TextGenerator.getKeyForMultipleTokens(preLastGeneratedToken, lastGeneratedToken)) : null;
			const possibleSimpleNextTokens = this.tokenStorage.get(lastGeneratedToken);

			// если есть "более контекстная" цепочка, то "подкинем монетку", чтобы решить, использовать ее или нет
			const possibleNextTokens = possibleNextTokenAwareOfContext && (Math.random() < contextAwarenessDegree) ? possibleNextTokenAwareOfContext : possibleSimpleNextTokens;

			if (!possibleNextTokens) {
				if (resultTokens.length > minWordCount) {
					// закончили!
					return resultTokens;
				} else {
					// не смогли построить достаточно длинную цепочку
					return null;
				}
			}

			const nextToken = possibleNextTokens.getRandom();
			// TODO: а если не сгенерировался nextToken? надо подумать
			if (nextToken) {
				resultTokens.push(nextToken);
			}

			if (resultTokens.length > minWordCount && this.tokensToFinish.has(nextToken)) {
				return resultTokens;
			}

			if (resultTokens.length === maxWordCount) {
				return null;
			}

			preLastGeneratedToken = lastGeneratedToken;
			lastGeneratedToken = nextToken;
		}
	}
}
