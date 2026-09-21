---
title: "Transfer learning, or: don't hire a chef who's never held a knife"
date: 2026-09-20
tags: [machine-learning, deep-learning, transfer-learning]
---

Transfer learning means taking a model that already learned one task and using it as the starting point for a different one, instead of training from random weights.

## The chef analogy

Say you need to train a chef to cook Vietnamese food. You could take someone who has never cooked and teach everything: how to hold a knife, how heat behaves, why salt matters, and then finally pho. Or you could hire someone with ten years of French cooking. They already have the knife skills, the timing, and the palate. You only teach the new stuff, like fish sauce, star anise, and how to keep a broth clear.

The second chef needs far fewer practice meals. That's the whole idea.

## Why it works: layers learn a hierarchy

Take a network trained on ImageNet (1.2 million photos, 1000 categories). If you look at what each layer responds to, you get roughly this:

- **Early layers** detect edges and color blobs.
- **Middle layers** combine those into textures, corners, and simple shapes.
- **Late layers** combine those into things like fur patterns, wheels, and eyes.
- **The final layer** maps all of that to 1000 specific labels, like "tabby cat" or "fire truck."

Nothing in the early and middle layers is about cats or fire trucks. It's a general visual vocabulary, the knife skills from the chef story. Almost any image task needs edges and textures, so that knowledge carries over. Only the last layer is truly task-specific.

## The mechanics

Two terms first:

- The **head** is the final layer (or layers) that turns features into an answer. It's the last station on the assembly line, where the label gets stamped.
- **Freezing** a layer means locking its weights so training can't change them.

The recipe:

1. Take the pretrained network and cut off the old head (the 1000-way output).
2. Attach a fresh, randomly initialized head sized for your task. For example, 2 outputs: "pneumonia" and "healthy."
3. Train on your small dataset using one of two strategies:
   - **Feature extraction:** freeze everything except the new head. The pretrained body becomes a fixed machine that turns an image into a list of numbers, and you only learn how to read that list.
   - **Fine-tuning:** unfreeze some or all layers and train them too, but with a small learning rate.

```python
import torch.nn as nn
from torchvision.models import resnet50

model = resnet50(weights="IMAGENET1K_V2")   # pretrained body + 1000-class head

# Strategy A: feature extraction. Lock all weights.
for param in model.parameters():
    param.requires_grad = False

# Replace the head. A fresh layer has requires_grad = True by default.
model.fc = nn.Linear(in_features=2048, out_features=2)
```

## What "frozen" actually means

Backprop still runs, but frozen weights never get updated. Their gradients either aren't computed or aren't applied, so they don't move. Here only the head trains: 2048 × 2 + 2 = 4,098 numbers, instead of ResNet-50's roughly 25 million.

That's why a few hundred images can be enough. You're fitting about four thousand knobs, not twenty-five million.

## Why fine-tuning needs a small learning rate

The pretrained weights already sit in a good valley of the loss landscape. The new head starts random, so it's very wrong at first, and its early gradients are big and noisy. If those flow back into the body at a normal learning rate, they shove the body out of its valley and wreck what it learned. This is called **catastrophic forgetting**. It's the French chef getting retrained so aggressively that he forgets which end of the knife is the handle.

So you use a much smaller learning rate, often 10x to 100x smaller than you'd use from scratch. A common trick is to train the head alone first, then unfreeze the body once the head stops being random.

## The one-sentence version

Training from scratch starts at a random spot on the loss landscape. Transfer learning starts you somewhere already close to a good region. It's the same gradient descent with a much better starting point.

## When it breaks

If your task is far from the original, like going from everyday photos to medical scans or audio spectrograms, the late-layer features can be useless or even misleading. This is called **negative transfer**. The early layers usually still help, so in that case you'd unfreeze more of the network.

