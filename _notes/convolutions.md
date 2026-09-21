---
title: "Convolutions: a small grid of weights, slid across an image"
date: 2026-09-20
tags: [machine-learning, deep-learning, cnn, convolution]
---

A convolution is a small grid of weights (a **filter**) that you use to replace each pixel with a new value computed from that pixel and its neighbors. That's the whole thing. Everything else is bookkeeping, and the bookkeeping is where I got tripped up.

## One pixel, by hand

Say you have a 3×3 patch of a grayscale image (values 0 to 255) and a 3×3 filter:

```
patch:               filter:
   0    64   128       -1     0    -2
  48   192   144        .5   4.5  -1.5
 142   226   168        1.5   2    -3
```

To get the new value for the center pixel, multiply each pixel by the filter weight in the same position, then add everything up:

```
new_val = (-1 * 0)   + (0 * 64)    + (-2 * 128)
        + (.5 * 48)  + (4.5 * 192) + (-1.5 * 144)
        + (1.5 * 142) + (2 * 226)  + (-3 * 168)
        = 577
```

The center pixel was 192 and is now 577. Think of the filter as a weighted vote: each of the nine pixels gets a say, and the weights decide whose opinion counts, and whether it counts for or against.

Notice that 577 is way outside 0 to 255. That's fine. Nothing clamps filtered values, and the next layer just takes 577 as an input.

## The part the textbook skipped

The book I was reading stops after computing that one pixel and says "repeat for every pixel." I wanted to know what happens to the neighbors, so let me spell it out.

To get the new value for the pixel to the right of the center (the 144), slide the window one column right so that pixel becomes the center. The filter stays the same but now sits over different pixels:

```
   64   128    a
  192   144    b
  226   168    c

new_val = (-1 * 64) + (0 * 128) + (-2 * a)
        + (.5 * 192) + (4.5 * 144) + (-1.5 * b)
        + (1.5 * 226) + (2 * 168) + (-3 * c)
        = 1355 - 2a - 1.5b - 3c
```

I can't finish it because a, b, and c live in the column just outside the patch the book showed. That's the reason the book stops where it does.

One more detail that isn't obvious: every output value is computed from the **original** image. You read from one grid and write into a separate output grid. If you overwrote the 192 with 577 and then computed the neighbor, you'd feed it a corrupted input.

## Why the output shrinks

A 3×3 window reaches one pixel in each direction, so it only fits fully inside the image when its center is at least one pixel away from every border. On a 28×28 image, valid centers run from row 1 to row 26, and the same for columns. That's 26 × 26 = 676 outputs.

The general formula, for an N×N image and a K×K filter with no padding, is:

```
output size per side = N - K + 1
```

Check it: 28 - 3 + 1 = 26. With a 5×5 filter it's 28 - 5 + 1 = 24.

My first way of describing this was "we ignore the edge pixels." That's wrong, and the distinction matters. The corner pixel at row 0, column 0 is still used as an input: it sits inside the window centered at row 1, column 1 and gets multiplied by the filter's top-left weight. What it doesn't get is its own output slot, because a window centered on it would hang off the image. So the edge pixels still contribute, they just can't be a center.

## Padding fixes the shrinking

If you want a 28×28 output back, you need windows centered on the border pixels too. So you add extra cells around the image before sliding the filter over it. For a 5×5 filter that means 2 extra rows or columns on every side: 28 becomes 32, and 32 - 5 + 1 = 28.

I first assumed padding meant filling in values on the output, or copying edge pixels over. Nope. **Padding goes around the input.** The original pixels stay put, and the pad cells just give the edge windows something to overlap.

What goes in the pad cells is a design choice:

- **Zero padding:** pad cells are 0, so pad × weight = 0 and they add nothing to the sum. It's the default in practice because it's cheap and usually good enough. The catch is that it creates an artificial dark border, which an edge-detecting filter can fire on.
- **Replicate padding:** copy the nearest edge pixel outward.
- **Reflect padding:** mirror the image across the border.

Take a 3×3 filter with zero padding of 1, centered on the top-left corner pixel:

```
 pad   pad   pad
 pad   p00   p01
 pad   p10   p11
```

Nine cells in the window. Five are padding, so those five products are zero no matter what the filter weights are. Only four cells (p00, p01, p10, p11) carry real image information.

## The short version

- A convolution replaces each pixel with a weighted sum of itself and its neighbors, using the same filter everywhere.
- Every output is computed from the original image, never from already-filtered values.
- Without padding, the output is (N - K + 1) per side, because windows need to fit fully inside the image. Border pixels are still used as inputs, they just can't be window centers.
- Padding is added to the input, not the output. Zeros are the common default.

