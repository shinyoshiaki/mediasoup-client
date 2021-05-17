export class Counter {
  private index = 0;
  constructor(private target: number, private finish: () => void) {}

  done() {
    if (++this.index === this.target) this.finish();
  }
}
