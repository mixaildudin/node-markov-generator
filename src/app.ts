import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function getRandomArrayItem<T>(array: Array<T>) {
	return array && array[Math.floor((Math.random() * array.length))];
}

const corporaPath = path.join(__dirname, '../corpora.txt');
const corporaContents = fs.readFileSync(corporaPath).toString();

const corpora = corporaContents.split(os.EOL);

const tokensToStart = new Set<string>();
const tokensToFinish = new Set<string>();
const tokenStorage = new Map<string, Map<string, number>>();

const allowedSymbolsRegex = /^[а-яА-ЯёЁ ]+$/;
const sentenceSplitRegex = /:\)|:\(|\?|!|\.|;|,|\(|\)|$/;

function processTokens(prevToken: string, currentToken: string, nextToken: string) {
	const key = prevToken ? getKeyForMultipleTokens(prevToken, currentToken) : currentToken;

	if (!tokenStorage.has(key)) {
		const newMap = new Map<string, number>();
		newMap.set(nextToken, 1);
		tokenStorage.set(key, newMap);
	} else {
		const countsForToken = tokenStorage.get(key);
		if (countsForToken.has(nextToken)) {
			countsForToken.set(nextToken, countsForToken.get(nextToken) + 1);
		} else {
			countsForToken.set(nextToken, 1);
		}
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

		/*if (tokens.indexOf('1') >= 0) {
			debugger;
		}*/

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
			/*if (currentToken === '1') {
				debugger;
			}*/
			const nextToken = tokens[i + 1];

			processTokens(null, currentToken, nextToken);

			if (i > 0) {
				const previousToken = tokens[i - 1];
				processTokens(previousToken, currentToken, nextToken);
			}
		}
	}
}

/*for (const x of tokenStorage) {
	console.log(x);
}*/

tokenStorage.forEach(nextTokenCounts => {
	let occasionSum = 0;
	nextTokenCounts.forEach(count => occasionSum += count);

	const delta = 1 / occasionSum;
	let lastBoundary = 0;

	for (const [nextToken, occasionCount] of nextTokenCounts) {
		let newBoundary = lastBoundary + (delta * occasionCount);
		nextTokenCounts.set(nextToken, newBoundary);

		lastBoundary = newBoundary;
	}
});

const minWordCount = 10;
const maxWordCount = 20;
let retryCount = 100;

while (retryCount) {
	// const tokenToStart = getRandomArrayItem(Array.from(tokensToStart));
	const tokenToStart = "1";
	console.log('tokenToStart: ' + tokenToStart);

	const result = generate(tokenToStart, minWordCount, maxWordCount);

	if (result == null){
		retryCount--;
	} else {
		console.log(result.join(' '));
		break;
	}
}

function generate(tokenToStart: string, minWordCount: number, maxWordCount: number, failureIfMaxLengthExceeded: boolean = true): string[] {
	const resultTokens: string[] = [tokenToStart];
	let preLastGeneratedToken: string = null; // TODO: нейминг ужасный. надо подумать. и вообще тут нужно как-то покрасивее сделать :(
	let lastGeneratedToken = tokenToStart;

	while (true) {
		const nextTokensWithOccasionIntervals = tokenStorage.get(getKeyForMultipleTokens(preLastGeneratedToken, lastGeneratedToken))
													?? tokenStorage.get(lastGeneratedToken);

		if (!nextTokensWithOccasionIntervals) {
			if (resultTokens.length > minWordCount) {
				// закончили!
				return resultTokens;
			} else {
				// не смогли построить достаточно длинную цепочку
				return null;
			}
		}

		const nextToken = getNextRandomToken(nextTokensWithOccasionIntervals);
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

function getNextRandomToken(nextTokensWithOccasionIntervals: Map<string, number>): string {
	const random = Math.random();

	let lowerBoundary = 0;
	let result = null;

	nextTokensWithOccasionIntervals.forEach((tokenUpperBoundary, token) => {
		if (random > lowerBoundary && random < tokenUpperBoundary) {
			result = token;
		}

		lowerBoundary = tokenUpperBoundary;
	});

	return result;
}
