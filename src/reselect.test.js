// https://www.npmjs.com/package/reselect

import {
  createSelector,
  createStructuredSelector,
  defaultMemoize
} from "reselect";

describe("defaultMemoize", () => {
  it("given same input, calls function only once", () => {
    const fn = jest.fn();
    const memoized = defaultMemoize(fn);

    // calling thrice with same argument
    memoized(1);
    memoized(1);
    memoized(1);

    // inner function shall be called once
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("only memoizes last input", () => {
    const fn = jest.fn();
    const memoized = defaultMemoize(fn);

    // calling with same argument twice, but w/ different one in between
    memoized(1);
    memoized(2);
    memoized(1);

    // inner function shall be called each time
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("selector can select (derive output) from ultiple passed inputs", () => {
    const fn = jest.fn();
    const memoized = defaultMemoize(fn);

    // calling with same multiple arguments trice
    memoized(1, 2, 3);
    memoized(1, 2, 3);
    memoized(1, 2, 3);

    // inner function shall be called once
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toBeCalledWith(1, 2, 3);
  });
});

const exampleState = {
  shop: {
    taxPercent: 8,
    items: [
      { name: "apple", price: 1.2 },
      { name: "orange", price: 0.95 }
    ]
  }
};
const taxPercentSelector = state => state.shop.taxPercent;
const itemsSelector = state => state.shop.items;

describe("createSelector", () => {
  it("given a selector function and resultFunc produces memoized selector", () => {
    const resultFunc = jest
      .fn()
      .mockImplementation(taxPercent => ({ taxPercent }));
    const memoizedSelector = createSelector(taxPercentSelector, resultFunc);

    // called thrice with same state
    const resultA = memoizedSelector(exampleState);
    const resultB = memoizedSelector(exampleState);

    // resultFunc is called only once
    expect(resultFunc).toBeCalledTimes(1);
    // thus results are equal by reference
    expect(resultA).toBe(resultB);
    // even though resultFunc produces an object
    expect(resultA).toEqual({ taxPercent: 8 });
  });

  it("allows composing of selectors", () => {
    const resultFunc = jest
      .fn()
      .mockImplementation(totalAmount => ({ totalAmount }));
    const memoizedSelector = createSelector(
      // selector composed from existing `itemsSelector`
      createSelector(itemsSelector, items =>
        // produces total price of items
        items.reduce((acc, { price }) => acc + price, 0)
      ),
      resultFunc
    );

    memoizedSelector(exampleState);

    expect(resultFunc).toBeCalledWith(2.15);
  });

  it("multiple selectors passes result to resultFn as positional arguments", () => {
    const resultFunc = jest
      .fn()
      .mockImplementation((items, taxPercent) => ({ items, taxPercent }));
    const memoizedSelector = createSelector(
      itemsSelector,
      taxPercentSelector,
      resultFunc
    );

    memoizedSelector(exampleState);

    expect(resultFunc).toBeCalledWith(
      exampleState.shop.items,
      exampleState.shop.taxPercent
    );
  });

  it("memoizes by output of each selector, not by grand input", () => {
    const resultFunc = jest
      .fn()
      .mockImplementation((items, taxPercent) => ({ items, taxPercent }));
    const memoizedSelector = createSelector(
      itemsSelector,
      taxPercentSelector,
      resultFunc
    );

    memoizedSelector(exampleState);
    memoizedSelector({ ...exampleState, foo: "bar" });

    // called with different object reference byt selected values remains same
    expect(resultFunc).toBeCalledTimes(1);

    // called with different object where selected value (taxPercent) changes
    memoizedSelector({ shop: { ...exampleState.shop, taxPercent: 9 } });

    expect(resultFunc).toBeCalledTimes(2);
  });
});

describe("createStructuredSelector", () => {
  /**
   * Since pattern
   *
   *     createSelector(sel1, sel2, sel3, (val1, val2, val3) => ({
   *       val1,
   *       val2,
   *       val3
   *     }))
   *
   * is so common, reselect provides createStructuredSelector, which
   * translates given example as
   *
   *     createStructuredSelector({
   *       val1: sel1,
   *       val2: sel2,
   *       val3: sel3,
   *     })
   *
   * this is more error-proof since we do not rely on position of arguments
   * and is more expressive (keeps the logic in less characters typed)
   */

  it("aside from declaration, works the same as `createSelector`", () => {
    const memoizedSelector = createStructuredSelector({
      items: itemsSelector,
      taxPercent: taxPercentSelector
    });

    expect(memoizedSelector(exampleState)).toEqual({
      items: exampleState.shop.items,
      taxPercent: exampleState.shop.taxPercent
    });
  });

  it("allows utilize composing when value must be derived from state and `props`", () => {
    const props = { discountPercent: 10 };
    const memoizedSelector = createStructuredSelector({
      totalPrice: createSelector(
        itemsSelector,
        taxPercentSelector,
        // select value from props
        (_, props) => props.discountPercent,
        (items, taxPercent, discountPercent) =>
          items.reduce((acc, { price }) => acc + price, 0) *
          (1 - discountPercent / 100) *
          (1 + taxPercent / 100)
      )
    });

    expect(memoizedSelector(exampleState, props)).toEqual({
      totalPrice: 2.15 * 0.9 * 1.08
    });
  });

  /**
   * createStructuredSelector is perfect fit for react-redux/connect
   */
});
