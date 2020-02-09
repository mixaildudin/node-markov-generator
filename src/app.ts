import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {OccurrenceAwareCollection} from "./occurrenceAwareCollection";

const corporaPath = path.join(__dirname, '../corpora_test.txt');
const corporaContents = fs.readFileSync(corporaPath).toString();

const corpora = corporaContents.split(os.EOL);

const tokensToStart = new OccurrenceAwareCollection<string>();
const tokensToFinish = new Set<string>();
const tokenStorage = new Map<string, OccurrenceAwareCollection<string>>();

const isDebug = process.argv.includes('debug');

const allowedSymbolsRegex = /^[а-яА-ЯёЁ ]+$/;
const sentenceSplitRegex = /:\)|:\(|\?|!|\.|;|,|\(|\)|$/;

function processTokens(prevToken: string, currentToken: string, nextToken: string) {
	const key = prevToken ? getKeyForMultipleTokens(prevToken, currentToken) : currentToken;

	if (tokenStorage.has(key)) {
		tokenStorage.get(key).add(nextToken);
	} else {
		tokenStorage.set(key, new OccurrenceAwareCollection(nextToken));
	}
}

function getKeyForMultipleTokens(...tokens: string[]): string {
	return tokens.reduce((cur, next) => cur ? `${cur}|${next}` : next, '');
}

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

		tokensToStart.add(tokens[0]);

		const lastToken = tokens[tokens.length - 1];
		// не будем делать терминальными совсем уж короткие токены
		if (lastToken.length > 2) {
			tokensToFinish.add(lastToken);
		}

		for (let i = 0; i < tokens.length - 1; i++) {
			const currentToken = tokens[i];
			const nextToken = tokens[i + 1];

			processTokens(null, currentToken, nextToken);

			if (i > 0) {
				const previousToken = tokens[i - 1];
				processTokens(previousToken, currentToken, nextToken);
			}
		}
	}
}

const minWordCount = 7;
const maxWordCount = 20;
let retryCount = 100;

while (retryCount) {
	const tokenToStart = tokensToStart.getRandom().value;
	// const tokenToStart = "1";

	const result = generate(tokenToStart, minWordCount, maxWordCount);

	if (result == null){
		retryCount--;
	} else {
		if (isDebug) {
			console.log(result.join(' '));
		} else {
			break;
		}
	}
}

function generate(tokenToStart: string, minWordCount: number, maxWordCount: number, failureIfMaxLengthExceeded: boolean = true): string[] {
	const resultTokens: string[] = [tokenToStart];
	let preLastGeneratedToken: string = null; // TODO: нейминг ужасный. надо подумать. и вообще тут нужно как-то покрасивее сделать :(
	let lastGeneratedToken = tokenToStart;

	while (true) {
		/*const possibleNextTokens = tokenStorage.get(getKeyForMultipleTokens(preLastGeneratedToken, lastGeneratedToken))
													?? tokenStorage.get(lastGeneratedToken);*/
		const possibleNextTokenAwareOfContext = tokenStorage.get(getKeyForMultipleTokens(preLastGeneratedToken, lastGeneratedToken));
		const possibleSimpleNextTokens = tokenStorage.get(lastGeneratedToken);

		// если есть "более контекстная" цепочка, то подкинем монетку, чтобы решить, использовать ее или нет
		// TODO: как-то нормально это надо переписать, может? а может, и не надо :)
		const possibleNextTokens = possibleNextTokenAwareOfContext && Math.random() < 0.5 ? possibleNextTokenAwareOfContext : possibleSimpleNextTokens;

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

		if (resultTokens.length > minWordCount && tokensToFinish.has(nextToken)) {
			return resultTokens;
		}

		if (resultTokens.length === maxWordCount) {
			return failureIfMaxLengthExceeded ? null : resultTokens;
		}

		preLastGeneratedToken = lastGeneratedToken;
		lastGeneratedToken = nextToken;
	}
}