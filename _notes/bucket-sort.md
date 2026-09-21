---
layout: note
title: "Bucket sort, and why the NeetCode version isn't quite it"
date: 2026-09-20
tags: [algorithms, sorting, dsa, python, leetcode]
summary: "Three examples of bucket-style sorting, from the counting version on NeetCode to fractional bins to LeetCode 75, and what each one teaches."
---

I finished the sorting section of NeetCode's DSA for Beginners course today. Bucket sort was the last one, and it's the one that made me stop and reread. Not because it's hard. It's because the three examples I ended up working through all look like "bucket sort" and are actually doing slightly different things.

So this note is me untangling them. I'll call them example 1, 2 and 3 throughout.

## The idea in one paragraph

Comparison sorts (merge, quick, insertion) figure out order by comparing elements to each other. That puts a floor of O(n log n) on them. Bucket sort skips the comparing. It looks at a value, decides which bucket it belongs in, and drops it there. If the buckets themselves are already in order, you're mostly done once everything is placed. You only sort inside each bucket, and if the buckets are small, that costs almost nothing.

The catch is that you need to know something about your data going in. Specifically, you need to know roughly what range the values live in, and it helps a lot if they're spread out fairly evenly across that range.

## Example 1: the NeetCode version

The array is `[2, 1, 2, 0, 0, 2]`, and every value is 0, 1 or 2. So three buckets:

```python
def bucketSort(arr):
    # Assuming arr only contains 0, 1 or 2
    counts = [0, 0, 0]

    # Count the quantity of each val in arr
    for n in arr:
        counts[n] += 1

    # Fill each bucket in the original array
    i = 0
    for n in range(len(counts)):
        for j in range(counts[n]):
            arr[i] = n
            i += 1
    return arr
```

Trace it on the input. After the counting loop:

```
counts = [2, 1, 3]
          ^  ^  ^
          |  |  three 2s
          |  one 1
          two 0s
```

Then the write-back loop walks the buckets in order. Bucket 0 has a count of 2, so it writes `0` twice into `arr[0]` and `arr[1]`. Bucket 1 writes `1` once into `arr[2]`. Bucket 2 writes `2` three times into `arr[3]`, `arr[4]`, `arr[5]`. Result: `[0, 0, 1, 2, 2, 2]`.

Three pointers are doing the work, and it's worth keeping them straight. `i` is where the next write goes in the original array. `n` is which bucket we're on (which is also the value we're writing). `j` just counts how many times we've written from this bucket.

**Complexity.** The nested loop looks like O(n²) but isn't. The outer loop runs 3 times (once per bucket). The inner loop runs `counts[n]` times, and those counts add up to exactly the length of the array. So the write-back is O(n) total, not O(n) per bucket. The whole thing is O(n + k), where k is the number of buckets. Here k = 3, a constant, so it's O(n).

**A caveat on the name.** Strictly speaking, example 1 is *counting sort*. Its buckets don't hold the elements, they hold a tally of them. That works because the values are small integers and two 1s are interchangeable, so you can throw the originals away and rebuild them from the counts. NeetCode calls it bucket sort, and the lesson still works as an introduction, but keep this in mind, because it breaks the moment your elements carry any extra data. You can't rebuild a list of `(name, score)` pairs from a count of scores.

Which brings us to example 2.

## Example 2: buckets that actually hold things

```python
from math import floor

nums = [0.78, 0.17, 0.39, 0.26, 0.72, 0.94, 0.21, 0.12, 0.23, 0.68, 0.04]

bins = [[], [], [], [], [], [], [], [], [], []]

for num in nums:
    index = floor(num * 10)
    bins[index].append(num)

# Sort each bin.
for bin_ in bins:
    bin_.sort()

i = 0
for bin_ in bins:
    for n in bin_:
        nums[i] = n
        i += 1
```

Now each bucket is a list, and the actual values go in. This is where the "processing" I mentioned comes in: somebody has to decide how many buckets there are and which value goes where.

Here the values are all in [0, 1), so multiplying by 10 and flooring gives an index from 0 to 9. `0.78` becomes `7.8`, floors to `7`, goes in bucket 7. `0.04` becomes `0.4`, floors to `0`, goes in bucket 0. After the distribution step the bins look like this (I ran it):

```
0: [0.04]
1: [0.17, 0.12]
2: [0.26, 0.21, 0.23]
3: [0.39]
4: []
5: []
6: [0.68]
7: [0.78, 0.72]
8: []
9: [0.94]
```

Bucket 1 has `0.17` before `0.12` because that's the order they arrived in. Nothing has been sorted inside the bins yet. The `.sort()` pass fixes each of those small lists, and the final loop reads the buckets left to right, which is already the correct global order because every value in bucket 3 is smaller than every value in bucket 4, and so on. Output:

```
[0.04, 0.12, 0.17, 0.21, 0.23, 0.26, 0.39, 0.68, 0.72, 0.78, 0.94]
```

That last write-back loop is the same shape as example 1, by the way. Same `i` pointer, same idea. The difference is that we're copying elements out instead of regenerating them from counts.

### The hardcoded 10 is doing a lot of work

`floor(num * 10)` only works because I know the data is in [0, 1). Feed it `170` and you get index 1700 into a list of length 10 and an `IndexError`. To make this general you need the minimum and maximum, and you map linearly:

```python
def bucket_sort(vals, k=None):
    k = k or len(vals)              # rule of thumb: about one bucket per element
    lo, hi = min(vals), max(vals)
    if lo == hi:
        return list(vals)           # all equal, nothing to do

    bins = [[] for _ in range(k)]
    for v in vals:
        idx = int((v - lo) / (hi - lo) * k)
        idx = min(idx, k - 1)       # the max value would land on index k, clamp it
        bins[idx].append(v)

    out = []
    for b in bins:
        out.extend(sorted(b))
    return out
```

The `min(idx, k - 1)` line is easy to forget. The largest value maps to exactly `k`, which is one past the end. I tested this against example 2's data and against `[170, 45, 75, 90, 802, 24, 2, 66]`, and both come out sorted.

This is also where the "figure out how many buckets" question gets a real answer. There isn't a magic number. Too few buckets and each one is big, so you're really just running the inner sort on most of the array. Too many and you're allocating a pile of empty lists. About n buckets for n elements is the usual starting point.

### Complexity, honestly

The distribution pass and the write-back pass are both O(n). The question is what the per-bucket sorts cost.

- **Average case: O(n + k).** If the values are spread roughly uniformly, each bucket gets around n/k elements, which with k ≈ n means one or two. Sorting a bucket of two is basically free.
- **Worst case: everything lands in one bucket.** Then you've done O(n) of extra work and still have to sort the whole array inside that bucket. With Python's `.sort()` (Timsort) that's O(n log n). With insertion sort inside the buckets, which is what textbooks usually use, it's O(n²).
- **Space: O(n + k)**, since every element gets copied into a bucket.

That worst case isn't exotic. Take `[0.01, 0.02, 0.03, ..., 0.09, 0.95]` and run it through the fixed 10-bucket version. Nine of the ten elements pile into bucket 0. The "O(n)" claim depends on the input being cooperative, and the algorithm has no way to make it so.

### Stability

NeetCode's page says bucket sort is unstable, and for example 1 that's fair, though for bare integers it's also meaningless, since you can't tell two equal 1s apart. For example 2 the answer is different. Elements are appended to buckets in the order they're seen, and Python's `.sort()` is stable, so equal elements keep their original relative order. Stable or not depends on how you build it, not on bucket sort as a concept.

## Example 3: LeetCode 75, Sort Colors

The problem: an array containing only 0, 1 and 2 (red, white, blue). Sort it in place. This is example 1's setup almost exactly, so bucket-style thinking should apply directly.

My first solution was this:

```python
class Solution:
    def sortColors(self, nums: list[int]) -> None:
        for i in range(0, len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] > nums[j]:
                    tmp = nums[i]
                    nums[i] = nums[j]
                    nums[j] = tmp
        return nums
```

It passes. But it isn't bucket sort, it's an exchange sort, a cousin of selection sort. Every pair of positions gets compared, so it's O(n²) time. The constraint on this problem is n ≤ 300, which is why nobody complains. It also has a leftover `return nums` even though the problem says to modify in place and return nothing. Harmless, but it's a sign I wrote it on autopilot.

The version that uses what the problem is telling you (three possible values, known in advance) is example 1 with the function signature changed:

```python
class Solution:
    def sortColors(self, nums: list[int]) -> None:
        counts = [0, 0, 0]
        for n in nums:
            counts[n] += 1

        i = 0
        for color in range(3):
            for _ in range(counts[color]):
                nums[i] = color
                i += 1
```

Two passes, O(n) time, O(1) extra space (the counts array is always length 3, regardless of input size). Same trace as before: `[2, 0, 2, 1, 1, 0]` gives `counts = [2, 2, 2]` and rewrites to `[0, 0, 1, 1, 2, 2]`. I ran both versions and they agree.

The problem's follow-up asks for a one-pass solution with constant space. That's the Dutch national flag algorithm, three pointers (`lo`, `mid`, `hi`) that swap 0s to the front and 2s to the back in a single sweep. It's a different technique from bucket sort, so I'm leaving it for its own note.

## Where this leaves me

The three examples sit on a spectrum:

| | Buckets hold | Range known? | Time | Good for |
|---|---|---|---|---|
| Example 1 (counting) | Counts | Yes, small integers | O(n + k) | Few distinct values, no attached data |
| Example 2 (bucket) | The elements | Yes, or computed from min/max | O(n + k) avg, O(n log n) or worse if unlucky | Numbers spread evenly over a range |
| Example 3 (Sort Colors) | Counts, k = 3 | Yes, exactly 0/1/2 | O(n) | Exactly what it says |

A few things I'd tell myself if I'd forgotten all of this in three months:

- Bucket sort trades generality for speed. If you can't say anything about the distribution of your data, use a comparison sort.
- The interesting design decision is the mapping from value to bucket index, and the bucket count. The sorting is the easy part.
- The O(n) claim always comes with an asterisk: uniform input, sensible bucket count.
- When you see a problem with a tiny fixed set of values, ask whether a count array solves it before reaching for a real sorting algorithm. Sort Colors is that question in its purest form.
- In an interview, the safe default is still merge sort or quick sort, as NeetCode says. Bucket-style thinking is what you pull out when the problem hands you a range.

