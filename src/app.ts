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
const words = new Map<string, Map<string, number>>();

const allowedSymbolsRegex = /^[а-яА-ЯёЁ ]+$/;
const sentenceSplitRegex = /:\)|:\(|\?|!|\.|;|,|$/;

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
			const currentToken = tokens[i].toLowerCase();
			const nextToken = tokens[i + 1].toLowerCase();

			if (!words.has(currentToken)) {
				const newMap = new Map<string, number>();
				newMap.set(nextToken, 1);
				words.set(currentToken, newMap);
			} else {
				const countsForToken = words.get(currentToken);
				if (countsForToken.has(nextToken)) {
					countsForToken.set(nextToken, countsForToken.get(nextToken) + 1);
				} else {
					countsForToken.set(nextToken, 1);
				}
			}
		}
	}
}

words.forEach(nextTokenCounts => {
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

// const tokenToStart = getRandomArrayItem(Array.from(tokensToStart));
const tokenToStart = "привет";
if (!tokenToStart) {
	throw new Error('Could not pick up a word to start');
}

const minWordCount = 10;
const maxWordCount = 30;
let retryCount = 50;

while (retryCount) {
	const result = generate(tokenToStart, minWordCount, maxWordCount, true);

	if (result == null){
		retryCount--;
	} else {
		console.log(result);
		break;
	}
}

function generate(tokenToStart: string, minWordCount: number, maxWordCount: number, failureWhenMaxAchieved: boolean = true): string[] {
	const resultTokens: string[] = [tokenToStart];
	let lastUsedToken = tokenToStart;

	while (true) {
		const nextTokensWithOccasionIntervals = words.get(lastUsedToken);

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
		if (nextToken) {
			resultTokens.push(nextToken);
		}

		if (resultTokens.length > minWordCount && tokensToFinish.has(nextToken)) {
			return resultTokens;
		}

		if (resultTokens.length === maxWordCount) {
			return failureWhenMaxAchieved ? null : resultTokens;
		}

		lastUsedToken = nextToken;
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
