export interface GeneratorOptions {
	tokenToStart?: string;
	minWordCount?: number;
	maxWordCount?: number;
	retryCount?: number;
	// число от 0 до 1; чем оно больше, тем сильнее сгенерированные предложения будут похожи на исходный текст
	contextUsageDegree?: number;
}
