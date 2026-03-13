export interface RandomSource {
  next(): number;
}

export class MathRandomSource implements RandomSource {
  next(): number {
    return Math.random();
  }
}

export class SequenceRandomSource implements RandomSource {
  private index = 0;

  constructor(private readonly sequence: number[]) {
    if (sequence.length === 0) {
      throw new Error('SequenceRandomSource requires at least one value.');
    }
  }

  next(): number {
    const value = this.sequence[this.index % this.sequence.length];
    this.index += 1;
    return value;
  }
}
