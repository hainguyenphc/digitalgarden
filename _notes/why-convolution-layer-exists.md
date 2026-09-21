---
title: "Why convolution layers exist (the version I'd explain to a 5-year-old)"
date: 2026-09-20
tags: [machine-learning, deep-learning, cnn, convolution]
---

Once I understood *how* a convolution works, the next question was: why bother? A plain fully connected layer can take an image too. So what does a convolution layer buy you?

The best answer I've found is a scavenger hunt.

## The "e" hunt

Say you're looking for the letter "e" on a page of text. You could hire one person per spot on the page, each trained to spot an "e" in their one spot and nowhere else. Or you could hire one person with a small magnifying glass who slides it across the whole page and checks every spot.

A convolution layer is the second option. Here's why that's a good deal.

## 1. Neighbors matter, and a dense layer forgets them

One pixel says almost nothing. "Bright" could be part of an eye, the sky, or a shoelace. What carries meaning is a pixel *plus the ones around it*: dark next to bright is an edge.

A convolution looks at a small 3×3 neighborhood at a time, so local patterns like that are right there in front of it. A dense layer flattens the picture into one long list of 784 numbers first, and by then the "who's next to whom" information is buried. It can still recover it in principle, but it has to learn the geometry from scratch.

## 2. One detector works everywhere

A vertical edge is a vertical edge whether it's in the top-left or the bottom-right of the image. A convolution reuses the same 9 weights at every position, so it learns what an edge looks like once.

A dense layer would learn it separately for every spot. So if a shoe shifts 5 pixels to the right, a dense layer sees a totally different set of numbers lighting up and has to learn the shoe all over again. A convolution's detector just finds the shoe wherever it slid to.

## 3. It's cheap

Take the layer from the book I was reading: 64 filters of 3×3 on a 28×28 grayscale image, producing 64 maps of 26×26.

```
convolution:  3 × 3 × 1 × 64 = 576 weights
dense layer producing the same output:
              784 inputs × (26 × 26 × 64 = 43,264 outputs) ≈ 33.9 million weights
```

That's a difference of roughly 59,000×. Fewer weights means less data needed to train and less room to memorize instead of learn.

## 4. Stacking builds a ladder

Layer 1's detectors find tiny things like edges. Layer 2 looks at *combinations of layer 1's maps*, which is why its filters span all the channels: it can find things like corners or curves ("a vertical edge next to a horizontal one"). Later layers combine those into bigger pieces, like eyes, wheels, or whole shoes.

It's Lego. Bricks become walls, and walls become a house. It's also why transfer learning works: those early bricks are useful for almost any image, not just the one the network was trained on.

## The bet a convolution layer makes

Images are built from small local patterns that can show up anywhere. For pictures, that bet is right, which is why convolutions dominate image work.

It's still a bet, though. If your data is one where absolute position matters a lot, or where the important patterns aren't local, that assumption stops being free.

## The short version

- Look at neighborhoods, not isolated pixels.
- Reuse the same detector at every position, so you learn a pattern once instead of once per location.
- Do it with a tiny fraction of the weights a dense layer would need.
- Stack layers so simple patterns combine into complex ones.

