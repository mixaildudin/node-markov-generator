export class OccurrenceAwareCollection<T> {
	private values: OccurrenceInfoInternal<T>[] = [];

	private totalCount: number = 0;

	private shouldUpdateProbabilities: boolean = false;

	constructor(item?: T) {
		if (item) {
			this.add(item);
		}
	}

	public get(value: T): OccurrenceInfo<T> {
		const item = this.values.find(t => t.value == value);
		return item && this.mapToOccurrenceInfo(item);
	}

	// TODO: из-за текущей реализации приложение инициализируется целую вечность. надо вернуться к использованию Map, похоже
	public add(value: T): void {
		this.totalCount++;

		let isNew = true;
		for (const t of this.values) {
			if (value === t.value) {
				isNew = false;
				t.numberOfOccurrences++;
			}
		}

		if (isNew) {
			this.values.push({ value: value, numberOfOccurrences: 1 })
		}

		this.shouldUpdateProbabilities = true;
	}

	public getRandom(): OccurrenceInfo<T> {
		this.ensureProbabilitiesUpdated();

		const random = Math.random();
		const result = this.values.find(x => x.intervalFrom <= random && random < x.intervalTo);

		return result && this.mapToOccurrenceInfo(result);
	}

	private mapToOccurrenceInfo(x: OccurrenceInfoInternal<T>): OccurrenceInfo<T> {
		return {
			value: x.value,
			numberOfOccurrences: x.numberOfOccurrences
		};
	}

	private ensureProbabilitiesUpdated(): void {
		if (!this.shouldUpdateProbabilities) {
			return;
		}

		const delta = 1 / this.totalCount;
		let lastBoundary = 0;

		for (const v of this.values) {
			let newBoundary = lastBoundary + (delta * v.numberOfOccurrences);

			v.intervalFrom = lastBoundary;
			v.intervalTo = newBoundary;

			lastBoundary = newBoundary;
		}

		this.shouldUpdateProbabilities = false;
	}
}

export interface OccurrenceInfo<T> {
	value: T;
	numberOfOccurrences: number;
}

interface OccurrenceInfoInternal<T> extends OccurrenceInfo<T>{
	intervalFrom?: number;
	intervalTo?: number;
}