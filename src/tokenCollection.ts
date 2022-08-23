/**
 * Token collection which supports adding tokens and retrieving a random one
 * based on its probability. Probabilities are calculated lazily.
 */
export class TokenCollection {
	private tokenFreqs: Map<string, number> = new Map();
	private probabilityIntervals: TokenProbabilityInterval[] = [];

	private totalCount: number = 0;

	private shouldUpdateProbabilities: boolean = false;

	constructor(initialValues?: string[]) {
		initialValues && initialValues.forEach(v => this.add(v));
	}

	public add(token: string): void {
		this.totalCount++;

		const existing = this.tokenFreqs.get(token) ?? 0;
		this.tokenFreqs.set(token, existing + 1);

		this.shouldUpdateProbabilities = true;
	}

	public getRandom(): string {
		this.ensureProbabilitiesUpdated();

		if (this.probabilityIntervals.length == 1) {
			return this.probabilityIntervals[0].token;
		}

		const random = Math.random();

		let l = 0,
			r = this.probabilityIntervals.length - 1;

		while (l < r) {
			const m = Math.floor(l + (r - l) / 2);

			if (random >= this.probabilityIntervals[m].intervalFrom
				&& random < this.probabilityIntervals[m + 1].intervalFrom) {
				return this.probabilityIntervals[m].token;
			} else if (this.probabilityIntervals[m].intervalFrom < random) {
				l = m + 1;
			} else {
				r = m;
			}
		}

		// check the condition when we only have one element in the search space
		return random >= this.probabilityIntervals[l].intervalFrom
			? this.probabilityIntervals[l].token
			: null;
	}

	private ensureProbabilitiesUpdated(): void {
		if (!this.shouldUpdateProbabilities) {
			return;
		}

		const delta = 1 / this.totalCount;
		let lastBoundary = 0;

		for (const token of this.tokenFreqs.keys()) {
			const freq = this.tokenFreqs.get(token);
			let newBoundary = lastBoundary + (delta * freq);

			this.probabilityIntervals.push({
				token,
				intervalFrom: lastBoundary
			});

			lastBoundary = newBoundary;
		}

		this.shouldUpdateProbabilities = false;
	}
}

interface TokenProbabilityInterval {
	token: string;
	intervalFrom: number;
}
