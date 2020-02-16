export class TokenCollection {
	private values = new Map<string, TokenOccurrenceInfo>();

	private totalCount: number = 0;

	private shouldUpdateProbabilities: boolean = false;

	constructor(initialValues?: string[]) {
		initialValues && initialValues.forEach(v => this.add(v));
	}

	public add(value: string): void {
		this.totalCount++;

		const existing = this.values.get(value);
		if (existing) {
			existing.numberOfOccurrences++;
		} else {
			this.values.set(value, { numberOfOccurrences: 1 });
		}

		this.shouldUpdateProbabilities = true;
	}

	public getRandom(): string {
		this.ensureProbabilitiesUpdated();

		const random = Math.random();

		for (const [value, occurenceInfo] of this.values.entries()) {
			if (occurenceInfo.intervalFrom <= random && random < occurenceInfo.intervalTo) {
				return value;
			}
		}
	}

	private ensureProbabilitiesUpdated(): void {
		if (!this.shouldUpdateProbabilities) {
			return;
		}

		const delta = 1 / this.totalCount;
		let lastBoundary = 0;

		for (const v of this.values.values()) {
			let newBoundary = lastBoundary + (delta * v.numberOfOccurrences);

			v.intervalFrom = lastBoundary;
			v.intervalTo = newBoundary;

			lastBoundary = newBoundary;
		}

		this.shouldUpdateProbabilities = false;
	}
}

interface TokenOccurrenceInfo {
	numberOfOccurrences: number;
	intervalFrom?: number;
	intervalTo?: number;
}
