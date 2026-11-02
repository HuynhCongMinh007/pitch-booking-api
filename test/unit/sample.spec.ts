describe('Unit Test Suite', () => {
  it('should run unit test independently without database', () => {
    const sum = (a: number, b: number) => a + b;
    expect(sum(2, 3)).toBe(5);
  });
});
