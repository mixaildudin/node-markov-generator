import * as path from 'path';
import {TextGenerator} from './textGenerator';

const corporaPath = path.join(__dirname, '../corpora.txt');
const generator = new TextGenerator(corporaPath);

console.log(generator.generate());