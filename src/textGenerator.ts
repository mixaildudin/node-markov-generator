import * as fs from "fs";
import * as os from "os";
import {OccurrenceAwareCollection} from './occurrenceAwareCollection';
import {GeneratorOptions} from './generatorOptions';

export class TextGenerator {
	private readonly isDebug = process.argv.includes('debug');
	private readonly tokensToStart = new OccurrenceAwareCollection<string>();
	private readonly tokensToFinish = new Set<string>();
	private readonly tokenStorage = new Map<string, OccurrenceAwareCollection<string>>();

	constructor(corporaPath: string) {
		const corporaContents = fs.readFileSync(corporaPath).toString();
		const corpora = corporaContents.split(os.EOL);

		const allowedSymbolsRegex = /^[а-яА-ЯёЁ ]+$/;
		const sentenceSplitRegex = /:\)|:\(|\?|!|\.|;|,|\(|\)|$/;

		for (const line of corpora) {
			//const parts = line.trim().match(/(\b[а-яА-я]+\b)|((?<=[а-яА-я])[\.,!?])/g);

			// TODO: разбить на токены
			const sentences = line.trim().toLowerCase().split(sentenceSplitRegex).map(s => s.trim())
				.filter(t => allowedSymbolsRegex.test(t)); // TODO: пока так, надо подумать, что с этим сделать, потому что, если пропускать слова в середине предложения, то вероятности уже неправильные будут

			for (const sentence of sentences) {
				const tokens = sentence.split(' ');

				if (!tokens.length) {
					continue;
				}

				this.tokensToStart.add(tokens[0]);

				const lastToken = tokens[tokens.length - 1];
				// не будем делать терминальными совсем уж короткие токены
				if (lastToken.length > 2) {
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
			this.tokenStorage.set(key, new OccurrenceAwareCollection(nextToken));
		}
	}

	private static getKeyForMultipleTokens(...tokens: string[]): string {
		return tokens.reduce((cur, next) => cur ? `${cur}|${next}` : next, '');
	}

	public generate(options?: GeneratorOptions): string[] {
		const minWordCount = options?.minWordCount ?? 5;
		const maxWordCount = options?.maxWordCount ?? 20;
		let retryCount = options?.retryCount ?? 100;

		while (retryCount) {
			const tokenToStart = options?.tokenToStart ?? this.tokensToStart.getRandom().value;

			const result = this.generateInternal(tokenToStart, minWordCount, maxWordCount);

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

		return null;
	}

	private generateInternal(tokenToStart: string, minWordCount: number, maxWordCount: number): string[] {
		const resultTokens: string[] = [tokenToStart];
		let preLastGeneratedToken: string = null; // TODO: нейминг ужасный. надо подумать. и вообще тут нужно как-то покрасивее сделать :(
		let lastGeneratedToken = tokenToStart;

		while (true) {
			/*const possibleNextTokens = tokenStorage.get(getKeyForMultipleTokens(preLastGeneratedToken, lastGeneratedToken))
														?? tokenStorage.get(lastGeneratedToken);*/
			const possibleNextTokenAwareOfContext = this.tokenStorage.get(TextGenerator.getKeyForMultipleTokens(preLastGeneratedToken, lastGeneratedToken));
			const possibleSimpleNextTokens = this.tokenStorage.get(lastGeneratedToken);

			// если есть "более контекстная" цепочка, то "подкинем монетку", чтобы решить, использовать ее или нет
			// TODO: как-то нормально это надо переписать, может? а может, и не надо :)
			const possibleNextTokens = possibleNextTokenAwareOfContext && Math.random() < 0.75 ? possibleNextTokenAwareOfContext : possibleSimpleNextTokens;

			if (!possibleNextTokens) {
				if (resultTokens.length > minWordCount) {
					// закончили!
					return resultTokens;
				} else {
					// не смогли построить достаточно длинную цепочку
					return null;
				}
			}

			const nextToken = possibleNextTokens.getRandom()?.value;
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
