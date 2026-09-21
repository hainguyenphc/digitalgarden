---
title: "Convolutions, channels, and layers, worked by hand on a 10×10 image"
date: 2026-09-20
tags: [machine-learning, deep-learning, cnn, convolution]
---

A convolution is a small grid of weights (a **filter**) that you slide over an image. At each position you multiply the patch under the filter by the filter's weights, add everything up, and write down one number.

That's the whole operation, and it's not the part that confused me. The parts around it did: what happens to the neighbors, why the output comes out smaller, and what people mean when they say a layer has "64 channels". This post is me sorting those out, ending with a full example small enough to check by hand.

## One output value

Here's a 3×3 patch from an image (values are brightness) and a filter that detects vertical edges:

```
patch:          filter:         patch .* filter:
 0  0  0          1  0 -1          0  0  0
 0  9  9          1  0 -1          0  0 -9
 0  9  9          1  0 -1          0  0 -9

sum = -18
```

Multiply position by position, then add. Think of it as a weighted vote: each pixel gets a say, and the weight decides whether its vote counts for or against. This filter is basically "left column minus right column", so dark-on-the left and bright-on-the-right gives a negative number. The result doesn't have to stay in 0 to 255 either. Nothing clamps it, and the next layer just takes whatever comes out.

## Sliding the filter

The textbook I was reading did one pixel and then said "repeat for every pixel." I wanted to know what that means for the neighbors. To get the value for the pixel one column to the right, slide the window one column right so that pixel becomes the center. Same filter, different pixels underneath.

Three rules that weren't obvious to me:

- **Every output is computed from the original image.** You read from one grid and write into a separate output grid. If you overwrote a pixel with its new value and then computed its neighbor, you'd feed the neighbor a corrupted input.
- **The output shrinks.** A 3×3 window only fits fully inside the image when its center is at least one pixel from every border. For an N×N image and a K×K filter with no padding, the output is (N - K + 1) per side. So 10 - 3 + 1 = 8.
- **Edge pixels still count as inputs.** I first described this as "we ignore the edge pixels," and that's wrong. The corner pixel is still inside the window centered one step in, and it gets multiplied by a filter weight. It just never gets to be a window *center*, so it has no output slot of its own.

If you want the output to stay the same size, you add **padding around the input** (not the output). Padding cells are zeros by default: pad × weight = 0, so they add nothing to the sum. You can also replicate the nearest edge pixel or mirror the image across the border.

## Channels

A **channel** is one 2D grid in a stack of same-sized grids. The data shape is height × width × channels. A grayscale image is 1 channel and a color image is 3 (red, green, blue sheets).

Channels get more interesting after a convolution layer. **Each filter produces one output grid.** Apply 4 filters to one image and you get 4 grids, called feature maps, and those are the 4 channels of the layer's output. Each answers a different question about the same image: where are the vertical edges, where are the horizontal ones, and so on.

This is where I tripped, so it's worth saying twice: 4 channels of 8×8 is **not** 4 images. It's 4 different views of *one* image.

The next layer then treats those 4 grids as **4 channels of a single input**. So each of its filters has to be 3×3×4, a stack of four 3×3 slices, one per input channel. To compute one output value, you multiply each channel's patch by that channel's slice, add up the 3 × 3 × 4 = 36 products, and end up with one number. Filter depth always equals the number of input channels, and the number of filters decides how many output channels you get.

That gives the weight count:

```
weights = K × K × (input channels) × (number of filters)
```

I first counted layer 2 as 3×3×(number of filters) and forgot the input depth entirely. It worked for layer 1 only because the input had 1 channel, so the missing factor was 1. Also, the count doesn't depend on image height or width. The same weights get reused at every position, which is a big part of why convolutions are cheap.

One more thing on shapes: if you feed in a batch of images, frameworks add a leading dimension. Keras stores (batch, height, width, channels), and PyTorch stores (batch, channels, height, width).

## The full example: 10×10×1 → 8×8×4 → 6×6×3

No padding, stride 1, no biases, no nonlinearity, to keep the arithmetic clean. Every number here is real.

### The input image, 10×10×1

A bright square with a dim patch inside it, plus a small block in the bottom right:

```
  0  0  0  0  0  0  0  0  0  0
  0  0  0  0  0  0  0  0  0  0
  0  0  0  9  9  9  9  0  0  0
  0  0  0  9  9  9  9  0  0  0
  0  0  0  9  4  4  9  0  0  0
  0  0  0  9  4  4  9  0  0  0
  0  0  0  9  9  9  9  0  0  0
  0  0  0  9  9  9  9  0  0  0
  0  0  0  0  0  0  0  6  6  6
  0  0  0  0  0  0  0  6  6  6
```

### Layer 1: 4 filters, each 3×3 (3 × 3 × 1 × 4 = 36 weights)

```
filter 1: vertical   filter 2: horizontal   filter 3: box sum   filter 4: diagonal
   1  0 -1              1  1  1                1  1  1            0  1  1
   1  0 -1              0  0  0                1  1  1           -1  0  1
   1  0 -1             -1 -1 -1                1  1  1           -1 -1  0
```

### One location, four filters

Take the window at output position (2, 3), which covers image rows 2 to 4 and columns 3 to 5. That's the top-left corner of the bright square:

```
patch:
 0  0  0
 0  9  9
 0  9  9
```

Running all four filters over this same patch:

| filter | result | why |
|---|---|---|
| 1 vertical | -18 | dark on the left, bright on the right |
| 2 horizontal | -18 | dark above, bright below |
| 3 box sum | 36 | total brightness in the window |
| 4 diagonal | 0 | a +9 and a -9 cancel out |

That's the idea of channels in miniature: one location in the image turns into 4 numbers, one per filter. And the diagonal filter simply has nothing to say here.

### Layer 1 output: 8×8×4

Each map is 10 - 3 + 1 = 8 per side. Values range from -27 to 71.

```
channel 1 (vertical edge)
   0  -9  -9   0   0   9   9   0
   0 -18 -18   0   0  18  18   0
   0 -27 -22   5  -5  22  27   0
   0 -27 -17  10 -10  17  27   0
   0 -27 -17  10 -10  17  27   0
   0 -27 -22   5  -5  22  27   0
   0 -18 -18   0   0  12  12   0
   0  -9  -9   0   0  -3  -3   0

channel 2 (horizontal edge)
   0  -9 -18 -27 -27 -18  -9   0
   0  -9 -18 -27 -27 -18  -9   0
   0   0   5  10  10   5   0   0
   0   0   5  10  10   5   0   0
   0   0  -5 -10 -10  -5   0   0
   0   0  -5 -10 -10  -5   0   0
   0   9  18  27  27  12  -3 -18
   0   9  18  27  27  12  -3 -18

channel 3 (box sum)
   0   9  18  27  27  18   9   0
   0  18  36  54  54  36  18   0
   0  27  49  71  71  49  27   0
   0  27  44  61  61  44  27   0
   0  27  44  61  61  44  27   0
   0  27  49  71  71  49  27   0
   0  18  36  54  54  42  30  18
   0   9  18  27  27  30  33  36

channel 4 (diagonal)
   0   0  -9 -18 -18 -18  -9   0
   0   9   0 -18 -18 -27 -18   0
   0  18  18   5  10 -13 -18   0
   0  18  13   0  15  -8 -18   0
   0  18   8 -15   0 -13 -18   0
   0  18  13 -10  -5 -18 -18   0
   0  18  27  18  18   0 -15 -12
   0   9  18  18  18  15   0 -12
```

You can find the numbers from the corner patch in there: row 2, column 3 reads -18, -18, 36, 0 across the four maps.

### Layer 2: 3 filters, each 3×3×4 (3 × 3 × 4 × 3 = 108 weights)

Each filter is four 3×3 slices, one per layer 1 channel, shown side by side (channel 1 | channel 2 | channel 3 | channel 4). These are random integers in {-1, 0, 1}, like an untrained network, so don't go looking for a story in them.

```
filter 1
 -1  1  0   |  0  1  0   | -1 -1  1   |  1  0  0
 -1  0 -1   |  0  1 -1   |  0 -1  1   |  1  0  0
 -1 -1 -1   | -1  0  0   | -1 -1 -1   | -1  1  0

filter 2
  1  0  0   |  1 -1  1   | -1  0 -1   | -1  0  0
  0  1  0   |  0  1  1   |  0  1 -1   | -1 -1  0
  1  1  1   |  1  0  0   |  0 -1 -1   |  1  1 -1

filter 3
  0 -1  0   |  0 -1 -1   |  0  0  1   |  1  1 -1
  1  1 -1   | -1  1  0   | -1 -1  0   | -1 -1  0
  1  0  0   | -1 -1  0   |  0  0 -1   | -1  1  1
```

### One layer 2 value, by hand

Take filter 1 at output position (2, 3). The window covers rows 2 to 4 and columns 3 to 5 of **all four** layer 1 maps. For each channel, multiply that channel's patch by that channel's slice and sum:

```
channel 1
 patch            slice           products
 -18   0   0      -1  1  0        18    0   0
 -22   5  -5      -1  0 -1        22    0   5
 -17  10 -10      -1 -1 -1        17  -10  10      sum =   62

channel 2
 -18 -27 -27       0  1  0         0  -27   0
   5  10  10       0  1 -1         0   10 -10
   5  10  10      -1  0  0        -5    0   0      sum =  -32

channel 3
  36  54  54      -1 -1  1       -36  -54  54
  49  71  71       0 -1  1         0  -71  71
  44  61  61      -1 -1 -1       -44  -61 -61      sum = -202

channel 4
   0 -18 -18       1  0  0         0    0   0
  18   5  10       1  0  0        18    0   0
  13   0  15      -1  1  0       -13    0   0      sum =    5
```

Add the four channel sums: 62 + (-32) + (-202) + 5 = **-167**. That's out2(2, 3) for filter 1. The other two filters at the same spot come out to -260 and -133.

This is the step that pooling doesn't do. Pooling would keep each channel in its own lane. Here, one output value blends evidence from all four channels at once.

Each value in layer 2 also depends on a bigger area of the original image than a 3×3 window. out2(2, 3) reads out1 rows 2 to 4, and each of those rows itself came from 3 image rows, so it depends on image rows 2 to 6 and columns 3 to 7, a 5×5 region.

### Layer 2 output: 6×6×3

Each map is 8 - 3 + 1 = 6 per side. Values range from -376 to 81.

```
channel 1
   27  -67 -214 -362 -350 -261
   21  -55 -167 -334 -318 -282
   15  -38 -121 -285 -234 -251
   20  -28 -146 -350 -264 -246
   39    8 -132 -376 -305 -282
   22   22  -55 -222 -181 -218

channel 2
 -224 -286 -245  -96   11   68
 -217 -290 -260 -128  -22   81
 -206 -286 -289 -208 -118   52
 -226 -326 -294 -188 -113   52
 -220 -318 -234  -89  -29   56
 -135 -229 -178 -107  -97  -32

channel 3
   14 -116 -138 -117 -124   21
   27 -115 -133 -154 -225  -53
   -2 -150 -137  -99 -175  -47
   -2 -170 -177  -99 -125  -17
   36 -104 -184 -178 -184  -86
   59  -13 -113 -153 -199 -186
```

### Shapes and weights, all in one place

```
10×10×1  --layer 1-->  8×8×4  --layer 2-->  6×6×3

layer 1 weights: 3 × 3 × 1 × 4 = 36
layer 2 weights: 3 × 3 × 4 × 3 = 108
```

## What I'd tell past me

- Filter depth is set by the input's channel count. The number of filters sets the output's channel count. I kept mixing those two up.
- Channels are different views of one image, not different images.
- Every output value is computed from the original input, never from values already overwritten.
- Border pixels are still used as inputs. They just can't be window centers unless you pad.
- Without something nonlinear between them (like ReLU), stacking layer 1 and layer 2 collapses into a single linear filter. I skipped that here on purpose, so treat this as the mechanics only.

